import React, { useCallback, useEffect, useState } from "react";
import { api, formatApiError, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const TYPE_LABEL = {
  income: "Income",
  expense: "Expense",
  investment: "Investment",
  category: "Category",
};

function ResourceSummary({ req }) {
  const s = req.resource_snapshot || {};
  if (req.resource_type === "category") {
    return <span className="text-sm">{s.name} <span className="text-[#8C938F]">({s.type})</span></span>;
  }
  return (
    <span className="text-sm">
      <span className="font-semibold">{s.category || s.partner_name || "—"}</span>
      <span className="text-[#8C938F]"> · {s.date}</span>
      {typeof s.amount === "number" && <span className="font-bold tabular ml-2">{inr(s.amount)}</span>}
    </span>
  );
}

export default function AdminDeletionsPage() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/deletion-requests");
      setRows(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(req) {
    try {
      await api.post(`/deletion-requests/${req.id}/approve`);
      toast.success("Deletion approved");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }
  async function reject(req) {
    try {
      await api.post(`/deletion-requests/${req.id}/reject`);
      toast.success("Deletion rejected");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }

  const buckets = {
    pending: rows.filter((r) => r.status === "pending"),
    approved: rows.filter((r) => r.status === "approved"),
    rejected: rows.filter((r) => r.status === "rejected"),
  };

  function renderTable(data) {
    if (data.length === 0) {
      return (
        <div className="bg-white border border-[#DCD7CB] rounded-md p-12 text-center text-[#5C635F]">
          Nothing here.
        </div>
      );
    }
    return (
      <div className="bg-white border border-[#DCD7CB] rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="deletions-table">
            <thead className="bg-[#E8E5DC]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Details</th>
                <th className="text-left px-4 py-3 font-semibold">Requested by</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-left px-4 py-3 font-semibold">Requested</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-[#DCD7CB]" data-testid={`del-row-${r.id}`}>
                  <td className="px-4 py-3">
                    <span className="bg-[#E8E5DC] text-[#2D4C3B] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                      {TYPE_LABEL[r.resource_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ResourceSummary req={r} /></td>
                  <td className="px-4 py-3 text-[#5C635F]">{r.requested_by_name}</td>
                  <td className="px-4 py-3 text-[#5C635F] max-w-xs truncate">{r.reason || "—"}</td>
                  <td className="px-4 py-3 text-[#5C635F] tabular text-xs">{(r.requested_at || "").slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" data-testid={`approve-del-${r.id}`} className="bg-[#C35A42] hover:bg-[#a64a36] text-[#F5F4F0] h-8">
                              <Check className="w-3.5 h-3.5 mr-1" /> Approve & Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the {TYPE_LABEL[r.resource_type].toLowerCase()}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`del-cancel-${r.id}`}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => approve(r)} data-testid={`del-confirm-${r.id}`} className="bg-[#C35A42] hover:bg-[#a64a36]">
                                Delete now
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" variant="outline" onClick={() => reject(r)} data-testid={`reject-del-${r.id}`} className="border-[#DCD7CB] text-[#5C635F] hover:bg-[#E8E5DC] h-8">
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#8C938F] uppercase tracking-wide">{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-deletions-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">Admin</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
            Pending deletions
          </h1>
        </div>
        <div className="text-sm text-[#5C635F]">
          Pending: <span className="font-bold text-[#C35A42] tabular">{buckets.pending.length}</span>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="del-tab-pending">
            Pending {buckets.pending.length > 0 ? `(${buckets.pending.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="del-tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="del-tab-rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderTable(buckets.pending)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{renderTable(buckets.approved)}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{renderTable(buckets.rejected)}</TabsContent>
      </Tabs>
    </div>
  );
}
