import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ConfirmationDialog } from "../../components/ui/dialog";
import { useTheme } from "../../hooks/useTheme";
import { notesPortalAdminAPI, type NotesPortalPlan } from "../../services/api";

const empty = {
  title: "",
  description: "",
  price: 199,
  duration: "Lifetime",
  durationDays: "" as string | number,
  features: "Unlimited Notes\n350+ Topics\nFuture Updates",
  status: "active" as "active" | "inactive",
  sortOrder: 0,
};

export const AdminNotesPricingPlansPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [items, setItems] = useState<NotesPortalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NotesPortalPlan | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`;
  const labelClass = `block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`;
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notesPortalAdminAPI.listPlans();
      if (res.data.success) setItems(res.data.data || []);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        durationDays:
          form.durationDays === "" || form.durationDays === null
            ? null
            : Number(form.durationDays),
        features: String(form.features)
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
      };
      if (editing) await notesPortalAdminAPI.updatePlan(editing._id, payload);
      else await notesPortalAdminAPI.createPlan(payload);
      setFormOpen(false);
      await load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await notesPortalAdminAPI.deletePlan(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>Pricing Plans</h1>
          <p className={`text-sm mt-1 ${muted}`}>Notes Website subscription plans — price shown on Upgrade comes from these plans</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Plan
        </Button>
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((plan) => (
            <Card key={plan._id} className={isDark ? "bg-slate-900 border-slate-700" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className={`font-bold text-lg ${isDark ? "text-slate-50" : "text-slate-900"}`}>{plan.title}</h3>
                    <p className={`text-sm ${muted}`}>{plan.duration}</p>
                  </div>
                  <div className={`text-xl font-bold ${isDark ? "text-blue-300" : "text-blue-700"}`}>₹{plan.price}</div>
                </div>
                <p className={`text-sm ${muted}`}>{plan.description}</p>
                <ul className={`text-sm space-y-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {(plan.features || []).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <div className={`text-xs ${muted}`}>Status: {plan.status}</div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(plan);
                      setForm({
                        title: plan.title,
                        description: plan.description || "",
                        price: plan.price,
                        duration: plan.duration,
                        durationDays: plan.durationDays ?? "",
                        features: (plan.features || []).join("\n"),
                        status: plan.status,
                        sortOrder: plan.sortOrder || 0,
                      });
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await notesPortalAdminAPI.updatePlan(plan._id, {
                        status: plan.status === "active" ? "inactive" : "active",
                      });
                      await load();
                    }}
                  >
                    {plan.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteId(plan._id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!items.length && <p className={`text-sm ${muted} col-span-2 text-center py-8`}>No plans yet.</p>}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={save} className={`w-full max-w-lg rounded-xl p-6 space-y-3 ${isDark ? "bg-slate-900 text-slate-100" : "bg-white"}`}>
            <h2 className="text-lg font-bold">{editing ? "Edit Plan" : "Create Plan"}</h2>
            <div><label className={labelClass}>Title *</label><input className={inputClass} required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Notes Premium" /></div>
            <div><label className={labelClass}>Description</label><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Price (₹) *</label><input type="number" className={inputClass} required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} /></div>
              <div><label className={labelClass}>Duration *</label><input className={inputClass} required value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="Lifetime" /></div>
            </div>
            <div><label className={labelClass}>Duration Days (blank = lifetime)</label><input type="number" className={inputClass} value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} /></div>
            <div><label className={labelClass}>Features (one per line)</label><textarea className={inputClass} rows={4} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} /></div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmationDialog isOpen={!!deleteId} title="Delete plan?" message="Cannot delete if active subscriptions exist." confirmText="Delete" cancelText="Cancel" confirmButtonClass="bg-red-600 hover:bg-red-700 text-white" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
};

export default AdminNotesPricingPlansPage;
