'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { auth, realtimeDB } from '@/src/firebase';
import Link from 'next/link';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';

const cards = [
    {
        title: 'Monte Carlo Simulation',
        description: 'Robustly project the risk of your strategies, using the same statistical methods as institutional investors.',
        image: 'home1.svg',
        path: '/montecarlo',
        betaAvailable: true,
    },
    {
        title: 'Simulated Returns Distribution',
        description: 'Visualize the distribution of returns from Monte Carlo simulations to understand the probability of gains and losses.',
        image: 'home4.svg',
        path: '/montecarlo',
        betaAvailable: true,
    },
    {
        title: 'Enhance your portfolio',
        description: 'Use the robust portfolio builder to get the best version of your portfolio',
        image: 'home3.svg',
        path: '/optimizer',
        betaAvailable: false, // Alterado: Não disponível na Beta
    },
    {
        title: 'Consistency analysis',
        description: 'Measure how long your portfolio has gone without reaching new highs and assess the consistency of returns over time.',
        image: 'home5.svg',
        path: '/portfolios',
        betaAvailable: false, // Alterado: Não disponível na Beta
    },
    {
        title: 'Track Record',
        description: 'Monitor the track record of all bots. Keep an organized history of your operations.',
        image: 'home2.svg',
        path: '/montecarlo',
        betaAvailable: true,
    },
    {
        title: 'Mapping Negative Periods',
        description: 'Identify losing months, quarters, and years, making it easier to assess risk across different time horizons.',
        image: 'home6.svg',
        path: '/robots',
        betaAvailable: true,
    },
];

// Adicionada a nova prop `betaAvailable`
function Card({ title, description, image, path, betaAvailable }: { title: string; description: string; image: string; path: string; betaAvailable: boolean }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-300 w-72 flex flex-col h-full">
            <div className="bg-purple-100 flex justify-center items-center h-40">
                <img src={`/${image}`} alt={title} className="w-40 h-40" />
            </div>
            <div className="p-4 text-center flex flex-col flex-1">
                <h3 className="text-md font-semibold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-600 mt-2 flex-grow">{description}</p>
                <div className="mt-4">
                    {/* Alterado: Renderização condicional para o botão */}
                    {betaAvailable ? (
                        <Link href={path}>
                            <button className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
                                Access
                            </button>
                        </Link>
                    ) : (
                        <span className="text-purple-600 font-semibold text-sm">
                            Not available in Beta version
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

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

export default function HomePage() {
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [backtestCount, setBacktestCount] = useState<number>(0);
    const [portfolioCount, setPortfolioCount] = useState<number>(0);
    const [rankingFatorLucro, setRankingFatorLucro] = useState<{ nome: string; fatorLucro: number }[]>([]);
    const [rankingPortfolioFatorLucro, setRankingPortfolioFatorLucro] = useState<{ nome: string; fatorLucro: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    const userId = user.uid;

                    // Fetch strategies (backtests)
                    const estrategiasSnapshot = await get(ref(realtimeDB, `estrategias/${userId}`));
                    if (estrategiasSnapshot.exists()) {
                        const estrategias = estrategiasSnapshot.val();
                        const entradas = Object.entries(estrategias) as [string, any][];
                        setBacktestCount(entradas.length);

                        const rankingRobos = entradas
                            .map(([id, data]) => ({
                                nome: data.nome ?? id,
                                fatorLucro: parseFloat(data.fatorLucro) || 0,
                            }))
                            .filter((e) => !isNaN(e.fatorLucro) && e.fatorLucro > 0)
                            .sort((a, b) => b.fatorLucro - a.fatorLucro)
                            .slice(0, 5);
                        setRankingFatorLucro(rankingRobos);

                    } else {
                        setBacktestCount(0);
                        setRankingFatorLucro([]);
                    }

                    // Fetch portfolios
                    const portfoliosSnapshot = await get(ref(realtimeDB, `portfolios/${userId}`));
                    if (portfoliosSnapshot.exists()) {
                        const portfolios = portfoliosSnapshot.val();
                        const portfolioEntries = Object.entries(portfolios) as [string, any][];
                        setPortfolioCount(portfolioEntries.length);

                        const rankingPortfolios = portfolioEntries
                            .map(([id, data]) => ({
                                nome: data.nomePortfolio ?? id,
                                fatorLucro: parseFloat(data.fatorLucro) || 0,
                            }))
                            .filter((p) => !isNaN(p.fatorLucro) && p.fatorLucro > 0)
                            .sort((a, b) => b.fatorLucro - a.fatorLucro)
                            .slice(0, 5);
                        setRankingPortfolioFatorLucro(rankingPortfolios);
                    } else {
                        setPortfolioCount(0);
                        setRankingPortfolioFatorLucro([]);
                    }

                } else {
                    // User is signed out, reset counts
                    setBacktestCount(0);
                    setPortfolioCount(0);
                    setRankingFatorLucro([]);
                    setRankingPortfolioFatorLucro([]);
                }
            } catch (error) {
                console.error("Failed to fetch page data:", error);
            } finally {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

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
                <div
                    className={`absolute md:static z-50 transition-transform duration-300 transform bg-white shadow-md md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
                >
                    <Sidebar />
                </div>
                <main className="flex-1 bg-gray-100 pt-6 pb-6 flex">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="max-w-7xl mx-auto px-4 w-full">
                            <div className="w-full flex justify-center">
                                <div className="max-w-7xl mx-auto px-4">
                                    <div className="w-full flex justify-center">
                                        <div className="w-full max-w-6xl px-4">

                                            {/* Bloco "Meus dados" */}
                                            <div className="w-fit mx-auto mb-12">
                                                <h2 className="text-xl font-bold text-black mb-4">My data</h2>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">

                                                    {/* COLUNA DA ESQUERDA: Cards de contagem */}
                                                    <div className="flex flex-col gap-y-10">
                                                        <div className="bg-white p-4 rounded shadow">
                                                            <h3 className="text-gray-500 text-sm font-medium">Backtests</h3>
                                                            <p className="text-3xl font-bold text-gray-800">{backtestCount}</p>
                                                        </div>
                                                        <div className="bg-white p-4 rounded shadow">
                                                            <h3 className="text-gray-500 text-sm font-medium">Portfolios</h3>
                                                            <p className="text-3xl font-bold text-gray-800">{portfolioCount}</p>
                                                        </div>
                                                    </div>

                                                    {/* ÁREA DA DIREITA: Cards de ranking (ocupa 2 colunas do grid principal) */}
                                                    <div className="md:col-span-2">
                                                        {/* Grid interno para os rankings ficarem lado a lado */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 h-full">
                                                            {/* Card Top Robots */}
                                                            <div className="bg-white p-4 rounded shadow h-full">
                                                                <h3 className="text-black text-sm font-bold mb-3">Top Robots by Profit Factor</h3>
                                                                <ul className="space-y-2 text-sm text-gray-800">
                                                                    {rankingFatorLucro.length === 0 ? (
                                                                        <li className="text-gray-500">No robots found</li>
                                                                    ) : (
                                                                        rankingFatorLucro.map((item, index) => (
                                                                            <li key={index} className="flex justify-between items-center">
                                                                                <span>{index + 1}. {item.nome} {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</span>
                                                                                <span className="font-semibold text-purple-700">{item.fatorLucro.toFixed(2)}</span>
                                                                            </li>
                                                                        ))
                                                                    )}
                                                                </ul>
                                                            </div>
                                                            {/* Card Top Portfolios */}
                                                            <div className="bg-white p-4 rounded shadow h-full">
                                                                <h3 className="text-black text-sm font-bold mb-3">Top Portfolios by Profit Factor</h3>
                                                                <ul className="space-y-2 text-sm text-gray-800">
                                                                    {rankingPortfolioFatorLucro.length === 0 ? (
                                                                        <li className="text-gray-500">No portfolios found</li>
                                                                    ) : (
                                                                        rankingPortfolioFatorLucro.map((item, index) => (
                                                                            <li key={index} className="flex justify-between items-center">
                                                                                <span>{index + 1}. {item.nome} {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</span>
                                                                                <span className="font-semibold text-purple-700">{item.fatorLucro.toFixed(2)}</span>
                                                                            </li>
                                                                        ))
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Bloco "Bem-vindo ao DalioBot" */}
                                            <div className="w-fit mx-auto">
                                                <h1 className="text-2xl font-bold mb-6 text-black">Welcome to DalioBot</h1>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 justify-items-center">
                                                    {cards.map((card, idx) => (
                                                        <Card key={idx} {...card} />
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}