'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/authcontext'; // Importa o contexto de auth
import { realtimeDB } from '@/src/firebase';
import { ref, onValue } from 'firebase/database';
import Sidebar from '@/components/sidebar';

export default function RealTimeAnalysis() {
  const { user, loading } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Escuta mudanças em tempo real para este utilizador específico
    const analysisRef = ref(realtimeDB, `analysis/${user.uid}`);
    const unsubscribe = onValue(analysisRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setMetrics(data);
    });

    return () => unsubscribe(); // Limpa o listener ao sair da página
  }, [user]);

  if (loading) return <div className="p-8 text-white">A carregar...</div>;

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 text-white">
        <h1 className="text-3xl font-bold mb-8">Análise em Tempo Real</h1>
        
        {metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Equity" value={`$ ${metrics.equity?.toFixed(2)}`} />
            <StatCard title="Balance" value={`$ ${metrics.balance?.toFixed(2)}`} />
            <StatCard title="Drawdown" value={`${metrics.drawdown?.toFixed(2)}%`} color="text-red-400" />
            <StatCard title="Win Rate" value={`${metrics.winRate}%`} />
            <StatCard title="Profit Factor" value={metrics.profitFactor} />
          </div>
        ) : (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <p>Aguardando conexão com o MetaTrader 5...</p>
            <p className="text-sm text-gray-400 mt-2">Certifique-se de que o seu EA está ativo e configurado com o seu UID: <code className="bg-black px-1">{user?.uid}</code></p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, color = "text-emerald-400" }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}