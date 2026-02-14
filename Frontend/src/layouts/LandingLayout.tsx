import { LandingNavbar } from "../components/landing/Navbar";
import { useTheme } from "../hooks/useTheme";

export const LandingLayout = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen overflow-y-auto scroll-smooth scrollbar-hide transition-colors ${
      theme === "dark" ? "bg-[#020012] text-slate-50" : "bg-white text-slate-900"
    }`}>
      <LandingNavbar />
      <main className="pt-12 md:pt-14">
        {children}
      </main>
    </div>
  );
};
