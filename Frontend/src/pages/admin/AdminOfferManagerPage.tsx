import React, { useState, useEffect } from "react";
import { Tag, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { offersAPI, type OfferType } from "../../services/api";
import { ConfirmationDialog } from "../../components/ui/dialog";

type FormValues = {
  title: string;
  description: string;
  discount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isHidden: boolean;
  ctaText: string;
  redirectUrl: string;
};

const defaultForm: FormValues = {
  title: "",
  description: "",
  discount: 0,
  startDate: "",
  endDate: "",
  isActive: true,
  isHidden: false,
  ctaText: "Claim Offer",
  redirectUrl: "",
};

export const AdminOfferManagerPage: React.FC = () => {
  const { theme } = useTheme();
  const [offers, setOffers] = useState<OfferType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferType | null>(null);
  const [form, setForm] = useState<FormValues>(defaultForm);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await offersAPI.list();
      if (res.data.success) setOffers(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingOffer(null);
    setForm(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (offer: OfferType) => {
    setEditingOffer(offer);
    setForm({
      title: offer.title,
      description: offer.description || "",
      discount: offer.discount || 0,
      startDate: offer.startDate.slice(0, 10),
      endDate: offer.endDate.slice(0, 10),
      isActive: offer.isActive,
      isHidden: offer.isHidden,
      ctaText: offer.ctaText || "Claim Offer",
      redirectUrl: offer.redirectUrl || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaveLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        discount: Number(form.discount) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive,
        isHidden: form.isHidden,
        ctaText: form.ctaText.trim() || "Claim Offer",
        redirectUrl: form.redirectUrl.trim(),
      };
      if (editingOffer) {
        await offersAPI.update(editingOffer._id, payload);
        setSuccess("Offer updated.");
      } else {
        await offersAPI.create(payload);
        setSuccess("Offer created.");
      }
      setFormOpen(false);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to save offer");
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setError(null);
    setDeleteLoading(true);
    try {
      await offersAPI.delete(deleteId);
      setSuccess("Offer deleted.");
      setDeleteId(null);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to delete offer");
    } finally {
      setDeleteLoading(false);
    }
  };

  const isDark = theme === "dark";
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`;
  const labelClass = `block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          Offer Manager
        </h1>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Offer
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
          ) : offers.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 px-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <Tag className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center font-medium">No offers yet</p>
              <p className="text-sm mt-1 text-center">Create a festival or promo offer to show on the landing page banner.</p>
              <Button onClick={openCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Offer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDark ? "border-b border-slate-700" : "border-b border-slate-200"}>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Title</th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Discount</th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Period</th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Active</th>
                    <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Hidden</th>
                    <th className={`text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr
                      key={offer._id}
                      className={isDark ? "border-b border-slate-800 hover:bg-slate-800/30" : "border-b border-slate-100 hover:bg-slate-50"}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                        {offer.title}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {offer.discount}%
                      </td>
                      <td className={`py-3 px-4 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {new Date(offer.startDate).toLocaleDateString()} – {new Date(offer.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${offer.isActive ? (isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700") : (isDark ? "bg-slate-600/50 text-slate-400" : "bg-slate-200 text-slate-600")}`}>
                          {offer.isActive ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${offer.isHidden ? (isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700") : (isDark ? "bg-slate-600/50 text-slate-400" : "bg-slate-200 text-slate-600")}`}>
                          {offer.isHidden ? "Hidden" : "Visible"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(offer)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"}`}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(offer._id)}
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

      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                {editingOffer ? "Edit Offer" : "Add Offer"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className={inputClass}
                    required
                    placeholder="e.g. Diwali Special"
                  />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className={inputClass}
                    placeholder="Short description"
                  />
                </div>
                <div>
                  <label className={labelClass}>Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Start Date *</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>End Date *</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="rounded border-slate-400"
                    />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isHidden}
                      onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.checked }))}
                      className="rounded border-slate-400"
                    />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>Manually hidden</span>
                  </label>
                </div>
                <div>
                  <label className={labelClass}>CTA Button Text</label>
                  <input
                    type="text"
                    value={form.ctaText}
                    onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g. Buy Now, Claim Offer"
                  />
                </div>
                <div>
                  <label className={labelClass}>Redirect URL</label>
                  <input
                    type="url"
                    value={form.redirectUrl}
                    onChange={(e) => setForm((f) => ({ ...f, redirectUrl: e.target.value }))}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saveLoading}>
                    {saveLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingOffer ? "Update" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteId}
        title="Delete offer"
        message="Are you sure you want to delete this offer?"
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
