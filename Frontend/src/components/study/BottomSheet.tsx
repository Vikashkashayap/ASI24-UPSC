import React, { memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet = memo(function BottomSheet({
  open,
  title,
  onClose,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center" role="dialog" aria-modal>
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
            className="relative z-10 w-full max-w-lg rounded-t-[24px] border border-slate-200/80 bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl md:mb-0 md:rounded-[24px]"
          >
            <div className="flex justify-center pt-3 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
              <h3 className="text-[16px] font-extrabold leading-snug text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="app-chrome-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                aria-label="Close sheet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
});
