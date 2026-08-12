import React, { useEffect, useState, useCallback } from "react";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  TabsContent,
} from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

const CHART_COLORS = ["#2D4C3B", "#C35A42", "#3F6450", "#8C938F", "#1E3629", "#a64a36", "#5C635F"];

function downloadCsv(rows, filename) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(title, columns, rows, filename) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString(), 14, 24);
  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: rows,
    headStyles: { fillColor: [45, 76, 59] },
    styles: { fontSize: 9 },
  });
  doc.save(filename);
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [monthly, setMonthly] = useState([]);
  const [partnerInv, setPartnerInv] = useState([]);
  const [incomeBreak, setIncomeBreak] = useState([]);
  const [expenseBreak, setExpenseBreak] = useState([]);
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    const [m, pi, ib, eb, s] = await Promise.all([
      api.get(`/reports/monthly?year=${year}`),
      api.get("/reports/partner-investments"),
      api.get(`/reports/category-breakdown?type=income&year=${year}`),
      api.get(`/reports/category-breakdown?type=expense&year=${year}`),
      api.get("/reports/summary"),
    ]);
    setMonthly(
      m.data.map((r) => ({
        ...r,
        label: new Date(`${r.month}-02`).toLocaleString("en-IN", { month: "short" }),
      }))
    );
    setPartnerInv(pi.data);
    setIncomeBreak(ib.data);
    setExpenseBreak(eb.data);
    setSummary(s.data);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);

  // Export helpers
  function exportMonthlyCsv() {
    downloadCsv(
      monthly.map((r) => ({ Month: r.month, Income: r.income, Expense: r.expense, Net: r.income - r.expense })),
      `monthly-${year}.csv`
    );
  }
  function exportMonthlyPdf() {
    downloadPdf(
      `Monthly Income & Expense — ${year}`,
      ["Month", "Income (INR)", "Expense (INR)", "Net (INR)"],
      monthly.map((r) => [r.month, r.income.toFixed(2), r.expense.toFixed(2), (r.income - r.expense).toFixed(2)]),
      `monthly-${year}.pdf`
    );
  }
  function exportPartnerCsv() {
    downloadCsv(
      partnerInv.map((r) => ({
        Partner: r.partner_name, Total: r.total, Direct: r.direct, FromPocket: r.from_pocket, Entries: r.count,
      })),
      "partner-investments.csv"
    );
  }
  function exportPartnerPdf() {
    downloadPdf(
      "Partner Investments",
      ["Partner", "Total (INR)", "Direct (INR)", "From Pocket (INR)", "Entries"],
      partnerInv.map((r) => [r.partner_name, r.total.toFixed(2), r.direct.toFixed(2), r.from_pocket.toFixed(2), r.count]),
      "partner-investments.pdf"
    );
  }
  function exportBreakdownCsv(type, rows) {
    downloadCsv(rows.map((r) => ({ Category: r.category, Amount: r.amount })), `${type}-breakdown-${year}.csv`);
  }
  function exportBreakdownPdf(type, rows) {
    downloadPdf(
      `${type === "income" ? "Income" : "Expense"} by Category — ${year}`,
      ["Category", "Amount (INR)"],
      rows.map((r) => [r.category, r.amount.toFixed(2)]),
      `${type}-breakdown-${year}.pdf`
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">Analysis</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
            Reports
          </h1>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#5C635F]">Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-32" data-testid="report-year-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Income", v: summary.total_income, tone: "text-[#3F6450]" },
            { label: "Expense", v: summary.total_expense, tone: "text-[#C35A42]" },
            { label: "Net P&L", v: summary.net_pl, tone: "text-[#1C1F1D]" },
            { label: "Investments", v: summary.total_investment, tone: "text-[#2D4C3B]" },
            { label: "Balance", v: summary.account_balance, tone: "text-[#2D4C3B]" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-[#DCD7CB] rounded-md p-4">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-1">{k.label}</div>
              <div className={`font-display text-2xl font-black tabular ${k.tone}`}>{inr(k.v)}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="monthly">
        <TabsList data-testid="report-tabs">
          <TabsTrigger value="monthly" data-testid="report-tab-monthly">Monthly</TabsTrigger>
          <TabsTrigger value="partners" data-testid="report-tab-partners">Partner Investments</TabsTrigger>
          <TabsTrigger value="breakdown" data-testid="report-tab-breakdown">By Category</TabsTrigger>
          <TabsTrigger value="totals" data-testid="report-tab-totals">Income / Expense / Investment</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4 space-y-4">
          <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-[#2D4C3B]">
                Monthly Income vs Expense — {year}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportMonthlyCsv} data-testid="monthly-csv-btn">
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportMonthlyPdf} data-testid="monthly-pdf-btn">
                  <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid stroke="#DCD7CB" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" stroke="#5C635F" fontSize={11} />
                  <YAxis stroke="#5C635F" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: "#FFFFFF", border: "1px solid #DCD7CB" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" fill="#2D4C3B" name="Income" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" fill="#C35A42" name="Expense" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm" data-testid="monthly-table">
                <thead className="bg-[#E8E5DC]">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Month</th>
                    <th className="text-right px-3 py-2 font-semibold">Income</th>
                    <th className="text-right px-3 py-2 font-semibold">Expense</th>
                    <th className="text-right px-3 py-2 font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r) => (
                    <tr key={r.month} className="border-t border-[#DCD7CB]">
                      <td className="px-3 py-2 tabular">{r.month}</td>
                      <td className="px-3 py-2 text-right tabular text-[#3F6450]">{inr(r.income)}</td>
                      <td className="px-3 py-2 text-right tabular text-[#C35A42]">{inr(r.expense)}</td>
                      <td className="px-3 py-2 text-right tabular font-semibold">{inr(r.income - r.expense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="mt-4">
          <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-[#2D4C3B]">Partner Investments</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportPartnerCsv} data-testid="partner-csv-btn">
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportPartnerPdf} data-testid="partner-pdf-btn">
                  <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </div>
            </div>

            {partnerInv.length === 0 ? (
              <div className="text-[#5C635F]">No partners or investments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="partner-investments-table">
                  <thead className="bg-[#E8E5DC]">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Partner</th>
                      <th className="text-right px-3 py-2 font-semibold">Direct</th>
                      <th className="text-right px-3 py-2 font-semibold">From Pocket</th>
                      <th className="text-right px-3 py-2 font-semibold">Total</th>
                      <th className="text-right px-3 py-2 font-semibold">Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerInv.map((p) => (
                      <tr key={p.partner_id} className="border-t border-[#DCD7CB]">
                        <td className="px-3 py-2 font-semibold">{p.partner_name}</td>
                        <td className="px-3 py-2 text-right tabular">{inr(p.direct)}</td>
                        <td className="px-3 py-2 text-right tabular">{inr(p.from_pocket)}</td>
                        <td className="px-3 py-2 text-right tabular font-bold text-[#2D4C3B]">{inr(p.total)}</td>
                        <td className="px-3 py-2 text-right tabular text-[#5C635F]">{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { title: "Income by Category", data: incomeBreak, type: "income" },
            { title: "Expense by Category", data: expenseBreak, type: "expense" },
          ].map((sec) => (
            <div key={sec.type} className="bg-white border border-[#DCD7CB] rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold text-[#2D4C3B]">{sec.title}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportBreakdownCsv(sec.type, sec.data)} data-testid={`${sec.type}-csv-btn`}>
                    <Download className="w-3.5 h-3.5 mr-1" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportBreakdownPdf(sec.type, sec.data)} data-testid={`${sec.type}-pdf-btn`}>
                    <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
              {sec.data.length === 0 ? (
                <div className="text-[#5C635F] text-sm">No entries for {year}.</div>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sec.data} dataKey="amount" nameKey="category" outerRadius={90} label={(e) => e.category}>
                          {sec.data.map((entry) => (
                            <Cell key={entry.category} fill={CHART_COLORS[sec.data.indexOf(entry) % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => inr(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1">
                    {sec.data.map((r) => (
                      <div key={r.category} className="flex justify-between text-sm border-b border-[#DCD7CB] py-1">
                        <span>{r.category}</span>
                        <span className="tabular font-semibold">{inr(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="totals" className="mt-4">
          <TotalsBreakdown />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TotalsBreakdown() {
  const [type, setType] = useState("income");
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: d } = await api.get(`/reports/breakdown?type=${type}`);
      setData(d);
    })();
  }, [type]);

  const color = type === "income" ? "#3F6450" : type === "expense" ? "#C35A42" : "#2D4C3B";
  const label = type === "income" ? "Income" : type === "expense" ? "Expense" : "Investment";

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Section", "Period", `Amount (INR)`],
      ...data.monthly.map((m) => ["Monthly", m.month, m.amount]),
      ...data.yearly.map((y) => ["Yearly", y.year, y.amount]),
      ["Total", "All time", data.total],
    ];
    downloadCsv(rows.slice(1).map((r) => ({ Section: r[0], Period: r[1], Amount: r[2] })), `${type}-breakdown.csv`);
  }

  function exportPdf() {
    if (!data) return;
    const rows = [
      ...data.monthly.map((m) => [`${m.month} (${m.label})`, "Monthly", m.amount.toFixed(2)]),
      ...data.yearly.map((y) => [y.year, "Yearly", y.amount.toFixed(2)]),
      ["All time", "Total", data.total.toFixed(2)],
    ];
    downloadPdf(`${label} breakdown`, ["Period", "Section", "Amount (INR)"], rows, `${type}-breakdown.pdf`);
  }

  return (
    <div className="space-y-6" data-testid="totals-breakdown">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs value={type} onValueChange={setType}>
          <TabsList data-testid="breakdown-type-tabs">
            <TabsTrigger value="income" data-testid="bd-income">Income</TabsTrigger>
            <TabsTrigger value="expense" data-testid="bd-expense">Expense</TabsTrigger>
            <TabsTrigger value="investment" data-testid="bd-investment">Investment</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} data-testid="bd-csv-btn">
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} data-testid="bd-pdf-btn">
            <FileText className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {!data ? (
        <div className="text-[#5C635F]">Loading…</div>
      ) : (
        <>
          <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
              {label} · all time total
            </div>
            <div className="font-display text-5xl font-black tabular" style={{ color }} data-testid="bd-total-value">
              {inr(data.total)}
            </div>
          </div>

          <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-[#2D4C3B]">
                {label} · monthly ({data.current_year})
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly}>
                  <CartesianGrid stroke="#DCD7CB" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" stroke="#5C635F" fontSize={11} />
                  <YAxis stroke="#5C635F" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: "#FFFFFF", border: "1px solid #DCD7CB" }} />
                  <Bar dataKey="amount" fill={color} name={label} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#DCD7CB] rounded-md p-6">
            <h3 className="font-display text-xl font-bold text-[#2D4C3B] mb-4">{label} · yearly</h3>
            {data.yearly.length === 0 ? (
              <div className="text-sm text-[#5C635F]">No yearly data yet.</div>
            ) : (
              <table className="w-full text-sm" data-testid="bd-yearly-table">
                <thead className="bg-[#E8E5DC]">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Year</th>
                    <th className="text-right px-3 py-2 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.yearly.map((y) => (
                    <tr key={y.year} className="border-t border-[#DCD7CB]">
                      <td className="px-3 py-2 tabular">{y.year}</td>
                      <td className="px-3 py-2 text-right tabular font-semibold" style={{ color }}>{inr(y.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
