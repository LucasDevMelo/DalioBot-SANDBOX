// components/DailyAnalysis.tsx

"use client";
import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

interface CSVRow {
  DATE: string;
  EQUITY: number;
}

interface Props {
  csvData: CSVRow[];
  roboId?: string;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Funções auxiliares (sem alteração de lógica)
function mean(arr: number[]) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (let v of arr) s += v;
  return s / arr.length;
}

function std(arr: number[]) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  let s = 0;
  for (let v of arr) s += (v - m) ** 2;
  return Math.sqrt(s / arr.length);
}

function movingAverage(arr: number[], window = 7) {
  const res: (number | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    res.push(slice.length ? mean(slice) : null);
  }
  return res;
}

function histogramBins(values: number[], binCount = 20) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binSize = range / binCount;
  const bins = new Array(binCount).fill(0);
  values.forEach(v => {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / binSize));
    bins[idx]++;
  });
  const result = bins.map((count, i) => ({
    bin: min + i * binSize + binSize / 2,
    count,
  }));
  return result;
}

const formatDateLabelFromISO = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return iso;
  }
};

// Props de estilo reutilizáveis para os gráficos
const chartTextFill = "#94a3b8"; // slate-400
const chartGridStroke = "#334155"; // slate-700
const chartTooltipWrapperStyle: React.CSSProperties = {
  backgroundColor: '#1e293b', // slate-800
  border: '1px solid #334155', // slate-700
  borderRadius: '8px',
  color: '#e2e8f0', // slate-200
};
const chartTooltipContentStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
};

const DailyAnalysis: React.FC<Props> = ({ csvData, roboId }) => {
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [volWindow, setVolWindow] = useState<number>(20);

  // Normaliza e ordena dados (sem alteração de lógica)
  const normalized = useMemo(() => {
    const arr: { dateISO: string; equity: number; rawDate: string }[] = [];
    csvData.forEach((row) => {
      let d = new Date(row.DATE);
      if (isNaN(d.getTime())) {
        const s = String(row.DATE).replace(/\./g, "-").replace(/\//g, "-");
        const parts = s.split("-");
        if (parts.length >= 3) {
          const maybeISO = `${parts[2].padStart(4, "0")}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          d = new Date(maybeISO);
        }
      }
      if (isNaN(d.getTime())) return;
      const iso = d.toISOString().split("T")[0];
      const equity = Number(row.EQUITY) || 0;
      arr.push({ dateISO: iso, equity, rawDate: row.DATE });
    });
    const map = new Map<string, number>();
    arr.forEach((r) => map.set(r.dateISO, r.equity));
    const unique = Array.from(map.entries()).map(([dateISO, equity]) => ({ dateISO, equity }));
    unique.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
    return unique;
  }, [csvData]);

  // Resultados diários (sem alteração de lógica)
  const daily = useMemo(() => {
    const res: { dateISO: string; equity: number; result: number }[] = [];
    for (let i = 1; i < normalized.length; i++) {
      const prev = normalized[i - 1];
      const cur = normalized[i];
      const result = Number(cur.equity - prev.equity);
      res.push({ dateISO: cur.dateISO, equity: cur.equity, result });
    }
    return res;
  }, [normalized]);

  const years = useMemo(() => {
    const s = new Set<number>();
    normalized.forEach(n => s.add(new Date(n.dateISO).getFullYear()));
    return Array.from(s).sort((a, b) => b - a);
  }, [normalized]);

  const applyPresetDays = (days: number) => {
    if (normalized.length === 0) return;
    const last = normalized[normalized.length - 1];
    const idx = Math.max(0, normalized.findIndex(n => n.dateISO === last.dateISO) - days + 1);
    const start = normalized[Math.max(0, normalized.length - days)]?.dateISO ?? normalized[0].dateISO;
    setStartDate(start);
    setEndDate(last.dateISO);
  };

  // Filtros (sem alteração de lógica)
  const filtered = useMemo(() => {
    let arr = daily.slice();
    if (selectedYear !== "all") arr = arr.filter(d => new Date(d.dateISO).getFullYear() === selectedYear);
    if (selectedMonth !== "all") arr = arr.filter(d => new Date(d.dateISO).getMonth() === selectedMonth);
    if (startDate) arr = arr.filter(d => new Date(d.dateISO) >= new Date(startDate));
    if (endDate) arr = arr.filter(d => new Date(d.dateISO) <= new Date(endDate));
    return arr;
  }, [daily, selectedYear, selectedMonth, startDate, endDate]);

  // Derived stats (sem alteração de lógica)
  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const results = filtered.map(f => f.result);
    const total = results.reduce((s, v) => s + v, 0);
    const avg = mean(results);
    const vol = std(results);
    const sharpe = vol === 0 ? 0 : (avg / vol) * Math.sqrt(252);
    const best = Math.max(...results);
    const worst = Math.min(...results);
    const wins = results.filter(r => r > 0);
    const losses = results.filter(r => r <= 0);
    const winRate = results.length ? wins.length / results.length : 0;
    const avgWin = wins.length ? mean(wins) : 0;
    const avgLoss = losses.length ? mean(losses) : 0;
    const cumEquityArr: number[] = [];
    if (filtered.length === 0) {
      return { total, avg, vol, sharpe, best, worst, winRate, avgWin, avgLoss, maxDrawdown: 0, bestWinStreak: 0, bestLossStreak: 0, cumEquityArr: [] };
    }
    const firstDateISO = filtered[0].dateISO;
    const firstIndex = normalized.findIndex(n => n.dateISO === firstDateISO);
    let eqSeries: number[] = [];
    if (firstIndex >= 0) {
      for (let i = firstIndex; i < normalized.length; i++) eqSeries.push(normalized[i].equity);
    } else {
      eqSeries = filtered.map(f => f.equity);
    }
    let peak = eqSeries.length ? eqSeries[0] : 0;
    let maxDrawdown = 0;
    for (const val of eqSeries) {
      if (val > peak) peak = val;
      const dd = peak === 0 ? 0 : ((peak - val) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
      cumEquityArr.push(val);
    }
    let bestWinStreak = 0, bestLossStreak = 0, curWin = 0, curLoss = 0;
    for (const r of results) {
      if (r > 0) {
        curWin++;
        bestWinStreak = Math.max(bestWinStreak, curWin);
        curLoss = 0;
      } else {
        curLoss++;
        bestLossStreak = Math.max(bestLossStreak, curLoss);
        curWin = 0;
      }
    }
    return {
      total, avg, vol, sharpe, best, worst, winRate, avgWin, avgLoss,
      maxDrawdown, bestWinStreak, bestLossStreak, cumEquityArr
    };
  }, [filtered, normalized]);

  // Chart data + média móvel (sem alteração de lógica)
  const chartData = useMemo(() => {
    const base = filtered.map((d) => {
      const dateLabel = formatDateLabelFromISO(d.dateISO);
      return { dateLabel, dateISO: d.dateISO, result: Number(d.result), equity: Number(d.equity) };
    });
    const values = base.map((b) => b.result);
    const ma = movingAverage(values, 7);
    return base.map((b, i) => ({ ...b, ma7: ma[i] }));
  }, [filtered]);

  // cumulative chart (sem alteração de lógica)
  const cumulativeForChart = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((d) => ({ dateLabel: d.dateLabel, equity: d.equity }));
  }, [chartData]);

  // Drawdown series for chart (sem alteração de lógica)
  const drawdownForChart = useMemo(() => {
    if (cumulativeForChart.length === 0) return [];
    let peak = cumulativeForChart[0].equity;
    const res: { dateLabel: string; drawdown: number }[] = [];
    for (const p of cumulativeForChart) {
      if (p.equity > peak) peak = p.equity;
      const dd = peak === 0 ? 0 : ((p.equity - peak) / peak) * 100;
      res.push({ dateLabel: p.dateLabel, drawdown: dd });
    }
    return res;
  }, [cumulativeForChart]);

  // Rolling volatility (sem alteração de lógica)
  const rollingVolForChart = useMemo(() => {
    const results = chartData.map(d => d.result);
    if (results.length === 0) return [];
    const rv: { dateLabel: string; rollingVol?: number }[] = [];
    for (let i = 0; i < results.length; i++) {
      const start = Math.max(0, i - volWindow + 1);
      const slice = results.slice(start, i + 1);
      if (slice.length < 2) {
        rv.push({ dateLabel: chartData[i].dateLabel, rollingVol: undefined });
      } else {
        const sd = std(slice);
        const ann = sd * Math.sqrt(252);
        rv.push({ dateLabel: chartData[i].dateLabel, rollingVol: ann });
      }
    }
    return rv;
  }, [chartData, volWindow]);

  const histogram = useMemo(() => {
    const values = filtered.map(f => f.result);
    return histogramBins(values, 20);
  }, [filtered]);

  // Funções de export e filtros (sem alteração de lógica)
  const exportCSV = () => {
    const header = ["dateISO,result,equity"];
    const lines = filtered.map(f => `${f.dateISO},${f.result.toFixed(6)},${f.equity.toFixed(6)}`);
    const csv = header.join("\n") + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-analysis-${roboId ?? "robo"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSelectedYear("all");
    setSelectedMonth("all");
    setStartDate("");
    setEndDate("");
  };

  // Início do JSX com novos estilos
  return (
    <main className="min-h-screen bg-slate-900 text-gray-200 p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Detailed Daily Analysis</h1>
            <p className="text-sm text-gray-400">Granular view of daily results, accumulated equity, and performance metrics.</p>
          </div>
        </div>


        {/* Filters */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
          <div className="flex flex-col md:flex-row gap-4 md:items-end flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-400">Year</label>
              <select
                value={selectedYear === "all" ? "all" : String(selectedYear)}
                onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-400">Month</label>
              <select
                value={selectedMonth === "all" ? "all" : String(selectedMonth)}
                onChange={(e) => setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All</option>
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-400">from</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                style={{ colorScheme: 'dark' }} // Força o picker de data para o modo dark
              />
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-400">to</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="ml-auto flex gap-2 items-center flex-wrap">
              <button onClick={() => { applyPresetDays(30); }} className="bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-2 rounded-lg text-sm">Last 30d</button>
              <button onClick={() => { applyPresetDays(90); }} className="bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-2 rounded-lg text-sm">Last 90d</button>
              <button onClick={() => { applyPresetDays(365); }} className="bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-2 rounded-lg text-sm">Last 365d</button>
              <button onClick={clearFilters} className="bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-2 rounded-lg text-sm">Clear</button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-sm text-gray-400">Total Result</p>
            <p className={`text-2xl font-bold ${stats && stats.total >= 0 ? "text-green-500" : "text-red-500"}`}>
              {stats ? `${stats.total.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Sum of results in the period</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-sm text-gray-400">Volatility (daily σ)</p>
            <p className="text-2xl font-bold text-white">{stats ? stats.vol.toFixed(4) : "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Standard deviation of results</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-sm text-gray-400">Sharpe (approx.)</p>
            <p className="text-2xl font-bold text-white">{stats ? stats.sharpe.toFixed(3) : "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Assume RF ≈ 0, annualized</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-sm text-gray-400">Maximum Drawdown (%)</p>
            <p className="text-2xl font-bold text-red-500">
              {stats ? `${stats.maxDrawdown.toFixed(2)}%` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Biggest loss since peak</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <h3 className="font-semibold mb-2 text-white">Equity (accumulated)</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeForChart}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: chartTextFill }} />
                  <YAxis tick={{ fontSize: 12, fill: chartTextFill }} />
                  <Tooltip
                    formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
                    wrapperStyle={chartTooltipWrapperStyle}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#7c3aed" fill="url(#eqGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <h3 className="font-semibold mb-2 text-white">Daily Result & Moving Average (7)</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: chartTextFill }} />
                  <YAxis tick={{ fontSize: 12, fill: chartTextFill }} />
                  <Tooltip
                    formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
                    wrapperStyle={chartTooltipWrapperStyle}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Legend formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>} />
                  <Line type="monotone" dataKey="result" name="Resultado" stroke="#16a34a" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="ma7" name="MA(7)" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar chart: resultados por dia */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 lg:col-span-1">
            <h3 className="font-semibold mb-2 text-white">Barras - Resultado Diário</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: chartTextFill }} />
                  <YAxis tick={{ fontSize: 12, fill: chartTextFill }} />
                  <Tooltip
                    formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
                    wrapperStyle={chartTooltipWrapperStyle}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Bar dataKey="result" name="Resultado">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? "#16a34a" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Histogram */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <h3 className="font-semibold mb-2 text-white">Distribution of Results (Histogram)</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="bin" tickFormatter={(v) => Number(v).toFixed(2)} tick={{ fontSize: 12, fill: chartTextFill }} />
                  <YAxis tick={{ fontSize: 12, fill: chartTextFill }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [value, 'Count']}
                    wrapperStyle={chartTooltipWrapperStyle}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Bar dataKey="count" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drawdown + Rolling Vol */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <h3 className="font-semibold mb-2 text-white">Drawdown (%)</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownForChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: chartTextFill }} />
                  <YAxis
                    domain={["dataMin", 0]}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    tick={{ fontSize: 12, fill: chartTextFill }}
                  />
                  <Tooltip
                    formatter={(value) => (typeof value === "number" ? `${value.toFixed(2)}%` : value)}
                    wrapperStyle={chartTooltipWrapperStyle}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold mb-2 text-white">Rolling Volatility (annualized)</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Window</label>
                <select
                  value={String(volWindow)}
                  onChange={(e) => setVolWindow(Number(e.target.value))}
                  className="bg-slate-700 border border-slate-600 text-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rollingVolForChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: chartTextFill }} />
                  <YAxis tick={{ fontSize: 12, fill: chartTextFill }} />
                  <Tooltip
                    formatter={(value) => (typeof value === "number" ? value.toFixed(4) : value)}
                    wrapperStyle={chartTooltipWrapperStyle}
                    contentStyle={chartTooltipContentStyle}
                  />
                  <Line type="monotone" dataKey="rollingVol" stroke="#0ea5e9" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabela de resultados */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 overflow-x-auto">
          <h3 className="font-semibold mb-4 text-white">Results Table</h3>
          {chartData.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Result</th>
                  <th className="py-2 px-3">Equity</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.dateISO} className="border-t border-slate-700">
                    <td className="py-2 px-3 text-gray-300">{row.dateLabel}</td>
                    <td className={`py-2 px-3 font-medium ${row.result >= 0 ? 'text-green-500' : 'text-red-500'}`}>{row.result >= 0 ? `+${row.result.toFixed(2)}` : row.result.toFixed(2)}</td>
                    <td className="py-2 px-3 text-gray-300">{row.equity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-6">No data found for selected filters.</p>
          )}
        </div>

        {/* Footer / observações */}
        <div className="text-sm text-gray-400">
          <p>Note: Metrics like Sharpe are approximate and assume a risk-free rate ≈ 0. For more precise analysis (normalizing by capital, handling trading days vs calendar days, or per-trade returns) provide more detailed inputs or request specific adjustments.</p>
        </div>
      </div>
    </main>
  );
};

export default DailyAnalysis;