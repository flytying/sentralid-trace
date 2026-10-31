"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./workspace.module.css";

// Full-size view of a screenshot the user added. Uses the native <dialog> for focus trapping,
// Escape to close and the backdrop; clicking outside the image also closes it.
export function ImageViewer({ src, caption, detail, onClose }: { src: string; caption: string; detail?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Guarded and never closed from cleanup: React's dev double-mount would otherwise fire the
    // dialog's close event and dismiss it immediately. Unmounting removes the dialog anyway.
    if (!d.open) d.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.viewer}
      aria-label={caption}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={src} alt={caption} />
        <figcaption>
          <strong>{caption}</strong>
          {detail && <span>{detail}</span>}
        </figcaption>
      </figure>
      <button type="button" className={styles.viewerClose} onClick={onClose} aria-label="Close">
        <X size={20} aria-hidden="true" />
      </button>
    </dialog>
  );
}
