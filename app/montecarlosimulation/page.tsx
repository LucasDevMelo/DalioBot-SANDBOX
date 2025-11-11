'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    LineChart, Line, XAxis, YAxis, ResponsiveContainer,
    AreaChart, Area, Tooltip as RechartsTooltip, CartesianGrid,
    BarChart, Bar
} from 'recharts';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import React from 'react';

// --- Reusable Components ---

// Componente Tooltip (Sem alterações)
const MonteCarloTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
        const values = payload.map((p: any) => p.value).sort((a: number, b: number) => a - b);
        const min = values[0];
        const max = values[values.length - 1];
        const median = values[Math.floor(values.length / 2)];
        const average = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;

        return (
            <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg text-sm">
                <p className="font-bold text-violet-400 mb-2">{`Day ${label}`}</p>
                <p className="text-gray-300"><strong>Max:</strong> <span className="font-mono text-emerald-400">{formatter(max)}</span></p>
                <p className="text-gray-300"><strong>Median:</strong> <span className="font-mono text-amber-400">{formatter(median)}</span></p>
                <p className="text-gray-300"><strong>Average:</strong> <span className="font-mono text-sky-400">{formatter(average)}</span></p>
                <p className="text-gray-300"><strong>Min:</strong> <span className="font-mono text-red-400">{formatter(min)}</span></p>
            </div>
        );
    }
    return null;
};

// --- MODIFICADO ---
// Spinner de loading com a contagem de renderização CORRIGIDA para equivalência visual.
function ProgressLoadingSpinner({ 
    progress, 
    phase, 
    currentRenderedLines = 0, // X_real
    totalSimulations // Y
}: { 
    progress: number; 
    phase: 'calculating' | 'rendering';
    currentRenderedLines?: number; 
    totalSimulations: number; 
}) {
    
    const MAX_RENDER_LIMIT = 200; // O limite real do gráfico
    
    const title = phase === 'calculating' 
        ? `Generating Simulations... ${progress}%` 
        : 'Rendering Chart...';
        
    let subtitle = 'Finalizing visualization...'; 

    if (phase === 'calculating') {
        subtitle = 'This might take a few moments.';
    } else if (phase === 'rendering' && totalSimulations > 0) {
        
        // 1. Calcula o progresso visual equivalente (X_visual)
        const simulationsRenderedEquivalent = Math.round(
            (currentRenderedLines / MAX_RENDER_LIMIT) * totalSimulations
        );
        
        // 2. Garante que o contador nunca exceda o total (Y)
        const visualCount = Math.min(simulationsRenderedEquivalent, totalSimulations);
        
        // 3. Constrói a mensagem com a contagem visual
        subtitle = `Rendering: ${visualCount.toLocaleString('pt-BR')}/${totalSimulations.toLocaleString('pt-BR')} lines.`; 
    }

    return (
        <div className="flex flex-1 flex-col justify-center items-center h-full p-8 text-center min-h-[400px]">
            {/* --- SVG CORRIGIDO --- */}
            <svg className="animate-spin h-12 w-12 text-violet-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {/* --- FIM DA CORREÇÃO --- */}
            
            <div className="w-full max-w-xs mx-auto bg-slate-700 rounded-full h-2.5 mb-2 shadow-inner">
                <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-150" style={{ width: `${progress}%` }}></div>
            </div>
            
            {/* --- TEXTO COM ANIMAÇÃO "PULSE" --- */}
            <p className="text-gray-300 font-semibold animate-pulse">{title}</p>
            {/* NOVO: Exibe o subtítulo dinâmico */}
            <p className="text-xs text-gray-500 mt-1 animate-pulse">{subtitle}</p>
        </div>
    );
}

// --- Hooks & Interfaces ---

// Hook useDebounce (Não usado, mas mantido)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// Interfaces (Sem alterações)
interface PathPoint { step: number; value: number; }
interface Simulation { path: PathPoint[]; color: string; }
interface OcorrenciaDrawdown {
    label: string;
    limite: number;
    vezes: number;
    porcentagem: number;
    histograma: { name: string; ocorrencias: number }[];
}

// --- NOVO COMPONENTE: Gerencia a exibição dos resultados de risco ou dos loaders ---
const RiskResultCards = ({ resultadoRisco, quantidadeSimulacoes, formatCurrency, formatPercentage, isCalculating }: any) => {
    if (isCalculating) {
        return (
            <div className="flex justify-center items-center h-48 bg-slate-800/50 rounded-xl shadow-inner">
                <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-violet-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <p className="text-sm font-semibold text-gray-400 animate-pulse">Calculating Risk...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
            <div className="bg-violet-900/50 border border-violet-700/80 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-400 mb-1">Recommended Capital</p>
                <p className="text-2xl font-bold text-violet-300">{formatCurrency(resultadoRisco.capitalRecomendado)}</p>
            </div>
            <div className="bg-emerald-900/50 border border-emerald-700/80 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-400 mb-1">Estimated Monthly Return</p>
                <p className="text-2xl font-bold text-emerald-400">{formatPercentage(resultadoRisco.retornoMensalEstimado)}</p>
            </div>
            <div className="bg-red-900/50 border border-red-700/80 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-400 mb-1">Estimated Risk of Ruin</p>
                <p className="text-2xl font-bold text-red-400">{formatPercentage(resultadoRisco.riscoRuinaEstimado)}</p>
                <p className="text-xs text-gray-500">({resultadoRisco.ocorrenciasRuina} of {quantidadeSimulacoes} sims)</p>
            </div>
        </div>
    );
};
// --- FIM DO NOVO COMPONENTE RiskResultCards ---


// --- NOVO COMPONENTE ISOLADO RiskSlider (para fluidez no drag) ---
interface RiskSliderProps {
    initialRisco: number;
    onRiscoChange: (newRisco: number) => void;
    formatPercentage: (value: number, digits: number) => string;
}

const RiskSlider: React.FC<RiskSliderProps> = React.memo(({ initialRisco, onRiscoChange, formatPercentage }) => {
    // ESTADO LOCAL para controlar o slider em tempo real sem re-renderizar o pai
    const [localRisco, setLocalRisco] = useState(initialRisco);

    // Sincroniza o estado local com o prop se o prop mudar (ex: se o usuário mudar de robo)
    useEffect(() => {
        setLocalRisco(initialRisco);
    }, [initialRisco]);

    const handleRiscoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Atualiza apenas o estado local (renderiza apenas este componente)
        setLocalRisco(Number(e.target.value));
    };

    const handleRiscoRelease = () => {
        // onRiscoChange faz o trabalho agrupado no pai
        onRiscoChange(localRisco);
    };

    return (
        <div className="mb-6">
            <label htmlFor="riscoRange" className="block text-sm font-medium text-gray-300 mb-2">
                Your Accepted Risk Level: <span className="font-bold text-violet-300">{formatPercentage(localRisco * 100, 0)}</span>
            </label>
            <input 
                id="riscoRange" 
                type="range" 
                min={0.05} 
                max={1} 
                step={0.01} 
                value={localRisco} 
                onChange={handleRiscoChange}
                onMouseUp={handleRiscoRelease} 
                onTouchEnd={handleRiscoRelease}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" 
            />
        </div>
    );
});
RiskSlider.displayName = 'RiskSlider';
// --- FIM DO NOVO COMPONENTE ISOLADO RiskSlider ---


// --- Main Content Component ---

function SimulacaoMonteCarloContent() {
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const searchParams = useSearchParams();
    const nomeRobo = searchParams.get('robo') || "Unknown Bot";

    // Estados de loading (Sem alterações)
    const [chartLoadingState, setChartLoadingState] = useState<'calculating' | 'rendering' | 'done'>('calculating');
    const [progress, setProgress] = useState(0);

    const [retornoMedioSimulacao, setRetornoMedioSimulacao] = useState(0.0015);
    const [desvioPadraoSimulacao, setDesvioPadraoSimulacao] = useState(0.01);
    
    // ESTADO NOVO: Indica que o cálculo de risco está em andamento (para o loading)
    const [isRiskCalculating, setIsRiskCalculating] = useState(false);
    
    const [riscoAceito, setRiscoAceito] = useState(0.20);
    
    const quantidadeSimulacoes = Number(searchParams.get('simulacoes') || 1000);
    const stepsSimulacao = 252;

    // Estados de dados (Sem alterações)
    const fullDataRef = useRef<Simulation[]>([]);
    const [renderedLines, setRenderedLines] = useState<Simulation[]>([]);
    const [estatisticas, setEstatisticas] = useState({
        maiorDrawdown: 0, drawdownMedio: 0, menorDrawdown: 0,
        desvioPadraoDrawdowns: 0, ocorrenciasDrawdown: [] as OcorrenciaDrawdown[],
        melhorEstagnacao: Infinity, piorEstagnacao: 0, mediaEstagnacao: 0,
        melhorMes: -Infinity, piorMes: Infinity, mediaMes: 0,
        histMensal: [] as number[],
        frequenciaPeriodosNegativos: { meses: 0, trimestres: 0, semestres: 0, anos: 0 },
    });
    const [resultadoRisco, setResultadoRisco] = useState({
        capitalRecomendado: 0, retornoMensalEstimado: 0,
        riscoRuinaEstimado: 0, ocorrenciasRuina: 0
    });
    const [todosMaioresDrawdownsSimulacao, setTodosMaioresDrawdownsSimulacao] = useState<number[]>([]);

    const workerRef = useRef<Worker | null>(null);
    const riskWorkerRef = useRef<Worker | null>(null); 

    const terminateRiskWorker = useCallback(() => {
        if (riskWorkerRef.current) {
            riskWorkerRef.current.terminate();
            riskWorkerRef.current = null;
        }
    }, []);

    // NOVO: Função que agrupa a atualização do risco e do loading.
    const handleRiscoChange = useCallback((newRisco: number) => {
        // O React agrupa essas duas chamadas, resultando em uma única reconciliação leve
        setIsRiskCalculating(true);
        setRiscoAceito(newRisco);
    }, []);


    // 'gerarSimulacoes' (Modificado para usar startRiskCalculation)
    const gerarSimulacoes = useCallback(() => {
        setChartLoadingState('calculating'); 
        setProgress(0);
        setRenderedLines([]); 
        fullDataRef.current = []; 
        setIsRiskCalculating(true); // Inicia o loading de risco também na simulação inicial
        
        terminateRiskWorker(); // Encerra worker de risco anterior
        
        setEstatisticas(prev => ({ 
            ...prev, 
            maiorDrawdown: 0, drawdownMedio: 0, menorDrawdown: 0,
            desvioPadraoDrawdowns: 0, ocorrenciasDrawdown: [],
            melhorEstagnacao: Infinity, piorEstagnacao: 0, mediaEstagnacao: 0,
            melhorMes: -Infinity, piorMes: Infinity, mediaMes: 0,
            histMensal: [],
            frequenciaPeriodosNegativos: { meses: 0, trimestres: 0, semestres: 0, anos: 0 },
        }));
        setTodosMaioresDrawdownsSimulacao([]);

        if (workerRef.current) {
            workerRef.current.terminate();
        }

        const worker = new Worker(new URL('./montecarloworker.tsx', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
            const { type, progress, data, error } = event.data;

            if (type === 'progress') {
                setProgress(progress); 
            } 
            else if (type === 'result') {
                setProgress(100);
                fullDataRef.current = data.monteCarloData; 
                setEstatisticas(data.estatisticas);
                setTodosMaioresDrawdownsSimulacao(data.todosMaioresDrawdownsSimulacao);
                setChartLoadingState('rendering'); 
                
                // O cálculo de risco será disparado pelo useEffect que monitora todosMaioresDrawdownsSimulacao
                
                worker.terminate();
                workerRef.current = null;
            } 
            else if (type === 'error') {
                console.error('Erro no Monte Carlo Worker:', error);
                setChartLoadingState('done'); 
                setIsRiskCalculating(false);
                worker.terminate();
                workerRef.current = null;
            }
        };

        worker.postMessage({
            quantidadeSimulacoes,
            stepsSimulacao,
            retornoMedioSimulacao,
            desvioPadraoSimulacao
        });

    }, [quantidadeSimulacoes, retornoMedioSimulacao, desvioPadraoSimulacao, stepsSimulacao, terminateRiskWorker]);

    // useEffect para renderização "fatiada" (Sem alterações)
    useEffect(() => {
        if (chartLoadingState === 'rendering') {
            const CHUNK_SIZE = 20; 
            const MAX_LINES = Math.min(fullDataRef.current.length, 200);
            
            let currentChunk = 0;

            function renderNextChunk() {
                const start = currentChunk * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, MAX_LINES);
                const chunkData = fullDataRef.current.slice(start, end);
                setRenderedLines(prev => [...prev, ...chunkData]);
                currentChunk++;
                
                if (end < MAX_LINES) {
                    requestAnimationFrame(renderNextChunk);
                } else {
                    setChartLoadingState('done'); 
                    fullDataRef.current = []; 
                }
            }
            requestAnimationFrame(renderNextChunk);
        }
    }, [chartLoadingState]); 

    // useEffect de inicialização (Sem alterações)
    useEffect(() => {
        gerarSimulacoes();
        
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            terminateRiskWorker();
        };
    }, [gerarSimulacoes, terminateRiskWorker]);

    // CORRIGIDO: useEffect de cálculo de Risco (usa setTimeout para assincronia)
    useEffect(() => {
        terminateRiskWorker(); 

        if (todosMaioresDrawdownsSimulacao.length === 0 || estatisticas.maiorDrawdown === 0) {
            setResultadoRisco({ capitalRecomendado: 0, retornoMensalEstimado: 0, riscoRuinaEstimado: 0, ocorrenciasRuina: 0 });
            setIsRiskCalculating(false);
            return;
        }

        // Ação assíncrona: garantir que o spinner seja pintado antes de iniciar o Worker.
        const timer = setTimeout(() => {
            
            // 2. Cria e inicia o Worker de Risco
            const worker = new Worker(new URL('./riskcalculatorworker.tsx', import.meta.url));
            riskWorkerRef.current = worker;

            worker.onmessage = (event) => {
                // 4. Recebe o resultado do Worker
                const { resultado } = event.data;
                setResultadoRisco(resultado);
                setIsRiskCalculating(false); // Desativa o loading
                riskWorkerRef.current?.terminate();
                riskWorkerRef.current = null;
            };

            // 3. Envia os dados e o novo risco para o Worker
            worker.postMessage({
                riscoAceito,
                todosMaioresDrawdownsSimulacao,
                maiorDrawdown: estatisticas.maiorDrawdown,
                drawdownMedio: estatisticas.drawdownMedio,
                mediaMes: estatisticas.mediaMes
            });
        }, 0); 

        return () => {
            // Cleanup: encerra o timer e o worker se a dependência mudar
            clearTimeout(timer);
            terminateRiskWorker();
        };
    }, [riscoAceito, todosMaioresDrawdownsSimulacao, estatisticas.maiorDrawdown, estatisticas.drawdownMedio, estatisticas.mediaMes, terminateRiskWorker]);

    // Funções de Formatação (Sem alterações)
    const formatCurrency = (value: number) => {
        if (value === Infinity || value === -Infinity || isNaN(value)) return "N/A";
        return `$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const formatPercentage = (value: number, digits = 2) => {
        if (value === Infinity || value === -Infinity || isNaN(value)) return "N/A";
        return `${value.toFixed(digits)}%`;
    };
    const formatDays = (value: number) => {
        if (value === Infinity || value === -Infinity || isNaN(value)) return "N/A";
        return `${Math.round(value)} days`;
    };
    const tooltipStyle = {
        contentStyle: {
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #475569',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        labelStyle: { color: '#cbd5e1' },
        itemStyle: { color: '#94a3b8' }
    };

    // --- JSX (Renderização) ---
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-gray-300">
            <Topbar />
            <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
                <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-violet-400 font-bold text-xl p-2">☰</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <header className="mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Monte Carlo Simulation</h1>
                        <p className="text-slate-400 mt-1">{nomeRobo} - {quantidadeSimulacoes.toLocaleString('pt-BR')} Scenarios</p>
                    </header>

                    {/* Card do Gráfico (com overlay) */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-2xl shadow-slate-950/50 mb-8">
                        <div className="relative min-h-[500px]">
                            
                            <ResponsiveContainer width="100%" height={500}>
                                <LineChart margin={{ top: 5, right: 20, left: 50, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis
                                        type="number"
                                        dataKey="step"
                                        domain={[0, stepsSimulacao]}
                                        tick={{ fontSize: 10, fill: '#ffffffff' }}
                                        axisLine={{ stroke: '#ccc' }}
                                        tickLine={{ stroke: '#ccc' }}
                                        label={{
                                            value: "Simulation Days",
                                            position: 'insideBottom',
                                            offset: 0,
                                            dy: 10,
                                            fontSize: 12,
                                            fill: '#ffffffff'
                                        }}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        tickFormatter={(value) => formatCurrency(value)}
                                        tick={{ fontSize: 10, fill: '#ffffffff' }}
                                        axisLine={{ stroke: '#ccc' }}
                                        tickLine={{ stroke: '#ccc' }}
                                        label={{
                                            value: 'Simulated Capital($)',
                                            angle: -90,
                                            position: 'insideLeft',
                                            offset: 10,
                                            fontSize: 12,
                                            fill: '#ffffffff'
                                        }}
                                    />
                                    {renderedLines.map((simulacao, index) => (
                                        <Line
                                            key={index}
                                            data={simulacao.path}
                                            type="monotone"
                                            dataKey="value"
                                            stroke={simulacao.color}
                                            strokeWidth={0.8}
                                            dot={false}
                                            isAnimationActive={false} 
                                            opacity={0.6}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>

                            {/* O Spinner/Overlay só desaparece quando o gráfico está PRONTO */}
                            {chartLoadingState !== 'done' && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800/90 rounded-2xl backdrop-blur-sm">
                                    <ProgressLoadingSpinner 
                                        progress={progress} 
                                        phase={chartLoadingState as 'calculating' | 'rendering'}
                                        // PASSANDO: renderedLines.length / quantidadeSimulacoes
                                        currentRenderedLines={renderedLines.length}
                                        totalSimulations={quantidadeSimulacoes} 
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* O resto da página (stats) agora aparece assim que o CÁLCULO termina */}
                    {chartLoadingState !== 'calculating' && (
                        <div className="space-y-8 animate-fade-in"> 
                            {/* Drawdown Analysis Card */}
                            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg text-center font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-3">Drawdown Analysis</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                                    <StatCard label="Maximum Drawdown" value={formatCurrency(estatisticas.maiorDrawdown)} color="text-red-400" />
                                    <StatCard label="Average Drawdown" value={formatCurrency(estatisticas.drawdownMedio)} color="text-amber-400" />
                                    <StatCard label="Minimum Drawdown" value={formatCurrency(estatisticas.menorDrawdown)} color="text-sky-400" />
                                    <StatCard label="Standard Deviation (DDs)" value={formatCurrency(estatisticas.desvioPadraoDrawdowns)} color="text-violet-400" />
                                </div>
                            </section>

                            {/* Drawdown Occurrences Card */}
                            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg text-center font-semibold text-violet-400 mb-5 border-b border-slate-700 pb-3">Drawdown Occurrences</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {estatisticas.ocorrenciasDrawdown.map((item, index) => (
                                        <div key={index} className="bg-slate-800 rounded-xl p-4 shadow-inner flex flex-col items-center text-center">
                                            <h4 className="text-sm font-semibold text-gray-300 mb-2"> {item.label} </h4>
                                            <p className="text-xl font-bold text-violet-400 mb-1">{formatCurrency(item.limite)}</p>
                                            <p className="text-xs text-gray-500"> {item.vezes.toLocaleString('pt-BR')} times ({formatPercentage(item.porcentagem, 1)}) </p>
                                            {item.histograma?.length > 0 && (
                                                <div className="mt-4 w-full h-28">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={item.histograma} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
                                                            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
                                                            <RechartsTooltip {...tooltipStyle} formatter={(value: number) => [value, "Occurrences"]} />
                                                            <Bar dataKey="ocorrencias" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Stagnation and Monthly Results Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                    <h3 className="text-lg text-center font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-3">Stagnation Period</h3>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <StatCard label="Shortest" value={formatDays(estatisticas.melhorEstagnacao)} color="text-emerald-400" />
                                        <StatCard label="Average" value={formatDays(estatisticas.mediaEstagnacao)} color="text-sky-400" />
                                        <StatCard label="Longest" value={formatDays(estatisticas.piorEstagnacao)} color="text-red-400" />
                                    </div>
                                </section>
                                <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                    <h3 className="text-lg text-center font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-3">Monthly Results</h3>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <StatCard label="Best Month" value={formatCurrency(estatisticas.melhorMes)} color="text-emerald-400" />
                                        <StatCard label="Monthly Average" value={formatCurrency(estatisticas.mediaMes)} color="text-sky-400" />
                                        <StatCard label="Worst Month" value={formatCurrency(estatisticas.piorMes)} color="text-red-400" />
                                    </div>
                                </section>
                            </div>

                            {/* Distribution and Frequency Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {estatisticas.histMensal.length > 0 && (
                                    <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                        <h3 className="text-lg text-center font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-3">Monthly Results Distribution</h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <AreaChart data={estatisticas.histMensal.map((valor, i) => ({ x: i + 1, y: valor }))} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="x" tick={{ fontSize: 10 }} hide />
                                                <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={90} />
                                                <RechartsTooltip {...tooltipStyle} formatter={(value: number) => [formatCurrency(value), "Monthly Result"]} />
                                                <Area type="monotone" dataKey="y" stroke="#a78bfa" fillOpacity={1} fill="url(#colorMonthly)" strokeWidth={2.5} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </section>
                                )}
                                <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                    <h3 className="text-lg font-semibold text-violet-400 mb-4 text-center border-b border-slate-700 pb-3">Frequency of Negative Periods</h3>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <StatCard label="Months" value={formatPercentage(estatisticas.frequenciaPeriodosNegativos.meses)} color="text-violet-300" />
                                        <StatCard label="Quarters" value={formatPercentage(estatisticas.frequenciaPeriodosNegativos.trimestres)} color="text-violet-300" />
                                        <StatCard label="Semesters" value={formatPercentage(estatisticas.frequenciaPeriodosNegativos.semestres)} color="text-violet-300" />
                                        <StatCard label="Years" value={formatPercentage(estatisticas.frequenciaPeriodosNegativos.anos)} color="text-violet-300" />
                                    </div>
                                </section>
                            </div>

                            {/* Risk Management Card */}
                            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg font-semibold text-violet-400 mb-5 text-center border-b border-slate-700 pb-3">Suggested Risk Management</h3>
                                
                                {/* Uso do componente isolado RiskSlider */}
                                <RiskSlider
                                    initialRisco={riscoAceito}
                                    onRiscoChange={handleRiscoChange}
                                    formatPercentage={formatPercentage}
                                />

                                {/* Uso do novo componente RiskResultCards para exibir resultados ou loading */}
                                <RiskResultCards
                                    resultadoRisco={resultadoRisco}
                                    quantidadeSimulacoes={quantidadeSimulacoes}
                                    formatCurrency={formatCurrency}
                                    formatPercentage={formatPercentage}
                                    isCalculating={isRiskCalculating}
                                />

                                <p className="text-xs text-slate-500 mt-6 text-center">
                                    *Estimates based on simulations and the selected risk level. This is not a guarantee of future results.
                                </p>
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// Helper component StatCard (Sem alterações)
const StatCard = ({ label, value, color }: { label: string; value: string; color: string; }) => (
    <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-sm font-medium text-gray-400 mt-1">{label}</p>
    </div>
);


// --- Page Component Wrapper ---
export default function SimulacaoMonteCarloPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="text-center">
                    {/* --- SVG CORRIGIDO --- */}
                    <svg className="animate-spin h-10 w-10 text-violet-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    {/* --- FIM DA CORREÇÃO --- */}
                    <p className="text-lg font-semibold text-gray-300">Loading Simulation...</p>
                    <p className="text-sm text-gray-500">Fetching parameters and preparing the environment.</p>
                </div>
            </div>
        }>
            <SimulacaoMonteCarloContent />
        </Suspense>
    );
}