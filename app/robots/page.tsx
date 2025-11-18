'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';
// ✅ IMPORTAÇÕES CORRIGIDAS: Adicionando 'remove' e mantendo 'get' e 'ref'
import { getDatabase, ref, get, remove } from 'firebase/database';

// 🔄 Reusable Spinner (Dark Mode)
function LoadingSpinner() {
  return (
    <div className="flex flex-1 justify-center items-center h-full p-8">
      <svg
        className="animate-spin h-10 w-10 text-purple-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
          5.291A7.962 7.962 0 014 12H0c0 
          3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
}

type Robo = {
  nome: string;
  criadoEm: string;
  caminho: string;
  mercado: string;
  ativo: string;
  saldoTotal?: number;
  fatorLucro?: number;
  historicoInicio?: string;
  historicoFim?: string;
  privado?: boolean;
  keyFirebase: string; // ✅ Adicionando a chave real do Firebase
};

export default function RobosPage() {
  const { user } = useAuth();
  const [robos, setRobos] = useState<Robo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const router = useRouter();
  const [mostrarPopup, setMostrarPopup] = useState(false);

  // Nome do robô para exibição no modal
  const [roboParaExcluir, setRoboParaExcluir] = useState<string | null>(null);
  // ✅ Chave REAL do Firebase para a operação de remoção
  const [roboKeyParaExcluir, setRoboKeyParaExcluir] = useState<string | null>(null);


  useEffect(() => {
    const fetchRobos = async () => {
      if (!user) {
        console.log('User not logged in');
        setCarregando(false);
        return;
      }

      setCarregando(true);
      try {
        const db = getDatabase();
        const userRobosRef = ref(db, `estrategias/${user.uid}`);
        const snapshot = await get(userRobosRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          // ✅ Mapeando a KEY real do Firebase (key) para keyFirebase
          const robosData: Robo[] = Object.keys(data).map((key) => ({
            nome: data[key].nome || key,
            keyFirebase: key, // << A chave real é essencial para o remove()
            criadoEm: data[key].criadoEm,
            caminho: data[key].caminho,
            mercado: data[key].mercado,
            ativo: data[key].ativo,
            saldoTotal: data[key].saldoTotal || 0,
            fatorLucro: data[key].fatorLucro || 0,
            historicoInicio: data[key].historicoInicio || 'N/A',
            historicoFim: data[key].historicoFim || 'N/A',
            privado: data[key].privado ?? true,
          }));

          setRobos(robosData);
        } else {
          console.log('No robots found.');
          setRobos([]);
        }
      } catch (error) {
        console.error('Error fetching robots:', error);
        alert('Error loading robots.');
      } finally {
        setCarregando(false);
      }
    };

    fetchRobos();
  }, [user]);

  // ✅ FUNÇÃO CORRIGIDA: Recebe a chave real do Firebase e o nome de exibição
  const handleExcluirRobo = async (keyRobo: string, nomeExibicao: string) => {
    if (!user) {
      alert('You need to be logged in.');
      return;
    }

    try {
      const db = getDatabase();
      // Usamos a KEY REAL para montar a referência, garantindo que o nó correto seja apagado.
      const roboRef = ref(db, `estrategias/${user.uid}/${keyRobo}`);
      await remove(roboRef); // remove() é o método correto para exclusão.

      // Filtra pelo keyFirebase
      setRobos((prevRobos) => prevRobos.filter((r) => r.keyFirebase !== keyRobo));
      alert('Robot deleted successfully!');
    } catch (error) {
      console.error('Error deleting robot:', error);
      alert('Error deleting robot. Check console for details.');
    }
    setMostrarPopup(false);
    setRoboParaExcluir(null);
    setRoboKeyParaExcluir(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
      <Topbar />
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="text-purple-400 font-bold text-xl p-2"
        >
          ☰
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`absolute md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0`}
        >
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {carregando ? (
            <LoadingSpinner />
          ) : (
            <div className="w-full max-w-7xl mx-auto">
              {/* Header Section */}
              <section className="mb-10">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                    <h1 className="text-2xl font-bold text-white">
                      My Robots
                    </h1>
                    <button
                      onClick={() => router.push('/add')}
                      className="mt-3 md:mt-0 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow-[0_0_10px_theme(colors.purple.500/40)] transition-all"
                    >
                      + Add a Strategy
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Manage and analyze all your registered robots in one place.
                  </p>
                </div>
              </section>

              {/* Robots Section */}
              {robos.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 p-10 bg-slate-800/50 border border-slate-700 rounded-2xl shadow-lg">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    No robots found
                  </h2>
                  <p>Click “Add a Strategy” to register your first robot.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {robos.map((robo, index) => (
        <div
            key={index}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg relative group overflow-hidden transition-transform hover:scale-[1.02]"
        >
            {/* Delete button CONTAINER - AJUSTADO PARA top-4 e right-4 */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={() => {
                        setMostrarPopup(true);
                        setRoboParaExcluir(robo.nome);
                        setRoboKeyParaExcluir(robo.keyFirebase);
                    }}
                    className="text-purple-400 hover:text-purple-300 transition p-1 rounded-full hover:bg-slate-700/50" // Adicionado padding e hover para melhor UX
                    title="Delete robot"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1H4v10a2 
                            2 0 002 2h8a2 2 0 002-2V5h.5a.5.5 0 
                            000-1H15V3a1 1 0 00-1-1H6zm2 
                            5a.5.5 0 011 0v7a.5.5 0 01-1 
                            0V7zm4 0a.5.5 0 011 0v7a.5.5 
                            0 01-1 0V7z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            {/* Título - Adicionado pr-6 (padding right) para evitar colisão com o botão */}
            <h2 className="text-lg font-semibold text-white mb-2 pr-6">
                {robo.nome}
            </h2>

            <div className="text-sm text-gray-400 space-y-1">
                <p>
                    <strong className="text-gray-300">Market:</strong>{' '}
                    {robo.mercado}
                </p>
                <p>
                    <strong className="text-gray-300">Asset:</strong>{' '}
                    {robo.ativo}
                </p>
                <p>
                    <strong className="text-gray-300">Total Balance:</strong>{' '}
                    R$ {robo.saldoTotal?.toFixed(2)}
                </p>
                <p>
                    <strong className="text-gray-300">Profit Factor:</strong>{' '}
                    {robo.fatorLucro}
                </p>
                <p>
                    <strong className="text-gray-300">Period:</strong>{' '}
                    {robo.historicoInicio} - {robo.historicoFim}
                </p>
            </div>

            <div className="mt-5">
                <a
                    onClick={() =>
                        router.push(
                            `/dashboard?id=${encodeURIComponent(
                                robo.keyFirebase
                            )}&origem=robos`
                        )
                    }
                    className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg cursor-pointer transition-colors shadow-[0_0_10px_theme(colors.purple.500/40)]"
                >
                    Details
                </a>
            </div>
        </div>
    ))}
</div>
              )}
            </div>
          )}

          {/* Modal de Confirmação */}
          {mostrarPopup && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl max-w-sm w-11/12">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Are you sure you want to delete
                  <span className="text-purple-400"> "{roboParaExcluir}"</span>?
                </h3>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setMostrarPopup(false);
                      setRoboParaExcluir(null);
                      setRoboKeyParaExcluir(null); // Limpa a chave também
                    }}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      // ✅ Chamada correta com a chave real (keyFirebase) e o nome
                      roboKeyParaExcluir && roboParaExcluir && handleExcluirRobo(roboKeyParaExcluir, roboParaExcluir)
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}