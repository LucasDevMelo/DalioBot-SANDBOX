'use client';

import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { auth, realtimeDB } from '@/src/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const cards = [
    {
        title: 'Monte Carlo Simulation',
        description: 'Robustly project the risk of your strategies using the same statistical methods as institutional investors.',
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
        description: 'Use the robust portfolio builder to create the best version of your portfolio.',
        image: 'home3.svg',
        path: '/optimizer',
        betaAvailable: false,
    },
    {
        title: 'Consistency analysis',
        description: 'Measure how long your portfolio has gone without reaching new highs and assess the consistency of returns over time.',
        image: 'home5.svg',
        path: '/portfolios',
        betaAvailable: false,
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

function FeatureCard({ title, description, image, path, betaAvailable }: { title: string; description: string; image: string; path: string; betaAvailable: boolean }) {
    return (
        <motion.div 
            className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden group relative flex flex-col h-full"
            whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 300 } }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="p-6 text-center flex flex-col flex-1 relative z-10">
                <div className="h-32 mb-4 flex justify-center items-center">
                    <img src={`/${image}`} alt={title} className="w-24 h-24 object-contain" />
                </div>
                <h3 className="text-md font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-400 mt-2 flex-grow">{description}</p>
                <div className="mt-6">
                    {betaAvailable ? (
                        <a href={path} className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold transition-colors shadow-[0_0_15px_theme(colors.purple.500/40)]">
                            Access
                        </a>
                    ) : (
                        <span className="text-purple-400 font-semibold text-sm px-4 py-2 bg-purple-500/10 rounded-full">
                            Coming soon
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex flex-1 justify-center items-center h-full p-8">
            <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                if (user && realtimeDB) {
                    const userId = user.uid;
                    const estrategiasSnapshot = await get(ref(realtimeDB, `estrategias/${userId}`));
                    if (estrategiasSnapshot.exists()) {
                        const estrategias = estrategiasSnapshot.val();
                        const entradas = Object.entries(estrategias) as [string, any][];
                        setBacktestCount(entradas.length);
                        const rankingRobos = entradas
                            .map(([id, data]) => ({ nome: data.nome ?? id, fatorLucro: parseFloat(data.fatorLucro) || 0 }))
                            .filter((e) => !isNaN(e.fatorLucro) && e.fatorLucro > 0)
                            .sort((a, b) => b.fatorLucro - a.fatorLucro).slice(0, 3);
                        setRankingFatorLucro(rankingRobos);
                    } else {
                        setBacktestCount(0);
                        setRankingFatorLucro([]);
                    }

                    const portfoliosSnapshot = await get(ref(realtimeDB, `portfolios/${userId}`));
                    if (portfoliosSnapshot.exists()) {
                        const portfolios = portfoliosSnapshot.val();
                        const portfolioEntries = Object.entries(portfolios) as [string, any][];
                        setPortfolioCount(portfolioEntries.length);
                        const rankingPortfolios = portfolioEntries
                            .map(([id, data]) => ({ nome: data.nomePortfolio ?? id, fatorLucro: parseFloat(data.fatorLucro) || 0 }))
                            .filter((p) => !isNaN(p.fatorLucro) && p.fatorLucro > 0)
                            .sort((a, b) => b.fatorLucro - a.fatorLucro).slice(0, 3);
                        setRankingPortfolioFatorLucro(rankingPortfolios);
                    } else {
                        setPortfolioCount(0);
                        setRankingPortfolioFatorLucro([]);
                    }
                } else {
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
        <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
            <Topbar />
            <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
                <button
                    onClick={() => setSidebarAberta(!sidebarAberta)}
                    className="text-purple-400 font-bold text-xl p-2"
                >
                    <MenuIcon />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>

                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="w-full max-w-7xl mx-auto">
                            {/* Data Section */}
                            <motion.section 
                                className="mb-12"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-2xl font-bold text-white mb-6">My Dashboard</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                        <h3 className="text-gray-400 text-sm font-medium">Backtests</h3>
                                        <p className="text-4xl font-bold text-white mt-1">{backtestCount}</p>
                                    </div>
                                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                        <h3 className="text-gray-400 text-sm font-medium">Portfolios</h3>
                                        <p className="text-4xl font-bold text-white mt-1">{portfolioCount}</p>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-gray-400 text-sm font-bold mb-3">Top Bots (Profit Factor)</h3>
                                            <ul className="space-y-2 text-sm">
                                                {rankingFatorLucro.length > 0 ? rankingFatorLucro.map((item, i) => (
                                                    <li key={i} className="flex justify-between items-center text-gray-300">
                                                        <span>{['🥇', '🥈', '🥉'][i]} {item.nome}</span>
                                                        <span className="font-semibold text-purple-400">{item.fatorLucro.toFixed(2)}</span>
                                                    </li>
                                                )) : <li className="text-gray-500">No bots found.</li>}
                                            </ul>
                                        </div>
                                        <div>
                                            <h3 className="text-gray-400 text-sm font-bold mb-3">Top Portfolios (Profit Factor)</h3>
                                            <ul className="space-y-2 text-sm">
                                                {rankingPortfolioFatorLucro.length > 0 ? rankingPortfolioFatorLucro.map((item, i) => (
                                                    <li key={i} className="flex justify-between items-center text-gray-300">
                                                        <span>{['🥇', '🥈', '🥉'][i]} {item.nome}</span>
                                                        <span className="font-semibold text-purple-400">{item.fatorLucro.toFixed(2)}</span>
                                                    </li>
                                                )) : <li className="text-gray-500">No portfolios found.</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Tools Section */}
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <h1 className="text-2xl font-bold mb-6 text-white">Analysis Tools</h1>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cards.map((card, idx) => (
                                        <FeatureCard key={idx} {...card} />
                                    ))}
                                </div>
                            </motion.section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
