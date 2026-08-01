import React, { useEffect, useState } from "react";
import { Loader2, Users, Crown, IndianRupee, ShoppingBag, BookOpen, Layers } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { useTheme } from "../../hooks/useTheme";
import { notesPortalAdminAPI, type NotesPortalAnalytics } from "../../services/api";

export const AdminNotesAnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<NotesPortalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await notesPortalAdminAPI.analytics();
        if (res.data.success) setData(res.data.data);
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { message?: string } } };
        setError(ax.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    { label: "Total Notes Users", value: data?.totalNotesUsers ?? 0, icon: Users },
    { label: "Premium Subscribers", value: data?.premiumSubscribers ?? 0, icon: Crown },
    { label: "Revenue", value: `₹${data?.revenue ?? 0}`, icon: IndianRupee },
    { label: "Plans Sold", value: data?.plansSold ?? 0, icon: ShoppingBag },
    { label: "Subjects", value: data?.totalSubjects ?? 0, icon: Layers },
    { label: "Published Notes", value: data?.publishedNotes ?? 0, icon: BookOpen },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
          Notes Analytics
        </h1>
        <p className={`text-sm mt-1 ${muted}`}>Notes Website overview from Student Portal Admin</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.map((s) => (
              <Card key={s.label} className={isDark ? "bg-slate-900 border-slate-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${muted}`} />
                    <span className={`text-xs ${muted}`}>{s.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                    {s.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
              <CardContent className="p-4">
                <h2 className={`font-semibold mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  Latest Registrations
                </h2>
                <div className="space-y-2">
                  {(data?.latestRegistrations || []).map((u) => (
                    <div key={u._id} className={`text-sm border-b pb-2 ${isDark ? "border-slate-700" : "border-slate-100"}`}>
                      <div className={isDark ? "text-slate-100" : "text-slate-900"}>{u.name}</div>
                      <div className={`text-xs ${muted}`}>{u.email}</div>
                    </div>
                  ))}
                  {!data?.latestRegistrations?.length && (
                    <p className={`text-sm ${muted}`}>No registrations yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={isDark ? "bg-slate-900 border-slate-700" : ""}>
              <CardContent className="p-4">
                <h2 className={`font-semibold mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  Latest Payments
                </h2>
                <div className="space-y-2">
                  {(data?.latestPayments || []).map((p) => (
                    <div key={p._id} className={`text-sm border-b pb-2 ${isDark ? "border-slate-700" : "border-slate-100"}`}>
                      <div className="flex justify-between gap-2">
                        <span className={isDark ? "text-slate-100" : "text-slate-900"}>
                          {typeof p.user === "object" ? p.user?.name : "—"}
                        </span>
                        <span className="font-medium">₹{p.amount}</span>
                      </div>
                      <div className={`text-xs ${muted}`}>
                        {typeof p.plan === "object" ? p.plan?.title : "—"}
                      </div>
                    </div>
                  ))}
                  {!data?.latestPayments?.length && (
                    <p className={`text-sm ${muted}`}>No payments yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminNotesAnalyticsPage;
