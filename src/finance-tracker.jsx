import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { googleProvider } from "./firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0E1A",
  surface: "#111827",
  card: "#151E2E",
  border: "#1E2D42",
  accent: "#3ECFCF",
  accentDim: "#1A4A4A",
  green: "#22D3A0",
  red: "#F87171",
  yellow: "#FBBF24",
  purple: "#A78BFA",
  blue: "#60A5FA",
  orange: "#FB923C",
  text: "#E2E8F0",
  muted: "#64748B",
  chart: ["#3ECFCF","#22D3A0","#A78BFA","#FBBF24","#F87171","#60A5FA","#FB923C"],
};

// ─── UTILITY ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const uid = () => Math.random().toString(36).slice(2, 9);

const today = new Date();
const toYMD = (d) => d.toISOString().split("T")[0];

// Generate last N months of mock monthly data helper
const getMonthLabel = (monthsAgo) => {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
};

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const initState = () => ({
  transactions: [
    { id: uid(), type: "income", category: "Salary", amount: 45000, date: "2026-02-01", note: "Monthly salary" },
    { id: uid(), type: "expense", category: "Rent", amount: 12000, date: "2026-02-03", note: "Feb rent" },
    { id: uid(), type: "expense", category: "Food", amount: 4500, date: "2026-02-10", note: "Groceries" },
    { id: uid(), type: "expense", category: "Transport", amount: 1800, date: "2026-02-12", note: "Commute" },
    { id: uid(), type: "expense", category: "Entertainment", amount: 1200, date: "2026-02-15", note: "OTT + games" },
    { id: uid(), type: "expense", category: "Utilities", amount: 2200, date: "2026-02-18", note: "Electricity & net" },
    { id: uid(), type: "income", category: "Freelance", amount: 8000, date: "2026-02-20", note: "Design work" },
    { id: uid(), type: "investment", category: "Mutual Funds", amount: 5000, date: "2026-02-05", note: "SIP installment" },
  ],
  budgets: [
    { id: uid(), category: "Food", limit: 6000 },
    { id: uid(), category: "Transport", limit: 3000 },
    { id: uid(), category: "Entertainment", limit: 2000 },
    { id: uid(), category: "Utilities", limit: 3000 },
    { id: uid(), category: "Shopping", limit: 4000 },
  ],
  assets: [
    { id: uid(), name: "Savings Account", type: "asset", category: "Cash", value: 85000, note: "SBI savings" },
    { id: uid(), name: "Mutual Funds", type: "asset", category: "Investment", value: 45000, note: "SIP running" },
    { id: uid(), name: "Laptop", type: "asset", category: "Property", value: 55000, note: "Dell XPS" },
  ],
  liabilities: [
    { id: uid(), name: "Education Loan", type: "liability", category: "Loan", value: 120000, rate: 9.5, note: "HDFC bank" },
    { id: uid(), name: "Credit Card", type: "liability", category: "Credit Card", value: 8500, rate: 36, note: "ICICI Coral" },
  ],
  plans: {
    goals: [
      { id: uid(), title: "Build Emergency Fund", targetAmount: 150000, savedAmount: 85000, deadline: "2026-12-31", priority: "high", note: "6 months expenses" },
      { id: uid(), title: "Buy a Bike", targetAmount: 80000, savedAmount: 20000, deadline: "2026-09-30", priority: "medium", note: "Hero Splendor" },
    ],
    wishlist: [
      { id: uid(), name: "iPhone 16", amount: 80000, priority: "low", note: "Upgrade from current phone" },
      { id: uid(), name: "Mechanical Keyboard", amount: 8000, priority: "medium", note: "For work from home" },
    ],
  },
  // Auto payments: deducted on dayOfMonth every month
  autopayments: [
    { id: uid(), name: "RD Installment", amount: 2500, dayOfMonth: 1, category: "investment", note: "Recurring Deposit" },
  ],
  // Manual opening/adjustment balance added on top of computed balance
  masterAdjustment: 0,
  // Track which auto-payment months have already been processed: "name-YYYY-MM"
  autopaymentLog: [],
  // Custom categories per type
  customCategories: { expense: [], income: [], asset: [], liability: [] },
});

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    wallet: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/></svg>,
    budget: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    assets: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
    plans: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    plus: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
    trash: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
    trend_up: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M22 7l-9 9-4-4L2 17"/><path d="M16 7h6v6"/></svg>,
    trend_down: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M22 17l-9-9-4 4L2 7"/><path d="M16 17h6v-6"/></svg>,
    invest: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    google: <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
    logout: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>,
    eye: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeoff: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    star: <svg width={size} height={size} fill={color} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    gift: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
    flag: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    edit: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  };
  return icons[name] || null;
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, glow }) => (
  <div style={{ background: C.card, border: `1px solid ${glow ? glow + "40" : C.border}`, borderRadius: 16, padding: 24, boxShadow: glow ? `0 0 28px ${glow}20` : "none", transition: "box-shadow 0.3s", ...style }}>
    {children}
  </div>
);

const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "20", color, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
    {children}
  </span>
);

const StatCard = ({ label, value, icon, color, change }) => (
  <Card glow={color} style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: color + "15", filter: "blur(20px)" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ background: `linear-gradient(135deg, ${color}30, ${color}15)`, borderRadius: 12, padding: 10, display: "flex", border: `1px solid ${color}30` }}>
        <Icon name={icon} color={color} size={20} />
      </div>
      {change !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: change >= 0 ? C.green : C.red, fontSize: 12, background: (change >= 0 ? C.green : C.red) + "15", padding: "3px 8px", borderRadius: 20 }}>
          <Icon name={change >= 0 ? "trend_up" : "trend_down"} size={12} color={change >= 0 ? C.green : C.red} />
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: -0.5 }}>{value}</div>
    </div>
  </Card>
);

// Gradient orbs for visual flair
const Orb = ({ color, size = 300, top, left, right, bottom, opacity = 0.12 }) => (
  <div style={{ position: "fixed", width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${color}, transparent 70%)`, opacity, pointerEvents: "none", zIndex: 0, top, left, right, bottom, filter: "blur(40px)" }} />
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "24px 20px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", margin: "0 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ color: C.text, margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: C.border, border: "none", color: C.muted, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ color: C.muted, fontSize: 13, display: "block", marginBottom: 6 }}>{label}</label>}
    <input {...props} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", ...props.style }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ color: C.muted, fontSize: 13, display: "block", marginBottom: 6 }}>{label}</label>}
    <select {...props} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box" }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", style = {} }) => {
  const base = { border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "all 0.15s" };
  const variants = {
    primary: { background: C.accent, color: "#0A0E1A" },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    danger: { background: C.red + "20", color: C.red, border: `1px solid ${C.red}40` },
    purple: { background: C.purple + "20", color: C.purple, border: `1px solid ${C.purple}40` },
  };
  const sizes = { sm: { padding: "6px 14px", fontSize: 13 }, md: { padding: "10px 20px", fontSize: 15 }, lg: { padding: "14px 28px", fontSize: 16 } };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...sizes[size], ...style }}>{children}</button>;
};

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "transactions", label: "Transactions", icon: "wallet" },
  { id: "budget", label: "Budget", icon: "budget" },
  { id: "assets", label: "Net Worth", icon: "assets" },
  { id: "plans", label: "Future Plans", icon: "plans" },
];

const EXPENSE_CATS = ["Food", "Transport", "Rent", "Entertainment", "Utilities", "Shopping", "Health", "Education", "Other"];
const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment Returns", "Gift", "Other"];
const ASSET_CATS = ["Cash", "Investment", "Property", "Vehicle", "Other"];
const LIABILITY_CATS = ["Loan", "Credit Card", "Mortgage", "Other"];
const PRIORITY_COLORS = { high: C.red, medium: C.yellow, low: C.green };

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, setData }) {
  const [chartRange, setChartRange] = useState("6m");
  const [editBalanceModal, setEditBalanceModal] = useState(false);
  const [editBalanceVal, setEditBalanceVal] = useState("");
  const [apModal, setApModal] = useState(false);
  const [apForm, setApForm] = useState({ name: "", amount: "", dayOfMonth: "1", txType: "expense", txCategory: "", note: "" });

  const autopayments = data.autopayments || [];
  const autopaymentLog = data.autopaymentLog || [];
  const masterAdjustment = data.masterAdjustment || 0;

  // ── On mount: clean up any auto transactions that were wrongly backfilled before createdAt ──
  useEffect(() => {
    const apsWithCreated = (data.autopayments || []).filter(ap => ap.createdAt);
    if (apsWithCreated.length === 0) return;

    const toRemoveDates = new Set();
    apsWithCreated.forEach(ap => {
      const created = new Date(ap.createdAt);
      const createdYr = created.getFullYear();
      const createdMo = created.getMonth();
      const createdDay = created.getDate();

      // Find auto transactions for this ap that are dated before it should have started
      data.transactions.forEach(t => {
        if (!t.auto || t.category !== ap.txCategory || t.type !== ap.txType) return;
        const td = new Date(t.date);
        const beforeCreationMonth = td.getFullYear() < createdYr || (td.getFullYear() === createdYr && td.getMonth() < createdMo);
        const sameMonthButTooEarly = td.getFullYear() === createdYr && td.getMonth() === createdMo && ap.dayOfMonth < createdDay;
        if (beforeCreationMonth || sameMonthButTooEarly) {
          toRemoveDates.add(t.id);
        }
      });
    });

    if (toRemoveDates.size > 0) {
      // Also clean up the log entries for those removed transactions
      setData(d => ({
        ...d,
        transactions: d.transactions.filter(t => !toRemoveDates.has(t.id)),
        autopaymentLog: [], // reset log so it gets re-evaluated correctly
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const now = new Date();
    const todayDay = now.getDate();
    const thisYr = now.getFullYear();
    const thisMo = now.getMonth(); // 0-indexed
    let newTransactions = [...data.transactions];
    let newLog = [...autopaymentLog];
    let changed = false;

    autopayments.forEach(ap => {
      // Parse the month this auto payment was created
      const createdDate = ap.createdAt ? new Date(ap.createdAt) : now;
      const createdYr = createdDate.getFullYear();
      const createdMo = createdDate.getMonth(); // 0-indexed

      // Walk from creation month to current month
      let yr = createdYr;
      let mo = createdMo;

      while (yr < thisYr || (yr === thisYr && mo <= thisMo)) {
        const logKey = `${ap.id}-${yr}-${String(mo + 1).padStart(2, "0")}`;
        const isCurrentMonth = yr === thisYr && mo === thisMo;
        const isCreationMonth = yr === createdYr && mo === createdMo;

        // For current month: only fire if the payment day has already passed today
        // For creation month: only fire if payment day >= creation day (don't backdate within creation month)
        const createdDay = createdDate.getDate();
        const dayOk = isCurrentMonth
          ? todayDay >= ap.dayOfMonth          // today must be on/after payment day
          : isCreationMonth
            ? ap.dayOfMonth >= createdDay      // payment day must be on/after the day it was created
            : true;                            // past months always fire

        if (dayOk && !newLog.includes(logKey)) {
          const dateStr = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(ap.dayOfMonth).padStart(2, "0")}`;
          newTransactions = [
            { id: uid(), type: ap.txType, category: ap.txCategory, amount: ap.amount, date: dateStr, note: `Auto: ${ap.note || ap.name}`, auto: true },
            ...newTransactions,
          ];
          newLog = [...newLog, logKey];
          changed = true;
        }

        // Advance to next month
        mo++;
        if (mo > 11) { mo = 0; yr++; }
      }
    });

    if (changed) {
      setData(d => ({ ...d, transactions: newTransactions, autopaymentLog: newLog }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopayments.length]);

  const addAutopayment = () => {
    if (!apForm.name || !apForm.amount || !apForm.txCategory) return;
    const newAp = { ...apForm, id: uid(), amount: parseFloat(apForm.amount), dayOfMonth: parseInt(apForm.dayOfMonth), createdAt: toYMD(new Date()) };
    setData(d => ({ ...d, autopayments: [...(d.autopayments || []), newAp] }));
    setApModal(false);
    setApForm({ name: "", amount: "", dayOfMonth: "1", txType: "expense", txCategory: "", note: "" });
  };

  const delAutopayment = (id) => {
    setData(d => ({ ...d, autopayments: (d.autopayments || []).filter(a => a.id !== id) }));
  };

  const saveBalanceEdit = () => {
    const val = parseFloat(editBalanceVal);
    if (isNaN(val)) return;
    setData(d => ({ ...d, masterAdjustment: val }));
    setEditBalanceModal(false);
  };

  const totalIncome = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalInvestment = data.transactions.filter(t => t.type === "investment").reduce((s, t) => s + t.amount, 0);
  const totalLiabPayments = data.transactions.filter(t => t.type === "liability_payment").reduce((s, t) => s + t.amount, 0);
  // Master balance = adjustment (opening/manual) + income - all outflows
  const masterBalance = masterAdjustment + totalIncome - totalExpense - totalInvestment - totalLiabPayments;
  const savings = totalIncome - totalExpense - totalInvestment - totalLiabPayments;
  // Match Net Worth tab: assets include investments, liabilities reduced by payments
  const getInvestedInAsset = (assetName) =>
    data.transactions.filter(t => t.type === "investment" && t.category === assetName).reduce((s, t) => s + t.amount, 0);
  const getLiabPayments = (liabName) =>
    data.transactions.filter(t => t.type === "liability_payment" && t.category === liabName).reduce((s, t) => s + t.amount, 0);
  const totalAssets = data.assets.reduce((s, a) => s + a.value + getInvestedInAsset(a.name), 0);
  const totalLiabilities = data.liabilities.reduce((s, l) => s + Math.max(l.value - getLiabPayments(l.name), 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const expByCategory = EXPENSE_CATS.map(cat => ({
    name: cat,
    value: data.transactions.filter(t => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0)
  })).filter(d => d.value > 0);

  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  // Build chart data from REAL transactions grouped by month
  const buildChartData = () => {
    const ranges = { "1m": 1, "6m": 6, "1y": 12 };
    const months = ranges[chartRange];

    return Array.from({ length: months }, (_, i) => {
      const monthsAgo = months - 1 - i;
      const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();

      const inMonth = data.transactions.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === yr && td.getMonth() === mo;
      });

      return {
        month: getMonthLabel(monthsAgo),
        income: inMonth.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: inMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
        investment: inMonth.filter(t => t.type === "investment").reduce((s, t) => s + t.amount, 0),
      };
    });
  };

  const chartData = buildChartData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Master Account ── */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent}22 0%, ${C.purple}22 100%)`, border: `1px solid ${C.accent}40`, borderRadius: 20, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>💳</span>
              <span style={{ color: C.muted, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Master Account Balance</span>
            </div>
            <div style={{ color: masterBalance >= 0 ? C.accent : C.red, fontSize: 42, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
              {fmt(masterBalance)}
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
              Cash in hand after all spending, investments & loan payments
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn size="sm" variant="ghost" onClick={() => { setEditBalanceVal(String(masterAdjustment)); setEditBalanceModal(true); }}>
                <Icon name="edit" size={13} color={C.muted} /> Edit Balance
              </Btn>
              <Btn size="sm" onClick={() => setApModal(true)}>
                <Icon name="plus" size={13} color="#0A0E1A" /> Add Auto Payment
              </Btn>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
            {masterAdjustment !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Opening Balance</span>
                <span style={{ color: masterAdjustment >= 0 ? C.green : C.red, fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>
                  {masterAdjustment >= 0 ? "+" : ""}{fmt(masterAdjustment)}
                </span>
              </div>
            )}
            {[
              { label: "Total Income", value: totalIncome, color: C.green, sign: "+" },
              { label: "Expenses", value: totalExpense, color: C.red, sign: "-" },
              { label: "Invested", value: totalInvestment, color: C.purple, sign: "-" },
              { label: "Loan Payments", value: totalLiabPayments, color: C.orange, sign: "-" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>{r.label}</span>
                <span style={{ color: r.color, fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>
                  {r.sign}{fmt(r.value)}
                </span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Balance</span>
              <span style={{ color: masterBalance >= 0 ? C.accent : C.red, fontFamily: "monospace", fontWeight: 800, fontSize: 15 }}>{fmt(masterBalance)}</span>
            </div>
          </div>
        </div>

        {/* Auto Payments list */}
        {autopayments.length > 0 && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${C.accent}20`, paddingTop: 16 }}>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              🔄 Auto Payments ({autopayments.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {autopayments.map(ap => {
                const txType = ap.txType || ap.category || "expense";
                const apColor = txType === "investment" ? C.purple : txType === "liability_payment" ? C.orange : C.red;
                const typeLabel = txType === "investment" ? "📈" : txType === "liability_payment" ? "🏦" : "💸";
                const dayLabel = ap.dayOfMonth === 1 ? "1st" : ap.dayOfMonth === 2 ? "2nd" : ap.dayOfMonth === 3 ? "3rd" : `${ap.dayOfMonth}th`;
                return (
                  <div key={ap.id} style={{ background: apColor + "15", border: `1px solid ${apColor}30`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{typeLabel}</span>
                        <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{ap.name}</span>
                      </div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                        {ap.txCategory || ap.name} · every {dayLabel} of the month
                      </div>
                    </div>
                    <span style={{ color: apColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>-{fmt(ap.amount)}</span>
                    <button onClick={() => delAutopayment(ap.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, display: "flex" }}>
                      <Icon name="trash" size={13} color={C.muted} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Balance Modal */}
      <Modal open={editBalanceModal} onClose={() => setEditBalanceModal(false)} title="Edit Opening Balance">
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Set your opening / starting balance. This is added on top of all your income and expenses so your master balance reflects reality.
          <br/>Current computed balance (from transactions): <strong style={{ color: C.accent }}>{fmt(totalIncome - totalExpense - totalInvestment - totalLiabPayments)}</strong>
        </div>
        <Input
          label="Opening / Adjustment Balance (₹)"
          type="number"
          placeholder="e.g. 50000"
          value={editBalanceVal}
          onChange={e => setEditBalanceVal(e.target.value)}
        />
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
          New Master Balance will be: <span style={{ color: C.accent, fontWeight: 700 }}>
            {fmt((parseFloat(editBalanceVal) || 0) + totalIncome - totalExpense - totalInvestment - totalLiabPayments)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setEditBalanceModal(false)}>Cancel</Btn>
          <Btn onClick={saveBalanceEdit}>Save Balance</Btn>
        </div>
      </Modal>

      {/* Add Auto Payment Modal */}
      <Modal open={apModal} onClose={() => setApModal(false)} title="Add Auto Payment">
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Auto payments are deducted from your master balance automatically on the chosen day every month and recorded as a transaction.
        </div>
        <Input
          label="Payment Name / Label"
          placeholder="e.g. RD Installment, Netflix, Home EMI"
          value={apForm.name}
          onChange={e => setApForm(f => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="Amount (₹)"
          type="number"
          placeholder="2500"
          value={apForm.amount}
          onChange={e => setApForm(f => ({ ...f, amount: e.target.value }))}
        />
        <Input
          label="Day of Month (1–28)"
          type="number"
          min="1"
          max="28"
          placeholder="1"
          value={apForm.dayOfMonth}
          onChange={e => setApForm(f => ({ ...f, dayOfMonth: e.target.value }))}
        />
        <Select
          label="Transaction Type"
          value={apForm.txType}
          onChange={e => setApForm(f => ({ ...f, txType: e.target.value, txCategory: "" }))}
        >
          <option value="expense">💸 Expense</option>
          <option value="investment">📈 Investment</option>
          <option value="liability_payment">🏦 Liability Payment</option>
        </Select>
        <Select
          label="Category"
          value={apForm.txCategory}
          onChange={e => setApForm(f => ({ ...f, txCategory: e.target.value }))}
        >
          <option value="">Select category</option>
          {apForm.txType === "expense" && EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
          {apForm.txType === "investment" && (
            data.assets.length > 0
              ? data.assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)
              : ["Mutual Funds","RD","FD","Stocks","Gold","Other"].map(c => <option key={c}>{c}</option>)
          )}
          {apForm.txType === "liability_payment" && (
            data.liabilities.length > 0
              ? data.liabilities.map(l => <option key={l.id} value={l.name}>{l.name}</option>)
              : ["Education Loan","Credit Card","Car Loan","Other"].map(c => <option key={c}>{c}</option>)
          )}
        </Select>
        {apForm.txType === "investment" && (
          <div style={{ background: C.purple + "10", border: `1px solid ${C.purple}30`, borderRadius: 8, padding: "8px 12px", marginBottom: 16, color: C.purple, fontSize: 12 }}>
            💡 This will increase the matching asset's value in Net Worth
          </div>
        )}
        {apForm.txType === "liability_payment" && (
          <div style={{ background: C.orange + "10", border: `1px solid ${C.orange}30`, borderRadius: 8, padding: "8px 12px", marginBottom: 16, color: C.orange, fontSize: 12 }}>
            🏦 This will reduce the matching liability's balance in Net Worth
          </div>
        )}
        <Input
          label="Note (optional)"
          placeholder="e.g. HDFC RD account"
          value={apForm.note}
          onChange={e => setApForm(f => ({ ...f, note: e.target.value }))}
        />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setApModal(false)}>Cancel</Btn>
          <Btn onClick={addAutopayment}>Add Auto Payment</Btn>
        </div>
      </Modal>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        <StatCard label="Monthly Income" value={fmt(totalIncome)} icon="trend_up" color={C.green} change={5.2} />
        <StatCard label="Monthly Expenses" value={fmt(totalExpense)} icon="trend_down" color={C.red} change={-3.1} />
        <StatCard label="Investments" value={fmt(totalInvestment)} icon="invest" color={C.purple} change={8.5} />
        <StatCard label="Net Savings" value={fmt(savings)} icon="wallet" color={C.accent} />
        <StatCard label="Net Worth" value={fmt(netWorth)} icon="assets" color={C.blue} change={2.4} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Income vs Expense vs Investment with range toggle */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>Income · Expense · Investment</div>
            <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 8, padding: 3 }}>
              {["1m", "6m", "1y"].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  style={{ padding: "4px 12px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12, transition: "all 0.15s", background: chartRange === r ? C.accent : "transparent", color: chartRange === r ? C.bg : C.muted }}>
                  {r === "1m" ? "1M" : r === "6m" ? "6M" : "1Y"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInvest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.purple} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" stroke={C.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => `₹${v / 1000}k`} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={v => fmt(v)} />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              <Area type="monotone" dataKey="income" stroke={C.green} fill="url(#gIncome)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expense" stroke={C.red} fill="url(#gExpense)" strokeWidth={2} name="Expense" />
              <Area type="monotone" dataKey="investment" stroke={C.purple} fill="url(#gInvest)" strokeWidth={2} name="Investment" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Expense Breakdown</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={expByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                  {expByCategory.map((_, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {expByCategory.map((d, i) => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.chart[i % C.chart.length] }} />
                    <span style={{ color: C.muted, fontSize: 13 }}>{d.name}</span>
                  </div>
                  <span style={{ color: C.text, fontSize: 13, fontFamily: "monospace" }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Savings Rate + Net Worth */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>Savings Rate</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: savingsRate >= 20 ? C.green : savingsRate >= 10 ? C.yellow : C.red, fontFamily: "'DM Mono', monospace" }}>{savingsRate}%</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              {savingsRate >= 20 ? "🎉 Excellent saving habits!" : savingsRate >= 10 ? "👍 Good, aim for 20%+" : "⚠️ Try to save more"}
            </div>
          </div>
          <div style={{ background: C.bg, borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(savingsRate, 100)}%`, height: "100%", background: savingsRate >= 20 ? C.green : savingsRate >= 10 ? C.yellow : C.red, borderRadius: 8, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 12 }}>
            <span>0%</span><span>Target: 20%</span><span>100%</span>
          </div>
          {/* Investment rate mini stat */}
          <div style={{ background: C.purple + "15", border: `1px solid ${C.purple}30`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 2 }}>Investment Rate</div>
            <div style={{ color: C.purple, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>
              {totalIncome > 0 ? ((totalInvestment / totalIncome) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Net Worth Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Total Assets</div>
              <div style={{ color: C.green, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{fmt(totalAssets)}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Total Liabilities</div>
              <div style={{ color: C.red, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{fmt(totalLiabilities)}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Net Worth</div>
              <div style={{ color: netWorth >= 0 ? C.accent : C.red, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{fmt(netWorth)}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={[{ name: "Assets", value: totalAssets }, { name: "Liabilities", value: totalLiabilities }, { name: "Net Worth", value: Math.max(netWorth, 0) }]} layout="vertical">
              <XAxis type="number" stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => `₹${v / 1000}k`} />
              <YAxis type="category" dataKey="name" stroke={C.muted} tick={{ fontSize: 12 }} width={80} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={v => fmt(v)} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {[C.green, C.red, C.accent].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Finance Insights */}
      <Card>
        <div style={{ color: C.text, fontWeight: 700, marginBottom: 16, fontSize: 16 }}>💡 Finance Insights</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { tip: `Your largest expense is Rent at ${fmt(data.transactions.filter(t => t.category === "Rent").reduce((s,t) => s+t.amount,0))}`, color: C.yellow },
            { tip: `High-interest debt! Credit card at 36% APR — pay it first.`, color: C.red },
            { tip: `Emergency fund target: ${fmt(totalExpense * 6)} (6 months expenses)`, color: C.accent },
            { tip: `You invested ${fmt(totalInvestment)} this month — keep building wealth!`, color: C.purple },
          ].map((item, i) => (
            <div key={i} style={{ background: item.color + "10", border: `1px solid ${item.color}30`, borderRadius: 10, padding: "12px 16px", color: item.color, fontSize: 13, lineHeight: 1.5 }}>
              {item.tip}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function Transactions({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [catType, setCatType] = useState("expense");
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState({ type: "expense", category: "", amount: "", date: toYMD(new Date()), note: "" });

  const custom = data.customCategories || { expense: [], income: [], asset: [], liability: [] };

  // When type changes, populate categories from relevant data + custom ones
  const getCategories = () => {
    if (form.type === "income") return [...INCOME_CATS, ...(custom.income || [])];
    if (form.type === "investment") return data.assets.length > 0
      ? data.assets.map(a => a.name)
      : ["Mutual Funds", "Stocks", "FD", "Gold", "Crypto", "Other"];
    if (form.type === "liability_payment") return data.liabilities.length > 0
      ? data.liabilities.map(l => l.name)
      : ["Education Loan", "Credit Card", "Car Loan", "Other"];
    return [...EXPENSE_CATS, ...(custom.expense || [])];
  };

  const addCustomCat = () => {
    if (!newCat.trim()) return;
    setData(d => ({ ...d, customCategories: { ...(d.customCategories || {}), [catType]: [...((d.customCategories || {})[catType] || []), newCat.trim()] } }));
    setNewCat("");
  };

  const delCustomCat = (type, cat) => {
    setData(d => ({ ...d, customCategories: { ...(d.customCategories || {}), [type]: ((d.customCategories || {})[type] || []).filter(c => c !== cat) } }));
  };

  const typeColor = { income: C.green, expense: C.red, investment: C.purple, liability_payment: C.orange };

  const addTx = () => {
    if (!form.category || !form.amount || !form.date) return;
    setData(d => ({ ...d, transactions: [{ ...form, id: uid(), amount: parseFloat(form.amount) }, ...d.transactions] }));
    setModal(false);
    setForm({ type: "expense", category: "", amount: "", date: toYMD(new Date()), note: "" });
  };

  const delTx = (id) => setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== id) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 700 }}>Transactions</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" size="sm" onClick={() => setCatModal(true)}><Icon name="edit" size={14} color={C.muted} /> Categories</Btn>
          <Btn onClick={() => setModal(true)}><Icon name="plus" size={16} color="#0A0E1A" /> Add</Btn>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Income", value: data.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0), color: C.green },
          { label: "Expenses", value: data.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0), color: C.red },
          { label: "Investments", value: data.transactions.filter(t=>t.type==="investment").reduce((s,t)=>s+t.amount,0), color: C.purple },
          { label: "Loan Payments", value: data.transactions.filter(t=>t.type==="liability_payment").reduce((s,t)=>s+t.amount,0), color: C.orange },
        ].map(p => (
          <div key={p.label} style={{ background: p.color + "15", border: `1px solid ${p.color}30`, borderRadius: 10, padding: "10px 18px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.label}</span>
            <span style={{ color: p.color, fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Date", "Category", "Type", "Note", "Amount", ""].map(h => (
                <th key={h} style={{ padding: "14px 20px", color: C.muted, fontSize: 12, textAlign: "left", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.transactions.sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
              <tr key={tx.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "14px 20px", color: C.muted, fontSize: 13 }}>{tx.date}</td>
                <td style={{ padding: "14px 20px" }}><Badge color={typeColor[tx.type] || C.accent}>{tx.category}</Badge></td>
                <td style={{ padding: "14px 20px", fontSize: 13, textTransform: "capitalize" }}>
                  <span style={{ color: typeColor[tx.type] || C.accent, fontWeight: 600 }}>{tx.type}</span>
                </td>
                <td style={{ padding: "14px 20px", color: C.muted, fontSize: 13 }}>{tx.note}</td>
                <td style={{ padding: "14px 20px", color: typeColor[tx.type] || C.accent, fontFamily: "monospace", fontWeight: 700 }}>
                  {tx.type === "income" ? "+" : tx.type === "investment" ? "→" : tx.type === "liability_payment" ? "⬇" : "-"}{fmt(tx.amount)}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <Btn variant="danger" size="sm" onClick={() => delTx(tx.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {/* Manage Categories Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Manage Categories">
        <Select label="Category Type" value={catType} onChange={e => setCatType(e.target.value)}>
          <option value="expense">💸 Expense Categories</option>
          <option value="income">💰 Income Categories</option>
        </Select>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Built-in</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(catType === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => (
              <span key={c} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px", color: C.muted, fontSize: 12 }}>{c}</span>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Your Custom Categories</div>
          {((custom[catType] || []).length === 0) && <div style={{ color: C.muted, fontSize: 13 }}>No custom categories yet.</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(custom[catType] || []).map(c => (
              <span key={c} style={{ background: C.accent + "15", border: `1px solid ${C.accent}30`, borderRadius: 20, padding: "4px 12px", color: C.accent, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                {c}
                <button onClick={() => delCustomCat(catType, c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomCat()} placeholder="Add new category..." style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none" }} />
          <Btn onClick={addCustomCat}><Icon name="plus" size={15} color="#0A0E1A" /></Btn>
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>Press Enter or click + to add</div>
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Transaction">
        <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: "" }))}>
          <option value="expense">💸 Expense</option>
          <option value="income">💰 Income</option>
          <option value="investment">📈 Investment</option>
          <option value="liability_payment">🏦 Liability Payment</option>
        </Select>
        {form.type === "investment" && data.assets.length > 0 && (
          <div style={{ background: C.purple + "10", border: `1px solid ${C.purple}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.purple, fontSize: 13 }}>
            💡 Categories are auto-filled from your Assets
          </div>
        )}
        {form.type === "liability_payment" && data.liabilities.length > 0 && (
          <div style={{ background: C.orange + "10", border: `1px solid ${C.orange}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.orange, fontSize: 13 }}>
            🏦 Categories are auto-filled from your Liabilities — paying this reduces the balance
          </div>
        )}
        <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">Select category</option>
          {getCategories().map(c => <option key={c}>{c}</option>)}
        </Select>
        <Input label="Amount (₹)" type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        <Input label="Note (optional)" placeholder="What was this for?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={addTx}>Add Transaction</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── BUDGET ───────────────────────────────────────────────────────────────────
function Budget({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: "", limit: "" });

  const getSpent = (cat) => data.transactions.filter(t => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0);

  const delBudget = (id) => setData(d => ({ ...d, budgets: d.budgets.filter(b => b.id !== id) }));

  const addBudget = () => {
    if (!form.category || !form.limit) return;
    setData(d => ({ ...d, budgets: [...d.budgets.filter(b => b.category !== form.category), { id: uid(), category: form.category, limit: parseFloat(form.limit) }] }));
    setModal(false);
    setForm({ category: "", limit: "" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 700 }}>Budget Tracker</h2>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={16} color="#0A0E1A" /> Set Budget</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {data.budgets.map(b => {
          const spent = getSpent(b.category);
          const pct = Math.min((spent / b.limit) * 100, 100);
          const status = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
          const statusColor = status === "over" ? C.red : status === "warn" ? C.yellow : C.green;
          return (
            <Card key={b.id} style={{ gap: 16, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{b.category}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={statusColor}>{status === "over" ? "Over Budget!" : status === "warn" ? "Near Limit" : "On Track"}</Badge>
                  <Btn variant="danger" size="sm" onClick={() => delBudget(b.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.muted }}>Spent: <span style={{ color: statusColor, fontWeight: 700 }}>{fmt(spent)}</span></span>
                <span style={{ color: C.muted }}>Budget: <span style={{ color: C.text }}>{fmt(b.limit)}</span></span>
              </div>
              <div style={{ background: C.bg, borderRadius: 8, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: statusColor, borderRadius: 8, transition: "width 0.6s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                <span>{pct.toFixed(0)}% used</span>
                <span>Remaining: {fmt(Math.max(b.limit - spent, 0))}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {data.budgets.length > 0 && (
        <Card>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Budget vs Actual</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.budgets.map(b => ({ name: b.category, Budget: b.limit, Spent: getSpent(b.category) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" stroke={C.muted} tick={{ fontSize: 12 }} />
              <YAxis stroke={C.muted} tick={{ fontSize: 12 }} tickFormatter={v => `₹${v / 1000}k`} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={v => fmt(v)} />
              <Legend wrapperStyle={{ color: C.muted }} />
              <Bar dataKey="Budget" fill={C.accent + "50"} stroke={C.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill={C.red + "80"} stroke={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Set Category Budget">
        <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">Select category</option>
          {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
        </Select>
        <Input label="Monthly Budget (₹)" type="number" placeholder="5000" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={addBudget}>Set Budget</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── ASSETS ───────────────────────────────────────────────────────────────────
function Assets({ data, setData }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", value: "", rate: "", note: "" });
  const custom = data.customCategories || { expense: [], income: [], asset: [], liability: [] };
  const allAssetCats = [...ASSET_CATS, ...(custom.asset || [])];
  const allLiabCats = [...LIABILITY_CATS, ...(custom.liability || [])];

  // Sum all investment transactions for a given asset name
  const getInvestedAmount = (assetName) =>
    data.transactions
      .filter(t => t.type === "investment" && t.category === assetName)
      .reduce((s, t) => s + t.amount, 0);

  // Effective asset value = base + all investments via transactions
  const effectiveValue = (a) => a.value + getInvestedAmount(a.name);

  // Sum all liability payments made via transactions for a liability name
  const getLiabilityPayments = (liabName) =>
    data.transactions
      .filter(t => t.type === "liability_payment" && t.category === liabName)
      .reduce((s, t) => s + t.amount, 0);

  // Effective liability = base value minus all payments made
  const effectiveLiability = (l) => Math.max(l.value - getLiabilityPayments(l.name), 0);

  const totalAssets = data.assets.reduce((s, a) => s + effectiveValue(a), 0);
  const totalLiab = data.liabilities.reduce((s, l) => s + effectiveLiability(l), 0);
  const netWorth = totalAssets - totalLiab;

  const add = (type) => {
    if (!form.name || !form.value) return;
    const item = { ...form, id: uid(), type, value: parseFloat(form.value), rate: parseFloat(form.rate) || 0 };
    if (type === "asset") setData(d => ({ ...d, assets: [...d.assets, item] }));
    else setData(d => ({ ...d, liabilities: [...d.liabilities, item] }));
    setModal(null);
    setForm({ name: "", category: "", value: "", rate: "", note: "" });
  };

  const del = (type, id) => {
    if (type === "asset") setData(d => ({ ...d, assets: d.assets.filter(a => a.id !== id) }));
    else setData(d => ({ ...d, liabilities: d.liabilities.filter(l => l.id !== id) }));
  };

  const pieData = data.assets.map(a => ({ name: a.name, value: effectiveValue(a) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        <StatCard label="Total Assets" value={fmt(totalAssets)} icon="trend_up" color={C.green} />
        <StatCard label="Total Liabilities" value={fmt(totalLiab)} icon="trend_down" color={C.red} />
        <StatCard label="Net Worth" value={fmt(netWorth)} icon="star" color={netWorth >= 0 ? C.accent : C.red} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: C.green, margin: 0, fontSize: 16 }}>Assets</h3>
            <Btn size="sm" onClick={() => { setForm({ name: "", category: allAssetCats[0], value: "", rate: "", note: "" }); setModal("asset"); }}>
              <Icon name="plus" size={14} color="#0A0E1A" /> Add
            </Btn>
          </div>
          {[...data.assets].sort((a, b) => effectiveValue(b) - effectiveValue(a)).map(a => {
            const invested = getInvestedAmount(a.name);
            const total = effectiveValue(a);
            return (
              <Card key={a.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge color={C.green}>{a.category}</Badge>
                    {a.note && <span style={{ color: C.muted, fontSize: 12 }}>{a.note}</span>}
                    {invested > 0 && (
                      <span style={{ color: C.purple, fontSize: 11, fontWeight: 600, background: C.purple + "15", borderRadius: 5, padding: "1px 7px" }}>
                        +{fmt(invested)} invested
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: C.green, fontFamily: "monospace", fontWeight: 700 }}>{fmt(total)}</div>
                    {invested > 0 && (
                      <div style={{ color: C.muted, fontSize: 11 }}>base: {fmt(a.value)}</div>
                    )}
                  </div>
                  <Btn variant="danger" size="sm" onClick={() => del("asset", a.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
                </div>
              </Card>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: C.red, margin: 0, fontSize: 16 }}>Liabilities</h3>
            <Btn size="sm" onClick={() => { setForm({ name: "", category: allLiabCats[0], value: "", rate: "", note: "" }); setModal("liability"); }}>
              <Icon name="plus" size={14} color="#0A0E1A" /> Add
            </Btn>
          </div>
          {data.liabilities.map(l => {
            const paid = getLiabilityPayments(l.name);
            const remaining = effectiveLiability(l);
            const paidPct = Math.min((paid / l.value) * 100, 100);
            return (
              <Card key={l.id} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{l.name}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge color={C.red}>{l.category}</Badge>
                      {l.rate > 0 && <span style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>{l.rate}% APR</span>}
                      {l.note && <span style={{ color: C.muted, fontSize: 12 }}>{l.note}</span>}
                      {paid > 0 && (
                        <span style={{ color: C.orange, fontSize: 11, fontWeight: 600, background: C.orange + "15", borderRadius: 5, padding: "1px 7px" }}>
                          -{fmt(paid)} paid
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: remaining === 0 ? C.green : C.red, fontFamily: "monospace", fontWeight: 700 }}>
                        {remaining === 0 ? "✓ Cleared!" : fmt(remaining)}
                      </div>
                      {paid > 0 && <div style={{ color: C.muted, fontSize: 11 }}>original: {fmt(l.value)}</div>}
                    </div>
                    <Btn variant="danger" size="sm" onClick={() => del("liability", l.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
                  </div>
                </div>
                {paid > 0 && (
                  <div>
                    <div style={{ background: C.bg, borderRadius: 6, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${paidPct}%`, height: "100%", background: paidPct >= 100 ? C.green : C.orange, borderRadius: 6, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{paidPct.toFixed(1)}% repaid</div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {pieData.length > 0 && (
        <Card>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Asset Allocation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <ResponsiveContainer width="40%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {pieData.map((d, i) => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: C.chart[i % C.chart.length] }} />
                    <span style={{ color: C.text, fontSize: 14 }}>{d.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ color: C.muted, fontSize: 13 }}>{((d.value / totalAssets) * 100).toFixed(1)}%</span>
                    <span style={{ color: C.green, fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}>{fmt(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "asset" ? "Add Asset" : "Add Liability"}>
        <Input label="Name" placeholder={modal === "asset" ? "e.g. SBI Savings Account" : "e.g. Car Loan"} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {(modal === "asset" ? allAssetCats : allLiabCats).map(c => <option key={c}>{c}</option>)}
        </Select>
        <Input label={modal === "liability" ? "Outstanding Amount (₹)" : "Current Value (₹)"} type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
        {modal === "liability" && <Input label="Interest Rate (% APR, optional)" type="number" placeholder="0" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />}
        <Input label="Note (optional)" placeholder="Additional info" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn onClick={() => add(modal)}>Add {modal === "asset" ? "Asset" : "Liability"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── FUTURE PLANS ─────────────────────────────────────────────────────────────
function Plans({ data, setData }) {
  const [goalModal, setGoalModal] = useState(false);
  const [wishModal, setWishModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ title: "", targetAmount: "", savedAmount: "", deadline: "", priority: "medium", note: "", emoji: "🎯" });
  const [wishForm, setWishForm] = useState({ name: "", amount: "", priority: "medium", note: "", emoji: "🛍️" });
  const [progressForm, setProgressForm] = useState({ savedAmount: "" });
  const [activeTab, setActiveTab] = useState("goals");

  const plans = data.plans || { goals: [], wishlist: [] };
  const updatePlans = (updated) => setData(d => ({ ...d, plans: updated }));

  const GOAL_EMOJIS = ["🎯","🏠","🚗","✈️","💍","📱","💪","🎓","🏦","🌟","🏖️","🎸"];
  const WISH_EMOJIS = ["🛍️","📱","💻","🎮","👟","⌚","📷","🎧","🚲","📚","🎨","✨"];

  const addGoal = () => {
    if (!goalForm.title || !goalForm.targetAmount) return;
    const newGoal = { ...goalForm, id: uid(), targetAmount: parseFloat(goalForm.targetAmount), savedAmount: parseFloat(goalForm.savedAmount) || 0 };
    updatePlans({ ...plans, goals: [...plans.goals, newGoal] });
    setGoalModal(false);
    setGoalForm({ title: "", targetAmount: "", savedAmount: "", deadline: "", priority: "medium", note: "", emoji: "🎯" });
  };

  const delGoal = (id) => updatePlans({ ...plans, goals: plans.goals.filter(g => g.id !== id) });

  const addWish = () => {
    if (!wishForm.name || !wishForm.amount) return;
    const newWish = { ...wishForm, id: uid(), amount: parseFloat(wishForm.amount) };
    updatePlans({ ...plans, wishlist: [...plans.wishlist, newWish] });
    setWishModal(false);
    setWishForm({ name: "", amount: "", priority: "medium", note: "", emoji: "🛍️" });
  };

  const delWish = (id) => updatePlans({ ...plans, wishlist: plans.wishlist.filter(w => w.id !== id) });

  const saveProgress = () => {
    if (!progressForm.savedAmount) return;
    const updated = plans.goals.map(g => g.id === editGoal.id ? { ...g, savedAmount: parseFloat(progressForm.savedAmount) } : g);
    updatePlans({ ...plans, goals: updated });
    setEditGoal(null);
  };

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const totalSaved = plans.goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget = plans.goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const totalWishlist = plans.wishlist.reduce((s, w) => s + w.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Hero Banner ── */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent}20, ${C.purple}20)`, border: `1px solid ${C.accent}30`, borderRadius: 20, padding: "20px 20px 16px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, fontSize: 80, opacity: 0.15, transform: "rotate(15deg)", lineHeight: 1 }}>🚀</div>
        <div style={{ color: C.accent, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Your Financial Dream Board</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          {plans.goals.length === 0 ? "Start building your future today ✨" : `${plans.goals.filter(g => (g.savedAmount / g.targetAmount) >= 1).length} of ${plans.goals.length} goals achieved!`}
        </div>
        {totalTarget > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
              <span>Overall progress</span>
              <span style={{ color: C.accent, fontWeight: 700 }}>{overallPct.toFixed(0)}% — {fmt(totalSaved)} of {fmt(totalTarget)}</span>
            </div>
            <div style={{ background: C.bg, borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${overallPct}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: "flex", background: C.surface, borderRadius: 14, padding: 4, gap: 4 }}>
        {[
          { id: "goals", label: "🎯 Goals", count: plans.goals.length },
          { id: "wishlist", label: "✨ Wishlist", count: plans.wishlist.length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "10px 8px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, transition: "all 0.2s", background: activeTab === t.id ? C.accent : "transparent", color: activeTab === t.id ? "#0A0E1A" : C.muted }}>
            {t.label} {t.count > 0 && <span style={{ background: activeTab === t.id ? "#0A0E1A30" : C.border, borderRadius: 99, padding: "0px 7px", fontSize: 11 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── GOALS TAB ── */}
      {activeTab === "goals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: C.muted, fontSize: 13 }}>{plans.goals.length === 0 ? "No goals yet" : `${plans.goals.length} goal${plans.goals.length > 1 ? "s" : ""}`}</div>
            <Btn onClick={() => setGoalModal(true)} size="sm"><Icon name="plus" size={14} color="#0A0E1A" /> New Goal</Btn>
          </div>

          {plans.goals.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", background: C.card, borderRadius: 16, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎯</div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Set your first goal</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>Emergency fund, new bike, vacation — whatever matters to you. Track it here.</div>
              <Btn onClick={() => setGoalModal(true)}><Icon name="plus" size={15} color="#0A0E1A" /> Add Goal</Btn>
            </div>
          )}

          {plans.goals.map(g => {
            const pct = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
            const days = daysLeft(g.deadline);
            const isComplete = pct >= 100;
            const priorityColor = PRIORITY_COLORS[g.priority];
            const barColor = isComplete ? C.green : pct > 60 ? C.accent : pct > 30 ? C.yellow : C.red;

            return (
              <Card key={g.id} glow={isComplete ? C.green : undefined} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{g.emoji || "🎯"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ color: C.text, fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{g.title}</div>
                      {isComplete && <span style={{ background: C.green + "20", color: C.green, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓ Done!</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      <span style={{ background: priorityColor + "15", color: priorityColor, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{g.priority}</span>
                      {days !== null && (
                        <span style={{ background: (days < 30 ? C.red : days < 90 ? C.yellow : C.muted) + "15", color: days < 30 ? C.red : days < 90 ? C.yellow : C.muted, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                          {days > 0 ? `${days}d left` : "Overdue"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ color: barColor, fontFamily: "monospace", fontWeight: 800, fontSize: 20 }}>{fmt(g.savedAmount)}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>saved of {fmt(g.targetAmount)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>{pct.toFixed(0)}%</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{fmt(Math.max(g.targetAmount - g.savedAmount, 0))} left</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: C.bg, borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`, borderRadius: 99, transition: "width 0.8s ease" }} />
                </div>

                {g.note && <div style={{ color: C.muted, fontSize: 12, fontStyle: "italic" }}>"{g.note}"</div>}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditGoal(g); setProgressForm({ savedAmount: String(g.savedAmount) }); }}
                    style={{ flex: 1, padding: "10px", background: C.accent + "15", border: `1px solid ${C.accent}30`, borderRadius: 10, color: C.accent, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    💰 Update Progress
                  </button>
                  <button onClick={() => delGoal(g.id)} style={{ padding: "10px 14px", background: C.red + "10", border: `1px solid ${C.red}20`, borderRadius: 10, color: C.red, cursor: "pointer" }}>
                    <Icon name="trash" size={15} color={C.red} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── WISHLIST TAB ── */}
      {activeTab === "wishlist" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: C.muted, fontSize: 13 }}>
              {plans.wishlist.length === 0 ? "Nothing yet" : `Total: ${fmt(totalWishlist)}`}
            </div>
            <Btn variant="purple" size="sm" onClick={() => setWishModal(true)}><Icon name="plus" size={14} color={C.purple} /> Add Item</Btn>
          </div>

          {plans.wishlist.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", background: C.card, borderRadius: 16, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>✨</div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Your wishlist is empty</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>Things you want to buy someday — phone, laptop, trip. Put it here so you can plan for it.</div>
              <Btn variant="purple" onClick={() => setWishModal(true)}><Icon name="plus" size={15} color={C.purple} /> Add Item</Btn>
            </div>
          )}

          {[...plans.wishlist].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).map(w => {
            const pc = PRIORITY_COLORS[w.priority];
            return (
              <Card key={w.id} style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>{w.emoji || "🛍️"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{w.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ background: pc + "15", color: pc, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{w.priority}</span>
                    {w.note && <span style={{ color: C.muted, fontSize: 12 }}>{w.note}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <div style={{ color: C.purple, fontFamily: "monospace", fontWeight: 800, fontSize: 16 }}>{fmt(w.amount)}</div>
                  <button onClick={() => delWish(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0 }}>
                    <Icon name="trash" size={14} color={C.muted} />
                  </button>
                </div>
              </Card>
            );
          })}

          {plans.wishlist.length > 0 && (
            <div style={{ background: C.surface, borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Total to save for wishlist</span>
              <span style={{ color: C.purple, fontFamily: "monospace", fontWeight: 800, fontSize: 18 }}>{fmt(totalWishlist)}</span>
            </div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={goalModal} onClose={() => setGoalModal(false)} title="New Goal 🎯">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {GOAL_EMOJIS.map(e => (
            <button key={e} onClick={() => setGoalForm(f => ({ ...f, emoji: e }))} style={{ fontSize: 22, padding: "6px 8px", borderRadius: 10, border: `2px solid ${goalForm.emoji === e ? C.accent : "transparent"}`, background: goalForm.emoji === e ? C.accent + "20" : C.bg, cursor: "pointer" }}>{e}</button>
          ))}
        </div>
        <Input label="Goal Title" placeholder="e.g. Buy a Bike, Emergency Fund" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
        <Input label="Target Amount (₹)" type="number" placeholder="100000" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} />
        <Input label="Already Saved (₹)" type="number" placeholder="0" value={goalForm.savedAmount} onChange={e => setGoalForm(f => ({ ...f, savedAmount: e.target.value }))} />
        <Input label="Deadline" type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
        <Select label="Priority" value={goalForm.priority} onChange={e => setGoalForm(f => ({ ...f, priority: e.target.value }))}>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </Select>
        <Input label="Note (optional)" placeholder="Why is this important to you?" value={goalForm.note} onChange={e => setGoalForm(f => ({ ...f, note: e.target.value }))} />
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setGoalModal(false)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={addGoal} style={{ flex: 2 }}>Add Goal</Btn>
        </div>
      </Modal>

      {/* Add Wishlist Modal */}
      <Modal open={wishModal} onClose={() => setWishModal(false)} title="Add to Wishlist ✨">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {WISH_EMOJIS.map(e => (
            <button key={e} onClick={() => setWishForm(f => ({ ...f, emoji: e }))} style={{ fontSize: 22, padding: "6px 8px", borderRadius: 10, border: `2px solid ${wishForm.emoji === e ? C.purple : "transparent"}`, background: wishForm.emoji === e ? C.purple + "20" : C.bg, cursor: "pointer" }}>{e}</button>
          ))}
        </div>
        <Input label="Item Name" placeholder="e.g. iPhone 16, MacBook" value={wishForm.name} onChange={e => setWishForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Estimated Cost (₹)" type="number" placeholder="0" value={wishForm.amount} onChange={e => setWishForm(f => ({ ...f, amount: e.target.value }))} />
        <Select label="Priority" value={wishForm.priority} onChange={e => setWishForm(f => ({ ...f, priority: e.target.value }))}>
          <option value="high">🔴 Need it soon</option>
          <option value="medium">🟡 Would be nice</option>
          <option value="low">🟢 Someday maybe</option>
        </Select>
        <Input label="Note (optional)" placeholder="Why do you want this?" value={wishForm.note} onChange={e => setWishForm(f => ({ ...f, note: e.target.value }))} />
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setWishModal(false)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={addWish} style={{ flex: 2 }}>Add Item</Btn>
        </div>
      </Modal>

      {/* Update Progress Modal */}
      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title={editGoal ? `Update: ${editGoal.title}` : ""}>
        {editGoal && (
          <>
            <div style={{ textAlign: "center", fontSize: 48, marginBottom: 8 }}>{editGoal.emoji || "🎯"}</div>
            <div style={{ background: C.bg, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Target</div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 22, fontFamily: "monospace" }}>{fmt(editGoal.targetAmount)}</div>
            </div>
            <Input label="Amount Saved So Far (₹)" type="number" value={progressForm.savedAmount} onChange={e => setProgressForm({ savedAmount: e.target.value })} />
            {progressForm.savedAmount && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 6 }}>
                  <span>Progress</span>
                  <span style={{ color: C.accent, fontWeight: 700 }}>{((parseFloat(progressForm.savedAmount) / editGoal.targetAmount) * 100).toFixed(1)}%</span>
                </div>
                <div style={{ background: C.bg, borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min((parseFloat(progressForm.savedAmount) / editGoal.targetAmount) * 100, 100)}%`, height: "100%", background: C.accent, borderRadius: 99 }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setEditGoal(null)} style={{ flex: 1 }}>Cancel</Btn>
              <Btn onClick={saveProgress} style={{ flex: 2 }}>Save Progress</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("demo@example.com");
  const [pw, setPw] = useState("demo123");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pw);
      const user = result.user;
      onLogin({ email: user.email, name: user.displayName || email, avatar: (user.displayName || email).slice(0,2).toUpperCase(), uid: user.uid });
    } catch (e) {
      setError("Invalid email or password.");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pw);
      const user = result.user;
      onLogin({ email: user.email, name: name || email, avatar: (name || email).slice(0,2).toUpperCase(), uid: user.uid });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onLogin({ email: user.email, name: user.displayName, avatar: user.displayName.slice(0,2).toUpperCase(), uid: user.uid });
    } catch (e) {
      setError("Google sign-in failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Sora', sans-serif" }}>
      <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, background: `radial-gradient(circle, ${C.accent}15, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -200, left: -200, width: 500, height: 500, background: `radial-gradient(circle, ${C.purple}10, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 40, width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -1 }}>FinanceOS</div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Your personal finance command center</div>
        </div>

        <div style={{ display: "flex", background: C.bg, borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {["login", "signup"].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit", transition: "all 0.2s", background: tab === t ? C.accent : "transparent", color: tab === t ? C.bg : C.muted }}>
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <button onClick={handleGoogle}
          style={{ width: "100%", padding: "12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20, fontFamily: "inherit", transition: "border-color 0.2s" }}
          onMouseOver={e => e.target.style.borderColor = C.accent}
          onMouseOut={e => e.target.style.borderColor = C.border}>
          <Icon name="google" size={20} />
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.muted, fontSize: 13 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {tab === "signup" && (
          <Input label="Full Name" placeholder="Alex Johnson" value={name} onChange={e => setName(e.target.value)} />
        )}
        <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <div style={{ position: "relative" }}>
          <Input label="Password" type={showPw ? "text" : "password"} placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} />
          <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: 34, background: "none", border: "none", cursor: "pointer", color: C.muted }}>
            <Icon name={showPw ? "eyeoff" : "eye"} size={16} />
          </button>
        </div>

        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16, background: C.red + "10", padding: "10px 14px", borderRadius: 8 }}>{error}</div>}

        <button onClick={tab === "login" ? handleLogin : handleSignup}
          style={{ width: "100%", padding: "14px", background: loading ? C.accentDim : C.accent, border: "none", borderRadius: 12, color: C.bg, fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
          {loading ? "⏳ Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, color: C.muted, fontSize: 13 }}>
          Try the demo: <span style={{ color: C.accent, cursor: "pointer" }} onClick={() => { setEmail("demo@example.com"); setPw("demo123"); }}>demo@example.com / demo123</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email,
          avatar: (firebaseUser.displayName || firebaseUser.email).slice(0, 2).toUpperCase(),
          uid: firebaseUser.uid,
        });
      } else {
        setUser(null);
        setData(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    setDataLoading(true);
    const load = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const loaded = snap.data();
          // Migrate: ensure new keys exist for existing users
          if (!loaded.plans) loaded.plans = { goals: [], wishlist: [] };
          if (!loaded.autopayments) loaded.autopayments = [];
          // Migrate: give existing autopayments a createdAt of today so they don't backfill
          loaded.autopayments = loaded.autopayments.map(ap =>
            ap.createdAt ? ap : { ...ap, createdAt: toYMD(new Date()) }
          );
          if (loaded.masterAdjustment === undefined) loaded.masterAdjustment = 0;
          if (!loaded.autopaymentLog) loaded.autopaymentLog = [];
          if (!loaded.customCategories) loaded.customCategories = { expense: [], income: [], asset: [], liability: [] };
          setData(loaded);
        } else {
          const fresh = initState();
          await setDoc(ref, fresh);
          setData(fresh);
        }
      } catch (e) {
        console.error("Failed to load data:", e);
        setData(initState());
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !data) return;
    const ref = doc(db, "users", user.uid);
    const timer = setTimeout(() => {
      setDoc(ref, data).catch((e) => console.error("Save failed:", e));
    }, 800);
    return () => clearTimeout(timer);
  }, [data, user?.uid]);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setData(null);
  };

  if (!user) return <LoginPage onLogin={setUser} />;

  if (dataLoading || !data) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 40 }}>💰</div>
        <div style={{ color: C.accent, fontSize: 18, fontWeight: 700 }}>Loading your finances...</div>
        <div style={{ color: C.muted, fontSize: 13 }}>Fetching your data securely</div>
      </div>
    );
  }

  // Close sidebar when tab changes on mobile
  const handleTabChange = (id) => { setTab(id); setSidebarOpen(false); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora', 'DM Sans', sans-serif", display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2D42; border-radius: 4px; }
      `}</style>

      {/* Background orbs */}
      <Orb color={C.accent} size={500} top={-100} left={-100} opacity={0.07} />
      <Orb color={C.purple} size={400} bottom={-100} right={-100} opacity={0.07} />
      <Orb color={C.green} size={300} top="40%" left="40%" opacity={0.04} />

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile && (
        <div style={{ width: 240, background: C.surface, position: "relative", zIndex: 2,, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "24px 16px", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 10 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>💰 FinanceOS</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Personal Finance Tracker</div>
          </div>
          <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 14, transition: "all 0.15s", background: tab === t.id ? C.accent + "20" : "transparent", color: tab === t.id ? C.accent : C.muted, borderLeft: tab === t.id ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                <Icon name={t.icon} size={18} color={tab === t.id ? C.accent : C.muted} />
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 14 }}>
                {user.avatar}
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{user.email}</div>
              </div>
            </div>
            <button onClick={handleSignOut} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
              <Icon name="logout" size={15} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE TOP BAR ── */}
      {isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>💰 FinanceOS</div>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", color: C.text, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>
      )}

      {/* ── MOBILE SLIDE-DOWN MENU ── */}
      {isMobile && sidebarOpen && (
        <>
          {/* backdrop */}
          <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 40 }} />
          <div style={{ position: "fixed", top: 57, left: 0, right: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 45, padding: "8px 12px 16px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => handleTabChange(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 15, marginBottom: 4, background: tab === t.id ? C.accent + "20" : "transparent", color: tab === t.id ? C.accent : C.muted }}>
                <Icon name={t.icon} size={20} color={tab === t.id ? C.accent : C.muted} />
                {t.label}
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 13 }}>{user.avatar}</div>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{user.email}</div>
                </div>
              </div>
              <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                <Icon name="logout" size={14} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "6px 0 calc(6px + env(safe-area-inset-bottom))" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", border: "none", background: "transparent", cursor: "pointer", color: tab === t.id ? C.accent : C.muted, fontFamily: "inherit", transition: "all 0.15s" }}>
              <div style={{ padding: "4px 12px", borderRadius: 10, background: tab === t.id ? C.accent + "20" : "transparent", transition: "all 0.15s" }}>
                <Icon name={t.icon} size={20} color={tab === t.id ? C.accent : C.muted} />
              </div>
              <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ position: "relative", zIndex: 1,
        marginLeft: isMobile ? 0 : 240,
        flex: 1,
        padding: isMobile ? "72px 14px 90px" : 32,
        minHeight: "100vh",
        overflowY: "auto",
        width: "100%",
      }}>
        {tab === "dashboard" && <Dashboard data={data} setData={setData} />}
        {tab === "transactions" && <Transactions data={data} setData={setData} />}
        {tab === "budget" && <Budget data={data} setData={setData} />}
        {tab === "assets" && <Assets data={data} setData={setData} />}
        {tab === "plans" && <Plans data={data} setData={setData} />}
      </main>
    </div>
  );
}
