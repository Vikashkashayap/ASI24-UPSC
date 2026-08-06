import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { LandingNavbar } from "../../components/landing/Navbar";
import { Button } from "../../components/ui/button";

export const ForgotPasswordPage = () => {
  return (
    <div className="min-h-[100dvh] min-h-screen overflow-x-hidden bg-[#0b1f45] text-slate-50">
      <div className="sticky top-0 z-50">
        <LandingNavbar />
      </div>
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-3 py-8 sm:px-4 md:py-12">
        <Card className="mx-auto w-full max-w-md rounded-2xl border border-blue-400/25 bg-[#0d2550] text-slate-50 shadow-xl">
          <CardHeader className="px-4 pb-3 pt-4 md:px-6 md:pb-4 md:pt-6">
            <CardTitle className="text-base text-slate-50 md:text-lg">Reset password</CardTitle>
            <CardDescription className="mt-1 text-xs text-slate-300 md:text-sm">
              Contact your mentor or admin to reset your password. They can reset it from the admin dashboard and share the new password with you so you can sign in right away.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
            <Link to="/login">
              <Button className="w-full">Back to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
