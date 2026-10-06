import { Video } from "@remotion/media";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { getClipVideoLayout } from "@/lib/editor";
import { getTextLayerPositionStyle, getTextLayerStyle } from "@/lib/text-layer";
import type { ClipRenderInput } from "@/remotion/clip-render-input";

export function ClipComposition({
  src,
  sourceWidth,
  sourceHeight,
  cropRect,
  transform,
  textLayers,
}: ClipRenderInput) {
  const { width, height } = useVideoConfig();
  const layout = getClipVideoLayout(
    { width: sourceWidth, height: sourceHeight },
    { width, height },
    cropRect,
    transform,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: layout.width,
          height: layout.height,
          transform: `translate(-50%, -50%) translate(${layout.offsetX}px, ${layout.offsetY}px)`,
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
