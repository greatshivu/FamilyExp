import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
      toast.success("If the email exists, a reset link has been sent.");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-[#F5F4F0]/95 backdrop-blur-xl rounded-md border border-[#DCD7CB] shadow-2xl p-8 fade-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#2D4C3B] text-[#F5F4F0] rounded-md flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="font-display font-black text-[#1C1F1D] text-lg">Family Ledger</div>
          </div>
          <h1 className="font-display text-3xl font-black text-[#1C1F1D] mb-2">Forgot password</h1>
          <p className="text-[#5C635F] mb-6">Enter the email tied to your account — we'll email a reset link.</p>

          {done ? (
            <div
              className="border border-[#DCD7CB] bg-[#E8E5DC] rounded-md p-4 text-sm text-[#1C1F1D]"
              data-testid="forgot-success-banner"
            >
              If <b>{email}</b> matches an approved account, a reset link has been sent. The link expires in 1 hour.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="forgot-email-input"
                  className="bg-white border-[#DCD7CB] h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="forgot-submit-btn"
                className="w-full h-11 bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0] font-semibold"
              >
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="text-sm text-[#5C635F] mt-6 text-center">
            <Link to="/login" className="text-[#2D4C3B] font-semibold underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
