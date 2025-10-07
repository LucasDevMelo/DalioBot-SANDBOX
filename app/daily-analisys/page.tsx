// app/daily-analisys/page.tsx

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDatabase, ref, get } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import DailyAnalysis from '@/components/DailyAnalysis';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';

interface CsvData {
  DATE: string;
  EQUITY: number;
}

function DailyAnalysisPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const roboId = searchParams.get('id');

  const [csvData, setCsvData] = useState<CsvData[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  useEffect(() => {
    if (user && roboId) {
      const fetchRoboData = async () => {
        setCarregando(true);
        setErro(null);
        try {
          const db = getDatabase();
          const roboRef = ref(db, `estrategias/${user.uid}/${roboId}`);
          const snapshot = await get(roboRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.dadosCSV) {
              const parsedData = Object.values(data.dadosCSV).map((row: any) => ({
                DATE: String(row['<DATE>'] || '').replace(/\./g, '-'),
                EQUITY: parseFloat(String(row['<EQUITY>'] || '0').replace(',', '.')),
              }));
              setCsvData(parsedData as CsvData[]);
            } else {
              setErro("Bot found, but has no CSV data for analysis.");
            }
          } else {
            setErro(`Bot with ID "${roboId}" was not found.`);
          }
        } catch (e) {
          console.error("Error fetching bot data:", e);
          setErro("An error occurred while fetching the bot data.");
        } finally {
          setCarregando(false);
        }
      };
      fetchRoboData();
    } else if (!roboId) {
      setErro("No bot ID was provided in the URL.");
      setCarregando(false);
    }
  }, [user, roboId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <div className="md:hidden p-2 bg-white shadow z-40">
        <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-700 font-bold text-xl">
          ☰
        </button>
      </div>
      <div className="flex flex-1 relative">
        <div className={`absolute md:static z-30 transition-transform duration-300 transform shadow-md md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>
        <main className="flex-1">
          {carregando && <p className="p-6 text-center">Loading analysis for bot: <strong>{roboId}</strong>...</p>}
          {erro && <p className="p-6 text-center text-red-600">{erro}</p>}
          {!carregando && !erro && csvData.length > 0 && (
            <DailyAnalysis csvData={csvData} roboId={roboId ?? undefined} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function DailyAnalisysPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading page...</div>}>
      <DailyAnalysisPageContent />
    </Suspense>
  );
}