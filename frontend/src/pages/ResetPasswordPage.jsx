import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { PASSWORD_POLICY, isValidPassword } from "@/lib/passwordPolicy";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!token) return toast.error("Reset token missing from URL");
    if (!isValidPassword(password)) return toast.error(PASSWORD_POLICY);
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success("Password updated. Please sign in.");
      navigate("/login");
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
          <h1 className="font-display text-3xl font-black text-[#1C1F1D] mb-2">Reset password</h1>
          <p className="text-[#5C635F] mb-6">{PASSWORD_POLICY}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">New password</Label>
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                data-testid="reset-password-input" className="bg-white border-[#DCD7CB] h-11"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Confirm new password</Label>
              <Input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                data-testid="reset-confirm-input" className="bg-white border-[#DCD7CB] h-11"
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="reset-submit-btn" className="w-full h-11 bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0] font-semibold">
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>

          <p className="text-sm text-[#5C635F] mt-6 text-center">
            <Link to="/login" className="text-[#2D4C3B] font-semibold underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
