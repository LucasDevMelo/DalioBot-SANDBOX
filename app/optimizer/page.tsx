'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getDatabase, ref, get, update } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import { Loader2, CheckCircle, Shield, BarChart, Gem, ArrowRight, GitCompareArrows, X, Lock } from "lucide-react";
import UpgradeModal from '@/src/components/UpgradeModal';
import { getPlanNameFromPriceId } from '@/src/utils/paddleUtils';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import Topbar from '../../components/topbar';
import Sidebar from '../../components/sidebar';
import { NumericFormat } from 'react-number-format';

// --- Tipos Atualizados ---
interface Robo {
    id: string;
    nome: string;
    retornoAnual: number;
    volatilidade: number;
}

interface PortfolioBase {
    retorno: number;
    risco: number;
    indiceSharpe: number;
    alocacao: Record<string, number>;
}

interface PortfolioSugerido extends PortfolioBase {
    perfil: string;
    nome: string;
    maxDrawdown: number;
    indiceSortino: number;
    indiceCalmar: number;
}

interface PortfolioInterativo extends PortfolioBase { }

interface EquityPoint { dia: number; valor: number; }

interface OptimizationResult {
    fronteiraEficiente: PortfolioInterativo[];
    portfolioMinVariancia: PortfolioSugerido;
    portfolioMaxSharpe: PortfolioSugerido;
    portfolioAgressivo: PortfolioSugerido;
    curvasCapital: {
        conservador: EquityPoint[];
        balanceado: EquityPoint[];
        agressivo: EquityPoint[];
    };
    curvasIndividuais: Record<string, EquityPoint[]>;
    matrizCorrelacao: { robo: string;[key: string]: number | string }[];
}

function LoadingSpinner() {
    return (
        <main className="flex-1 w-full p-4 sm:p-6 flex flex-col justify-center items-center">
            <div className="flex flex-1 justify-center items-center h-full p-8">
                <svg className="animate-spin h-10 w-10 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        </main>
    );
}

function AccessDeniedGate({ message, onUpgradeClick }: { message: string; onUpgradeClick: () => void }) {
    return (
        <main className="flex-1 w-full p-4 sm:p-6 flex flex-col justify-center items-center">
            <div className="bg-white p-8 rounded-2xl shadow-md border max-w-md w-full text-center">
                <Lock className="mx-auto h-12 w-12 text-yellow-500" />
                <h2 className="mt-4 text-xl font-bold text-gray-800">Restricted Access</h2>
                <p className="mt-2 text-gray-600">{message}</p>
                <button
                    onClick={onUpgradeClick}
                    className="mt-6 inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    Upgrade
                </button>
            </div>
        </main>
    );
}

// --- Componente de Gráfico de Rosca (sem alterações) ---
const AllocationDonutChart = ({ data, colors }) => (
    <ResponsiveContainer width="100%" height={100}>
        <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={40} paddingAngle={5}>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
        </PieChart>
    </ResponsiveContainer>
);

// --- Funções de Cálculo Financeiro Atualizadas ---

const calcularMetricasRobo = (dadosCSV: any) => {
    // ... (função original sem alterações)
    if (!dadosCSV || Object.keys(dadosCSV).length < 2) return { retornoAnual: 0, volatilidade: 0, retornosDiarios: [] };
    const historico = Object.values(dadosCSV).map((d: any) => ({ date: new Date(d['<DATE>']), equity: parseFloat(String(d['<EQUITY>']).replace(',', '.')) })).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (historico.length < 2) return { retornoAnual: 0, volatilidade: 0, retornosDiarios: [] };
    const retornosDiarios = [];
    for (let i = 1; i < historico.length; i++) {
        if (historico[i - 1].equity > 0) retornosDiarios.push((historico[i].equity - historico[i - 1].equity) / historico[i - 1].equity);
    }
    const mediaRetornos = retornosDiarios.reduce((a, v) => a + v, 0) / retornosDiarios.length;
    const variancia = retornosDiarios.reduce((a, v) => a + Math.pow(v - mediaRetornos, 2), 0) / retornosDiarios.length;
    const desvioPadraoDiario = Math.sqrt(variancia);
    const volatilidadeAnualizada = desvioPadraoDiario * Math.sqrt(252);
    const equityInicial = historico[0].equity;
    const equityFinal = historico[historico.length - 1].equity;
    const anos = (historico[historico.length - 1].date.getTime() - historico[0].date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    let cagr = 0;
    if (equityInicial > 0 && anos > 0) cagr = Math.pow(equityFinal / equityInicial, 1 / anos) - 1;
    return { retornoAnual: cagr * 100, volatilidade: volatilidadeAnualizada * 100, retornosDiarios };
};

const gerarCurvaCapital = (retornosDiarios: number[], capitalInicial = 1000): EquityPoint[] => {
    // ... (função original sem alterações)
    let capital = capitalInicial;
    const curva = [{ dia: 0, valor: capital }];
    for (let i = 0; i < retornosDiarios.length; i++) {
        capital *= (1 + retornosDiarios[i]);
        curva.push({ dia: i + 1, valor: capital });
    }
    return curva;
};

// NOVO: Função para calcular métricas adicionais de um portfólio
const calcularMetricasPortfolioAdicionais = (retornosDiarios: number[], retornoAnualizado: number) => {
    // Drawdown Máximo
    const curvaCapital = gerarCurvaCapital(retornosDiarios);
    let pico = 0;
    let maxDrawdown = 0;
    for (const ponto of curvaCapital) {
        pico = Math.max(pico, ponto.valor);
        const drawdown = pico > 0 ? (pico - ponto.valor) / pico : 0;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    // Índice de Sortino
    const retornosNegativos = retornosDiarios.filter(r => r < 0);
    const varianciaNegativa = retornosNegativos.reduce((a, v) => a + Math.pow(v - 0, 2), 0) / (retornosDiarios.length || 1);
    const desvioPadraoNegativo = Math.sqrt(varianciaNegativa);
    const desvioPadraoNegativoAnualizado = desvioPadraoNegativo * Math.sqrt(252);
    const indiceSortino = desvioPadraoNegativoAnualizado > 0 ? (retornoAnualizado / 100) / desvioPadraoNegativoAnualizado : 0;

    // Índice de Calmar
    const indiceCalmar = maxDrawdown > 0 ? (retornoAnualizado / 100) / maxDrawdown : 0;

    return {
        maxDrawdown: maxDrawdown * 100, // em percentual
        indiceSortino,
        indiceCalmar
    };
};

const calcularMatrizCorrelacao = (dadosRobos: { id: string, nome: string, retornos: number[] }[]) => {
    // ... (função original sem alterações)
    const matriz = [];
    const nomes = dadosRobos.map(d => d.nome);
    const minLength = Math.min(...dadosRobos.map(d => d.retornos.length));
    const retornosAlinhados = dadosRobos.map(d => d.retornos.slice(-minLength));

    for (let i = 0; i < dadosRobos.length; i++) {
        const linha = { robo: nomes[i] };
        for (let j = 0; j < dadosRobos.length; j++) {
            if (i === j) {
                linha[nomes[j]] = 1.0;
                continue;
            }
            const retornosA = retornosAlinhados[i];
            const retornosB = retornosAlinhados[j];
            const mediaA = retornosA.reduce((s, v) => s + v, 0) / retornosA.length;
            const mediaB = retornosB.reduce((s, v) => s + v, 0) / retornosB.length;
            let covariancia = 0;
            for (let k = 0; k < retornosA.length; k++) {
                covariancia += (retornosA[k] - mediaA) * (retornosB[k] - mediaB);
            }
            covariancia /= retornosA.length;
            const stdDevA = Math.sqrt(retornosA.reduce((s, v) => s + Math.pow(v - mediaA, 2), 0) / retornosA.length);
            const stdDevB = Math.sqrt(retornosB.reduce((s, v) => s + Math.pow(v - mediaB, 2), 0) / retornosB.length);
            linha[nomes[j]] = (stdDevA > 0 && stdDevB > 0) ? covariancia / (stdDevA * stdDevB) : 0;
        }
        matriz.push(linha);
    }
    return matriz;
};

// ATUALIZADO: Função de otimização agora retorna as novas métricas
const otimizarPortfolio = (dadosRobos: { id: string, nome: string, retornos: number[] }[], simulacoes = 5000) => {
    const numRobos = dadosRobos.length;
    const todosResultados: PortfolioInterativo[] = [];

    // Objeto base para os portfólios
    const portfolioBase: PortfolioSugerido = { risco: 0, retorno: 0, indiceSharpe: 0, maxDrawdown: 0, indiceSortino: 0, indiceCalmar: 0, alocacao: {}, perfil: '', nome: '' };

    let portfolioMinVariancia = { ...portfolioBase, risco: Infinity };
    let portfolioMaxSharpe = { ...portfolioBase, indiceSharpe: -Infinity };
    let portfolioAgressivo = { ...portfolioBase, retorno: -Infinity };

    const minLength = Math.min(...dadosRobos.map(d => d.retornos.length));
    if (minLength === 0) return null; // Validação
    const retornosAlinhados = dadosRobos.map(d => d.retornos.slice(-minLength));

    for (let i = 0; i < simulacoes; i++) {
        let pesos = Array.from({ length: numRobos }, () => Math.random());
        const somaPesos = pesos.reduce((s, p) => s + p, 0);
        pesos = pesos.map(p => p / somaPesos);

        const retornosPortfolio = [];
        for (let j = 0; j < minLength; j++) {
            let retornoDia = 0;
            for (let k = 0; k < numRobos; k++) {
                retornoDia += retornosAlinhados[k][j] * pesos[k];
            }
            retornosPortfolio.push(retornoDia);
        }

        const mediaRetornoDiario = retornosPortfolio.reduce((a, v) => a + v, 0) / retornosPortfolio.length;
        const retornoAnualizado = (Math.pow(1 + mediaRetornoDiario, 252) - 1);
        const varianciaPortfolio = retornosPortfolio.reduce((a, v) => a + Math.pow(v - mediaRetornoDiario, 2), 0) / retornosPortfolio.length;
        const riscoAnualizado = Math.sqrt(varianciaPortfolio) * Math.sqrt(252);
        const indiceSharpe = riscoAnualizado > 0 ? retornoAnualizado / riscoAnualizado : 0;

        const alocacao = {};
        dadosRobos.forEach((robo, idx) => { alocacao[robo.id] = pesos[idx] * 100; });

        const resultadoSimulacao = {
            retorno: retornoAnualizado * 100,
            risco: riscoAnualizado * 100,
            indiceSharpe,
            alocacao
        };

        todosResultados.push(resultadoSimulacao);
        if (resultadoSimulacao.risco < portfolioMinVariancia.risco) portfolioMinVariancia = { ...portfolioMinVariancia, ...resultadoSimulacao };
        if (resultadoSimulacao.indiceSharpe > portfolioMaxSharpe.indiceSharpe) portfolioMaxSharpe = { ...portfolioMaxSharpe, ...resultadoSimulacao };
        if (resultadoSimulacao.retorno > portfolioAgressivo.retorno) portfolioAgressivo = { ...portfolioAgressivo, ...resultadoSimulacao };
    }

    const calcularRetornosPortfolio = (pesos) => {
        const retornos = [];
        for (let i = 0; i < minLength; i++) {
            let retornoDia = 0;
            for (let j = 0; j < pesos.length; j++) {
                retornoDia += retornosAlinhados[j][i] * (pesos[j] || 0);
            }
            retornos.push(retornoDia);
        }
        return retornos;
    };

    // Função para adicionar métricas finais
    const finalizarPortfolio = (portfolio: PortfolioSugerido, perfil: string, nome: string): PortfolioSugerido => {
        const pesos = dadosRobos.map(r => (portfolio.alocacao[r.id] || 0) / 100);
        const retornosPortfolio = calcularRetornosPortfolio(pesos);
        const metricasAdicionais = calcularMetricasPortfolioAdicionais(retornosPortfolio, portfolio.retorno);
        return { ...portfolio, ...metricasAdicionais, perfil, nome };
    };

    return {
        fronteiraEficiente: todosResultados,
        portfolioMinVariancia: finalizarPortfolio(portfolioMinVariancia, 'Conservative', 'Minimum Variance'),
        portfolioMaxSharpe: finalizarPortfolio(portfolioMaxSharpe, 'Balanced', 'Maximum Sharpe'),
        portfolioAgressivo: finalizarPortfolio(portfolioAgressivo, 'Aggressive', 'Maximum Return'),
        curvasCapital: {
            conservador: gerarCurvaCapital(calcularRetornosPortfolio(dadosRobos.map(r => (portfolioMinVariancia.alocacao[r.id] || 0) / 100))),
            balanceado: gerarCurvaCapital(calcularRetornosPortfolio(dadosRobos.map(r => (portfolioMaxSharpe.alocacao[r.id] || 0) / 100))),
            agressivo: gerarCurvaCapital(calcularRetornosPortfolio(dadosRobos.map(r => (portfolioAgressivo.alocacao[r.id] || 0) / 100))),
        },
        curvasIndividuais: dadosRobos.reduce((acc, robo) => ({ ...acc, [robo.id]: gerarCurvaCapital(robo.retornos.slice(-minLength)) }), {}),
        matrizCorrelacao: calcularMatrizCorrelacao(dadosRobos),
    };
};

// --- Componente Principal Atualizado ---
export default function PortfolioOptimizerPageV2() {
    const { user, loading: authLoading, subscription } = useAuth();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [todosRobos, setTodosRobos] = useState<Robo[]>([]);
    const [dadosHistoricos, setDadosHistoricos] = useState<Record<string, number[]>>({});
    const [carregandoRobos, setCarregandoRobos] = useState(true);
    const [robosSelecionados, setRobosSelecionados] = useState<Set<string>>(new Set());
    const [statusOtimizacao, setStatusOtimizacao] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [resultado, setResultado] = useState<OptimizationResult | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'curva' | 'correlacao'>('resumo');

    const [portfolioSelecionadoInterativo, setPortfolioSelecionadoInterativo] = useState<PortfolioInterativo | null>(null);

    const [curvasVisiveis, setCurvasVisiveis] = useState({
        conservador: false,
        balanceado: true,
        agressivo: false,
        individuais: true,
    });

    const PLAN_LIMITS = {
        starter: { name: 'Starter' },
        basic: { name: 'Basic' },
        pro: { name: 'Pro' },
    };

    const userPlanName = getPlanNameFromPriceId(subscription?.planName) || 'starter';
    const currentPlan = PLAN_LIMITS[userPlanName as keyof typeof PLAN_LIMITS];

    // Regra: Acesso permitido para planos 'basic' e 'pro' que estejam ativos.
    
    const canUseOptimizer =
        (userPlanName === 'basic' || userPlanName === 'pro') && subscription?.isActive === true;
    // Efeito para carregar dados (sem alterações)
    // --- useEffect ALTERADO para incluir a verificação de plano ---
    useEffect(() => {
        // 1. Se os dados de autenticação ainda estiverem carregando, aguarda.
        if (authLoading) {
            return;
        }

        // 2. Se não houver usuário ou se o plano do usuário não permitir o acesso,
        //    interrompe a execução e garante que os estados estejam limpos.
        if (!user || !canUseOptimizer) {
            setCarregandoRobos(false);
            setTodosRobos([]);
            setDadosHistoricos({});
            return;
        }

        // 3. Se passou pelas verificações, o usuário está logado e tem permissão.
        //    Execute a busca e processamento dos robôs.
        const fetchAndProcessRobos = async () => {
            setCarregandoRobos(true);
            const db = getDatabase();
            const robosRef = ref(db, `estrategias/${user.uid}`);
            try {
                const snapshot = await get(robosRef);
                if (snapshot.exists()) {
                    const robosData = snapshot.val();
                    const historicosParaCalculo = {};
                    const promises = Object.entries(robosData).map(async ([id, data]: [string, any]) => {
                        const { retornoAnual, volatilidade, retornosDiarios } = calcularMetricasRobo(data.dadosCSV);
                        historicosParaCalculo[id] = retornosDiarios;
                        if (data.retornoAnual === undefined || data.volatilidade === undefined) {
                            await update(ref(db, `estrategias/${user.uid}/${id}`), { retornoAnual, volatilidade });
                        }
                        // --- pequena correção: o nome da estratégia pode ser 'nome' ou 'nomeEstrategia' ---
                        return { id, nome: data.nomeEstrategia || data.nome || id, retornoAnual, volatilidade };
                    });
                    const robosList = await Promise.all(promises);
                    setTodosRobos(robosList);
                    setDadosHistoricos(historicosParaCalculo);
                } else {
                    setTodosRobos([]);
                    setDadosHistoricos({});
                }
            } catch (error) {
                console.error("Erro ao buscar e processar robôs:", error);
                setTodosRobos([]);
                setDadosHistoricos({});
            } finally {
                setCarregandoRobos(false);
            }
        };

        fetchAndProcessRobos();

        // 4. A lista de dependências é atualizada para reativar o efeito
        //    quando o status de autenticação ou a permissão mudarem.
    }, [user, authLoading, canUseOptimizer]);

    const handleSelectRobo = (roboId: string) => {
        setRobosSelecionados(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roboId)) { newSet.delete(roboId); } else { newSet.add(roboId); }
            return newSet;
        });
    };

    const handleOtimizar = () => {
        setStatusOtimizacao('loading');
        setPortfolioSelecionadoInterativo(null);
        setTimeout(() => {
            const dadosParaOtimizar = Array.from(robosSelecionados)
                .map(id => ({ id, nome: todosRobos.find(r => r.id === id)?.nome || 'N/A', retornos: dadosHistoricos[id] || [] }))
                .filter(d => d.retornos.length > 10);

            if (dadosParaOtimizar.length < 2) {
                setStatusOtimizacao('error');
                return;
            }
            const resultadoOtimizacao = otimizarPortfolio(dadosParaOtimizar);
            if (!resultadoOtimizacao) {
                setStatusOtimizacao('error');
                return;
            }
            setResultado(resultadoOtimizacao as OptimizationResult);
            setStatusOtimizacao('success');
            setAbaAtiva('resumo');
        }, 500);
    };

    const handleCurvaVisivelChange = (perfil: keyof typeof curvasVisiveis) => {
        setCurvasVisiveis(prev => ({ ...prev, [perfil]: !prev[perfil] }));
    }

    const getCorrelationColor = (value: number) => {
        if (value === 1) return 'bg-slate-300 text-slate-800';
        if (value <= -0.3) return 'bg-emerald-500 text-white';
        if (value <= 0.3) return 'bg-white text-slate-800';
        if (value <= 0.7) return 'bg-rose-200 text-rose-800';
        return 'bg-rose-500 text-white';
    };

    const PortfolioDetalheCard = ({ portfolio, onClose }: { portfolio: PortfolioInterativo, onClose: () => void }) => (
        <div className="mt-4 p-4 border-2 border-indigo-400 bg-indigo-50 rounded-lg shadow-lg relative animate-fade-in">
            <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-slate-800"><X size={18} /></button>
            <h4 className="font-bold text-indigo-800">Custom Portfolio</h4>
            <div className="grid grid-cols-2 gap-x-4 text-sm mt-2">
                <p>Return: <span className="font-bold"><NumericFormat value={portfolio.retorno} displayType='text' suffix='%' decimalScale={1} /></span></p>
                <p>Risk : <span className="font-bold"><NumericFormat value={portfolio.risco} displayType='text' suffix='%' decimalScale={1} /></span></p>
            </div>
            <div className="mt-3">
                <h5 className="text-sm font-semibold text-slate-700">Alocação:</h5>
                <ul className="text-xs space-y-1 mt-1">
                    {/* CORREÇÃO 2: Adicionado Number() para garantir a tipagem correta */}
                    {Object.entries(portfolio.alocacao).sort(([, a], [, b]) => Number(b) - Number(a)).map(([roboId, value]) => (
                        <li key={roboId} className="flex justify-between">
                            <span>{todosRobos.find(r => r.id === roboId)?.nome || 'Desconhecido'}</span>
                            <span className="font-medium"><NumericFormat value={Number(value)} displayType='text' suffix='%' decimalScale={2} /></span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    return (
    <div className="min-h-screen flex flex-col bg-slate-50">
        <Topbar />
        <div className="md:hidden p-2 bg-white shadow z-40">
            <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-700 font-bold text-xl">☰</button>
        </div>
        <div className="flex flex-1 relative">
            <div className={`absolute md:static z-30 transition-transform duration-300 transform shadow-md md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <Sidebar />
            </div>

            {/* --- INÍCIO DA LÓGICA DE RENDERIZAÇÃO ATUALIZADA --- */}
            
            {authLoading ? (
                // ESTADO 1: Carregando dados de autenticação
                <LoadingSpinner />
            ) : canUseOptimizer ? (
                // ESTADO 2: Acesso permitido, mostra o conteúdo principal
                <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
                    <header>
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Optimized Portfolio Builder</h1>
                        <p className="mt-2 text-base lg:text-lg text-slate-600">Find the ideal capital allocation for your risk profile.</p>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-1 space-y-6 lg:sticky top-8">
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h3 className="text-lg font-semibold text-slate-800">Step 1: Select Robots</h3>
                                <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                    {carregandoRobos ? (<div className="flex items-center text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Analyzing...</span></div>) :
                                        todosRobos.length === 0 ? (<div className="text-center p-4 bg-slate-100 rounded-lg"><p className="font-semibold text-slate-700">No robots found</p></div>) :
                                            (todosRobos.map(robo => (
                                                <div key={robo.id} onClick={() => handleSelectRobo(robo.id)} className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${robosSelecionados.has(robo.id) ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-slate-100 hover:bg-slate-200'}`}>
                                                    <div className="flex justify-between items-center"><span className="font-semibold text-slate-700">{robo.nome}</span>{robosSelecionados.has(robo.id) && <CheckCircle className="h-5 w-5 text-purple-600" />}</div>
                                                    <div className="flex justify-between text-xs mt-2 text-slate-500">
                                                        <span>Annual Return:<NumericFormat value={robo.retornoAnual} displayType='text' suffix='%' decimalScale={1} className="font-medium" /></span>
                                                        <span>Volatility: <NumericFormat value={robo.volatilidade} displayType='text' suffix='%' decimalScale={1} className="font-medium" /></span>
                                                    </div>
                                                </div>)))}
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-lg flex flex-col items-center">
                                <p className="font-semibold text-slate-800">{robosSelecionados.size} selected robots</p>
                                <button onClick={handleOtimizar} disabled={robosSelecionados.size < 2 || statusOtimizacao === 'loading'} className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white rounded-lg shadow-sm bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
                                    {statusOtimizacao === 'loading' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Gem className="mr-2 h-5 w-5" />}
                                    {statusOtimizacao === 'loading' ? 'Optimizing...' : 'Optimize Portfolio'}
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            {statusOtimizacao === 'idle' && (<div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg min-h-[60vh] lg:min-h-[80vh] p-8 text-center"><BarChart className="h-16 w-16 text-slate-300" /><h3 className="mt-4 text-xl font-semibold text-slate-800">Waiting for your selection</h3><p className="mt-1 text-slate-500">Choose 2 or more robots and click "Optimize".</p></div>)}
                            {statusOtimizacao === 'loading' && (<div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg min-h-[60vh] lg:min-h-[80vh]"><Loader2 className="h-16 w-16 animate-spin text-purple-600" /><p className="mt-4 text-lg font-medium text-slate-700">Simulating thousands of portfolios...</p></div>)}
                            {statusOtimizacao === 'error' && (<div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg min-h-[60vh] lg:min-h-[80vh] p-8 text-center"><p className="text-red-500">Error while optimizing. Check if the selected robots have sufficient historical data.</p></div>)}

                            {statusOtimizacao === 'success' && resultado && (
                                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                                    <div className="border-b border-slate-200 mb-4"><nav className="flex flex-wrap -mb-px space-x-2 sm:space-x-4" aria-label="Tabs">
                                        <button onClick={() => setAbaAtiva('resumo')} className={`px-3 py-2 font-semibold text-sm rounded-t-lg ${abaAtiva === 'resumo' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>Summary</button>
                                        <button onClick={() => setAbaAtiva('curva')} className={`px-3 py-2 font-semibold text-sm rounded-t-lg ${abaAtiva === 'curva' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>Capital curve</button>
                                        <button onClick={() => setAbaAtiva('correlacao')} className={`px-3 py-2 font-semibold text-sm rounded-t-lg ${abaAtiva === 'correlacao' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>Correlation</button>
                                    </nav></div>

                                    {abaAtiva === 'resumo' && (
                                        <div className="space-y-6">
                                            <div className="h-[350px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" dataKey="risco" name="Risco" unit="%" />
                                                        <YAxis type="number" dataKey="retorno" name="Retorno" unit="%" width={60} />
                                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value) => `${Number(value).toFixed(2)}%`} />
                                                        <Legend />
                                                        <Scatter name="Simulations" data={resultado.fronteiraEficiente} fill="#a5b4fc" shape="circle" fillOpacity={0.3} style={{ cursor: 'pointer' }} onClick={(e: any) => setPortfolioSelecionadoInterativo(e)} />
                                                        <Scatter name="Min. Variance" data={[resultado.portfolioMinVariancia]} fill="#0ea5e9" shape="star" legendType="star" />
                                                        <Scatter name="Max Sharpe" data={[resultado.portfolioMaxSharpe]} fill="#22c55e" shape="star" legendType="star" />
                                                        <Scatter name="Max. Return" data={[resultado.portfolioAgressivo]} fill="#f43f5e" shape="star" legendType="star" />
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {portfolioSelecionadoInterativo && <PortfolioDetalheCard portfolio={portfolioSelecionadoInterativo} onClose={() => setPortfolioSelecionadoInterativo(null)} />}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {[resultado.portfolioMinVariancia, resultado.portfolioMaxSharpe, resultado.portfolioAgressivo].map(p => (
                                                    <div key={p.perfil} className="p-4 border rounded-lg hover:shadow-xl hover:scale-105 transition-all flex flex-col">
                                                        <div className="flex items-center space-x-2">
                                                            {p.perfil === 'Conservative' && <Shield className="h-6 w-6 text-sky-500" />}
                                                            {p.perfil === 'Balanced' && <GitCompareArrows className="h-6 w-6 text-emerald-500" />}
                                                            {p.perfil === 'Aggressive' && <ArrowRight className="h-6 w-6 text-rose-500" />}
                                                            <h4 className="font-bold text-slate-800">{p.perfil}</h4>
                                                        </div>
                                                        <div className="my-2 h-24">
                                                            <AllocationDonutChart data={Object.entries(p.alocacao).map(([roboId, value]) => ({ name: todosRobos.find(r => r.id === roboId)?.nome || 'Desconhecido', value: Number(value) }))} colors={["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"]} />
                                                        </div>
                                                        <div className="mt-auto text-xs space-y-2">
                                                            <div className="grid grid-cols-2 gap-1 text-center bg-slate-50 p-2 rounded-md">
                                                                <p>Return: <span className="font-bold block"><NumericFormat value={p.retorno} displayType='text' suffix='%' decimalScale={1} /></span></p>
                                                                <p>Risk: <span className="font-bold block"><NumericFormat value={p.risco} displayType='text' suffix='%' decimalScale={1} /></span></p>
                                                                <p>Sharpe: <span className="font-bold block"><NumericFormat value={p.indiceSharpe} displayType='text' decimalScale={2} /></span></p>
                                                                <p>Sortino: <span className="font-bold block"><NumericFormat value={p.indiceSortino} displayType='text' decimalScale={2} /></span></p>
                                                                <p>Max Drawdown: <span className="font-bold block text-red-600"><NumericFormat value={p.maxDrawdown} displayType='text' suffix='%' decimalScale={1} /></span></p>
                                                                <p>Calmar: <span className="font-bold block"><NumericFormat value={p.indiceCalmar} displayType='text' decimalScale={2} /></span></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {abaAtiva === 'curva' && (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 p-2 bg-slate-100 rounded-lg">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={curvasVisiveis.conservador} onChange={() => handleCurvaVisivelChange('conservador')} className="form-checkbox h-4 w-4 text-sky-500 rounded" />
                                                    <span className="text-sm font-semibold text-sky-600">Conservative</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={curvasVisiveis.balanceado} onChange={() => handleCurvaVisivelChange('balanceado')} className="form-checkbox h-4 w-4 text-emerald-500 rounded" />
                                                    <span className="text-sm font-semibold text-emerald-600">Balanced</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={curvasVisiveis.agressivo} onChange={() => handleCurvaVisivelChange('agressivo')} className="form-checkbox h-4 w-4 text-rose-500 rounded" />
                                                    <span className="text-sm font-semibold text-rose-600">Aggressive</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={curvasVisiveis.individuais} onChange={() => handleCurvaVisivelChange('individuais')} className="form-checkbox h-4 w-4 text-slate-500 rounded" />
                                                    <span className="text-sm font-semibold text-slate-600">Individual Robots</span>
                                                </label>
                                            </div>
                                            <div className="h-[400px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart>
                                                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                                        <Legend />
                                                        <XAxis dataKey="dia" type="number" domain={['dataMin', 'dataMax']} />
                                                        <YAxis width={80} domain={['auto', 'auto']} tickFormatter={(tick) => tick.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })} />

                                                        {curvasVisiveis.conservador && <Line data={resultado.curvasCapital.conservador} type="monotone" dataKey="valor" name="Conservative Portfolio" stroke="#0ea5e9" strokeWidth={3} dot={false} />}
                                                        {curvasVisiveis.balanceado && <Line data={resultado.curvasCapital.balanceado} type="monotone" dataKey="valor" name="Balanced Portfolio" stroke="#22c55e" strokeWidth={3} dot={false} />}
                                                        {curvasVisiveis.agressivo && <Line data={resultado.curvasCapital.agressivo} type="monotone" dataKey="valor" name="Aggressive Portfolio" stroke="#f43f5e" strokeWidth={3} dot={false} />}

                                                        {curvasVisiveis.individuais && Array.from(robosSelecionados).map(id => (
                                                            <Line key={id} data={resultado.curvasIndividuais[id]} type="monotone" dataKey="valor" name={todosRobos.find(r => r.id === id)?.nome} stroke="#a1a1aa" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {abaAtiva === 'correlacao' && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-slate-600">The table shows how your robots' returns move together. For good diversification, look for low (white) or negative (green) values.</p>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-xs sm:text-sm border-collapse">
                                                    <thead><tr>
                                                        <th className="p-2 border border-slate-200 bg-slate-100 sticky top-0 left-0 z-10">Robot</th>
                                                        {resultado.matrizCorrelacao.map(item => <th key={item.robo as string} className="p-2 border border-slate-200 bg-slate-100">{item.robo}</th>)}
                                                    </tr></thead>
                                                    <tbody>{resultado.matrizCorrelacao.map(item => (
                                                        <tr key={item.robo as string}>
                                                            <td className="p-2 border border-slate-200 bg-slate-100 font-semibold sticky left-0 z-10">{item.robo}</td>
                                                            {Object.keys(item).filter(key => key !== 'robo').map(key => (
                                                                <td key={key} className={`p-2 border border-slate-200 text-center font-mono font-semibold ${getCorrelationColor(Number(item[key]))}`}>{Number(item[key]).toFixed(2)}</td>
                                                            ))}
                                                        </tr>))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            ) : subscription?.isActive === false ? (
                // ESTADO 3: Acesso negado PORQUE a assinatura está inativa
                <AccessDeniedGate
                    message="Your plan is not active, click the button to renew your subscription."
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                />
            ) : (
                // ESTADO 4: Acesso negado PORQUE o plano está incorreto
                <AccessDeniedGate
                    message={`You are in the plan ${currentPlan.name}. This feature is available for Basic and Pro plans.`}
                    onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                />
            )}
            {/* --- FIM DA LÓGICA DE RENDERIZAÇÃO ATUALIZADA --- */}
            
        </div>
        <UpgradeModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
        />
    </div>
);
}