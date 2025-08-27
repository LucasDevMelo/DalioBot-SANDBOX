'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { getDatabase, ref, get, set } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import { useRouter } from 'next/navigation';

// ✅ STEP 1: ADD THE REUSABLE SPINNER COMPONENT
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
};


export default function RobosPage() {
  const { user } = useAuth();
  const [robos, setRobos] = useState<Robo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const router = useRouter();
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [roboParaExcluir, setRoboParaExcluir] = useState<string | null>(null);



  useEffect(() => {
    const fetchRobos = async () => {
      if (!user) {
        console.log('User not logged in');
        setCarregando(false);
        return;
      }

      setCarregando(true); // Ensures loading starts on fetch
      try {
        const db = getDatabase();
        const userRobosRef = ref(db, `estrategias/${user.uid}`);
        const snapshot = await get(userRobosRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const robosData: Robo[] = Object.keys(data).map((key) => ({
            nome: data[key].nome || key, // Adds a fallback for the name
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
          setRobos([]); // Clears the list if no robots are found
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

  const handleExcluirRobo = async (nomeRobo: string) => {
    if (!user) {
      alert('You need to be logged in.');
      return;
    }

    try {
      const db = getDatabase();
      const roboRef = ref(db, `estrategias/${user.uid}/${nomeRobo}`);
      await set(roboRef, null);

      setRobos((prevRobos) => prevRobos.filter((r) => r.nome !== nomeRobo));

      alert('Robot deleted successfully!');
    } catch (error) {
      console.error('Error deleting robot:', error);
      alert('Error deleting robot.');
    }
     setMostrarPopup(false);
     setRoboParaExcluir(null);
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <div className="md:hidden p-2 bg-white shadow z-40">
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="text-purple-700 font-bold text-xl"
        >
          ☰ 
        </button>
      </div>
      <div className="flex flex-1">
        <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-white shadow-md md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>
        
        {/* ✅ STEP 2: ADD "flex" TO MAIN */}
        <main className="flex-1 bg-gray-100 p-6 flex">
          {carregando ? (
            // ✅ STEP 3: REPLACE THE TEXT WITH THE SPINNER
            <LoadingSpinner />
          ) : (
            <div className="w-full">
              {/* Main card */}
              <div className="bg-white rounded-xl p-6 shadow mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-black">My Robots</h1>
                  <button
                    onClick={() => router.push('/add')}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-1 px-3 md:py-2 md:px-4 text-xs md:text-base rounded-lg"
                  >
                    Add a Strategy
                  </button>
                </div>
                <p className="text-gray-600">Here you can manage the robots registered by you</p>
              </div>

              {robos.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 p-6 bg-white rounded-lg border">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">No robots found</h2>
                    <p>Click "Add a Strategy" to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {robos.map((robo, index) => (
                    <div
                      key={index}
                      className="bg-white text-black rounded-2xl shadow p-6 border-t-4 border-purple-600 relative"
                    >
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            setMostrarPopup(true);
                            setRoboParaExcluir(robo.nome);
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          title="Delete robot"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1H4v10a2 2 0 002 2h8a2 2 0 002-2V5h.5a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm2 5a.5.5 0 011 0v7a.5.5 0 01-1 0V7zm4 0a.5.5 0 011 0v7a.5.5 0 01-1 0V7z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      <h2 className="text-xl font-bold mb-1">{robo.nome}</h2>

                      <div className="text-sm text-gray-600 space-y-2">
                        <p><strong>Market:</strong> {robo.mercado}</p>
                        <p><strong>Asset:</strong> {robo.ativo}</p>
                        <p><strong>Total Balance:</strong> R$ {robo.saldoTotal?.toFixed(2)}</p>
                        <p><strong>Profit Factor:</strong> {robo.fatorLucro}</p>
                        <p><strong>Period:</strong> {robo.historicoInicio} - {robo.historicoFim}</p>
                      </div>

                      <div className="mt-4">
                        <a
                          onClick={() => router.push(`/dashboard?id=${encodeURIComponent(robo.nome)}&origem=robos`)}
                          className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg cursor-pointer"
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
          {mostrarPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 md:p-6 rounded-md shadow-lg max-w-sm w-11/12 md:w-full">
                <h3 className="text-lg font-semibold mb-4">Are you sure you want to delete the strategy "{roboParaExcluir}"?</h3>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setMostrarPopup(false);
                      setRoboParaExcluir(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => roboParaExcluir && handleExcluirRobo(roboParaExcluir)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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