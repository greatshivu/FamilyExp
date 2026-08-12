import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function CategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const r = await api.get("/categories");
    setCategories(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) return toast.error("Name required");
    try {
      await api.post("/categories", { name: name.trim(), type });
      toast.success("Category added");
      setName("");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }

  function askDelete(c) {
    setReason("");
    setPendingDelete(c);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api.post("/deletion-requests", {
        resource_type: "category",
        resource_id: pendingDelete.id,
        reason: reason || null,
      });
      toast.success(isAdmin ? "Category deleted" : "Deletion request submitted — awaiting admin approval");
      setPendingDelete(null); setReason("");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6" data-testid="categories-page">
      <div>
        <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">Setup</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
          Categories
        </h1>
      </div>

      <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Category name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="category-name-input" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="category-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} data-testid="category-add-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0] h-10">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Income categories", items: income, tone: "text-[#3F6450]" },
          { title: "Expense categories", items: expense, tone: "text-[#C35A42]" },
        ].map((sec) => (
          <div key={sec.title} className="bg-white border border-[#DCD7CB] rounded-md p-6">
            <h3 className={`font-display text-xl font-bold mb-4 ${sec.tone}`}>{sec.title}</h3>
            <div className="space-y-2" data-testid={`cat-list-${sec.title.toLowerCase().split(" ")[0]}`}>
              {sec.items.length === 0 && (
                <div className="text-sm text-[#5C635F]">None yet.</div>
              )}
              {sec.items.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between border border-[#DCD7CB] rounded-md px-3 py-2 ${c.pending_deletion ? "bg-[#F5F4F0]" : ""}`}
                  data-testid={`cat-item-${c.id}`}
                >
                  <span className={`text-sm font-semibold text-[#1C1F1D] flex items-center gap-2 ${c.pending_deletion ? "line-through opacity-60" : ""}`}>
                    {c.name}
                    {c.pending_deletion && (
                      <span className="bg-[#C35A42] text-[#F5F4F0] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" data-testid={`cat-pending-${c.id}`}>
                        pending deletion
                      </span>
                    )}
                  </span>
                  {!c.pending_deletion && (
                    <Button size="icon" variant="ghost" onClick={() => askDelete(c)} data-testid={`cat-delete-${c.id}`} className="text-[#C35A42] h-7 w-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent data-testid="cat-delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? "Permanently delete category?" : "Request deletion of this category?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin
                ? "This will permanently remove the category. Existing entries that use it will retain the category name."
                : "An admin must approve this deletion. Until approved, the category will appear struck through but still be visible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isAdmin && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="cat-delete-reason-input" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cat-delete-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={confirmDelete} data-testid="cat-delete-confirm-btn" className="bg-[#C35A42] hover:bg-[#a64a36] text-[#F5F4F0]">
                {isAdmin ? "Delete now" : "Submit request"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
