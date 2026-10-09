import gsap from "gsap";

type Point = { x: number; y: number; z: number };

type Options = {
  /** Element that receives the drag. */
  element: HTMLElement;
  /** The scene's camera rig; only `position` is written. */
  rig: { position: Point; target: Point };
  invalidate: () => void;
  /**
   * The viewer sits inside a scrolling page: a plain wheel scrolls the page
   * and only a trackpad pinch (ctrl+wheel) zooms. Pair with `touch-action:
   * pan-y` on the element so a vertical swipe scrolls too.
   */
  pageScroll?: boolean;
};

/**
 * Polar limits from straight up: nearly top-down to nearly underneath. Just
 * short of the poles, where the camera's up vector would flip. The scene
 * hides the shadow floor while the camera is below it.
 */
const MIN_POLAR = (10 * Math.PI) / 180;
const MAX_POLAR = (170 * Math.PI) / 180;
/** Radians per CSS pixel dragged. */
const SPEED = 0.008;
/** Zoom range, as multiples of the distance the viewer opened at. */
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.2;
/** Wheel sensitivity: radius scales by exp(deltaY × this). */
const WHEEL_SPEED = 0.0015;
/** Trackpad pinch (ctrl+wheel) sends much smaller deltas per frame. */
const PINCH_WHEEL_SPEED = 0.01;
/** One press of the zoom buttons. */
const BUTTON_STEP = 1.35;

/**
 * Drag to rotate, wheel or pinch to zoom, around the rig's target.
 *
 * Written against the rig rather than using OrbitControls, which moves the
 * camera directly and would bypass the rig's portrait distance scaling, view
 * offset and GSAP tweens. Plain spherical maths, so Three stays out of this
 * page's initial bundle. `gsap.quickTo` supplies the easing and the glide
 * after release.
 */
export function createOrbitDrag({
  element,
  rig,
  invalidate,
  pageScroll = false,
}: Options) {
  let enabled = true;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  // Where the input has asked to be, and where the camera currently is.
  const goal = { azimuth: 0, polar: 0, radius: 1 };
  const current = { azimuth: 0, polar: 0, radius: 1 };
  /** Active touch/mouse pointers, for pinch. */
  const pointers = new Map<number, { x: number; y: number }>();
  /** Distance between the two touching fingers. */
  const pinchSpan = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  let pinchDistance = 0;

  const apply = () => {
    const sinPolar = Math.sin(current.polar);
    rig.position.x =
      rig.target.x + current.radius * sinPolar * Math.sin(current.azimuth);
    rig.position.y = rig.target.y + current.radius * Math.cos(current.polar);
    rig.position.z =
      rig.target.z + current.radius * sinPolar * Math.cos(current.azimuth);
    invalidate();
  };

  const glide = { duration: 0.6, ease: "power2.out", onUpdate: apply };
  const toAzimuth = gsap.quickTo(current, "azimuth", glide);
  const toPolar = gsap.quickTo(current, "polar", glide);
  const toRadius = gsap.quickTo(current, "radius", glide);

  /** Read the rig's current position into spherical coordinates. */
  const sync = () => {
    const offsetX = rig.position.x - rig.target.x;
    const offsetY = rig.position.y - rig.target.y;
    const offsetZ = rig.position.z - rig.target.z;
    const radius = Math.hypot(offsetX, offsetY, offsetZ);
    current.radius = goal.radius = radius;
    current.azimuth = goal.azimuth = Math.atan2(offsetX, offsetZ);
    current.polar = goal.polar = Math.acos(offsetY / radius);
  };

  // The distance the viewer opened at: zoom limits and reset are relative
  // to it.
  sync();
  let homeRadius = current.radius;

  /** Scale the distance by `factor`, within the zoom range. */
  const zoomBy = (factor: number) => {
    if (!enabled) return;
    if (!gsap.isTweening(current)) sync();
    goal.radius = Math.min(
      homeRadius * MAX_ZOOM,
      Math.max(homeRadius * MIN_ZOOM, goal.radius * factor)
    );
    toRadius(goal.radius);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!enabled || event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    element.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      // Second finger: pinch instead of rotate.
      dragging = false;
      pinchDistance = pinchSpan();
      return;
    }
    sync();
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    element.dataset.dragging = "true";
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const distance = pinchSpan();
      if (pinchDistance > 0 && distance > 0) {
        // Fingers apart = closer: the radius shrinks as the spread grows.
        zoomBy(pinchDistance / distance);
      }
      pinchDistance = distance;
      return;
    }

    if (!dragging) return;
    goal.azimuth -= (event.clientX - lastX) * SPEED;
    goal.polar = Math.min(
      MAX_POLAR,
      Math.max(MIN_POLAR, goal.polar - (event.clientY - lastY) * SPEED)
    );
    lastX = event.clientX;
    lastY = event.clientY;
    toAzimuth(goal.azimuth);
    toPolar(goal.polar);
  };

  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    pinchDistance = 0;
    if (!dragging) return;
    dragging = false;
    delete element.dataset.dragging;
  };

  const onWheel = (event: WheelEvent) => {
    if (!enabled) return;
    if (pageScroll && !event.ctrlKey) return;
    // Zoom the model, not the page.
    event.preventDefault();
    // Lines/pages (some mice) to pixels.
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? window.innerHeight
          : 1;
    // Trackpad pinch (Chrome, Firefox, Edge) arrives as ctrl+wheel with
    // small deltas, so it gets a stronger factor than a two-finger scroll.
    const speed = event.ctrlKey ? PINCH_WHEEL_SPEED : WHEEL_SPEED;
    zoomBy(Math.exp(event.deltaY * unit * speed));
  };

  // Safari trackpad pinch: WebKit gesture events with a running `scale`.
  let gestureScale = 1;
  const onGestureStart = (event: Event) => {
    event.preventDefault();
    gestureScale = 1;
  };
  const onGestureChange = (event: Event) => {
    event.preventDefault();
    const scale = (event as Event & { scale: number }).scale;
    if (!scale) return;
    zoomBy(gestureScale / scale);
    gestureScale = scale;
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("gesturestart", onGestureStart);
  element.addEventListener("gesturechange", onGestureChange);

  const stop = () => {
    dragging = false;
    pointers.clear();
    pinchDistance = 0;
    delete element.dataset.dragging;
    gsap.killTweensOf(current);
  };

  return {
    /** Stop reacting to input and cancel any glide, e.g. while a panel is open. */
    disable() {
      enabled = false;
      stop();
    },
    enable() {
      enabled = true;
    },
    zoomIn() {
      zoomBy(1 / BUTTON_STEP);
    },
    zoomOut() {
      zoomBy(BUTTON_STEP);
    },
    /**
     * Take the camera's current distance as the new zoom reference, e.g.
     * after switching between the assembled and exploded views.
     */
    setHome() {
      sync();
      homeRadius = current.radius;
    },
    /** Glide back to the distance the viewer opened at. */
    resetZoom() {
      if (!enabled) return;
      if (!gsap.isTweening(current)) sync();
      goal.radius = homeRadius;
      toRadius(goal.radius);
    },
    dispose() {
      stop();
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("gesturestart", onGestureStart);
      element.removeEventListener("gesturechange", onGestureChange);
    },
  };
}

export type OrbitDrag = ReturnType<typeof createOrbitDrag>;
