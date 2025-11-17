// ========================================================
//  page.tsx — Monte Carlo Dashboard (Risk Buttons versão)
// ========================================================

'use client';

import { useEffect, useState, Suspense, useCallback, useRef, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, ResponsiveContainer,
    AreaChart, Area, Tooltip as RechartsTooltip, CartesianGrid,
    BarChart, Bar
} from 'recharts';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';


// -------------------------
// Tooltip do Monte Carlo
// -------------------------

const RiskLoadingOverlay = ({
    calculatingProgress,
}: {
    calculatingProgress: number;
}) => {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
            <ProgressLoadingSpinner
                calculatingProgress={calculatingProgress}
                phase="calculating"
                currentRenderedLines={0}
                totalSimulations={100}
            />
        </div>
    );
};

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

// -------------------------
// Progress Loader (overlay)
// -------------------------
function ProgressLoadingSpinner({
    calculatingProgress,
    phase,
    currentRenderedLines = 0,
    totalSimulations
}: {
    calculatingProgress: number;
    phase: 'calculating' | 'rendering';
    currentRenderedLines?: number;
    totalSimulations: number;
}) {

    const MAX_RENDER_LIMIT = 200;

    const title = phase === 'calculating'
        ? `Generating Simulations... ${calculatingProgress}%`
        : 'Rendering Chart...';

    let subtitle = 'Finalizing visualization...';
    let actualBarPercentage = 0;

    if (phase === 'calculating') {
        subtitle = 'This might take a few moments.';
        actualBarPercentage = calculatingProgress;
    } else if (phase === 'rendering' && totalSimulations > 0) {
        const simulationsRenderedEquivalent = Math.round((currentRenderedLines / MAX_RENDER_LIMIT) * totalSimulations);
        const continuousProgressPercentage = (simulationsRenderedEquivalent / totalSimulations) * 100;

        if (continuousProgressPercentage >= 90) actualBarPercentage = 100;
        else if (continuousProgressPercentage >= 65) actualBarPercentage = 75;
        else if (continuousProgressPercentage >= 40) actualBarPercentage = 50;
        else if (continuousProgressPercentage >= 15) actualBarPercentage = 25;
        else actualBarPercentage = 0;

        subtitle = `Rendering: ${Math.min(simulationsRenderedEquivalent, totalSimulations).toLocaleString('pt-BR')}/${totalSimulations.toLocaleString('pt-BR')} lines loaded.`;
    }

    return (
        <div className="flex flex-1 flex-col justify-center items-center h-full p-8 text-center min-h-[400px]">
            <svg className="animate-spin h-12 w-12 text-violet-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>

            <div className="w-full max-w-xs mx-auto bg-slate-700 rounded-full h-2.5 mb-2 shadow-inner">
                <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-150" style={{ width: `${actualBarPercentage}%` }}></div>
            </div>

            <p className="text-gray-300 font-semibold animate-pulse">{title}</p>
            <p className="text-xs text-gray-500 mt-1 animate-pulse">{subtitle}</p>
        </div>
    );
}

// -------------------------
// Hooks & Interfaces
// -------------------------
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

interface PathPoint { step: number; value: number; }
interface Simulation { path: PathPoint[]; color: string; }
interface OcorrenciaDrawdown {
    label: string; limite: number; vezes: number; porcentagem: number;
    histograma: { name: string; ocorrencias: number }[];
}

// -------------------------
// Risk result cards
// -------------------------
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

// -------------------------
// Risk Buttons (no slider)
// -------------------------
const RiskButtons = React.memo(function RiskButtons({
    riscoAceito,
    onRiscoChange
}: {
    riscoAceito: number;
    onRiscoChange: (value: number) => void;
}) {
    const options = [
        { label: "25%", value: 0.25 },
        { label: "50%", value: 0.50 },
        { label: "75%", value: 0.75 },
        { label: "100%", value: 1.00 },
    ];

    return (
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onRiscoChange(opt.value)}
                    className={`
                        px-4 py-2 rounded-lg border text-sm font-semibold transition-all
                        ${riscoAceito === opt.value
                            ? "bg-violet-600 border-violet-400 text-white"
                            : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"}
                    `}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
});

// -------------------------
// StatCard helper
// -------------------------
const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string; }) => (
    <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-sm font-medium text-gray-400 mt-1">{label}</p>
    </div>
);

// -------------------------
// Main Content
// -------------------------
function SimulacaoMonteCarloContent() {
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const searchParams = useSearchParams();
    const nomeRobo = searchParams.get('robo') || "Unknown Bot";

    const [chartLoadingState, setChartLoadingState] = useState<'calculating' | 'rendering' | 'done'>('calculating');
    const [calculatingProgress, setCalculatingProgress] = useState(0);

    const [retornoMedioSimulacao] = useState(0.0015);
    const [desvioPadraoSimulacao] = useState(0.01);

    const [isRiskCalculating, setIsRiskCalculating] = useState(false);
    const [riscoAceito, setRiscoAceito] = useState(0.25);

    const quantidadeSimulacoes = Number(searchParams.get('simulacoes') || 1000);
    const stepsSimulacao = 252;

    const fullDataRef = useRef<any[]>([]);
    const [renderedLines, setRenderedLines] = useState<any[]>([]);
    const [estatisticas, setEstatisticas] = useState<any>({
        maiorDrawdown: 0, drawdownMedio: 0, menorDrawdown: 0,
        desvioPadraoDrawdowns: 0, ocorrenciasDrawdown: [],
        melhorEstagnacao: 0, piorEstagnacao: 0, mediaEstagnacao: 0,
        melhorMes: 0, piorMes: 0, mediaMes: 0,
        histMensal: [],
        frequenciaPeriodosNegativos: { meses: 0, trimestres: 0, semestres: 0, anos: 0 },
    });
    const [resultadoRisco, setResultadoRisco] = useState<any>({
        capitalRecomendado: 0,
        retornoMensalEstimado: 0,
        riscoRuinaEstimado: 0,
        ocorrenciasRuina: 0
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

    const handleRiscoChange = useCallback((newRisco: number) => {
        startTransition(() => {
            setIsRiskCalculating(true);
            setRiscoAceito(newRisco);
        });
    }, []);


    // gerarSimulacoes (usa worker .ts — verifique se o arquivo existe como .ts)
    const gerarSimulacoes = useCallback(() => {
        setChartLoadingState('calculating');
        setCalculatingProgress(0);
        setRenderedLines([]);
        fullDataRef.current = [];
        setIsRiskCalculating(true);

        terminateRiskWorker();

        setEstatisticas((prev: any) => ({
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
            workerRef.current = null;
        }

        // NOTE: apontar para .ts (ou .js) build-friendly — ajuste conforme seu build pipeline
        const worker = new Worker(new URL('./montecarloworker.tsx', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
            const { type, progress, data, error } = event.data;

            if (type === 'progress') {
                setCalculatingProgress(progress);
            } else if (type === 'result') {
                setCalculatingProgress(100);
                fullDataRef.current = data.monteCarloData || [];
                setEstatisticas(data.estatisticas || {});
                setTodosMaioresDrawdownsSimulacao(data.todosMaioresDrawdownsSimulacao || []);
                setChartLoadingState('rendering');

                worker.terminate();
                workerRef.current = null;
            } else if (type === 'error') {
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

    // render por chunks
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
                    // free memory
                    fullDataRef.current = [];
                }
            }
            requestAnimationFrame(renderNextChunk);
        }
    }, [chartLoadingState]);

    // inicialização
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

    // recalcula risco quando riscoAceito muda — usa worker de risco (apontar para .ts)
    useEffect(() => {
        terminateRiskWorker();

        if (todosMaioresDrawdownsSimulacao.length === 0 || estatisticas.maiorDrawdown === 0) {
            setResultadoRisco({ capitalRecomendado: 0, retornoMensalEstimado: 0, riscoRuinaEstimado: 0, ocorrenciasRuina: 0 });
            setIsRiskCalculating(false);
            return;
        }

        requestAnimationFrame(() => {
            setTimeout(() => {
                const worker = new Worker(new URL('./riskcalculatorworker.tsx', import.meta.url));
                riskWorkerRef.current = worker;

                worker.onmessage = (event) => {
                    const { resultado } = event.data || {};
                    setResultadoRisco(resultado || {
                        capitalRecomendado: 0,
                        retornoMensalEstimado: 0,
                        riscoRuinaEstimado: 0,
                        ocorrenciasRuina: 0
                    });
                    setIsRiskCalculating(false);
                    riskWorkerRef.current?.terminate();
                    riskWorkerRef.current = null;
                };

                worker.postMessage({
                    riscoAceito,
                    todosMaioresDrawdownsSimulacao,
                    maiorDrawdown: estatisticas.maiorDrawdown,
                    drawdownMedio: estatisticas.drawdownMedio,
                    mediaMes: estatisticas.mediaMes
                });
            }, 0);
        });


        return () => {
            terminateRiskWorker();
        };

    }, [riscoAceito, todosMaioresDrawdownsSimulacao, estatisticas.maiorDrawdown, estatisticas.drawdownMedio, estatisticas.mediaMes, terminateRiskWorker]);

    // formatadores
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

    // JSX
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

                    {/* Chart card */}
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

                            {chartLoadingState !== 'done' && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800/90 rounded-2xl backdrop-blur-sm">
                                    <ProgressLoadingSpinner
                                        calculatingProgress={calculatingProgress}
                                        phase={chartLoadingState as 'calculating' | 'rendering'}
                                        currentRenderedLines={renderedLines.length}
                                        totalSimulations={quantidadeSimulacoes}
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* content that appears after initial calculation */}
                    {chartLoadingState !== 'calculating' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Drawdown Analysis */}
                            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg text-center font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-3">Drawdown Analysis</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                                    <StatCard label="Maximum Drawdown" value={formatCurrency(estatisticas.maiorDrawdown)} color="text-red-400" />
                                    <StatCard label="Average Drawdown" value={formatCurrency(estatisticas.drawdownMedio)} color="text-amber-400" />
                                    <StatCard label="Minimum Drawdown" value={formatCurrency(estatisticas.menorDrawdown)} color="text-sky-400" />
                                    <StatCard label="Std Dev (DDs)" value={formatCurrency(estatisticas.desvioPadraoDrawdowns)} color="text-violet-400" />
                                </div>
                            </section>

                            {/* Drawdown Occurrences */}
                            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg text-center font-semibold text-violet-400 mb-5 border-b border-slate-700 pb-3">Drawdown Occurrences</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {estatisticas.ocorrenciasDrawdown.map((item: OcorrenciaDrawdown, index: number) => (
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
                                                            <Bar dataKey="ocorrencias" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Stagnation and Monthly */}
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

                            {/* Distribution & Frequency */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {estatisticas.histMensal.length > 0 && (
                                    <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                        <h3 className="text-lg text-center font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-3">Monthly Results Distribution</h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <AreaChart data={estatisticas.histMensal.map((valor: number, i: number) => ({ x: i + 1, y: valor }))} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
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

                            {/* Suggested Risk Management — agora com botões */}
                            <section className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">

                                {/* --- Overlay de carregamento do risco --- */}
                                {isRiskCalculating && (
                                    <RiskLoadingOverlay calculatingProgress={calculatingProgress} />
                                )}

                                <h3 className="text-lg font-semibold text-violet-400 mb-5 text-center border-b border-slate-700 pb-3">
                                    Suggested Risk Management
                                </h3>


                                <RiskButtons
                                    riscoAceito={riscoAceito}
                                    onRiscoChange={handleRiscoChange}
                                />



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

// -------------------------
// Page wrapper export
// -------------------------
export default function SimulacaoMonteCarloPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-violet-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <p className="text-lg font-semibold text-gray-300">Loading Simulation...</p>
                    <p className="text-sm text-gray-500">Fetching parameters and preparing the environment.</p>
                </div>
            </div>
        }>
            <SimulacaoMonteCarloContent />
        </Suspense>
    );
}
