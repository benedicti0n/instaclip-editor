"use client";

import { useState, type FormEvent } from "react";

export function InstagramImportForm() {
  const [url, setUrl] = useState("");
  const canImport = url.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="mt-8" onSubmit={handleSubmit}>
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
        onChange={(event) => setUrl(event.target.value)}
        className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
      />
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        ClipCrop will import the video and its original caption so you can crop
        and reposition it before exporting.
      </p>
      <button
        type="submit"
        disabled={!canImport}
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Import video
      </button>
    </form>
  );
}
