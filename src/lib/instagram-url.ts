const ALLOWED_INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

const ALLOWED_PATH_SEGMENTS = new Set(["reel", "reels", "p"]);

const SHORTCODE_PATTERN = /^[A-Za-z0-9_-]+$/;

type InstagramUrlValidation =
  { valid: true; normalizedUrl: string } | { valid: false; reason: string };

export function validateInstagramUrl(value: string): InstagramUrlValidation {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: "Enter an Instagram URL." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, reason: "Enter a valid URL." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { valid: false, reason: "Only http and https URLs are supported." };
  }

  if (!ALLOWED_INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) {
    return { valid: false, reason: "Only instagram.com links are supported." };
  }

  const segments = url.pathname
    .split("/")
    .filter((segment) => segment.length > 0);

  if (!ALLOWED_PATH_SEGMENTS.has(segments[0] ?? "")) {
    return {
      valid: false,
      reason: "Only Instagram Reels, posts, and videos are supported.",
    };
  }

  const shortcode = segments[1];
  if (!shortcode || !SHORTCODE_PATTERN.test(shortcode)) {
    return {
      valid: false,
      reason: "The link is missing a valid Instagram shortcode.",
    };
  }

  return {
    valid: true,
    normalizedUrl: `https://www.instagram.com/${segments[0]}/${shortcode}/`,
  };
}
