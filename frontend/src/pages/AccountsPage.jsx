import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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

const AccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    account_type: "bank",
    balance: "",
    opening_balance: "",
  });

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const [accountsRes, summaryRes] = await Promise.all([
        api.get("/accounts"),
        api.get("/reports/accounts-summary"),
      ]);
      setAccounts(accountsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const resetForm = () => {
    setFormData({
      name: "",
      account_type: "bank",
      balance: "",
      opening_balance: "",
    });
    setEditingId(null);
  };

  const handleOpenDialog = (account = null) => {
    if (account) {
      setFormData({
        name: account.name,
        account_type: account.account_type,
        balance: account.balance.toString(),
        opening_balance: (account.opening_balance || "").toString(),
      });
      setEditingId(account.id);
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (!formData.balance) {
      toast.error("Balance is required");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        account_type: formData.account_type,
        balance: parseFloat(formData.balance),
        opening_balance: formData.opening_balance
          ? parseFloat(formData.opening_balance)
          : null,
      };

      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        toast.success("Account updated successfully");
      } else {
        await api.post("/accounts", payload);
        toast.success("Account created successfully");
      }

      setOpenDialog(false);
      resetForm();
      loadAccounts();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await api.delete(`/accounts/${deleteConfirm}`);
      toast.success("Account deleted successfully");
      setDeleteConfirm(null);
      loadAccounts();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      bank: "Bank Account",
      cash: "Cash",
      credit_card: "Credit Card",
      wallet: "Wallet",
      investment: "Investment",
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black text-[#1C1F1D] mb-2">
          Bank Accounts
        </h1>
        <p className="text-base leading-relaxed text-[#5C635F] font-normal">
          Manage your bank accounts and track balances
        </p>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8">
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              Total Balance
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl tracking-tight font-bold text-[#2D4C3B]">
              {inr(summary.total_balance)}
            </div>
          </div>
          <div className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8">
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              Active Accounts
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl tracking-tight font-bold text-[#2D4C3B]">
              {summary.account_count}
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
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Account" : "Add New Account"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Savings Account"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="opening">Opening Balance (Optional)</Label>
                <Input
                  id="opening"
                  type="number"
                  placeholder="0.00"
                  value={formData.opening_balance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      opening_balance: e.target.value,
                    })
                  }
                  step="0.01"
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

      {/* Accounts List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#5C635F]">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#5C635F]">No accounts yet. Create your first account!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white border border-[#DCD7CB] rounded-md shadow-sm p-6 sm:p-8 hover:border-[#8C938F] transition-colors duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1C1F1D] mb-2">
                    {account.name}
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-[#8C938F] font-semibold">Type:</span>{" "}
                      <span className="text-[#5C635F]">
                        {getAccountTypeLabel(account.account_type)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C938F] font-semibold">Balance:</span>{" "}
                      <span className="text-[#2D4C3B] font-bold">
                        {inr(account.balance)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(account)}
                    className="border-[#DCD7CB] text-[#2D4C3B] hover:bg-[#F5F4F0]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog
                    open={deleteConfirm === account.id}
                    onOpenChange={(open) =>
                      setDeleteConfirm(open ? account.id : null)
                    }
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#C35A42] text-[#C35A42] hover:bg-[#C35A42] hover:text-white"
                      onClick={() => setDeleteConfirm(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{account.name}"?
                          This will also delete all savings entries for this
                          account. This action cannot be undone.
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

export default AccountsPage;
