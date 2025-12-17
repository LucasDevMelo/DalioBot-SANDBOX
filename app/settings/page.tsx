'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/authcontext';
import { realtimeDB } from '@/src/firebase';
import { ref, set, onValue, push } from 'firebase/database';
import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountSettings() {
  const { user } = useAuth();
  const [magicNumber, setMagicNumber] = useState('');
  const [botName, setBotName] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);

  // Carregar contas salvas
  useEffect(() => {
    if (!user) return;
    const accountRef = ref(realtimeDB, `users/${user.uid}/mt5_accounts`);
    const unsubscribe = onValue(accountRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setAccounts(list);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !magicNumber || !botName) return;

    const accountRef = ref(realtimeDB, `users/${user.uid}/mt5_accounts`);
    await push(accountRef, {
      magicNumber,
      botName,
      createdAt: new Date().toISOString()
    });
    
    setMagicNumber('');
    setBotName('');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-gray-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>

            {/* Card de Configuração de Contas */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl text-white">Configuração de Robôs (MT5)</CardTitle>
                <p className="text-sm text-gray-400">Vincule seus robôs do MetaTrader usando o Magic Number.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Nome do Robô"
                    className="bg-slate-800 border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Magic Number"
                    className="bg-slate-800 border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={magicNumber}
                    onChange={(e) => setMagicNumber(e.target.value)}
                  />
                  <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Adicionar Robô
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-3 px-2 text-gray-400 font-medium">Nome</th>
                        <th className="py-3 px-2 text-gray-400 font-medium">Magic Number</th>
                        <th className="py-3 px-2 text-gray-400 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 text-white">{acc.botName}</td>
                          <td className="py-3 px-2 text-purple-400 font-mono">{acc.magicNumber}</td>
                          <td className="py-3 px-2 text-right">
                            <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full">Vinculado</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Card de Download do EA */}
            <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Download DalioBot Bridge EA</h3>
                    <p className="text-gray-400 text-sm">
                      Para transmitir seus dados em tempo real, baixe o nosso Expert Advisor e instale-o no seu MetaTrader 5. 
                      Use o seu UID único nas configurações do EA.
                    </p>
                    <div className="mt-4 p-2 bg-slate-800 rounded border border-slate-700 inline-block">
                      <span className="text-xs text-gray-500 block">Seu UID para o EA:</span>
                      <code className="text-purple-400 font-bold">{user?.uid}</code>
                    </div>
                  </div>
                  <a 
                    href="/downloads/DalioBot_Bridge.mq5" 
                    download 
                    className="flex items-center gap-2 bg-white text-slate-900 hover:bg-gray-200 font-bold py-3 px-6 rounded-xl transition-all shadow-lg whitespace-nowrap"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
                    </svg>
                    Baixar Expert Advisor
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}