"use client";

import { useGSAP } from "@gsap/react";
import { cn } from "@workspace/tailwind-config/utils";
import { buttonVariants } from "@workspace/ui/components/button";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import { ExplodeIcon, FitIcon, MinusIcon, PlusIcon } from "../icons";
import { gsapEase } from "../motion";
import { IntroScreen } from "../scene/intro-screen";
import { useIntroReveal } from "../scene/use-intro-reveal";
import { useProductScene } from "../scene/use-product-scene";
import { LABEL } from "../styles";
import type { CameraPose, Product } from "../types";
import { HotspotLayer } from "./hotspot-layer";
import { InfoPanel } from "./info-panel";
import { createOrbitDrag, type OrbitDrag } from "./orbit-drag";

gsap.registerPlugin(useGSAP);

/** Seconds for the camera to fly between views. */
const FLIGHT = 1.1;
/** Seconds for the parts to separate or come back together. */
const EXPLODE = 1.4;
/** Narrow screens: lift the model this far (fraction of height) above the sheet. */
const SHEET_LIFT = 0.22;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNarrow = () => window.matchMedia("(max-width: 767px)").matches;

type Props = {
  product: Product;
  /**
   * "page": a standalone fullscreen route with its own h1. "dialog": inside
   * the fullscreen viewer (ViewerDialog), which closes on Esc. "inline": a
   * box inside a scrolling page (ProductViewer); the page keeps scrolling
   * over it and the surrounding block carries the heading.
   */
  variant?: "page" | "dialog" | "inline";
};

export function ProductExplorer({ product, variant = "page" }: Props) {
  const inDialog = variant === "dialog";
  const inline = variant === "inline";
  /** Inside a box (dialog or inline) rather than owning the viewport. */
  const contained = variant !== "page";
  const hotspots = product.hotspots ?? [];
  const overviewPose = product.overviewPose;
  const explode = product.explode;
  /** Assemblies in display order, for the exploded view. */
  const parts = explode
    ? explode.order.flatMap((id) => {
        const part = explode.parts.find((entry) => entry.id === id);
        return part ? [part] : [];
      })
    : [];

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const orbitRef = useRef<OrbitDrag | null>(null);
  /** The view people were on when they opened a hotspot; close returns here. */
  const savedPoseRef = useRef<CameraPose | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const previousIndexRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  /**
   * Assembled shows the numbered hotspots; exploded splits the model into
   * its assemblies (one timed tween, not scroll) and lists those instead.
   */
  const [mode, setMode] = useState<"assembled" | "exploded">("assembled");
  const [switching, setSwitching] = useState(false);
  const explodeState = useRef({ progress: 0 });
  const partRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const exploded = mode === "exploded";
  /** Whatever the panel and Previous/Next step through in this mode. */
  const items = exploded
    ? parts.map((part) => ({
        label: "Assembly",
        title: part.label,
        body: part.detail,
        specs: part.specs,
      }))
    : hotspots;

  const { sceneRef, status, progress, isDebug } = useProductScene({
    product,
    canvasHostRef,
    initialPose: overviewPose,
    debugPoses: [{ id: "overview", pose: overviewPose }, ...hotspots],
  });

  // The reveal waits for the loader's mark to finish lighting up.
  const [loaderFilled, setLoaderFilled] = useState(false);
  const introDone = useIntroReveal({
    status: loaderFilled ? status : "loading",
    scopeRef: stageRef,
    introRef,
    canvasHostRef,
    followSelector: "[data-intro-follow]",
  });

  // Once the scene is ready: centre the model, pin the hotspots to it, and
  // hand the canvas to drag-to-rotate (OrbitControls owns it under ?debug).
  useEffect(() => {
    const scene = sceneRef.current;
    const canvasHost = canvasHostRef.current;
    if (status !== "ready" || !scene || !canvasHost) return;

    scene.rig.frameLift = 0;
    // Split into assemblies up front; parts rest in place until exploded,
    // so the hotspot anchors are unaffected. Column on phones.
    if (explode) scene.enableExplode(explode, isNarrow() ? "column" : "row");
    const unsubscribe = scene.onRender(() => {
      // Same order as `parts`: explode.order.
      explode?.order.forEach((id, index) => {
        const tag = partRefs.current[index];
        const rect = scene.partRect(id);
        if (!tag || !rect) return;
        // Centred just above the part.
        const x = (rect.left + rect.right) / 2;
        tag.style.transform = `translate3d(${x}px, ${rect.top}px, 0) translate(-50%, calc(-100% - 8px))`;
      });
      hotspots.forEach((hotspot, index) => {
        const button = buttonRefs.current[index];
        if (!button) return;
        const point = scene.project(hotspot.anchor, hotspot.normal);
        button.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
        button.dataset.facing = String(point.facing);
        // Invisible dots on the far side shouldn't be reachable by Tab.
        button.inert = !point.facing;
      });
    });

    const orbit = isDebug
      ? null
      : createOrbitDrag({
          element: canvasHost,
          rig: scene.rig,
          invalidate: scene.invalidate,
          pageScroll: inline,
        });
    orbitRef.current = orbit;

    return () => {
      unsubscribe();
      orbit?.dispose();
      orbitRef.current = null;
    };
  }, [status, isDebug, hotspots, sceneRef, explode, inline]);

  /** Tween the camera rig to a pose. Cuts instantly under reduced motion. */
  const flyTo = (
    pose: CameraPose,
    frameLift: number,
    onComplete?: () => void
  ) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { rig } = scene;
    gsap.killTweensOf([rig.position, rig.target, rig]);

    const [cameraX, cameraY, cameraZ] = pose.camera;
    const [targetX, targetY, targetZ] = pose.target;
    gsap
      .timeline({
        defaults: {
          duration: prefersReducedMotion() ? 0 : FLIGHT,
          ease: "power3.inOut",
        },
        onUpdate: scene.invalidate,
        onComplete,
      })
      .to(rig.position, { x: cameraX, y: cameraY, z: cameraZ }, 0)
      .to(rig.target, { x: targetX, y: targetY, z: targetZ }, 0)
      .to(rig, { frameOffset: pose.frameOffset, frameLift }, 0);
  };

  const open = (index: number) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (activeIndex === null) {
      const { position, target, frameOffset } = scene.rig;
      savedPoseRef.current = {
        camera: [position.x, position.y, position.z],
        target: [target.x, target.y, target.z],
        frameOffset,
      };
      returnFocusRef.current =
        (exploded ? partRefs.current[index] : buttonRefs.current[index]) ??
        null;
    }
    orbitRef.current?.disable();
    setActiveIndex(index);
    const part = parts[index];
    const hotspot = hotspots[index];
    if (exploded && part) {
      scene.setFocus(part.id);
      const pose = scene.focusPose(part.id, isNarrow());
      if (pose) flyTo(pose, isNarrow() ? SHEET_LIFT : 0);
    } else if (hotspot) {
      flyTo(hotspot.pose, SHEET_LIFT);
    }
  };

  const close = () => {
    if (activeIndex === null) return;
    const narrow = isNarrow();
    gsap.to(panelRef.current, {
      autoAlpha: 0,
      x: narrow ? 0 : 24,
      y: narrow ? 24 : 0,
      duration: prefersReducedMotion() ? 0.15 : 0.2,
      ease: gsapEase.outQuad,
      onComplete: () => {
        setActiveIndex(null);
        returnFocusRef.current?.focus({ preventScroll: true });
      },
    });
    if (exploded) sceneRef.current?.setFocus(null);
    flyTo(savedPoseRef.current ?? overviewPose, 0, () =>
      orbitRef.current?.enable()
    );
  };

  /** Split the model apart, or put it back together, in one timed tween. */
  const toggleExplode = () => {
    const scene = sceneRef.current;
    if (!scene || !explode || switching || activeIndex !== null) return;
    const toExploded = !exploded;
    const target = toExploded ? scene.explodedPose : overviewPose;
    if (!target) return;
    const reduced = prefersReducedMotion();
    setSwitching(true);
    setMode(toExploded ? "exploded" : "assembled");
    orbitRef.current?.disable();
    gsap.to(explodeState.current, {
      progress: toExploded ? 1 : 0,
      duration: reduced ? 0 : EXPLODE,
      ease: "power3.inOut",
      overwrite: true,
      onUpdate: () => scene.setExplode(explodeState.current.progress),
    });
    flyTo(target, 0, () => {
      orbitRef.current?.enable();
      orbitRef.current?.setHome();
      setSwitching(false);
    });
  };

  const step = (direction: 1 | -1) => {
    if (activeIndex === null) return;
    open((activeIndex + direction + items.length) % items.length);
  };

  // Panel entry: slide in as the camera lands the first time, and only
  // re-stagger the contents when stepping between hotspots.
  useGSAP(
    () => {
      const panel = panelRef.current;
      const wasOpen = previousIndexRef.current !== null;
      previousIndexRef.current = activeIndex;
      if (activeIndex === null || !panel) return;

      const items = panel.querySelectorAll("[data-panel-item]");
      // Focus once visible: browsers ignore focus on hidden elements, and
      // the panel starts at autoAlpha 0.
      const focusHeading = () =>
        headingRef.current?.focus({ preventScroll: true });

      if (prefersReducedMotion()) {
        gsap.fromTo(
          panel,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.2, onComplete: focusHeading }
        );
        return;
      }
      if (!wasOpen) {
        const narrow = isNarrow();
        gsap.fromTo(
          panel,
          { autoAlpha: 0, x: narrow ? 0 : 24, y: narrow ? 24 : 0 },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            duration: 0.4,
            delay: FLIGHT * 0.45,
            ease: gsapEase.outExpo,
          }
        );
      }
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.4,
          delay: wasOpen ? 0 : FLIGHT * 0.5,
          stagger: 0.05,
          ease: gsapEase.outExpo,
          onComplete: focusHeading,
        }
      );
    },
    { dependencies: [activeIndex], scope: stageRef }
  );

  // Esc closes the open hotspot. preventDefault stops the same press from
  // also closing a surrounding <dialog>, so a second Esc closes that.
  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Camera and panel tweens run outside useGSAP; stop them if the viewer
  // unmounts mid-flight (the dialog closing) so no callback runs after.
  useEffect(
    () => () => {
      const scene = sceneRef.current;
      if (scene) {
        gsap.killTweensOf([scene.rig.position, scene.rig.target, scene.rig]);
      }
      gsap.killTweensOf(panelRef.current);
      gsap.killTweensOf(explodeState.current);
    },
    [sceneRef]
  );

  const activeItem = activeIndex === null ? null : items[activeIndex];
  /** Hotspot markers only make sense on the assembled model. */
  const hotspotsHidden = activeIndex !== null || exploded || switching;
  const Heading = contained ? "h2" : "h1";
  const Root = contained ? "div" : "main";

  return (
    <Root
      ref={stageRef}
      aria-label={`${product.name} explorer`}
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-background",
        contained ? "h-full" : "h-svh"
      )}
    >
      {/* Header bar, in the product page's language: the same height and
          rule as the site header, mono labels, the name in bold. The close
          button (ViewerDialog) sits at its right end. */}
      {inline ? (
        <p
          data-intro-follow
          className={cn(
            LABEL,
            // Phones: no room beside the Fullscreen button.
            "pointer-events-none absolute top-4 left-4 z-10 text-muted-foreground max-md:hidden md:top-6 md:left-6"
          )}
        >
          Drag to rotate
          {exploded
            ? " · Select a part"
            : hotspots.length > 0 && " · Select a numbered point"}
        </p>
      ) : (
        <header
          data-intro-follow
          className={cn(
            "relative z-10 flex h-16 shrink-0 items-center gap-6 border-border border-b bg-background px-5 md:h-20 md:px-10",
            // Clear the close button (dialog) or the flow pill (page).
            inDialog ? "pr-20 md:pr-24" : "pr-5 md:pr-80"
          )}
        >
          <div className="min-w-0">
            <p className={cn(LABEL, "truncate text-muted-foreground")}>
              {product.category}
            </p>
            <Heading className="mt-1 truncate font-normal text-2xl leading-8 tracking-[-0.03em] md:text-3xl">
              {product.name}
            </Heading>
          </div>
          <p
            className={cn(
              LABEL,
              "ml-auto hidden text-right text-muted-foreground lg:block"
            )}
          >
            Drag to rotate · Scroll or pinch to zoom
            {exploded
              ? " · Select a part"
              : hotspots.length > 0 && " · Select a numbered point"}
          </p>
        </header>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={canvasHostRef}
          // Hidden until the intro reveal fades it up, then kept visible by
          // React: Next keeps a page alive in a hidden <Activity> when you
          // navigate away, GSAP's cleanup reverts the reveal's inline styles,
          // and introDone survives, so the reveal never replays on return.
          // touch-none: drags rotate the model instead of scrolling the page.
          // Inline, a vertical swipe still scrolls the page (pan-y).
          className={cn(
            "absolute inset-0 cursor-grab data-[dragging=true]:cursor-grabbing",
            !introDone && "invisible opacity-0",
            inline ? "touch-pan-y" : "touch-none"
          )}
        />

        {/* Inline on phones the box is too small for the hotspot sheet:
            rotate only, and explore hotspots in Fullscreen. */}
        {!isDebug && (
          <div className={inline ? "max-md:hidden" : undefined}>
            <HotspotLayer
              hotspots={hotspots}
              buttonRefs={buttonRefs}
              hidden={hotspotsHidden}
              onSelect={open}
            />
          </div>
        )}

        {/* Part tags over the exploded assemblies, placed each frame from
            the part's on-screen box, like the hotspot markers. */}
        {!isDebug && parts.length > 0 && (
          <div
            aria-hidden={!exploded || switching || activeIndex !== null}
            className={cn(
              // Phones stack the parts too tightly for floating tags; they
              // get the chip row above the button instead.
              "pointer-events-none absolute inset-0 transition-opacity duration-(--duration-base) ease-out-quad max-md:hidden",
              (!exploded || switching || activeIndex !== null) && "opacity-0"
            )}
          >
            {parts.map((part, index) => (
              <button
                key={part.id}
                ref={(element) => {
                  partRefs.current[index] = element;
                }}
                type="button"
                onClick={() => open(index)}
                tabIndex={
                  exploded && !switching && activeIndex === null ? 0 : -1
                }
                aria-label={`${part.label}: show details`}
                style={{ transform: "translate3d(-400px, -400px, 0)" }}
                className={cn(
                  LABEL,
                  "absolute top-0 left-0 flex items-center gap-2 whitespace-nowrap bg-background px-3 py-1.5 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)] ring-1 ring-border transition-colors duration-(--duration-fast) hover:bg-foreground hover:text-background",
                  exploded && !switching && activeIndex === null
                    ? "pointer-events-auto"
                    : "pointer-events-none"
                )}
              >
                <span className="text-muted-foreground tabular-nums group-hover:text-inherit">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {part.label}
              </button>
            ))}
          </div>
        )}

        {/* Index of the points, like the page's spec rows: a numbered list
            bottom-left on wide screens. */}
        {items.length > 0 && (
          <nav
            data-intro-follow
            aria-label={exploded ? "Assemblies" : "Points on the model"}
            className={cn(
              "absolute bottom-8 left-10 hidden w-64 bg-background/90 shadow-[0_16px_40px_-24px_rgb(0_0_0/0.35)] ring-1 ring-border backdrop-blur-sm transition-opacity duration-(--duration-base) ease-out-quad md:block",
              (activeIndex !== null || switching) &&
                "pointer-events-none opacity-0"
            )}
          >
            <p className={cn(LABEL, "px-4 pt-4 pb-2 text-muted-foreground")}>
              {exploded ? "Assemblies" : "On the model"}
            </p>
            <ol>
              {(exploded
                ? parts.map((part) => ({ id: part.id, label: part.label }))
                : hotspots
              ).map((hotspot, index) => (
                <li key={hotspot.id} className="last:pb-2">
                  <button
                    type="button"
                    onClick={() => open(index)}
                    tabIndex={activeIndex !== null ? -1 : 0}
                    className="focus-ring flex w-full items-center gap-3 px-4 py-2 text-left text-base leading-6 transition-colors duration-(--duration-fast) hover:bg-card"
                  >
                    <span
                      className={cn(
                        LABEL,
                        "w-5 shrink-0 text-muted-foreground"
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {hotspot.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {product.modelNote && (
          <p
            data-intro-follow
            className={cn(
              // Phones: top of the stage, clear of the bottom controls.
              "pointer-events-none absolute top-3 right-5 left-5 text-muted-foreground text-xs leading-4 transition-opacity duration-(--duration-base) md:top-auto md:right-24 md:bottom-8 md:left-auto md:max-w-[36ch] md:text-right",
              activeIndex !== null && "opacity-0"
            )}
          >
            {product.modelNote}
          </p>
        )}

        {/* Phones: the assemblies as a row of chips above the button. */}
        {!isDebug && parts.length > 0 && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-18 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] transition-opacity duration-(--duration-base) ease-out-quad md:hidden",
              (!exploded || switching || activeIndex !== null) &&
                "pointer-events-none opacity-0"
            )}
          >
            {parts.map((part, index) => (
              <button
                key={part.id}
                type="button"
                onClick={() => open(index)}
                tabIndex={
                  exploded && !switching && activeIndex === null ? 0 : -1
                }
                className={cn(
                  LABEL,
                  "flex h-10 shrink-0 items-center gap-2 bg-background px-3 ring-1 ring-border active:bg-card"
                )}
              >
                <span className="text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {part.label}
              </button>
            ))}
          </div>
        )}

        {/* The one mode switch: split the model into its assemblies, or put
            it back. Bottom-centre, where a thumb reaches it on phones. */}
        {!isDebug && explode && (
          <button
            type="button"
            data-intro-follow
            onClick={toggleExplode}
            disabled={switching}
            aria-pressed={exploded}
            className={cn(
              buttonVariants({
                variant: exploded ? "outline" : "default",
                size: "sm",
              }),
              "absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-8",
              exploded && "bg-background",
              inline && "max-md:hidden",
              activeIndex !== null && "pointer-events-none opacity-0"
            )}
          >
            {exploded ? (
              <FitIcon className="size-4" />
            ) : (
              <ExplodeIcon className="size-4" />
            )}
            {exploded ? "Assemble" : "Exploded view"}
          </button>
        )}

        {/* Zoom: wheel, trackpad and pinch work too; these are for
            everyone else. Square, like the page's controls. */}
        {!isDebug && (
          <fieldset
            data-intro-follow
            aria-label="Zoom"
            className={cn(
              // Phones pinch to zoom; the buttons would crowd the bottom bar.
              "absolute right-5 bottom-4 flex flex-col bg-background shadow-[0_16px_40px_-24px_rgb(0_0_0/0.35)] ring-1 ring-border transition-opacity duration-(--duration-base) ease-out-quad max-md:hidden md:right-10 md:bottom-8",
              activeIndex !== null && "pointer-events-none opacity-0"
            )}
          >
            {[
              {
                label: "Zoom in",
                Icon: PlusIcon,
                run: () => orbitRef.current?.zoomIn(),
              },
              {
                label: "Zoom out",
                Icon: MinusIcon,
                run: () => orbitRef.current?.zoomOut(),
              },
              {
                label: "Reset view",
                Icon: FitIcon,
                run: () => orbitRef.current?.resetZoom(),
              },
            ].map(({ label, Icon, run }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                onClick={run}
                tabIndex={activeIndex !== null ? -1 : 0}
                className="focus-ring grid size-10 place-items-center transition-colors duration-(--duration-fast) hover:bg-foreground hover:text-background active:scale-95"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </fieldset>
        )}

        {/* Click away to close, as in a dialog: an invisible layer under the
            panel. Pointer-only; keyboard users close with Esc or the button. */}
        {activeItem && activeIndex !== null && (
          <div
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0"
          />
        )}

        {activeItem && activeIndex !== null && (
          <InfoPanel
            ref={panelRef}
            headingRef={headingRef}
            hotspot={activeItem}
            index={activeIndex}
            count={items.length}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            onClose={close}
          />
        )}
      </div>

      {!introDone && (
        <IntroScreen
          ref={introRef}
          progress={progress}
          complete={status !== "loading"}
          failed={status === "error"}
          onFilled={() => setLoaderFilled(true)}
          contained={contained}
        />
      )}
    </Root>
  );
}
