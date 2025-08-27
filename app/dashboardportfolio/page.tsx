'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
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

interface CsvData {
    DATE: string;
    BALANCE: number;
    EQUITY: number;
    'DEPOSIT LOAD': number;
}

type Aba = 'resultados' | 'metricasAvancadas';

// ADICIONE ESTE NOVO HOOK AQUI
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
    if (n < 2) return NaN; // Not enough data points for correlation

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

// Helper function to get cell styling for the correlation matrix
const getCorrelationCellStyle = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'bg-gray-50 text-gray-400'; // For NaN or undefined values (e.g. 'N/A')
    }
    const absValue = Math.abs(value);

    // Specific cases from the image
    if (value === 1 || value === -1) return 'bg-red-500 text-white'; // Perfect correlation (Red in image for 1)
    if (value >= 0.10 && value < 0.20) return 'bg-gray-200 text-gray-800';   // e.g., 0.14 (Light Gray in image)
    if (value > 0 && value < 0.10) return 'bg-gray-100 text-gray-700';      // e.g., 0.04 (Very Light Gray in image)
    if (value < 0 && value >= -0.09) return 'bg-gray-500 text-white'; // e.g., -0.02 (Dark Gray in image)


    // General categories based on legend in the image (Alta: Red, Baixa: Blue (using a neutral gray), Sem Correlação: Gray)
    if (absValue >= 0.7) return 'bg-red-500 text-white'; // Alta (Red)
    if (absValue >= 0.3) return 'bg-gray-300 text-gray-900'; // Baixa/Média (Mapped to a neutral light gray)
    return 'bg-gray-500 text-white'; // Sem Correlação (Mapped to a darker gray)
};

// Componente para a Tabela de Performance Mensal
// Componente para a Tabela de Performance Mensal
const MonthlyPerformanceTable = ({ data }: { data: { [year: number]: { [month: number]: number } } }) => {
    const years = Object.keys(data).map(Number).sort((a, b) => b - a); // Anos em ordem decrescente
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];


    if (years.length === 0) {
        return null; // Não renderiza nada se não houver dados
    }

    return (
        <Card className="md:col-span-3">
            <CardHeader>
                <CardTitle>Monthly Results</CardTitle>
            </CardHeader>
            <CardContent>

                {/* ================================================================ */}
                {/* VISTA PARA DESKTOP (tabela) - Visível a partir de 'md' (768px) */}
                {/* ================================================================ */}
                <div className="hidden md:block">
                    <div className="overflow-x-auto">
                        {/* A div abaixo não precisa mais de um min-w fixo, o grid vai definir a largura */}
                        <div>
                            {/* Cabeçalho com os meses */}
                            <div className="grid grid-cols-[60px_repeat(12,minmax(80px,1fr))] gap-1 text-center font-bold text-sm mb-2">
                                <div>Year</div>
                                {shortMonths.map(month => <div key={month}>{month}</div>)}
                            </div>

                            {/* Linhas com os resultados */}
                            <div className="space-y-1">
                                {years.map(year => (
                                    <div key={year} className="grid grid-cols-[60px_repeat(12,minmax(80px,1fr))] gap-1 text-center text-xs items-center">
                                        <div className="font-bold">{year}</div>
                                        {shortMonths.map((_, monthIndex) => {
                                            const value = data[year]?.[monthIndex];
                                            const hasValue = typeof value === 'number';

                                            const cellColor = hasValue
                                                ? (value >= 0 ? 'bg-green-500' : 'bg-red-500')
                                                : 'bg-gray-200';

                                            return (
                                                <div key={monthIndex} className={`p-3 rounded text-white ${cellColor}`}>
                                                    {hasValue ? (
                                                        <NumericFormat
                                                            value={value}
                                                            displayType="text"
                                                            thousandSeparator="."
                                                            decimalSeparator=","
                                                            decimalScale={2}
                                                            fixedDecimalScale
                                                            prefix="$ "
                                                        />
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
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

                {/* ================================================================ */}
                {/* VISTA PARA MOBILE (lista) - Visível até 'md' (768px)         */}
                {/* ================================================================ */}
                <div className="md:hidden">
                    {years.map(year => (
                        <div key={year} className="mb-4">
                            <h4 className="text-center font-bold text-lg p-2 bg-gray-100 rounded-md mb-2">{year}</h4>
                            <div className="space-y-1">
                                {months.map((month, monthIndex) => {
                                    const value = data[year]?.[monthIndex];
                                    if (typeof value !== 'number') return null; // Não mostra o mês se não houver dados

                                    const textColor = value >= 0 ? 'text-green-600' : 'text-red-600';

                                    return (
                                        <div key={monthIndex} className="flex justify-between items-center p-2 border-b border-gray-100">
                                            <span className="text-gray-700">{month}</span>
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
    const roboNome = searchParams.get('id'); // Este é o ID do robô/portfólio
    const origem = searchParams.get('origem');

    const { user } = useAuth(); //
    const router = useRouter(); //

    const [nomePortfolioExibicao, setNomePortfolioExibicao] = useState<string | null>(null); //

    const [sidebarAberta, setSidebarAberta] = useState(false); //
    const [csvData, setCsvData] = useState<CsvData[]>([]); //
    const [carregandoDados, setCarregandoDados] = useState(true); //
    const [abaAtiva, setAbaAtiva] = useState<Aba>('resultados'); //

    const [estrategias, setEstrategias] = useState<string>(''); //
    const [historico, setHistorico] = useState<string>(''); //

    const [descricao, setDescricao] = useState(''); //
    const [mercado, setMercado] = useState(''); //
    const [ativo, setAtivo] = useState(''); //
    const [lucroTotalEquity, setLucroTotalEquity] = useState<number>(0); //
    const [mediaMensalEquity, setMediaMensalEquity] = useState<number>(0); //
    const [fatorLucro, setFatorLucro] = useState<number>(0); //
    const [taxaAcerto, setTaxaAcerto] = useState<number>(0); //
    const [fatorRecuperacao, setFatorRecuperacao] = useState<number>(0); //
    const [payoff, setPayoff] = useState<number>(0); //
    const [avgGain, setAvgGain] = useState<number>(0); //
    const [avgLoss, setAvgLoss] = useState<number>(0); //
    // Adicione esta função no seu componente
    const shortenName = (name: string, maxLength = 20) => {
        if (name.length <= maxLength) return name;

        // Tenta abreviar palavras no meio
        const words = name.split(' ');
        if (words.length > 2) {
            let shortened = words[0];
            for (let i = 1; i < words.length - 1; i++) {
                if ((shortened + ` ${words[i]}`).length > maxLength - 5) break;
                shortened += ` ${words[i].charAt(0)}.`;
            }
            shortened += ` ${words[words.length - 1]}`;
            if (shortened.length <= maxLength + 3) return shortened; // Permite um pouco mais se abreviado
        }

        // Se ainda for muito longo, simplesmente trunca
        return name.substring(0, maxLength - 3) + '...';
    };
    const [drawdownInfo, setDrawdownInfo] = useState<{ //
        valor: number; //
        inicio: string; //
        fim: string; //
        maiorLoss: { valor: number; data: string }; //
    } | null>(null);
    const [maiorGainDiario, setMaiorGainDiario] = useState<{ valor: number; data: string } | null>(null); //
    const [lucroAno, setLucroAno] = useState<{ ano: string; lucro: number }[]>([]); //
    const [maiorMes, setMaiorMes] = useState<{ valor: number; data: Date }>({ valor: 0, data: new Date() }); //
    const [piorMes, setPiorMes] = useState<{ valor: number; data: Date }>({ valor: 0, data: new Date() }); //
    const [diasPositivos, setDiasPositivos] = useState<number>(0); //
    const [diasNegativos, setDiasNegativos] = useState<number>(0); //
    const [estagnacaoInfo, setEstagnacaoInfo] = useState<{ //
        dias: number; //
        inicio: string; //
        fim: string; //
    } | null>(null);
    const [saldoInicial, setSaldoInicial] = useState<number>(0); //
    const [cagr, setCagr] = useState<number>(0); //
    const [drawdownMedioPercentual, setDrawdownMedioPercentual] = useState<number>(0); //
    const [sampleErrorPercentual, setSampleErrorPercentual] = useState<number>(0); //
    const [var95, setVar95] = useState<{ valor: number; porcentagem: number }>({ valor: 0, porcentagem: 0 }); //
    const [medianaRetornosMensais, setMedianaRetornosMensais] = useState<{ valor: number; porcentagem: number }>({ valor: 0, porcentagem: 0 }); //
    const [desvioPadrao, setDesvioPadrao] = useState<{ //
        retorno: { valor: number; porcentagem: number }; //
        drawdown: { valor: number; porcentagem: number }; //
    }>({
        retorno: { valor: 0, porcentagem: 0 }, //
        drawdown: { valor: 0, porcentagem: 0 }, //
    });
    const [daliobotScore, setDaliobotScore] = useState<number | null>(null); //
    const [daliobotFactor, setDaliobotFactor] = useState<number | null>(null); //

    const [showDistribuicaoPopup, setShowDistribuicaoPopup] = useState(false);
    const [showDistribuicaoPopupDiario, setShowDistribuicaoPopupDiario] = useState(false);
    const [distributionGranularity, setDistributionGranularity] = useState<'diario' | 'mensal' | 'anual'>('diario');


    // ▼▼▼ ADICIONE ESTES DOIS BLOCOS DE CÓDIGO ▼▼▼

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
        }).filter(Boolean);
    }, [csvData]);

    const [showMonteCarloPopup, setShowMonteCarloPopup] = useState(false); //
    const [showStatsPopup, setShowStatsPopup] = useState(false); //
    const [showRiskPopup, setShowRiskPopup] = useState(false); //
    const [showDrawdownPopup, setShowDrawdownPopup] = useState(false); //

    // States for Correlation Popup
    const [showCorrelationPopup, setShowCorrelationPopup] = useState(false);
    const [correlationMatrix, setCorrelationMatrix] = useState<number[][] | null>(null);
    const [correlationStrategyNames, setCorrelationStrategyNames] = useState<string[]>([]);
    const [loadingCorrelations, setLoadingCorrelations] = useState(false);
    const [correlationError, setCorrelationError] = useState<string | null>(null);


    const formatarMesAno = useCallback((data: Date | string) => { //
        const dateObj = typeof data === 'string' ? new Date(data) : data; //
        if (!dateObj || isNaN(dateObj.getTime())) return '-'; //
        return dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); //
    }, []);
    const [monthlyPerformanceData, setMonthlyPerformanceData] = useState<{ [year: number]: { [month: number]: number } }>({});

    const calcularMetricasDependentes = useCallback(() => { //
        if (csvData.length === 0) { //
            setCagr(0); //
            setDrawdownMedioPercentual(0); //
            setSampleErrorPercentual(0); //
            setVar95({ valor: 0, porcentagem: 0 }); //
            setMedianaRetornosMensais({ valor: 0, porcentagem: 0 }); //
            setDesvioPadrao({ //
                retorno: { valor: 0, porcentagem: 0 }, //
                drawdown: { valor: 0, porcentagem: 0 }, //
            });
            setDaliobotScore(null); //
            setDaliobotFactor(null); //
            return; //
        }

        const saldoInicialParaCalculo = saldoInicial > 0 ? saldoInicial : (csvData[0]?.EQUITY || 1); //
        const equityInicialDaEstrategia = csvData[0]?.EQUITY || 0; //
        const equityFinalDaEstrategia = csvData[csvData.length - 1]?.EQUITY || 0; //

        if (equityInicialDaEstrategia <= 0 && saldoInicial <= 0) { //
            setCagr(0); //
            setDrawdownMedioPercentual(0); //
            setSampleErrorPercentual(0); //
            setVar95({ valor: 0, porcentagem: 0 }); //
            setMedianaRetornosMensais({ valor: 0, porcentagem: 0 }); //
            setDesvioPadrao({ //
                retorno: { valor: 0, porcentagem: 0 }, //
                drawdown: { valor: 0, porcentagem: 0 }, //
            });
            setDaliobotScore(null); //
            setDaliobotFactor(null); //
            return; //
        }

        const primeiraData = new Date(csvData[0].DATE); //
        const ultimaData = new Date(csvData[csvData.length - 1].DATE); //
        const diffEmMs = ultimaData.getTime() - primeiraData.getTime(); //
        const diffEmDias = diffEmMs / (1000 * 60 * 60 * 24); //
        const anos = diffEmDias > 0 ? diffEmDias / 365 : 0; //

        let cagrCalculado = 0; //
        if (anos > 0 && equityInicialDaEstrategia > 0 && equityFinalDaEstrategia >= 0) { //
            const ratio = equityFinalDaEstrategia / equityInicialDaEstrategia; //
            if (ratio >= 0) { //
                cagrCalculado = Math.pow(ratio, 1 / anos) - 1; //
            }
        }
        setCagr(cagrCalculado * 100); //

        const retornosDiariosPercentuais = csvData.slice(1).map((row, i) => { //
            const prevEquity = csvData[i].EQUITY; //
            return prevEquity !== 0 ? (row.EQUITY - prevEquity) / prevEquity : 0; //
        }).filter(r => !isNaN(r) && isFinite(r)); //

        const drawdownsPercentuaisCalculados: number[] = []; //
        let picoEquityAtual = csvData[0]?.EQUITY || 0; //
        let fundoEquityAtual = picoEquityAtual; //

        for (const row of csvData) { //
            if (row.EQUITY > picoEquityAtual) { //
                if (fundoEquityAtual < picoEquityAtual && picoEquityAtual !== 0) { //
                    const drawdownPercentual = (fundoEquityAtual - picoEquityAtual) / picoEquityAtual; //
                    drawdownsPercentuaisCalculados.push(drawdownPercentual); //
                }
                picoEquityAtual = row.EQUITY; //
                fundoEquityAtual = picoEquityAtual; //
            } else {
                fundoEquityAtual = Math.min(fundoEquityAtual, row.EQUITY); //
            }
        }
        if (fundoEquityAtual < picoEquityAtual && picoEquityAtual !== 0) { //
            const drawdownPercentual = (fundoEquityAtual - picoEquityAtual) / picoEquityAtual; //
            drawdownsPercentuaisCalculados.push(drawdownPercentual); //
        }

        const drawdownMedioCalc = drawdownsPercentuaisCalculados.length > 0 //
            ? drawdownsPercentuaisCalculados.reduce((a, b) => a + b, 0) / drawdownsPercentuaisCalculados.length //
            : 0; //
        setDrawdownMedioPercentual(Math.abs(drawdownMedioCalc) * 100); //

        const mediaRetornosDiarios = retornosDiariosPercentuais.length > 0 ? retornosDiariosPercentuais.reduce((a, b) => a + b, 0) / retornosDiariosPercentuais.length : 0; //
        const varianciaRetornos = retornosDiariosPercentuais.length > 0 ? retornosDiariosPercentuais.reduce((sum, r) => sum + Math.pow(r - mediaRetornosDiarios, 2), 0) / retornosDiariosPercentuais.length : 0; //
        const dpRetornosDiarios = Math.sqrt(varianciaRetornos); //
        setSampleErrorPercentual(dpRetornosDiarios * 100); //

        const retornosDiariosOrdenados = [...retornosDiariosPercentuais].sort((a, b) => a - b); //
        const indexVar = Math.floor(retornosDiariosOrdenados.length * 0.05); //
        const varPercentual = retornosDiariosOrdenados[indexVar] || 0; //
        setVar95({ //
            valor: Math.abs(varPercentual * saldoInicialParaCalculo), //
            porcentagem: Math.abs(varPercentual * 100), //
        });

        const lucroMensalMap = new Map<string, number>(); //
        csvData.forEach((row, i) => { //
            if (i === 0) return; //
            const data = new Date(row.DATE); //
            const key = `${data.getFullYear()}-${data.getMonth()}`; //
            const prev = csvData[i - 1]; //
            const diferenca = row.EQUITY - prev.EQUITY; //
            lucroMensalMap.set(key, (lucroMensalMap.get(key) || 0) + diferenca); //
        });
        const lucrosMensaisArray = Array.from(lucroMensalMap.values()).sort((a, b) => a - b); //
        let medianaLucroMensal = 0; //
        if (lucrosMensaisArray.length > 0) { //
            const mid = Math.floor(lucrosMensaisArray.length / 2); //
            medianaLucroMensal = lucrosMensaisArray.length % 2 === 0 //
                ? (lucrosMensaisArray[mid - 1] + lucrosMensaisArray[mid]) / 2 //
                : lucrosMensaisArray[mid]; //
        }
        setMedianaRetornosMensais({ //
            valor: medianaLucroMensal, //
            porcentagem: saldoInicialParaCalculo !== 0 ? (medianaLucroMensal / saldoInicialParaCalculo) * 100 : 0, //
        });

        const varianciaDrawdowns = drawdownsPercentuaisCalculados.length > 0 ? drawdownsPercentuaisCalculados.reduce((sum, dd) => sum + Math.pow(dd - drawdownMedioCalc, 2), 0) / drawdownsPercentuaisCalculados.length : 0; //
        const dpDrawdowns = Math.sqrt(varianciaDrawdowns); //

        setDesvioPadrao({ //
            retorno: { //
                valor: dpRetornosDiarios * saldoInicialParaCalculo, //
                porcentagem: dpRetornosDiarios * 100, //
            },
            drawdown: { //
                valor: dpDrawdowns * saldoInicialParaCalculo, //
                porcentagem: dpDrawdowns * 100, //
            },
        });

        const scoreCalculado = Math.min(10, Math.max(0, (cagrCalculado * 100) / 5)); //
        setDaliobotScore(Number(scoreCalculado.toFixed(2))); //

        const fatorCalculado = mediaRetornosDiarios / (dpRetornosDiarios || 1e-9); //
        setDaliobotFactor(Number(fatorCalculado.toFixed(2))); //

    }, [csvData, saldoInicial]); //

    useEffect(() => { //
        if (csvData.length > 0) { //
            calcularMetricasDependentes(); //
        }
    }, [csvData, saldoInicial, calcularMetricasDependentes]); //

    // ==================================================================
    // ADICIONE ESTA NOVA FUNÇÃO
    // ==================================================================
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
                const prev = dadosParaCalculo[i - 1];
                const diferenca = row.EQUITY - prev.EQUITY;

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
                    inicioEstagnadoTemp = atual.DATE;
                } else {
                    if (inicioEstagnadoTemp) {
                        diasEstagnado = (new Date(atual.DATE).getTime() - new Date(inicioEstagnadoTemp).getTime()) / (1000 * 60 * 60 * 24);
                    }
                }
            }
            if (diasEstagnado > maiorEstagnacaoDias) {
                maiorEstagnacaoDias = diasEstagnado;
                dataInicioEstFinal = inicioEstagnadoTemp;
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
    // ==================================================================
    // ADICIONE ESTE BLOCO DE CÓDIGO
    // ==================================================================
    const lucroCurveData = useMemo(() => {
        if (csvData.length === 0) return [];

        // O equity inicial é o valor do primeiro dia dos dados (já filtrados)
        const initialEquity = csvData[0].EQUITY;

        // Mapeamos os dados para criar uma nova propriedade 'LUCRO'
        return csvData.map(row => ({
            ...row, // Mantém os dados originais como DATE
            LUCRO: row.EQUITY - initialEquity, // Calcula o lucro acumulado
        }));
    }, [csvData]); // Este hook será recalculado sempre que csvData mudar

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

                    let dataInicioMaisRecente: Date | null = null;
                    if (robosDoPortfolio.length > 0) {
                        const promises = robosDoPortfolio.map(nomeEstrategia =>
                            get(ref(db, `estrategias/${user.uid}/${nomeEstrategia}`))
                        );
                        const resultados = await Promise.all(promises);
                        const datasDeInicio: Date[] = [];

                        resultados.forEach(snapshotEstrategia => {
                            if (snapshotEstrategia.exists()) {
                                const dadosEstrategia = snapshotEstrategia.val();
                                const primeiraLinha = dadosEstrategia.dadosCSV?.[0] || Object.values(dadosEstrategia.dadosCSV || {})[0];
                                if (primeiraLinha && primeiraLinha['<DATE>']) {
                                    // Aplicando a correção de data aqui também
                                    const parsableDateStr = String(primeiraLinha['<DATE>']).replace(/\./g, '-');
                                    datasDeInicio.push(new Date(parsableDateStr));
                                }
                            }
                        });

                        if (datasDeInicio.length > 0) {
                            dataInicioMaisRecente = new Date(Math.max.apply(null, datasDeInicio.map(d => d.getTime())));
                        }
                    }

                    if (data.dadosConsolidados) {
                        // ==========================================================
                        // >> APLICAÇÃO DA CORREÇÃO DE DATA <<
                        // ==========================================================
                        const dadosCompletos: CsvData[] = Object.values(data.dadosConsolidados)
                            .filter((row: any): row is Record<string, any> => row && typeof row === 'object' && Object.keys(row).length > 0 && row['<DATE>'])
                            .map((row: Record<string, any>) => {
                                const dateStr = String(row['<DATE>']);
                                // Substituímos os pontos por hífens para o JS entender a data
                                const parsableDateStr = dateStr.replace(/\./g, '-');
                                return {
                                    DATE: parsableDateStr, // Armazenamos a data já corrigida
                                    BALANCE: parseFloat(String(row['<BALANCE>']).replace(',', '.') || '0'),
                                    EQUITY: parseFloat(String(row['<EQUITY>']).replace(',', '.') || '0'),
                                    'DEPOSIT LOAD': parseFloat(String(row['<DEPOSIT LOAD>']).replace(',', '.') || '0'),
                                };
                            })
                            .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

                        const dadosFiltrados = dataInicioMaisRecente ?
                            dadosCompletos.filter(row => new Date(row.DATE) >= dataInicioMaisRecente!) :
                            dadosCompletos;

                        setCsvData(dadosFiltrados);

                        if (dadosFiltrados.length > 0) {
                            const dataInicioReal = new Date(dadosFiltrados[0].DATE);
                            const dataInicioRealFormatada = dataInicioReal.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const ultimaDataCsv = new Date(dadosFiltrados[dadosFiltrados.length - 1].DATE);
                            let dataFimFormatada = 'Data Atual';
                            if (!isNaN(ultimaDataCsv.getTime())) {
                                dataFimFormatada = ultimaDataCsv.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            }
                            setHistorico(`${dataInicioRealFormatada} - ${dataFimFormatada}`);
                            calcularMetricasComDados(dadosFiltrados);
                        } else {
                            setCsvData([]);
                            setHistorico(`From ${dataInicioMaisRecente?.toLocaleDateString('pt-BR') || 'data calculada'} - No backtest data`);
                        }
                    } else {
                        setCsvData([]);
                        const dataInicioFormatada = data.dataCriacao ? new Date(data.dataCriacao).toLocaleDateString('pt-BR') : 'N/A';
                        setHistorico(`${dataInicioFormatada} - No backtest data`);
                    }
                } else {
                    console.error(`Portfolio with ID"${roboNome}" not found.`);
                    setCsvData([]);
                    setNomePortfolioExibicao(roboNome);
                    setEstrategias('N/A');
                    setHistorico('N/A');
                }
            } catch (error) {
                console.error('Error fetching portfolio data:', error);
                setCsvData([]);
                setNomePortfolioExibicao(roboNome);
                setEstrategias('Error loading');
                setHistorico('Error loading');
            } finally {
                setCarregandoDados(false);
            }
        };

        fetchRoboData();
    }, [user, roboNome]);

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
            setCorrelationError("São necessárias pelo menos duas estratégias para calcular a correlação.");
            setLoadingCorrelations(false);
            setCorrelationMatrix(null);
            setCorrelationStrategyNames(strategyNameList);
            return;
        }

        // Temporariamente define os nomes aqui, será atualizado se algumas não carregarem
        setCorrelationStrategyNames(strategyNameList);
        const db = getDatabase();
        // strategyName -> {date -> return}
        const allStrategyReturns: Map<string, Map<string, number>> = new Map();

        try {
            const promises = strategyNameList.map(async (strategyNameFromList) => {
                // NOVO CAMINHO: basededados/estrategias/${user.uid}/${strategyNameFromList}
                const strategyDataRef = ref(db, `estrategias/${user.uid}/${strategyNameFromList}`);
                const strategySnapshot = await get(strategyDataRef);

                if (strategySnapshot.exists()) {
                    const strategyData = strategySnapshot.val();
                    // DADOS CSV ESTÃO EM strategyData.dadosCSV
                    if (strategyData.dadosCSV) {
                        let rawCsvArray: any[];
                        if (Array.isArray(strategyData.dadosCSV)) {
                            rawCsvArray = strategyData.dadosCSV;
                        } else if (typeof strategyData.dadosCSV === 'object') {
                            // Se dadosCSV for um objeto de objetos (como era dadosConsolidados)
                            rawCsvArray = Object.values(strategyData.dadosCSV);
                        } else {
                            console.warn(`dadosCSV para a estratégia ${strategyNameFromList} não é um array ou objeto.`);
                            return; // Pula esta estratégia
                        }

                        const normalized: CsvData[] = rawCsvArray
                            .filter((row: any): row is Record<string, any> =>
                                row && typeof row === 'object' &&
                                Object.keys(row).length > 0 &&
                                typeof row['<DATE>'] === 'string' && // Adicionando checagem de tipo para <DATE>
                                (typeof row['<EQUITY>'] === 'string' || typeof row['<EQUITY>'] === 'number') // Checagem para <EQUITY>
                            )
                            .map((row: Record<string, any>) => ({
                                DATE: String(row['<DATE>']),
                                BALANCE: parseFloat(String(row['<BALANCE>']).replace(',', '.') || '0'),
                                EQUITY: parseFloat(String(row['<EQUITY>']).replace(',', '.') || '0'),
                                'DEPOSIT LOAD': parseFloat(String(row['<DEPOSIT LOAD>']).replace(',', '.') || '0'),
                            }))
                            .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

                        if (normalized.length > 1) {
                            const dailyReturns = new Map<string, number>();
                            for (let i = 1; i < normalized.length; i++) {
                                const prevEquity = normalized[i - 1].EQUITY;
                                const currentEquity = normalized[i].EQUITY;
                                if (prevEquity !== 0 && !isNaN(prevEquity) && !isNaN(currentEquity)) { // Checagem extra de NaN
                                    const dailyReturn = (currentEquity - prevEquity) / prevEquity;
                                    dailyReturns.set(normalized[i].DATE, dailyReturn);
                                } else {
                                    dailyReturns.set(normalized[i].DATE, 0);
                                }
                            }
                            allStrategyReturns.set(strategyNameFromList, dailyReturns);
                        } else {
                            console.warn(`Estratégia ${strategyNameFromList} tem menos de 2 pontos de dados normalizados, não é possível calcular retornos.`);
                        }
                    } else {
                        console.warn(`dadosCSV não encontrados para a estratégia ${strategyNameFromList} em basededados/estrategias/${user.uid}/${strategyNameFromList}.`);
                    }
                } else {
                    console.warn(`Estratégia ${strategyNameFromList} não encontrada em basededados/estrategias/${user.uid}/${strategyNameFromList}.`);
                }
            });

            await Promise.all(promises);

            if (allStrategyReturns.size < strategyNameList.length && allStrategyReturns.size > 0) {
                console.warn("Não foi possível carregar os dados de retorno para todas as estratégias listadas, mas algumas foram carregadas.");
            } else if (allStrategyReturns.size === 0 && strategyNameList.length > 0) {
                console.warn("Não foi possível carregar dados de retorno para NENHUMA das estratégias listadas.");
            }


            if (allStrategyReturns.size < 2) {
                setCorrelationError("Não foi possível obter dados de retorno suficientes para pelo menos duas estratégias.");
                setLoadingCorrelations(false);
                setCorrelationMatrix(null);
                // Mantém correlationStrategyNames com a lista original para debug ou informação ao usuário
                return;
            }

            const validStrategyNames = Array.from(allStrategyReturns.keys());
            setCorrelationStrategyNames(validStrategyNames); // Atualiza com os nomes das estratégias que realmente carregaram

            const numStrategies = validStrategyNames.length;
            // Esta checagem é um pouco redundante se a anterior (allStrategyReturns.size < 2) já foi feita,
            // mas é uma segurança adicional.
            if (numStrategies < 2) {
                setCorrelationError("Dados de retorno válidos foram encontrados para menos de duas estratégias.");
                setLoadingCorrelations(false);
                setCorrelationMatrix(null);
                return;
            }

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

                        const dates1 = new Set(returns1Map.keys());
                        const commonDates = [...dates1].filter(date => returns2Map.has(date)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                        if (commonDates.length >= 2) {
                            commonDates.forEach(date => {
                                alignedReturns1.push(returns1Map.get(date)!);
                                alignedReturns2.push(returns2Map.get(date)!);
                            });
                            matrix[i][j] = calculatePearsonCorrelation(alignedReturns1, alignedReturns2);
                        } else {
                            console.warn(`Não há dados em comum suficientes entre ${name1} e ${name2} para calcular correlação.`);
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


    const drawdownSeries = useMemo(() => { //
        if (csvData.length === 0) return []; //
        let pico = csvData[0].EQUITY; //
        return csvData.map(row => { //
            pico = Math.max(pico, row.EQUITY); //
            return { //
                DATE: row.DATE, //
                DD: row.EQUITY - pico, //
            };
        });
    }, [csvData]); //

    const monteCarloData = useMemo(() => { //
        if (csvData.length < 2) return []; //

        const simulations = 100; //
        const steps = Math.min(60, csvData.length - 1); //
        const dailyReturns = csvData.slice(1).map((row, i) => { //
            const prev = csvData[i].EQUITY; //
            return prev !== 0 ? (row.EQUITY - prev) / prev : 0; //
        }).filter(v => !isNaN(v) && isFinite(v)); //

        if (dailyReturns.length === 0) return []; //

        const avg = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length; //
        const stddev = Math.sqrt( //
            dailyReturns.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / dailyReturns.length //
        );

        const getRandomColor = () => `rgb(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)})`; //

        return Array.from({ length: simulations }, () => { //
            const path = [{ step: 0, value: 1 }]; //
            let currentVal = 1; //
            for (let i = 1; i < steps; i++) { //
                const randomFactor = avg + stddev * (Math.random() * 2 - 1); //
                currentVal *= (1 + randomFactor); //
                path.push({ step: i, value: Math.max(0, currentVal) }); //
            }
            return { path, color: getRandomColor() }; //
        });
    }, [csvData]); //

    if (!user && carregandoDados) return <div className="p-4 text-center">Loading authentication...</div>; //
    if (!user && !carregandoDados) { //
        if (typeof window !== "undefined") router.push('/login'); //
        return <div className="p-4 text-center">User not authenticated. Redirecting...</div>; //
    }
    if (carregandoDados && !roboNome) { //
        return <div className="p-4 text-center">Analyzing URL...</div>; //
    }
    if (carregandoDados) { //
        return <div className="p-4 text-center">Loading portfolio data...</div>; //
    }

    const isCorrelationButtonDisabled = !estrategias || estrategias === 'N/A' || estrategias === 'Nenhuma estratégia definida' || estrategias === 'Erro ao carregar' || estrategias.split(',').map(s => s.trim()).filter(s => s.length > 0).length < 2; //

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
            <div className="flex flex-1 relative">
                <div
                    className={`absolute md:static z-30 transition-transform duration-300 transform shadow-md md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
                >
                    <Sidebar />
                </div>

                <main className="flex-1 p-4 bg-gray-50">
                    <Card className="mb-6">
                        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <CardTitle>{nomePortfolioExibicao || roboNome || "Dashboard"}</CardTitle>
                            <button
                                onClick={() => setShowStatsPopup(true)}
                                className="bg-purple-400 text-white px-2 py-1 text-xs rounded hover:bg-purple-500 mt-2 md:mt-0 sm:px-1 sm:py-1 sm:text-xxs"
                            >
                                Understand the Statistics
                            </button>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-700">
                            <div className="mb-4 space-y-3">
                                <div>
                                    <p className="font-semibold">Strategies</p>
                                    <p className="break-all">{estrategias || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">History</p>
                                    <p>{historico || '-'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end items-center mt-4 space-x-2">
                                <button
                                    onClick={() => setShowCorrelationPopup(true)}
                                    className={`px-4 py-2 rounded text-white ${isCorrelationButtonDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-500 hover:bg-pink-600'}`}
                                    disabled={isCorrelationButtonDisabled}
                                    title={isCorrelationButtonDisabled ? "São necessárias pelo menos duas estratégias para correlação" : "Ver Correlação de Estratégias"}
                                >
                                    Correlation of Strategies

                                </button>
                                <button
                                    onClick={() => setShowRiskPopup(true)}
                                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                                >
                                    Risk Management
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center mb-4"> {/* */}
                        <h1 className="text-2xl font-bold">Portfolio Dashboard</h1> {/* */}
                        <div className="flex space-x-1 p-0.5 bg-gray-200 rounded-md"> {/* */}
                            <button
                                onClick={() => setAbaAtiva('resultados')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors
                  ${abaAtiva === 'resultados' ? 'bg-white text-purple-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Results
                            </button>
                            <button
                                onClick={() => setAbaAtiva('metricasAvancadas')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors
                  ${abaAtiva === 'metricasAvancadas' ? 'bg-white text-purple-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Advanced Metrics
                            </button>
                        </div>
                    </div>

                    {csvData.length === 0 && !carregandoDados && ( //
                        <div className="text-center text-gray-600 py-10">  {/* */}
                            No data found for this robot ({nomePortfolioExibicao || roboNome || "ID not specified"}). Check the CSV file or the ID in the URL. {/* */}
                        </div>
                    )}

                    {csvData.length > 0 && ( //
                        <>
                            {abaAtiva === 'resultados' && ( //
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* */}
                                    <Card> {/* */}
                                        <CardHeader> <CardTitle>Total Profit (Equity)</CardTitle> </CardHeader> {/* */}
                                        <CardContent> {/* */}
                                            <p className="text-green-600 text-2xl font-bold"> {/* */}
                                                <NumericFormat value={lucroTotalEquity} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                            </p>
                                            <p className="text-green-500 text-sm"> {/* */}
                                                <NumericFormat value={mediaMensalEquity} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />Monthly Average (Equity){/* */}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card> {/* */}
                                        <CardHeader> <CardTitle>Profit Factor</CardTitle> </CardHeader> {/* */}
                                        <CardContent> {/* */}
                                            <p className="text-2xl font-bold mb-4"> {/* */}
                                                <NumericFormat value={fatorLucro} displayType="text" decimalScale={2} fixedDecimalScale /> {/* */}
                                            </p>
                                            <div className="flex justify-between text-sm text-muted-foreground"> {/* */}
                                                <span>Hit Rate:<NumericFormat value={taxaAcerto} displayType="text" decimalScale={1} fixedDecimalScale suffix="%" /></span> {/* */}
                                                <span>Recovery Factor: <NumericFormat value={fatorRecuperacao} displayType="text" decimalScale={2} fixedDecimalScale /></span> {/* */}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card> {/* */}
                                        <CardHeader> <CardTitle>Payoff</CardTitle> </CardHeader> {/* */}
                                        <CardContent> {/* */}
                                            <p className="text-2xl font-bold"> {/* */}
                                                <NumericFormat value={payoff} displayType="text" decimalScale={2} fixedDecimalScale /> {/* */}
                                            </p>
                                            <p className="text-sm text-green-700"> {/* */}
                                                <NumericFormat value={avgGain} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Average Positive Days {/* */}
                                            </p>
                                            <p className="text-sm text-red-600"> {/* */}
                                                <NumericFormat value={avgLoss} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Average Negative Days{/* */}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4"> {/* */}

                                        <Card className="md:col-span-2">
                                            {/* Título alterado para refletir a mudança */}
                                            <CardHeader> <CardTitle>Accumulated Profit Curve</CardTitle> </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    {/* 1. Usar os novos dados: lucroCurveData */}
                                                    <LineChart data={lucroCurveData}>
                                                        <XAxis
                                                            dataKey="DATE"
                                                            tickFormatter={(dateStr) =>
                                                                new Date(dateStr).toLocaleDateString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: '2-digit'
                                                                })
                                                            }
                                                            tick={{ fontSize: 10 }}
                                                            interval="preserveStartEnd"
                                                        />
                                                        <YAxis
                                                            domain={['auto', 'auto']}
                                                            tickFormatter={(value) =>
                                                                `$ ${Number(value).toLocaleString('pt-BR', {
                                                                    minimumFractionDigits: 0,
                                                                    maximumFractionDigits: 0
                                                                })}`
                                                            }
                                                        />
                                                        <Tooltip
                                                            formatter={(value: number) => [
                                                                `$ ${value.toLocaleString('pt-BR', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}`,
                                                                "Retained Profit" // 2. Label do tooltip atualizado
                                                            ]}
                                                            labelFormatter={(label: string) =>
                                                                new Date(label).toLocaleDateString('pt-BR')
                                                            }
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="LUCRO" // 3. dataKey alterado para "LUCRO"
                                                            stroke="#9333EA"
                                                            strokeWidth={2}
                                                            dot={false}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                        <div className="flex flex-col space-y-4"> {/* */}
                                            {drawdownInfo && ( //
                                                <Card> {/* */}
                                                    <CardHeader className="flex flex-row items-center justify-between pb-2"> {/* */}
                                                        <CardTitle className="text-base font-medium">Maximum Drawdown</CardTitle> {/* */}
                                                        <button onClick={() => setShowDrawdownPopup(true)} className="text-xs text-purple-600 hover:underline">Details</button> {/* */}
                                                    </CardHeader>
                                                    <CardContent> {/* */}
                                                        <p className="text-2xl font-bold text-red-600"> {/* */}
                                                            <NumericFormat value={drawdownInfo.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                        </p>
                                                        <p className="text-xs text-gray-500"> {/* */}
                                                            {new Date(drawdownInfo.inicio).toLocaleDateString('pt-BR')} - {new Date(drawdownInfo.fim).toLocaleDateString('pt-BR')} {/* */}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                            {drawdownInfo?.maiorLoss && drawdownInfo.maiorLoss.valor !== 0 && ( //
                                                <Card> {/* */}
                                                    <CardHeader className="pb-2"> {/* */}
                                                        <CardTitle className="text-base font-medium">Biggest Daily Loss</CardTitle> {/* */}
                                                    </CardHeader>
                                                    <CardContent> {/* */}
                                                        <p className="text-2xl font-bold text-red-600"> {/* */}
                                                            <NumericFormat value={drawdownInfo.maiorLoss.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                        </p>
                                                        <p className="text-xs text-gray-500"> {/* */}
                                                            {drawdownInfo.maiorLoss.data ? new Date(drawdownInfo.maiorLoss.data).toLocaleDateString('pt-BR') : '-'} {/* */}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                            {maiorGainDiario && maiorGainDiario.valor > 0 && ( //
                                                <Card> {/* */}
                                                    <CardHeader className="pb-2"> {/* */}
                                                        <CardTitle className="text-base font-medium">Highest Daily Gain</CardTitle> {/* */}
                                                    </CardHeader>
                                                    <CardContent> {/* */}
                                                        <p className="text-2xl font-bold text-green-600"> {/* */}
                                                            <NumericFormat value={maiorGainDiario.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                        </p>
                                                        <p className="text-xs text-gray-500"> {/* */}
                                                            {maiorGainDiario.data ? new Date(maiorGainDiario.data).toLocaleDateString('pt-BR') : '-'} {/* */}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </div>
                                    <Card className="md:col-span-2"> {/* */}
                                        <CardHeader> <CardTitle>Year-over-Year Profit</CardTitle> </CardHeader> {/* */}
                                        <CardContent> {/* */}
                                            <ResponsiveContainer width="100%" height={250}>
                                                <BarChart data={lucroAno} barSize={50}>
                                                    <XAxis dataKey="ano" />
                                                    <YAxis
                                                        tickFormatter={(value) =>
                                                            `$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                                        }
                                                    />
                                                    <Tooltip
                                                        formatter={(value: number) =>
                                                            `$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        }
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
                                                            style={{ fontSize: 10, fill: '#333' }}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    <Card className="md:col-span-1 flex flex-col justify-between"> {/* */}
                                        <CardHeader> <CardTitle>Best and Worst Month</CardTitle> </CardHeader> {/* */}
                                        <CardContent className="space-y-4"> {/* */}
                                            <div> {/* */}
                                                <p className="text-green-600 font-semibold">Best Month</p> {/* */}
                                                <p className="text-2xl font-bold text-green-700"> {/* */}
                                                    <NumericFormat value={maiorMes.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                </p>
                                                <p className="text-sm text-gray-500">{formatarMesAno(maiorMes.data)}</p> {/* */}
                                            </div>
                                            <div> {/* */}
                                                <p className="text-red-600 font-semibold">Worst Month</p> {/* */}
                                                <p className="text-2xl font-bold text-red-700"> {/* */}
                                                    <NumericFormat value={piorMes.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                </p>
                                                <p className="text-sm text-gray-500">{formatarMesAno(piorMes.data)}</p> {/* */}
                                            </div>
                                            <div className="space-y-2 pt-2"> {/* */}
                                                <div className="flex justify-between text-sm font-medium"> {/* */}
                                                    <span className="text-green-600">Positive Days: {diasPositivos}</span> {/* */}
                                                    <span className="text-red-600">Negative Days:{diasNegativos}</span> {/* */}
                                                </div>
                                                {(diasPositivos + diasNegativos > 0) && ( //
                                                    <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden flex"> {/* */}
                                                        <div className="bg-green-500 h-full" style={{ width: `${(diasPositivos / (diasPositivos + diasNegativos)) * 100}%` }} /> {/* */}
                                                        <div className="bg-red-500 h-full" style={{ width: `${(diasNegativos / (diasPositivos + diasNegativos)) * 100}%` }} /> {/* */}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <MonthlyPerformanceTable data={monthlyPerformanceData} />

                                    {/* Substitua seu card de Distribuição por estes dois */}
                                    <Card className="md:col-span-1">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-base font-medium">Distribution of Results</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <button
                                                onClick={() => {
                                                    setDistributionGranularity('diario');
                                                    setShowDistribuicaoPopup(true);
                                                }}
                                                className="w-full mx-auto block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                                            >
                                                Analyze Frequency
                                            </button>
                                        </CardContent>
                                    </Card>

                                    <Card className="md:col-span-1">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-base font-medium">Distribution of results (daily)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <button
                                                onClick={() => setShowDistribuicaoPopupDiario(true)}
                                                className="w-full mx-auto block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                                            >
                                                See Chart
                                            </button>
                                        </CardContent>
                                    </Card>
                                    {estagnacaoInfo && ( //
                                        <Card className="md:col-span-1 flex flex-col justify-between"> {/* */}
                                            <CardHeader className="flex flex-row items-center gap-3 pb-2"> {/* */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {/* */}
                                                <CardTitle className="text-base font-medium">Greater Stagnation</CardTitle> {/* */}
                                            </CardHeader>
                                            <CardContent> {/* */}
                                                <p className="text-lg font-semibold text-gray-700"> {/* */}
                                                    {estagnacaoInfo.dias} days {/* */}
                                                </p>
                                                <p className="text-xs text-gray-500"> {/* */}
                                                    {estagnacaoInfo.inicio ? new Date(estagnacaoInfo.inicio).toLocaleDateString('pt-BR') : '-'} to {estagnacaoInfo.fim ? new Date(estagnacaoInfo.fim).toLocaleDateString('pt-BR') : '-'} {/* */}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {abaAtiva === 'metricasAvancadas' && ( //
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* */}
                                    <Card className="md:col-span-3"> {/* */}
                                        <CardHeader> <CardTitle>Set Beginning Balance for Calculations</CardTitle> </CardHeader> {/* */}
                                        <CardContent className="flex flex-col md:flex-row items-center gap-4"> {/* */}
                                            <NumericFormat //
                                                value={saldoInicial} //
                                                onValueChange={(values) => setSaldoInicial(values.floatValue || 0)} //
                                                thousandSeparator="." decimalSeparator="," prefix="$ " //
                                                allowNegative={false} decimalScale={2} fixedDecimalScale //
                                                className="border rounded p-2 w-full md:w-1/3" //
                                                placeholder="Digite o saldo inicial" //
                                            />
                                            <button //
                                                onClick={calcularMetricasDependentes} //
                                                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600" //
                                                disabled={csvData.length === 0} //
                                            >
                                                Apply Balance and Recalculate
                                            </button>
                                        </CardContent>
                                    </Card>
                                    <Card className="flex items-center p-4"> {/* */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mr-3 text-purple-600"><line x1="12" y1="20" x2="12" y2="4"></line><polyline points="18 10 12 4 6 10"></polyline></svg> {/* */}
                                        <div> {/* */}
                                            <p className="text-muted-foreground text-sm">CAGR</p> {/* */}
                                            <p className="text-2xl font-bold text-black"> {/* */}
                                                <NumericFormat value={cagr} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" /> {/* */}
                                            </p>
                                        </div>
                                    </Card>
                                    <Card className="flex items-center p-4"> {/* */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mr-3 text-red-500"><polyline points="22 18 16 12 12 16 6 10 2 14"></polyline><polyline points="16 18 22 18 22 12"></polyline></svg> {/* */}
                                        <div> {/* */}
                                            <p className="text-muted-foreground text-sm">Medium Drawdown</p> {/* */}
                                            <p className="text-2xl font-bold text-black"> {/* */}
                                                <NumericFormat value={drawdownMedioPercentual} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" /> {/* */}
                                            </p>
                                        </div>
                                    </Card>
                                    <Card className="flex items-center p-4"> {/* */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mr-3 text-blue-500"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg> {/* */}
                                        <div> {/* */}
                                            <p className="text-muted-foreground text-sm">Sample Error (SD of Daily Returns)</p> {/* */}
                                            <p className="text-2xl font-bold text-black"> {/* */}
                                                <NumericFormat value={sampleErrorPercentual} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" /> {/* */}
                                            </p>
                                        </div>
                                    </Card>
                                    <Card> {/* */}
                                        <CardHeader className="pb-2"> <CardTitle className="text-base font-medium">Value at Risk (VaR 95%)</CardTitle> </CardHeader> {/* */}
                                        <CardContent> {/* */}
                                            <p className="text-red-600 text-xl font-bold"> {/* */}
                                                <NumericFormat value={var95.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                (<NumericFormat value={var95.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />) {/* */}
                                            </p>
                                            <p className="text-gray-400 text-xs">(Maximum daily loss estimate with 95% confidence, based on the Starting Balance above)</p> {/* */}
                                        </CardContent>
                                    </Card>
                                    <Card> {/* */}
                                        <CardHeader className="pb-2"> <CardTitle className="text-base font-medium">Median Monthly Profits</CardTitle> </CardHeader> {/* */}
                                        <CardContent> {/* */}
                                            <p className="text-xl font-bold" style={{ color: medianaRetornosMensais.valor >= 0 ? '#22C55E' : '#EF4444' }}> {/* */}
                                                <NumericFormat value={medianaRetornosMensais.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                (<NumericFormat value={medianaRetornosMensais.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />) {/* */}
                                            </p>
                                            <p className="text-gray-400 text-xs">(Median absolute monthly profits. % in relation to the above Beginning Balance)</p> {/* */}
                                        </CardContent>
                                    </Card>
                                    <Card> {/* */}
                                        <CardHeader className="pb-2"> <CardTitle className="text-base font-medium">Standard Deviation</CardTitle> </CardHeader> {/* */}
                                        <CardContent className="flex flex-col gap-2"> {/* */}
                                            <div> {/* */}
                                                <p className="text-blue-600 font-semibold text-sm">Daily Return</p> {/* */}
                                                <p className="text-xs"> {/* */}
                                                    <NumericFormat value={desvioPadrao.retorno.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                    (<NumericFormat value={desvioPadrao.retorno.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />) {/* */}
                                                </p>
                                            </div>
                                            <div> {/* */}
                                                <p className="text-orange-600 font-semibold text-sm">Drawdown (%)</p> {/* */}
                                                <p className="text-xs"> {/* */}
                                                    <NumericFormat value={desvioPadrao.drawdown.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> {/* */}
                                                    (<NumericFormat value={desvioPadrao.drawdown.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />) {/* */}
                                                </p>
                                            </div>
                                            <p className="text-gray-400 text-xs mt-1">(Values and % in relation to the Initial Balance above)</p> {/* */}
                                        </CardContent>
                                    </Card>
                                    <Card className="md:col-span-2 lg:col-span-3 flex flex-col p-6 shadow-sm">
                                                        <CardHeader className="p-2 text-center">
                                                          <CardTitle className="text-xl">DalioBot Score</CardTitle>
                                                        </CardHeader>
                                                        {/* A classe 'md:flex-row' foi removida e o alinhamento é sempre central */}
                                                        <CardContent className="flex flex-col items-center justify-center flex-grow gap-y-4">
                                    
                                                          {/* Medidor Circular */}
                                                          <div className="relative flex-shrink-0 flex items-center justify-center w-32 h-32">
                                                            <svg viewBox="0 0 36 36" className="absolute w-full h-full">
                                                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                fill="none"
                                                                stroke="#8b5cf6"
                                                                strokeWidth="3"
                                                                strokeDasharray={`${daliobotScore ? daliobotScore * 10 : 0}, 100`}
                                                                strokeLinecap="round"
                                                                transform="rotate(-90 18 18)"
                                                                className="transition-all duration-1000 ease-out"
                                                              />
                                                            </svg>
                                                            <span className="text-4xl font-bold text-gray-700">{daliobotScore !== null ? daliobotScore : '-'}</span>
                                                          </div>
                                    
                                                          {/* Texto Descritivo (sempre centralizado) */}
                                                          <div className="text-center">
                                                            <p className="text-2xl font-semibold text-gray-800">
                                                              {origem === 'portfolio' ? '' :
                                                                daliobotScore === null ? 'Indefinido' :
                                                                  daliobotScore >= 8 ? 'Ótimo' :
                                                                    daliobotScore >= 6 ? 'Bom' :
                                                                      daliobotScore >= 3 ? 'Ok' : 'Péssimo'}
                                                            </p>
                                                            <p className="text-gray-500 text-sm mt-1 max-w-xs">
                                                              Assesses the Stability of the Curve, the Risk x Return Relationship and the Statistical Significance of the strategy.
                                                            </p>
                                                          </div>
                                    
                                                        </CardContent>
                                                      </Card>

                                </div>
                            )}
                        </>
                    )}

                    {/* ▼▼▼ COLE TODO O CÓDIGO DOS POP-UPS AQUI ▼▼▼ */}

                    {/* Pop-up de Distribuição (Histograma Responsivo) */}
                    {showDistribuicaoPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-2 sm:p-4">
                            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-lg sm:text-xl font-bold">
                                        Distribution of Results
                                        {distributionGranularity === 'diario' && ' Diários'}
                                        {distributionGranularity === 'mensal' && ' Mensais'}
                                        {distributionGranularity === 'anual' && ' Anuais'}
                                    </h2>
                                    <button onClick={() => setShowDistribuicaoPopup(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                                </div>
                                <div className="flex space-x-1 sm:space-x-2 mb-4 border-b pb-3">
                                    <button
                                        onClick={() => setDistributionGranularity('diario')}
                                        className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${distributionGranularity === 'diario' ? 'bg-purple-600 text-white font-semibold shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        onClick={() => setDistributionGranularity('mensal')}
                                        className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${distributionGranularity === 'mensal' ? 'bg-purple-600 text-white font-semibold shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setDistributionGranularity('anual')}
                                        className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${distributionGranularity === 'anual' ? 'bg-purple-600 text-white font-semibold shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
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
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey={isMobile ? 'shortRange' : 'range'}
                                                    angle={isMobile ? -90 : -45}
                                                    textAnchor="end"
                                                    interval={isMobile ? 4 : 0}
                                                    tick={{ fontSize: isMobile ? 9 : 10, dy: isMobile ? 5 : 0 }}
                                                    label={{
                                                        value: "Faixa de Resultado ($)",
                                                        position: 'insideBottom',
                                                        offset: isMobile ? -60 : -85,
                                                        fontSize: isMobile ? 10 : 12,
                                                    }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: isMobile ? 9 : 10 }}
                                                    allowDecimals={false}
                                                    label={{
                                                        value: `Frequência (${distributionGranularity === 'diario' ? 'Dias' : distributionGranularity === 'mensal' ? 'Meses' : 'Anos'})`,
                                                        angle: -90, position: 'insideLeft',
                                                        fontSize: isMobile ? 10 : 12, dx: -15
                                                    }}
                                                />
                                                <Tooltip
                                                    wrapperClassName="!text-xs"
                                                    cursor={{ fill: 'rgba(233, 213, 255, 0.4)' }}
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
                                            <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 rounded-md">
                                                <p className="text-center text-sm p-4">There is not enough data to display at this granularity.</p>
                                            </div>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pop-up de Resultados Diários (Gráfico de Dispersão) */}
                    {showDistribuicaoPopupDiario && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-2 sm:p-4">
                            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg sm:text-xl font-bold">Daily Results Over Time</h2>
                                    <button onClick={() => setShowDistribuicaoPopupDiario(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                                </div>
                                <div className="w-full h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                            <CartesianGrid />
                                            <XAxis dataKey="x" type="number" domain={['auto', 'auto']}
                                                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                                                label={{ value: "Data", position: 'insideBottom', offset: -5, fontSize: 12 }} />
                                            <YAxis dataKey="y" domain={['auto', 'auto']}
                                                tickFormatter={(value) => `$ ${value.toLocaleString('pt-BR')}`}
                                                label={{ value: "Resultado do Dia ($)", angle: -90, position: 'insideLeft', fontSize: 12, dx: -10 }} />
                                            <Tooltip
                                                formatter={(value: number, name: string, props) => [`$ ${Number(props.payload?.y).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Resultado"]}
                                                labelFormatter={(label: any) => new Date(label).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} />
                                            <Scatter
                                                data={scatterPlotData}
                                                line={false} shape="circle" fill="rgba(147, 51, 234, 0.7)" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {showDrawdownPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex items-center justify-center p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">Drawdown Chart (Value)</h2>
                                    <button onClick={() => setShowDrawdownPopup(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={drawdownSeries}>
                                        <XAxis dataKey="DATE" tick={{ fontSize: 10 }}
                                            tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                                            interval="preserveStartEnd" />
                                        <YAxis tickFormatter={(val) => `$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
                                        <Tooltip
                                            labelFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            formatter={(val: number) => [`$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Drawdown"]} />
                                        <Line type="monotone" dataKey="DD" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {showStatsPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
                                    <h2 className="text-xl font-bold">How statistics work:</h2>
                                    <button onClick={() => setShowStatsPopup(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                                </div>
                                <div className="space-y-3 text-sm text-gray-700">
                                    <p><strong>Daily Results:</strong> All performance metrics (win rate, average gain/loss, etc.) are based on the net financial result at the end of each trading day. For example, a 60% win rate means that on 60% of trading days, the outcome was positive.</p>
                                    <p><strong>Net Profit (Equity):</strong> The total net profit generated by the strategy, calculated as the difference between the final and initial equity for the analyzed period.</p>
                                    <p><strong>Average Monthly Profit (Equity):</strong> The total net profit (equity) divided by the number of months in the analysis period.</p>
                                    <p><strong>Profit Factor:</strong> The ratio of gross profit (the sum of all winning days) to gross loss (the sum of all losing days). Values above 1 indicate that gains exceed losses.</p>
                                    <p><strong>Win Rate:</strong> The percentage of days the strategy ended with a profit, relative to the total number of trading days (both positive and negative).</p>
                                    <p><strong>Recovery Factor:</strong> The ratio of the total net profit (equity) to the maximum drawdown. It indicates the strategy's ability to generate profit relative to its largest historical loss.</p>
                                    <p><strong>Payoff:</strong> The ratio of the average gain on winning days to the average loss on losing days. For example, a payoff of 2 means that, on average, each winning day is twice as large as each losing day.</p>
                                    <p><strong>Avg. Winning/Losing Day:</strong> The average financial result for days that ended with a profit (positive) or a loss (negative).</p>
                                    <p><strong>Maximum Drawdown:</strong> The largest percentage or value drop in equity from a previous peak to a subsequent trough before a new peak is achieved.</p>
                                    <p><strong>Largest Daily Gain/Loss:</strong> The largest financial profit or loss recorded in a single day.</p>
                                    <p><strong>Longest Stagnation Period:</strong> The maximum number of consecutive days the strategy remained below a previously reached equity peak.</p>
                                    <p><strong>Initial Balance (for calculations):</strong> The capital amount you set to contextualize metrics like VaR, Median, and Standard Deviation in monetary terms. By default, you can use the backtest's initial equity.</p>
                                    <p><strong>CAGR (Compound Annual Growth Rate):</strong> The compound annual growth rate of the strategy's equity over the analyzed period.</p>
                                    <p><strong>Average Drawdown:</strong> The average of the percentage drawdowns that occurred during the analysis period.</p>
                                    <p><strong>Std. Dev. of Daily Returns:</strong> The standard deviation of the daily percentage returns. It indicates the volatility or dispersion of daily results around the daily average.</p>
                                    <p><strong>Value at Risk (VaR 95%):</strong> An estimate of the maximum expected financial loss (with 95% confidence) in a single day, based on the defined "Initial Balance" and the history of daily returns.</p>
                                    <p><strong>Median Monthly Profit:</strong> The median value of all monthly profits. 50% of months performed better than this value, and 50% performed worse. The value is shown in monetary terms and as a percentage of the "Initial Balance".</p>
                                    <p><strong>Standard Deviation (Return & Drawdown):</strong>
                                        <br /> - <em>Return:</em> The standard deviation of daily percentage returns, converted to a monetary value using the "Initial Balance".
                                        <br /> - <em>Drawdown:</em> The standard deviation of individual percentage drawdowns, converted to a monetary value using the "Initial Balance". It indicates the variability in the magnitude of the drawdowns.
                                    </p>
                                    <p><strong>DalioBot Score:</strong> A proprietary metric (0-10) that assesses the overall quality of the strategy, considering the stability of the equity curve, the risk-return ratio, and the statistical significance of the results. Calculated only for individual bots.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {showRiskPopup && drawdownInfo && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">RISK MANAGEMENT</h2>
                                    <button onClick={() => setShowRiskPopup(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                                </div>
                                <div className="flex justify-between mb-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Maximum Drawdown (Backtest)</p>
                                        <p className="text-red-600 font-bold">
                                            <NumericFormat value={Math.abs(drawdownInfo.valor)} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Average Monthly Profit (Backtest)</p>
                                        <p className="text-green-600 font-bold">
                                            <NumericFormat value={mediaMensalEquity} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                                        </p>
                                    </div>
                                </div>
                                {(() => {
                                    const ddMaxAbs = Math.abs(drawdownInfo.valor);
                                    const capitalAgressivo = ddMaxAbs > 0 ? ddMaxAbs : 1; // Avoid division by zero if ddMaxAbs is 0
                                    const capitalModerado = capitalAgressivo * 2;
                                    const capitalConservador = capitalAgressivo * 5;
                                    const retornoAgressivo = mediaMensalEquity && capitalAgressivo ? (mediaMensalEquity / capitalAgressivo) * 100 : 0;
                                    const retornoModerado = mediaMensalEquity && capitalModerado ? (mediaMensalEquity / capitalModerado) * 100 : 0;
                                    const retornoConservador = mediaMensalEquity && capitalConservador ? (mediaMensalEquity / capitalConservador) * 100 : 0;

                                    return (
                                        <div className="space-y-4 text-sm">
                                            <div>
                                                <p className="font-medium text-purple-900">
                                                    <NumericFormat value={capitalAgressivo} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> - Suggested Capital • Aggressive Profile
                                                </p>
                                                <div className="h-2 bg-purple-900 rounded-full w-full mb-1 mt-1"></div>
                                                <p className="text-right text-gray-500 text-xs">
                                                    Estimated Average Monthly Return: <NumericFormat value={retornoAgressivo} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-purple-700">
                                                    <NumericFormat value={capitalModerado} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> - Suggested Capital • Moderate Profile
                                                </p>
                                                <div className="h-2 bg-purple-700 rounded-full w-3/4 mb-1 mt-1"></div>
                                                <p className="text-right text-gray-500 text-xs">
                                                    Estimated Average Monthly Return: <NumericFormat value={retornoModerado} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-purple-500">
                                                    <NumericFormat value={capitalConservador} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />- Suggested Capital • Conservative Profile
                                                </p>
                                                <div className="h-2 bg-purple-500 rounded-full w-1/2 mb-1 mt-1"></div>
                                                <p className="text-right text-gray-500 text-xs">
                                                    Estimated Average Monthly Return: <NumericFormat value={retornoConservador} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-3">* The suggested capital is an estimate based on the maximum drawdown from the backtest. Past performance does not guarantee future performance. Invest wisely.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Correlation Strategies Popup */}

                    {showCorrelationPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-2 sm:p-4">
                            <div className="bg-white p-4 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                                    <h2 className="text-lg md:text-xl font-bold text-gray-800">Correlation of Strategies</h2>
                                    <button
                                        onClick={() => setShowCorrelationPopup(false)}
                                        className="text-gray-400 hover:text-gray-700 text-2xl leading-none p-1"
                                        aria-label="Fechar popup de correlação"
                                    >
                                        &times;
                                    </button>
                                </div>

                                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                    <span className="font-semibold">Caption:</span>
                                    <span className="flex items-center"><span className="inline-block w-3 h-3 rounded-full mr-1.5 bg-red-500"></span>High</span>
                                    <span className="flex items-center"><span className="inline-block w-3 h-3 rounded-full mr-1.5 bg-gray-400"></span>Low</span>
                                    <span className="flex items-center"><span className="inline-block w-3 h-3 rounded-full mr-1.5 bg-gray-700"></span>No Correlation</span>
                                </div>

                                {loadingCorrelations && <div className="text-center py-10 text-gray-700">Calculating correlations...</div>}
                                {correlationError && <div className="text-center py-10 text-red-600">{correlationError}</div>}

                                {!loadingCorrelations && !correlationError && correlationMatrix && correlationStrategyNames.length > 0 && (
                                    <div className="overflow-auto flex-grow custom-scrollbar">
                                        <table className="min-w-full text-xs md:text-sm border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="p-2 border border-gray-300 bg-gray-100 sticky top-0 left-0 z-20 min-w-[100px] text-left text-gray-600 font-semibold"></th>
                                                    {correlationStrategyNames.map(name => (
                                                        <th key={name} className="p-1 md:p-2 border border-gray-300 bg-gray-100 sticky top-0 z-10 text-gray-600 font-semibold align-bottom h-32 md:h-auto">
                                                            {/* Lógica para texto vertical em mobile */}
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
                                                        <td className="p-2 border border-gray-300 bg-gray-100 sticky left-0 z-10 font-semibold text-gray-600 whitespace-nowrap min-w-[100px] text-left">
                                                            {shortenName(rowName, 15)}
                                                        </td>
                                                        {correlationStrategyNames.map((colName, colIndex) => (
                                                            <td
                                                                key={`${rowName}-${colName}`}
                                                                className={`p-2 border border-gray-300 text-center font-bold ${getCorrelationCellStyle(correlationMatrix[rowIndex]?.[colIndex])}`}
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

                                <div className="mt-auto pt-4 flex justify-end border-t border-gray-200">
                                    <button
                                        onClick={() => setShowCorrelationPopup(false)}
                                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm"
                                    >
                                        To close
                                    </button>
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