import { AbsoluteFill, Video, useVideoConfig } from "remotion";
import { getRenderedVideoSize } from "@/lib/editor";
import { getTextLayerPositionStyle, getTextLayerStyle } from "@/lib/text-layer";
import type { TextLayer, VideoTransform } from "@/types/editor";

export const CLIP_COMPOSITION_FPS = 30;

export type ClipCompositionProps = {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  transform: VideoTransform;
  textLayers: TextLayer[];
};

export function ClipComposition({
  src,
  sourceWidth,
  sourceHeight,
  transform,
  textLayers,
}: ClipCompositionProps) {
  const { width, height } = useVideoConfig();
  const renderedSize = getRenderedVideoSize(
    { width: sourceWidth, height: sourceHeight },
    { width, height },
    transform.scale,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: renderedSize.width,
          height: renderedSize.height,
          transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px)`,
        }}
      >
        <Video src={src} style={{ width: "100%", height: "100%" }} />
      </div>
      {textLayers.map((layer) => (
        <div
          key={layer.id}
          style={getTextLayerPositionStyle(layer, { width, height })}
        >
          <div style={getTextLayerStyle(layer)}>{layer.text}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}
