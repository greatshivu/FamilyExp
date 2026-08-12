import axios from "axios";
import { useLoadingStore } from "@/lib/loading";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

//---------------------------------------Interceptors ----------------------------------
api.interceptors.request.use(
  (config) => {
    useLoadingStore.getState().startLoading();
    return config;
  },
  (error) => {
    useLoadingStore.getState().stopLoading();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    useLoadingStore.getState().stopLoading();
    return response;
  },
  (error) => {
    useLoadingStore.getState().stopLoading();
    return Promise.reject(error);
  }
);



export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function inr(n) {
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function selectedISO(selectedMonth = null, selectedYear = null) {
  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const currentYear = String(today.getFullYear());

  // If no selection OR selected month is the current month → return todayISO()
  if (
    selectedMonth == null ||
    selectedYear == null ||
    (selectedMonth === currentMonth && selectedYear === currentYear)
  ) {
    return todayISO();
  }

  // Otherwise return YYYY-MM-DD for selected month
  // Use day = today's day if month/year match current year?
  const day = today.getDate(); // or 1 if you want fixed first day

  const d = new Date(
    parseInt(selectedYear),
    parseInt(selectedMonth) - 1, // FIX: month must be 0-based
    day
  );

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${dd}`;
}

