import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError, inr, todayISO } from "@/lib/api";
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
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

const SavingsPage = () => {
  const { user } = useAuth();
  const [savings, setSavings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [monthlySavings, setMonthlySavings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    account_id: "",
    amount: "",
    date: todayISO(),
    note: "",
    source: "manual",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [savingsRes, accountsRes, monthlySavingsRes] = await Promise.all([
        api.get("/savings"),
        api.get("/accounts"),
        api.get("/reports/monthly-savings"),
      ]);
      setSavings(savingsRes);
      setAccounts(accountsRes);
      setMonthlySavings(monthlySavingsRes);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      account_id: "",
      amount: "",
      date: todayISO(),
      note: "",
      source: "manual",
    });
    setEditingId(null);
  };

  const handleOpenDialog = (entry = null) => {
    if (entry) {
      setFormData({
        account_id: entry.account_id,
        amount: entry.amount.toString(),
        date: entry.date,
        note: entry.note || "",
        source: entry.source,
      });
      setEditingId(entry.id);
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.account_id) {
      toast.error("Please select an account");
      return;
    }
    if (!formData.amount) {
      toast.error("Amount is required");
      return;
    }
    if (!formData.date) {
      toast.error("Date is required");
      return;
    }

    try {
      const payload = {
        account_id: formData.account_id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        note: formData.note || null,
        source: formData.source,
      };

      if (editingId) {
        await api.put(`/savings/${editingId}`, payload);
        toast.success("Savings entry updated successfully");
      } else {
        await api.post("/savings", payload);
        toast.success("Savings entry created successfully");
      }

      setOpenDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await api.delete(`/savings/${deleteConfirm}`);
      toast.success("Savings entry deleted successfully");
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const getSourceLabel = (source) => {
    const labels = {
      manual: "Manual Entry",
      income: "From Income",
      expense: "From Expense Savings",
    };
    return labels[source] || source;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black text-[#1C1F1D] mb-2">
          Savings
        </h1>
        <p className="text-base leading-relaxed text-[#5C635F] font-normal">
          Track and manage your savings across accounts
        </p>
      </div>

      {/* Monthly Summary Card */}
      {monthlySavings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8">
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              This Month Income
            </div>
            <div className="text-2xl sm:text-3xl tracking-tight font-bold text-[#2D4C3B]">
              {inr(monthlySavings.total_income)}
            </div>
          </div>
          <div className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8">
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              This Month Expenses
            </div>
            <div className="text-2xl sm:text-3xl tracking-tight font-bold text-[#C35A42]">
              {inr(monthlySavings.total_expense)}
            </div>
          </div>
          <div className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8">
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              Monthly Savings
            </div>
            <div className="text-2xl sm:text-3xl tracking-tight font-bold text-[#3F6450]">
              {inr(monthlySavings.monthly_savings)}
            </div>
          </div>
          <div className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8">
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              Saved to Accounts
            </div>
            <div className="text-2xl sm:text-3xl tracking-tight font-bold text-[#2D4C3B]">
              {inr(monthlySavings.total_saved_to_accounts)}
            </div>
          </div>
        </div>
      )}

      {/* Add Button */}
      <div className="mb-6">
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[#2D4C3B] text-[#F5F4F0] rounded-md px-6 py-3 font-semibold hover:bg-[#1E3629] focus:ring-2 focus:ring-offset-2 focus:ring-[#2D4C3B] transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Savings Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Savings Entry" : "Add Savings Entry"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account">Account</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({inr(acc.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    <SelectItem value="income">From Income</SelectItem>
                    <SelectItem value="expense">From Expense Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Add a note..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#2D4C3B] text-[#F5F4F0] hover:bg-[#1E3629]"
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Savings List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#5C635F]">Loading savings...</p>
        </div>
      ) : savings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#5C635F]">
            No savings entries yet. Start tracking your savings!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {savings.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8 hover:border-[#8C938F] transition-colors duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1C1F1D] mb-2">
                    {entry.account_name}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:gap-4 text-sm">
                    <div>
                      <span className="text-[#8C938F] font-semibold">Amount:</span>{" "}
                      <span className="text-[#3F6450] font-bold">
                        {inr(entry.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C938F] font-semibold">Date:</span>{" "}
                      <span className="text-[#5C635F]">{entry.date}</span>
                    </div>
                    <div>
                      <span className="text-[#8C938F] font-semibold">Source:</span>{" "}
                      <span className="text-[#5C635F]">
                        {getSourceLabel(entry.source)}
                      </span>
                    </div>
                  </div>
                  {entry.note && (
                    <p className="text-sm text-[#5C635F] mt-2">{entry.note}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(entry)}
                    className="border-[#DCD7CB] text-[#2D4C3B] hover:bg-[#F5F4F0]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog
                    open={deleteConfirm === entry.id}
                    onOpenChange={(open) =>
                      setDeleteConfirm(open ? entry.id : null)
                    }
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#C35A42] text-[#C35A42] hover:bg-[#C35A42] hover:text-white"
                      onClick={() => setDeleteConfirm(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Savings Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this savings entry?
                          This will revert the account balance. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-[#C35A42] hover:bg-[#A34832]"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavingsPage;
