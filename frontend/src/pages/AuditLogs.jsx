// src/pages/AuditLogs.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

function AuditRow({ item, index }) {
  return (
    <tr
      className="border-t border-[#DCD7CB] hover:bg-[#F5F4F0]"
      data-testid={`audit-row-${item.id}`}
    >
      <td className="px-4 py-3 text-sm text-[#5C635F]">
        {index + 1}
      </td>

      <td className="px-4 py-3">
        <div className="font-semibold text-[#1C1F1D]">
          {item.user_name}
        </div>
      </td>

      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
            item.action === "Add"
              ? "bg-[#E8F5E9] text-[#2E7D32]"
              : item.action === "Update"
              ? "bg-[#FFF8E1] text-[#EF6C00]"
              : "bg-[#FFEBEE] text-[#C62828]"
          }`}
        >
          {item.action}
        </span>
      </td>

      <td className="px-4 py-3 text-sm text-[#5C635F] capitalize">
        {item.resource_type}
      </td>

      <td className="px-4 py-3 text-sm text-[#5C635F]">
        {item.category || "-"}
      </td>

      <td className="px-4 py-3 font-medium text-[#1C1F1D] tabular">
        ₹ {Number(item.amount || 0).toFixed(2)}
      </td>

      <td className="px-4 py-3 text-sm text-[#5C635F]">
        {item.date}
      </td>

      <td className="px-4 py-3 text-sm text-[#5C635F]">
        {new Date(item.created_at).toLocaleString()}
      </td>
    </tr>
  );
}

export default function AuditLogsPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/audits");

      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setAudits(sorted);
    } catch (e) {
      console.error(e);
      toast.error(
        formatApiError(e.response?.data?.detail) || "Failed to load audits"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(audits.length / PAGE_SIZE);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return audits.slice(start, start + PAGE_SIZE);
  }, [audits, page]);

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase font-bold text-[#8C938F] mb-2">
            Admin
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-black text-[#1C1F1D] tracking-tighter">
            Audit Logs
          </h1>
        </div>

        <div className="text-sm text-[#5C635F]">
          Total Records:{" "}
          <span className="font-bold tabular">
            {audits.length}
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#DCD7CB] rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            data-testid="audit-table"
          >
            <thead className="bg-[#E8E5DC] text-[#1C1F1D]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-[#5C635F]"
                  >
                    Loading audits...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-[#5C635F]"
                  >
                    No audit records found.
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => (
                  <AuditRow
                    key={item.id}
                    item={item}
                    index={(page - 1) * PAGE_SIZE + index}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#5C635F]">
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-[#DCD7CB]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-[#DCD7CB]"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}