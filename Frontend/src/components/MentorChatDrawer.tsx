import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { MentorChatPage } from "../pages/MentorChatPage";
import "./mentorChatDrawer.css";

type MentorChatDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MentorChatDrawer({ open, onClose }: MentorChatDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sd-mentor-drawer-root">
      <button
        type="button"
        className="sd-mentor-drawer-backdrop"
        onClick={onClose}
        aria-label="Close AI Mentor panel"
      />
      <aside
        className="sd-mentor-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="AI Mentor"
      >
        <header className="sd-mentor-drawer-hd">
          <div>
            <h3>AI Mentor</h3>
            <p>Ask doubts, strategy, or next steps</p>
          </div>
          <button
            type="button"
            className="sd-mentor-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="sd-mentor-drawer-close-icon" />
          </button>
        </header>
        <div className="sd-mentor-drawer-body">
          <MentorChatPage embedded />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
