import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Leaf, Check, X } from "lucide-react";
import { PASSWORD_POLICY, isValidPassword } from "@/lib/passwordPolicy";

function PasswordChecklist({ pw }) {
  const items = [
    { ok: pw.length >= 8, label: "8+ characters" },
    { ok: /[A-Za-z]/.test(pw), label: "letter" },
    { ok: /\d/.test(pw), label: "number" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "special character" },
  ];
  return (
    <ul className="text-xs space-y-1 mt-2" data-testid="password-checklist">
      {items.map((i) => (
        <li key={i.label} className={`flex items-center gap-1.5 ${i.ok ? "text-[#3F6450]" : "text-[#8C938F]"}`}>
          {i.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isValidPassword(password)) return toast.error(PASSWORD_POLICY);
    setLoading(true);
    const r = await register(name, email, password, phone);
    setLoading(false);
    if (r.ok) {
      toast.success(r.message || "Account created");
      navigate("/login", { state: { pendingMessage: r.message } });
    } else {
      toast.error(r.error || "Registration failed");
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
              <div className="font-display font-black text-[#1C1F1D] text-lg leading-tight">Family Ledger</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#8C938F]">Family Expense Manager</div>
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#1C1F1D] mb-2">Join the family.</h1>
          <p className="text-[#5C635F] mb-6">Create a partner account. Admin will approve it.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="register-name-input" className="bg-white border-[#DCD7CB] h-11" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="register-email-input" className="bg-white border-[#DCD7CB] h-11" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="register-phone-input" className="bg-white border-[#DCD7CB] h-11" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="register-password-input" className="bg-white border-[#DCD7CB] h-11" />
              <PasswordChecklist pw={password} />
            </div>
            <Button type="submit" disabled={loading} data-testid="register-submit-btn" className="w-full h-11 bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0] font-semibold">
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-[#5C635F] mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-[#2D4C3B] font-semibold underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
