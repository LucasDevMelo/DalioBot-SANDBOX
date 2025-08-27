'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/context/authcontext';
import { getDatabase, ref as dbRefFirebase, get } from 'firebase/database';
import AnalysisResults from './AnalysisResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ✅ PASSO 1: ADICIONAR O COMPONENTE SPINNER REUTILIZÁVEL
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

// Tipagens
interface Strategy { id: string; name: string; }
interface BacktestDataPoint { date: Date; equity: number; }
interface PeriodAnalysis {
    periodName: string;
    netProfit: number;
    netProfitPercent: number;
    maxDrawdownPercent: number;
}

// Funções auxiliares
const formatNumberForParsing = (numStr: string | number | undefined | null): number => {
    if (numStr === undefined || numStr === null) return NaN;
    let s = String(numStr).trim();
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.includes(',')) s = s.replace(',', '.');
    return parseFloat(s);
};

export default function CreateAnalysis() {
    const { user } = useAuth();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [backtestData, setBacktestData] = useState<BacktestDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [periodType, setPeriodType] = useState<'quarterly' | 'semi-annually' | 'annually'>('quarterly');

    useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }
        const fetchStrategies = async () => {
            setIsLoading(true);
            try {
                const db = getDatabase();
                const strategiesRef = dbRefFirebase(db, `estrategias/${user.uid}`);
                const snapshot = await get(strategiesRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const loadedStrategies = Object.keys(data).map(key => ({
                        id: key,
                        name: data[key].nomeRobo || data[key].nome || key,
                    }));
                    setStrategies(loadedStrategies);
                }
            } catch (err) {
                setError("Falha ao carregar a lista de robôs do Firebase.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStrategies();
    }, [user]);
    
    const handleStrategySelect = async (strategyId: string) => {
        if (!user?.uid) return;
        setIsProcessing(true);
        setError(null);
        setBacktestData([]);
        try {
            const db = getDatabase();
            const strategyRef = dbRefFirebase(db, `estrategias/${user.uid}/${strategyId}/dadosCSV`);
            const snapshot = await get(strategyRef);

            if (!snapshot.exists()) throw new Error("Não foram encontrados dadosCSV para este robô.");

            const rawData = snapshot.val();
            const dataArray = Array.isArray(rawData) ? rawData : Object.values(rawData);

            const dataPoints = dataArray
                .map((row: any) => ({
                    date: new Date(String(row['<DATE>']).replace(/\./g, '/')),
                    equity: formatNumberForParsing(row['<EQUITY>'])
                }))
                .filter(dp => dp.date && !isNaN(dp.date.getTime()) && !isNaN(dp.equity));

            if (dataPoints.length < 2) throw new Error("Dados insuficientes para análise.");
            
            setBacktestData(dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime()));
            setSelectedStrategy(strategies.find(s => s.id === strategyId) || null);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido ao buscar dados do robô.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const analysisResults = useMemo((): PeriodAnalysis[] => {
        if (backtestData.length < 2) return [];

        const getPeriodKey = (date: Date) => {
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth();
            if (periodType === 'annually') return `${year}`;
            if (periodType === 'semi-annually') return `${year}-S${month < 6 ? 1 : 2}`;
            return `${year}-Q${Math.floor(month / 3) + 1}`;
        };

        const groupedByPeriod = backtestData.reduce((acc, dataPoint) => {
            const key = getPeriodKey(dataPoint.date);
            if (!acc[key]) acc[key] = [];
            acc[key].push(dataPoint);
            return acc;
        }, {} as Record<string, BacktestDataPoint[]>);

        let lastPeriodEndEquity = backtestData[0].equity;
        const sortedKeys = Object.keys(groupedByPeriod).sort();

        return sortedKeys.map(key => {
            const periodData = groupedByPeriod[key];
            const startEquity = lastPeriodEndEquity;
            const endEquity = periodData[periodData.length - 1].equity;
            const netProfit = endEquity - startEquity;
            const netProfitPercent = startEquity !== 0 ? (netProfit / startEquity) * 100 : 0;
            
            let peak = startEquity;
            let maxDd = 0;
            periodData.forEach(p => {
                if (p.equity > peak) peak = p.equity;
                if ((peak - p.equity) > maxDd) maxDd = peak - p.equity;
            });
            const maxDrawdownPercent = peak > 0 ? (maxDd / peak) * 100 : 0;
            
            lastPeriodEndEquity = endEquity;

            return { periodName: key, netProfit, netProfitPercent, maxDrawdownPercent };
        });
    }, [backtestData, periodType]);


    // --- RENDERIZAÇÃO ---
    
    // ✅ PASSO 2: SUBSTITUIR O INDICADOR DE CARREGAMENTO INICIAL
    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (selectedStrategy) {
        return (
            <div>
                 <div className="flex items-center justify-between mb-4">
                     <button onClick={() => setSelectedStrategy(null)} className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300">
                        &larr; Return to robot selection
                     </button>
                    
                    <select 
                        value={periodType} 
                        onChange={e => setPeriodType(e.target.value as any)}
                        className="border border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                        <option value="quarterly">Quarterly</option>
                        <option value="semi-annually">Semiannual</option>
                        <option value="annually">Annual</option>
                    </select>
                 </div>

                {/* ✅ PASSO 3: SUBSTITUIR O INDICADOR DE PROCESSAMENTO */}
                 {isProcessing ? (
                     <LoadingSpinner />
                 ) : (
                    <AnalysisResults analysisName={selectedStrategy.name} analysisResults={analysisResults} />
                 )}
            </div>
        )
    }
    
    return (
        <div>
             <h2 className="text-xl font-semibold mb-4 text-gray-800">Select a Robot for Analysis</h2>
             {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
             {strategies.length === 0 ? (
                 <p>No robots found in your database.</p>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {strategies.map(strategy => (
                        <div 
                            key={strategy.id} 
                            className="cursor-pointer"
                            onClick={() => handleStrategySelect(strategy.id)}
                        >
                            <Card className="hover:shadow-lg hover:border-purple-500 transition-all">
                                <CardHeader>
                                    <CardTitle className="text-lg text-purple-700">{strategy.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                   <p className="text-sm text-gray-600">Click to analyze consistency.</p>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
             )}
        </div>
    );
}