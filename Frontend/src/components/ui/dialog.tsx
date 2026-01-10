import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { useTheme } from '../../hooks/useTheme';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-lg shadow-xl ${
        theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"
      } border`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
              {title}
            </h2>
            <button
              onClick={onCancel}
              className={`p-1 rounded ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className={`text-sm mb-6 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            {message}
          </p>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={confirmButtonClass}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Deleting...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Shadcn/ui style Dialog components
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const { theme } = useTheme();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`relative ${theme === "dark" ? "bg-slate-900" : "bg-white"} rounded-lg shadow-xl max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ asChild, children, onClick }) => {
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick,
    });
  }

  return <div onClick={onClick}>{children}</div>;
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className = '' }) => {
  const { theme } = useTheme();

  return (
    <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className = '' }) => {
  const { theme } = useTheme();

  return (
    <div className={`flex items-center justify-between p-6 border-b ${
      theme === "dark" ? "border-slate-700" : "border-slate-200"
    } ${className}`}>
      {children}
    </div>
  );
};

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => {
  const { theme } = useTheme();

  return (
    <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"} ${className}`}>
      {children}
    </h2>
  );
};
