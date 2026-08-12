import React, { useEffect, useMemo, useState, useCallback } from "react";
import { api, formatApiError, inr, todayISO, selectedISO } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Trash2, Edit2, Paperclip, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

const compressImage = async (file) => {
  const options = {
    maxSizeMB: 0.1, // 100KB
    maxWidthOrHeight: 1024,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => resolve(reader.result);
    });
  } catch (error) {
    console.error("Image compression error:", error);
    return null;
  }
};

const formatIndianNumber = (value) => {
  if (!value) return "";
  const number = Number(value.replace(/,/g, ""));
  return new Intl.NumberFormat("en-IN").format(number);
};

const AttachmentField = ({ attachment, onAttachmentChange }) => {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const base64 = await compressImage(file);
    if (base64) {
      onAttachmentChange(base64);
    } else {
      toast.error("Failed to process image");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Attachment (Bill/Screenshot)</Label>
      <div className="flex items-center gap-4">
        {attachment ? (
          <div className="relative w-20 h-20 border border-[#DCD7CB] rounded overflow-hidden group">
            <img src={attachment} alt="Attachment" className="w-full h-full object-cover" />
            <button
              onClick={() => onAttachmentChange(null)}
              className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-[#C35A42]" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-[#DCD7CB] rounded cursor-pointer hover:bg-[#F5F4F0] transition-colors">
            {loading ? (
              <span className="text-[10px] text-[#8C938F]">Processing...</span>
            ) : (
              <>
                <ImageIcon className="w-6 h-6 text-[#8C938F]" />
                <span className="text-[10px] text-[#8C938F] mt-1">Upload</span>
              </>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={loading} />
          </label>
        )}
        {attachment && (
          <div className="text-xs text-[#8C938F]">
            Image attached and compressed.
          </div>
        )}
      </div>
    </div>
  );
};

const resetValues = (setCategory, setDate, setNote, setAmount, setAttachment, open, filterMode, month, year, initialValues = null) => {
  if (open) {
    if (initialValues) {
      if (typeof setCategory === "function") setCategory(initialValues.category || initialValues.partner_id || "");
      if (typeof setDate === "function") setDate(initialValues.date);
      if (typeof setNote === "function") setNote(initialValues.note || "");
      if (typeof setAmount === "function") setAmount(String(initialValues.amount));
      if (typeof setAttachment === "function") setAttachment(initialValues.attachment || null);
    } else {
      if (typeof setDate === "function") setDate(filterMode === "month" ? selectedISO(month, year) : todayISO());
      if (typeof setCategory === "function") setCategory("");
      if (typeof setNote === "function") setNote("");
      if (typeof setAmount === "function") setAmount("");
      if (typeof setAttachment === "function") setAttachment(null);
    }
  }
}

function IncomeDialog({ categories, filterMode, month, year, onCreated, transaction = null, open: externalOpen, setOpen: setExternalOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(filterMode === "month" ? selectedISO(month, year) : todayISO());
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState(null);
  
  useEffect(() => {
    resetValues(setCategory, setDate, setNote, setAmount, setAttachment, open, filterMode, month, year, transaction);
  }, [open, filterMode, month, year, transaction]);

  async function submit() {
    if (!category || !amount) return toast.error("Category and amount required");
    try {
      const data = { category, amount: parseFloat(amount), date, note, attachment };
      if (transaction) {
        await api.put(`/incomes/${transaction.id}`, data);
        toast.success("Income updated");
      } else {
        await api.post("/incomes", data);
        toast.success("Income added");
      }
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  }

  const incomeCats = categories.filter((c) => c.type === "income");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!transaction && (
        <DialogTrigger asChild>
          <Button data-testid="add-income-btn" className="bg-[#3F6450] hover:bg-[#2D4C3B] text-[#F5F4F0]">
            <Plus className="w-4 h-4 mr-1" /> Income
          </Button>
        </DialogTrigger>
      )}
      <DialogContent data-testid="income-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            <span className="bg-[#3F6450] text-[#F5F4F0] px-[10px] py-[5px] rounded">
              {transaction ? "Edit income" : "Add income"}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="income-category-select"><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {incomeCats.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Amount (₹ <b>{formatIndianNumber(amount)}</b>)</Label>
              <Input data-testid="income-amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Date</Label>
              <Input data-testid="income-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Note</Label>
            <Textarea data-testid="income-note-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <AttachmentField attachment={attachment} onAttachmentChange={setAttachment} />
        </div>
        <DialogFooter>
          <Button onClick={submit} data-testid="income-submit-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
            {transaction ? "Update income" : "Save income"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({ categories, filterMode, month, year, partners, onCreated, transaction = null, open: externalOpen, setOpen: setExternalOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(filterMode === "month" ? selectedISO(month, year) : todayISO());
  const [note, setNote] = useState("");
  const [paidFromKey, setPaidFromKey] = useState("account");
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    resetValues(setCategory, setDate, setNote, setAmount, setAttachment, open, filterMode, month, year, transaction);
    if (open) {
      if (transaction) {
        setPaidFromKey(transaction.paid_from === "pocket" ? transaction.partner_id : "account");
      } else {
        setPaidFromKey("account");
      }
    }
  }, [open, filterMode, month, year, transaction]);

  async function submit() {
    if (!category || !amount) return toast.error("Category and amount required");
    const isPartner = paidFromKey !== "account";
    try {
      const data = {
        category,
        amount: parseFloat(amount),
        date,
        note,
        paid_from: isPartner ? "pocket" : "account",
        partner_id: isPartner ? paidFromKey : null,
        attachment,
      };
      if (transaction) {
        await api.put(`/expenses/${transaction.id}`, data);
        toast.success("Expense updated");
      } else {
        await api.post("/expenses", data);
        toast.success("Expense added");
      }
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  }

  const expCats = categories.filter((c) => c.type === "expense");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!transaction && (
        <DialogTrigger asChild>
          <Button data-testid="add-expense-btn" className="bg-[#C35A42] hover:bg-[#a64a36] text-[#F5F4F0]">
            <Plus className="w-4 h-4 mr-1" /> Expense
          </Button>
        </DialogTrigger>
      )}
      <DialogContent data-testid="expense-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            <span className="bg-[#C35A42] text-[#F5F4F0] px-[10px] py-[5px] rounded">
              {transaction ? "Edit expense" : "Add expense"}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="expense-category-select"><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {expCats.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Amount (₹ <b>{formatIndianNumber(amount)}</b>)</Label>
              <Input data-testid="expense-amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Date</Label>
              <Input data-testid="expense-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Paid from</Label>
            <Select value={paidFromKey} onValueChange={setPaidFromKey}>
              <SelectTrigger data-testid="expense-paidfrom-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="account">Family Account</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id} data-testid={`paidfrom-partner-${p.id}`}>
                    {p.name} (partner pocket → investment)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paidFromKey !== "account" && (
              <p className="text-xs text-[#5C635F] mt-2">
                This amount will also be recorded as an investment by this partner.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Note</Label>
            <Textarea data-testid="expense-note-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <AttachmentField attachment={attachment} onAttachmentChange={setAttachment} />
        </div>
        <DialogFooter>
          <Button onClick={submit} data-testid="expense-submit-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
            {transaction ? "Update expense" : "Save expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvestmentDialog({ partners, filterMode, month, year, onCreated, transaction = null, open: externalOpen, setOpen: setExternalOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(filterMode === "month" ? selectedISO(month, year) : todayISO());
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    resetValues(setPartnerId, setDate, setNote, setAmount, setAttachment, open, filterMode, month, year, transaction);
  }, [open, filterMode, month, year, transaction]);

  async function submit() {
    if (!partnerId || !amount) return toast.error("Partner and amount required");
    try {
      const data = { partner_id: partnerId, amount: parseFloat(amount), date, note, attachment };
      if (transaction) {
        await api.put(`/investments/${transaction.id}`, data);
        toast.success("Investment updated");
      } else {
        await api.post("/investments", data);
        toast.success("Investment recorded");
      }
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!transaction && (
        <DialogTrigger asChild>
          <Button data-testid="add-investment-btn" variant="outline" className="border-[#2D4C3B] text-[#2D4C3B]">
            <Plus className="w-4 h-4 mr-1" /> Investment
          </Button>
        </DialogTrigger>
      )}
      <DialogContent data-testid="investment-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{transaction ? "Edit investment" : "Add investment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Partner</Label>
            <Select value={partnerId} onValueChange={setPartnerId} disabled={transaction && transaction.source === "expense"}>
              <SelectTrigger data-testid="investment-partner-select"><SelectValue placeholder="Choose partner" /></SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {transaction && transaction.source === "expense" && (
              <p className="text-[10px] text-[#C35A42] mt-1">Linked to expense. Edit linked expense to change partner/amount.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Amount (₹ <b>{formatIndianNumber(amount)}</b>)</Label>
              <Input data-testid="investment-amount-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={transaction && transaction.source === "expense"} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Date</Label>
              <Input data-testid="investment-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={transaction && transaction.source === "expense"} />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Note</Label>
            <Textarea data-testid="investment-note-input" value={note} onChange={(e) => setNote(e.target.value)} disabled={transaction && transaction.source === "expense"} />
          </div>
          <AttachmentField attachment={attachment} onAttachmentChange={setAttachment} />
        </div>
        <DialogFooter>
          {transaction && transaction.source === "expense" ? (
             <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button onClick={submit} data-testid="investment-submit-btn" className="bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]">
              {transaction ? "Update investment" : "Save investment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionsTable({ rows, onDelete, onEdit }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[#DCD7CB] rounded-md p-12 text-center">
        <p className="text-[#5C635F]">No transactions match the filters.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#DCD7CB] rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="transactions-table">
          <thead className="bg-[#E8E5DC] text-[#1C1F1D]">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Details</th>
              <th className="text-left px-4 py-3 font-semibold">Partner</th>
              <th className="text-right px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tint =
                r.kind === "income"
                  ? "text-[#3F6450]"
                  : r.kind === "expense"
                  ? "text-[#C35A42]"
                  : "text-[#1C1F1D]";
              const sign = r.kind === "expense" ? "-" : "+";
              const pending = !!r.pending_deletion;
              const strike = pending ? "line-through opacity-60" : "";
              return (
                <tr
                  key={`${r.kind}-${r.id}`}
                  className={`border-t border-[#DCD7CB] hover:bg-[#F5F4F0] ${pending ? "bg-[#F5F4F0]" : ""}`}
                  data-testid={`txn-row-${r.id}`}
                >
                  <td className={`px-4 py-3 tabular ${strike}`}>{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`bg-[#E8E5DC] ${tint} px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide`}>
                        {r.kind}
                      </span>
                      {pending && (
                        <span className="bg-[#C35A42] text-[#F5F4F0] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" data-testid={`txn-pending-badge-${r.id}`}>
                          pending deletion
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${strike}`}>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-[#1C1F1D]">
                        {r.kind === "investment" ? "Investment" : r.category}
                      </div>
                      {r.attachment && (
                        <Paperclip className="w-3 h-3 text-[#3F6450]" title="Has attachment" />
                      )}
                    </div>
                    {r.note && <div className="text-xs text-[#8C938F]">{r.note}</div>}
                    {r.kind === "expense" && (
                      <div className="text-xs text-[#8C938F]">
                        Paid from: {r.paid_from === "pocket" ? `${r.partner_name || "Partner"} (pocket)` : "Family Account"}
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-[#5C635F] ${strike}`}>
                    {r.partner_name || r.created_by_name || "—"}
                  </td>
                  <td className={`px-4 py-3 text-right tabular font-bold ${tint} ${strike}`}>
                    {sign}{inr(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!pending && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(r)}
                          className="text-[#3F6450] hover:bg-[#E8E5DC]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(r)}
                          data-testid={`txn-delete-${r.id}`}
                          className="text-[#C35A42] hover:bg-[#E8E5DC]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const today = new Date();
  const [categories, setCategories] = useState([]);
  const [partners, setPartners] = useState([]);
  const [txns, setTxns] = useState([]);
  const [tab, setTab] = useState("all");
  const [filterMode, setFilterMode] = useState("month"); // "month" or "range"
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // row pending confirmation
  const [editingTxn, setEditingTxn] = useState(null);
  const [reason, setReason] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    const [c, p, t] = await Promise.all([
      api.get("/categories"),
      api.get("/users/partners"),
      api.get("/reports/transactions"),
    ]);
    setCategories(c.data);
    setPartners(p.data);
    setTxns(t.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function askDelete(r) {
    setReason("");
    setPendingDelete(r);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const r = pendingDelete;
    try {
      await api.post("/deletion-requests", {
        resource_type: r.kind,
        resource_id: r.id,
        reason: reason || null,
      });
      toast.success(isAdmin ? "Deleted" : "Deletion request submitted — awaiting admin approval");
      setPendingDelete(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (tab !== "all" && t.kind !== tab) return false;
      if (filterMode === "month") {
        if (!month || !year) return true;
        return t.date.startsWith(`${year}-${month}`);
      }
      if (start && t.date < start) return false;
      if (end && t.date > end) return false;
      return true;
    });
  }, [txns, tab, filterMode, month, year, start, end]);

  const years = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 5; y--) years.push(String(y));
  const months = [
    ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"],
    ["05", "May"], ["06", "Jun"], ["07", "Jul"], ["08", "Aug"],
    ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
  ];

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
            Ledger
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
            Transactions
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <IncomeDialog categories={categories} onCreated={load} filterMode={filterMode} month={month} year={year} />
          <ExpenseDialog categories={categories} partners={partners} onCreated={load} filterMode={filterMode} month={month} year={year}  />
          <InvestmentDialog partners={partners} onCreated={load}  filterMode={filterMode} month={month} year={year}  />
        </div>
      </div>

      {editingTxn?.kind === "income" && (
        <IncomeDialog
          categories={categories}
          onCreated={load}
          filterMode={filterMode}
          month={month}
          year={year}
          transaction={editingTxn}
          open={!!editingTxn}
          setOpen={(o) => !o && setEditingTxn(null)}
        />
      )}
      {editingTxn?.kind === "expense" && (
        <ExpenseDialog
          categories={categories}
          partners={partners}
          onCreated={load}
          filterMode={filterMode}
          month={month}
          year={year}
          transaction={editingTxn}
          open={!!editingTxn}
          setOpen={(o) => !o && setEditingTxn(null)}
        />
      )}
      {editingTxn?.kind === "investment" && (
        <InvestmentDialog
          partners={partners}
          onCreated={load}
          filterMode={filterMode}
          month={month}
          year={year}
          transaction={editingTxn}
          open={!!editingTxn}
          setOpen={(o) => !o && setEditingTxn(null)}
        />
      )}

      <div className="bg-white border border-[#DCD7CB] rounded-md p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList data-testid="txn-filter-tabs">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="income" data-testid="tab-income">Income</TabsTrigger>
              <TabsTrigger value="expense" data-testid="tab-expense">Expense</TabsTrigger>
              <TabsTrigger value="investment" data-testid="tab-investment">Investment</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={filterMode} onValueChange={setFilterMode}>
            <TabsList data-testid="filter-mode-tabs">
              <TabsTrigger value="month" data-testid="mode-month">Month / Year</TabsTrigger>
              <TabsTrigger value="range" data-testid="mode-range">Date range</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {filterMode === "month" ? (
            <>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="w-32" data-testid="filter-month-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-28" data-testid="filter-year-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">From</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} data-testid="filter-start-date" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#5C635F]">To</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} data-testid="filter-end-date" />
              </div>
            </>
          )}
          <Button variant="outline" onClick={() => {
            setStart(""); setEnd(""); setTab("all");
            setMonth(String(today.getMonth() + 1).padStart(2, "0"));
            setYear(String(today.getFullYear()));
          }} data-testid="filter-clear-btn">
            Reset
          </Button>
          <div className="ml-auto text-sm text-[#5C635F] tabular">
            {filtered.length} entries
          </div>
        </div>
      </div>

      <TransactionsTable rows={filtered} onDelete={askDelete} onEdit={setEditingTxn} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent data-testid="delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? "Permanently delete this entry?" : "Request deletion of this entry?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin
                ? "This will permanently remove the record. This action cannot be undone."
                : "An admin must approve this deletion. Until approved, the entry will appear struck through but remain visible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isAdmin && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="delete-reason-input"
                placeholder="e.g. duplicate, wrong amount"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={confirmDelete}
                data-testid="delete-confirm-btn"
                className="bg-[#C35A42] hover:bg-[#a64a36] text-[#F5F4F0]"
              >
                {isAdmin ? "Delete now" : "Submit request"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
