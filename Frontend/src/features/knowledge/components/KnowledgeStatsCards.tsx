import React from "react";
import { motion } from "framer-motion";
import {
  Files,
  FileText,
  BookOpen,
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { formatBytes } from "../api";
import type { KnowledgeDashboard } from "../types";

type Props = {
  stats: KnowledgeDashboard | null;
  loading?: boolean;
  isDark: boolean;
};

const items = [
  { key: "totalDocuments", label: "Documents", icon: Files, color: "text-sky-600" },
  { key: "totalPdfs", label: "PDFs", icon: FileText, color: "text-rose-600" },
  { key: "totalNotes", label: "Notes", icon: BookOpen, color: "text-emerald-600" },
  { key: "totalPyqs", label: "PYQs", icon: ClipboardList, color: "text-amber-600" },
  { key: "processingDocuments", label: "Processing", icon: Loader2, color: "text-violet-600" },
  { key: "completedDocuments", label: "Completed", icon: CheckCircle2, color: "text-teal-600" },
  { key: "failedDocuments", label: "Failed", icon: AlertTriangle, color: "text-orange-600" },
  { key: "storageUsed", label: "Storage", icon: HardDrive, color: "text-slate-600" },
] as const;

export const KnowledgeStatsCards: React.FC<Props> = ({ stats, loading, isDark }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {items.map((item, i) => {
        const Icon = item.icon;
        const raw = stats?.[item.key] ?? 0;
        const value =
          item.key === "storageUsed" ? formatBytes(Number(raw)) : String(raw ?? 0);

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.35 }}
          >
            <Card
              className={`border shadow-sm ${
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white/90 border-slate-200/80"
              }`}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                </div>
                <div
                  className={`text-xl font-semibold tracking-tight ${
                    isDark ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {value}
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {item.label}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
