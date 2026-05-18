import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";
import { paymentAPI, type PricingPlanType } from "../services/api";
import { loadRazorpayCheckout } from "../utils/razorpay";

interface SubscribeButtonProps {
  plan: PricingPlanType;
  className?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export const SubscribeButton: React.FC<SubscribeButtonProps> = ({
  plan,
  className,
  onSuccess,
  onError,
}) => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleError = (message: string) => {
    if (onError) onError(message);
    console.error(message);
  };

  const handleClick = async () => {
    if (loading) return;

    // Not logged in → send to registration with plan hint
    if (!user) {
      navigate(`/register?planId=${plan._id}`);
      return;
    }

    // Admins and admin-created users don't need to pay
    if (user.role === "admin" || user.accountType === "admin-created") {
      handleError("Your account is already fully activated.");
      return;
    }

    try {
      setLoading(true);

      await loadRazorpayCheckout();

      const createRes = await paymentAPI.createOrder(plan._id);
      const data = createRes.data?.data;
      if (!data?.orderId || !data?.razorpayKeyId) {
        throw new Error("Unable to initialize payment. Please try again.");
      }

      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "MentorsDaily – AI Mentor for UPSC",
        description: plan.name,
        order_id: data.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#7c3aed",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan._id,
            });

            const payload = verifyRes.data?.data;
            if (!verifyRes.data?.success || !payload) {
              throw new Error(verifyRes.data?.message || "Payment verification failed");
            }

            // Update auth state so the app immediately sees the active subscription.
            if (user && token) {
              const updatedUser = {
                ...user,
                accountType: payload.accountType || user.accountType,
                subscriptionStatus: payload.subscriptionStatus,
                subscriptionPlanId: payload.subscriptionPlanId,
                subscriptionStartDate: payload.subscriptionStartDate,
                subscriptionEndDate: payload.subscriptionEndDate,
              };
              login(updatedUser, token);
            }

            if (onSuccess) onSuccess();
          } catch (err: any) {
            handleError(
              err?.response?.data?.message ||
                err?.message ||
                "Payment verification failed. If money was deducted, please contact support."
            );
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      } as any;

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "Unable to start payment. Please try again.";
      if (status === 401 && (message === "Token failed" || message === "Token expired" || message === "Invalid token" || message === "Not authorized")) {
        logout();
        onError?.("Session expired. Please sign in again.");
        navigate("/login", { replace: true, state: { from: "/pricing" } });
        return;
      }
      handleError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={className}
      variant="primary"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Processing..." : "Subscribe Now"}
    </Button>
  );
};

