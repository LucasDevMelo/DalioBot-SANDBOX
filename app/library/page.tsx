'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { getDatabase, ref, get } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import Topbar from '../../components/topbar';
import Sidebar from '../../components/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Gauge, TrendingUp, Target, Scale, Briefcase, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

// =============================================================
// INTERFACES
// =============================================================
interface ProcessedCsvRow {
  EQUITY: number;
  DATE: string;
}

interface RoboData {
  id: string;
  nome: string; // <--- 1. ADICIONADO: Campo nome na interface
  ativo: string;
  tipo: string;
  score: number;
  fatorLucro: number;
  drawdownMaximo: number;
  taxaAcerto: number;
  equityCurve: { equity: number }[];
}

interface RoboCardProps {
  robo: RoboData;
}

// =============================================================
// COMPONENTES AUXILIARES
// =============================================================
const MetricItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <div className="flex flex-col items-center text-center">
    <div className="text-purple-400 mb-1">{icon}</div>
    <p className="text-sm font-semibold text-white">{value}</p>
    <p className="text-xs text-gray-400">{label}</p>
  </div>
);

// =============================================================
// CARD DO ROBO (ESTILIZADO)
// =============================================================
const RoboCard = ({ robo }: RoboCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:shadow-purple-500/10 transition-all"
    >
      <CardHeader className="p-4 border-b border-slate-700">
        {/* 2. ALTERADO: De robo.id para robo.nome */}
        <CardTitle className="text-white text-lg font-semibold">{robo.nome}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow p-4">
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 mb-4">
          <MetricItem icon={<Gauge size={18} />} label="Score" value={robo.score.toFixed(2)} />
          <MetricItem icon={<Briefcase size={18} />} label="Asset" value={robo.ativo} />
          <MetricItem icon={<TrendingUp size={18} />} label="Market" value={robo.tipo} />
          <MetricItem icon={<Scale size={18} />} label="Profit Factor" value={robo.fatorLucro.toFixed(2)} />
          <MetricItem icon={<Target size={18} />} label="Hit Rate" value={`${robo.taxaAcerto.toFixed(1)}%`} />
          <MetricItem icon={<Bot size={18} />} label="Max DD" value={`$${robo.drawdownMaximo.toFixed(2)}`} />
        </div>

        <div className="flex-grow h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={robo.equityCurve} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <XAxis hide dataKey="name" />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="rgba(139,92,246,0.1)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard?id=${encodeURIComponent(robo.id)}&origem=biblioteca`}
            className="bg-purple-600 text-white text-center text-sm font-semibold py-2 px-1 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Details
          </Link>
          <Link
            href={`/daily-analisys?id=${encodeURIComponent(robo.id)}`}
            className="border border-purple-600 text-purple-400 text-center text-sm font-semibold py-2 px-1 rounded-lg hover:bg-purple-500/10 transition-colors"
          >
            Daily Analysis
          </Link>
        </div>
      </CardContent>
    </motion.div>
  );
};

// =============================================================
// COMPONENTE PRINCIPAL DA BIBLIOTECA
// =============================================================
function BibliotecaContent() {
  const { user } = useAuth();
  const [robos, setRobos] = useState<RoboData[]>([]);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const calculateRoboSummary = (dadosCSV: any) => {
    // ... (mesma lógica de cálculo anterior mantida aqui para brevidade)
    const csvData: ProcessedCsvRow[] = Object.values(dadosCSV)
      .map((row: any) => ({
        EQUITY: parseFloat(String(row['<EQUITY>'] || row.EQUITY || 0).replace(',', '.')),
        DATE: String(row['<DATE>'] || row.DATE || '').replace(/\./g, '-'),
      }))
      .filter(row => row.DATE && !isNaN(row.EQUITY) && !isNaN(new Date(row.DATE).getTime()))
      .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

    if (csvData.length < 2) {
      return { metrics: { score: 0, fatorLucro: 0, drawdownMaximo: 0, taxaAcerto: 0 }, equityCurve: [] };
    }

    const initialEquity = csvData[0].EQUITY;
    const finalEquity = csvData[csvData.length - 1].EQUITY;
    const equityCurve = csvData.map(row => ({ equity: row.EQUITY - initialEquity }));

    const rowByRowChanges = csvData.slice(1).map((row, i) => row.EQUITY - csvData[i].EQUITY);
    const rowByRowGains = rowByRowChanges.filter(change => change > 0);
    const rowByRowLosses = rowByRowChanges.filter(change => change < 0).map(l => Math.abs(l));
    const totalRowGain = rowByRowGains.reduce((sum, g) => sum + g, 0);
    const totalRowLoss = rowByRowLosses.reduce((sum, l) => sum + l, 0);
    const fatorLucro = totalRowLoss > 0 ? totalRowGain / totalRowLoss : 0;

    const equityPorDia = new Map<string, number>();
    csvData.forEach(row => {
      equityPorDia.set(new Date(row.DATE).toISOString().split('T')[0], row.EQUITY);
    });
    const datasUnicas = Array.from(equityPorDia.keys()).sort();
    const lucroDiarioConsolidado = datasUnicas.slice(1).map((d, i) =>
      (equityPorDia.get(d) ?? 0) - (equityPorDia.get(datasUnicas[i]) ?? 0)
    );
    const gains = lucroDiarioConsolidado.filter(v => v > 0);
    const losses = lucroDiarioConsolidado.filter(v => v < 0);
    const taxaAcerto = (gains.length + losses.length) > 0
      ? (gains.length / (gains.length + losses.length)) * 100
      : 0;

    let pico = -Infinity;
    let drawdownMaximo = 0;
    csvData.forEach(row => {
      pico = Math.max(pico, row.EQUITY);
      drawdownMaximo = Math.max(drawdownMaximo, pico - row.EQUITY);
    });

    const primeiraData = new Date(csvData[0].DATE);
    const ultimaData = new Date(csvData[csvData.length - 1].DATE);
    const anos = (ultimaData.getTime() - primeiraData.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const ratio = finalEquity / initialEquity;
    const cagr = anos > 0 && ratio > 0 ? Math.pow(ratio, 1 / anos) - 1 : 0;
    const score = Math.min(10, Math.max(0, (cagr * 100) / 5));

    return {
      metrics: {
        score: isNaN(score) ? 0 : score,
        fatorLucro: isFinite(fatorLucro) ? fatorLucro : 0,
        drawdownMaximo: isNaN(drawdownMaximo) ? 0 : drawdownMaximo,
        taxaAcerto: isNaN(taxaAcerto) ? 0 : taxaAcerto,
      },
      equityCurve,
    };
  };

  useEffect(() => {
    const fetchRobos = async () => {
      if (!user) return;
      try {
        const db = getDatabase();
        const refRobos = ref(db, `estrategias/${user.uid}`);
        const snapshot = await get(refRobos);
        if (snapshot.exists()) {
          const robosData = Object.entries(snapshot.val())
            .map(([id, robo]: [string, any]) => {
              if (robo.dadosCSV) {
                const { metrics, equityCurve } = calculateRoboSummary(robo.dadosCSV);

                const finalMaxDD = (robo.drawdown !== undefined && robo.drawdown !== null)
                  ? Math.abs(robo.drawdown)
                  : metrics.drawdownMaximo;

                const finalTaxaAcerto = (robo.taxaAcerto !== undefined && robo.taxaAcerto !== null)
                  ? robo.taxaAcerto
                  : metrics.taxaAcerto;

                return {
                  id,
                  // 3. ADICIONADO: Puxa o 'nome' do banco, ou usa o ID como fallback
                  nome: robo.nome || id,
                  ativo: robo.ativo || 'N/A',
                  tipo: robo.mercado || 'N/A',
                  score: metrics.score,
                  fatorLucro: metrics.fatorLucro,
                  drawdownMaximo: finalMaxDD,
                  taxaAcerto: finalTaxaAcerto,
                  equityCurve,
                };
              }
              return null;
            })
            .filter((r): r is RoboData => r !== null);
          robosData.sort((a, b) => b.score - a.score);
          setRobos(robosData);
        } else setRobos([]);
      } catch (err) {
        console.error(err);
        setRobos([]);
      }
    };
    fetchRobos();
  }, [user]);

  // Render do componente (sem alterações necessárias, apenas o RoboCard que já foi alterado)
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
      <Topbar />
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
        <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-400 p-2 font-bold text-xl">
          ☰
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-7xl mx-auto"
          >
            <h1 className="text-2xl font-bold text-white mb-6">My Library</h1>
            {robos.length === 0 ? (
              <div className="text-center p-8 bg-slate-800/50 border border-slate-700 rounded-2xl">
                <h2 className="text-xl font-semibold text-white mb-2">No Robots Found</h2>
                <p className="text-gray-400 mb-4">It seems you haven't added any robots yet.</p>
                <Link href="/robots" className="text-purple-400 hover:underline font-semibold">
                  Go to the robots page
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {robos.map((robo) => (
                  <RoboCard key={robo.id} robo={robo} />
                ))}
              </div>
            )}
          </motion.section>
        </main>
      </div>
    </div>
  );
}

// Container Principal
export default function BibliotecaPageContainer() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-gray-300">
        <div className="p-6 text-center">
          <svg className="animate-spin h-10 w-10 text-purple-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291..." />
          </svg>
          <p className="text-lg font-semibold">Loading robot library...</p>
        </div>
      </div>
    }>
      <BibliotecaContent />
    </Suspense>
  );
}