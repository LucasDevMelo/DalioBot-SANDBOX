'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/authcontext';
import { realtimeDB } from '@/src/firebase';
import { ref, onValue } from 'firebase/database';
import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RealTimeAnalysis() {
  const { user, loading } = useAuth();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [data, setData] = useState<any>(null);
  const [botNames, setBotNames] = useState<any>({});
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // 1. Carrega nomes dos robôs (Mapeamento Magic -> Nome)
    const botsRef = ref(realtimeDB, `users/${user.uid}/mt5_accounts`);
    onValue(botsRef, (snap) => {
      const val = snap.val();
      if (val) {
        const mapping: any = {};
        Object.values(val).forEach((b: any) => mapping[String(b.magicNumber)] = b.botName);
        setBotNames(mapping);
      }
    });

    // 2. Escuta dados em tempo real da análise
    const analysisRef = ref(realtimeDB, `analysis/${user.uid}`);
    const unsubscribe = onValue(analysisRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);

        // --- LÓGICA DE TRATAMENTO DO GRÁFICO ---
        console.log("Dados recebidos do Firebase:", val); // Debug no navegador

        let rawChart = val.chartData;
        let formattedChart: any[] = [];

        // Verifica se existe chartData
        if (rawChart) {
           // Se for Array (padrão ideal), usa direto
           if (Array.isArray(rawChart)) {
              formattedChart = rawChart;
           } 
           // Se o Firebase converter para Objeto (chaves numéricas "0", "1"...), converte de volta para array
           else if (typeof rawChart === 'object') {
              formattedChart = Object.values(rawChart);
           }
        }

        // Se estiver vazio ou inválido, define o ponto inicial 0
        if (!formattedChart || formattedChart.length === 0) {
           formattedChart = [{ time: 'Start', value: 0 }];
        }

        // TRUQUE VISUAL: Se tiver apenas 1 ponto (ex: só o 'Start' ou só o primeiro trade),
        // adiciona um ponto "Agora" repetindo o valor, para o gráfico desenhar uma linha reta.
        if (formattedChart.length === 1) {
           formattedChart.push({ 
              time: 'Now', 
              value: formattedChart[0].value 
           });
        }

        setHistoryData(formattedChart);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const metrics = data?.metrics;
  const positions = data?.positions || [];
  const closedHistory = data?.closedHistory || [];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
      <Topbar />
      
      {/* Botão Mobile */}
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
        <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-400 font-bold text-xl p-2">☰</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`fixed md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-center bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
              <div>
                <h1 className="text-2xl font-bold text-white">Real-Time Monitoring</h1>
                <p className="text-gray-400 text-sm">Live data from MetaTrader 5</p>
              </div>
              <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">LIVE DATA</span>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Equity" value={`$ ${metrics?.equity?.toLocaleString() || '0.00'}`} color="text-white" />
              <StatCard title="Result (Today)" value={`$ ${metrics?.profit?.toLocaleString() || '0.00'}`} color={metrics?.profit >= 0 ? "text-emerald-400" : "text-red-400"} />
              <StatCard title="Win Rate" value={`${metrics?.winRate?.toFixed(1) || '0'}%`} color="text-purple-400" />
              <StatCard title="Drawdown" value={`${metrics?.drawdown?.toFixed(2) || '0.00'}%`} color="text-orange-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* --- GRÁFICO DE CURVA DE RESULTADO (PnL) --- */}
              <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 rounded-2xl shadow-lg">
                <CardHeader><CardTitle className="text-sm text-gray-400 uppercase">Daily Result Curve (PnL)</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={['auto', 'auto']} /> 
                      
                      <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} 
                          // O MQL5 envia a chave "value"
                          formatter={(value: number) => [`$ ${value?.toFixed(2)}`, "Result"]}
                      />
                      
                      <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#a855f7" 
                          fill="url(#colorProfit)" 
                          strokeWidth={2} 
                          isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card className="bg-slate-800/50 border-slate-700 rounded-2xl shadow-lg">
                <CardHeader><CardTitle className="text-sm text-gray-400 uppercase">Activity Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ActivityRow label="Open Trades" value={metrics?.openTrades || 0} />
                  <ActivityRow label="Closed Trades" value={metrics?.closedTrades || 0} />
                  <ActivityRow label="Profit Factor" value={metrics?.profitFactor?.toFixed(2) || '0.00'} isPurple />
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Posições Abertas */}
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl shadow-lg">
              <CardHeader><CardTitle className="text-lg text-white font-bold">Open Positions</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-gray-400 border-b border-slate-700">
                      <tr>
                        <th className="pb-3">Robot</th><th className="pb-3">Asset</th>
                        <th className="pb-3">Vol</th><th className="pb-3">Entry</th>
                        <th className="pb-3">Target (TP)</th><th className="pb-3">Type</th>
                        <th className="pb-3">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {positions.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 text-purple-400 font-bold">
                            {botNames[String(p.magic)] || `Magic: ${p.magic}`}
                          </td>
                          <td className="py-4 text-white">{p.symbol}</td>
                          <td className="py-4">{p.vol}</td>
                          <td className="py-4">{p.entry}</td>
                          <td className="py-4 text-emerald-500">{p.tp}</td>
                          <td className="py-4 font-bold">{p.type === 0 ? "BUY" : "SELL"}</td>
                          <td className="py-4 w-40">
                            <div className="h-1.5 w-full bg-slate-700 rounded-full mb-1">
                              <div className="h-1.5 bg-purple-500 rounded-full" style={{ width: `${Math.min(p.prog || 0, 100)}%` }}></div>
                            </div>
                            <span className="text-[9px] text-gray-500 uppercase">{p.prog?.toFixed(1)}% to target</span>
                          </td>
                        </tr>
                      ))}
                      {positions.length === 0 && (
                         <tr><td colSpan={7} className="py-4 text-center text-gray-500">No open positions.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Histórico (Closed Trades) */}
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl shadow-lg mt-6">
              <CardHeader>
                <CardTitle className="text-lg text-white font-bold">Closed Trades (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-gray-400 border-b border-slate-700">
                      <tr>
                        <th className="pb-3">Robot</th>
                        <th className="pb-3">Asset</th>
                        <th className="pb-3 text-emerald-500">Gains</th>
                        <th className="pb-3 text-red-500">Loss</th>
                        <th className="pb-3">Trades</th>
                        <th className="pb-3">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {closedHistory.map((b: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 text-purple-400 font-bold">
                             {botNames[String(b.magic)] || `Magic: ${b.magic}`}
                          </td>
                          <td className="py-4 text-white">{b.symbol}</td>
                          <td className="py-4 text-emerald-500">$ {b.gains?.toFixed(2)}</td>
                          <td className="py-4 text-red-500">$ {b.losses?.toFixed(2)}</td>
                          <td className="py-4 text-gray-300">{b.trades}</td>
                          <td className={`py-4 font-bold ${b.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            $ {b.net?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {closedHistory.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500 italic">No closed trades recorded today.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}

// Stats Components
function StatCard({ title, value, color }: any) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 shadow-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ActivityRow({ label, value, isPurple }: any) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg border border-slate-700">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`font-bold ${isPurple ? 'text-purple-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}