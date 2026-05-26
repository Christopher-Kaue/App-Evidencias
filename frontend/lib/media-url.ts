/** Corrige http→https quando a pagina esta em HTTPS (evita bloqueio de midia mista). */
export function normalizeMediaUrl(url: string): string {
  if (!url) return url;
  if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://")) {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}

export function getMediaType(url: string): "image" | "video" | "other" {
  const kindMatch = url.match(/[?&]kind=(image|video)/i);
  if (kindMatch) {
    return kindMatch[1].toLowerCase() === "video" ? "video" : "image";
  }

  if (/media\.php\?/i.test(url)) {
    return "image";
  }

  const clean = url.toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(clean)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(clean)) return "video";
  return "other";
}
