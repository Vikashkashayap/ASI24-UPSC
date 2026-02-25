import React, { useState, useEffect } from "react";
import { IndianRupee, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { pricingAPI, type PricingPlanType } from "../../services/api";
import { PricingFormModal } from "../../components/PricingFormModal";
import { ConfirmationDialog } from "../../components/ui/dialog";
import type { PricingFormValues } from "../../components/PricingFormModal";

export const AdminPricingPage: React.FC = () => {
  const { theme } = useTheme();
  const [plans, setPlans] = useState<PricingPlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlanType | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pricingAPI.list();
      if (res.data.success) setPlans(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load pricing plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    setEditingPlan(null);
    setModalOpen(true);
  };

  const handleEdit = (plan: PricingPlanType) => {
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const handleSubmit = async (values: PricingFormValues) => {
    setError(null);
    setSuccess(null);
    setSaveLoading(true);
    try {
      const payload = {
        name: values.name,
        price: Number(values.price),
        duration: values.duration,
        description: values.description,
        features: values.features,
        isPopular: values.isPopular,
        status: values.status,
      };
      if (editingPlan) {
        await pricingAPI.update(editingPlan._id, payload);
        setSuccess("Plan updated successfully.");
      } else {
        await pricingAPI.create(payload);
        setSuccess("Plan created successfully.");
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to save plan");
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setError(null);
    setDeleteLoading(true);
    try {
      await pricingAPI.delete(deleteId);
      setSuccess("Plan deleted.");
      setDeleteId(null);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to delete plan");
    } finally {
      setDeleteLoading(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          Manage Pricing Plans
        </h1>
        <Button onClick={handleCreate} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 ${isDark ? "bg-red-500/10 border-red-500/40 text-red-200" : "bg-red-50 border-red-200 text-red-800"}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`rounded-xl border px-4 py-3 ${isDark ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
          {success}
        </div>
      )}

      <Card className={`rounded-2xl ${isDark ? "border-purple-800/60 bg-slate-900/50" : ""}`}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
            </div>
          ) : plans.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 px-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <IndianRupee className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center font-medium">No pricing plans yet</p>
              <p className="text-sm mt-1 text-center">Create your first plan to show on the public pricing page.</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDark ? "border-b border-slate-700" : "border-b border-slate-200"}>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Plan Name
                    </th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Price
                    </th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Duration
                    </th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Status
                    </th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Popular
                    </th>
                    <th className={`text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr
                      key={plan._id}
                      className={isDark ? "border-b border-slate-800 hover:bg-slate-800/30" : "border-b border-slate-100 hover:bg-slate-50"}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                        {plan.name}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        ₹{plan.price}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {plan.duration}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            plan.status === "active"
                              ? isDark
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-100 text-emerald-700"
                              : isDark
                                ? "bg-slate-600/50 text-slate-400"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {plan.isPopular && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-fuchsia-500/20 text-fuchsia-300`}>
                            Most Popular
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(plan)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"}`}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(plan._id)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-600"}`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PricingFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingPlan}
        onSubmit={handleSubmit}
        loading={saveLoading}
      />

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete pricing plan"
        message="Are you sure you want to delete this plan? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  );
};
