import { Button, Card, Flex, Stack, Text } from "@sanity/ui";
import { useRef, useState } from "react";
import { type ObjectInputProps, set, setIfMissing } from "sanity";

import {
  ModelViewer,
  type ModelViewerHandle,
  type Point,
  type View,
} from "./model-viewer";
import { useModelUrl } from "./use-model-url";

type PoseValue = Partial<View> & { frameOffset?: number };

const vec3 = (point: Point) => ({ _type: "vec3", ...point });
const isView = (value?: PoseValue): value is View =>
  Boolean(value?.camera && value.target);

/**
 * A camera shot, set by orbiting the model and pressing "Use this view".
 * Orbiting alone never saves, so looking around can't change the shot.
 * The raw numbers stay available under "Show numbers".
 */
export function CameraPoseInput(props: ObjectInputProps) {
  const { onChange, readOnly, schemaType } = props;
  const value = props.value as PoseValue | undefined;
  const model = useModelUrl();
  const viewerRef = useRef<ModelViewerHandle>(null);
  const [showNumbers, setShowNumbers] = useState(false);

  const saveCurrentView = () => {
    const view = viewerRef.current?.getView();
    if (!view) return;
    onChange([
      setIfMissing({ _type: schemaType.name, frameOffset: 0 }),
      set(vec3(view.camera), ["camera"]),
      set(vec3(view.target), ["target"]),
    ]);
  };

  return (
    <Stack gap={3}>
      {model.status === "none" && (
        <Card padding={3} radius={2} tone="caution" border>
          <Text size={1}>Pick a 3D model above to set this shot.</Text>
        </Card>
      )}
      {model.status === "ready" && (
        <ModelViewer
          ref={viewerRef}
          url={model.url}
          view={isView(value) ? value : undefined}
          height={320}
        />
      )}
      <Flex gap={2} wrap="wrap" align="center">
        <Button
          text="Use this view"
          tone="primary"
          mode="ghost"
          disabled={readOnly || model.status !== "ready"}
          onClick={saveCurrentView}
        />
        <Button
          text="Back to saved shot"
          mode="bleed"
          disabled={!isView(value)}
          onClick={() => {
            if (isView(value)) viewerRef.current?.flyTo(value);
          }}
        />
        <Button
          text={showNumbers ? "Hide numbers" : "Show numbers"}
          mode="bleed"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowNumbers((shown) => !shown)}
        />
      </Flex>
      {showNumbers && props.renderDefault(props)}
    </Stack>
  );
}
