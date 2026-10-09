"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type RefObject, useEffect, useRef, useState } from "react";

import { gsapEase } from "../motion";
import type { SceneStatus } from "./use-product-scene";

gsap.registerPlugin(useGSAP);

/**
 * The intro stays up at least this long (seconds). A cached model is ready in
 * a few frames, and an intro that flashes and vanishes reads as a glitch.
 */
const INTRO_MIN_SECONDS = 0.9;

type Options = {
  status: SceneStatus;
  /** Contains the intro, the canvas host and the follow-up elements. */
  scopeRef: RefObject<HTMLElement | null>;
  introRef: RefObject<HTMLDivElement | null>;
  canvasHostRef: RefObject<HTMLDivElement | null>;
  /** Elements that rise in after the model, e.g. hero copy or hotspots. */
  followSelector: string;
  /** Pin the page to the top behind the intro (scrolling pages only). */
  lockScroll?: boolean;
  onDone?: () => void;
};

/**
 * Intro reveal: the loading screen lifts away like a curtain, the model rises
 * into place and the follow-up elements stagger in. Runs once, when loading settles either
 * way. Returns whether it has finished, so the intro can unmount.
 */
export function useIntroReveal({
  status,
  scopeRef,
  introRef,
  canvasHostRef,
  followSelector,
  lockScroll = false,
  onDone,
}: Options) {
  const [introDone, setIntroDone] = useState(false);
  const mountedAtRef = useRef(0);

  // Hold the page at the top behind the intro, so the reveal always lands on
  // the first screen rather than wherever the browser restored scroll to.
  useEffect(() => {
    mountedAtRef.current = performance.now();
    if (!lockScroll) return;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, [lockScroll]);

  useGSAP(
    () => {
      const intro = introRef.current;
      const canvasHost = canvasHostRef.current;
      const scope = scopeRef.current;
      if (status === "loading" || introDone || !intro || !canvasHost || !scope)
        return;

      const followers = scope.querySelectorAll(followSelector);
      const elapsed = (performance.now() - mountedAtRef.current) / 1000;
      const finish = () => {
        if (lockScroll) document.documentElement.style.overflow = "";
        setIntroDone(true);
        onDone?.();
      };
      const media = gsap.matchMedia();

      media.add(
        {
          animate: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduce) {
            gsap
              .timeline({ onComplete: finish })
              .set(canvasHost, { autoAlpha: 1 })
              .to(intro, { autoAlpha: 0, duration: 0.3, ease: "none" });
            return;
          }

          gsap
            .timeline({
              delay: Math.max(0, INTRO_MIN_SECONDS - elapsed),
              onComplete: finish,
            })
            // The dark loader lifts away like a curtain, carrying the mark
            // with it, while the model rises into place underneath.
            .to(intro, { yPercent: -100, duration: 0.9, ease: "power3.inOut" })
            .fromTo(
              canvasHost,
              { autoAlpha: 0, y: 48, scale: 0.96 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 1.3,
                ease: gsapEase.outExpo,
              },
              "<0.1"
            )
            // fromTo, not from: `from` reads the end state off the element,
            // and a follower with a CSS opacity transition can be caught
            // mid-transition (StrictMode runs this twice in dev), freezing it
            // invisible. An explicit end state can't be misread.
            .fromTo(
              followers,
              { autoAlpha: 0, y: 20 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.9,
                ease: gsapEase.outExpo,
                stagger: 0.06,
                // Hand the followers back to CSS once revealed, or the inline
                // opacity left behind overrides later class-based hiding.
                clearProps: "opacity,visibility,transform",
              },
              "<0.1"
            );
        }
      );

      return () => media.revert();
    },
    // Scoped to the page, not the intro: the intro unmounts once done, and a
    // null scope makes GSAP warn.
    { dependencies: [status, introDone], scope: scopeRef }
  );

  return introDone;
}
