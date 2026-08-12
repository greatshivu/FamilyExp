import React, { useEffect, useState } from "react";
import { api, inr } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Scale } from "lucide-react";

function Kpi({ label, value, icon: Icon, tone = "default", testid }) {
  const toneClasses =
    tone === "success"
      ? "text-[#3F6450]"
      : tone === "warning"
      ? "text-[#C35A42]"
      : "text-[#1C1F1D]";
  return (
    <div
      className="bg-white border border-[#DCD7CB] rounded-md p-6 hover:border-[#8C938F] transition-colors"
      data-testid={testid}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8C938F]">
          {label}
        </div>
        <Icon className="w-4 h-4 text-[#8C938F]" />
      </div>
      <div className={`font-display text-xl sm:text-2xl font-black tabular ${toneClasses}`}>
        {inr(value)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [recent, setRecent] = useState([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    (async () => {
      const [s, m, t] = await Promise.all([
        api.get("/reports/summary"),
        api.get(`/reports/monthly?year=${year}`),
        api.get("/reports/transactions"),
      ]);
      setSummary(s.data);
      setMonthly(
        m.data.map((row) => ({
          ...row,
          label: new Date(`${row.month}-02`).toLocaleString("en-IN", { month: "short" }),
        }))
      );
      setRecent(t.data.slice(0, 8));
    })();
  }, [year]);

  return (
    <div className="space-y-8" data-testid="dashboard">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
            Overview
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
            Family overview.
          </h1>
        </div>
        <div className="text-sm text-[#5C635F]">
          Fiscal year {year} · ₹ INR
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi
          label="Total Income"
          value={summary?.total_income}
          icon={TrendingUp}
          tone="success"
          testid="kpi-total-income"
        />
        <Kpi
          label="Total Expense"
          value={summary?.total_expense}
          icon={TrendingDown}
          tone="warning"
          testid="kpi-total-expense"
        />
        <Kpi label="Net P&L" value={summary?.net_pl} icon={Scale} testid="kpi-net-pl" />
        <Kpi
          label="Investments"
          value={summary?.total_investment}
          icon={PiggyBank}
          testid="kpi-investments"
        />
        <Kpi
          label="Account Balance"
          value={summary?.account_balance}
          icon={Wallet}
          testid="kpi-balance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#DCD7CB] rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8C938F]">
                Monthly trend
              </div>
              <h3 className="font-display text-xl font-bold text-[#2D4C3B] mt-1">
                Income vs Expense — {year}
              </h3>
            </div>
          </div>
          <div className="h-72" data-testid="monthly-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#DCD7CB" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" stroke="#5C635F" fontSize={11} />
                <YAxis stroke="#5C635F" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => inr(v)}
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #DCD7CB",
                    borderRadius: 6,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#2D4C3B" name="Income" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" fill="#C35A42" name="Expense" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
          <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-1">
            Latest activity
          </div>
          <h3 className="font-display text-xl font-bold text-[#2D4C3B] mb-4">Recent entries</h3>
          <div className="space-y-3" data-testid="recent-list">
            {recent.length === 0 && (
              <div className="text-sm text-[#5C635F]">No transactions yet.</div>
            )}
            {recent.map((t) => {
              const sign = t.kind === "expense" ? "-" : "+";
              const color =
                t.kind === "expense" ? "text-[#C35A42]" : "text-[#3F6450]";
              const label =
                t.kind === "investment" ? `Investment · ${t.partner_name}` : t.category;
              return (
                <div
                  key={`${t.kind}-${t.id}`}
                  className="flex items-center justify-between gap-3 fade-up"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1C1F1D] truncate">{label}</div>
                    <div className="text-xs text-[#8C938F] uppercase tracking-wider">
                      {t.kind} · {t.date}
                    </div>
                  </div>
                  <div className={`text-sm font-bold tabular ${color}`}>
                    {sign}
                    {inr(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
