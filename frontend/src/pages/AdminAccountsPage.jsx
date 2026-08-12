import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Trash2, Pencil, KeyRound } from "lucide-react";

const statusStyle = {
  pending: "bg-[#E8E5DC] text-[#C35A42]",
  approved: "bg-[#E8E5DC] text-[#3F6450]",
  rejected: "bg-[#E8E5DC] text-[#5C635F]",
};

function EditUserDialog({ u, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setForm({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
  }, [open, u]);

  async function submit() {
    setSaving(true);
    try {
      await api.patch(`/admin/users/${u.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      toast.success("User updated");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`edit-${u.id}`} className="text-[#2D4C3B] h-8 w-8">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="edit-user-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="edit-user-name-input" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="edit-user-email-input" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="edit-user-phone-input" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} data-testid="edit-user-save-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({ u, currentId, onApprove, onReject, onDelete, onSendReset, onSaved }) {
  const isAdmin = u.role === "admin";
  const isSelf = u.id === currentId;
  return (
    <tr className="border-t border-[#DCD7CB] hover:bg-[#F5F4F0]" data-testid={`user-row-${u.id}`}>
      <td className="px-4 py-3">
        <div className="font-semibold text-[#1C1F1D]">{u.name}</div>
        <div className="text-xs text-[#5C635F]">{u.email}</div>
        {u.phone && <div className="text-xs text-[#5C635F]">{u.phone}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-[#5C635F] uppercase tracking-wide">{u.role}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${statusStyle[u.status] || ""}`}>
          {u.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#5C635F] tabular">{(u.created_at || "").slice(0, 10)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {u.status !== "approved" && !isAdmin && (
            <Button size="sm" onClick={() => onApprove(u)} data-testid={`approve-${u.id}`} className="bg-[#3F6450] hover:bg-[#2D4C3B] text-[#F5F4F0] h-8">
              <Check className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
          )}
          {u.status !== "rejected" && !isAdmin && (
            <Button size="sm" variant="outline" onClick={() => onReject(u)} data-testid={`reject-${u.id}`} className="border-[#DCD7CB] text-[#C35A42] hover:bg-[#E8E5DC] h-8">
              <X className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          )}
          <EditUserDialog u={u} onSaved={onSaved} />
          {u.status === "approved" && !isSelf && (
            <Button size="icon" variant="ghost" onClick={() => onSendReset(u)} data-testid={`reset-${u.id}`} title="Send password reset link" className="text-[#5C635F] hover:bg-[#E8E5DC] h-8 w-8">
              <KeyRound className="w-4 h-4" />
            </Button>
          )}
          {!isAdmin && !isSelf && (
            <Button size="icon" variant="ghost" onClick={() => onDelete(u)} data-testid={`delete-${u.id}`} className="text-[#C35A42] hover:bg-[#E8E5DC] h-8 w-8">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminAccountsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("pending");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(u) {
    try { await api.post(`/admin/users/${u.id}/approve`); toast.success(`${u.name} approved`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Failed"); }
  }
  async function reject(u) {
    if (!window.confirm(`Reject account for ${u.email}?`)) return;
    try { await api.post(`/admin/users/${u.id}/reject`); toast.success(`${u.name} rejected`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Failed"); }
  }
  async function del(u) {
    if (!window.confirm(`Permanently delete account ${u.email}?`)) return;
    try { await api.delete(`/admin/users/${u.id}`); toast.success("Account deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Failed"); }
  }
  async function sendReset(u) {
    try {
      const { data } = await api.post(`/admin/users/${u.id}/send-reset-link`);
      toast.success(`Reset link sent to ${u.email}`);
      if (data?.reset_url) console.info("Reset URL:", data.reset_url);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Failed"); }
  }

  const buckets = {
    pending: users.filter((u) => u.status === "pending"),
    approved: users.filter((u) => u.status === "approved"),
    rejected: users.filter((u) => u.status === "rejected"),
    all: users,
  };

  function renderTable(rows) {
    if (rows.length === 0) {
      return (
        <div className="bg-white border border-[#DCD7CB] rounded-md p-12 text-center text-[#5C635F]">
          No accounts in this bucket.
        </div>
      );
    }
    return (
      <div className="bg-white border border-[#DCD7CB] rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="accounts-table">
            <thead className="bg-[#E8E5DC] text-[#1C1F1D]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <UserRow
                  key={u.id} u={u} currentId={user?.id}
                  onApprove={approve} onReject={reject} onDelete={del}
                  onSendReset={sendReset} onSaved={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-accounts-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">Admin</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
            Accounts
          </h1>
        </div>
        <div className="text-sm text-[#5C635F]">
          Pending: <span className="font-bold text-[#C35A42] tabular">{buckets.pending.length}</span>
          {"  ·  "}Approved: <span className="font-bold text-[#3F6450] tabular">{buckets.approved.length}</span>
          {"  ·  "}Total: <span className="font-bold tabular">{users.length}</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="accounts-tabs">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending {buckets.pending.length > 0 ? `(${buckets.pending.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all-accounts">All</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderTable(buckets.pending)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{renderTable(buckets.approved)}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{renderTable(buckets.rejected)}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(buckets.all)}</TabsContent>
      </Tabs>
    </div>
  );
}
