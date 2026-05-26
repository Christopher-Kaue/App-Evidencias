"use client";

import { useState } from "react";
import { getMediaType, normalizeMediaUrl } from "../../lib/media-url";

type MediaPreviewProps = {
  url: string;
  alt?: string;
  /** thumb = miniatura na lista de anexos; full = preview maior (capa / detalhe) */
  variant?: "thumb" | "full";
};

export function MediaPreview({ url, alt = "Anexo do evento", variant = "thumb" }: MediaPreviewProps) {
  const src = normalizeMediaUrl(url);
  const type = getMediaType(url);
  const [useVideo, setUseVideo] = useState(type === "video");

  const thumbImg = { width: 112, height: 84, objectFit: "cover" as const, borderRadius: 8, display: "block" };
  const fullImg = { width: "100%", maxWidth: 360, borderRadius: 10, display: "block", objectFit: "cover" as const };

  if (useVideo || type === "video") {
    return (
      <video
        src={src}
        controls={variant === "full"}
        muted={variant === "thumb"}
        playsInline
        style={variant === "thumb" ? { ...thumbImg, width: 160, height: 90 } : { ...fullImg, maxWidth: 420 }}
      />
    );
  }

  if (type === "image" || /media\.php/i.test(url)) {
    return (
      <img
        src={src}
        alt={alt}
        style={variant === "thumb" ? thumbImg : fullImg}
        onError={() => setUseVideo(true)}
      />
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" className="media-preview-link">
      Abrir anexo
    </a>
  );
}
