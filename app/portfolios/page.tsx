'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/authcontext';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { getDatabase, ref as dbRefFirebase, get, set, push, remove } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Removido: import { getPlanNameFromPriceId } from '@/src/utils/paddleUtils';

// --- Interfaces ---
interface RobotStrategy {
    id: string;
    nomeRobo: string;
    mercado?: string;
    ativo?: string;
}

interface Portfolio {
    id:string;
    nomePortfolio: string;
    robos: string[];
    dataCriacao: string;
    fatorLucro?: number;
    lucroBruto?: number;
    prejuizoBruto?: number;
    dadosConsolidados?: PortfolioCsvData[];
}

interface DadosCsvDoRoboNoRTDB {
    '<DATE>': string;
    '<BALANCE>': string;
    '<EQUITY>': string;
    '<DEPOSIT LOAD>'?: string;
}

interface ProcessedRobotData {
    date: Date;
    equity: number;
    dailyPL: number;
}

interface PortfolioCsvData {
    '<DATE>': string;
    '<BALANCE>': number;
    '<EQUITY>': number;
    '<DEPOSIT LOAD>': number;
}
// --- Fim das Interfaces ---

const formatNumberForParsing = (numStr: string | number | undefined | null): number => {
    if (numStr === undefined || numStr === null) {
        return NaN;
    }

    let s = String(numStr).trim();
    if (s === "") return NaN;

    if (s.includes(',')) {
        const brNum = parseFloat(s.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(brNum) && s.includes('.')) {
             return brNum;
        }
    }
    
    const usNum = parseFloat(s.replace(/,/g, ''));
    return usNum;
};


function CreatePortfolioContent() {
    const { user, subscription } = useAuth();
    const router = useRouter();
    const [availableRobots, setAvailableRobots] = useState<RobotStrategy[]>([]);
    const [selectedRobots, setSelectedRobots] = useState<Set<string>>(new Set());
    const [portfolioName, setPortfolioName] = useState('');
    const [loadingRobots, setLoadingRobots] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ ALTERADO: Removemos os limites de planos e definimos limites únicos para a beta.
    const BETA_LIMITS = {
        maxPortfolios: Infinity, // Sem limite de portfólios salvos na beta
        maxStrategies: Infinity, // Sem limite de robôs por portfólio na beta
        name: 'Beta',
    };

    useEffect(() => {
        if (user?.uid) {
            const fetchAvailableRobots = async () => {
                setLoadingRobots(true);
                setError(null);
                try {
                    const db = getDatabase();
                    const strategiesRef = dbRefFirebase(db, `estrategias/${user.uid}`);
                    const snapshot = await get(strategiesRef);
                    if (snapshot.exists()) {
                        const strategiesData = snapshot.val();
                        const loadedRobots = Object.entries(strategiesData).map(([id, data]: [string, any]) => ({
                            id,
                            nomeRobo: data.nomeRobo || data.nomeEstrategia || data.nome || id,
                            mercado: data.mercado,
                            ativo: data.ativo,
                        }));
                        setAvailableRobots(loadedRobots);
                    } else {
                        setAvailableRobots([]);
                    }
                } catch (err) {
                    console.error("Error searching for robots/strategies:", err);
                    setError("Failed to load robot/strategy list.");
                } finally {
                    setLoadingRobots(false);
                }
            };
            fetchAvailableRobots();
        } else {
            setLoadingRobots(false);
        }
    }, [user]);

    const toggleRobotSelection = (robotId: string) => {
        setError(null);

        setSelectedRobots(prevSelected => {
            const newSelected = new Set(prevSelected);
            
            if (newSelected.has(robotId)) {
                newSelected.delete(robotId);
            } else {
                // ✅ ALTERADO: Removemos a verificação de limite de estratégias, já que é Infinity na beta.
                newSelected.add(robotId);
            }
            return newSelected;
        });
    };

    const fetchAndProcessRobotDataFromRTDB = async (robotId: string): Promise<ProcessedRobotData[]> => {
        if (!user?.uid) throw new Error("Unauthenticated user to fetch data from robot.");
        const db = getDatabase();
        const robotDataRef = dbRefFirebase(db, `estrategias/${user.uid}/${robotId}/dadosCSV`);
        const dataSnapshot = await get(robotDataRef);

        if (!dataSnapshot.exists()) {
            console.warn(`[FAPRD] No 'CSV data' for robot ${robotId}`);
            return [];
        }
        
        const dadosCSVObject = dataSnapshot.val();
        const dataRowsArray: DadosCsvDoRoboNoRTDB[] = Array.isArray(dadosCSVObject) 
            ? dadosCSVObject 
            : Object.values(dadosCSVObject);

        if (!dataRowsArray || dataRowsArray.length === 0) {
            console.warn(`[FAPRD] 'dadosCSV' for robot ${robotId} is empty.`);
            return [];
        }

        const processedDataInitial = dataRowsArray
            .map((row, rowIndex) => {
                const originalDateStr = row['<DATE>']; 
                const equityStr = row['<EQUITY>'];

                if (!originalDateStr || equityStr === undefined || equityStr === null) return null;
                
                let dateVal: Date | undefined;
                const normalizedDateStr = originalDateStr.trim();
                const dateTimeSplit = normalizedDateStr.split(' ');
                const datePartStr = dateTimeSplit[0];
                const timePartStr = dateTimeSplit[1] || '00:00:00';
                let yearN: number | undefined, monthN: number | undefined, dayN: number | undefined;

                if (datePartStr.includes('/')) {
                    const parts = datePartStr.split('/');
                    if (parts.length === 3) {
                        const d1 = parseInt(parts[0], 10); const m1 = parseInt(parts[1], 10); const y1 = parseInt(parts[2], 10);
                        if (!isNaN(d1) && !isNaN(m1) && !isNaN(y1) && m1 >= 1 && m1 <= 12 && d1 >= 1 && d1 <= 31) { dayN = d1; monthN = m1; yearN = y1; }
                        else { const m2 = parseInt(parts[0], 10); const d2 = parseInt(parts[1], 10); if (!isNaN(d2) && !isNaN(m2) && !isNaN(y1) && m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31){ dayN = d2; monthN = m2; yearN = y1; }}
                    }
                } else if (datePartStr.includes('.')) {
                    const parts = datePartStr.split('.'); if (parts.length === 3) { dayN = parseInt(parts[0], 10); monthN = parseInt(parts[1], 10); yearN = parseInt(parts[2], 10); }
                } else if (datePartStr.includes('-')) {
                    const parts = datePartStr.split('-');
                    if (parts.length === 3) {
                        if (parts[0].length === 4) { yearN = parseInt(parts[0], 10); monthN = parseInt(parts[1], 10); dayN = parseInt(parts[2], 10); }
                        else if (parts[2].length === 4) { monthN = parseInt(parts[0], 10); dayN = parseInt(parts[1], 10); yearN = parseInt(parts[2], 10); }
                    }
                }

                if (yearN && monthN && dayN && yearN.toString().length >= 2 && monthN >= 1 && monthN <= 12 && dayN >= 1 && dayN <= 31) {
                    if (yearN.toString().length === 2) yearN += (yearN < 70 ? 2000 : 1900);
                    dateVal = new Date(yearN, monthN - 1, dayN);
                    const timeParts = timePartStr.split(':');
                    if (timeParts.length >= 2) {
                        const h = parseInt(timeParts[0],10); const min = parseInt(timeParts[1],10); const sec = timeParts.length === 3 ? parseInt(timeParts[2],10) : 0;
                        if(!isNaN(h)&&!isNaN(min)&&!isNaN(sec)&&h>=0&&h<=23&&min>=0&&min<=59&&sec>=0&&sec<=59) dateVal.setHours(h,min,sec,0);
                    }
                } else {
                    const fallbackDate = new Date(normalizedDateStr); if (!isNaN(fallbackDate.getTime())) dateVal = fallbackDate;
                }

                if (!dateVal || isNaN(dateVal.getTime())) { console.warn(`[FAPRD] Invalid date (NaN) robot ${robotId}, line ${rowIndex}. Original: '${originalDateStr}'`); return null; }
                const equityVal = formatNumberForParsing(equityStr);
                if (isNaN(equityVal)) { console.warn(`[FAPRD] Equity Invalid (NaN) Robot ${robotId}, line ${rowIndex}. Original: '${equityStr}'`); return null; }
                return { date: dateVal, equity: equityVal };
            })
            .filter((item): item is { date: Date; equity: number } => item !== null);

        if (processedDataInitial.length === 0) { console.warn(`[FAPRD] No processable data for robot ${robotId}.`); return []; }
        const sortedData = processedDataInitial.sort((a, b) => a.date.getTime() - b.date.getTime());
        if (sortedData.length === 0) return [];
        
        let lastEquity = sortedData[0].equity; 
        const dataWithPL = sortedData.map((row, index) => {
            let currentDailyPL = (index === 0) ? 0 : row.equity - lastEquity;
            lastEquity = row.equity;
            return { ...row, dailyPL: currentDailyPL }; 
        });
        return dataWithPL;
    };

    const aggregatePortfolioData = (allRobotsData: Record<string, ProcessedRobotData[]>): PortfolioCsvData[] => {
        const portfolioTimeline: PortfolioCsvData[] = [];
        const allDates = new Set<string>();

        Object.values(allRobotsData).forEach(robotDataArray => {
            if (robotDataArray) {
                robotDataArray.forEach(dp => {
                    if (dp && dp.date) {
                        allDates.add(dp.date.toISOString().split('T')[0]);
                    }
                });
            }
        });

        const sortedUniqueDates = Array.from(allDates).sort();
        if (sortedUniqueDates.length === 0) {
            console.warn("[aggregatePortfolioData] Nenhuma data encontrada para agregar.");
            return [];
        }

        const robotDataByDate: Record<string, Record<string, ProcessedRobotData>> = {};
        Object.entries(allRobotsData).forEach(([robotId, robotDataArray]) => {
            if (robotDataArray) {
                robotDataArray.forEach(dp => {
                    if (dp && dp.date) {
                        const dateStr = dp.date.toISOString().split('T')[0];
                        if (!robotDataByDate[dateStr]) {
                            robotDataByDate[dateStr] = {};
                        }
                        robotDataByDate[dateStr][robotId] = dp;
                    }
                });
            }
        });

        const lastKnownEquities: Record<string, number> = {};
        Object.keys(allRobotsData).forEach(robotId => {
            lastKnownEquities[robotId] = 0;
        });

        sortedUniqueDates.forEach(dateStr => {
            Object.keys(allRobotsData).forEach(robotId => {
                const dataPointForDate = robotDataByDate[dateStr]?.[robotId];
                if (dataPointForDate) {
                    lastKnownEquities[robotId] = dataPointForDate.equity;
                }
            });

            const sumOfEquitiesForDate = Object.values(lastKnownEquities).reduce(
                (sum, equity) => sum + equity, 
                0
            );
            
            portfolioTimeline.push({
                '<DATE>': dateStr,
                '<BALANCE>': sumOfEquitiesForDate,
                '<EQUITY>': sumOfEquitiesForDate,
                '<DEPOSIT LOAD>': 0,
            });
        });
        
        return portfolioTimeline;
    };

    const calculatePortfolioMetrics = (data: PortfolioCsvData[]) => {
        if (!data || data.length < 2) {
            return { grossProfit: 0, grossLoss: 0, profitFactor: 0 };
        }

        let grossProfit = 0;
        let grossLoss = 0;

        for (let i = 1; i < data.length; i++) {
            const previousEquity = data[i-1]['<EQUITY>'];
            const currentEquity = data[i]['<EQUITY>'];
            const dailyChange = currentEquity - previousEquity;

            if (dailyChange > 0) {
                grossProfit += dailyChange;
            } else if (dailyChange < 0) {
                grossLoss += Math.abs(dailyChange);
            }
        }

        const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : 0;

        return { 
            grossProfit, 
            grossLoss, 
            profitFactor 
        };
    };

    const handleSimulatePortfolio = async () => {
        if (!user?.uid) { setError("Usuário não autenticado"); return; }
        if (!portfolioName.trim()) { setError("Por favor, dê um nome ao seu portfólio."); return; }
        if (selectedRobots.size === 0) { setError("Por favor, selecione ao menos um robô."); return; }

        setIsSimulating(true);
        setError(null);

        // ✅ REMOVIDO: A verificação de limite de portfólios para planos.
        // A versão beta permite a criação de portfólios ilimitados.

        const robotsWithNoData: string[] = [];
        const processingErrors: string[] = [];

        try {
            const allRobotsData: Record<string, ProcessedRobotData[]> = {};

            for (const robotId of selectedRobots) {
                try {
                    const robotData = await fetchAndProcessRobotDataFromRTDB(robotId);
                    if (robotData.length === 0) {
                        const robotInfo = availableRobots.find(r => r.id === robotId);
                        robotsWithNoData.push(robotInfo?.nomeRobo || robotId);
                    }
                    allRobotsData[robotId] = robotData;
                } catch (robotError) {
                    const robotInfo = availableRobots.find(r => r.id === robotId);
                    const robotName = robotInfo?.nomeRobo || robotId;
                    console.error(`Critical error processing the robot ${robotName}:`, robotError);
                    processingErrors.push(robotName);
                }
            }
            if (processingErrors.length > 0) {
                throw new Error(`A critical error occurred while processing the following robots:${processingErrors.join(', ')}. Check the console for more details.`);
            }
            if (robotsWithNoData.length === selectedRobots.size) {
                throw new Error(`No actionable data was found for the selected robots: ${robotsWithNoData.join(', ')}. Verify that their data files (CSV) contain dates and equity values in valid formats.`);
            }

            const portfolioConsolidatedData = aggregatePortfolioData(allRobotsData);
            
            if (portfolioConsolidatedData.length === 0) {
                throw new Error("Unable to consolidate data. While bots have individual data, there may be no overlap between them. Bots without valid data: " + (robotsWithNoData.join(', ') || "None"));
            }

            const metrics = calculatePortfolioMetrics(portfolioConsolidatedData);

            const db = getDatabase();
            const portfoliosUserRef = dbRefFirebase(db, `portfolios/${user.uid}`);
            const newPortfolioRef = push(portfoliosUserRef);
            const newPortfolioEntry: Omit<Portfolio, 'id'> = {
                nomePortfolio: portfolioName.trim(),
                robos: Array.from(selectedRobots),
                dataCriacao: new Date().toISOString(),
                fatorLucro: metrics.profitFactor,
                lucroBruto: metrics.grossProfit,
                prejuizoBruto: metrics.grossLoss,
                dadosConsolidados: portfolioConsolidatedData,
            };
            await set(newPortfolioRef, newPortfolioEntry);
            const newPortfolioId = newPortfolioRef.key;

            if (newPortfolioId) {
                router.push(`/dashboardportfolio?id=${newPortfolioId}&origem=portfolio`);
            } else {
                throw new Error("Unable to get new portfolio ID.");
            }
        } catch (err) {
            console.error("Detailed error when simulating/saving portfolio:", err);
            setError(err instanceof Error ? err.message : "Unknown error while simulating portfolio.");
        } finally {
            setIsSimulating(false);
        }
    };
    
    return (
        <div>
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h2 className="text-xl font-semibold text-purple-800 mb-1">Simulate Portfolios</h2>
                <p className="text-sm text-purple-900">
                    Here you can view the statistics of multiple robots running together.
                    Select the strategies you want and click "Simulate Portfolios and View Analysis."
                </p>
            </div>
            {/* ✅ ALTERADO: O aviso de limite de planos foi substituído por uma mensagem beta-friendly */}
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="text-green-800 font-bold">
                    You are on the Beta Version. Create unlimited portfolios and select as many strategies as you want!
                </p>
            </div>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            <div className="mb-6">
                <label htmlFor="portfolioName" className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio Name:
                </label>
                <input
                    type="text" id="portfolioName" value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    className="border border-gray-300 rounded-md shadow-sm p-2 w-full md:w-1/2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: My Portfolio 1"
                />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Robots:</h3>
            {loadingRobots ? (
                <div className="flex justify-center items-center h-32">
                    <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-gray-600">Loading robots...</span>
                </div>
            ) : availableRobots.length === 0 ? (
                <p className="text-gray-600 bg-yellow-50 p-3 rounded-md">No robots (strategies) found in your registration.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {availableRobots.map(robot => {
                        return (
                            <Card key={robot.id} className={`transition-all duration-150 ease-in-out ${selectedRobots.has(robot.id) ? 'border-purple-500 border-2 shadow-xl transform scale-105' : 'hover:shadow-md border-gray-200'}`}>
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-md text-gray-800">{robot.nomeRobo}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    {robot.mercado && <p className="text-xs text-gray-500 mb-0.5"><strong>Market:</strong> {robot.mercado}</p>}
                                    {robot.ativo && <p className="text-xs text-gray-500 mb-2"><strong>Asset:</strong> {robot.ativo}</p>}
                                    <button
                                        type="button"
                                        onClick={() => toggleRobotSelection(robot.id)}
                                        className={`w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400
                                          ${selectedRobots.has(robot.id)
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'border border-purple-500 text-purple-600 hover:bg-purple-100'}`}
                                    >
                                        {selectedRobots.has(robot.id) ? 'Selected ✓' : 'Select'}
                                    </button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
            {selectedRobots.size > 0 && (
                <div className="mt-4 mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-medium text-purple-800 mb-2">
                        Robots Selected for the Portfolio: {selectedRobots.size}
                    </p>
                    <ul className="list-disc list-inside text-xs text-purple-700 space-y-1">
                        {Array.from(selectedRobots).map(robotId => {
                            const robot = availableRobots.find(r => r.id === robotId);
                            return <li key={robotId}>{robot?.nomeRobo || robotId}</li>;
                        })}
                    </ul>
                </div>
            )}
            <button
                type="button"
                onClick={handleSimulatePortfolio}
                disabled={isSimulating || selectedRobots.size === 0 || !portfolioName.trim() || loadingRobots}
                className="bg-purple-600 hover:bg-purple-900 text-white font-bold py-3 px-6 rounded-md text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center w-full md:w-auto transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400"
            >
                {isSimulating ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Simulating and Saving...
                    </>
                ) : 'Simulate Portfolios and View Analysis'}
            </button>
        </div>
    );
}

function MyPortfoliosContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [userPortfolios, setUserPortfolios] = useState<Portfolio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.uid) {
            const fetchPortfolios = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const db = getDatabase();
                    const portfoliosRef = dbRefFirebase(db, `portfolios/${user.uid}`);
                    const snapshot = await get(portfoliosRef);
                    if (snapshot.exists()) {
                        const portfoliosData = snapshot.val();
                        const loadedPortfolios = Object.entries(portfoliosData).map(([id, data]: [string, any]) => ({
                            id,
                            nomePortfolio: data.nomePortfolio,
                            robos: data.robos || [],
                            dataCriacao: data.dataCriacao,
                        }));
                        setUserPortfolios(loadedPortfolios.sort((a,b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()));
                    } else {
                        setUserPortfolios([]);
                    }
                } catch (err) {
                    console.error("Error searching for portfolios:", err);
                    setError("We were unable to load your portfolios.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPortfolios();
        } else {
            setIsLoading(false);
            setUserPortfolios([]);
        }
    }, [user]);

    const handleRemovePortfolio = async (portfolioId: string) => {
        if (!user?.uid || !portfolioId) return;

        const isConfirmed = window.confirm(
            "Are you sure you want to remove this portfolio? This action cannot be undone."
        );

        if (!isConfirmed) {
            return;
        }

        setDeletingId(portfolioId);
        setError(null);

        try {
            const db = getDatabase();
            const portfolioRef = dbRefFirebase(db, `portfolios/${user.uid}/${portfolioId}`);
            await remove(portfolioRef);

            setUserPortfolios(currentPortfolios => 
                currentPortfolios.filter(p => p.id !== portfolioId)
            );

        } catch (err) {
            console.error("Error removing portfolio:", err);
            setError("Failed to remove portfolio. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) { 
        return (
            <div className="flex justify-center items-center h-32">
                <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-600">Loading your portfolios...</span>
            </div>
        );
    }
    if (error) return <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">My Saved Portfolios</h2>
            {userPortfolios.length === 0 ? (
                <p className="text-gray-600 bg-blue-50 p-4 rounded-md">You haven't created any portfolios yet. Click the "Create New Portfolio" tab to get started.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {userPortfolios.map(portfolio => (
                        <Card key={portfolio.id} className="hover:shadow-lg transition-shadow duration-150 ease-in-out flex flex-col">
                            <CardHeader className="pb-3 pt-4 px-4">
                                <CardTitle className="text-lg text-purple-700">{portfolio.nomePortfolio}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <span className="font-medium">{portfolio.robos.length}</span> Robot(s) in the portfolio
                                    </p>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Created in: {new Date(portfolio.dataCriacao).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/dashboardportfolio?id=${portfolio.id}&origem=portfolio`)}
                                        disabled={deletingId === portfolio.id}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        See Analysis
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePortfolio(portfolio.id)}
                                        disabled={deletingId === portfolio.id}
                                        className="flex-1 bg-transparent hover:bg-red-100 text-red-600 font-semibold border border-red-500 text-sm py-2 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {deletingId === portfolio.id ? 'Removing...' : 'Delete'}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PortfolioPageContainer() {
    const [activeTab, setActiveTab] = useState<'meus' | 'novo'>('meus');
    const [sidebarAberta, setSidebarAberta] = useState(false);

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
                <main className="flex-1 bg-gray-50 p-4 md:p-6 overflow-y-auto" onClick={() => sidebarAberta && setSidebarAberta(false)}>
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Portfolio Manager</h1>
                    <div className="mb-6 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6 md:space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('meus')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'meus' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> My Portfolios </button>
                            <button onClick={() => setActiveTab('novo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'novo' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> Create New Portfolio </button>
                        </nav>
                    </div>
                    <Suspense fallback={ <div className="flex justify-center items-center h-40"> <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <span className="ml-2 text-gray-600">Loading...</span> </div> }>
                        {activeTab === 'meus' && <MyPortfoliosContent />}
                        {activeTab === 'novo' && <CreatePortfolioContent />}
                    </Suspense>
                </div>
                </main>
                </div>
        </div>
    );
}