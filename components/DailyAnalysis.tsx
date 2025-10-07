// components/DailyAnalysis.tsx

"use client";
import React, { useMemo, useState, useRef } from "react";
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

// Helper functions
function mean(arr: number[]) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
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

const DailyAnalysis: React.FC<Props> = ({ csvData, roboId }) => {
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Normaliza e ordena dados
  const normalized = useMemo(() => {
    const arr: { dateISO: string; equity: number; rawDate: string }[] = [];
    csvData.forEach((row) => {
      const d = new Date(row.DATE);
      if (isNaN(d.getTime())) {
        const s = row.DATE.replace(/\./g, "-").replace(/\//g, "-");
        const parts = s.split("-");
        if (parts.length >= 3) {
          const maybeISO = `${parts[2].padStart(4, "0")}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          const dd = new Date(maybeISO);
          if (!isNaN(dd.getTime())) {
            arr.push({ dateISO: dd.toISOString().split("T")[0], equity: Number(row.EQUITY), rawDate: row.DATE });
            return;
          }
        }
        return;
      }
      arr.push({ dateISO: d.toISOString().split("T")[0], equity: Number(row.EQUITY), rawDate: row.DATE });
    });
    const map = new Map<string, number>();
    arr.forEach((r) => map.set(r.dateISO, r.equity));
    const unique = Array.from(map.entries()).map(([dateISO, equity]) => ({ dateISO, equity }));
    unique.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
    return unique;
  }, [csvData]);

  // Resultados diários
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

  // Filtros
  const filtered = useMemo(() => {
    let arr = daily.slice();
    if (selectedYear !== "all") arr = arr.filter(d => new Date(d.dateISO).getFullYear() === selectedYear);
    if (selectedMonth !== "all") arr = arr.filter(d => new Date(d.dateISO).getMonth() === selectedMonth);
    if (startDate) arr = arr.filter(d => new Date(d.dateISO) >= new Date(startDate));
    if (endDate) arr = arr.filter(d => new Date(d.dateISO) <= new Date(endDate));
    return arr;
  }, [daily, selectedYear, selectedMonth, startDate, endDate]);

  // Estatísticas
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

    // Drawdown
    const cumEquityArr: number[] = [];
    const firstIndex = normalized.findIndex(n => n.dateISO === filtered[0].dateISO);
    let baseEquity = firstIndex > 0 ? normalized[firstIndex - 1].equity : (normalized[0]?.equity ?? 0);
    let peak = baseEquity;
    let maxDrawdown = 0;
    for (let i = firstIndex; i < normalized.length; i++) {
      const cur = normalized[i];
      cumEquityArr.push(cur.equity);
      if (cur.equity > peak) peak = cur.equity;
      const drawdown = ((peak - cur.equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Streaks
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

  // Chart data + média móvel
  const chartData = useMemo(() => {
    const base = filtered.map((d) => {
      const date = new Date(d.dateISO);
      const label = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { dateLabel: label, dateISO: d.dateISO, result: Number(d.result), equity: Number(d.equity) };
    });

    const values = base.map((b) => b.result);
    const ma = movingAverage(values, 7);
    return base.map((b, i) => ({ ...b, ma7: ma[i] }));
  }, [filtered]);

  const cumulativeForChart = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((d) => ({ dateLabel: d.dateLabel, equity: d.equity }));
  }, [chartData]);

  const histogram = useMemo(() => {
    const values = filtered.map(f => f.result);
    return histogramBins(values, 20);
  }, [filtered]);

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

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Detailed Daily Analysis</h1>
            <p className="text-sm text-gray-500">Granular view of daily results, accumulated equity, and performance metrics.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            <button onClick={() => window.print()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm">Print</button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-600">Year</label>
              <select
                value={selectedYear === "all" ? "all" : String(selectedYear)}
                onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-600">Month</label>
              <select
                value={selectedMonth === "all" ? "all" : String(selectedMonth)}
                onChange={(e) => setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-600">from</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2" />
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-600">to</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2" />
            </div>

            <div className="ml-auto flex gap-2">
              <button onClick={clearFilters} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg">Clean</button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow">
            <p className="text-sm text-gray-500">Total Result</p>
            <p className={`text-xl font-bold ${stats && stats.total >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stats ? `${stats.total.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Sum of results in the period</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <p className="text-sm text-gray-500">Volatility (daily σ)</p>
            <p className="text-xl font-bold">{stats ? stats.vol.toFixed(4) : "—"}</p>
            <p className="text-xs text-gray-400 mt-1">Standard deviation of results</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <p className="text-sm text-gray-500">Sharpe (approx.)</p>
            <p className="text-xl font-bold">{stats ? stats.sharpe.toFixed(3) : "—"}</p>
            <p className="text-xs text-gray-400 mt-1">Assume RF ≈ 0, annualized</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <p className="text-sm text-gray-500">Maximum Drawdown (%)</p>
            <p className="text-xl font-bold text-red-600">
              {stats ? `${stats.maxDrawdown.toFixed(2)}%` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Biggest loss since peak</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-semibold mb-2">Equity (accumulated)</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeForChart}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="equity" stroke="#7c3aed" fill="url(#eqGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-semibold mb-2">Daily Result & Moving Average (7)</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="result" name="Resultado" stroke="#16a34a" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="ma7" name="MA(7)" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Bar chart: resultados por dia */}
          <div className="bg-white p-4 rounded-2xl shadow lg:col-span-1">
            <h3 className="font-semibold mb-2">Barras - Resultado Diário</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="dateLabel" tick={{fontSize: 10}}/>
                  <YAxis />
                  <Tooltip />
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
          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-semibold mb-2">Distribution of Results (Histogram)</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bin" tickFormatter={(v) => Number(v).toFixed(2)} />
                  <YAxis />
                  <Tooltip formatter={(value: any, name: any) => [value, 'Count']} />
                  <Bar dataKey="count" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabela de resultados */}
        <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
          <h3 className="font-semibold mb-4">Results Table</h3>
          {chartData.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Result</th>
                  <th className="py-2 px-3">Equity</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.dateISO} className="border-t">
                    <td className="py-2 px-3">{row.dateLabel}</td>
                    <td className={`py-2 px-3 font-medium ${row.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.result >= 0 ? `+${row.result.toFixed(2)}` : row.result.toFixed(2)}</td>
                    <td className="py-2 px-3">{row.equity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-6">No data found for selected filters.</p>
          )}
        </div>

        {/* Footer / observações */}
        <div className="text-sm text-gray-500">
          <p>Note: Metrics like Sharpe are approximate and assume a risk-free rate ≈ 0. For more precise analysis (adjustment for weekdays, intra-day variation, or normalization by allocated capital), provide additional data or choose a calculation window.</p>
        </div>
      </div>
    </main>
  );
};

export default DailyAnalysis;
