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
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [magicNumber, setMagicNumber] = useState('');
  const [botName, setBotName] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);

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
    <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
      <Topbar />
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
          <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-400 font-bold text-xl p-2">☰</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`fixed md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <Sidebar />
        </div>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
                <p className="text-gray-400 text-sm">Manage your MetaTrader 5 robots and sync settings.</p>
            </section>

            {/* Account Configuration Card */}
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-white">Robot Configuration (MT5)</CardTitle>
                <p className="text-sm text-gray-400">Link your robots using Account and Magic Numbers.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Account No."
                    className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full text-white focus:ring-purple-500"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Robot Name"
                    className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full text-white focus:ring-purple-500"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Magic Number"
                    className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full text-white focus:ring-purple-500"
                    value={magicNumber}
                    onChange={(e) => setMagicNumber(e.target.value)}
                  />
                  <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-all shadow-[0_0_10px_theme(colors.purple.500/40)]">
                    Add Robot
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700 text-gray-400">
                        <th className="py-3 px-2 font-medium">Account No.</th>
                        <th className="py-3 px-2 font-medium">Robot Name</th>
                        <th className="py-3 px-2 font-medium">Magic Number</th>
                        <th className="py-3 px-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-2 text-white font-mono">{acc.accountNumber}</td>
                          <td className="py-4 px-2 text-white">{acc.botName}</td>
                          <td className="py-4 px-2 text-purple-400 font-mono">{acc.magicNumber}</td>
                          <td className="py-4 px-2 text-right">
                            <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full border border-emerald-500/20">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* EA Download Card */}
            <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-purple-500 rounded-2xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">DalioBot Bridge EA</h3>
                    <p className="text-gray-400 text-sm">Download the Expert Advisor to sync your data.</p>
                    <div className="mt-4 p-3 bg-slate-800 rounded-xl border border-slate-700 inline-block">
                      <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Your UID:</span>
                      <code className="text-purple-400 font-bold">{user?.uid}</code>
                    </div>
                  </div>
                  <a href="/downloads/DalioBot_Bridge.mq5" download className="bg-white text-slate-900 hover:bg-gray-200 font-bold py-3 px-8 rounded-xl transition-all shadow-lg">
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