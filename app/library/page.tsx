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

// --- INTERFACES AND TYPES ---
interface ProcessedCsvRow {
    EQUITY: number;
    DATE: string;
}

interface RoboData {
    id: string;
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

// ============================================================================
// INDIVIDUAL ROBOT CARD COMPONENT (ATUALIZADO COM OS DOIS BOTÕES)
// ============================================================================
const MetricItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex flex-col items-center text-center">
        <div className="text-gray-500">{icon}</div>
        <p className="text-sm font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
    </div>
);

const RoboCard = ({ robo }: RoboCardProps) => {
    return (
        <Card className="transition-transform hover:scale-[1.02] hover:shadow-xl flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">{robo.id}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                <div className="grid grid-cols-3 gap-x-2 gap-y-4 mb-4 text-gray-700">
                    <MetricItem icon={<Gauge size={18} />} label="Score" value={robo.score.toFixed(2)} />
                    <MetricItem icon={<Briefcase size={18} />} label="Asset" value={robo.ativo} />
                    <MetricItem icon={<TrendingUp size={18} />} label="Market" value={robo.tipo} />
                    <MetricItem icon={<Scale size={18} />} label="Profit Factor" value={robo.fatorLucro.toFixed(2)} />
                    <MetricItem icon={<Target size={18} />} label="Hit Rate" value={`${robo.taxaAcerto.toFixed(1)}%`} />
                    <MetricItem icon={<Bot size={18} />} label="Maximum DD" value={`$ ${robo.drawdownMaximo.toFixed(2)}`} />
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
                                fill="#d4d4d8"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-2">
                    <Link
                        href={`/dashboard?id=${encodeURIComponent(robo.id)}&origem=biblioteca`}
                        className="bg-purple-600 text-white text-center text-sm font-semibold py-2 px-1 rounded-md hover:bg-purple-700 transition-colors"
                    >
                        Details
                    </Link>
                    <Link
                        // ▼▼▼ ROTA ATUALIZADA AQUI ▼▼▼
                        href={`/daily-analisys?id=${encodeURIComponent(robo.id)}`}
                        className="border border-purple-600 text-purple-600 text-center text-sm font-semibold py-2 px-1 rounded-md hover:bg-purple-100 transition-colors"
                    >
                        Daily Analysis

                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};


// ============================================================================
// LIBRARY CONTENT COMPONENT
// ============================================================================
function BibliotecaContent() {
    const { user } = useAuth();
    const [robos, setRobos] = useState<RoboData[]>([]);
    const [sidebarAberta, setSidebarAberta] = useState(false);

    /**
     * Calculates the metrics summary for a robot, ensuring consistency
     * with the Dashboard screen's calculations.
     */
    const calculateRoboSummary = (dadosCSV: any) => {
        // 1. Data Normalization and Validation
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

        // =================================================================================
        // START OF CALCULATIONS IDENTICAL TO THE DASHBOARD
        // =================================================================================

        // 2. PROFIT FACTOR Calculation (Dashboard's row-by-row method)
        const rowByRowChanges = csvData.slice(1).map((row, i) => row.EQUITY - csvData[i].EQUITY);
        const rowByRowGains = rowByRowChanges.filter(change => change > 0);
        const rowByRowLosses = rowByRowChanges.filter(change => change < 0).map(l => Math.abs(l));
        const totalRowGain = rowByRowGains.reduce((sum, g) => sum + g, 0);
        const totalRowLoss = rowByRowLosses.reduce((sum, l) => sum + l, 0);
        const fatorLucro = totalRowLoss > 0 ? totalRowGain / totalRowLoss : (totalRowGain > 0 ? Infinity : 0);

        // 3. HIT RATE Calculation (Dashboard's consolidated daily method)
        const equityPorDia = new Map<string, number>();
        csvData.forEach(row => {
            equityPorDia.set(new Date(row.DATE).toISOString().split('T')[0], row.EQUITY);
        });
        const datasUnicasOrdenadas = Array.from(equityPorDia.keys()).sort();
        const lucroDiarioConsolidado: number[] = [];
        for (let i = 1; i < datasUnicasOrdenadas.length; i++) {
            const lucroDoDia = (equityPorDia.get(datasUnicasOrdenadas[i]) ?? 0) - (equityPorDia.get(datasUnicasOrdenadas[i - 1]) ?? 0);
            lucroDiarioConsolidado.push(lucroDoDia);
        }
        const gainsConsolidados = lucroDiarioConsolidado.filter(v => v > 0);
        const lossesConsolidados = lucroDiarioConsolidado.filter(v => v < 0);
        const taxaAcerto = (gainsConsolidados.length + lossesConsolidados.length) > 0 ? (gainsConsolidados.length / (gainsConsolidados.length + lossesConsolidados.length)) * 100 : 0;

        // 4. MAXIMUM DRAWDOWN Calculation (Standard logic)
        let pico = -Infinity;
        let drawdownMaximo = 0;
        csvData.forEach(row => {
            pico = Math.max(pico, row.EQUITY);
            drawdownMaximo = Math.max(drawdownMaximo, pico - row.EQUITY);
        });

        // 5. SCORE Calculation (Dashboard's CAGR method)
        const primeiraData = new Date(csvData[0].DATE);
        const ultimaData = new Date(csvData[csvData.length - 1].DATE);
        const diffEmMs = ultimaData.getTime() - primeiraData.getTime();
        const anos = diffEmMs > 0 ? diffEmMs / (1000 * 60 * 60 * 24 * 365) : 0;
        let cagrCalculado = 0;
        if (anos > 0 && initialEquity > 0) {
            const ratio = finalEquity / initialEquity;
            if (ratio >= 0) {
                cagrCalculado = Math.pow(ratio, 1 / anos) - 1;
            }
        }
        const score = Math.min(10, Math.max(0, (cagrCalculado * 100) / 5));

        // 6. Return of calculated data
        return {
            metrics: {
                score: isNaN(score) ? 0 : score,
                fatorLucro: isFinite(fatorLucro) ? fatorLucro : 0,
                drawdownMaximo: isNaN(drawdownMaximo) ? 0 : drawdownMaximo,
                taxaAcerto: isNaN(taxaAcerto) ? 0 : taxaAcerto
            },
            equityCurve
        };
    };
    
    // The useEffect remains the same, calling the updated calculation function
    useEffect(() => {
        const fetchRobosData = async () => {
            if (!user) return;

            const cacheKey = `biblioteca_cache_${user.uid}`;
            const cachedDataJSON = localStorage.getItem(cacheKey);
            const HORA_EM_MS = 60 * 60 * 1000;

            if (cachedDataJSON) {
                const { timestamp, data } = JSON.parse(cachedDataJSON);
                if ((new Date().getTime() - timestamp) < HORA_EM_MS) {
                    setRobos(data);
                    return;
                }
            }

            try {
                const db = getDatabase();
                const robosRef = ref(db, `estrategias/${user.uid}`);
                const snapshot = await get(robosRef);

                if (snapshot.exists()) {
                    const robosData = Object.entries(snapshot.val())
                        .map(([roboId, roboData]: [string, any]) => {
                            if (roboData.dadosCSV) {
                                const { metrics, equityCurve } = calculateRoboSummary(roboData.dadosCSV);
                                return {
                                    id: roboId,
                                    ativo: roboData.ativo || 'N/A',
                                    tipo: roboData.mercado || 'N/A',
                                    score: metrics.score,
                                    fatorLucro: metrics.fatorLucro,
                                    drawdownMaximo: metrics.drawdownMaximo,
                                    taxaAcerto: metrics.taxaAcerto,
                                    equityCurve,
                                };
                            }
                            return null;
                        })
                        .filter((r): r is RoboData => r !== null);
                    
                    robosData.sort((a,b) => b.score - a.score);
                    setRobos(robosData);

                    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: new Date().getTime(), data: robosData }));
                } else {
                    setRobos([]);
                }
            } catch (error) {
                console.error("Error fetching robot data:", error);
                setRobos([]);
            }
        };

        fetchRobosData();
    }, [user]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
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
                
                <main className="flex-1 p-4 md:p-6 flex">
                    {robos.length === 0 ? (
                        <div className="text-center text-gray-500 mt-20 p-8 bg-white rounded-lg border w-full">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Robots Found</h2>
                            <p>It seems you haven't added any robots yet.</p>
                            <p className="mt-4">Go to the <Link href="/robots" className="text-purple-600 hover:underline">robots page</Link> to get started.</p>
                        </div>
                    ) : (
                        <div className="w-full">
                            <h1 className="text-3xl font-bold text-gray-900 mb-6">Setup Library</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {robos.map((robo) => (
                                    <RoboCard key={robo.id} robo={robo} />
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// ============================================================================
// PAGE CONTAINER COMPONENT (Standard with Suspense)
// ============================================================================
export default function BibliotecaPageContainer() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="p-6 rounded-lg text-center">
                    <svg className="animate-spin h-10 w-10 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-semibold text-gray-700">Loading robot library...</p>
                    <p className="text-sm text-gray-500">Please wait a moment.</p>
                </div>
            </div>
        }>
            <BibliotecaContent />
        </Suspense>
    );
}