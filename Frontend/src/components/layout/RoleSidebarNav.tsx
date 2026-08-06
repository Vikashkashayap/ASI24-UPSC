import React, { memo, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  Award,
  Database,
  Activity,
  Brain,
  Coins,
  ClipboardList,
  BookOpen,
  IndianRupee,
  Library,
  Tag,
  CreditCard,
  Newspaper,
  User,
  HelpCircle,
  ChevronDown,
  Crown,
  Sparkles,
  LogOut,
} from "lucide-react";
import { SidebarNavItem, SidebarSection } from "./SidebarNavItem";
import { SubscriptionCard } from "./SubscriptionCard";
import { STUDENT_NAV_SECTIONS, KB_RAG_ROUTES } from "./navConfig";
import { navLinkClass, sidebarSectionLabelClass } from "./navStyles";
import type { LayoutTheme, LayoutUser } from "./types";

interface RoleNavProps {
  theme: LayoutTheme;
  collapsed: boolean;
  pathname: string;
  user: LayoutUser | null;
  hasActiveSubscription: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  showAccountLogout?: boolean;
}

const AdminSidebarNav = memo(function AdminSidebarNav({
  theme,
  collapsed,
  pathname,
  onNavigate,
}: Omit<RoleNavProps, "user" | "hasActiveSubscription" | "onLogout" | "showAccountLogout">) {
  const isKbRagRoute = KB_RAG_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const [kbRagOpen, setKbRagOpen] = useState(isKbRagRoute);

  useEffect(() => {
    if (isKbRagRoute) setKbRagOpen(true);
  }, [isKbRagRoute]);

  return (
    <>
      <div className="space-y-1">
        <NavLink
          to="/admin/dashboard"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Admin Dashboard"
          onClick={onNavigate}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Admin Dashboard</span>}
        </NavLink>
        <NavLink
          to="/admin/students"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="MD Student"
          onClick={onNavigate}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>MD Student</span>}
        </NavLink>
        <NavLink
          to="/admin/mentors"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Mentors"
          onClick={onNavigate}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Mentors</span>}
        </NavLink>
        <NavLink
          to="/admin/pro-students"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Pro Plan Students"
          onClick={onNavigate}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Pro Students</span>}
        </NavLink>
        <NavLink
          to="/admin/prelims-mock"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Prelims Mock - Schedule tests"
          onClick={onNavigate}
        >
          <Award className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Prelims Mock</span>}
        </NavLink>

        {!collapsed ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setKbRagOpen((v) => !v);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold min-h-[42px] touch-manipulation transition-colors ${
                theme === "dark"
                  ? `hover:bg-white/[0.06] ${isKbRagRoute || kbRagOpen ? "text-slate-100" : "text-slate-300"}`
                  : `hover:bg-slate-100/90 ${isKbRagRoute || kbRagOpen ? "text-slate-900" : "text-slate-600"}`
              }`}
              aria-expanded={kbRagOpen}
              title="KB+RAG"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Database
                  className={`w-4 h-4 flex-shrink-0 ${
                    isKbRagRoute ? (theme === "dark" ? "text-blue-300" : "text-blue-600") : ""
                  }`}
                />
                <span className="truncate">KB+RAG</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  kbRagOpen ? "rotate-180" : ""
                } ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
              />
            </button>
            {kbRagOpen && (
              <div
                className={`mt-0.5 ml-2 pl-2 space-y-0.5 border-l ${
                  theme === "dark" ? "border-slate-700" : "border-slate-200"
                }`}
              >
                <NavLink
                  to="/admin/knowledge-base"
                  className={(props) => navLinkClass({ ...props, theme, collapsed: false })}
                  title="Knowledge Base — upload notes, PDFs & PYQs"
                  onClick={onNavigate}
                >
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span>Knowledge Base</span>
                </NavLink>
                <NavLink
                  to="/admin/processing"
                  className={(props) => navLinkClass({ ...props, theme, collapsed: false })}
                  title="AI Processing Engine — queues, OCR, parse, chunks"
                  onClick={onNavigate}
                >
                  <Activity className="w-4 h-4 flex-shrink-0" />
                  <span>Processing</span>
                </NavLink>
                <NavLink
                  to="/admin/intelligence"
                  className={(props) => navLinkClass({ ...props, theme, collapsed: false })}
                  title="Knowledge Intelligence — embeddings & hybrid search"
                  onClick={onNavigate}
                >
                  <Brain className="w-4 h-4 flex-shrink-0" />
                  <span>Intelligence</span>
                </NavLink>
                <NavLink
                  to="/admin/ai-analytics"
                  className={(props) => navLinkClass({ ...props, theme, collapsed: false })}
                  title="AI Cost Analytics — estimated vs actual tokens"
                  onClick={onNavigate}
                >
                  <Coins className="w-4 h-4 flex-shrink-0" />
                  <span>AI Cost Analytics</span>
                </NavLink>
                <NavLink
                  to="/admin/ai-health"
                  className={(props) => navLinkClass({ ...props, theme, collapsed: false })}
                  title="AI Health Monitor — latency, success, queue"
                  onClick={onNavigate}
                >
                  <Activity className="w-4 h-4 flex-shrink-0" />
                  <span>AI Health Monitor</span>
                </NavLink>
              </div>
            )}
          </div>
        ) : (
          <>
            <NavLink
              to="/admin/knowledge-base"
              className={(props) => navLinkClass({ ...props, theme, collapsed: true })}
              title="Knowledge Base"
              onClick={onNavigate}
            >
              <Database className="w-4 h-4 flex-shrink-0" />
            </NavLink>
            <NavLink
              to="/admin/processing"
              className={(props) => navLinkClass({ ...props, theme, collapsed: true })}
              title="Processing"
              onClick={onNavigate}
            >
              <Activity className="w-4 h-4 flex-shrink-0" />
            </NavLink>
            <NavLink
              to="/admin/intelligence"
              className={(props) => navLinkClass({ ...props, theme, collapsed: true })}
              title="Intelligence"
              onClick={onNavigate}
            >
              <Brain className="w-4 h-4 flex-shrink-0" />
            </NavLink>
            <NavLink
              to="/admin/ai-analytics"
              className={(props) => navLinkClass({ ...props, theme, collapsed: true })}
              title="AI Cost Analytics"
              onClick={onNavigate}
            >
              <Coins className="w-4 h-4 flex-shrink-0" />
            </NavLink>
            <NavLink
              to="/admin/ai-health"
              className={(props) => navLinkClass({ ...props, theme, collapsed: true })}
              title="AI Health Monitor"
              onClick={onNavigate}
            >
              <Activity className="w-4 h-4 flex-shrink-0" />
            </NavLink>
          </>
        )}

        <NavLink
          to="/admin/topic-practice"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Topic Practice - Assign tests to students"
          onClick={onNavigate}
        >
          <ClipboardList className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Topic Practice</span>}
        </NavLink>
        <NavLink
          to="/admin/syllabus-targets"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Syllabus Targets - Assign modules to student home"
          onClick={onNavigate}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Syllabus Targets</span>}
        </NavLink>
        <NavLink
          to="/admin/pricing"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Pricing Plans"
          onClick={onNavigate}
        >
          <IndianRupee className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Pricing Plans</span>}
        </NavLink>
        <NavLink
          to="/admin/mains-materials"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Mains Materials"
          onClick={onNavigate}
        >
          <Library className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Mains Materials</span>}
        </NavLink>
        <NavLink
          to="/admin/offer-manager"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Offer Manager"
          onClick={onNavigate}
        >
          <Tag className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Offer Manager</span>}
        </NavLink>

        {!collapsed && (
          <div className="pt-3 md:pt-4 pb-1 md:pb-2">
            <div className={sidebarSectionLabelClass(theme)}>Notes Website</div>
          </div>
        )}
        <NavLink
          to="/admin/notes-analytics"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Notes Analytics"
          onClick={onNavigate}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Analytics</span>}
        </NavLink>
        <NavLink
          to="/admin/notes-pricing-plans"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Notes Pricing Plans"
          onClick={onNavigate}
        >
          <IndianRupee className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Pricing Plans</span>}
        </NavLink>
        <NavLink
          to="/admin/notes-payments"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Payments"
          onClick={onNavigate}
        >
          <CreditCard className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Payments</span>}
        </NavLink>
        <NavLink
          to="/admin/notes-manager"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Registered Notes Users"
          onClick={onNavigate}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Registered Notes Users</span>}
        </NavLink>
        <NavLink
          to="/admin/current-affairs"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Current Affairs"
          onClick={onNavigate}
        >
          <Newspaper className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Current Affairs</span>}
        </NavLink>
      </div>

      {!collapsed && (
        <div className="pt-3 md:pt-4 pb-1 md:pb-2">
          <div className={sidebarSectionLabelClass(theme)}>Admin Tools</div>
        </div>
      )}
      <div className="space-y-1">
        <NavLink
          to="/profile"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Profile"
          onClick={onNavigate}
        >
          <User className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Profile</span>}
        </NavLink>
        <NavLink
          to="/help-support"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Help & Support"
          onClick={onNavigate}
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Help & Support</span>}
        </NavLink>
      </div>
    </>
  );
});

const MentorSidebarNav = memo(function MentorSidebarNav({
  theme,
  collapsed,
  onNavigate,
}: Pick<RoleNavProps, "theme" | "collapsed" | "onNavigate">) {
  return (
    <>
      <div className="space-y-1">
        <NavLink
          to="/mentor-dashboard"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Mentor Dashboard"
          end
          onClick={onNavigate}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink
          to="/mentor-dashboard/students"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Your Students"
          onClick={onNavigate}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Students</span>}
        </NavLink>
        <NavLink
          to="/mentor-dashboard/topic-practice"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Topic Practice - Assign tests to your students"
          onClick={onNavigate}
        >
          <ClipboardList className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Topic Practice</span>}
        </NavLink>
        <NavLink
          to="/mentor-dashboard/syllabus-targets"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Syllabus Targets - Send planner to your students"
          onClick={onNavigate}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Syllabus Targets</span>}
        </NavLink>
      </div>
      {!collapsed && (
        <div className="pt-3 md:pt-4 pb-1 md:pb-2">
          <div className={sidebarSectionLabelClass(theme)}>Account</div>
        </div>
      )}
      <div className="space-y-1">
        <NavLink
          to="/profile"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Profile"
          onClick={onNavigate}
        >
          <User className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Profile</span>}
        </NavLink>
        <NavLink
          to="/help-support"
          className={(props) => navLinkClass({ ...props, theme, collapsed })}
          title="Help & Support"
          onClick={onNavigate}
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Help & Support</span>}
        </NavLink>
      </div>
    </>
  );
});

const StudentSidebarNav = memo(function StudentSidebarNav({
  theme,
  collapsed,
  pathname,
  user,
  hasActiveSubscription,
  onNavigate,
  onLogout,
  showAccountLogout = false,
}: RoleNavProps) {
  const navigate = useNavigate();

  return (
    <>
      {!collapsed && (
        <div className="mb-4 px-0.5">
          {hasActiveSubscription ? (
            <SubscriptionCard
              planName={user?.subscriptionPlan?.name || "Pro Plan"}
              endDate={user?.subscriptionEndDate}
              theme={theme}
              onClick={() => {
                onNavigate?.();
                navigate("/profile");
              }}
            />
          ) : (
            <NavLink
              to="/pricing"
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-blue-600/30 to-blue-500/10 text-white ring-1 ring-blue-400/25 hover:from-blue-600/40"
                  : "bg-gradient-to-br from-blue-600 to-blue-700 text-white ring-1 ring-blue-500/20 hover:brightness-105"
              }`}
              onClick={onNavigate}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold">Subscribe to Pro</p>
                <p className="text-[10px] font-medium text-blue-100/90">Unlock all features</p>
              </div>
            </NavLink>
          )}
        </div>
      )}
      {collapsed && hasActiveSubscription && (
        <button
          type="button"
          title={user?.subscriptionPlan?.name || "Pro Plan"}
          onClick={() => navigate("/profile")}
          className={`mb-3 mx-auto flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            theme === "dark"
              ? "bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-100"
          }`}
        >
          <Crown className="w-4 h-4" />
        </button>
      )}

      {STUDENT_NAV_SECTIONS.map((section) => (
        <SidebarSection key={section.id} label={section.label} theme={theme} collapsed={collapsed}>
          {section.items.map((item) => (
            <SidebarNavItem
              key={`${section.id}-${item.label}-${item.to}`}
              to={item.to}
              title={item.title}
              icon={item.icon}
              label={item.label}
              theme={theme}
              collapsed={collapsed}
              pathname={pathname}
              end={item.end}
              isActiveMatch={item.isActiveMatch}
              onNavigate={onNavigate}
            />
          ))}
          {section.id === "account" && showAccountLogout && (
            <button
              type="button"
              onClick={() => {
                onNavigate?.();
                onLogout();
              }}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2.5"} ${
                collapsed ? "px-2" : "px-3"
              } py-2 rounded-xl text-[13px] font-medium transition-colors min-h-[42px] touch-manipulation group ${
                theme === "dark"
                  ? "text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                  : "text-slate-500 hover:bg-red-50 hover:text-red-600"
              }`}
              title="Logout"
            >
              <LogOut className="w-[17px] h-[17px] flex-shrink-0 stroke-[2]" />
              {!collapsed && <span>Logout</span>}
            </button>
          )}
        </SidebarSection>
      ))}
    </>
  );
});

export const RoleSidebarNav = memo(function RoleSidebarNav(props: RoleNavProps) {
  const role = props.user?.role;
  if (role === "admin") {
    return (
      <AdminSidebarNav
        theme={props.theme}
        collapsed={props.collapsed}
        pathname={props.pathname}
        onNavigate={props.onNavigate}
      />
    );
  }
  if (role === "mentor") {
    return (
      <MentorSidebarNav
        theme={props.theme}
        collapsed={props.collapsed}
        onNavigate={props.onNavigate}
      />
    );
  }
  return <StudentSidebarNav {...props} />;
});
