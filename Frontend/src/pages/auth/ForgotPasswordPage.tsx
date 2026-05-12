import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { LandingNavbar } from "../../components/landing/Navbar";
import { Button } from "../../components/ui/button";

export const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 overflow-x-hidden">
      <LandingNavbar />
      <div className="flex items-center justify-center px-3 md:px-4 py-6 md:py-8 min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] pt-20 md:pt-24">
        <Card className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl">
          <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-base md:text-lg text-slate-900">Reset password</CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1 text-slate-600">
              Contact your mentor or admin to reset your password. They can reset it from the admin dashboard and share the new password with you so you can sign in right away.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <Link to="/login">
              <Button className="w-full">Back to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
