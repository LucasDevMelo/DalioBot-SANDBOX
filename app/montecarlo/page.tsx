'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { getDatabase, ref, get } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';
import { LineChart, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

// --- INTERFACES ---
type Robo = {
  id: string; // <--- CORREÇÃO 1: Adicionado ID para garantir unicidade
  nome: string;
  mercado: string;
  ativo: string;
  historicoInicio: string;
  historicoFim: string;
  saldoTotal: number;
  fatorLucro: number;
  drawdown?: number;
};

// --- COMPONENTES AUXILIARES ---
function LoadingSpinner() {
  return (
    <div className="flex flex-1 justify-center items-center h-full p-8">
      <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
}

function AccessDeniedGate({ message }: { message: string }) {
  const router = useRouter();
  return (
    <main className="flex-1 w-full p-4 sm:p-6 flex flex-col justify-center items-center">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-lg text-center text-white max-w-md">
        <Lock className="mx-auto h-12 w-12 text-yellow-500" />
        <h2 className="mt-4 text-xl font-bold">Restricted Access</h2>
        <p className="mt-2 text-gray-400">{message}</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-6 inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-[0_0_15px_theme(colors.purple.500/40)]"
        >
          Login
        </button>
      </div>
    </main>
  );
}

// --- COMPONENTES DE EXIBIÇÃO ---
const RoboTableDesktop = ({ robos, onSimulate }: { robos: Robo[]; onSimulate: (robo: Robo) => void }) => (
  <div className="hidden md:block w-full">
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
      <table className="min-w-full text-gray-300 text-sm">
        <thead className="bg-slate-800/70 text-gray-400 text-xs uppercase">
          <tr>
            <th className="py-3 px-4 text-left">Robot</th>
            <th className="py-3 px-4 text-left hidden lg:table-cell">Market</th>
            <th className="py-3 px-4 text-left hidden lg:table-cell">Asset</th>
            <th className="py-3 px-4 text-left hidden xl:table-cell">Period</th>
            <th className="py-3 px-4 text-right">Balance</th>
            <th className="py-3 px-4 text-right">Profit Factor</th>
            <th className="py-3 px-4 text-right">Drawdown</th>
            <th className="py-3 px-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {robos.map((robo) => (
            // <--- CORREÇÃO 3: key={robo.id}
            <tr key={robo.id} className="hover:bg-slate-700/40 transition-colors">
              <td className="py-3 px-4 font-semibold text-purple-400">{robo.nome}</td>
              <td className="py-3 px-4 hidden lg:table-cell">{robo.mercado}</td>
              <td className="py-3 px-4 hidden lg:table-cell">{robo.ativo}</td>
              <td className="py-3 px-4 hidden xl:table-cell text-gray-400">{robo.historicoInicio} - {robo.historicoFim}</td>
              <td className="py-3 px-4 text-right">${robo.saldoTotal.toFixed(2)}</td>
              <td className="py-3 px-4 text-right text-purple-300">{robo.fatorLucro.toFixed(2)}</td>
              <td className="py-3 px-4 text-right text-red-400">${robo.drawdown?.toFixed(2) ?? '0.00'}</td>
              <td className="py-3 px-4 text-center">
                <button
                  onClick={() => onSimulate(robo)}
                  className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 justify-center transition-colors"
                >
                  <LineChart size={16} />
                  Simulate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const RoboCardMobile = ({ robo, onSimulate }: { robo: Robo; onSimulate: (robo: Robo) => void }) => (
  <motion.div 
    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 shadow-sm text-gray-200 flex flex-col gap-3"
    whileHover={{ scale: 1.02 }}
  >
    <h3 className="font-bold text-lg text-purple-400 truncate">{robo.nome}</h3>
    <div className="text-sm space-y-1">
      <p><span className="text-gray-400">Market:</span> {robo.mercado}</p>
      <p><span className="text-gray-400">Asset:</span> {robo.ativo}</p>
      <p><span className="text-gray-400">Balance:</span> ${robo.saldoTotal.toFixed(2)}</p>
      <p><span className="text-gray-400">Profit Factor:</span> {robo.fatorLucro.toFixed(2)}</p>
      <p><span className="text-gray-400">Drawdown:</span> ${robo.drawdown?.toFixed(2) ?? '0.00'}</p>
      <p className="text-xs text-gray-500 mt-1">Period: {robo.historicoInicio} → {robo.historicoFim}</p>
    </div>
    <button
      onClick={() => onSimulate(robo)}
      className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_theme(colors.purple.500/30)]"
    >
      <LineChart size={18} />
      View Simulation
    </button>
  </motion.div>
);

// --- PÁGINA PRINCIPAL ---
export default function MontecarloPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [robos, setRobos] = useState<Robo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [quantidadeSimulacoes, setQuantidadeSimulacoes] = useState(100);
  const MAX_SIMULATIONS_BETA = 1500;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCarregando(false);
      setRobos([]);
      return;
    }

    const fetchRobos = async () => {
      try {
        const db = getDatabase();
        const userRobosRef = ref(db, `estrategias/${user.uid}`);
        const snapshot = await get(userRobosRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // --- CORREÇÃO 2: Usando Object.entries para resgatar o ID ---
          const robosData: Robo[] = Object.entries(data).map(([key, robo]: [string, any]) => ({
            id: key, // Captura a chave única do Firebase
            nome: robo.nome,
            mercado: robo.mercado,
            ativo: robo.ativo,
            historicoInicio: robo.historicoInicio || 'N/A',
            historicoFim: robo.historicoFim || 'N/A',
            saldoTotal: robo.saldoTotal || 0,
            fatorLucro: robo.fatorLucro || 0,
            drawdown: robo.drawdown || 0,
          }));
          
          setRobos(robosData);
        } else {
          setRobos([]);
        }
      } catch (error) {
        console.error('Error fetching robots:', error);
        setRobos([]);
      } finally {
        setCarregando(false);
      }
    };

    fetchRobos();
  }, [user, authLoading]);

  const handleVerSimulacao = (robo: Robo) => {
    if (quantidadeSimulacoes > MAX_SIMULATIONS_BETA) {
      alert(`In the beta version, you can simulate a maximum of ${MAX_SIMULATIONS_BETA} simulations.`);
      setQuantidadeSimulacoes(MAX_SIMULATIONS_BETA);
      return;
    }
    router.push(`/montecarlosimulation?robo=${encodeURIComponent(robo.nome)}&simulacoes=${quantidadeSimulacoes}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
      <Topbar />

      {/* Sidebar mobile */}
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
        <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-400 font-bold text-xl p-2">
          ☰
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>

        {/* Conteúdo principal */}
        {authLoading ? (
          <main className="flex-1 w-full p-6 flex flex-col">
            <LoadingSpinner />
          </main>
        ) : !user ? (
          <AccessDeniedGate message="You must be logged in to access the Monte Carlo Simulation." />
        ) : (
          <main className="flex-1 w-full p-6 lg:p-8 flex flex-col">
            <motion.header 
              className="mb-8"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-3xl font-bold text-white mb-1">Monte Carlo Simulation</h1>
              <p className="text-gray-400">Stress test your strategies to check their robustness.</p>
              <div className="mt-3 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-md p-3">
                You are using the <b>BETA version</b>. All simulations are <span className="font-semibold text-purple-400">fully unlocked</span>.
              </div>
            </motion.header>

            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-sm flex-1 flex flex-col"
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
                <div>
                  <label htmlFor="simulations" className="font-medium text-gray-300 flex items-center gap-2">
                    Number of Simulations:
                  </label>
                  <input
                    id="simulations"
                    type="number"
                    min={1}
                    max={MAX_SIMULATIONS_BETA}
                    value={quantidadeSimulacoes}
                    onChange={(e) => setQuantidadeSimulacoes(Number(e.target.value))}
                    className="border border-slate-600 bg-slate-900 rounded-md p-2 w-32 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: {MAX_SIMULATIONS_BETA}</p>
                </div>
              </div>

              {carregando ? (
                <LoadingSpinner />
              ) : robos.length === 0 ? (
                <div className="text-center text-gray-400 my-10 p-8 border-2 border-dashed border-slate-700 rounded-xl">
                  <h3 className="text-lg font-semibold text-white">No robots found.</h3>
                  <p className="text-sm mt-2">
                    Go to <a href="/robots" className="text-purple-400 hover:underline">My Robots</a> to add one.
                  </p>
                </div>
              ) : (
                <div className="flex-1">
                  <RoboTableDesktop robos={robos} onSimulate={handleVerSimulacao} />
                  <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {robos.map((robo) => (
                      // <--- CORREÇÃO 3: key={robo.id}
                      <RoboCardMobile key={robo.id} robo={robo} onSimulate={handleVerSimulacao} />
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          </main>
        )}
      </div>
    </div>
  );
}