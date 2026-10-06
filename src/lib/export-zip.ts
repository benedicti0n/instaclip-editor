import { makeZip } from "client-zip";

export type ExportZipFilenames = {
  video: string;
  caption: string;
};

/**
 * Packages the rendered video and the caption into one ZIP archive.
 *
 * `client-zip` stores files without compression (MP4 is already compressed)
 * and streams from the input Blobs, so no additional full-size copy of the
 * video is made while building the archive. The returned Blob is the archive
 * itself, which the caller downloads.
 *
 * The caption is always included, even when empty, so the archive structure
 * is predictable.
 */
export async function createExportZipBlob(
  videoBlob: Blob,
  caption: string,
  filenames: ExportZipFilenames,
): Promise<Blob> {
  const captionBlob = new Blob([caption], {
    type: "text/plain;charset=utf-8",
  });

  const stream = makeZip([
    { name: filenames.video, input: videoBlob },
    { name: filenames.caption, input: captionBlob },
  ]);

  return await new Response(stream, {
    headers: { "Content-Type": "application/zip" },
  }).blob();
}
