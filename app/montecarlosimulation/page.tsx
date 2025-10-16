'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
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

// Component to create a custom Tooltip that summarizes the data
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

// Loading spinner with progress bar
function ProgressLoadingSpinner({ progress }: { progress: number; }) {
    return (
        <div className="flex flex-1 flex-col justify-center items-center h-full p-8 text-center min-h-[400px]">
            <svg className="animate-spin h-12 w-12 text-violet-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="w-full max-w-xs mx-auto bg-slate-700 rounded-full h-2.5 mb-2 shadow-inner">
                <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-150" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-gray-300 font-semibold">Generating Simulations... {progress}%</p>
            <p className="text-xs text-gray-500 mt-1">This might take a few moments.</p>
        </div>
    );
}

// --- Hooks & Interfaces ---

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
    label: string;
    limite: number;
    vezes: number;
    porcentagem: number;
    histograma: { name: string; ocorrencias: number }[];
}


// --- Main Content Component ---

function SimulacaoMonteCarloContent() {
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const searchParams = useSearchParams();
    const nomeRobo = searchParams.get('robo') || "Unknown Bot";
    const [carregando, setCarregando] = useState(true);
    const [progresso, setProgresso] = useState(0);

    const [retornoMedioSimulacao, setRetornoMedioSimulacao] = useState(0.0015);
    const [desvioPadraoSimulacao, setDesvioPadraoSimulacao] = useState(0.01);
    const [riscoAceito, setRiscoAceito] = useState(0.20);
    const riscoAceitoDebounced = useDebounce(riscoAceito, 500);
    const quantidadeSimulacoes = Number(searchParams.get('simulacoes') || 1000);
    const stepsSimulacao = 252;

    const [monteCarloData, setMonteCarloData] = useState<Simulation[]>([]);
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

    const gerarSimulacoes = useCallback(async () => {
        setCarregando(true);
        setProgresso(0);
        const simulacoesGeradas: Simulation[] = [];
        const capitalInicial = 10000;
        const strongColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075'];
        let colorIndex = 0;
        const getRandomColor = () => {
            const color = strongColors[colorIndex % strongColors.length];
            colorIndex++;
            return color;
        };
        const todosOsDrawdowns: number[] = [];
        const todasDuracoesEstagnacao: number[] = [];
        const todosGanhosMensaisAgregados: number[] = [];
        const percentagesNegativeMonths: number[] = [];
        const percentagesNegativeTrimesters: number[] = [];
        const percentagesNegativeSemesters: number[] = [];
        const percentagesNegativeYears: number[] = [];

        for (let i = 0; i < quantidadeSimulacoes; i++) {
            const path: PathPoint[] = [{ step: 0, value: capitalInicial }];
            let maxValSimulacao = capitalInicial;
            let maxDrawdownSimulacao = 0;
            let diasEstagnado = 0;
            const estagnacoesDaSimulacao: number[] = [];
            const ganhosMensaisDaSimulacao: number[] = [];
            let ganhoAcumuladoMes = 0;

            for (let j = 1; j <= stepsSimulacao; j++) {
                const lastValue = path[j - 1].value;
                const randomShock = retornoMedioSimulacao + desvioPadraoSimulacao * (Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random()));
                const novoValor = Math.max(0, lastValue * (1 + randomShock));
                path.push({ step: j, value: novoValor });
                if (novoValor > maxValSimulacao) {
                    maxValSimulacao = novoValor;
                    if (diasEstagnado > 0) estagnacoesDaSimulacao.push(diasEstagnado);
                    diasEstagnado = 0;
                } else { diasEstagnado++; }
                const drawdown = novoValor - maxValSimulacao;
                if (drawdown < maxDrawdownSimulacao) maxDrawdownSimulacao = drawdown;
                ganhoAcumuladoMes += (novoValor - lastValue);
                if (j % 21 === 0 || j === stepsSimulacao) {
                    ganhosMensaisDaSimulacao.push(ganhoAcumuladoMes);
                    ganhoAcumuladoMes = 0;
                }
            }
            if (diasEstagnado > 0) estagnacoesDaSimulacao.push(diasEstagnado);
            todosOsDrawdowns.push(maxDrawdownSimulacao);
            todasDuracoesEstagnacao.push(...estagnacoesDaSimulacao.filter(d => d > 0));
            todosGanhosMensaisAgregados.push(...ganhosMensaisDaSimulacao);
            simulacoesGeradas.push({ path: path, color: getRandomColor() });
            if (ganhosMensaisDaSimulacao.length > 0) {
                const totalMonthsInSim = ganhosMensaisDaSimulacao.length;
                const negMonthsCount = ganhosMensaisDaSimulacao.filter(g => g < 0).length;
                percentagesNegativeMonths.push((negMonthsCount / totalMonthsInSim) * 100);
                const calculateRollingNegativePercentage = (data: number[], windowSize: number): number => {
                    if (data.length < windowSize) return 0;
                    let negativeWindowCount = 0;
                    const numPossibleWindows = data.length - windowSize + 1;
                    for (let k = 0; k < numPossibleWindows; k++) {
                        if (data.slice(k, k + windowSize).reduce((a, b) => a + b, 0) < 0) {
                            negativeWindowCount++;
                        }
                    }
                    return (negativeWindowCount / numPossibleWindows) * 100;
                };
                percentagesNegativeTrimesters.push(calculateRollingNegativePercentage(ganhosMensaisDaSimulacao, 3));
                percentagesNegativeSemesters.push(calculateRollingNegativePercentage(ganhosMensaisDaSimulacao, 6));
                percentagesNegativeYears.push(calculateRollingNegativePercentage(ganhosMensaisDaSimulacao, 12));
            } else {
                percentagesNegativeMonths.push(0); percentagesNegativeTrimesters.push(0);
                percentagesNegativeSemesters.push(0); percentagesNegativeYears.push(0);
            }
            setProgresso(Math.floor(((i + 1) / quantidadeSimulacoes) * 100));
            if (i % Math.floor(quantidadeSimulacoes / 100 || 1) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        setMonteCarloData(simulacoesGeradas);
        setTodosMaioresDrawdownsSimulacao(todosOsDrawdowns);
        const maiorDD = todosOsDrawdowns.length > 0 ? Math.min(...todosOsDrawdowns) : 0;
        const ddMedio = todosOsDrawdowns.length > 0 ? todosOsDrawdowns.reduce((a, b) => a + b, 0) / todosOsDrawdowns.length : 0;
        const menorDD = todosOsDrawdowns.length > 0 ? Math.max(...todosOsDrawdowns.filter(d => d < 0), 0) : 0;
        const varianciaDD = todosOsDrawdowns.length > 1 ? todosOsDrawdowns.reduce((sum, val) => sum + Math.pow(val - ddMedio, 2), 0) / (todosOsDrawdowns.length - 1) : 0;
        const dpDD = Math.sqrt(varianciaDD);
        const ocorrenciasDD: OcorrenciaDrawdown[] = [1, 2, 3].map(multiplicador => {
            const limite = ddMedio - (dpDD * multiplicador);
            const vezes = todosOsDrawdowns.filter(dd => dd <= limite).length;
            const minHist = maiorDD; const maxHist = 0; const numBins = 10;
            const binWidth = (maxHist - minHist) / numBins || 1;
            const histArray = Array(numBins).fill(0).map((_, idx) => {
                const binMin = minHist + idx * binWidth;
                const binMax = minHist + (idx + 1) * binWidth;
                return {
                    name: `${binMin.toFixed(0)}`,
                    ocorrencias: todosOsDrawdowns.filter(dd => dd >= binMin && (idx === numBins - 1 ? dd <= binMax : dd < binMax)).length
                };
            });
            return {
                label: `Worse than (Avg DD - ${multiplicador} SD)`,
                limite, vezes,
                porcentagem: todosOsDrawdowns.length > 0 ? (vezes / todosOsDrawdowns.length) * 100 : 0,
                histograma: histArray,
            };
        });
        const melhorEst = todasDuracoesEstagnacao.length > 0 ? Math.min(...todasDuracoesEstagnacao) : 0;
        const piorEst = todasDuracoesEstagnacao.length > 0 ? Math.max(...todasDuracoesEstagnacao) : 0;
        const mediaEst = todasDuracoesEstagnacao.length > 0 ? todasDuracoesEstagnacao.reduce((a, b) => a + b, 0) / todasDuracoesEstagnacao.length : 0;
        const melhorM = todosGanhosMensaisAgregados.length > 0 ? Math.max(...todosGanhosMensaisAgregados) : 0;
        const piorM = todosGanhosMensaisAgregados.length > 0 ? Math.min(...todosGanhosMensaisAgregados) : 0;
        const mediaM = todosGanhosMensaisAgregados.length > 0 ? todosGanhosMensaisAgregados.reduce((a, b) => a + b, 0) / todosGanhosMensaisAgregados.length : 0;
        const avgPercNegMonths = percentagesNegativeMonths.length > 0 ? percentagesNegativeMonths.reduce((a, b) => a + b, 0) / percentagesNegativeMonths.length : 0;
        const avgPercNegTrimesters = percentagesNegativeTrimesters.length > 0 ? percentagesNegativeTrimesters.reduce((a, b) => a + b, 0) / percentagesNegativeTrimesters.length : 0;
        const avgPercNegSemesters = percentagesNegativeSemesters.length > 0 ? percentagesNegativeSemesters.reduce((a, b) => a + b, 0) / percentagesNegativeSemesters.length : 0;
        const avgPercNegYears = percentagesNegativeYears.length > 0 ? percentagesNegativeYears.reduce((a, b) => a + b, 0) / percentagesNegativeYears.length : 0;

        setEstatisticas({
            maiorDrawdown: maiorDD, drawdownMedio: ddMedio, menorDrawdown: menorDD, desvioPadraoDrawdowns: dpDD,
            ocorrenciasDrawdown: ocorrenciasDD, melhorEstagnacao: melhorEst, piorEstagnacao: piorEst,
            mediaEstagnacao: mediaEst, melhorMes: melhorM, piorMes: piorM, mediaMes: mediaM,
            histMensal: todosGanhosMensaisAgregados,
            frequenciaPeriodosNegativos: {
                meses: avgPercNegMonths, trimestres: avgPercNegTrimesters,
                semestres: avgPercNegSemesters, anos: avgPercNegYears,
            },
        });
        setProgresso(100);
        setTimeout(() => setCarregando(false), 300);
    }, [quantidadeSimulacoes, retornoMedioSimulacao, desvioPadraoSimulacao]);

    useEffect(() => { gerarSimulacoes(); }, [gerarSimulacoes]);

    useEffect(() => {
        if (todosMaioresDrawdownsSimulacao.length === 0 || (estatisticas.maiorDrawdown === 0 && estatisticas.drawdownMedio === 0)) {
            setResultadoRisco({ capitalRecomendado: 0, retornoMensalEstimado: 0, riscoRuinaEstimado: 0, ocorrenciasRuina: 0 });
            return;
        }
        const baseParaCapital = Math.abs(estatisticas.maiorDrawdown !== 0 ? estatisticas.maiorDrawdown : estatisticas.drawdownMedio);
        if (baseParaCapital === 0 || riscoAceitoDebounced === 0) {
            setResultadoRisco({ capitalRecomendado: Infinity, retornoMensalEstimado: 0, riscoRuinaEstimado: 0, ocorrenciasRuina: 0 });
            return;
        }
        const capitalRec = baseParaCapital / riscoAceitoDebounced;
        const retornoMensalEst = (estatisticas.mediaMes / capitalRec) * 100;
        const limiteQuebra = -capitalRec;
        const ocorrenciasDeRuina = todosMaioresDrawdownsSimulacao.filter(dd => dd <= limiteQuebra).length;
        const riscoDeRuina = todosMaioresDrawdownsSimulacao.length > 0 ? (ocorrenciasDeRuina / todosMaioresDrawdownsSimulacao.length) * 100 : 0;
        setResultadoRisco({ capitalRecomendado: capitalRec, retornoMensalEstimado: retornoMensalEst, riscoRuinaEstimado: riscoDeRuina, ocorrenciasRuina: ocorrenciasDeRuina });
    }, [riscoAceitoDebounced, todosMaioresDrawdownsSimulacao, estatisticas.maiorDrawdown, estatisticas.drawdownMedio, estatisticas.mediaMes]);

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

    // Chart Tooltip Style for Recharts
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

                    <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-2xl shadow-slate-950/50 mb-8 flex items-center justify-center">
                        {carregando ? (
                            <ProgressLoadingSpinner progress={progresso} />
                        ) : monteCarloData.length > 0 ? (
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
                                    {monteCarloData
                                        .slice(0, Math.min(quantidadeSimulacoes, 200))
                                        .map((simulacao, index) => (
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
                        ) : (<p className="text-slate-400">No simulations to display.</p>)}
                    </section>

                    {!carregando && monteCarloData.length > 0 && (
                        <div className="space-y-8">
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
                                <div className="mb-6">
                                    <label htmlFor="riscoRange" className="block text-sm font-medium text-gray-300 mb-2">
                                        Your Accepted Risk Level: <span className="font-bold text-violet-300">{formatPercentage(riscoAceito * 100, 0)}</span>
                                    </label>
                                    <input id="riscoRange" type="range" min={0.05} max={1} step={0.01} value={riscoAceito} onChange={(e) => setRiscoAceito(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                </div>
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

// Helper component for stat cards
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
                    <svg className="animate-spin h-10 w-10 text-violet-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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