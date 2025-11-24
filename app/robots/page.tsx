'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';
// ✅ IMPORTAÇÕES: Adicionado 'update' para editar os dados
import { getDatabase, ref, get, remove, update } from 'firebase/database';

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

// ✅ Atualizei a tipagem para incluir os campos do formulário de edição
type Robo = {
  keyFirebase: string;
  nome: string;
  mercado: string;
  ativo: string;
  tipo?: string;        // Adicionado
  descricao?: string;   // Adicionado
  saldoTotal?: number;
  fatorLucro?: number;
  historicoInicio?: string;
  historicoFim?: string;
  criadoEm: string;
  caminho: string;
  privado?: boolean;
};

export default function RobosPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [robos, setRobos] = useState<Robo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  // --- ESTADOS PARA EXCLUSÃO ---
  const [mostrarPopupExcluir, setMostrarPopupExcluir] = useState(false);
  const [roboParaExcluir, setRoboParaExcluir] = useState<{ nome: string, key: string } | null>(null);

  // --- ESTADOS PARA EDIÇÃO (POP-UP) ---
  const [mostrarEditPopup, setMostrarEditPopup] = useState(false);
  const [roboParaEditar, setRoboParaEditar] = useState<Robo | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // --- CARREGAR ROBÔS ---
  useEffect(() => {
    const fetchRobos = async () => {
      if (!user) {
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
          const robosData: Robo[] = Object.keys(data).map((key) => ({
            keyFirebase: key,
            nome: data[key].nome || key,
            criadoEm: data[key].criadoEm,
            caminho: data[key].caminho,
            mercado: data[key].mercado,
            ativo: data[key].ativo,
            tipo: data[key].tipo || '',           // Garante string vazia se não existir
            descricao: data[key].descricao || '', // Garante string vazia se não existir
            saldoTotal: data[key].saldoTotal || 0,
            fatorLucro: data[key].fatorLucro || 0,
            historicoInicio: data[key].historicoInicio || 'N/A',
            historicoFim: data[key].historicoFim || 'N/A',
            privado: data[key].privado ?? true,
          }));

          setRobos(robosData);
        } else {
          setRobos([]);
        }
      } catch (error) {
        console.error('Error fetching robots:', error);
      } finally {
        setCarregando(false);
      }
    };

    fetchRobos();
  }, [user]);

  // --- FUNÇÃO DE EXCLUIR ---
  const handleExcluirRobo = async () => {
    if (!user || !roboParaExcluir) return;

    try {
      const db = getDatabase();
      const roboRef = ref(db, `estrategias/${user.uid}/${roboParaExcluir.key}`);
      await remove(roboRef);

      setRobos((prev) => prev.filter((r) => r.keyFirebase !== roboParaExcluir.key));
      // alert('Robot deleted successfully!'); // Opcional: removi para ficar mais fluido
    } catch (error) {
      console.error('Error deleting robot:', error);
      alert('Error deleting robot.');
    }
    setMostrarPopupExcluir(false);
    setRoboParaExcluir(null);
  };

  // --- FUNÇÃO DE SALVAR EDIÇÃO ---
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !roboParaEditar) return;

    setSalvandoEdicao(true);
    try {
        const db = getDatabase();
        const roboRef = ref(db, `estrategias/${user.uid}/${roboParaEditar.keyFirebase}`);

        // Atualiza apenas os campos editáveis no Firebase
        await update(roboRef, {
            nome: roboParaEditar.nome,
            mercado: roboParaEditar.mercado,
            ativo: roboParaEditar.ativo,
            tipo: roboParaEditar.tipo,
            descricao: roboParaEditar.descricao,
        });

        // Atualiza o estado local para refletir a mudança imediatamente na tela
        setRobos((prev) => 
            prev.map((r) => r.keyFirebase === roboParaEditar.keyFirebase ? roboParaEditar : r)
        );

        setMostrarEditPopup(false);
        setRoboParaEditar(null);
        // alert('Updated successfully!'); // Opcional
    } catch (error) {
        console.error("Error updating:", error);
        alert("Error updating strategy.");
    } finally {
        setSalvandoEdicao(false);
    }
  };

  // --- FUNÇÃO AUXILIAR PARA ABRIR O MODAL DE EDIÇÃO ---
  const abrirModalEdicao = (robo: Robo) => {
    // Cria uma cópia do objeto para editar sem alterar a lista principal imediatamente
    setRoboParaEditar({ ...robo });
    setMostrarEditPopup(true);
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
                      {/* BOTOES DE AÇÃO (EDITAR E EXCLUIR) */}
                      <div className="absolute top-4 right-4 flex gap-2 z-10">
                        
                        {/* ✏️ Botão de Editar (Abre o Modal) */}
                        <button
                          onClick={() => abrirModalEdicao(robo)}
                          className="text-blue-400 hover:text-blue-300 transition p-1 rounded-full hover:bg-slate-700/50"
                          title="Edit robot"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>

                        {/* 🗑️ Botão de Excluir (Abre Popup de Exclusão) */}
                        <button
                          onClick={() => {
                            setRoboParaExcluir({ nome: robo.nome, key: robo.keyFirebase });
                            setMostrarPopupExcluir(true);
                          }}
                          className="text-purple-400 hover:text-purple-300 transition p-1 rounded-full hover:bg-slate-700/50"
                          title="Delete robot"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1H4v10a2 2 0 002 2h8a2 2 0 002-2V5h.5a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm2 5a.5.5 0 011 0v7a.5.5 0 01-1 0V7zm4 0a.5.5 0 011 0v7a.5.5 0 01-1 0V7z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* Título */}
                      <h2 className="text-lg font-semibold text-white mb-2 pr-16 truncate">
                        {robo.nome}
                      </h2>

                      <div className="text-sm text-gray-400 space-y-1">
                        <p><strong className="text-gray-300">Market:</strong> {robo.mercado}</p>
                        <p><strong className="text-gray-300">Asset:</strong> {robo.ativo}</p>
                        <p><strong className="text-gray-300">Total Balance:</strong> R$ {robo.saldoTotal?.toFixed(2)}</p>
                        <p><strong className="text-gray-300">Profit Factor:</strong> {robo.fatorLucro}</p>
                        <p><strong className="text-gray-300">Period:</strong> {robo.historicoInicio} - {robo.historicoFim}</p>
                      </div>

                      <div className="mt-5">
                        <a
                          onClick={() => router.push(`/dashboard?id=${encodeURIComponent(robo.keyFirebase)}&origem=robos`)}
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

          {/* ========================================================== */}
          {/* MODAL DE EDIÇÃO (Pop-up similar à imagem que você enviou) */}
          {/* ========================================================== */}
          {mostrarEditPopup && roboParaEditar && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Edit Strategy</h2>
                    <button onClick={() => setMostrarEditPopup(false)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSalvarEdicao} className="space-y-5">
                    
                    {/* Grid para os campos superiores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Nome */}
                        <div className="flex flex-col">
                            <input 
                                type="text" 
                                placeholder="Strategy Name"
                                value={roboParaEditar.nome}
                                onChange={(e) => setRoboParaEditar({...roboParaEditar, nome: e.target.value})}
                                className="p-3 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                required
                            />
                        </div>

                        {/* Mercado */}
                        <div className="flex flex-col">
                            <select 
                                value={roboParaEditar.mercado}
                                onChange={(e) => setRoboParaEditar({...roboParaEditar, mercado: e.target.value})}
                                className="p-3 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                required
                            >
                                <option value="">Select Market</option>
                                <option>Forex</option><option>Stocks</option><option>Crypto</option><option>Index</option><option>Commodities</option>
                            </select>
                        </div>

                        {/* Ativo */}
                        <div className="flex flex-col">
                            <select 
                                value={roboParaEditar.ativo}
                                onChange={(e) => setRoboParaEditar({...roboParaEditar, ativo: e.target.value})}
                                className="p-3 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                required
                            >
                                <option value="">Select Asset</option>
                                <option>S&P500</option><option>NASDAQ</option><option>DOW JONES</option><option>DAX</option><option>FTSE 100</option><option>NIKKEI 225</option><option>EURUSD</option><option>GBPUSD</option><option>USDJPY</option><option>AUDUSD</option><option>XAUUSD</option><option>XAGUSD</option><option>WTI OIL</option><option>AAPL</option><option>MSFT</option><option>GOOGL</option><option>AMZN</option><option>NVDA</option><option>TSLA</option><option>Other</option>
                            </select>
                        </div>

                        {/* Tipo */}
                        <div className="flex flex-col">
                            <select 
                                value={roboParaEditar.tipo}
                                onChange={(e) => setRoboParaEditar({...roboParaEditar, tipo: e.target.value})}
                                className="p-3 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                required
                            >
                                <option value="">Select Type</option>
                                <option>Day Trade</option><option>Swing Trade</option><option>Scalping</option><option>Position Trade</option><option>Long-Term Investment</option>
                            </select>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="flex flex-col">
                        <textarea 
                            rows={4}
                            placeholder="Strategy description..."
                            value={roboParaEditar.descricao}
                            onChange={(e) => setRoboParaEditar({...roboParaEditar, descricao: e.target.value})}
                            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                            required
                        ></textarea>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setMostrarEditPopup(false)}
                            className="px-5 py-2.5 rounded-lg bg-transparent border border-slate-600 text-gray-300 hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={salvandoEdicao}
                            className="px-8 py-2.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition shadow-[0_0_15px_theme(colors.purple.500/30)] flex items-center"
                        >
                            {salvandoEdicao ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
              </div>
            </div>
          )}


          {/* Modal de Confirmação de EXCLUSÃO */}
          {mostrarPopupExcluir && roboParaExcluir && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl max-w-sm w-11/12">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Are you sure you want to delete
                  <span className="text-purple-400"> "{roboParaExcluir.nome}"</span>?
                </h3>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setMostrarPopupExcluir(false);
                      setRoboParaExcluir(null);
                    }}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExcluirRobo}
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