import { Button, Card, Flex, Stack, Text } from "@sanity/ui";
import { useRef, useState } from "react";
import {
  type ArrayOfObjectsInputProps,
  insert,
  set,
  setIfMissing,
} from "sanity";

import {
  type Marker,
  ModelViewer,
  type ModelViewerHandle,
  type Point,
  type View,
} from "./model-viewer";
import { useModelUrl } from "./use-model-url";

type Pose = View & { frameOffset?: number };
type HotspotValue = {
  _key: string;
  id?: string;
  label?: string;
  anchor?: Point;
  normal?: Point;
  pose?: Pose;
};

/** Hotspot shots sit the point left of centre, clear of the info panel. */
const SHOT_OFFSET = -0.1;
const SHOT_DISTANCE = 0.9;

const vec3 = (point: Point) => ({ _type: "vec3", ...point });
const pose = (view: View, frameOffset = SHOT_OFFSET) => ({
  _type: "cameraPose",
  camera: vec3(view.camera),
  target: vec3(view.target),
  frameOffset,
});
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * A starting shot for a new point: looking at it from between the surface
 * normal and the editor's current angle, a little under a metre out.
 */
function shotFor(anchor: Point, normal: Point, current: View | null): View {
  const away = { x: normal.x, y: normal.y, z: normal.z };
  if (current) {
    const dx = current.camera.x - anchor.x;
    const dy = current.camera.y - anchor.y;
    const dz = current.camera.z - anchor.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    away.x = normal.x * 0.6 + (dx / length) * 0.4;
    away.y = normal.y * 0.6 + (dy / length) * 0.4 + 0.3;
    away.z = normal.z * 0.6 + (dz / length) * 0.4;
  }
  const length = Math.hypot(away.x, away.y, away.z) || 1;
  const target = { ...anchor, y: round(anchor.y + 0.03) };
  return {
    target,
    camera: {
      x: round(anchor.x + (away.x / length) * SHOT_DISTANCE),
      y: round(anchor.y + (away.y / length) * SHOT_DISTANCE),
      z: round(anchor.z + (away.z / length) * SHOT_DISTANCE),
    },
  };
}

/**
 * The product's hotspots, edited on the model: add a point by clicking the
 * surface, move one, and save the camera angle it opens with. The usual
 * list below still edits each hotspot's words.
 */
export function HotspotsInput(props: ArrayOfObjectsInputProps) {
  const { onChange, readOnly } = props;
  const value = (props.value ?? []) as HotspotValue[];
  const model = useModelUrl();
  const viewerRef = useRef<ModelViewerHandle>(null);
  const [mode, setMode] = useState<"idle" | "add" | "move">("idle");
  const [activeKey, setActiveKey] = useState<string>();

  const active = value.find((item) => item._key === activeKey);
  const activeIndex = active ? value.indexOf(active) : -1;
  const markers: Marker[] = value.flatMap((item) =>
    item.anchor && item.normal
      ? [
          {
            key: item._key,
            label: item.label ?? "Hotspot",
            anchor: item.anchor,
            normal: item.normal,
          },
        ]
      : []
  );

  const onPick = (anchor: Point, normal: Point) => {
    const current = viewerRef.current?.getView() ?? null;
    if (mode === "add") {
      const key = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
      const taken = new Set(value.map((item) => item.id));
      let n = value.length + 1;
      while (taken.has(`hotspot-${n}`)) n++;
      onChange([
        setIfMissing([]),
        insert(
          [
            {
              _key: key,
              _type: "modelHotspot",
              id: `hotspot-${n}`,
              label: "New hotspot",
              specs: [],
              anchor: vec3(anchor),
              normal: vec3(normal),
              pose: pose(shotFor(anchor, normal, current)),
            },
          ],
          "after",
          [-1]
        ),
      ]);
      setActiveKey(key);
    } else if (mode === "move" && active) {
      const path = [{ _key: active._key }];
      onChange([
        set(vec3(anchor), [...path, "anchor"]),
        set(vec3(normal), [...path, "normal"]),
      ]);
    }
    setMode("idle");
  };

  const saveCurrentView = () => {
    const view = viewerRef.current?.getView();
    if (!(view && active)) return;
    onChange(
      set(pose(view, active.pose?.frameOffset ?? SHOT_OFFSET), [
        { _key: active._key },
        "pose",
      ])
    );
  };

  const previewShot = () => {
    if (active?.pose) viewerRef.current?.flyTo(active.pose);
  };

  if (model.status === "none") {
    return (
      <Stack gap={3}>
        <Card padding={3} radius={2} tone="caution" border>
          <Text size={1}>Pick a 3D model above to place hotspots on it.</Text>
        </Card>
        {props.renderDefault(props)}
      </Stack>
    );
  }

  return (
    <Stack gap={3}>
      {model.status === "ready" && (
        <ModelViewer
          ref={viewerRef}
          url={model.url}
          markers={markers}
          activeKey={activeKey}
          picking={mode !== "idle"}
          onPick={onPick}
          onSelect={(key) => {
            setActiveKey(key);
            setMode("idle");
          }}
        />
      )}

      <Card padding={2} radius={2} border>
        <Flex gap={2} wrap="wrap" align="center">
          {mode === "idle" ? (
            <Button
              text="Add hotspot"
              tone="primary"
              mode="ghost"
              disabled={readOnly || model.status !== "ready"}
              onClick={() => setMode("add")}
            />
          ) : (
            <Button
              text="Cancel"
              mode="ghost"
              onClick={() => setMode("idle")}
            />
          )}
          <Text size={1} muted>
            {active
              ? `Selected: ${String(activeIndex + 1).padStart(2, "0")} ${active.label ?? ""}`
              : "Click a numbered dot to select it."}
          </Text>
          {active && mode === "idle" && (
            <Flex gap={2} wrap="wrap" style={{ marginLeft: "auto" }}>
              <Button
                text="Move point"
                mode="ghost"
                disabled={readOnly}
                onClick={() => setMode("move")}
              />
              <Button
                text="Use this view"
                mode="ghost"
                disabled={readOnly}
                onClick={saveCurrentView}
              />
              <Button
                text="Preview shot"
                mode="bleed"
                disabled={!active.pose}
                onClick={previewShot}
              />
            </Flex>
          )}
        </Flex>
      </Card>

      {props.renderDefault(props)}
    </Stack>
  );
}
