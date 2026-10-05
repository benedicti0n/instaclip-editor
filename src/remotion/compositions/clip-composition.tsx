import { AbsoluteFill, Video } from "remotion";

export const CLIP_COMPOSITION_FPS = 30;

export type ClipCompositionProps = {
  src: string;
};

export function ClipComposition({ src }: ClipCompositionProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </AbsoluteFill>
  );
}
