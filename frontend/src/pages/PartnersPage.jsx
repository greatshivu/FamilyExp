import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

function PartnerDialog({ partner, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });

  useEffect(() => {
    if (partner) setForm({
      name: partner.name || "",
      phone: partner.phone || "",
      email: partner.email || "",
      note: partner.note || "",
    });
  }, [partner, open]);

  async function submit() {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        note: form.note || null,
      };
      if (partner) {
        await api.put(`/partners/${partner.id}`, payload);
        toast.success("Partner updated");
      } else {
        await api.post("/partners", payload);
        toast.success("Partner added");
        setForm({ name: "", phone: "", email: "", note: "" });
      }
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent data-testid="partner-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {partner ? "Edit partner" : "Add partner"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="partner-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="partner-phone-input" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="partner-email-input" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Note</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="partner-note-input" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} data-testid="partner-submit-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
            Save partner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);

  const load = useCallback(async () => {
    const r = await api.get("/partners");
    setPartners(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(p) {
    if (!window.confirm(`Delete partner "${p.name}"? Their investment history will remain in records.`)) return;
    try {
      await api.delete(`/partners/${p.id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error("Failed");
    }
  }

  return (
    <div className="space-y-6" data-testid="partners-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">Team</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">Partners</h1>
        </div>
        <PartnerDialog
          onSaved={load}
          trigger={
            <Button data-testid="partner-add-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
              <Plus className="w-4 h-4 mr-1" /> Add partner
            </Button>
          }
        />
      </div>

      {partners.length === 0 ? (
        <div className="bg-white border border-[#DCD7CB] rounded-md p-12 text-center">
          <p className="text-[#5C635F] mb-4">No partners yet. Add your first partner to start tracking investments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#DCD7CB] rounded-md p-6 hover:border-[#8C938F] transition-colors fade-up"
              data-testid={`partner-card-${p.id}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-display text-xl font-bold text-[#2D4C3B]">{p.name}</div>
                  {p.email && <div className="text-sm text-[#5C635F]">{p.email}</div>}
                  {p.phone && <div className="text-sm text-[#5C635F]">{p.phone}</div>}
                </div>
                <div className="flex gap-1">
                  <PartnerDialog
                    partner={p}
                    onSaved={load}
                    trigger={
                      <Button size="icon" variant="ghost" data-testid={`partner-edit-${p.id}`} className="text-[#2D4C3B]">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <Button size="icon" variant="ghost" onClick={() => remove(p)} data-testid={`partner-delete-${p.id}`} className="text-[#C35A42]">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {p.note && <div className="text-sm text-[#5C635F] border-t border-[#DCD7CB] pt-3">{p.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
