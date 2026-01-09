import React from 'react';
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
