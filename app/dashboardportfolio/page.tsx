'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NumericFormat } from 'react-number-format';
import { getDatabase, ref, get } from 'firebase/database';
import { useAuth } from '@/src/context/authcontext';
import Topbar from '../../components/topbar';
import Sidebar from '../../components/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    ScatterChart,
    LabelList,
    Scatter,
    CartesianGrid,
    Cell,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Interface ajustada para o uso interno no Dashboard
interface CsvData {
    DATE: string;
    BALANCE: number;
    EQUITY: number;
    'DEPOSIT LOAD': number;
}

// Interface para o formato salvo pelo add/page.tsx (HTML Parser)
interface HtmlStrategyData {
    "<DATE>": string;
    "<BALANCE>": string;
    "<EQUITY>": string;
    "<DEPOSIT LOAD>": string;
}

type Aba = 'resultados' | 'metricasAvancadas';

function useWindowSize() {
    const [windowSize, setWindowSize] = useState<{ width?: number; height?: number }>({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return windowSize;
}

// Helper function to calculate Pearson correlation
function calculatePearsonCorrelation(series1: number[], series2: number[]): number {
    if (series1.length !== series2.length || series1.length === 0) {
        return NaN;
    }
    const n = series1.length;
    if (n < 2) return NaN;

    const sumX = series1.reduce((a, b) => a + b, 0);
    const sumY = series2.reduce((a, b) => a + b, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const devX = series1[i] - meanX;
        const devY = series2[i] - meanY;
        sumXY += devX * devY;
        sumX2 += devX * devX;
        sumY2 += devY * devY;
    }

    if (sumX2 === 0 || sumY2 === 0) {
        return (sumX2 === 0 && sumY2 === 0 && n > 0) ? 1 : 0;
    }
    return sumXY / Math.sqrt(sumX2 * sumY2);
}

const getCorrelationCellStyle = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'bg-slate-800 text-gray-500';
    }
    if (value === 1) return 'bg-purple-600 text-white';
    if (value > 0.7) return 'bg-green-600 text-white';
    if (value > 0.3) return 'bg-green-800 text-white';
    if (value > 0.1) return 'bg-slate-600 text-gray-300';
    if (value > -0.1) return 'bg-slate-700 text-gray-400';
    if (value > -0.3) return 'bg-slate-600 text-gray-300';
    if (value > -0.7) return 'bg-red-800 text-white';
    return 'bg-red-600 text-white';
};

const MonthlyPerformanceTable = ({ data }: { data: { [year: number]: { [month: number]: number } } }) => {
    const years = Object.keys(data).map(Number).sort((a, b) => b - a);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    if (years.length === 0) return null;

    return (
        <Card className="md:col-span-3 bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">Monthly Results</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="hidden md:block">
                    <div className="overflow-x-auto">
                        <div>
                            <div className="grid grid-cols-[60px_repeat(12,minmax(80px,1fr))] gap-1 text-center font-bold text-sm mb-2 text-gray-300">
                                <div>Year</div>
                                {shortMonths.map(month => <div key={month}>{month}</div>)}
                            </div>
                            <div className="space-y-1">
                                {years.map(year => (
                                    <div key={year} className="grid grid-cols-[60px_repeat(12,minmax(80px,1fr))] gap-1 text-center text-xs items-center">
                                        <div className="font-bold text-gray-200">{year}</div>
                                        {shortMonths.map((_, monthIndex) => {
                                            const value = data[year]?.[monthIndex];
                                            const hasValue = typeof value === 'number';
                                            const cellColor = hasValue
                                                ? (value >= 0 ? 'bg-green-600/90' : 'bg-red-600/90')
                                                : 'bg-slate-700';

                                            return (
                                                <div key={monthIndex} className={`p-3 rounded ${cellColor}`}>
                                                    {hasValue ? (
                                                        <NumericFormat
                                                            value={value}
                                                            displayType="text"
                                                            thousandSeparator="."
                                                            decimalSeparator=","
                                                            decimalScale={2}
                                                            fixedDecimalScale
                                                            prefix="$ "
                                                            className="text-white font-medium"
                                                        />
                                                    ) : (
                                                        <span className="text-slate-500">-</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:hidden">
                    {years.map(year => (
                        <div key={year} className="mb-4">
                            <h4 className="text-center font-bold text-lg p-2 bg-slate-700 text-gray-200 rounded-md mb-2">{year}</h4>
                            <div className="space-y-1">
                                {months.map((month, monthIndex) => {
                                    const value = data[year]?.[monthIndex];
                                    if (typeof value !== 'number') return null;
                                    const textColor = value >= 0 ? 'text-green-500' : 'text-red-500';
                                    return (
                                        <div key={monthIndex} className="flex justify-between items-center p-2 border-b border-slate-700">
                                            <span className="text-gray-300">{month}</span>
                                            <span className={`font-semibold ${textColor}`}>
                                                <NumericFormat
                                                    value={value}
                                                    displayType="text"
                                                    thousandSeparator="."
                                                    decimalSeparator=","
                                                    decimalScale={2}
                                                    fixedDecimalScale
                                                    prefix="$ "
                                                />
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

function DashboardContent() {
    const { width } = useWindowSize();
    const isMobile = width ? width < 768 : false;
    const searchParams = useSearchParams();
    const roboNome = searchParams.get('id');
    const origem = searchParams.get('origem');

    const { user } = useAuth();
    const router = useRouter();

    const [nomePortfolioExibicao, setNomePortfolioExibicao] = useState<string | null>(null);
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [csvData, setCsvData] = useState<CsvData[]>([]);
    const [carregandoDados, setCarregandoDados] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState<Aba>('resultados');

    const [estrategias, setEstrategias] = useState<string>('');
    const [historico, setHistorico] = useState<string>('');

    const [descricao, setDescricao] = useState('');
    const [mercado, setMercado] = useState('');
    const [ativo, setAtivo] = useState('');
    const [lucroTotalEquity, setLucroTotalEquity] = useState<number>(0);
    const [mediaMensalEquity, setMediaMensalEquity] = useState<number>(0);
    const [fatorLucro, setFatorLucro] = useState<number>(0);
    const [taxaAcerto, setTaxaAcerto] = useState<number>(0);
    const [fatorRecuperacao, setFatorRecuperacao] = useState<number>(0);
    const [payoff, setPayoff] = useState<number>(0);
    const [avgGain, setAvgGain] = useState<number>(0);
    const [avgLoss, setAvgLoss] = useState<number>(0);

    const shortenName = (name: string, maxLength = 20) => {
        if (name.length <= maxLength) return name;
        const words = name.split(' ');
        if (words.length > 2) {
            let shortened = words[0];
            for (let i = 1; i < words.length - 1; i++) {
                if ((shortened + ` ${words[i]}`).length > maxLength - 5) break;
                shortened += ` ${words[i].charAt(0)}.`;
            }
            shortened += ` ${words[words.length - 1]}`;
            if (shortened.length <= maxLength + 3) return shortened;
        }
        return name.substring(0, maxLength - 3) + '...';
    };

    const [drawdownInfo, setDrawdownInfo] = useState<{
        valor: number;
        inicio: string;
        fim: string;
        maiorLoss: { valor: number; data: string };
    } | null>(null);
    const [maiorGainDiario, setMaiorGainDiario] = useState<{ valor: number; data: string } | null>(null);
    const [lucroAno, setLucroAno] = useState<{ ano: string; lucro: number }[]>([]);
    const [maiorMes, setMaiorMes] = useState<{ valor: number; data: Date }>({ valor: 0, data: new Date() });
    const [piorMes, setPiorMes] = useState<{ valor: number; data: Date }>({ valor: 0, data: new Date() });
    const [diasPositivos, setDiasPositivos] = useState<number>(0);
    const [diasNegativos, setDiasNegativos] = useState<number>(0);
    const [estagnacaoInfo, setEstagnacaoInfo] = useState<{
        dias: number;
        inicio: string;
        fim: string;
    } | null>(null);
    const [saldoInicial, setSaldoInicial] = useState<number>(0);
    const [cagr, setCagr] = useState<number>(0);
    const [drawdownMedioPercentual, setDrawdownMedioPercentual] = useState<number>(0);
    const [sampleErrorPercentual, setSampleErrorPercentual] = useState<number>(0);
    const [var95, setVar95] = useState<{ valor: number; porcentagem: number }>({ valor: 0, porcentagem: 0 });
    const [medianaRetornosMensais, setMedianaRetornosMensais] = useState<{ valor: number; porcentagem: number }>({ valor: 0, porcentagem: 0 });
    const [desvioPadrao, setDesvioPadrao] = useState<{
        retorno: { valor: number; porcentagem: number };
        drawdown: { valor: number; porcentagem: number };
    }>({
        retorno: { valor: 0, porcentagem: 0 },
        drawdown: { valor: 0, porcentagem: 0 },
    });
    const [daliobotScore, setDaliobotScore] = useState<number | null>(null);
    const [daliobotFactor, setDaliobotFactor] = useState<number | null>(null);

    const [showDistribuicaoPopup, setShowDistribuicaoPopup] = useState(false);
    const [showDistribuicaoPopupDiario, setShowDistribuicaoPopupDiario] = useState(false);
    const [distributionGranularity, setDistributionGranularity] = useState<'diario' | 'mensal' | 'anual'>('diario');

    const chartTextFill = "#94a3b8";
    const chartGridStroke = "#334155";
    const chartTooltipWrapperStyle: React.CSSProperties = {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        color: '#e2e8f0',
    };
    const chartTooltipContentStyle: React.CSSProperties = {
        backgroundColor: 'transparent',
        border: 'none',
    };

    const advancedDistributionData = useMemo(() => {
        try {
            if (!csvData || csvData.length < 2) return [];

            let results: number[] = [];
            const granularity = distributionGranularity;

            if (granularity === 'diario') {
                results = csvData.slice(1).map((row, i) => {
                    const prevEquity = csvData[i]?.EQUITY;
                    if (typeof prevEquity !== 'number') return NaN;
                    return row.EQUITY - prevEquity;
                }).filter(isFinite);
            } else {
                const resultsByPeriod = new Map<string, number>();
                csvData.slice(1).forEach((row, i) => {
                    const date = new Date(row.DATE);
                    if (isNaN(date.getTime())) return;
                    const dailyResult = row.EQUITY - (csvData[i]?.EQUITY ?? 0);
                    if (!isFinite(dailyResult)) return;
                    const key = granularity === 'mensal'
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        : `${date.getFullYear()}`;
                    resultsByPeriod.set(key, (resultsByPeriod.get(key) || 0) + dailyResult);
                });
                results = Array.from(resultsByPeriod.values());
            }

            if (results.length < 1) return [];
            const maxResult = Math.max(...results);
            const minResult = Math.min(...results);
            if (!isFinite(maxResult) || !isFinite(minResult)) return [];

            if (maxResult === minResult) {
                return [{
                    range: `~ ${minResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                    shortRange: `~ ${minResult.toLocaleString('pt-BR', { notation: 'compact' })}`,
                    count: results.length,
                    midpoint: minResult,
                }];
            }

            const numBins = 20;
            const binSize = (maxResult - minResult) / numBins;
            if (binSize === 0) return [];

            const bins = Array.from({ length: numBins }, (_, i) => {
                const lowerBound = minResult + i * binSize;
                const upperBound = lowerBound + binSize;
                const formatCompact = (num: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(num);
                return {
                    range: `De ${lowerBound.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a ${upperBound.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                    shortRange: `${formatCompact(lowerBound)} a ${formatCompact(upperBound)}`,
                    count: 0,
                    midpoint: lowerBound + binSize / 2,
                };
            });

            results.forEach(result => {
                let binIndex = Math.floor((result - minResult) / binSize);
                if (binIndex === numBins) binIndex = numBins - 1;
                if (bins[binIndex]) {
                    bins[binIndex].count++;
                }
            });
            return bins;
        } catch (error) {
            console.error("Erro ao calcular dados de distribuição:", error);
            return [];
        }
    }, [csvData, distributionGranularity]);

    const scatterPlotData = useMemo(() => {
        if (csvData.length < 2) return [];

        return csvData.slice(1).map((row, i) => {
            const prevEquity = csvData[i]?.EQUITY;
            if (typeof prevEquity !== 'number') return null;

            const date = new Date(row.DATE);
            if (isNaN(date.getTime())) return null;

            const timestamp = date.getTime();
            const resultado = row.EQUITY - prevEquity;

            if (!isFinite(resultado)) return null;

            return { x: timestamp, y: resultado };
        }).filter((item): item is { x: number, y: number } => item !== null);
    }, [csvData]);

    const [showMonteCarloPopup, setShowMonteCarloPopup] = useState(false);
    const [showStatsPopup, setShowStatsPopup] = useState(false);
    const [showRiskPopup, setShowRiskPopup] = useState(false);
    const [showDrawdownPopup, setShowDrawdownPopup] = useState(false);
    const [showLucroCurvePopup, setShowLucroCurvePopup] = useState(false);
    const [showDrawdownVisible, setShowDrawdownVisible] = useState(false);

    const [showCorrelationPopup, setShowCorrelationPopup] = useState(false);
    const [correlationMatrix, setCorrelationMatrix] = useState<number[][] | null>(null);
    const [correlationStrategyNames, setCorrelationStrategyNames] = useState<string[]>([]);
    const [loadingCorrelations, setLoadingCorrelations] = useState(false);
    const [correlationError, setCorrelationError] = useState<string | null>(null);

    const formatarMesAno = useCallback((data: Date | string) => {
        const dateObj = typeof data === 'string' ? new Date(data) : data;
        if (!dateObj || isNaN(dateObj.getTime())) return '-';
        return dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }, []);
    const [monthlyPerformanceData, setMonthlyPerformanceData] = useState<{ [year: number]: { [month: number]: number } }>({});

    const calcularMetricasDependentes = useCallback(() => {
        if (csvData.length === 0) {
            setCagr(0);
            setDrawdownMedioPercentual(0);
            setSampleErrorPercentual(0);
            setVar95({ valor: 0, porcentagem: 0 });
            setMedianaRetornosMensais({ valor: 0, porcentagem: 0 });
            setDesvioPadrao({
                retorno: { valor: 0, porcentagem: 0 },
                drawdown: { valor: 0, porcentagem: 0 },
            });
            setDaliobotScore(null);
            setDaliobotFactor(null);
            return;
        }

        const saldoInicialParaCalculo = saldoInicial > 0 ? saldoInicial : (csvData[0]?.EQUITY || 1);
        const equityInicialDaEstrategia = csvData[0]?.EQUITY || 0;
        const equityFinalDaEstrategia = csvData[csvData.length - 1]?.EQUITY || 0;

        if (equityInicialDaEstrategia <= 0 && saldoInicial <= 0) return;

        const primeiraData = new Date(csvData[0].DATE);
        const ultimaData = new Date(csvData[csvData.length - 1].DATE);
        const diffEmMs = ultimaData.getTime() - primeiraData.getTime();
        const diffEmDias = diffEmMs / (1000 * 60 * 60 * 24);
        const anos = diffEmDias > 0 ? diffEmDias / 365 : 0;

        let cagrCalculado = 0;
        if (anos > 0 && equityInicialDaEstrategia > 0 && equityFinalDaEstrategia >= 0) {
            const ratio = equityFinalDaEstrategia / equityInicialDaEstrategia;
            if (ratio >= 0) {
                cagrCalculado = Math.pow(ratio, 1 / anos) - 1;
            }
        }
        setCagr(cagrCalculado * 100);

        const retornosDiariosPercentuais = csvData.slice(1).map((row, i) => {
            const prevEquity = csvData[i].EQUITY;
            return prevEquity !== 0 ? (row.EQUITY - prevEquity) / prevEquity : 0;
        }).filter(r => !isNaN(r) && isFinite(r));

        const drawdownsPercentuaisCalculados: number[] = [];
        let picoEquityAtual = csvData[0]?.EQUITY || 0;
        let fundoEquityAtual = picoEquityAtual;

        for (const row of csvData) {
            if (row.EQUITY > picoEquityAtual) {
                if (fundoEquityAtual < picoEquityAtual && picoEquityAtual !== 0) {
                    const drawdownPercentual = (fundoEquityAtual - picoEquityAtual) / picoEquityAtual;
                    drawdownsPercentuaisCalculados.push(drawdownPercentual);
                }
                picoEquityAtual = row.EQUITY;
                fundoEquityAtual = picoEquityAtual;
            } else {
                fundoEquityAtual = Math.min(fundoEquityAtual, row.EQUITY);
            }
        }
        if (fundoEquityAtual < picoEquityAtual && picoEquityAtual !== 0) {
            const drawdownPercentual = (fundoEquityAtual - picoEquityAtual) / picoEquityAtual;
            drawdownsPercentuaisCalculados.push(drawdownPercentual);
        }

        const drawdownMedioCalc = drawdownsPercentuaisCalculados.length > 0
            ? drawdownsPercentuaisCalculados.reduce((a, b) => a + b, 0) / drawdownsPercentuaisCalculados.length
            : 0;
        setDrawdownMedioPercentual(Math.abs(drawdownMedioCalc) * 100);

        const mediaRetornosDiarios = retornosDiariosPercentuais.length > 0 ? retornosDiariosPercentuais.reduce((a, b) => a + b, 0) / retornosDiariosPercentuais.length : 0;
        const varianciaRetornos = retornosDiariosPercentuais.length > 0 ? retornosDiariosPercentuais.reduce((sum, r) => sum + Math.pow(r - mediaRetornosDiarios, 2), 0) / retornosDiariosPercentuais.length : 0;
        const dpRetornosDiarios = Math.sqrt(varianciaRetornos);
        setSampleErrorPercentual(dpRetornosDiarios * 100);

        const retornosDiariosOrdenados = [...retornosDiariosPercentuais].sort((a, b) => a - b);
        const indexVar = Math.floor(retornosDiariosOrdenados.length * 0.05);
        const varPercentual = retornosDiariosOrdenados[indexVar] || 0;
        setVar95({
            valor: Math.abs(varPercentual * saldoInicialParaCalculo),
            porcentagem: Math.abs(varPercentual * 100),
        });

        const lucroMensalMap = new Map<string, number>();
        csvData.forEach((row, i) => {
            if (i === 0) return;
            const data = new Date(row.DATE);
            const key = `${data.getFullYear()}-${data.getMonth()}`;
            const prev = csvData[i - 1];
            const diferenca = row.EQUITY - prev.EQUITY;
            lucroMensalMap.set(key, (lucroMensalMap.get(key) || 0) + diferenca);
        });
        const lucrosMensaisArray = Array.from(lucroMensalMap.values()).sort((a, b) => a - b);
        let medianaLucroMensal = 0;
        if (lucrosMensaisArray.length > 0) {
            const mid = Math.floor(lucrosMensaisArray.length / 2);
            medianaLucroMensal = lucrosMensaisArray.length % 2 === 0
                ? (lucrosMensaisArray[mid - 1] + lucrosMensaisArray[mid]) / 2
                : lucrosMensaisArray[mid];
        }
        setMedianaRetornosMensais({
            valor: medianaLucroMensal,
            porcentagem: saldoInicialParaCalculo !== 0 ? (medianaLucroMensal / saldoInicialParaCalculo) * 100 : 0,
        });

        const varianciaDrawdowns = drawdownsPercentuaisCalculados.length > 0 ? drawdownsPercentuaisCalculados.reduce((sum, dd) => sum + Math.pow(dd - drawdownMedioCalc, 2), 0) / drawdownsPercentuaisCalculados.length : 0;
        const dpDrawdowns = Math.sqrt(varianciaDrawdowns);

        setDesvioPadrao({
            retorno: {
                valor: dpRetornosDiarios * saldoInicialParaCalculo,
                porcentagem: dpRetornosDiarios * 100,
            },
            drawdown: {
                valor: dpDrawdowns * saldoInicialParaCalculo,
                porcentagem: dpDrawdowns * 100,
            },
        });

        const piorDD = drawdownsPercentuaisCalculados.length > 0 ? Math.min(...drawdownsPercentuaisCalculados) : 0;
        const maxDDAbsoluto = Math.abs(piorDD);

        const notaRetorno = Math.min(10, Math.max(0, (cagrCalculado * 100) / 5));
        const notaRisco = Math.max(0, 10 - (maxDDAbsoluto * 20));
        const sharpeDiario = dpRetornosDiarios > 0 ? (mediaRetornosDiarios / dpRetornosDiarios) : 0;
        const notaEstabilidade = Math.min(10, Math.max(0, sharpeDiario * 100));

        const scoreFinal = (notaRetorno * 0.35) + (notaRisco * 0.45) + (notaEstabilidade * 0.20);
        setDaliobotScore(Math.min(10, Math.max(0, Number(scoreFinal.toFixed(2)))));

        const fatorCalculado = mediaRetornosDiarios / (dpRetornosDiarios || 1e-9);
        setDaliobotFactor(Number(fatorCalculado.toFixed(2)));

    }, [csvData, saldoInicial]);

    useEffect(() => {
        if (csvData.length > 0) {
            calcularMetricasDependentes();
        }
    }, [csvData, saldoInicial, calcularMetricasDependentes]);

    const calcularMetricasComDados = (dadosParaCalculo: CsvData[]) => {
        if (dadosParaCalculo.length > 0) {
            const eqInicial = dadosParaCalculo[0].EQUITY;
            const eqFinal = dadosParaCalculo[dadosParaCalculo.length - 1].EQUITY;
            setLucroTotalEquity(eqFinal - eqInicial);

            const primeiraDataCsv = new Date(dadosParaCalculo[0].DATE);
            const ultimaDataCsv = new Date(dadosParaCalculo[dadosParaCalculo.length - 1].DATE);
            const mesesNoPeriodo = Math.max(1, (ultimaDataCsv.getFullYear() - primeiraDataCsv.getFullYear()) * 12 + (ultimaDataCsv.getMonth() - primeiraDataCsv.getMonth()) + 1);
            setMediaMensalEquity((eqFinal - eqInicial) / mesesNoPeriodo);

            const dailyEquityChanges = dadosParaCalculo.slice(1).map((row, i) => row.EQUITY - dadosParaCalculo[i].EQUITY);
            const gains = dailyEquityChanges.filter(change => change > 0);
            const losses = dailyEquityChanges.filter(change => change < 0).map(l => Math.abs(l));

            const totalGainValue = gains.reduce((sum, g) => sum + g, 0);
            const totalLossValue = losses.reduce((sum, l) => sum + l, 0);

            setFatorLucro(totalLossValue > 0 ? totalGainValue / totalLossValue : (totalGainValue > 0 ? Infinity : 0));

            const equityPorData = new Map<string, number>();
            dadosParaCalculo.forEach((row) => {
                const dataFormatada = new Date(row.DATE).toISOString().split('T')[0];
                equityPorData.set(dataFormatada, row.EQUITY);
            });

            const lucroDiarioArray: { data: string, valor: number }[] = [];
            const datasUnicasOrdenadas = Array.from(equityPorData.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            for (let i = 1; i < datasUnicasOrdenadas.length; i++) {
                const dataAtual = datasUnicasOrdenadas[i];
                const dataAnterior = datasUnicasOrdenadas[i - 1];
                const lucroDia = (equityPorData.get(dataAtual) ?? 0) - (equityPorData.get(dataAnterior) ?? 0);
                lucroDiarioArray.push({ data: dataAtual, valor: lucroDia });
            }

            const diasPos = lucroDiarioArray.filter(dia => dia.valor > 0).length;
            const diasNeg = lucroDiarioArray.filter(dia => dia.valor < 0).length;
            setDiasPositivos(diasPos);
            setDiasNegativos(diasNeg);
            setTaxaAcerto((diasPos + diasNeg) > 0 ? (diasPos / (diasPos + diasNeg)) * 100 : 0);

            let maiorDDValor = 0;
            let ddInicio = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '';
            let ddFim = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '';
            let picoEquity = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].EQUITY : 0;
            let inicioPicoTemp = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '';
            let maiorPerdaDiaria = { valor: 0, data: dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '' };

            for (let i = 0; i < dadosParaCalculo.length; i++) {
                const atual = dadosParaCalculo[i];
                if (atual.EQUITY > picoEquity) {
                    picoEquity = atual.EQUITY;
                    inicioPicoTemp = atual.DATE;
                }
                const drawdownAtual = atual.EQUITY - picoEquity;
                if (drawdownAtual < maiorDDValor) {
                    maiorDDValor = drawdownAtual;
                    ddInicio = inicioPicoTemp;
                    ddFim = atual.DATE;
                }
                if (i > 0) {
                    const perdaDoDia = atual.EQUITY - dadosParaCalculo[i - 1].EQUITY;
                    if (perdaDoDia < maiorPerdaDiaria.valor) {
                        maiorPerdaDiaria = { valor: perdaDoDia, data: atual.DATE };
                    }
                }
            }
            setDrawdownInfo({ valor: maiorDDValor, inicio: ddInicio, fim: ddFim, maiorLoss: maiorPerdaDiaria });
            setFatorRecuperacao(maiorDDValor !== 0 ? (eqFinal - eqInicial) / Math.abs(maiorDDValor) : ((eqFinal - eqInicial) > 0 ? Infinity : 0));

            const avgGainCalc = gains.length > 0 ? totalGainValue / gains.length : 0;
            const avgLossCalc = losses.length > 0 ? totalLossValue / losses.length : 0;
            setAvgGain(avgGainCalc);
            setAvgLoss(avgLossCalc);
            setPayoff(avgLossCalc > 0 ? avgGainCalc / avgLossCalc : (avgGainCalc > 0 ? Infinity : 0));

            let mGD = { valor: -Infinity, data: '' };
            lucroDiarioArray.forEach(dia => {
                if (dia.valor > mGD.valor) {
                    mGD = { valor: dia.valor, data: dia.data };
                }
            });
            setMaiorGainDiario(mGD.valor > -Infinity && mGD.data !== '' ? mGD : null);

            const lucroPorAnoMap: Record<string, number> = {};
            lucroDiarioArray.forEach(dia => {
                const ano = new Date(dia.data).getFullYear().toString();
                lucroPorAnoMap[ano] = (lucroPorAnoMap[ano] || 0) + dia.valor;
            });
            setLucroAno(Object.entries(lucroPorAnoMap).map(([ano, lucro]) => ({ ano, lucro: parseFloat(lucro.toFixed(2)) })));

            const lucroMensalMapDetalhado = new Map<string, { acumulado: number, dataObj: Date }>();
            dadosParaCalculo.forEach((row, i) => {
                if (i === 0) return;
                const data = new Date(row.DATE);
                const key = `${data.getFullYear()}-${data.getMonth()}`;
                const diferenca = row.EQUITY - dadosParaCalculo[i - 1].EQUITY;

                if (lucroMensalMapDetalhado.has(key)) {
                    lucroMensalMapDetalhado.get(key)!.acumulado += diferenca;
                } else {
                    lucroMensalMapDetalhado.set(key, { acumulado: diferenca, dataObj: new Date(data.getFullYear(), data.getMonth(), 1) });
                }
            });

            const lucrosMensais = Array.from(lucroMensalMapDetalhado.values());
            if (lucrosMensais.length > 0) {
                const maiorMesCalc = lucrosMensais.reduce((max, mes) => mes.acumulado > max.acumulado ? mes : max);
                setMaiorMes({ valor: maiorMesCalc.acumulado, data: maiorMesCalc.dataObj });
                const piorMesCalc = lucrosMensais.reduce((min, mes) => mes.acumulado < min.acumulado ? mes : min);
                setPiorMes({ valor: piorMesCalc.acumulado, data: piorMesCalc.dataObj });

                const performanceData: { [year: number]: { [month: number]: number } } = {};
                lucroMensalMapDetalhado.forEach((value, key) => {
                    const data = value.dataObj;
                    const year = data.getFullYear();
                    const month = data.getMonth();
                    if (!performanceData[year]) {
                        performanceData[year] = {};
                    }
                    performanceData[year][month] = value.acumulado;
                });
                setMonthlyPerformanceData(performanceData);
            }

            let picoAnteriorEstagnacao = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].EQUITY : 0;
            let diasEstagnado = 0;
            let inicioEstagnadoTemp = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '';
            let maiorEstagnacaoDias = 0;
            let dataInicioEstFinal = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '';
            let dataFimEstFinal = dadosParaCalculo.length > 0 ? dadosParaCalculo[0].DATE : '';

            for (let i = 1; i < dadosParaCalculo.length; i++) {
                const atual = dadosParaCalculo[i];
                if (atual.EQUITY > picoAnteriorEstagnacao) {
                    picoAnteriorEstagnacao = atual.EQUITY;
                    if (diasEstagnado > 0) {
                        if (diasEstagnado > maiorEstagnacaoDias) {
                            maiorEstagnacaoDias = diasEstagnado;
                            dataInicioEstFinal = inicioEstagnadoTemp;
                            dataFimEstFinal = dadosParaCalculo[i - 1].DATE;
                        }
                    }
                    diasEstagnado = 0;
                    inicioPicoTemp = atual.DATE;
                } else {
                    if (inicioPicoTemp) {
                        diasEstagnado = (new Date(atual.DATE).getTime() - new Date(inicioPicoTemp).getTime()) / (1000 * 60 * 60 * 24);
                    }
                }
            }
            if (diasEstagnado > maiorEstagnacaoDias) {
                maiorEstagnacaoDias = diasEstagnado;
                dataInicioEstFinal = inicioPicoTemp;
                if (dadosParaCalculo.length > 0) {
                    dataFimEstFinal = dadosParaCalculo[dadosParaCalculo.length - 1].DATE;
                }
            }
            if (dataInicioEstFinal && dataFimEstFinal && maiorEstagnacaoDias > 0) {
                setEstagnacaoInfo({
                    dias: Math.floor(maiorEstagnacaoDias),
                    inicio: dataInicioEstFinal,
                    fim: dataFimEstFinal,
                });
            } else {
                setEstagnacaoInfo(null);
            }

            if (saldoInicial === 0 && dadosParaCalculo[0]?.EQUITY > 0) {
                setSaldoInicial(dadosParaCalculo[0].EQUITY);
            }
        }
    };

    const chartData = useMemo(() => {
        if (csvData.length === 0) return [];

        let pico = csvData[0].EQUITY;
        const initialEquity = csvData[0].EQUITY;

        return csvData.map(row => {
            pico = Math.max(pico, row.EQUITY);
            const drawdownValue = row.EQUITY - pico;
            const DD_percentual = pico !== 0 ? (drawdownValue / pico) * 100 : 0;

            return {
                ...row,
                LUCRO: row.EQUITY - initialEquity,
                DD: DD_percentual,
                timestamp: new Date(row.DATE).getTime(),
            };
        });
    }, [csvData]);

    // =========================================================================
    //  NOVA LÓGICA DE FETCH (ADAPTADA PARA DADOS HTML SALVOS NO FIREBASE)
    // =========================================================================
    useEffect(() => {
        const fetchRoboData = async () => {
            if (!user || !roboNome) {
                if (!roboNome && user) {
                    console.warn("Portfolio ID not provided in URL.");
                    setCarregandoDados(false);
                    setCsvData([]);
                    setNomePortfolioExibicao(null);
                    setEstrategias('');
                    setHistorico('');
                }
                return;
            }
            setCarregandoDados(true);

            try {
                const db = getDatabase();
                const roboRef = ref(db, `portfolios/${user.uid}/${roboNome}`);
                const snapshot = await get(roboRef);

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setNomePortfolioExibicao(data.nomePortfolio || roboNome);
                    setDescricao(data.descricao || '');
                    setMercado(data.mercado || '');
                    setAtivo(data.ativo || '');

                    const robosDoPortfolio: string[] = data.robos ?
                        (typeof data.robos === 'object' ? Object.values(data.robos) : Array.isArray(data.robos) ? data.robos : []) :
                        [];

                    if (robosDoPortfolio.length > 0) {
                        setEstrategias(robosDoPortfolio.join(', '));
                    } else {
                        setEstrategias('No defined strategy');
                    }

                    // --- CONSOLIDAÇÃO DE DADOS BASEADA EM HTML ---
                    if (robosDoPortfolio.length > 0) {
                        const promises = robosDoPortfolio.map(nomeEstrategia =>
                            get(ref(db, `estrategias/${user.uid}/${nomeEstrategia}`))
                        );
                        const resultados = await Promise.all(promises);
                        
                        // Lista mestre de eventos: { timestamp, lucroDoTrade }
                        // Para recriar a curva de equity combinada
                        let masterTimeline: { date: Date; profit: number }[] = [];
                        let totalInitialDeposit = 0;
                        let foundAnyData = false;

                        resultados.forEach(snapshotEstrategia => {
                            if (snapshotEstrategia.exists()) {
                                const dadosEstrategia = snapshotEstrategia.val();
                                foundAnyData = true;

                                // Pega o depósito inicial (salvo pelo add/page.tsx)
                                const depositoInicial = Number(dadosEstrategia.depositoInicial || 0);
                                totalInitialDeposit += depositoInicial;

                                const rawCsv: HtmlStrategyData[] = dadosEstrategia.dadosCSV || [];
                                if (Array.isArray(rawCsv) && rawCsv.length > 0) {
                                    // Precisamos extrair o lucro/perda de cada trade individual.
                                    // O HTML salva o Balanço Acumulado. 
                                    // Trade 1 Profit = Balanço[1] - DepositoInicial
                                    // Trade N Profit = Balanço[N] - Balanço[N-1]
                                    
                                    let previousBalance = depositoInicial;

                                    rawCsv.forEach((row) => {
                                        // O add/page.tsx salva como string "5000.00"
                                        const currentBalance = parseFloat(row["<BALANCE>"]);
                                        const dateStr = row["<DATE>"]; // YYYY-MM-DD HH:mm:ss
                                        
                                        if (!isNaN(currentBalance) && dateStr) {
                                            const profit = currentBalance - previousBalance;
                                            masterTimeline.push({
                                                date: new Date(dateStr),
                                                profit: profit
                                            });
                                            previousBalance = currentBalance;
                                        }
                                    });
                                }
                            }
                        });

                        if (!foundAnyData || masterTimeline.length === 0) {
                            setCsvData([]);
                            setHistorico('No data available');
                            setCarregandoDados(false);
                            return;
                        }

                        // Ordenar cronologicamente
                        masterTimeline.sort((a, b) => a.date.getTime() - b.date.getTime());

                        // Reconstruir a Equity Curve consolidada
                        let currentEquity = totalInitialDeposit;
                        const consolidatedCsv: CsvData[] = [];

                        // Ponto inicial (antes do primeiro trade)
                        if (masterTimeline.length > 0) {
                            consolidatedCsv.push({
                                DATE: new Date(masterTimeline[0].date.getTime() - 1000).toISOString(),
                                BALANCE: totalInitialDeposit,
                                EQUITY: totalInitialDeposit,
                                'DEPOSIT LOAD': 0
                            });
                        }

                        // Pontos subsequentes
                        masterTimeline.forEach(item => {
                            currentEquity += item.profit;
                            consolidatedCsv.push({
                                DATE: item.date.toISOString(),
                                BALANCE: currentEquity,
                                EQUITY: currentEquity,
                                'DEPOSIT LOAD': 0 
                            });
                        });

                        setCsvData(consolidatedCsv);

                        // Ajustar Histórico
                        if (consolidatedCsv.length > 0) {
                            const inicio = new Date(consolidatedCsv[0].DATE).toLocaleDateString('pt-BR');
                            const fim = new Date(consolidatedCsv[consolidatedCsv.length - 1].DATE).toLocaleDateString('pt-BR');
                            setHistorico(`${inicio} - ${fim}`);
                            
                            // Recalcular métricas com os dados unificados
                            calcularMetricasComDados(consolidatedCsv);
                            setSaldoInicial(totalInitialDeposit);
                        }

                    } else {
                         // Caso sem robôs no portfolio
                         setCsvData([]);
                         setHistorico('No strategies linked');
                    }

                } else {
                    console.error(`Portfolio with ID"${roboNome}" not found.`);
                    setCsvData([]);
                    setNomePortfolioExibicao(roboNome);
                }
            } catch (error) {
                console.error('Error fetching portfolio data:', error);
                setCsvData([]);
            } finally {
                setCarregandoDados(false);
            }
        };

        fetchRoboData();
    }, [user, roboNome]);

    // =========================================================================
    //  CORRELAÇÃO ATUALIZADA (LENDO CHAVES COM < >)
    // =========================================================================
    const fetchAndCalculateCorrelations = useCallback(async () => {
        if (!user || !estrategias || estrategias === 'N/A' || estrategias === 'No defined strategy' || estrategias === 'Error loading') {
            setCorrelationError("There are no defined or valid strategies for calculating correlation.");
            setCorrelationMatrix(null);
            setCorrelationStrategyNames([]);
            setLoadingCorrelations(false);
            return;
        }

        setLoadingCorrelations(true);
        setCorrelationError(null);
        const strategyNameList = estrategias.split(',').map(s => s.trim()).filter(s => s.length > 0);

        if (strategyNameList.length < 2) {
            setCorrelationError("At least two strategies are needed to calculate correlation.");
            setLoadingCorrelations(false);
            setCorrelationMatrix(null);
            setCorrelationStrategyNames(strategyNameList);
            return;
        }

        setCorrelationStrategyNames(strategyNameList);
        const db = getDatabase();
        const allStrategyReturns: Map<string, Map<string, number>> = new Map();

        try {
            const promises = strategyNameList.map(async (strategyNameFromList) => {
                const strategyDataRef = ref(db, `estrategias/${user.uid}/${strategyNameFromList}`);
                const strategySnapshot = await get(strategyDataRef);

                if (strategySnapshot.exists()) {
                    const strategyData = strategySnapshot.val();
                    
                    if (strategyData.dadosCSV) {
                        // Forçamos o tipo para array de HTML data
                        const rawCsvArray: HtmlStrategyData[] = Array.isArray(strategyData.dadosCSV) 
                            ? strategyData.dadosCSV 
                            : Object.values(strategyData.dadosCSV);

                        // Normalização
                        const normalized: CsvData[] = rawCsvArray
                            .filter(row => row && row['<DATE>'] && row['<EQUITY>'])
                            .map(row => ({
                                DATE: row['<DATE>'],
                                BALANCE: parseFloat(row['<BALANCE>']),
                                EQUITY: parseFloat(row['<EQUITY>']),
                                'DEPOSIT LOAD': 0
                            }))
                            .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

                        if (normalized.length > 1) {
                            const dailyReturns = new Map<string, number>();
                            for (let i = 1; i < normalized.length; i++) {
                                const prevEquity = normalized[i - 1].EQUITY;
                                const currentEquity = normalized[i].EQUITY;
                                // Calcular retorno diário
                                if (prevEquity !== 0 && !isNaN(prevEquity) && !isNaN(currentEquity)) {
                                    const dailyReturn = (currentEquity - prevEquity) / prevEquity;
                                    dailyReturns.set(normalized[i].DATE, dailyReturn);
                                } else {
                                    dailyReturns.set(normalized[i].DATE, 0);
                                }
                            }
                            allStrategyReturns.set(strategyNameFromList, dailyReturns);
                        }
                    }
                }
            });

            await Promise.all(promises);

            if (allStrategyReturns.size < 2) {
                setCorrelationError("Could not retrieve sufficient data for at least two strategies.");
                setLoadingCorrelations(false);
                setCorrelationMatrix(null);
                return;
            }

            const validStrategyNames = Array.from(allStrategyReturns.keys());
            setCorrelationStrategyNames(validStrategyNames);

            const numStrategies = validStrategyNames.length;
            const matrix: number[][] = Array(numStrategies).fill(null).map(() => Array(numStrategies).fill(NaN));

            for (let i = 0; i < numStrategies; i++) {
                for (let j = i; j < numStrategies; j++) {
                    if (i === j) {
                        matrix[i][j] = 1.0;
                        continue;
                    }
                    const name1 = validStrategyNames[i];
                    const name2 = validStrategyNames[j];
                    const returns1Map = allStrategyReturns.get(name1);
                    const returns2Map = allStrategyReturns.get(name2);

                    if (returns1Map && returns2Map) {
                        const alignedReturns1: number[] = [];
                        const alignedReturns2: number[] = [];
                        
                        // Encontrar datas em comum
                        const dates1 = new Set(returns1Map.keys());
                        const commonDates = [...dates1]
                            .filter(date => returns2Map.has(date))
                            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                        if (commonDates.length >= 2) {
                            commonDates.forEach(date => {
                                alignedReturns1.push(returns1Map.get(date)!);
                                alignedReturns2.push(returns2Map.get(date)!);
                            });
                            matrix[i][j] = calculatePearsonCorrelation(alignedReturns1, alignedReturns2);
                        } else {
                            matrix[i][j] = NaN;
                        }
                        matrix[j][i] = matrix[i][j];
                    }
                }
            }
            setCorrelationMatrix(matrix);

        } catch (error) {
            console.error("Erro ao calcular correlações:", error);
            setCorrelationError("Ocorreu um erro ao calcular as correlações.");
            setCorrelationMatrix(null);
        } finally {
            setLoadingCorrelations(false);
        }
    }, [user, estrategias]);

    useEffect(() => {
        if (showCorrelationPopup && user && estrategias) {
            fetchAndCalculateCorrelations();
        }
    }, [showCorrelationPopup, user, estrategias, fetchAndCalculateCorrelations]);

    if (!user && carregandoDados) return <div className="p-4 text-center text-gray-300">Loading authentication...</div>;
    if (!user && !carregandoDados) {
        if (typeof window !== "undefined") router.push('/login');
        return <div className="p-4 text-center text-gray-300">User not authenticated. Redirecting...</div>;
    }
    if (carregandoDados && !roboNome) {
        return <div className="p-4 text-center text-gray-300">Analyzing URL...</div>;
    }
    if (carregandoDados) {
        return <div className="p-4 text-center text-gray-300">Loading portfolio data...</div>;
    }

    const isCorrelationButtonDisabled = !estrategias || estrategias === 'N/A' || estrategias === 'No defined strategy' || estrategias === 'Error loading' || estrategias.split(',').map(s => s.trim()).filter(s => s.length > 0).length < 2;

    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            <Topbar />
            <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
                <button
                    onClick={() => setSidebarAberta(!sidebarAberta)}
                    className="text-purple-400 font-bold text-xl p-2"
                >
                    ☰
                </button>
            </div>
            <div className="flex flex-1 relative overflow-hidden">
                <div
                    className={`absolute md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
                >
                    <Sidebar />
                </div>

                <main className="flex-1 p-4 lg:p-8 bg-slate-900 overflow-y-auto">
                    <Card className="mb-6 bg-slate-800 border-slate-700">
                        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <CardTitle className="text-white">{nomePortfolioExibicao || roboNome || "Dashboard"}</CardTitle>
                            <button
                                onClick={() => setShowStatsPopup(true)}
                                className="bg-purple-600 text-white px-2 py-1 text-xs rounded hover:bg-purple-700 mt-2 md:mt-0 sm:px-1 sm:py-1 sm:text-xxs shadow-[0_0_15px_theme(colors.purple.500/40)]"
                            >
                                Understand the Statistics
                            </button>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-300">
                            <div className="mb-4 space-y-3">
                                <div>
                                    <p className="font-semibold text-gray-400">Strategies</p>
                                    <p className="break-all text-gray-200">{estrategias || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-400">History</p>
                                    <p className="text-gray-200">{historico || '-'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end items-center mt-4 space-x-2">
                                <button
                                    onClick={() => setShowCorrelationPopup(true)}
                                    className={`px-4 py-2 rounded text-white ${isCorrelationButtonDisabled ? 'bg-slate-600 text-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 shadow-[0_0_15px_theme(colors.pink.500/40)]'}`}
                                    disabled={isCorrelationButtonDisabled}
                                    title={isCorrelationButtonDisabled ? "São necessárias pelo menos duas estratégias para correlação" : "Ver Correlação de Estratégias"}
                                >
                                    Correlation of Strategies
                                </button>
                                <button
                                    onClick={() => setShowRiskPopup(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 shadow-[0_0_15px_theme(colors.purple.500/40)]"
                                >
                                    Risk Management
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
                        <div className="flex space-x-1 p-0.5 bg-slate-700 rounded-md">
                            <button
                                onClick={() => setAbaAtiva('resultados')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors
                                  ${abaAtiva === 'resultados' ? 'bg-slate-900 text-purple-400 shadow-sm font-semibold' : 'text-gray-300 hover:bg-slate-600'}`}
                            >
                                Results
                            </button>
                            <button
                                onClick={() => setAbaAtiva('metricasAvancadas')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors
                                  ${abaAtiva === 'metricasAvancadas' ? 'bg-slate-900 text-purple-400 shadow-sm font-semibold' : 'text-gray-300 hover:bg-slate-600'}`}
                            >
                                Advanced Metrics
                            </button>
                        </div>
                    </div>

                    {csvData.length === 0 && !carregandoDados && (
                        <div className="text-center text-gray-400 py-10">
                            No data found for this robot ({nomePortfolioExibicao || roboNome || "ID not specified"}). Check if the strategies were added correctly.
                        </div>
                    )}

                    {csvData.length > 0 && (
                        <>
                            {abaAtiva === 'resultados' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader> <CardTitle className="text-white text-base font-medium">Total Profit (Equity)</CardTitle> </CardHeader>
                                        <CardContent>
                                            <p className="text-green-500 text-2xl font-bold">
                                                <NumericFormat value={lucroTotalEquity} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                            </p>
                                            <p className="text-green-400 text-sm">
                                                <NumericFormat value={mediaMensalEquity} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Monthly Average (Equity)
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader> <CardTitle className="text-white text-base font-medium">Profit Factor</CardTitle> </CardHeader>
                                        <CardContent>
                                            <p className="text-2xl font-bold mb-4 text-white">
                                                <NumericFormat value={fatorLucro} displayType="text" decimalScale={2} fixedDecimalScale />
                                            </p>
                                            <div className="flex justify-between text-sm text-gray-400">
                                                <span className="text-gray-300">Hit Rate: <NumericFormat value={taxaAcerto} displayType="text" decimalScale={1} fixedDecimalScale suffix="%" /></span>
                                                <span className="text-gray-300">Recovery Factor: <NumericFormat value={fatorRecuperacao} displayType="text" decimalScale={2} fixedDecimalScale /></span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader> <CardTitle className="text-white text-base font-medium">Payoff</CardTitle> </CardHeader>
                                        <CardContent>
                                            <p className="text-2xl font-bold text-white">
                                                <NumericFormat value={payoff} displayType="text" decimalScale={2} fixedDecimalScale />
                                            </p>
                                            <p className="text-sm text-green-400">
                                                <NumericFormat value={avgGain} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Average Positive Days
                                            </p>
                                            <p className="text-sm text-red-500">
                                                <NumericFormat value={avgLoss} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Average Negative Days
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card className="md:col-span-2 bg-slate-800 border-slate-700">
                                            <CardHeader className="flex justify-between items-center">
                                                <CardTitle className="text-white text-base font-medium">Accumulated Profit Curve</CardTitle>
                                                <div className="flex items-center space-x-3">
                                                    <button
                                                        onClick={() => setShowLucroCurvePopup(true)}
                                                        className="text-xs text-purple-400 hover:underline"
                                                    >
                                                        Expand
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => setShowDrawdownVisible(prev => !prev)}
                                                        className={`text-xs ${showDrawdownVisible ? 'text-red-500' : 'text-gray-400'} hover:underline`}
                                                    >
                                                        {showDrawdownVisible ? 'Hide Drawdown' : 'Show Drawdown'}
                                                    </button>
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                <div className="flex flex-col space-y-2">
                                                    <div className="w-full h-[300px]">
                                                        <div className="w-full h-[300px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={chartData}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />

                                                                    <XAxis
                                                                        dataKey="timestamp"
                                                                        type="number"
                                                                        scale="time"
                                                                        domain={['dataMin', 'dataMax']}
                                                                        tickFormatter={(timestamp) =>
                                                                            new Date(timestamp).toLocaleDateString("pt-BR", {
                                                                                day: "2-digit",
                                                                                month: "2-digit",
                                                                                year: "2-digit",
                                                                            })
                                                                        }
                                                                        tick={{ fontSize: 10, fill: chartTextFill }}
                                                                        interval="preserveStartEnd"
                                                                    />

                                                                    <YAxis
                                                                        yAxisId="lucro"
                                                                        domain={["auto", "auto"]}
                                                                        tickFormatter={(value) =>
                                                                            `$ ${Number(value).toLocaleString("pt-BR", {
                                                                                minimumFractionDigits: 0,
                                                                                maximumFractionDigits: 0,
                                                                            })}`
                                                                        }
                                                                        tick={{ fontSize: 11, fill: chartTextFill }}
                                                                    />

                                                                    <Tooltip
                                                                        formatter={(value: number, name: string) => {
                                                                            const label =
                                                                                name === "DD" ? "Drawdown (%)" : "Lucro Acumulado (Equity)";
                                                                            const formattedValue =
                                                                                name === "DD"
                                                                                    ? `${value.toFixed(2)}%`
                                                                                    : `$ ${value.toLocaleString("pt-BR", {
                                                                                        minimumFractionDigits: 2,
                                                                                        maximumFractionDigits: 2,
                                                                                    })}`;
                                                                            return [formattedValue, label];
                                                                        }}
                                                                        labelFormatter={(label: string | number) =>
                                                                            new Date(label).toLocaleDateString("pt-BR")
                                                                        }
                                                                        wrapperStyle={chartTooltipWrapperStyle}
                                                                        contentStyle={chartTooltipContentStyle}
                                                                    />

                                                                    <Line
                                                                        yAxisId="lucro"
                                                                        type="monotone"
                                                                        dataKey="LUCRO"
                                                                        stroke="#a855f7"
                                                                        strokeWidth={2}
                                                                        dot={false}
                                                                        isAnimationActive={false}
                                                                    />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>

                                                    </div>

                                                    {showDrawdownVisible && (
                                                        <div className="w-full h-[80px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart
                                                                    data={chartData}
                                                                    margin={{ top: 0, right: 30, left: 30, bottom: 20 }}
                                                                >
                                                                    <CartesianGrid
                                                                        strokeDasharray="3 3"
                                                                        stroke={chartGridStroke}
                                                                        vertical={false}
                                                                    />

                                                                    <XAxis
                                                                        dataKey="timestamp"
                                                                        tickFormatter={(timestamp) => 
                                                                            new Date(timestamp).toLocaleDateString("pt-BR", {
                                                                                day: "2-digit", month: "2-digit", year: "2-digit",
                                                                            })
                                                                        }
                                                                        tick={{ fontSize: 10, fill: chartTextFill }}
                                                                        interval="preserveStartEnd"
                                                                    />

                                                                    <YAxis
                                                                        yAxisId="drawdown"
                                                                        domain={["auto", 0]}
                                                                        orientation="left"
                                                                        tickLine={false}
                                                                        axisLine={false}
                                                                        tick={{ fontSize: 9, fill: "#ef4444" }}
                                                                        tickCount={3}
                                                                        allowDataOverflow={true}
                                                                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                                                                    />

                                                                    <Tooltip
                                                                        formatter={(value: number) => [
                                                                            `${value.toFixed(2)}%`,
                                                                            "Máx. Drawdown (%)",
                                                                        ]}
                                                                        labelFormatter={(label: string) =>
                                                                            new Date(label).toLocaleDateString("pt-BR")
                                                                        }
                                                                        wrapperStyle={chartTooltipWrapperStyle}
                                                                        contentStyle={chartTooltipContentStyle}
                                                                    />

                                                                    <Line
                                                                        yAxisId="drawdown"
                                                                        dataKey="DD"
                                                                        stroke="#ef4444"
                                                                        strokeWidth={1}
                                                                        dot={false}
                                                                        isAnimationActive={false}
                                                                    />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="flex flex-col space-y-4">
                                            {drawdownInfo && (
                                                <Card className="bg-slate-800 border-slate-700">
                                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                        <CardTitle className="text-base font-medium text-white">Maximum Drawdown</CardTitle>
                                                        <button onClick={() => setShowDrawdownPopup(true)} className="text-xs text-purple-400 hover:underline">Details</button>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-2xl font-bold text-red-500">
                                                            <NumericFormat value={drawdownInfo.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(drawdownInfo.inicio).toLocaleDateString('pt-BR')} - {new Date(drawdownInfo.fim).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                            {drawdownInfo?.maiorLoss && drawdownInfo.maiorLoss.valor !== 0 && (
                                                <Card className="bg-slate-800 border-slate-700">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base font-medium text-white">Biggest Daily Loss</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-2xl font-bold text-red-500">
                                                            <NumericFormat value={drawdownInfo.maiorLoss.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {drawdownInfo.maiorLoss.data ? new Date(drawdownInfo.maiorLoss.data).toLocaleDateString('pt-BR') : '-'}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                            {maiorGainDiario && maiorGainDiario.valor > 0 && (
                                                <Card className="bg-slate-800 border-slate-700">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base font-medium text-white">Highest Daily Gain</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-2xl font-bold text-green-500">
                                                            <NumericFormat value={maiorGainDiario.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {maiorGainDiario.data ? new Date(maiorGainDiario.data).toLocaleDateString('pt-BR') : '-'}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </div>
                                    <Card className="md:col-span-2 bg-slate-800 border-slate-700">
                                        <CardHeader> <CardTitle className="text-white text-base font-medium">Year-over-Year Profit</CardTitle> </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <BarChart data={lucroAno} barSize={50}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />

                                                    <XAxis dataKey="ano" tick={{ fontSize: 12, fill: chartTextFill }} />
                                                    <YAxis
                                                        tickFormatter={(value) =>
                                                            `$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                                        }
                                                        tick={{ fontSize: 12, fill: chartTextFill }}
                                                    />
                                                    <Tooltip
                                                        formatter={(value: number) =>
                                                            `$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        }
                                                        wrapperStyle={chartTooltipWrapperStyle}
                                                        contentStyle={chartTooltipContentStyle}
                                                    />
                                                    <Bar dataKey="lucro">
                                                        {lucroAno.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.lucro < 0 ? '#EF4444' : '#22C55E'}
                                                            />
                                                        ))}
                                                        <LabelList
                                                            dataKey="lucro"
                                                            position="top"
                                                            formatter={(value: number) =>
                                                                `$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                            }
                                                            style={{ fontSize: 10, fill: '#e2e8f0' }}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    <Card className="md:col-span-1 flex flex-col justify-between bg-slate-800 border-slate-700">
                                        <CardHeader> <CardTitle className="text-white text-base font-medium">Best and Worst Month</CardTitle> </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <p className="text-green-500 font-semibold">Best Month</p>
                                                <p className="text-2xl font-bold text-green-500">
                                                    <NumericFormat value={maiorMes.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                </p>
                                                <p className="text-sm text-gray-400">{formatarMesAno(maiorMes.data)}</p>
                                            </div>
                                            <div>
                                                <p className="text-red-500 font-semibold">Worst Month</p>
                                                <p className="text-2xl font-bold text-red-500">
                                                    <NumericFormat value={piorMes.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                </p>
                                                <p className="text-sm text-gray-400">{formatarMesAno(piorMes.data)}</p>
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span className="text-green-500">Positive Days: {diasPositivos}</span>
                                                    <span className="text-red-500">Negative Days: {diasNegativos}</span>
                                                </div>
                                                {(diasPositivos + diasNegativos > 0) && (
                                                    <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden flex">
                                                        <div className="bg-green-500 h-full" style={{ width: `${(diasPositivos / (diasPositivos + diasNegativos)) * 100}%` }} />
                                                        <div className="bg-red-500 h-full" style={{ width: `${(diasNegativos / (diasPositivos + diasNegativos)) * 100}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <MonthlyPerformanceTable data={monthlyPerformanceData} />

                                    <Card className="md:col-span-1 bg-slate-800 border-slate-700">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-base font-medium text-white">Distribution of Results</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <button
                                                onClick={() => {
                                                    setDistributionGranularity('diario');
                                                    setShowDistribuicaoPopup(true);
                                                }}
                                                className="w-full mx-auto block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 shadow-[0_0_15px_theme(colors.purple.500/40)]"
                                            >
                                                Analyze Frequency
                                            </button>
                                        </CardContent>
                                    </Card>

                                    <Card className="md:col-span-1 bg-slate-800 border-slate-700">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-base font-medium text-white">Distribution of Results (daily)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <button
                                                onClick={() => setShowDistribuicaoPopupDiario(true)}
                                                className="w-full mx-auto block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 shadow-[0_0_15px_theme(colors.purple.500/40)]"
                                            >
                                                See Chart
                                            </button>
                                        </CardContent>
                                    </Card>
                                    {estagnacaoInfo && (
                                        <Card className="md:col-span-1 flex flex-col justify-between bg-slate-800 border-slate-700">
                                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                                <img
                                                    src="/calendar.png"
                                                    alt="Ícone de calendário"
                                                    className="w-6 h-6"
                                                />
                                                <CardTitle className="text-base font-medium text-white">Greater Stagnation</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-lg font-semibold text-gray-200">
                                                    {estagnacaoInfo.dias} days
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {estagnacaoInfo.inicio ? new Date(estagnacaoInfo.inicio).toLocaleDateString('pt-BR') : '-'} to {estagnacaoInfo.fim ? new Date(estagnacaoInfo.fim).toLocaleDateString('pt-BR') : '-'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {abaAtiva === 'metricasAvancadas' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="flex items-center p-4 bg-slate-800 border-slate-700">
                                        <img
                                            src="/graph.png"
                                            alt="Ícone de gráfico de crescimento"
                                            className="w-8 h-8 mr-3"
                                        />
                                        <div>
                                            <p className="text-gray-400 text-sm">CAGR</p>
                                            <p className="text-2xl font-bold text-white">
                                                <NumericFormat value={cagr} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                            </p>
                                        </div>
                                    </Card>
                                    <Card className="flex items-center p-4 bg-slate-800 border-slate-700">
                                        <img
                                            src="/money.png"
                                            alt="Ícone de gráfico de crescimento"
                                            className="w-8 h-8 mr-3"
                                        />
                                        <div>
                                            <p className="text-gray-400 text-sm">Medium Drawdown</p>
                                            <p className="text-2xl font-bold text-white">
                                                <NumericFormat value={drawdownMedioPercentual} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                            </p>
                                        </div>
                                    </Card>
                                    <Card className="flex items-center p-4 bg-slate-800 border-slate-700">
                                        <img
                                            src="/bar-chart.png"
                                            alt="Ícone de gráfico de crescimento"
                                            className="w-8 h-8 mr-3"
                                        />
                                        <div>
                                            <p className="text-gray-400 text-sm">Sample Error (SD of Daily Returns)</p>
                                            <p className="text-2xl font-bold text-white">
                                                <NumericFormat value={sampleErrorPercentual} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                            </p>
                                        </div>
                                    </Card>
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader className="pb-2"> <CardTitle className="text-base font-medium text-white">Value at Risk (VaR 95%)</CardTitle> </CardHeader>
                                        <CardContent>
                                            <p className="text-red-500 text-xl font-bold">
                                                <NumericFormat value={var95.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                (<NumericFormat value={var95.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />)
                                            </p>
                                            <p className="text-gray-400 text-xs">(Maximum daily loss estimate with 95% confidence, based on the Starting Balance above)</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader className="pb-2"> <CardTitle className="text-base font-medium text-white">Median Monthly Profits</CardTitle> </CardHeader>
                                        <CardContent>
                                            <p className="text-xl font-bold" style={{ color: medianaRetornosMensais.valor >= 0 ? '#22C55E' : '#EF4444' }}>
                                                <NumericFormat value={medianaRetornosMensais.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                (<NumericFormat value={medianaRetornosMensais.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />)
                                            </p>
                                            <p className="text-gray-400 text-xs">(Median absolute monthly profits. % in relation to the above Beginning Balance)</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader className="pb-2"> <CardTitle className="text-base font-medium text-white">Standard Deviation</CardTitle> </CardHeader>
                                        <CardContent className="flex flex-col gap-2">
                                            <div>
                                                <p className="text-purple-400 font-semibold text-sm">Daily Return</p>
                                                <p className="text-xs text-gray-300">
                                                    <NumericFormat value={desvioPadrao.retorno.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                    (<NumericFormat value={desvioPadrao.retorno.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />)
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-red-500 font-semibold text-sm">Drawdown (%)</p>
                                                <p className="text-xs text-gray-300">
                                                    <NumericFormat value={desvioPadrao.drawdown.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                                    (<NumericFormat value={desvioPadrao.drawdown.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />)
                                                </p>
                                            </div>
                                            <p className="text-gray-400 text-xs mt-1">(Values and % in relation to the Initial Balance above)</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="md:col-span-2 lg:col-span-3 flex flex-col p-6 shadow-sm bg-slate-800 border-slate-700">
                                        <CardHeader className="p-2 text-center">
                                            <CardTitle className="text-xl text-white">DalioBot Score</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center justify-center flex-grow gap-y-4">
                                            <div className="relative flex-shrink-0 flex items-center justify-center w-32 h-32">
                                                <svg viewBox="0 0 36 36" className="absolute w-full h-full">
                                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#334155" strokeWidth="3" />
                                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="#a855f7"
                                                        strokeWidth="3"
                                                        strokeDasharray={`${daliobotScore ? daliobotScore * 10 : 0}, 100`}
                                                        strokeLinecap="round"
                                                        transform="rotate(-90 18 18)"
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <span className="text-4xl font-bold text-white">{daliobotScore !== null ? daliobotScore : '-'}</span>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-2xl font-semibold text-white">
                                                    {origem === 'portfolio' ? '' :
                                                        daliobotScore === null ? 'Indefinido' :
                                                            daliobotScore >= 8 ? 'Ótimo' :
                                                                daliobotScore >= 6 ? 'Bom' :
                                                                    daliobotScore >= 3 ? 'Ok' : 'Péssimo'}
                                                </p>
                                                <p className="text-gray-400 text-sm mt-1 max-w-xs">
                                                    Assesses the Stability of the Curve, the Risk x Return Relationship and the Statistical Significance of the strategy.
                                                </p>
                                            </div>

                                        </CardContent>
                                    </Card>

                                </div>
                            )}
                        </>
                    )}

                    {showDistribuicaoPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-2 sm:p-4">
                            <div className="bg-slate-800 p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-lg sm:text-xl font-bold text-white">
                                        Distribution of Results
                                        {distributionGranularity === 'diario' && ' Diários'}
                                        {distributionGranularity === 'mensal' && ' Mensais'}
                                        {distributionGranularity === 'anual' && ' Anuais'}
                                    </h2>
                                    <button onClick={() => setShowDistribuicaoPopup(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                                </div>
                                <div className="flex space-x-1 sm:space-x-2 mb-4 border-b border-slate-700 pb-3">
                                    <button
                                        onClick={() => setDistributionGranularity('diario')}
                                        className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${distributionGranularity === 'diario' ? 'bg-purple-600 text-white font-semibold shadow' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        onClick={() => setDistributionGranularity('mensal')}
                                        className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${distributionGranularity === 'mensal' ? 'bg-purple-600 text-white font-semibold shadow' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setDistributionGranularity('anual')}
                                        className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${distributionGranularity === 'anual' ? 'bg-purple-600 text-white font-semibold shadow' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                                    >
                                        Annual
                                    </button>
                                </div>
                                <div className="w-full h-[380px] md:h-[450px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {advancedDistributionData && advancedDistributionData.length > 0 ? (
                                            <BarChart
                                                data={advancedDistributionData}
                                                margin={isMobile
                                                    ? { top: 5, right: 5, bottom: 70, left: 5 }
                                                    : { top: 10, right: 30, bottom: 95, left: 30 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                                                <XAxis
                                                    dataKey={isMobile ? 'shortRange' : 'range'}
                                                    angle={isMobile ? -90 : -45}
                                                    textAnchor="end"
                                                    interval={isMobile ? 4 : 0}
                                                    tick={{ fontSize: isMobile ? 9 : 10, dy: isMobile ? 5 : 0, fill: chartTextFill }}
                                                    label={{
                                                        value: "Faixa de Resultado ($)",
                                                        position: 'insideBottom',
                                                        offset: isMobile ? -60 : -85,
                                                        fontSize: isMobile ? 10 : 12,
                                                        fill: chartTextFill
                                                    }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: isMobile ? 9 : 10, fill: chartTextFill }}
                                                    allowDecimals={false}
                                                    label={{
                                                        value: `Frequência (${distributionGranularity === 'diario' ? 'Dias' : distributionGranularity === 'mensal' ? 'Meses' : 'Anos'})`,
                                                        angle: -90, position: 'insideLeft',
                                                        fontSize: isMobile ? 10 : 12, dx: -15,
                                                        fill: chartTextFill
                                                    }}
                                                />
                                                <Tooltip
                                                    wrapperStyle={chartTooltipWrapperStyle}
                                                    contentStyle={chartTooltipContentStyle}
                                                    cursor={{ fill: 'rgba(168, 85, 247, 0.2)' }}
                                                    formatter={(value: number, name: string, props) => {
                                                        const period = distributionGranularity === 'diario' ? 'dias' : distributionGranularity === 'mensal' ? 'meses' : 'anos';
                                                        return [`${value} ${period}`, `Faixa: ${props.payload.range}`];
                                                    }}
                                                    labelFormatter={() => ''}
                                                />
                                                <Bar dataKey="count">
                                                    {advancedDistributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.midpoint < 0 ? '#EF4444' : '#22C55E'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-500 bg-slate-900 rounded-md">
                                                <p className="text-center text-sm p-4">There is not enough data to display at this granularity.</p>
                                            </div>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {showDistribuicaoPopupDiario && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-2 sm:p-4">
                            <div className="bg-slate-800 p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg sm:text-xl font-bold text-white">Daily Results Over Time</h2>
                                    <button onClick={() => setShowDistribuicaoPopupDiario(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                                </div>
                                <div className="w-full h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                            <CartesianGrid stroke={chartGridStroke} />
                                            <XAxis dataKey="x" type="number" domain={['auto', 'auto']}
                                                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                                                label={{ value: "Data", position: 'insideBottom', offset: -5, fontSize: 12, fill: chartTextFill }}
                                                tick={{ fill: chartTextFill, fontSize: 10 }}
                                            />
                                            <YAxis dataKey="y" domain={['auto', 'auto']}
                                                tickFormatter={(value) => `$ ${value.toLocaleString('pt-BR')}`}
                                                label={{ value: "Resultado do Dia ($)", angle: -90, position: 'insideLeft', fontSize: 12, dx: -10, fill: chartTextFill }}
                                                tick={{ fill: chartTextFill, fontSize: 10 }}
                                            />
                                            <Tooltip
                                                formatter={(value: number, name: string, props) => [`$ ${Number(props.payload?.y).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Resultado"]}
                                                labelFormatter={(label: any) => new Date(label).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                wrapperStyle={chartTooltipWrapperStyle}
                                                contentStyle={chartTooltipContentStyle}
                                            />
                                            <Scatter
                                                data={scatterPlotData}
                                                line={false} shape="circle" fill="rgba(168, 85, 247, 0.7)" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {showDrawdownPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex items-center justify-center p-4">
                            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-4xl border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white">Drawdown Chart (Value)</h2>
                                    <button onClick={() => setShowDrawdownPopup(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                                        <XAxis dataKey="DATE" tick={{ fontSize: 10, fill: chartTextFill }}
                                            tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                                            interval="preserveStartEnd" />
                                        <YAxis tickFormatter={(val) => `$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} tick={{ fontSize: 12, fill: chartTextFill }} />
                                        <Tooltip
                                            labelFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            formatter={(val: number) => [`$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Drawdown"]}
                                            wrapperStyle={chartTooltipWrapperStyle}
                                            contentStyle={chartTooltipContentStyle}
                                        />
                                        <Line type="monotone" dataKey="DD" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {showStatsPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] overflow-y-auto border border-slate-700">
                                <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-800 py-2 z-10 border-b border-slate-700">
                                    <h2 className="text-xl font-bold text-white">How statistics work:</h2>
                                    <button onClick={() => setShowStatsPopup(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                                </div>
                                <div className="space-y-3 text-sm text-gray-300">
                                    <p><strong>Daily Results:</strong> All performance metrics (win rate, average gain/loss, etc.) are based on the net financial result at the end of each trading day.</p>
                                    <p><strong>Net Profit (Equity):</strong> The total net profit generated by the strategy, calculated as the difference between the final and initial equity for the analyzed period.</p>
                                    <p><strong>Average Monthly Profit (Equity):</strong> The total net profit (equity) divided by the number of months in the analysis period.</p>
                                    <p><strong>Profit Factor:</strong> The ratio of gross profit (the sum of all winning days) to gross loss (the sum of all losing days).</p>
                                    <p><strong>Win Rate:</strong> The percentage of days the strategy ended with a profit.</p>
                                    <p><strong>Recovery Factor:</strong> The ratio of the total net profit (equity) to the maximum drawdown.</p>
                                    <p><strong>Payoff:</strong> The ratio of the average gain on winning days to the average loss on losing days.</p>
                                    <p><strong>Maximum Drawdown:</strong> The largest percentage or value drop in equity from a previous peak to a subsequent trough.</p>
                                    <p><strong>Initial Balance (for calculations):</strong> The capital amount you set to contextualize metrics like VaR, Median, and Standard Deviation.</p>
                                    <p><strong>CAGR (Compound Annual Growth Rate):</strong> The compound annual growth rate of the strategy's equity over the analyzed period.</p>
                                    <p><strong>Average Drawdown:</strong> The average of the percentage drawdowns that occurred during the analysis period.</p>
                                    <p><strong>Std. Dev. of Daily Returns:</strong> The standard deviation of the daily percentage returns.</p>
                                    <p><strong>Value at Risk (VaR 95%):</strong> An estimate of the maximum expected financial loss (with 95% confidence) in a single day.</p>
                                    <p><strong>DalioBot Score:</strong> A proprietary metric (0-10) that assesses the overall quality of the strategy.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {showRiskPopup && drawdownInfo && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white">RISK MANAGEMENT</h2>
                                    <button onClick={() => setShowRiskPopup(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                                </div>
                                <div className="flex justify-between mb-4 text-sm">
                                    <div>
                                        <p className="text-gray-400">Maximum Drawdown (Backtest)</p>
                                        <p className="text-red-500 font-bold">
                                            <NumericFormat value={Math.abs(drawdownInfo.valor)} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Average Monthly Profit (Backtest)</p>
                                        <p className="text-green-500 font-bold">
                                            <NumericFormat value={mediaMensalEquity} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                        </p>
                                    </div>
                                </div>
                                {(() => {
                                    const ddMaxAbs = Math.abs(drawdownInfo.valor);
                                    const capitalAgressivo = ddMaxAbs > 0 ? ddMaxAbs : 1;
                                    const capitalModerado = capitalAgressivo * 2;
                                    const capitalConservador = capitalAgressivo * 5;
                                    const retornoAgressivo = mediaMensalEquity && capitalAgressivo ? (mediaMensalEquity / capitalAgressivo) * 100 : 0;
                                    const retornoModerado = mediaMensalEquity && capitalModerado ? (mediaMensalEquity / capitalModerado) * 100 : 0;
                                    const retornoConservador = mediaMensalEquity && capitalConservador ? (mediaMensalEquity / capitalConservador) * 100 : 0;

                                    return (
                                        <div className="space-y-4 text-sm">
                                            <div>
                                                <p className="font-medium text-purple-400">
                                                    <NumericFormat value={capitalAgressivo} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> - Suggested Capital • Aggressive Profile
                                                </p>
                                                <div className="h-2 bg-purple-600 rounded-full w-full mb-1 mt-1"></div>
                                                <p className="text-right text-gray-400 text-xs">
                                                    Estimated Average Monthly Return: <NumericFormat value={retornoAgressivo} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-purple-400">
                                                    <NumericFormat value={capitalModerado} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> - Suggested Capital • Moderate Profile
                                                </p>
                                                <div className="h-2 bg-purple-500 rounded-full w-3/4 mb-1 mt-1"></div>
                                                <p className="text-right text-gray-400 text-xs">
                                                    Estimated Average Monthly Return: <NumericFormat value={retornoModerado} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-purple-400">
                                                    <NumericFormat value={capitalConservador} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> - Suggested Capital • Conservative Profile
                                                </p>
                                                <div className="h-2 bg-purple-400 rounded-full w-1/2 mb-1 mt-1"></div>
                                                <p className="text-right text-gray-400 text-xs">
                                                    Estimated Average Monthly Return: <NumericFormat value={retornoConservador} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-3">* The suggested capital is an estimate based on the maximum drawdown from the backtest.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {showCorrelationPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-2 sm:p-4">
                            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-700">
                                    <h2 className="text-lg md:text-xl font-bold text-white">Correlation of Strategies</h2>
                                    <button
                                        onClick={() => setShowCorrelationPopup(false)}
                                        className="text-gray-400 hover:text-white text-2xl leading-none p-1"
                                    >
                                        &times;
                                    </button>
                                </div>

                                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                    <span className="font-semibold text-gray-300">Caption:</span>
                                    <span className="flex items-center"><span className="inline-block w-3 h-3 rounded-full mr-1.5 bg-red-600"></span>High Negative</span>
                                    <span className="flex items-center"><span className="inline-block w-3 h-3 rounded-full mr-1.5 bg-green-600"></span>High Positive</span>
                                    <span className="flex items-center"><span className="inline-block w-3 h-3 rounded-full mr-1.5 bg-slate-700 border border-slate-600"></span>No Correlation</span>
                                </div>

                                {loadingCorrelations && <div className="text-center py-10 text-gray-300">Calculating correlations...</div>}
                                {correlationError && <div className="text-center py-10 text-red-500">{correlationError}</div>}

                                {!loadingCorrelations && !correlationError && correlationMatrix && correlationStrategyNames.length > 0 && (
                                    <div className="overflow-auto flex-grow custom-scrollbar">
                                        <table className="min-w-full text-xs md:text-sm border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="p-2 border border-slate-600 bg-slate-700 sticky top-0 left-0 z-20 min-w-[100px] text-left text-gray-300 font-semibold"></th>
                                                    {correlationStrategyNames.map(name => (
                                                        <th key={name} className="p-1 md:p-2 border border-slate-600 bg-slate-700 sticky top-0 z-10 text-gray-300 font-semibold align-bottom h-32 md:h-auto">
                                                            <span className="block text-center md:inline md:rotate-0 md:[writing-mode:initial] rotate-180 [writing-mode:vertical-rl] whitespace-nowrap">
                                                                {shortenName(name, 25)}
                                                            </span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {correlationStrategyNames.map((rowName, rowIndex) => (
                                                    <tr key={rowName}>
                                                        <td className="p-2 border border-slate-600 bg-slate-700 sticky left-0 z-10 font-semibold text-gray-300 whitespace-nowrap min-w-[100px] text-left">
                                                            {shortenName(rowName, 15)}
                                                        </td>
                                                        {correlationStrategyNames.map((colName, colIndex) => (
                                                            <td
                                                                key={`${rowName}-${colName}`}
                                                                className={`p-2 border border-slate-600 text-center font-bold ${getCorrelationCellStyle(correlationMatrix[rowIndex]?.[colIndex])}`}
                                                            >
                                                                {typeof correlationMatrix[rowIndex]?.[colIndex] === 'number' && !isNaN(correlationMatrix[rowIndex]?.[colIndex])
                                                                    ? correlationMatrix[rowIndex][colIndex].toFixed(2)
                                                                    : 'N/A'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 flex justify-end border-t border-slate-700">
                                    <button
                                        onClick={() => setShowCorrelationPopup(false)}
                                        className="bg-slate-700 text-gray-200 px-4 py-2 rounded hover:bg-slate-600 text-sm"
                                    >
                                        To close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {showLucroCurvePopup && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                            <div className="bg-slate-900 rounded-2xl p-4 w-full max-w-6xl relative border border-slate-700">
                                <button
                                    onClick={() => setShowLucroCurvePopup(false)}
                                    className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg"
                                >
                                    ✕
                                </button>
                                <h2 className="text-xl font-semibold text-white mb-4 text-center">
                                    Accumulated Profit Curve
                                </h2>
                                <div className="w-full flex flex-col" style={{ height: '70vh' }}>

                                    <div style={{ height: '75%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />

                                                <XAxis
                                                    dataKey="timestamp"
                                                    type="number"
                                                    scale="time"
                                                    domain={['dataMin', 'dataMax']}
                                                    tickFormatter={(timestamp) =>
                                                        new Date(timestamp).toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "2-digit",
                                                        })
                                                    }
                                                    tick={{ fontSize: 10, fill: chartTextFill }}
                                                    interval="preserveStartEnd"
                                                />

                                                <YAxis
                                                    yAxisId="lucro"
                                                    domain={['auto', 'auto']}
                                                    tickFormatter={(value) =>
                                                        `$ ${Number(value).toLocaleString('pt-BR', {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 0
                                                        })}`
                                                    }
                                                    tick={{ fontSize: 12, fill: chartTextFill }}
                                                />
                                                <Tooltip
                                                    formatter={(value: number, name: string) => {
                                                        const label = name === 'DD' ? 'Máx. Drawdown (%)' : 'Lucro Retido';
                                                        const formattedValue = name === "DD"
                                                            ? `${value.toFixed(2)}%`
                                                            : `$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                        return [formattedValue, label];
                                                    }}
                                                    labelFormatter={(label: string) =>
                                                        new Date(label).toLocaleDateString('pt-BR')
                                                    }
                                                    wrapperStyle={chartTooltipWrapperStyle}
                                                    contentStyle={chartTooltipContentStyle}
                                                />
                                                <Line
                                                    yAxisId="lucro"
                                                    type="monotone"
                                                    dataKey="LUCRO"
                                                    stroke="#a855f7"
                                                    strokeWidth={2}
                                                    dot={false}
                                                    isAnimationActive={false}
                                                />
                                            </LineChart>

                                        </ResponsiveContainer>
                                    </div>

                                    <div style={{ height: '25%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 0, right: 30, left: 30, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />

                                                <XAxis
                                                    dataKey="timestamp"
                                                    type="number"
                                                    scale="time"
                                                    domain={['dataMin', 'dataMax']}
                                                    tickFormatter={(timestamp) =>
                                                        new Date(timestamp).toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "2-digit",
                                                        })
                                                    }
                                                    tick={{ fontSize: 10, fill: chartTextFill }}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    yAxisId="drawdown"
                                                    domain={['auto', 0]}
                                                    orientation="left"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tick={{ fontSize: 10, fill: '#ef4444' }}
                                                    tickCount={3}
                                                    allowDataOverflow={true}
                                                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                                                />
                                                <Tooltip
                                                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Máx. Drawdown (%)"]}
                                                    labelFormatter={(label: string) => new Date(label).toLocaleDateString('pt-BR')}
                                                    wrapperStyle={chartTooltipWrapperStyle}
                                                    contentStyle={chartTooltipContentStyle}
                                                />
                                                <Line
                                                    yAxisId="drawdown"
                                                    dataKey="DD"
                                                    stroke="#ef4444"
                                                    strokeWidth={1}
                                                    dot={false}
                                                    isAnimationActive={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
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

export default DashboardContent;