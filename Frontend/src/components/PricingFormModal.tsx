import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import type { PricingPlanType } from "../services/api";

const DURATION_OPTIONS = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

export interface PricingFormValues {
  name: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
  isPopular: boolean;
  status: "active" | "draft";
}

const defaultValues: PricingFormValues = {
  name: "",
  price: "",
  duration: "Monthly",
  description: "",
  features: [""],
  isPopular: false,
  status: "draft",
};

interface PricingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: PricingPlanType | null;
  onSubmit: (values: PricingFormValues) => Promise<void>;
  loading?: boolean;
}

export const PricingFormModal: React.FC<PricingFormModalProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [values, setValues] = useState<PricingFormValues>(defaultValues);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setValues({
          name: initialData.name,
          price: String(initialData.price),
          duration: initialData.duration,
          description: initialData.description || "",
          features:
            initialData.features?.length > 0
              ? [...initialData.features, ""]
              : [""],
          isPopular: initialData.isPopular,
          status: initialData.status,
        });
      } else {
        setValues({ ...defaultValues });
      }
    }
  }, [open, initialData]);

  const handleChange = (field: keyof PricingFormValues, value: string | string[] | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev.features];
      next[index] = value;
      return { ...prev, features: next };
    });
  };

  const addFeature = () => {
    setValues((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeature = (index: number) => {
    setValues((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFeatures = values.features.map((f) => f.trim()).filter(Boolean);
    await onSubmit({
      ...values,
      features: trimmedFeatures,
      price: values.price,
    });
  };

  const isDark = theme === "dark";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`rounded-2xl border shadow-xl max-h-[90vh] overflow-y-auto ${
          isDark
            ? "bg-slate-900/95 border-purple-800/60 shadow-purple-900/20"
            : "bg-white border-slate-200"
        }`}
      >
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Pricing Plan" : "Create Pricing Plan"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className={`absolute top-4 right-4 p-1 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Plan Name
            </label>
            <Input
              value={values.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Pro Monthly"
              required
              className={isDark ? "bg-slate-800 border-slate-600 text-slate-100" : ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Price (₹)
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={values.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0"
                required
                className={isDark ? "bg-slate-800 border-slate-600 text-slate-100" : ""}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Duration
              </label>
              <select
                value={values.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                className={`w-full h-10 rounded-md border px-3 py-2 text-sm ${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-300"}`}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Description
            </label>
            <textarea
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Short description of the plan"
              rows={2}
              className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-300"}`}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Features
              </label>
              <button
                type="button"
                onClick={addFeature}
                className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? "text-fuchsia-400 hover:bg-fuchsia-500/20" : "text-purple-600 hover:bg-purple-100"}`}
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {values.features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={f}
                    onChange={(e) => handleFeatureChange(i, e.target.value)}
                    placeholder={`Feature ${i + 1}`}
                    className={isDark ? "bg-slate-800 border-slate-600 text-slate-100" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className={`shrink-0 px-3 rounded-lg ${isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className={`flex items-center gap-2 cursor-pointer ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              <input
                type="checkbox"
                checked={values.isPopular}
                onChange={(e) => handleChange("isPopular", e.target.checked)}
                className="rounded border-slate-400 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span className="text-sm font-medium">Mark as Most Popular</span>
            </label>
            <div className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              <span className="text-sm font-medium">Status:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={values.status === "active"}
                  onChange={() => handleChange("status", "active")}
                  className="text-fuchsia-600 focus:ring-fuchsia-500"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={values.status === "draft"}
                  onChange={() => handleChange("status", "draft")}
                  className="text-fuchsia-600 focus:ring-fuchsia-500"
                />
                <span className="text-sm">Draft</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent inline-block mr-2" />
                  Saving...
                </>
              ) : initialData ? (
                "Update Plan"
              ) : (
                "Create Plan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
