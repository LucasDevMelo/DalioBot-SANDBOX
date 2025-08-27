'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    LineChart, Line, XAxis, YAxis, ResponsiveContainer,
    AreaChart, Area, Tooltip as RechartsTooltip, CartesianGrid,
    BarChart, Bar // Adicionado BarChart e Bar
} from 'recharts';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import React from 'react';

// Hook de Debounce (mantido como no seu código)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

interface PathPoint {
    step: number;
    value: number;
}

interface Simulation {
    path: PathPoint[];
    color: string;
}

interface OcorrenciaDrawdown {
    label: string;
    limite: number;
    vezes: number;
    porcentagem: number;
    histograma: { name: string; ocorrencias: number }[];
}

// Este é o componente principal que contém toda a lógica da página
function SimulacaoMonteCarloContent() {
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const searchParams = useSearchParams();
    const nomeRobo = searchParams.get('robo') || "Robô Desconhecido";
    const [carregando, setCarregando] = useState(true);
    const [progresso, setProgresso] = useState(0);

    const [retornoMedioSimulacao, setRetornoMedioSimulacao] = useState(0.0015);
    const [desvioPadraoSimulacao, setDesvioPadraoSimulacao] = useState(0.01);

    const [riscoAceito, setRiscoAceito] = useState(0.20);
    const riscoAceitoDebounced = useDebounce(riscoAceito, 500);

    const quantidadeSimulacoes = Number(searchParams.get('simulacoes') || 1000);
    const stepsSimulacao = 252; // Aproximadamente 1 ano de pregões

    const [monteCarloData, setMonteCarloData] = useState<Simulation[]>([]);
    const [estatisticas, setEstatisticas] = useState({
        maiorDrawdown: 0,
        drawdownMedio: 0,
        menorDrawdown: 0,
        desvioPadraoDrawdowns: 0,
        ocorrenciasDrawdown: [] as OcorrenciaDrawdown[],
        melhorEstagnacao: Infinity,
        piorEstagnacao: 0,
        mediaEstagnacao: 0,
        melhorMes: -Infinity,
        piorMes: Infinity,
        mediaMes: 0,
        histMensal: [] as number[],
        // Os valores aqui agora serão PORCENTAGENS MÉDIAS
        frequenciaPeriodosNegativos: {
            meses: 0, // % média de meses negativos por simulação
            trimestres: 0, // % média de trimestres rolantes negativos por simulação
            semestres: 0, // % média de semestres rolantes negativos por simulação
            anos: 0,      // % média de anos rolantes negativos por simulação
        },
    });
    const [resultadoRisco, setResultadoRisco] = useState({
        capitalRecomendado: 0,
        retornoMensalEstimado: 0,
        riscoRuinaEstimado: 0,
        ocorrenciasRuina: 0
    });
    const [todosMaioresDrawdownsSimulacao, setTodosMaioresDrawdownsSimulacao] = useState<number[]>([]);

    const gerarSimulacoes = useCallback(async () => {
        setCarregando(true);
        setProgresso(0);
        console.log("Gerando simulações...");

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
        const todosGanhosMensaisAgregados: number[] = []; // Para estatísticas globais de meses

        // Arrays para armazenar as porcentagens de períodos negativos de CADA simulação
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
                } else {
                    diasEstagnado++;
                }
                const drawdown = novoValor - maxValSimulacao;
                if (drawdown < maxDrawdownSimulacao) maxDrawdownSimulacao = drawdown;

                ganhoAcumuladoMes += (novoValor - lastValue);
                if (j % 21 === 0 || j === stepsSimulacao) { // Aproximação de 21 dias úteis por mês
                    ganhosMensaisDaSimulacao.push(ganhoAcumuladoMes);
                    ganhoAcumuladoMes = 0;
                }
            }
            if (diasEstagnado > 0) estagnacoesDaSimulacao.push(diasEstagnado);

            todosOsDrawdowns.push(maxDrawdownSimulacao);
            todasDuracoesEstagnacao.push(...estagnacoesDaSimulacao.filter(d => d > 0));
            todosGanhosMensaisAgregados.push(...ganhosMensaisDaSimulacao);
            simulacoesGeradas.push({ path: path, color: getRandomColor() });

            // --- INÍCIO: Cálculo de percentual de períodos negativos para ESTA SIMULAÇÃO ---
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
            } else { // Caso não haja ganhos mensais (simulação muito curta)
                percentagesNegativeMonths.push(0);
                percentagesNegativeTrimesters.push(0);
                percentagesNegativeSemesters.push(0);
                percentagesNegativeYears.push(0);
            }
            // --- FIM: Cálculo de percentual de períodos negativos para ESTA SIMULAÇÃO ---


            setProgresso(Math.floor(((i + 1) / quantidadeSimulacoes) * 100));
            if (i % Math.floor(quantidadeSimulacoes / 100 || 1) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        setMonteCarloData(simulacoesGeradas);
        setTodosMaioresDrawdownsSimulacao(todosOsDrawdowns);

        const maiorDD = todosOsDrawdowns.length > 0 ? Math.min(...todosOsDrawdowns) : 0;
        const ddMedio = todosOsDrawdowns.length > 0 ? todosOsDrawdowns.reduce((a, b) => a + b, 0) / todosOsDrawdowns.length : 0;
        const menorDD = todosOsDrawdowns.length > 0 ? Math.max(...todosOsDrawdowns.filter(d => d < 0), 0) : 0; // O mais próximo de 0, ou 0 se não houver DDs < 0

        const varianciaDD = todosOsDrawdowns.length > 1 ? todosOsDrawdowns.reduce((sum, val) => sum + Math.pow(val - ddMedio, 2), 0) / (todosOsDrawdowns.length - 1) : 0;
        const dpDD = Math.sqrt(varianciaDD);

        const ocorrenciasDD: OcorrenciaDrawdown[] = [1, 2, 3].map(multiplicador => {
            const limite = ddMedio - (dpDD * multiplicador); // Drawdowns são negativos, subtrair DP os torna MAIS negativos (piores)
            const vezes = todosOsDrawdowns.filter(dd => dd <= limite).length;

            const minHist = maiorDD;
            const maxHist = 0;
            const numBins = 10;
            const binWidth = (maxHist - minHist) / numBins || 1;
            const histArray = Array(numBins).fill(0).map((_, idx) => {
                const binMin = minHist + idx * binWidth;
                const binMax = minHist + (idx + 1) * binWidth;
                return {
                    name: `${binMin.toFixed(0)}`, // Simplificado
                    ocorrencias: todosOsDrawdowns.filter(dd => dd >= binMin && (idx === numBins - 1 ? dd <= binMax : dd < binMax)).length
                };
            });

            return {
                label: `worse than (DD Médio - ${multiplicador} DP)`,
                limite: limite,
                vezes,
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

        // Calcular médias das porcentagens de períodos negativos
        const avgPercNegMonths = percentagesNegativeMonths.length > 0 ? percentagesNegativeMonths.reduce((a, b) => a + b, 0) / percentagesNegativeMonths.length : 0;
        const avgPercNegTrimesters = percentagesNegativeTrimesters.length > 0 ? percentagesNegativeTrimesters.reduce((a, b) => a + b, 0) / percentagesNegativeTrimesters.length : 0;
        const avgPercNegSemesters = percentagesNegativeSemesters.length > 0 ? percentagesNegativeSemesters.reduce((a, b) => a + b, 0) / percentagesNegativeSemesters.length : 0;
        const avgPercNegYears = percentagesNegativeYears.length > 0 ? percentagesNegativeYears.reduce((a, b) => a + b, 0) / percentagesNegativeYears.length : 0;

        setEstatisticas({
            maiorDrawdown: maiorDD,
            drawdownMedio: ddMedio,
            menorDrawdown: menorDD,
            desvioPadraoDrawdowns: dpDD,
            ocorrenciasDrawdown: ocorrenciasDD,
            melhorEstagnacao: melhorEst,
            piorEstagnacao: piorEst,
            mediaEstagnacao: mediaEst,
            melhorMes: melhorM,
            piorMes: piorM,
            mediaMes: mediaM,
            histMensal: todosGanhosMensaisAgregados,
            frequenciaPeriodosNegativos: { // Atualizado com as porcentagens médias
                meses: avgPercNegMonths,
                trimestres: avgPercNegTrimesters,
                semestres: avgPercNegSemesters,
                anos: avgPercNegYears,
            },
        });

        setProgresso(100);
        setTimeout(() => setCarregando(false), 300);
        console.log("Simulações geradas e estatísticas calculadas.");

    }, [quantidadeSimulacoes, retornoMedioSimulacao, desvioPadraoSimulacao]);


    useEffect(() => {
        gerarSimulacoes();
    }, [gerarSimulacoes]);

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

        setResultadoRisco({
            capitalRecomendado: capitalRec,
            retornoMensalEstimado: retornoMensalEst,
            riscoRuinaEstimado: riscoDeRuina,
            ocorrenciasRuina: ocorrenciasDeRuina
        });
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

    return (
        <div className="min-h-screen flex flex-col">
            <Topbar />
            <div className="md:hidden p-2 bg-white shadow z-40">
                <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-700 font-bold text-xl">☰ </button>
            </div>
            <div className="flex flex-1">
                <div className={`fixed md:static z-30 transition-transform duration-300 transform bg-white shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                                    <Sidebar />
                                </div>
                <main className="flex-1 bg-gray-50 p-4 md:p-6 overflow-y-auto">
                    <h1 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">
                        {nomeRobo} - Monte Carlo simulation ({quantidadeSimulacoes.toLocaleString('pt-BR')} Scenarios)
                    </h1>

                    <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg mb-6 relative min-h-[400px] md:min-h-[500px] flex items-center justify-center">
                        {carregando ? (
                            <div className="text-center">
                                <svg className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2.5 mb-2">
                                    <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-150" style={{ width: `${progresso}%` }}></div>
                                </div>
                                <p className="text-gray-700 font-semibold">Generating Simulations...{progresso}%</p>
                                <p className="text-xs text-gray-500 mt-1">This may take a few moments.</p>
                            </div>
                        ) : monteCarloData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={500}>
                                <LineChart margin={{ top: 5, right: 20, left: -20, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis
                                        type="number"
                                        dataKey="step"
                                        domain={[0, stepsSimulacao]}
                                        tick={{ fontSize: 10, fill: '#666' }}
                                        axisLine={{ stroke: '#ccc' }}
                                        tickLine={{ stroke: '#ccc' }}
                                        label={{ value: "Simulation Days", position: 'insideBottom', offset: 0, dy: 10, fontSize: 12, fill: '#555' }}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        tickFormatter={(value) => formatCurrency(value)}
                                        tick={{ fontSize: 10, fill: '#666' }}
                                        axisLine={{ stroke: '#ccc' }}
                                        tickLine={{ stroke: '#ccc' }}
                                        label={{ value: 'Capital Simulado ($)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#555' }}
                                    />
                                    {monteCarloData.slice(0, Math.min(quantidadeSimulacoes, 200)).map((simulacao, index) => (
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
                        ) : (<p className="text-gray-600">No simulation to display.</p>)}
                    </div>

                    {!carregando && monteCarloData.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-lg md:col-span-2 lg:col-span-3">
                                    <h3 className="text-lg text-center font-semibold text-gray-700 mb-3 border-b pb-2">Drawdown Analysis</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Maximum Drawdown</p>
                                            <p className="text-xl font-bold text-red-500">{formatCurrency(estatisticas.maiorDrawdown)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Average Drawdown</p>
                                            <p className="text-xl font-bold text-orange-500">{formatCurrency(estatisticas.drawdownMedio)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Minimum Drawdown</p>
                                            <p className="text-xl font-bold text-yellow-500">{formatCurrency(estatisticas.menorDrawdown)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-lg flex flex-col justify-center items-center text-center">
                                    <h3 className="text-xs font-medium text-gray-500 mb-1">Standard Deviation of Drawdowns</h3>
                                    <p className="text-xl font-bold text-purple-500">{formatCurrency(estatisticas.desvioPadraoDrawdowns)}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg mb-6">
                                <h3 className="text-lg text-center font-semibold text-gray-700 mb-4 border-b pb-2">Drawdown Occurrences (Worse than DP Limits)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                    {estatisticas.ocorrenciasDrawdown.map((item, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg p-3 shadow-inner flex flex-col items-center text-center">
                                            <h4 className="text-xs font-semibold text-gray-600 mb-1"> {item.label} </h4>
                                            <p className="text-lg font-bold text-purple-600 mb-0.5">{formatCurrency(item.limite)}</p>
                                            <p className="text-xs text-gray-500"> Occurrences: {item.vezes.toLocaleString('pt-BR')} ({formatPercentage(item.porcentagem, 0)}) </p>
                                            {item.histograma && item.histograma.length > 0 && (
                                                <div className="mt-2 w-full h-20">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={item.histograma} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                                                            <XAxis dataKey="name" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
                                                            <YAxis tick={{ fontSize: 8 }} allowDecimals={false} />
                                                            <RechartsTooltip formatter={(value: number) => [value, "Ocorrências"]} labelStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                                                            <Bar dataKey="ocorrencias" fill="#a855f7" barSize={10} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Shortest Stagnation</p>
                                    <p className="text-xl font-bold text-green-500">{formatDays(estatisticas.melhorEstagnacao)}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Average Stagnation</p>
                                    <p className="text-xl font-bold text-purple-500">{formatDays(estatisticas.mediaEstagnacao)}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Longest Stagnation</p>
                                    <p className="text-xl font-bold text-red-500">{formatDays(estatisticas.piorEstagnacao)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Best Month (Result)</p>
                                    <p className="text-xl font-bold text-green-500">{formatCurrency(estatisticas.melhorMes)}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Monthly Average (Result)</p>
                                    <p className="text-xl font-bold text-purple-500">{formatCurrency(estatisticas.mediaMes)}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Worst Month (Result)</p>
                                    <p className="text-xl font-bold text-red-500">{formatCurrency(estatisticas.piorMes)}</p>
                                </div>
                            </div>

                            {estatisticas.histMensal.length > 0 && (
                                <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg mb-6">
                                    <h3 className="text-lg text-center font-semibold text-gray-700 mb-3 border-b pb-2">Distribution of Monthly Results</h3>
                                    <ResponsiveContainer width="100%" height={150}>
                                        <AreaChart data={estatisticas.histMensal.map((valor, i) => ({ x: i + 1, y: valor }))} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="x" tick={{ fontSize: 10 }} hide />
                                            <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} width={80} />
                                            <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Monthly Result"]} />
                                            <Area type="monotone" dataKey="y" stroke="#8884d8" fillOpacity={1} fill="url(#colorMonthly)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg mb-6">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center border-b pb-2">Frequency of Negative Periods (Average % per Simulation)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                    {[
                                        { label: 'Months', valor: estatisticas.frequenciaPeriodosNegativos.meses },
                                        { label: 'Quarters', valor: estatisticas.frequenciaPeriodosNegativos.trimestres },
                                        { label: 'Semesters', valor: estatisticas.frequenciaPeriodosNegativos.semestres },
                                        { label: 'Years', valor: estatisticas.frequenciaPeriodosNegativos.anos },
                                    ].map(({ label, valor }, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg shadow-inner">
                                            <p className="text-2xl font-bold text-purple-600">{formatPercentage(valor)}</p>
                                            <p className="text-xs text-gray-600">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg">
                                <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center border-b pb-2">Suggested Risk Management</h3>
                                <div className="mb-4">
                                    <label htmlFor="riscoRange" className="block text-sm font-medium text-gray-600 mb-1">
                                        Your Accepted Risk Level (based on Worst Drawdown): <span className="font-bold text-purple-600">{formatPercentage(riscoAceito * 100, 0)}</span>
                                    </label>
                                    <input id="riscoRange" type="range" min={0.05} max={1} step={0.01} value={riscoAceito} onChange={(e) => setRiscoAceito(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-center">
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <p className="text-xs font-medium text-gray-500 mb-1">Recommended Capital</p>
                                        <p className="text-xl font-bold text-purple-700">{formatCurrency(resultadoRisco.capitalRecomendado)}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <p className="text-xs font-medium text-gray-500 mb-1">Estimated Monthly Return</p>
                                        <p className="text-xl font-bold text-green-600">{formatPercentage(resultadoRisco.retornoMensalEstimado)}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg">
                                        <p className="text-xs font-medium text-gray-500 mb-1">Estimated Risk of Ruin</p>
                                        <p className="text-xl font-bold text-red-600">{formatPercentage(resultadoRisco.riscoRuinaEstimado)}</p>
                                        <p className="text-xxs text-gray-400">({resultadoRisco.ocorrenciasRuina} of {quantidadeSimulacoes} simulations)</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-3 text-center">
                                    *Estimates are based on Monte Carlo simulations and the selected risk level. Not a guarantee of future results.
                                </p>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

// Componente de página que envolve o conteúdo com Suspense
export default function SimulacaoMonteCarloPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="p-6 rounded-lg shadow-lg bg-white text-center">
                    <svg className="animate-spin h-10 w-10 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-semibold text-gray-700">Loading Simulation...</p>
                    <p className="text-sm text-gray-500">Fetching parameters and preparing the environment.</p>
                </div>
            </div>
        }>
            <SimulacaoMonteCarloContent />
        </Suspense>
    );
}