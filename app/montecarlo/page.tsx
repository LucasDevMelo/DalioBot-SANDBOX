'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { getDatabase, ref, get } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';
import { LineChart, Lock } from 'lucide-react';
import UpgradeModal from '@/src/components/UpgradeModal';
import { getPlanNameFromPriceId } from '@/src/utils/paddleUtils';

// --- INTERFACES AND TYPES ---
type Robo = {
  nome: string;
  mercado: string;
  ativo: string;
  historicoInicio: string;
  historicoFim: string;
  saldoTotal: number;
  fatorLucro: number;
  drawdown?: number;
};

// --- COMPONENTS ---
function LoadingSpinner() {
  return (
    <div className="flex flex-1 justify-center items-center h-full p-8">
      <svg className="animate-spin h-10 w-10 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
}

function AccessDeniedGate({ message, onUpgradeClick }: { message: string; onUpgradeClick: () => void }) {
  return (
    <main className="flex-1 w-full p-4 sm:p-6 flex flex-col justify-center items-center">
      <div className="bg-white p-8 rounded-2xl shadow-md border max-w-md w-full text-center">
        <Lock className="mx-auto h-12 w-12 text-yellow-500" />
        <h2 className="mt-4 text-xl font-bold text-gray-800">Restricted Access</h2>
        <p className="mt-2 text-gray-600">{message}</p>
        <button
          onClick={onUpgradeClick}
          className="mt-6 inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Upgrade
        </button>
      </div>
    </main>
  );
}

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-b-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold text-gray-800 text-right">{value}</span>
  </div>
);

const RoboCardMobile = ({ robo, onSimulate }: { robo: Robo; onSimulate: (robo: Robo) => void }) => (
  <div className="bg-white border rounded-xl p-4 shadow-sm text-black flex flex-col gap-3">
    <h3 className="font-bold text-lg text-purple-700 truncate">{robo.nome}</h3>
    <div className="space-y-1">
      <StatItem label="Market" value={robo.mercado} />
      <StatItem label="Asset" value={robo.ativo} />
      <StatItem label="Total Balance" value={`$ ${robo.saldoTotal.toFixed(2)}`} />
      <StatItem label="Profit Factor" value={robo.fatorLucro.toFixed(2)} />
      <StatItem label="Drawdown" value={`$ ${robo.drawdown?.toFixed(2) ?? '0.00'}`} />
    </div>
    <div className="text-center text-xs text-gray-400 mt-2">
      <p>Period: {robo.historicoInicio} to {robo.historicoFim}</p>
    </div>
    <button
      onClick={() => onSimulate(robo)}
      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
    >
      <LineChart size={18} />
      View Simulation
    </button>
  </div>
);

const RoboTableDesktop = ({ robos, onSimulate }: { robos: Robo[]; onSimulate: (robo: Robo) => void }) => (
  <div className="hidden md:block w-full">
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full bg-white text-black">
        <thead className="bg-gray-50 text-gray-600 text-sm font-medium">
          <tr>
            <th className="py-3 px-4 text-left">Robot</th>
            <th className="py-3 px-4 text-left hidden lg:table-cell">Market</th>
            <th className="py-3 px-4 text-left hidden lg:table-cell">Asset</th>
            <th className="py-3 px-4 text-left hidden xl:table-cell">Period</th>
            <th className="py-3 px-4 text-right">Total Balance</th>
            <th className="py-3 px-4 text-right">Profit Factor</th>
            <th className="py-3 px-4 text-right">Drawdown</th>
            <th className="py-3 px-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-sm">
          {robos.map((robo) => (
            <tr key={robo.nome} className="hover:bg-gray-50/70 transition-colors">
              <td className="py-3 px-4 font-semibold text-purple-800">{robo.nome}</td>
              <td className="py-3 px-4 hidden lg:table-cell">{robo.mercado}</td>
              <td className="py-3 px-4 hidden lg:table-cell">{robo.ativo}</td>
              <td className="py-3 px-4 hidden xl:table-cell">{robo.historicoInicio} - {robo.historicoFim}</td>
              <td className="py-3 px-4 text-right">$ {robo.saldoTotal.toFixed(2)}</td>
              <td className="py-3 px-4 text-right">{robo.fatorLucro.toFixed(2)}</td>
              <td className="py-3 px-4 text-right text-red-600">$ {robo.drawdown?.toFixed(2) ?? '0.00'}</td>
              <td className="py-3 px-4">
                <div className="flex justify-center">
                  <button
                    onClick={() => onSimulate(robo)}
                    title={`Simulate ${robo.nome}`}
                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <LineChart size={16} />
                    Simulate
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function MontecarloPage() {
  const { user, loading: authLoading, subscription } = useAuth();
  const router = useRouter();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [robos, setRobos] = useState<Robo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [quantidadeSimulacoes, setQuantidadeSimulacoes] = useState(100);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Limits per plan
  const PLAN_LIMITS = {
    starter: { maxSimulations: 0, name: 'Starter' },
    basic: { maxSimulations: 500, name: 'Basic' },
    pro: { maxSimulations: 1500, name: 'Pro' },
  };

  const userPlanName = getPlanNameFromPriceId(subscription?.planName) || 'starter';
  const currentPlanLimits = PLAN_LIMITS[userPlanName as keyof typeof PLAN_LIMITS];

  // Unlocks Monte Carlo if PRO is active or if the plan has simulations available

  const canUseMonteCarlo =
    userPlanName === 'pro' && subscription?.isActive === true;
  useEffect(() => {
    if (authLoading) return;

    if (!user || !canUseMonteCarlo) {
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
          const robosData: Robo[] = Object.values(data).map((robo: any) => ({
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
        console.error('Error searching for robots:', error);
        setRobos([]);
      } finally {
        setCarregando(false);
      }
    };

    fetchRobos();
  }, [user, authLoading, canUseMonteCarlo]);

  const handleVerSimulacao = (robo: Robo) => {
    if (quantidadeSimulacoes <= 0) {
      alert('Please enter a valid number of simulations (greater than 0).');
      return;
    }
    if (quantidadeSimulacoes > currentPlanLimits.maxSimulations) {
      alert(`Your ${currentPlanLimits.name} plan allows a maximum of ${currentPlanLimits.maxSimulations} simulations.`);
      setQuantidadeSimulacoes(currentPlanLimits.maxSimulations);
      return;
    }
    router.push(`/montecarlosimulation?robo=${encodeURIComponent(robo.nome)}&simulacoes=${quantidadeSimulacoes}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
        <Topbar />
        <div className="md:hidden p-2 bg-white shadow-md z-40 sticky top-0">
            <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-700 font-bold text-xl">
                ☰
            </button>
        </div>
        <div className="flex flex-1">
            <div className={`fixed md:static z-30 transition-transform duration-300 transform bg-white shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <Sidebar />
            </div>

            {/* --- INÍCIO DA LÓGICA DE RENDERIZAÇÃO ATUALIZADA --- */}

            {authLoading ? (
                // ESTADO 1: Carregando dados de autenticação
                <main className="flex-1 w-full p-4 sm:p-6 flex flex-col">
                    <LoadingSpinner />
                </main>
            ) : canUseMonteCarlo ? (
                // ESTADO 2: Acesso permitido, mostra o conteúdo principal
                <main className="flex-1 w-full p-4 sm:p-6 flex flex-col">
                    <header className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Monte Carlo Simulation</h1>
                        <p className="text-gray-500 mt-1">Stress test your strategies to check their robustness.</p>
                        <div className="mt-2 text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-md p-2">
                            You are on the <strong>{currentPlanLimits.name}</strong> plan. Simulations limit: {currentPlanLimits.maxSimulations}.
                        </div>
                    </header>

                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm flex-1 flex flex-col">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
                            <div>
                                <label htmlFor="simulations" className="font-medium text-gray-700 flex items-center gap-2">
                                    Number of Simulations:
                                </label>
                                <input
                                    id="simulations"
                                    type="number"
                                    min={1}
                                    max={currentPlanLimits.maxSimulations}
                                    value={quantidadeSimulacoes}
                                    onChange={(e) => setQuantidadeSimulacoes(Number(e.target.value))}
                                    className="border border-gray-300 rounded-md p-2 w-32 text-black focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">Max: {currentPlanLimits.maxSimulations}</p>
                            </div>
                        </div>

                        {carregando ? (
                            <LoadingSpinner />
                        ) : robos.length === 0 ? (
                            <div className="text-center text-gray-500 my-10 p-6 border-2 border-dashed rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800">No robots found.</h3>
                                <p className="text-sm mt-2">
                                    Go to page <a href="/robots" className="text-purple-600 hover:underline font-medium">My robots</a> to add a strategy.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1">
                                <RoboTableDesktop robos={robos} onSimulate={handleVerSimulacao} />
                                <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {robos.map((robo) => (
                                        <RoboCardMobile key={robo.nome} robo={robo} onSimulate={handleVerSimulacao} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            ) : subscription?.isActive === false ? (
                // ESTADO 3: Acesso negado PORQUE a assinatura está inativa
                <AccessDeniedGate
                    message="Your plan is not active, click the button to renew your subscription."
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                />
            ) : (
                // ESTADO 4: Acesso negado PORQUE o plano está incorreto
                <AccessDeniedGate
                    message={`You are in the plan ${currentPlanLimits.name}. This feature is only available for the Pro plan.`}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                />
            )}
            {/* --- FIM DA LÓGICA DE RENDERIZAÇÃO ATUALIZADA --- */}
            
        </div>
        <UpgradeModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
        />
    </div>
);
}