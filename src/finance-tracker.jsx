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
// ─── MOCK AUTH (replace with Firebase in production) ──────────────────────────

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
  text: "#E2E8F0",
  muted: "#64748B",
  chart: ["#3ECFCF","#22D3A0","#A78BFA","#FBBF24","#F87171","#60A5FA","#FB923C"],
};

// ─── UTILITY ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const uid = () => Math.random().toString(36).slice(2, 9);

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
});

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    wallet: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/></svg>,
    budget: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    assets: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
    plus: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
    trash: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
    trend_up: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M22 7l-9 9-4-4L2 17"/><path d="M16 7h6v6"/></svg>,
    trend_down: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24"><path d="M22 17l-9-9-4 4L2 7"/><path d="M16 17h6v-6"/></svg>,
    google: <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
    logout: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>,
    eye: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeoff: <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    star: <svg width={size} height={size} fill={color} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  };
  return icons[name] || null;
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, className = "" }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, ...style }}>
    {children}
  </div>
);

const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "20", color, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
    {children}
  </span>
);

const StatCard = ({ label, value, icon, color, change }) => (
  <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ background: color + "20", borderRadius: 10, padding: 10, display: "flex" }}>
        <Icon name={icon} color={color} size={20} />
      </div>
      {change !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: change >= 0 ? C.green : C.red, fontSize: 13 }}>
          <Icon name={change >= 0 ? "trend_up" : "trend_down"} size={14} color={change >= 0 ? C.green : C.red} />
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.text, fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  </Card>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
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
];

const EXPENSE_CATS = ["Food", "Transport", "Rent", "Entertainment", "Utilities", "Shopping", "Health", "Education", "Other"];
const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];
const ASSET_CATS = ["Cash", "Investment", "Property", "Vehicle", "Other"];
const LIABILITY_CATS = ["Loan", "Credit Card", "Mortgage", "Other"];

// ─── PAGES ────────────────────────────────────────────────────────────────────
function Dashboard({ data }) {
  const totalIncome = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = totalIncome - totalExpense;
  const totalAssets = data.assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((s, l) => s + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const expByCategory = EXPENSE_CATS.map(cat => ({
    name: cat,
    value: data.transactions.filter(t => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0)
  })).filter(d => d.value > 0);

  const monthlyFlow = [
    { month: "Oct", income: 40000, expense: 28000 },
    { month: "Nov", income: 43000, expense: 31000 },
    { month: "Dec", income: 45000, expense: 35000 },
    { month: "Jan", income: 45000, expense: 29000 },
    { month: "Feb", income: totalIncome, expense: totalExpense },
  ];

  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="Monthly Income" value={fmt(totalIncome)} icon="trend_up" color={C.green} change={5.2} />
        <StatCard label="Monthly Expenses" value={fmt(totalExpense)} icon="trend_down" color={C.red} change={-3.1} />
        <StatCard label="Savings" value={fmt(savings)} icon="wallet" color={C.accent} />
        <StatCard label="Net Worth" value={fmt(netWorth)} icon="assets" color={C.purple} change={2.4} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Income vs Expenses</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyFlow}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" stroke={C.muted} tick={{ fontSize: 12 }} />
              <YAxis stroke={C.muted} tick={{ fontSize: 12 }} tickFormatter={v => `₹${v / 1000}k`} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={v => fmt(v)} />
              <Area type="monotone" dataKey="income" stroke={C.green} fill="url(#gIncome)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expense" stroke={C.red} fill="url(#gExpense)" strokeWidth={2} name="Expenses" />
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

      {/* Quick Tips */}
      <Card>
        <div style={{ color: C.text, fontWeight: 700, marginBottom: 16, fontSize: 16 }}>💡 Finance Insights</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { tip: `Your largest expense is Rent at ${fmt(data.transactions.filter(t => t.category === "Rent").reduce((s,t) => s+t.amount,0))}`, color: C.yellow },
            { tip: `High-interest debt! Credit card at 36% APR — pay it first.`, color: C.red },
            { tip: `Emergency fund target: ${fmt(totalExpense * 6)} (6 months expenses)`, color: C.accent },
            { tip: `You're saving ${savingsRate}% — great progress toward financial freedom!`, color: C.green },
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

function Transactions({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: "expense", category: "", amount: "", date: new Date().toISOString().split("T")[0], note: "" });

  const addTx = () => {
    if (!form.category || !form.amount || !form.date) return;
    setData(d => ({ ...d, transactions: [{ ...form, id: uid(), amount: parseFloat(form.amount) }, ...d.transactions] }));
    setModal(false);
    setForm({ type: "expense", category: "", amount: "", date: new Date().toISOString().split("T")[0], note: "" });
  };

  const delTx = (id) => setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== id) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 700 }}>Transactions</h2>
        <Btn onClick={() => setModal(true)}><Icon name="plus" size={16} color="#0A0E1A" /> Add Transaction</Btn>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Date", "Category", "Type", "Note", "Amount", ""].map(h => (
                <th key={h} style={{ padding: "14px 20px", color: C.muted, fontSize: 12, textAlign: "left", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.transactions.sort((a, b) => b.date.localeCompare(a.date)).map((tx, i) => (
              <tr key={tx.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "14px 20px", color: C.muted, fontSize: 13 }}>{tx.date}</td>
                <td style={{ padding: "14px 20px" }}><Badge color={tx.type === "income" ? C.green : C.red}>{tx.category}</Badge></td>
                <td style={{ padding: "14px 20px", color: tx.type === "income" ? C.green : C.red, fontSize: 13, textTransform: "capitalize" }}>{tx.type}</td>
                <td style={{ padding: "14px 20px", color: C.muted, fontSize: 13 }}>{tx.note}</td>
                <td style={{ padding: "14px 20px", color: tx.type === "income" ? C.green : C.red, fontFamily: "monospace", fontWeight: 700 }}>
                  {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <Btn variant="danger" size="sm" onClick={() => delTx(tx.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Transaction">
        <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: "" }))}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>
        <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">Select category</option>
          {(form.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c}>{c}</option>)}
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

function Budget({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: "", limit: "" });

  const getSpent = (cat) => data.transactions.filter(t => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0);

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
                <Badge color={statusColor}>{status === "over" ? "Over Budget!" : status === "warn" ? "Near Limit" : "On Track"}</Badge>
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

      {/* Budget vs Actual Bar Chart */}
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

function Assets({ data, setData }) {
  const [modal, setModal] = useState(null); // "asset" | "liability"
  const [form, setForm] = useState({ name: "", category: "", value: "", rate: "", note: "" });

  const totalAssets = data.assets.reduce((s, a) => s + a.value, 0);
  const totalLiab = data.liabilities.reduce((s, l) => s + l.value, 0);
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

  const pieData = [
    ...data.assets.map(a => ({ name: a.name, value: a.value, type: "asset" })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Net Worth Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <StatCard label="Total Assets" value={fmt(totalAssets)} icon="trend_up" color={C.green} />
        <StatCard label="Total Liabilities" value={fmt(totalLiab)} icon="trend_down" color={C.red} />
        <StatCard label="Net Worth" value={fmt(netWorth)} icon="star" color={netWorth >= 0 ? C.accent : C.red} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Assets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: C.green, margin: 0, fontSize: 16 }}>Assets</h3>
            <Btn size="sm" onClick={() => { setForm({ name: "", category: ASSET_CATS[0], value: "", rate: "", note: "" }); setModal("asset"); }}>
              <Icon name="plus" size={14} color="#0A0E1A" /> Add
            </Btn>
          </div>
          {data.assets.map(a => (
            <Card key={a.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge color={C.green}>{a.category}</Badge>
                  {a.note && <span style={{ color: C.muted, fontSize: 12 }}>{a.note}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: C.green, fontFamily: "monospace", fontWeight: 700 }}>{fmt(a.value)}</span>
                <Btn variant="danger" size="sm" onClick={() => del("asset", a.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
              </div>
            </Card>
          ))}
        </div>

        {/* Liabilities */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: C.red, margin: 0, fontSize: 16 }}>Liabilities</h3>
            <Btn size="sm" onClick={() => { setForm({ name: "", category: LIABILITY_CATS[0], value: "", rate: "", note: "" }); setModal("liability"); }}>
              <Icon name="plus" size={14} color="#0A0E1A" /> Add
            </Btn>
          </div>
          {data.liabilities.map(l => (
            <Card key={l.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{l.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge color={C.red}>{l.category}</Badge>
                  {l.rate > 0 && <span style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>{l.rate}% APR</span>}
                  {l.note && <span style={{ color: C.muted, fontSize: 12 }}>{l.note}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: C.red, fontFamily: "monospace", fontWeight: 700 }}>{fmt(l.value)}</span>
                <Btn variant="danger" size="sm" onClick={() => del("liability", l.id)}><Icon name="trash" size={13} color={C.red} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Asset allocation chart */}
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
          {(modal === "asset" ? ASSET_CATS : LIABILITY_CATS).map(c => <option key={c}>{c}</option>)}
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
      {/* Background decoration */}
      <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, background: `radial-gradient(circle, ${C.accent}15, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -200, left: -200, width: 500, height: 500, background: `radial-gradient(circle, ${C.purple}10, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 40, width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -1 }}>FinanceOS</div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Your personal finance command center</div>
        </div>

        {/* Tab Switch */}
        <div style={{ display: "flex", background: C.bg, borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {["login", "signup"].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit", transition: "all 0.2s", background: tab === t ? C.accent : "transparent", color: tab === t ? C.bg : C.muted }}>
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Google Button */}
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
  const [data, setData] = useState(null); // null = still loading
  const [dataLoading, setDataLoading] = useState(false);

  // ── 1. Listen to Firebase auth state (handles page refresh too) ──
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
    return () => unsub(); // cleanup on unmount
  }, []);

  // ── 2. Load this user's data from Firestore when they log in ──
  useEffect(() => {
    if (!user?.uid) return;
    setDataLoading(true);
    const load = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setData(snap.data());
        } else {
          // First-time user → seed with demo data
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

  // ── 3. Auto-save to Firestore whenever data changes ──
  useEffect(() => {
    if (!user?.uid || !data) return;
    const ref = doc(db, "users", user.uid);
    // debounce: wait 800ms after last change before saving
    const timer = setTimeout(() => {
      setDoc(ref, data).catch((e) => console.error("Save failed:", e));
    }, 800);
    return () => clearTimeout(timer); // cancel if data changes again quickly
  }, [data, user?.uid]);

  // ── 4. Sign out handler ──
  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setData(null);
  };

  // ── 5. Show login if not logged in ──
  if (!user) return <LoginPage onLogin={setUser} />;

  // ── 6. Show loading spinner while fetching Firestore data ──
  if (dataLoading || !data) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 40 }}>💰</div>
        <div style={{ color: C.accent, fontSize: 18, fontWeight: 700 }}>Loading your finances...</div>
        <div style={{ color: C.muted, fontSize: 13 }}>Fetching your data securely</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora', 'DM Sans', sans-serif", display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <div style={{ width: 240, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "24px 16px", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 10 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>💰 FinanceOS</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Personal Finance Tracker</div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontWeight: 600, fontSize: 14, transition: "all 0.15s",
                background: tab === t.id ? C.accent + "20" : "transparent",
                color: tab === t.id ? C.accent : C.muted,
                borderLeft: tab === t.id ? `3px solid ${C.accent}` : "3px solid transparent"
              }}>
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
          {/* ── Sign Out now calls Firebase signOut ── */}
          <button
            onClick={handleSignOut}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            <Icon name="logout" size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ marginLeft: 240, flex: 1, padding: 32, minHeight: "100vh", overflowY: "auto" }}>
        {tab === "dashboard" && <Dashboard data={data} />}
        {tab === "transactions" && <Transactions data={data} setData={setData} />}
        {tab === "budget" && <Budget data={data} setData={setData} />}
        {tab === "assets" && <Assets data={data} setData={setData} />}
      </main>
    </div>
  );
}
