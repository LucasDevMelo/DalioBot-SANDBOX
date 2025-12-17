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
  const [data, setData] = useState<any>(null);
  const [botNames, setBotNames] = useState<any>({});
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // 1. Mapeia Magic Numbers para nomes cadastrados em Account Settings
    onValue(ref(realtimeDB, `users/${user.uid}/mt5_accounts`), (snap) => {
      const val = snap.val();
      if (val) {
        const mapping = {};
        Object.values(val).forEach((b: any) => mapping[b.magicNumber] = b.botName);
        setBotNames(mapping);
      }
    });

    // 2. Escuta dados em tempo real do EA
    const analysisRef = ref(realtimeDB, `analysis/${user.uid}`);
    const unsubscribe = onValue(analysisRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
        // Atualiza histórico do gráfico se houver mudança na Equity
        if (val.metrics?.equity) {
          setHistoryData(prev => {
            const newPoint = { time: new Date().toLocaleTimeString(), equity: val.metrics.equity };
            return [...prev, newPoint].slice(-30); 
          });
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const metrics = data?.metrics;
  const positions = data?.positions || [];
  const hasActivityToday = metrics?.closedTrades > 0 || metrics?.profit !== 0;

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;

  return (
    <div className="flex h-screen bg-slate-950 text-gray-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Monitoramento em Tempo Real</h1>
            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">LIVE DATA</span>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Equity Total" value={`$ ${metrics?.equity?.toLocaleString() || '0.00'}`} color="text-white" />
            <StatCard title="Resultado (Hoje)" value={`$ ${metrics?.profit?.toLocaleString() || '0.00'}`} color={metrics?.profit >= 0 ? "text-emerald-400" : "text-red-400"} />
            <StatCard title="Win Rate" value={`${metrics?.winRate?.toFixed(1) || '0'}%`} color="text-purple-400" />
            <StatCard title="Drawdown" value={`${metrics?.drawdown?.toFixed(2) || '0.00'}%`} color="text-orange-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Curva de Capital (Condicional) */}
            <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-sm text-gray-400 uppercase">Curva de Capital (Hoje)</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                {hasActivityToday ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="equity" stroke="#a855f7" fill="url(#colorEq)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <p className="text-sm">Aguardando primeira operação para gerar gráfico...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo de Atividade */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-sm text-gray-400 uppercase">Resumo de Atividade</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ActivityRow label="Trades Abertos" value={metrics?.openTrades || 0} />
                <ActivityRow label="Trades Fechados" value={metrics?.closedTrades || 0} />
                <ActivityRow label="Fator de Lucro" value={metrics?.profitFactor?.toFixed(2) || '0.00'} isPurple />
                <div className="pt-4 border-t border-slate-800 mt-4">
                  <p className="text-[10px] text-gray-500 leading-relaxed italic">
                    Dados processados diretamente do MetaTrader 5 via DalioBot Bridge.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Operações Abertas */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-lg text-white font-bold">Operações em Aberto</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500 border-b border-slate-800">
                    <tr>
                      <th className="pb-3">Robô</th><th className="pb-3">Ativo</th>
                      <th className="pb-3">Vol</th><th className="pb-3">Entrada</th>
                      <th className="pb-3">Alvo (TP)</th><th className="pb-3">Tipo</th>
                      <th className="pb-3">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {positions.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 text-purple-400 font-bold">{botNames[p.magic] || `Magic: ${p.magic}`}</td>
                        <td className="py-4 text-white">{p.symbol}</td>
                        <td className="py-4 font-mono">{p.vol}</td>
                        <td className="py-4">{p.entry}</td>
                        <td className="py-4 text-emerald-500 font-mono">{p.tp}</td>
                        <td className="py-4 font-bold">
                          {p.type === 0 ? <span className="text-emerald-500">BUY</span> : <span className="text-red-500">SELL</span>}
                        </td>
                        <td className="py-4 w-40">
                          <div className="h-1.5 w-full bg-slate-800 rounded-full mb-1">
                            <div className="h-1.5 bg-purple-500 rounded-full" style={{ width: `${Math.min(p.prog, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-gray-500 uppercase">{p.prog?.toFixed(1)}% para o alvo</span>
                        </td>
                      </tr>
                    ))}
                    {positions.length === 0 && (
                       <tr><td colSpan={7} className="py-10 text-center text-gray-600">Nenhuma posição aberta no momento.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

// Componentes Auxiliares de UI
function StatCard({ title, value, color }: any) {
  return (
    <Card className="bg-slate-900 border-slate-800 p-5">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}

function ActivityRow({ label, value, isPurple }: any) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg border border-slate-800/50">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`font-bold ${isPurple ? 'text-purple-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}