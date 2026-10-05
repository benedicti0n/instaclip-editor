"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importInstagramVideo, ImportRequestError } from "@/lib/import-client";
import { validateInstagramUrl } from "@/lib/instagram-url";
import { useEditorStore } from "@/store/editor-store";

export function InstagramImportForm() {
  const router = useRouter();
  const setMedia = useEditorStore((state) => state.setMedia);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canImport = url.trim().length > 0 && !isImporting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isImporting) {
      return;
    }

    const validation = validateInstagramUrl(url);
    if (!validation.valid) {
      setErrorMessage(validation.reason);
      return;
    }

    setErrorMessage(null);
    setIsImporting(true);

    try {
      const result = await importInstagramVideo(validation.normalizedUrl);

      setMedia(result.media, result.metadata);
      router.push("/editor");
    } catch (error) {
      setErrorMessage(
        error instanceof ImportRequestError
          ? error.message
          : "The import failed unexpectedly. Try again.",
      );
      setIsImporting(false);
    }
  }

  return (
    <form
      className="mt-8"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isImporting}
    >
      <label
        htmlFor="instagram-url"
        className="block text-sm font-medium text-zinc-300"
      >
        Instagram Reel URL
      </label>
      <input
        id="instagram-url"
        name="instagramUrl"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://www.instagram.com/reel/..."
        value={url}
        disabled={isImporting}
        aria-describedby={errorMessage ? "instagram-url-error" : undefined}
        onChange={(event) => setUrl(event.target.value)}
        className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Public Instagram Reels and video posts only. ClipCrop imports the video
        and its original caption for editing.
      </p>
      {errorMessage ? (
        <p
          id="instagram-url-error"
          role="alert"
          className="mt-3 text-xs leading-5 text-red-400"
        >
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" disabled={!canImport} className="mt-5 w-full">
        {isImporting ? "Importing…" : "Import video"}
      </Button>
    </form>
  );
}
