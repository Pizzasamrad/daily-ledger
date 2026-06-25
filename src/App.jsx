import React, { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "./storage.js";

const STORAGE_KEYS = {
  entries: "ledger:entries",
  weights: "ledger:weights",
  goals: "ledger:goals",
};

const todayStr = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const fmtDateLabel = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const uid = () => Math.random().toString(36).slice(2, 10);

const round = (n, d = 0) => {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
};

async function loadAll() {
  const [e, w, g] = await Promise.all([
    storage.get(STORAGE_KEYS.entries).catch(() => null),
    storage.get(STORAGE_KEYS.weights).catch(() => null),
    storage.get(STORAGE_KEYS.goals).catch(() => null),
  ]);
  return {
    entries: e ? JSON.parse(e.value) : [],
    weights: w ? JSON.parse(w.value) : [],
    goals: g ? JSON.parse(g.value) : { calories: 2200, protein: 160, carbs: 220 },
  };
}

async function saveEntries(entries) {
  await storage.set(STORAGE_KEYS.entries, JSON.stringify(entries));
}
async function saveWeights(weights) {
  await storage.set(STORAGE_KEYS.weights, JSON.stringify(weights));
}
async function saveGoals(goals) {
  await storage.set(STORAGE_KEYS.goals, JSON.stringify(goals));
}

function IconLeaf({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z" />
      <path d="M5 19c0-5 3-9 7-11" />
    </svg>
  );
}

function Bar({ value, goal, color, label, unit }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "#7A7468" }}>
          {label}
        </span>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#2B2823" }}>
          <strong style={{ fontWeight: 600 }}>{round(value)}</strong>
          <span style={{ color: "#9C9484" }}> / {round(goal)}{unit}</span>
        </span>
      </div>
      <div style={{ height: 8, background: "#EDE7D9", borderRadius: 2, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: over ? "#B5523A" : color,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function MealRow({ entry, onDelete }) {
  return (
    <tr style={{ borderBottom: "0.5px solid #E3DDD0" }}>
      <td style={{ padding: "9px 6px", fontSize: 14, color: "#2B2823" }}>{entry.meal}</td>
      <td style={{ padding: "9px 6px", fontSize: 14, color: "#5D7290", textAlign: "right" }}>{entry.name || "—"}</td>
      <td style={{ padding: "9px 6px", fontSize: 14, textAlign: "right", fontFamily: "Georgia, serif" }}>{round(entry.calories)}</td>
      <td style={{ padding: "9px 6px", fontSize: 14, textAlign: "right", fontFamily: "Georgia, serif", color: "#74835F" }}>{round(entry.protein)}g</td>
      <td style={{ padding: "9px 6px", fontSize: 14, textAlign: "right", fontFamily: "Georgia, serif", color: "#5D7290" }}>{round(entry.carbs)}g</td>
      <td style={{ padding: "9px 6px", textAlign: "right" }}>
        <button
          onClick={() => onDelete(entry.id)}
          aria-label="Delete entry"
          style={{
            border: "none",
            background: "none",
            color: "#B5523A",
            cursor: "pointer",
            fontSize: 13,
            padding: "2px 6px",
          }}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function Sparkline({ points, color, height = 56, padding = 4 }) {
  if (points.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", color: "#9C9484", fontSize: 12.5 }}>
        Not enough data yet
      </div>
    );
  }
  const w = 600;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const stepX = (w - padding * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = padding + (1 - (p.v - min) / range) * (height - padding * 2);
    return [x, y];
  });
  const path = coords.map((c, i) => (i === 0 ? `M${c[0]},${c[1]}` : `L${c[0]},${c[1]}`)).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

function BarChartRow({ days, dataKey, goal, color, maxOverride }) {
  const vals = days.map((d) => d.totals[dataKey]);
  const max = maxOverride || Math.max(goal * 1.15, ...vals, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110 }}>
      {days.map((d, i) => {
        const v = d.totals[dataKey];
        const h = Math.max(2, (v / max) * 100);
        const over = goal > 0 && v > goal;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: 100, display: "flex", alignItems: "flex-end" }}>
              <div
                title={`${fmtDateLabel(d.date)}: ${round(v)}`}
                style={{
                  width: "100%",
                  height: `${h}%`,
                  background: over ? "#B5523A" : color,
                  borderRadius: "2px 2px 0 0",
                  minHeight: 2,
                }}
              />
            </div>
            <span style={{ fontSize: 10.5, color: "#9C9484" }}>{fmtDateLabel(d.date).split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [weights, setWeights] = useState([]);
  const [goals, setGoals] = useState({ calories: 2200, protein: 160, carbs: 220 });
  const [view, setView] = useState("today"); // today | log | weight | trends | goals
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const [form, setForm] = useState({ meal: "Breakfast", name: "", calories: "", protein: "", carbs: "" });
  const [weightForm, setWeightForm] = useState({ value: "" });
  const [goalForm, setGoalForm] = useState(goals);
  const [trendRange, setTrendRange] = useState(14);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    let mounted = true;
    loadAll().then((data) => {
      if (!mounted) return;
      setEntries(data.entries);
      setWeights(data.weights);
      setGoals(data.goals);
      setGoalForm(data.goals);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const addEntry = async () => {
    const cal = parseFloat(form.calories);
    const pro = parseFloat(form.protein);
    const carb = parseFloat(form.carbs);
    if (isNaN(cal) && isNaN(pro) && isNaN(carb)) {
      showToast("Add at least one number");
      return;
    }
    const entry = {
      id: uid(),
      date: selectedDate,
      meal: form.meal,
      name: form.name.trim(),
      calories: isNaN(cal) ? 0 : cal,
      protein: isNaN(pro) ? 0 : pro,
      carbs: isNaN(carb) ? 0 : carb,
      createdAt: Date.now(),
    };
    const next = [...entries, entry];
    setEntries(next);
    setForm({ meal: form.meal, name: "", calories: "", protein: "", carbs: "" });
    try {
      await saveEntries(next);
      showToast("Logged");
    } catch (e) {
      showToast("Save failed — try again");
    }
  };

  const deleteEntry = async (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    try {
      await saveEntries(next);
    } catch (e) {
      showToast("Delete failed");
    }
  };

  const addWeight = async () => {
    const v = parseFloat(weightForm.value);
    if (isNaN(v) || v <= 0) {
      showToast("Enter a valid weight");
      return;
    }
    const existingIdx = weights.findIndex((w) => w.date === selectedDate);
    let next;
    if (existingIdx >= 0) {
      next = [...weights];
      next[existingIdx] = { ...next[existingIdx], value: v };
    } else {
      next = [...weights, { id: uid(), date: selectedDate, value: v }];
    }
    next.sort((a, b) => a.date.localeCompare(b.date));
    setWeights(next);
    setWeightForm({ value: "" });
    try {
      await saveWeights(next);
      showToast("Weight saved");
    } catch (e) {
      showToast("Save failed — try again");
    }
  };

  const deleteWeight = async (id) => {
    const next = weights.filter((w) => w.id !== id);
    setWeights(next);
    try {
      await saveWeights(next);
    } catch (e) {
      showToast("Delete failed");
    }
  };

  const saveGoalForm = async () => {
    const g = {
      calories: parseFloat(goalForm.calories) || 0,
      protein: parseFloat(goalForm.protein) || 0,
      carbs: parseFloat(goalForm.carbs) || 0,
    };
    setGoals(g);
    try {
      await saveGoals(g);
      showToast("Targets updated");
    } catch (e) {
      showToast("Save failed — try again");
    }
  };

  const entriesByDate = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [entries]);

  const totalsFor = (date) => {
    const list = entriesByDate[date] || [];
    return list.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories || 0),
        protein: acc.protein + (e.protein || 0),
        carbs: acc.carbs + (e.carbs || 0),
      }),
      { calories: 0, protein: 0, carbs: 0 }
    );
  };

  const todayTotals = totalsFor(selectedDate);

  const sortedDates = useMemo(() => {
    return Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));
  }, [entriesByDate]);

  const trendDays = useMemo(() => {
    const days = [];
    const today = new Date(todayStr() + "T00:00:00");
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, totals: totalsFor(iso) });
    }
    return days;
  }, [entriesByDate, trendRange]);

  const weightSorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const weightSpark = weightSorted.map((w) => ({ v: w.value, date: w.date }));
  const latestWeight = weightSorted[weightSorted.length - 1];
  const firstWeightInRange = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - trendRange);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return weightSorted.find((w) => w.date >= cutoffIso);
  }, [weightSorted, trendRange]);
  const weightDelta =
    latestWeight && firstWeightInRange ? round(latestWeight.value - firstWeightInRange.value, 1) : null;

  const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];

  const navItems = [
    { id: "today", label: "Today" },
    { id: "log", label: "Log" },
    { id: "weight", label: "Weight" },
    { id: "trends", label: "Trends" },
    { id: "goals", label: "Targets" },
  ];

  if (loading) {
    return (
      <div style={{ ...shell, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <span style={{ color: "#9C9484", fontSize: 14 }}>Opening ledger…</span>
      </div>
    );
  }

  return (
    <div style={shell}>
      <style>{`
        * { box-sizing: border-box; }
        input, select { font-family: inherit; }
        input:focus, select:focus, button:focus-visible {
          outline: 2px solid #A67C3D;
          outline-offset: 1px;
        }
        button { font-family: inherit; }
        @media (max-width: 640px) {
          .ledger-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <header style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconLeaf size={20} color="#74835F" />
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 23, fontWeight: 400, color: "#2B2823", margin: 0, letterSpacing: "0.01em" }}>
              The Daily Ledger
            </h1>
          </div>
          <input
            type="date"
            value={selectedDate}
            max={todayStr()}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        <nav style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "0.5px solid #E3DDD0", flexWrap: "wrap" }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "8px 14px",
                fontSize: 13.5,
                letterSpacing: "0.02em",
                color: view === item.id ? "#2B2823" : "#9C9484",
                borderBottom: view === item.id ? "2px solid #A67C3D" : "2px solid transparent",
                marginBottom: -1,
                transition: "color 0.15s",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {view === "today" && (
        <section className="ledger-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 22 }}>
          <div style={card}>
            <h2 style={cardTitle}>{selectedDate === todayStr() ? "Today" : fmtDateLabel(selectedDate)}</h2>
            <Bar value={todayTotals.calories} goal={goals.calories} color="#C1693F" label="Calories" unit="" />
            <Bar value={todayTotals.protein} goal={goals.protein} color="#74835F" label="Protein" unit="g" />
            <Bar value={todayTotals.carbs} goal={goals.carbs} color="#5D7290" label="Carbs" unit="g" />
            <p style={{ fontSize: 12, color: "#9C9484", marginTop: 4 }}>
              {(entriesByDate[selectedDate] || []).length} {(entriesByDate[selectedDate] || []).length === 1 ? "entry" : "entries"} logged
            </p>
          </div>

          <div style={card}>
            <h2 style={cardTitle}>Add an entry</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} style={inputStyle}>
                {meals.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                placeholder="What did you eat? (optional)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <input
                  placeholder="Calories"
                  type="number"
                  inputMode="decimal"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Protein (g)"
                  type="number"
                  inputMode="decimal"
                  value={form.protein}
                  onChange={(e) => setForm({ ...form, protein: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Carbs (g)"
                  type="number"
                  inputMode="decimal"
                  value={form.carbs}
                  onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <button onClick={addEntry} style={primaryButton}>Add to ledger</button>
            </div>

            {(entriesByDate[selectedDate] || []).length > 0 && (
              <div style={{ marginTop: 18 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {(entriesByDate[selectedDate] || [])
                      .slice()
                      .sort((a, b) => a.createdAt - b.createdAt)
                      .map((e) => (
                        <MealRow key={e.id} entry={e} onDelete={deleteEntry} />
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "log" && (
        <section style={card}>
          <h2 style={cardTitle}>Full log</h2>
          {sortedDates.length === 0 && <p style={emptyText}>No entries yet. Add your first meal from the Today tab.</p>}
          {sortedDates.map((date) => {
            const list = entriesByDate[date].slice().sort((a, b) => a.createdAt - b.createdAt);
            const t = totalsFor(date);
            return (
              <div key={date} style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 600, margin: 0, color: "#2B2823" }}>
                    {fmtDateLabel(date)}
                  </h3>
                  <span style={{ fontSize: 12.5, color: "#9C9484" }}>
                    {round(t.calories)} cal · {round(t.protein)}g P · {round(t.carbs)}g C
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid #E3DDD0" }}>
                      <th style={thStyle}>Meal</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Item</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Cal</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Protein</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Carbs</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => (
                      <MealRow key={e.id} entry={e} onDelete={deleteEntry} />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
      )}

      {view === "weight" && (
        <section className="ledger-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <div style={card}>
            <h2 style={cardTitle}>Log weight</h2>
            <p style={{ fontSize: 12.5, color: "#9C9484", marginTop: -8, marginBottom: 14 }}>
              For {fmtDateLabel(selectedDate)} — change the date above to backfill.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Weight"
                type="number"
                inputMode="decimal"
                value={weightForm.value}
                onChange={(e) => setWeightForm({ value: e.target.value })}
                style={inputStyle}
              />
              <button onClick={addWeight} style={primaryButton}>Save</button>
            </div>

            {latestWeight && (
              <div style={{ marginTop: 20, display: "flex", gap: 22 }}>
                <div>
                  <div style={metricLabel}>Latest</div>
                  <div style={metricValue}>{round(latestWeight.value, 1)}</div>
                </div>
                {weightDelta !== null && (
                  <div>
                    <div style={metricLabel}>Last {trendRange}d</div>
                    <div style={{ ...metricValue, color: weightDelta > 0 ? "#B5523A" : weightDelta < 0 ? "#74835F" : "#2B2823" }}>
                      {weightDelta > 0 ? "+" : ""}{weightDelta}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <Sparkline points={weightSpark} color="#A67C3D" />
            </div>
          </div>

          <div style={card}>
            <h2 style={cardTitle}>Weight history</h2>
            {weightSorted.length === 0 && <p style={emptyText}>No weigh-ins yet.</p>}
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {weightSorted
                    .slice()
                    .reverse()
                    .map((w) => (
                      <tr key={w.id} style={{ borderBottom: "0.5px solid #E3DDD0" }}>
                        <td style={{ padding: "8px 6px", fontSize: 14, color: "#7A7468" }}>{fmtDateLabel(w.date)}</td>
                        <td style={{ padding: "8px 6px", fontSize: 14, textAlign: "right", fontFamily: "Georgia, serif" }}>
                          {round(w.value, 1)}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right" }}>
                          <button onClick={() => deleteWeight(w.id)} aria-label="Delete weight entry" style={deleteBtn}>✕</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {view === "trends" && (
        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
            <h2 style={cardTitle}>Trends</h2>
            <div style={{ display: "flex", gap: 4 }}>
              {[7, 14, 30].map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  style={{
                    ...smallToggle,
                    background: trendRange === r ? "#2B2823" : "transparent",
                    color: trendRange === r ? "#FAF7F0" : "#7A7468",
                    borderColor: trendRange === r ? "#2B2823" : "#E3DDD0",
                  }}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={trendLabel}><span style={{ color: "#C1693F" }}>●</span> Calories <span style={{ color: "#9C9484" }}>(goal {round(goals.calories)})</span></div>
            <BarChartRow days={trendDays} dataKey="calories" goal={goals.calories} color="#C1693F" />
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={trendLabel}><span style={{ color: "#74835F" }}>●</span> Protein (g) <span style={{ color: "#9C9484" }}>(goal {round(goals.protein)})</span></div>
            <BarChartRow days={trendDays} dataKey="protein" goal={goals.protein} color="#74835F" />
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={trendLabel}><span style={{ color: "#5D7290" }}>●</span> Carbs (g) <span style={{ color: "#9C9484" }}>(goal {round(goals.carbs)})</span></div>
            <BarChartRow days={trendDays} dataKey="carbs" goal={goals.carbs} color="#5D7290" />
          </div>

          {weightSpark.length > 1 && (
            <div style={{ marginTop: 26 }}>
              <div style={trendLabel}><span style={{ color: "#A67C3D" }}>●</span> Weight</div>
              <Sparkline points={weightSpark} color="#A67C3D" height={70} />
            </div>
          )}
        </section>
      )}

      {view === "goals" && (
        <section style={{ ...card, maxWidth: 420 }}>
          <h2 style={cardTitle}>Daily targets</h2>
          <p style={{ fontSize: 12.5, color: "#9C9484", marginTop: -8, marginBottom: 16 }}>
            Used to fill the progress bars on Today.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={fieldLabel}>
              Calories
              <input
                type="number"
                value={goalForm.calories}
                onChange={(e) => setGoalForm({ ...goalForm, calories: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={fieldLabel}>
              Protein (g)
              <input
                type="number"
                value={goalForm.protein}
                onChange={(e) => setGoalForm({ ...goalForm, protein: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={fieldLabel}>
              Carbs (g)
              <input
                type="number"
                value={goalForm.carbs}
                onChange={(e) => setGoalForm({ ...goalForm, carbs: e.target.value })}
                style={inputStyle}
              />
            </label>
            <button onClick={saveGoalForm} style={primaryButton}>Save targets</button>
          </div>
        </section>
      )}

      {toast && (
        <div style={toastStyle}>{toast}</div>
      )}
    </div>
  );
}

const shell = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: "#FAF7F0",
  color: "#2B2823",
  padding: "28px 28px 60px",
  minHeight: "100vh",
  maxWidth: 980,
  margin: "0 auto",
};

const card = {
  background: "#FFFFFF",
  border: "0.5px solid #E3DDD0",
  borderRadius: 10,
  padding: "20px 22px",
};

const cardTitle = {
  fontFamily: "Georgia, serif",
  fontSize: 17,
  fontWeight: 600,
  margin: "0 0 16px",
  color: "#2B2823",
};

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  border: "0.5px solid #D8D1C2",
  borderRadius: 6,
  fontSize: 14,
  background: "#FCFAF5",
  color: "#2B2823",
};

const dateInputStyle = {
  ...inputStyle,
  width: "auto",
  padding: "7px 10px",
};

const primaryButton = {
  background: "#2B2823",
  color: "#FAF7F0",
  border: "none",
  borderRadius: 6,
  padding: "10px 16px",
  fontSize: 14,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const smallToggle = {
  border: "0.5px solid #E3DDD0",
  borderRadius: 6,
  padding: "5px 11px",
  fontSize: 12.5,
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#9C9484",
  padding: "0 6px 6px",
  fontWeight: 400,
};

const emptyText = {
  fontSize: 13.5,
  color: "#9C9484",
  fontStyle: "italic",
};

const metricLabel = {
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#9C9484",
  marginBottom: 3,
};

const metricValue = {
  fontFamily: "Georgia, serif",
  fontSize: 24,
  fontWeight: 600,
  color: "#2B2823",
};

const trendLabel = {
  fontSize: 12.5,
  color: "#7A7468",
  marginBottom: 8,
  display: "flex",
  gap: 6,
  alignItems: "center",
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 12.5,
  color: "#7A7468",
};

const deleteBtn = {
  border: "none",
  background: "none",
  color: "#B5523A",
  cursor: "pointer",
  fontSize: 13,
};

const toastStyle = {
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#2B2823",
  color: "#FAF7F0",
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 13.5,
  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
};
