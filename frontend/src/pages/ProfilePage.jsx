import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, ShieldCheck, KeyRound, Check, X } from "lucide-react";
import { PASSWORD_POLICY, isValidPassword } from "@/lib/passwordPolicy";

function PasswordChecklist({ pw }) {
  const items = [
    { ok: pw.length >= 8, label: "8+ characters" },
    { ok: /[A-Za-z]/.test(pw), label: "letter" },
    { ok: /\d/.test(pw), label: "number" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "special character" },
  ];
  return (
    <ul className="text-xs space-y-1 mt-2">
      {items.map((i) => (
        <li key={i.label} className={`flex items-center gap-1.5 ${i.ok ? "text-[#3F6450]" : "text-[#8C938F]"}`}>
          {i.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");
    setSavingProfile(true);
    try {
      await api.patch("/auth/profile", { name: name.trim(), phone: phone.trim() || null });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!isValidPassword(newPassword)) return toast.error(PASSWORD_POLICY);
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed");
    } finally {
      setSavingPw(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-3xl" data-testid="profile-page">
      <div>
        <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">Account</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
          Your profile
        </h1>
      </div>

      <div className="bg-white border border-[#DCD7CB] rounded-md p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-[#2D4C3B] text-[#F5F4F0] rounded-md flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-display text-xl font-bold text-[#1C1F1D]" data-testid="profile-email">
              {user.email}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-[#E8E5DC] text-[#2D4C3B] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                {user.role}
              </span>
              <span className="text-xs text-[#3F6450] inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {user.status}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4 border-t border-[#DCD7CB] pt-6">
          <h3 className="font-display text-lg font-bold text-[#2D4C3B]">Contact details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name-input" className="bg-white border-[#DCD7CB]" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="profile-phone-input" className="bg-white border-[#DCD7CB]" />
            </div>
          </div>
          <Button type="submit" disabled={savingProfile} data-testid="profile-save-name-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </div>

      <div className="bg-white border border-[#DCD7CB] rounded-md p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className="w-5 h-5 text-[#2D4C3B]" />
          <h3 className="font-display text-xl font-bold text-[#2D4C3B]">Change password</h3>
        </div>
        <p className="text-sm text-[#5C635F] mb-4">{PASSWORD_POLICY}</p>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Current password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required data-testid="profile-current-password-input" className="bg-white border-[#DCD7CB]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required data-testid="profile-new-password-input" className="bg-white border-[#DCD7CB]" />
              <PasswordChecklist pw={newPassword} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Confirm new password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required data-testid="profile-confirm-password-input" className="bg-white border-[#DCD7CB]" />
            </div>
          </div>
          <Button type="submit" disabled={savingPw} data-testid="profile-change-password-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
            {savingPw ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
