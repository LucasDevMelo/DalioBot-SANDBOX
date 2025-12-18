'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/authcontext';
import { realtimeDB } from '@/src/firebase';
import { ref, onValue, push } from 'firebase/database';
import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountSettings() {
  const { user } = useAuth();
  const [accountNumber, setAccountNumber] = useState('');
  const [magicNumber, setMagicNumber] = useState('');
  const [botName, setBotName] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [lastSignalTime, setLastSignalTime] = useState<string | null>(null);

  // Carregar contas e monitorar sinal em tempo real
  useEffect(() => {
    if (!user) return;

    // Referência para as contas de robôs cadastradas
    const accountRef = ref(realtimeDB, `users/${user.uid}/mt5_accounts`);
    const unsubAccounts = onValue(accountRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setAccounts(list);
      }
    });

    // Monitorar a última atualização enviada pela ponte MT5
    const analysisRef = ref(realtimeDB, `analysis/${user.uid}/lastUpdate`);
    const unsubAnalysis = onValue(analysisRef, (snapshot) => {
      setLastSignalTime(snapshot.val());
    });

    return () => {
      unsubAccounts();
      unsubAnalysis();
    };
  }, [user]);

  // Lógica para verificar se o status é Ativo (tolerância de 5 minutos)
  const isBotActive = () => {
    if (!lastSignalTime) return false;
    const lastUpdate = new Date(lastSignalTime).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - lastUpdate) / (1000 * 60);
    return diffInMinutes < 5; 
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accountNumber || !magicNumber || !botName) return;

    const accountRef = ref(realtimeDB, `users/${user.uid}/mt5_accounts`);
    await push(accountRef, {
      accountNumber,
      magicNumber,
      botName,
      createdAt: new Date().toISOString()
    });
    
    setAccountNumber('');
    setMagicNumber('');
    setBotName('');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-gray-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl text-white">Robot Configuration (MT5)</CardTitle>
                <p className="text-sm text-gray-400">Link your MetaTrader robots using the Account Number and Magic Number.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Account No."
                    className="bg-slate-800 border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Robot Name"
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
                    Add Robot
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-3 px-2 text-gray-400 font-medium">Account No.</th>
                        <th className="py-3 px-2 text-gray-400 font-medium">Robot Name</th>
                        <th className="py-3 px-2 text-gray-400 font-medium">Magic Number</th>
                        <th className="py-3 px-2 text-gray-400 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 text-white font-mono">{acc.accountNumber}</td>
                          <td className="py-3 px-2 text-white">{acc.botName}</td>
                          <td className="py-3 px-2 text-purple-400 font-mono">{acc.magicNumber}</td>
                          <td className="py-3 px-2 text-right">
                            {isBotActive() ? (
                              <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded-full border border-red-500/20">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">DalioBot Bridge EA</h3>
                    <p className="text-gray-400 text-sm">
                      Download the Expert Advisor and install it on your MetaTrader 5 to sync data.
                    </p>
                    <div className="mt-4 p-2 bg-slate-800 rounded border border-slate-700 inline-block">
                      <span className="text-xs text-gray-500 block">Your UID for configuration:</span>
                      <code className="text-purple-400 font-bold">{user?.uid}</code>
                    </div>
                  </div>
                  <a 
                    href="/downloads/DalioBot_Bridge.mq5" 
                    download 
                    className="flex items-center gap-2 bg-white text-slate-900 hover:bg-gray-200 font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
                  >
                    Download EA
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