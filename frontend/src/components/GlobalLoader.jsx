// src/components/GlobalLoader.jsx

import React from "react";
import { Loader2 } from "lucide-react";
import { useLoadingStore } from "@/lib/loading";

export default function GlobalLoader() {
  const loadingCount = useLoadingStore(
    (s) => s.loadingCount
  );

  if (loadingCount <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex items-center gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#2D4C3B]" />

        <div className="text-[#1C1F1D] font-medium">
          Please wait...
        </div>
      </div>
    </div>
  );
}