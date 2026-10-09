"use client";

import { Logger } from "@workspace/logger";
import { type RefObject, useEffect, useRef, useState } from "react";

import type { CameraPose, Product } from "../types";
import type { ProductScene } from "./product-scene";

const logger = new Logger("product-scene");

export type SceneStatus = "loading" | "ready" | "error";

type Options = {
  product: Product;
  /** Element the scene mounts its canvas into. */
  canvasHostRef: RefObject<HTMLDivElement | null>;
  /** Camera pose before anything animates. */
  initialPose: CameraPose;
  /** Named poses offered in the `?debug` panel. */
  debugPoses: { id: string; pose: CameraPose }[];
};

/**
 * Scene lifecycle shared by every page that shows a product.
 *
 * Three is imported lazily so it stays out of the hydration bundle. The
 * cancelled flag covers StrictMode and Fast Refresh tearing the effect down
 * while the import or the GLB is still in flight.
 */
export function useProductScene({
  product,
  canvasHostRef,
  initialPose,
  debugPoses,
}: Options) {
  const sceneRef = useRef<ProductScene | null>(null);
  const [status, setStatus] = useState<SceneStatus>("loading");
  const [progress, setProgress] = useState(0);
  const [isDebug, setIsDebug] = useState(false);

  // Read through refs so a new array identity each render doesn't reload the
  // model; only a different product does.
  // Synced in an effect declared before the load effect, so it has already
  // run by the time the load effect reads them.
  const initialPoseRef = useRef(initialPose);
  const debugPosesRef = useRef(debugPoses);
  useEffect(() => {
    initialPoseRef.current = initialPose;
    debugPosesRef.current = debugPoses;
  });

  useEffect(() => {
    const canvasHost = canvasHostRef.current;
    if (!canvasHost) return;

    let cancelled = false;
    let scene: ProductScene | null = null;
    const debug = new URLSearchParams(window.location.search).has("debug");
    setIsDebug(debug);
    setStatus("loading");

    (async () => {
      const { ProductScene } = await import("./product-scene");
      if (cancelled) return;

      scene = new ProductScene({
        stage: canvasHost,
        initialPose: initialPoseRef.current,
      });

      try {
        await scene.load(
          product.modelUrl,
          (ratio) => {
            if (!cancelled) setProgress(ratio);
          },
          product.chromeFixes
        );
      } catch (error) {
        if (!cancelled) {
          logger.error("model failed to load", error);
          setStatus("error");
        }
        return;
      }
      if (cancelled) return;

      if (debug) await scene.enableDebug(debugPosesRef.current);
      sceneRef.current = scene;
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
      sceneRef.current = null;
      scene?.dispose();
    };
  }, [product, canvasHostRef]);

  return { sceneRef, status, progress, isDebug };
}
