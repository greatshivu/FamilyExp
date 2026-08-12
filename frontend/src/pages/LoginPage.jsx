import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingMessage = location.state?.pendingMessage;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) {
      toast.success("Welcome back");
      navigate("/dashboard");
    } else {
      toast.error(r.error || "Login failed");
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
            <div>
              <div className="font-display font-black text-[#1C1F1D] text-lg leading-tight">
                Family Ledger
              </div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#8C938F]">
                Family Expense Manager
              </div>
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#1C1F1D] mb-2">
            Welcome back.
          </h1>
          <p className="text-[#5C635F] mb-6">
            Sign in to manage family expenses.
          </p>

          {pendingMessage && (
            <div
              className="mb-6 border border-[#DCD7CB] bg-[#E8E5DC] rounded-md p-3 text-sm text-[#1C1F1D]"
              data-testid="pending-approval-banner"
            >
              {pendingMessage}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-[#5C635F]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="bg-white border-[#DCD7CB] focus:border-[#2D4C3B] focus:ring-[#2D4C3B] h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-[#5C635F]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="bg-white border-[#DCD7CB] focus:border-[#2D4C3B] focus:ring-[#2D4C3B] h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full h-11 bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0] font-semibold"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-[#5C635F] mt-6 text-center">
            No account?{" "}
            <Link to="/register" className="text-[#2D4C3B] font-semibold underline">
              Create one
            </Link>
          </p>
          <p className="text-sm text-[#5C635F] mt-2 text-center">
            <Link to="/forgot-password" className="text-[#2D4C3B] font-semibold underline" data-testid="forgot-password-link">
              Forgot password?
            </Link>
          </p>
        </div>
        <p className="text-center text-[#DCD7CB] text-xs mt-6">
          Any account creation needs Admin Approval to login
        </p>
      </div>
    </div>
  );
}
