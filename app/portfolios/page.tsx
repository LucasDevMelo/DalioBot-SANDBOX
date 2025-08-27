'use client';

import React, { useState, useEffect, Suspense } from 'react'; // useCallback removido se não usado
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/authcontext';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import { getDatabase, ref as dbRefFirebase, get, set, push, remove } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlanNameFromPriceId } from '@/src/utils/paddleUtils'; // Certifique-se que o caminho está correto

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
  fatorLucro?: number; // Campo adicionado
  lucroBruto?: number; // Adicional útil
  prejuizoBruto?: number; // Adicional útil
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
    dailyPL: number; // Mantido para dados individuais do robô
}

interface PortfolioCsvData {
    '<DATE>': string;
    '<BALANCE>': number; // Com a nova lógica, Balance e Equity serão iguais
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

    // A heurística é: a presença de uma vírgula indica o formato PT-BR ("1.234,56").
    // A ausência dela indica o formato padrão/US ("1234.56" ou "1,234.56").

    // Caso 1: Formato brasileiro (usa vírgula como decimal).
    if (s.includes(',')) {
        // Remove os pontos (milhar) e depois troca a vírgula (decimal) por um ponto.
        const brNum = parseFloat(s.replace(/\./g, '').replace(',', '.'));
        // Se for um número válido (ex: "1.234,56" -> 1234.56), retorna ele.
        // Se der um resultado estranho (ex: "1,234.56" -> 1), ele tentará o próximo passo.
        if (!isNaN(brNum) && s.includes('.')) {
             return brNum;
        }
    }
    
    // Caso 2: Formato americano ou sem separador de milhar (usa ponto como decimal).
    // Ou como fallback para o caso 1.
    // A chave aqui é remover apenas as vírgulas. O parseFloat já lida com o ponto decimal.
    // Ex: "1,234.56" -> "1234.56" -> 1234.56
    // Ex: "1234.56"  -> "1234.56" -> 1234.56
    const usNum = parseFloat(s.replace(/,/g, ''));
    return usNum;
};


function CreatePortfolioContent() {
  const { user, subscription } = useAuth(); // Antes era só 'user'
  const router = useRouter();
  const [availableRobots, setAvailableRobots] = useState<RobotStrategy[]>([]);
  const [selectedRobots, setSelectedRobots] = useState<Set<string>>(new Set());
  const [portfolioName, setPortfolioName] = useState('');
  const [loadingRobots, setLoadingRobots] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PLAN_LIMITS = {
    starter: { maxPortfolios: 1, maxStrategies: 2, name: 'Starter' },
    basic: { maxPortfolios: Infinity, maxStrategies: 5, name: 'Basic' },
    pro: { maxPortfolios: Infinity, maxStrategies: 10, name: 'Pro' },
  };

  // ✅ PASSO 4: DETERMINE O PLANO ATUAL DO USUÁRIO
  // Se não houver assinatura, o usuário é 'starter'.
  const userPlanName = getPlanNameFromPriceId(subscription?.planName) || 'starter';
  const currentPlanLimits = PLAN_LIMITS[userPlanName as keyof typeof PLAN_LIMITS]
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
    // Limpa erros antigos ao tentar uma nova ação
    setError(null);

    setSelectedRobots(prevSelected => {
      const newSelected = new Set(prevSelected);
      
      if (newSelected.has(robotId)) {
        newSelected.delete(robotId); // Sempre permite remover
      } else {
        // Antes de adicionar, verifica o limite de estratégias
        if (newSelected.size >= currentPlanLimits.maxStrategies) {
          setError(`Seu plano ${currentPlanLimits.name} permite no máximo ${currentPlanLimits.maxStrategies} estratégias por portfólio.`);
          return prevSelected; // Retorna o estado anterior, sem adicionar
        }
        newSelected.add(robotId);
      }
      return newSelected;
    });
  };

  // DENTRO DO SEU COMPONENTE CreatePortfolioContent...

// 👇 SUBSTITUA SUA FUNÇÃO PELA VERSÃO DE "DEPURAÇÃO MÁXIMA" ABAIXO 👇
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

  // =======================================================================
// CORRIGIDO: LÓGICA "CARRY FORWARD" PARA aggregatePortfolioData
// =======================================================================
const aggregatePortfolioData = (allRobotsData: Record<string, ProcessedRobotData[]>): PortfolioCsvData[] => {
    const portfolioTimeline: PortfolioCsvData[] = [];
    const allDates = new Set<string>();

    // 1. Coletar todas as datas únicas de todos os robôs
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

    // 2. Criar um mapa de lookup para acesso rápido aos dados por data
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

    // 3. Objeto para armazenar o último equity conhecido de cada robô (estado persistente)
    const lastKnownEquities: Record<string, number> = {};
    Object.keys(allRobotsData).forEach(robotId => {
        lastKnownEquities[robotId] = 0; // Inicializa todos em zero
    });

    // 4. Iterar sobre a linha do tempo e construir os dados do portfólio
    sortedUniqueDates.forEach(dateStr => {
        // PASSO 1: ATUALIZAR O ESTADO
        // Para a data atual, verifique se algum robô tem um novo valor de equity.
        // Se tiver, atualize o seu "último valor conhecido".
        Object.keys(allRobotsData).forEach(robotId => {
            const dataPointForDate = robotDataByDate[dateStr]?.[robotId];
            if (dataPointForDate) {
                lastKnownEquities[robotId] = dataPointForDate.equity;
            }
        });

        // PASSO 2: CALCULAR O TOTAL
        // Agora, some os "últimos valores conhecidos" de TODOS os robôs.
        // Isso garante que estamos usando o valor mais recente para cada um,
        // seja o de hoje ou um valor carregado de dias anteriores.
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
// =======================================================================
// 👇 PASSO 1: ADICIONE ESTA NOVA FUNÇÃO AUXILIAR DENTRO DO SEU COMPONENTE
// =======================================================================
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

    // Evita divisão por zero. Se não houver perdas, o fator de lucro é considerado 0 ou infinito.
    // Para armazenamento, é mais seguro usar 0 ou um valor muito alto. Usaremos 0 aqui.
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

    // --- NOVAS VERIFICAÇÕES DE LIMITE ---
    // 1. Re-verificar o limite de estratégias (como uma segurança extra)
    if (selectedRobots.size > currentPlanLimits.maxStrategies) {
        setError(`Limite de estratégias excedido. Seu plano ${currentPlanLimits.name} permite até ${currentPlanLimits.maxStrategies} robôs.`);
        return;
    }

    setIsSimulating(true);
    setError(null);

    // 2. Verificar o limite de portfólios (APENAS PARA O PLANO STARTER)
    if (currentPlanLimits.maxPortfolios !== Infinity) {
        try {
            const db = getDatabase();
            const portfoliosRef = dbRefFirebase(db, `portfolios/${user.uid}`);
            const snapshot = await get(portfoliosRef);
            const existingPortfoliosCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            
            if (existingPortfoliosCount >= currentPlanLimits.maxPortfolios) {
                setError(`Portfolio limit reached. Your plan ${currentPlanLimits.name} allows you to create up to ${currentPlanLimits.maxPortfolios} portfolio. Upgrade to create more.`);
                setIsSimulating(false);
                return;
            }
        } catch (err) {
            setError("We were unable to verify your existing portfolios. Please try again.");
            setIsSimulating(false);
            return;
        }
    }

    const robotsWithNoData: string[] = [];
    const processingErrors: string[] = [];



    try {
        const allRobotsData: Record<string, ProcessedRobotData[]> = {};

        for (const robotId of selectedRobots) {
            try {
                const robotData = await fetchAndProcessRobotDataFromRTDB(robotId);
                if (robotData.length === 0) {
                    // Encontra o nome do robô para a mensagem de erro
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

        // Se houve erros críticos que impediram o processamento
        if (processingErrors.length > 0) {
            throw new Error(`A critical error occurred while processing the following robots:${processingErrors.join(', ')}. Check the console for more details.`);
        }
        
        // Se todos os robôs selecionados não retornaram dados
        if (robotsWithNoData.length === selectedRobots.size) {
            throw new Error(`No actionable data was found for the selected robots: ${robotsWithNoData.join(', ')}. Verify that their data files (CSV) contain dates and equity values in valid formats.`);
        }

        const portfolioConsolidatedData = aggregatePortfolioData(allRobotsData);
        
        if (portfolioConsolidatedData.length === 0) {
             // Este erro pode acontecer se os robôs não tiverem datas em comum
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
          fatorLucro: metrics.profitFactor, // <-- ADICIONADO
          lucroBruto: metrics.grossProfit, // <-- ADICIONADO (BÔNUS)
          prejuizoBruto: metrics.grossLoss, // <-- ADICIONADO (BÔNUS)
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
      <div className="mb-6 p-4 bg-pink-50 border border-purple-200 rounded-lg">
        <h2 className="text-xl font-semibold text-purple-800 mb-1">Simulate Portfolios</h2>
        <p className="text-sm text-purple-900">
          Here you can view the statistics of multiple robots running together.
Select the strategies you want and click "Simulate Portfolios and View Analysis."
        </p>
      </div>
      <div className="mb-6 p-3 bg-pink-50 border border-pink-200 rounded-lg text-sm">
        <p className="text-pink-800">
          You are in the plan <span className="font-bold">{currentPlanLimits.name}</span>.
          <span className="ml-2">
            (Limit of <span className="font-bold">{currentPlanLimits.maxStrategies}</span> portfolio strategies).
          </span>
          {currentPlanLimits.maxPortfolios !== Infinity && 
            <span className="ml-2">
              (Limit of <span className="font-bold">{currentPlanLimits.maxPortfolios}</span> saved portfolio).
            </span>
          }
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
          placeholder="Ex: Portfólio 1"
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
    // ✅ Lógica para verificar se o limite do plano foi atingido
    const limitReached = selectedRobots.size >= currentPlanLimits.maxStrategies && !selectedRobots.has(robot.id);

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
            // ✅ Atributo 'disabled' é adicionado aqui
            disabled={limitReached}
            className={`w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400
              ${selectedRobots.has(robot.id)
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'border border-purple-500 text-purple-600 hover:bg-purple-100'}
              {/* ✅ Classe CSS para o estado desabilitado */}
              ${limitReached ? 'opacity-50 cursor-not-allowed' : ''}`
            }
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
  // Novo estado para controlar qual portfólio está sendo deletado
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

  // Nova função para lidar com a remoção do portfólio
  const handleRemovePortfolio = async (portfolioId: string) => {
    if (!user?.uid || !portfolioId) return;

    // Pede confirmação antes de uma ação destrutiva
    const isConfirmed = window.confirm(
      "Are you sure you want to remove this portfolio? This action cannot be undone."
    );

    if (!isConfirmed) {
      return;
    }

    setDeletingId(portfolioId); // Ativa o estado de "removendo" para este card
    setError(null);

    try {
      const db = getDatabase();
      const portfolioRef = dbRefFirebase(db, `portfolios/${user.uid}/${portfolioId}`);
      await remove(portfolioRef); // Comando para remover do Firebase

      // Atualiza a UI removendo o portfólio da lista local
      setUserPortfolios(currentPortfolios => 
        currentPortfolios.filter(p => p.id !== portfolioId)
      );

    } catch (err) {
      console.error("Error removing portfolio:", err);
      setError("Failed to remove portfolio. Please try again.");
    } finally {
      setDeletingId(null); // Desativa o estado de "removendo"
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
                {/* Container para os botões */}
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
            {/* Botão do menu mobile */}
            <div className="md:hidden p-2 bg-white shadow z-40">
                <button
                    onClick={() => setSidebarAberta(!sidebarAberta)}
                    className="text-purple-700 font-bold text-xl"
                >
                    ☰ 
                </button>
            </div>
            <div className="flex flex-1">
                {/* Sidebar responsiva */}
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