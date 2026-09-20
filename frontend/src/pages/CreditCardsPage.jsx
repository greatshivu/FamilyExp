import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiError, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const months = [
  ["all", "All year"],
  ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"], ["05", "May"], ["06", "Jun"],
  ["07", "Jul"], ["08", "Aug"], ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
];

export default function CreditCardsPage() {
  const now = new Date();
  const [cards, setCards] = useState([]);
  const [cardId, setCardId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [data, setData] = useState(null);
  const years = Array.from({ length: 6 }, (_, index) => String(now.getFullYear() - index));

  const loadCards = useCallback(async () => {
    try {
      const response = await api.get("/accounts");
      const available = response.data.filter((account) => account.account_type === "credit_card");
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

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl" data-testid="credit-cards-page">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-2 text-[#8C938F] text-xs uppercase tracking-[0.2em] font-bold">
          <CreditCard className="w-4 h-4" /> Savings / Credit cards
        </div>
        <h1 className="text-4xl sm:text-5xl tracking-tighter font-black text-[#1C1F1D]">Credit cards</h1>
        <p className="text-[#5C635F]">Review purchases and bill payments by month or across the year.</p>
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
    </div>
  );
}
