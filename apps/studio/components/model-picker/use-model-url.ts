import { useEffect, useState } from "react";
import { useClient, useFormValue } from "sanity";

export type ModelUrlState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "ready"; url: string };

// A stable object: useClient caches on this argument's identity.
const CLIENT_OPTIONS = { apiVersion: "2026-03-01" };

/**
 * The GLB behind this product's "3D model" reference, read from the form so
 * picking another model updates every viewer on the page.
 */
export function useModelUrl(): ModelUrlState {
  const modelId = useFormValue(["model", "_ref"]) as string | undefined;
  const client = useClient(CLIENT_OPTIONS);
  const [state, setState] = useState<ModelUrlState>({ status: "loading" });

  useEffect(() => {
    if (!modelId) {
      setState({ status: "none" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    client
      .fetch<string | null>(`*[_id == $id][0].model.asset->url`, {
        id: modelId,
      })
      .then((url) => {
        if (!cancelled) {
          setState(url ? { status: "ready", url } : { status: "none" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, [client, modelId]);

  return state;
}
