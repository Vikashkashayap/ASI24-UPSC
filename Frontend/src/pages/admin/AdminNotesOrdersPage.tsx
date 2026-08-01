import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { notesPortalAdminAPI } from "../../services/api";

type OrderRow = {
  _id: string;
  amount: number;
  status: string;
  paymentId?: string;
  createdAt?: string;
  user?: { name?: string; email?: string; phone?: string };
  plan?: { title?: string; price?: number; duration?: string };
};

export const AdminNotesOrdersPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notesPortalAdminAPI.listOrders({ limit: 100 });
      if (res.data.success) setItems((res.data.data?.items || []) as OrderRow[]);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>Orders</h1>
        <p className={`text-sm mt-1 ${muted}`}>Notes Website subscription orders</p>
      </div>
      {error && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className={isDark ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600"}>
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">User</th>
                <th className="text-left px-3 py-2.5 font-medium">Plan</th>
                <th className="text-left px-3 py-2.5 font-medium">Amount</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 font-medium">Payment ID</th>
                <th className="text-left px-3 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o._id} className={isDark ? "border-t border-slate-700" : "border-t border-slate-100"}>
                  <td className="px-3 py-2.5">
                    <div className={isDark ? "text-slate-100" : "text-slate-900"}>{o.user?.name || "—"}</div>
                    <div className={`text-xs ${muted}`}>{o.user?.email}</div>
                  </td>
                  <td className="px-3 py-2.5">{o.plan?.title || "—"}</td>
                  <td className="px-3 py-2.5">₹{o.amount}</td>
                  <td className="px-3 py-2.5">{o.status}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>{o.paymentId || "—"}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={6} className={`px-3 py-10 text-center ${muted}`}>No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminNotesOrdersPage;
