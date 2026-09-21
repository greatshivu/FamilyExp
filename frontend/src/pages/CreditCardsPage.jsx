import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError, inr, todayISO } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, RefreshCw, WalletCards } from "lucide-react";
import { toast } from "sonner";

const months = [
  ["all", "All year"],
  ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"], ["05", "May"], ["06", "Jun"],
  ["07", "Jul"], ["08", "Aug"], ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
];

export default function CreditCardsPage() {
  const now = new Date();
  const [cards, setCards] = useState([]);
  const [familyAccounts, setFamilyAccounts] = useState([]);
  const [cardId, setCardId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [data, setData] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: "", date: todayISO(), familyAccountId: "", note: "" });
  const years = Array.from({ length: 6 }, (_, index) => String(now.getFullYear() - index));

  const loadCards = useCallback(async () => {
    try {
      const response = await api.get("/accounts");
      const available = response.data.filter((account) => account.account_type === "credit_card");
      setFamilyAccounts(response.data.filter((account) => account.account_type !== "credit_card"));
      setCards(available);
      setCardId((current) => current || available[0]?.id || "");
    } catch (error) {
      toast.error(formatApiError(error.response?.data?.detail));
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!cardId) return;
    try {
      const response = await api.get(`/credit-cards/${cardId}/transactions`, { params: { year, month } });
      setData(response.data);
    } catch (error) {
      toast.error(formatApiError(error.response?.data?.detail));
    }
  }, [cardId, month, year]);

  useEffect(() => { loadCards(); }, [loadCards]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const openPayment = () => {
    setPayment({ amount: "", date: todayISO(), familyAccountId: familyAccounts[0]?.id || "", note: "" });
    setPaymentOpen(true);
  };

  const savePayment = async () => {
    if (!cardId || !payment.amount || !payment.date || !payment.familyAccountId) {
      toast.error("Card, amount, date, and family account are required");
      return;
    }
    try {
      await api.post("/expenses", {
        category: "CC Bill",
        amount: parseFloat(payment.amount),
        date: payment.date,
        note: payment.note || null,
        paid_from: "account",
        account_id: cardId,
        family_account_id: payment.familyAccountId,
      });
      toast.success("Credit-card bill recorded");
      setPaymentOpen(false);
      loadTransactions();
    } catch (error) {
      toast.error(formatApiError(error.response?.data?.detail));
    }
  };

  const statement = (data?.transactions || []).reduce((totals, transaction) => {
    if (transaction.type === "payment") totals.payments += Number(transaction.amount || 0);
    else if (transaction.type === "income") totals.income += Number(transaction.amount || 0);
    else totals.purchases += Number(transaction.amount || 0);
    return totals;
  }, { purchases: 0, payments: 0, income: 0 });

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl" data-testid="credit-cards-page">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-2 text-[#8C938F] text-xs uppercase tracking-[0.2em] font-bold">
          <CreditCard className="w-4 h-4" /> Savings / Credit cards
        </div>
        <h1 className="text-4xl sm:text-5xl tracking-tighter font-black text-[#1C1F1D]">Credit cards</h1>
        <p className="text-[#5C635F]">Review purchases and bill payments by month or across the year.</p>
        <div className="mt-3">
          <Button onClick={openPayment} disabled={!cards.length || !familyAccounts.length} className="bg-[#C35A42] hover:bg-[#A34832] text-[#F5F4F0]">
            <WalletCards className="w-4 h-4 mr-2" /> Pay CC bill
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#DCD7CB] rounded-md p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Card</Label>
          <Select value={cardId} onValueChange={setCardId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select a credit card" /></SelectTrigger>
            <SelectContent>{cards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={loadTransactions} disabled={!cardId} title="Refresh transactions">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {data?.card && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#F2E8D5] border border-[#D9C9AB] rounded-md p-5 md:col-span-2">
            <div className="text-xs uppercase tracking-widest text-[#806C47]">{month === "all" ? `${year} annual statement` : `${year}-${month} statement`}</div>
            <div className="text-3xl font-black text-[#1C1F1D] mt-2">{inr(statement.purchases - statement.payments)}</div>
            <div className="text-xs text-[#806C47] mt-1">Net card activity</div>
          </div>
          <div className="bg-white border border-[#DCD7CB] rounded-md p-5"><div className="text-xs uppercase tracking-widest text-[#8C938F]">Purchases</div><div className="text-2xl font-bold text-[#C35A42] mt-2">{inr(statement.purchases)}</div></div>
          <div className="bg-white border border-[#DCD7CB] rounded-md p-5"><div className="text-xs uppercase tracking-widest text-[#8C938F]">Payments</div><div className="text-2xl font-bold text-[#3F6450] mt-2">{inr(statement.payments)}</div></div>
        </div>
      )}

      {data?.card && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#2D4C3B] text-[#F5F4F0] rounded-md p-5"><div className="text-xs uppercase tracking-widest opacity-75">Selected card</div><div className="text-xl font-bold mt-2">{data.card.name}</div></div>
          <div className="bg-white border border-[#DCD7CB] rounded-md p-5"><div className="text-xs uppercase tracking-widest text-[#8C938F]">Outstanding balance</div><div className="text-2xl font-bold text-[#C35A42] mt-2">{inr(data.card.balance)}</div></div>
          <div className="bg-white border border-[#DCD7CB] rounded-md p-5"><div className="text-xs uppercase tracking-widest text-[#8C938F]">Transactions</div><div className="text-2xl font-bold text-[#1C1F1D] mt-2">{data.transactions.length}</div></div>
        </div>
      )}

      {!cards.length ? (
        <div className="bg-white border border-[#DCD7CB] rounded-md p-12 text-center text-[#5C635F]">No credit cards available. Add one from Accounts.</div>
      ) : !data?.transactions.length ? (
        <div className="bg-white border border-[#DCD7CB] rounded-md p-12 text-center text-[#5C635F]">No card transactions for this month.</div>
      ) : (
        <div className="bg-white border border-[#DCD7CB] rounded-md overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-[#E8E5DC]"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Details</th><th className="text-right px-4 py-3">Amount</th></tr></thead>
            <tbody>{data.transactions.map((transaction) => <tr key={transaction.id} className="border-t border-[#DCD7CB]"><td className="px-4 py-3">{transaction.date}</td><td className={`px-4 py-3 font-bold ${transaction.type === "payment" || transaction.type === "income" ? "text-[#3F6450]" : "text-[#C35A42]"}`}>{transaction.type === "payment" ? "Bill payment" : transaction.type === "income" ? "Income" : "Purchase"}</td><td className="px-4 py-3"><div className="font-semibold">{transaction.category}</div><div className="text-xs text-[#8C938F]">{transaction.detail}</div></td><td className={`px-4 py-3 text-right font-bold ${transaction.type === "payment" || transaction.type === "income" ? "text-[#3F6450]" : "text-[#C35A42]"}`}>{transaction.type === "payment" ? "-" : ""}{inr(transaction.amount)}</td></tr>)}</tbody>
          </table></div>
        </div>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay credit-card bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Credit card</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger><SelectValue placeholder="Select a credit card" /></SelectTrigger>
                <SelectContent>{cards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paid from family account</Label>
              <Select value={payment.familyAccountId} onValueChange={(value) => setPayment({ ...payment, familyAccountId: value })}>
                <SelectTrigger><SelectValue placeholder="Select family account" /></SelectTrigger>
                <SelectContent>{familyAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" min="0" step="0.01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={payment.date} onChange={(event) => setPayment({ ...payment, date: event.target.value })} /></div>
            </div>
            <div><Label>Note</Label><Textarea value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} placeholder="Optional payment note" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button><Button onClick={savePayment} className="bg-[#C35A42] hover:bg-[#A34832] text-[#F5F4F0]">Record payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
