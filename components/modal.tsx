"use client";
import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // create a persistent portal container once
    if (!containerRef.current) {
      const el = document.createElement("div");
      el.className = "modal-portal-root";
      document.body.appendChild(el);
      containerRef.current = el;
    }
    return () => {
      // cleanup on component unmount only
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !containerRef.current) return null;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center px-3"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-50 max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>,
    containerRef.current
  );
}
