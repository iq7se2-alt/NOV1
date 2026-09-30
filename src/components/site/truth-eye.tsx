"use client";

import { useEffect, useRef } from "react";
import { mountTruthEye } from "@/lib/truth-eye";
import { cn } from "@/lib/utils";

/**
 * TruthEye — the animated "عين الحقيقة" emblem.
 *
 * Pure DOM/canvas: no dependencies, no images, and it reads the site's theme
 * variables so it recolours itself with every theme. Click it (or just watch)
 * to send a pulse of light through the eye.
 */
export function TruthEye({
  size = 420,
  className,
  label,
}: {
  size?: number;
  className?: string;
  /** Optional caption under the emblem — omitted when not provided. */
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return mountTruthEye(ref.current);
  }, []);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        ref={ref}
        style={{ width: size, maxWidth: "100%", aspectRatio: "1" }}
        role="img"
        aria-label={label ?? "عين الحقيقة"}
      />
      {label && <p className="mt-4 text-center font-naskh text-sm text-gold/60">{label}</p>}
    </div>
  );
}
