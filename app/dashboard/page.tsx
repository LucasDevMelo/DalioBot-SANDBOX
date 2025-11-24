'use client';

// Todos os seus imports permanecem aqui
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NumericFormat } from 'react-number-format';
import { getDatabase, ref, get } from 'firebase/database'
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

// Componente COMPLETO para a Tabela de Performance Mensal (versão interativa)

const MonthlyPerformanceTable = ({
  data,
  onMonthClick
}: {
  data: { [year: number]: { [month: number]: number } };
  onMonthClick: (year: number, month: number) => void; // Prop para lidar com o clique
}) => {
  const years = Object.keys(data).map(Number).sort((a, b) => b - a); // Anos em ordem decrescente
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (years.length === 0) {
    return null; // Não renderiza nada se não houver dados
  }

  return (
    <Card className="md:col-span-3 bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Monthly Results</CardTitle>
      </CardHeader>
      <CardContent>

        {/* ================================================================ */}
        {/* VISTA PARA DESKTOP (tabela) - Visível a partir de 'md' (768px) */}
        {/* ================================================================ */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <div>
              {/* Cabeçalho com os meses */}
              <div className="grid grid-cols-[60px_repeat(12,minmax(80px,1fr))] gap-1 text-center font-bold text-sm mb-2 text-gray-400">
                <div>Year</div>
                {shortMonths.map(month => <div key={month}>{month}</div>)}
              </div>

              {/* Linhas com os resultados */}
              <div className="space-y-1">
                {years.map(year => (
                  <div key={year} className="grid grid-cols-[60px_repeat(12,minmax(80px,1fr))] gap-1 text-center text-xs items-center">
                    <div className="font-bold text-gray-200">{year}</div>
                    {shortMonths.map((_, monthIndex) => {
                      const value = data[year]?.[monthIndex];
                      const hasValue = typeof value === 'number';

                      const cellColor = hasValue
                        ? (value >= 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600')
                        : 'bg-slate-700 cursor-not-allowed'; // Cinza alterado

                      return (
                        <button
                          key={monthIndex}
                          className={`p-3 rounded text-white transition-colors duration-200 ${cellColor}`}
                          onClick={() => hasValue && onMonthClick(year, monthIndex)}
                          disabled={!hasValue}
                        >
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
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* VISTA PARA MOBILE (lista) - Visível até 'md' (768px)        */}
        {/* ================================================================ */}
        <div className="md:hidden">
          {years.map(year => (
            <div key={year} className="mb-4">
              <h4 className="text-center font-bold text-lg p-2 bg-slate-700 text-white rounded-md mb-2">{year}</h4>
              <div className="space-y-1">
                {months.map((month, monthIndex) => {
                  const value = data[year]?.[monthIndex];
                  if (typeof value !== 'number') return null;

                  const textColor = value >= 0 ? 'text-green-500' : 'text-red-500';

                  return (
                    <button
                      key={monthIndex}
                      className="flex justify-between items-center p-2 border-b border-slate-700 w-full text-left hover:bg-slate-700/50 transition-colors"
                      onClick={() => onMonthClick(year, monthIndex)}
                    >
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
                    </button>
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

interface DailyPerformanceTableProps {
  data: { [day: number]: number };
  year: number;
  month: number;
  onClose: () => void;
}

const DailyPerformanceTable = ({ data, year, month, onClose }: DailyPerformanceTableProps) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[month];

  // Pega os dias e os ordena numericamente
  const sortedDays = Object.keys(data).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Daily Results: {monthName} {year}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Cabeçalho da Tabela */}
        <div className="flex justify-between font-bold text-sm text-gray-400 border-b border-slate-700 pb-2 mb-2">
          <span>Day</span>
          <span>Result</span>
        </div>

        {/* Corpo da Tabela (com scroll) */}
        <div className="overflow-y-auto">
          {sortedDays.length > 0 ? (
            <div className="space-y-1">
              {sortedDays.map(day => {
                const value = data[day];
                const textColor = value >= 0 ? 'text-green-500' : 'text-red-500';

                return (
                  <div key={day} className="flex justify-between items-center p-2 border-b border-slate-700 text-sm">
                    <span className="text-gray-300">{String(day).padStart(2, '0')}/{String(month + 1).padStart(2, '0')}/{year}</span>
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
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No daily data available for this month.</p>
          )}
        </div>
      </div>
    </div>
  );
};

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

function DashboardContent() {
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;

  const searchParams = useSearchParams();
  const roboNome = searchParams.get('id');
  const origem = searchParams.get('origem');

  const { user } = useAuth();
  const router = useRouter();


  const [monthlyPerformanceData, setMonthlyPerformanceData] = useState<{ [year: number]: { [month: number]: number } }>({});
  const [isDailyViewOpen, setIsDailyViewOpen] = useState(false);
  const [selectedDateForDailyView, setSelectedDateForDailyView] = useState<{ year: number; month: number } | null>(null);

  // NOVOS ESTADOS PARA O GRÁFICO EXPANSÍVEL E DRAWDOWN
  const [showLucroCurvePopup, setShowLucroCurvePopup] = useState(false);
  const [showDrawdownVisible, setShowDrawdownVisible] = useState(false);

  // Todos os seus estados, useEffects, useMemos, e funções de cálculo permanecem aqui
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [csvData, setCsvData] = useState<CsvData[]>([]);
  const [nomeRoboDisplay, setNomeRoboDisplay] = useState(''); // <--- ADICIONE ISSO
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('resultados');
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
  const [showMonteCarloPopup, setShowMonteCarloPopup] = useState(false);
  const [showStatsPopup, setShowStatsPopup] = useState(false);
  const [showRiskPopup, setShowRiskPopup] = useState(false);
  const [showDrawdownPopup, setShowDrawdownPopup] = useState(false);

  const [showDistribuicaoPopupDiario, setShowDistribuicaoPopupDiario] = useState(false);
  const [distributionGranularity, setDistributionGranularity] = useState<'diario' | 'mensal' | 'anual'>('diario');

  // Constantes de Estilo para Gráficos
  const chartTextFill = "#94a3b8"; // slate-400
  const chartGridStroke = "#334155"; // slate-700
  const chartTooltipWrapperStyle: React.CSSProperties = {
    backgroundColor: '#1e293b', // slate-800
    border: '1px solid #334155', // slate-700
    borderRadius: '8px',
    color: '#e2e8f0', // slate-200
  };
  const chartTooltipContentStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    border: 'none',
  };

  const formatarMesAno = useCallback((data: Date | string) => {
    const dateObj = typeof data === 'string' ? new Date(data) : data;
    if (!dateObj || isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, []);

  const calcularMetricasDependentes = useCallback(() => {
    if (csvData.length === 0) {
      // Zera métricas se não há dados, mas mantém o saldoInicial do usuário
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

    const saldoInicialParaCalculo = saldoInicial > 0 ? saldoInicial : (csvData[0]?.EQUITY || 1); // Evita 0 para divisão
    const equityInicialDaEstrategia = csvData[0]?.EQUITY || 0;
    const equityFinalDaEstrategia = csvData[csvData.length - 1]?.EQUITY || 0;

    if (equityInicialDaEstrategia <= 0 && saldoInicial <= 0) { // Apenas zera se AMBOS forem problemáticos
      // Zera métricas... (como acima)
      return;
    }

    const primeiraData = new Date(csvData[0].DATE);
    const ultimaData = new Date(csvData[csvData.length - 1].DATE);
    const diffEmMs = ultimaData.getTime() - primeiraData.getTime();
    const diffEmDias = diffEmMs / (1000 * 60 * 60 * 24);
    const anos = diffEmDias > 0 ? diffEmDias / 365 : 0;

    let cagrCalculado = 0;
    if (anos > 0 && equityInicialDaEstrategia > 0 && equityFinalDaEstrategia >= 0) { // Permite equity final 0
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

    const maxDDPercentual = drawdownsPercentuaisCalculados.length > 0
      ? Math.max(...drawdownsPercentuaisCalculados)
      : 0;

    // 1. CÁLCULO DO RISCO (DRAWDOWN)
    // Pegamos o pior drawdown histórico (ex: -0.25). Convertemos para positivo (0.25).
    const piorDD = drawdownsPercentuaisCalculados.length > 0
      ? Math.min(...drawdownsPercentuaisCalculados)
      : 0;
    const maxDDAbsoluto = Math.abs(piorDD);

    // 2. SUB-SCORE DE RETORNO (Peso 35%)
    // Meta ajustada: 50% de CAGR anual já garante nota 10 (antes era 60%).
    // Ex: CAGR 0.25 (25%) -> Nota 5.0
    const notaRetorno = Math.min(10, Math.max(0, (cagrCalculado * 100) / 5));

    // 3. SUB-SCORE DE RISCO (Peso 45%) - Ajustado para ser menos punitivo
    // Antes multiplicava por 33 (30% DD zerava a nota).
    // Agora multiplica por 20 (50% DD zera a nota).
    // Ex: Drawdown de 20% (0.20) -> 10 - (0.20 * 20) = 10 - 4 = Nota 6.0 (Razoável)
    // Ex: Drawdown de 10% (0.10) -> 10 - (0.10 * 20) = 10 - 2 = Nota 8.0 (Bom)
    const notaRisco = Math.max(0, 10 - (maxDDAbsoluto * 20));

    // 4. SUB-SCORE DE ESTABILIDADE (Peso 20%) - Sharpe Simplificado
    // Aumentamos o multiplicador de 66 para 100 para valorizar mais curvas estáveis.
    // Sharpe diário de 0.1 (excelente) agora dá nota 10.
    const sharpeDiario = dpRetornosDiarios > 0 ? (mediaRetornosDiarios / dpRetornosDiarios) : 0;
    const notaEstabilidade = Math.min(10, Math.max(0, sharpeDiario * 100));

    // 5. CÁLCULO FINAL PONDERADO
    // Pesos ajustados: 35% Retorno | 45% Risco | 20% Estabilidade
    // Damos leve prioridade ao risco (Dalio style), mas sem destruir a nota.
    const scoreFinal = (notaRetorno * 0.35) + (notaRisco * 0.45) + (notaEstabilidade * 0.20);

    // Garante que fique entre 0 e 10
    setDaliobotScore(Math.min(10, Math.max(0, Number(scoreFinal.toFixed(2)))));

    // Fator de Dalio (Informativo)
    const fatorCalculado = mediaRetornosDiarios / (dpRetornosDiarios || 1e-9);
    setDaliobotFactor(Number(fatorCalculado.toFixed(2)));

    

  }, [csvData, saldoInicial]);

  const dailyPerformanceData = useMemo(() => {
    if (csvData.length < 2) return {};

    // 1. Encontrar o último equity de cada dia
    const dailyLastEquity = new Map<string, number>();
    csvData.forEach(row => {
      // Usa a data completa para encontrar o último registro, mas armazena pela chave YYYY-MM-DD
      const dateKey = row.DATE.split('T')[0]; // Pega "AAAA-MM-DD"
      dailyLastEquity.set(dateKey, row.EQUITY);
    });

    // 2. Ordenar os dias
    const sortedDays = Array.from(dailyLastEquity.keys()).sort();

    // 3. Calcular a variação diária
    const dailyEquityVariation: { [year: number]: { [month: number]: { [day: number]: number } } } = {};

    for (let i = 1; i < sortedDays.length; i++) {
      const currentDayKey = sortedDays[i];
      const prevDayKey = sortedDays[i - 1];

      const currentEquity = dailyLastEquity.get(currentDayKey)!;
      const prevEquity = dailyLastEquity.get(prevDayKey)!;

      const variation = currentEquity - prevEquity;

      // Adiciona +1 ao mês porque new Date() com "AAAA-MM-DD" trata como UTC
      // e pode causar problemas de fuso. new Date(year, month, day) é mais seguro
      const [yearStr, monthStr, dayStr] = currentDayKey.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr) - 1; // Mês no JS é 0-11
      const day = Number(dayStr);

      if (!dailyEquityVariation[year]) dailyEquityVariation[year] = {};
      if (!dailyEquityVariation[year][month]) dailyEquityVariation[year][month] = {};

      dailyEquityVariation[year][month][day] = variation;
    }

    return dailyEquityVariation;
  }, [csvData]);


  useEffect(() => {
    // Chamado quando csvData ou saldoInicial mudam E calcularMetricasDependentes (a função em si) é estável
    if (csvData.length > 0) { // Evita calcular com dados vazios na montagem inicial se saldoInicial já estiver definido
      calcularMetricasDependentes();
    }
  }, [csvData, saldoInicial, calcularMetricasDependentes]);


  useEffect(() => {
    const fetchRoboData = async () => {
      setCarregandoDados(true);
      try {
        const db = getDatabase();
        const roboRef = ref(db, `estrategias/${user.uid}/${roboNome}`);
        const snapshot = await get(roboRef);

        if (snapshot.exists()) {
          const data = snapshot.val();

          // --- 1. SET MÉTRICAS DESCRITIVAS ---
          setNomeRoboDisplay(data.nome || '');
          setDescricao(data.descricao || '');
          setMercado(data.mercado || '');
          setAtivo(data.ativo || '');

          // --- 2. SET MÉTRICAS PRÉ-CALCULADAS DO HTML (QUANDO EXISTIREM) ---
          // Isso evita recálculos desnecessários
          if (data.fatorLucro) setFatorLucro(data.fatorLucro);
          if (data.taxaAcerto) setTaxaAcerto(data.taxaAcerto);
          if (data.fatorRecuperacao) setFatorRecuperacao(data.fatorRecuperacao);
          if (data.payoff) setPayoff(data.payoff);
          if (data.avgGain) setAvgGain(data.avgGain);
          if (data.avgLoss) setAvgLoss(data.avgLoss); // Já deve vir positivo

          // --- 3. PROCESSAR DADOSCSV (ESSENCIAL PARA GRÁFICOS) ---
          if (data.dadosCSV) {
            const parsedData = Object.values(data.dadosCSV);

            let invalidDateCount = 0;
            const normalizados: CsvData[] = parsedData
              .map((row: any, index: number) => {
                const dateStr = String(row['<DATE>'] || '').trim();

                // Ignora cabeçalhos ou linhas sem data válida
                if (!dateStr || dateStr.toLowerCase().includes('horário') || dateStr.toLowerCase().includes('date')) {
                  return null;
                }
                // ==========================================================
                // >> CORREÇÃO ROBUSTA DE DATA (v3) <<
                // 1. Substitui todos os pontos ('.') por hífens ('-').
                //    "2020.07.01 00:00" -> "2020-07-01 00:00"
                // 2. Substitui o primeiro espaço (' ') por 'T'.
                //    "2020-07-01 00:00" -> "2020-07-01T00:00"
                //    "2025-01-01 00:00:00" -> "2025-01-01T00:00:00"
                // Ambos os formatos viram um ISO 8601 válido.
                const parsableDateStr = dateStr.replace(/\./g, '-').replace(' ', 'T');
                // ==========================================================

                const dateObj = new Date(parsableDateStr); // ex: new Date("2025-01-01T00:00:00")

                if (isNaN(dateObj.getTime())) {
                  console.warn(`[AVISO] Linha ${index + 1} do CSV ignorada por data inválida: "${dateStr}" (convertida para: "${parsableDateStr}")`);
                  invalidDateCount++;
                  return null;
                }

                return {
                  DATE: parsableDateStr, // Armazena o formato corrigido "AAAA-MM-DDTHH:MM:SS"
                  BALANCE: parseFloat(String(row['<BALANCE>']).replace(',', '.') || '0'),
                  EQUITY: parseFloat(String(row['<EQUITY>']).replace(',', '.') || '0'),
                  'DEPOSIT LOAD': parseFloat(String(row['<DEPOSIT LOAD>']).replace(',', '.') || '0'),
                };
              })
              .filter((row): row is CsvData => row !== null) // Remove as linhas que falharam na validação
              .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

            if (invalidDateCount > 0) {
              console.error(`[AVISO] ${invalidDateCount} linha(s) foram ignoradas por conter(em) data(s) em formato irreconhecível.`);
            }

            setCsvData(normalizados);

            // --- 4. CÁLCULOS AINDA NECESSÁRIOS (BASEADOS NO CSV) ---
            if (normalizados.length > 0) {

              // --- Define o Saldo Inicial ---
              // 1º Prioridade: O 'depositoInicial' salvo do HTML
              // 2º Prioridade: O primeiro 'EQUITY' do CSV
              setSaldoInicial(currentSaldo => {
                if (data.depositoInicial && data.depositoInicial > 0) {
                  return data.depositoInicial;
                }
                if (currentSaldo === 0 && normalizados[0]?.EQUITY > 0) {
                  return normalizados[0].EQUITY;
                }
                return currentSaldo; // Mantém o que o usuário digitou, se nada for encontrado
              });

              // --- Métricas que DEPENDEM do CSV (curva de capital, diário, mensal) ---
              const eqInicial = normalizados[0].EQUITY;
              const eqFinal = normalizados[normalizados.length - 1].EQUITY;
              // Se 'saldoTotal' (lucro líquido) veio do HTML, usamos ele. Senão, calculamos.
              setLucroTotalEquity(data.saldoTotal ? data.saldoTotal : eqFinal - eqInicial);

              const primeiraDataCsv = new Date(normalizados[0].DATE);
              const ultimaDataCsv = new Date(normalizados[normalizados.length - 1].DATE);
              const mesesNoPeriodo = Math.max(1, (ultimaDataCsv.getFullYear() - primeiraDataCsv.getFullYear()) * 12 + (ultimaDataCsv.getMonth() - primeiraDataCsv.getMonth()) + 1);
              setMediaMensalEquity((data.saldoTotal ? data.saldoTotal : eqFinal - eqInicial) / mesesNoPeriodo);

              // --- Métricas Diárias (Dias Pos/Neg, Maior Ganho/Perda Diária) ---
              // Agrupa pelo último equity/balance do dia
              const equityPorData = new Map<string, number>();
              normalizados.forEach((row) => {
                const dataFormatada = new Date(row.DATE).toISOString().split('T')[0];
                equityPorData.set(dataFormatada, row.EQUITY);
              });

              const lucroDiarioArray: { data: string, valor: number }[] = [];
              const datasUnicasOrdenadas = Array.from(equityPorData.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

              let maiorPerdaDiaria = { valor: 0, data: normalizados.length > 0 ? normalizados[0].DATE : '' };
              let mGD = { valor: -Infinity, data: '' };

              for (let i = 1; i < datasUnicasOrdenadas.length; i++) {
                const dataAtual = datasUnicasOrdenadas[i];
                const dataAnterior = datasUnicasOrdenadas[i - 1];
                const lucroDia = (equityPorData.get(dataAtual) ?? 0) - (equityPorData.get(dataAnterior) ?? 0);
                lucroDiarioArray.push({ data: dataAtual, valor: lucroDia });

                // Atualiza Maior Perda Diária
                if (lucroDia < maiorPerdaDiaria.valor) {
                  maiorPerdaDiaria = { valor: lucroDia, data: dataAtual };
                }
                // Atualiza Maior Ganho Diário
                if (lucroDia > mGD.valor) {
                  mGD = { valor: lucroDia, data: dataAtual };
                }
              }

              const diasPos = lucroDiarioArray.filter(dia => dia.valor > 0).length;
              const diasNeg = lucroDiarioArray.filter(dia => dia.valor < 0).length;
              setDiasPositivos(diasPos);
              setDiasNegativos(diasNeg);
              setMaiorGainDiario(mGD.valor > -Infinity && mGD.data !== '' ? mGD : null);

              // --- Cálculo do Drawdown (híbrido) ---
              let maiorDDValorCalculado = 0; // DD do Balance (calculado)
              let ddInicio = normalizados.length > 0 ? normalizados[0].DATE : '';
              let ddFim = normalizados.length > 0 ? normalizados[0].DATE : '';
              let picoEquity = normalizados.length > 0 ? normalizados[0].EQUITY : 0;
              let inicioPicoTemp = normalizados.length > 0 ? normalizados[0].DATE : '';

              for (let i = 0; i < normalizados.length; i++) {
                const atual = normalizados[i];
                if (atual.EQUITY > picoEquity) {
                  picoEquity = atual.EQUITY;
                  inicioPicoTemp = atual.DATE;
                }
                const drawdownAtual = atual.EQUITY - picoEquity;
                if (drawdownAtual < maiorDDValorCalculado) {
                  maiorDDValorCalculado = drawdownAtual;
                  ddInicio = inicioPicoTemp;
                  ddFim = atual.DATE;
                }
              }

              // Define o DrawdownInfo:
              // Usa o 'valor' do HTML (Equity DD) se existir, senão usa o DD de Balance calculado
              // Usa as 'datas' e 'maiorLoss' calculadas do CSV (Balance)
              setDrawdownInfo({
                // Mantemos a lógica do Drawdown como você preferir (ou pode mudar para calculado também se quiser)
                valor: data.drawdown ? -Math.abs(data.drawdown) : maiorDDValorCalculado,
                inicio: ddInicio,
                fim: ddFim,

                // --- ALTERAÇÃO AQUI ---
                // Antes estava: data.maiorLoss ? { valor: data.maiorLoss, data: '' } : maiorPerdaDiaria
                // Agora fica apenas:
                maiorLoss: maiorPerdaDiaria
              });

              // Se a taxaAcerto não veio do HTML (baseada em trades), calcula baseada em dias
              if (!data.taxaAcerto) {
                setTaxaAcerto((diasPos + diasNeg) > 0 ? (diasPos / (diasPos + diasNeg)) * 100 : 0);
              }

              // --- Métricas Anuais e Mensais (para gráficos) ---
              const lucroPorAnoMap: Record<string, number> = {};
              lucroDiarioArray.forEach(dia => {
                const ano = new Date(dia.data).getFullYear().toString();
                lucroPorAnoMap[ano] = (lucroPorAnoMap[ano] || 0) + dia.valor;
              });
              setLucroAno(Object.entries(lucroPorAnoMap).map(([ano, lucro]) => ({ ano, lucro: parseFloat(lucro.toFixed(2)) })));

              const lucroMensalMapDetalhado = new Map<string, { acumulado: number, dataObj: Date }>();

              // Agrupa lucros por mês
              lucroDiarioArray.forEach(dia => {
                const data = new Date(dia.data);
                const key = `${data.getFullYear()}-${data.getMonth()}`;
                const diferenca = dia.valor;

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

              // --- Cálculo de Estagnação (baseado no CSV) ---
              let picoAnteriorEstagnacao = normalizados.length > 0 ? normalizados[0].EQUITY : 0;
              let diasEstagnado = 0;
              let inicioEstagnadoTemp = normalizados.length > 0 ? normalizados[0].DATE : '';
              let maiorEstagnacaoDias = 0;
              let dataInicioEstFinal = normalizados.length > 0 ? normalizados[0].DATE : '';
              let dataFimEstFinal = normalizados.length > 0 ? normalizados[0].DATE : '';

              for (let i = 1; i < normalizados.length; i++) {
                const atual = normalizados[i];
                if (atual.EQUITY > picoAnteriorEstagnacao) {
                  picoAnteriorEstagnacao = atual.EQUITY;
                  if (diasEstagnado > 0) {
                    if (diasEstagnado > maiorEstagnacaoDias) {
                      maiorEstagnacaoDias = diasEstagnado;
                      dataInicioEstFinal = inicioEstagnadoTemp;
                      dataFimEstFinal = normalizados[i - 1].DATE;
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
                dataFimEstFinal = normalizados[normalizados.length - 1].DATE;
              }
              if (dataInicioEstFinal && dataFimEstFinal) {
                setEstagnacaoInfo({
                  dias: Math.floor(maiorEstagnacaoDias),
                  inicio: dataInicioEstFinal,
                  fim: dataFimEstFinal,
                });
              }
            }
          } else {
            setCsvData([]);
          }
        } else {
          setCsvData([]);
        }
      } catch (error) {
        console.error('[ERRO FATAL] Ocorreu um erro inesperado no bloco try/catch:', error);
        setCsvData([]);
      } finally {
        setCarregandoDados(false);
      }
    };

    if (user && roboNome) {
      fetchRoboData();
    } else if (user && !roboNome) {
      setCarregandoDados(false);
      setCsvData([]);
    }
  }, [user, roboNome]); // Dependência única, o resto é calculado em cadeia

  const profitChartData = useMemo(() => {
    // Retorna um array vazio se não houver dados para evitar erros
    if (!csvData || csvData.length === 0) {
      return [];
    }

    // Pega o valor inicial do equity do primeiro registro
    const initialEquity = csvData[0].EQUITY;
    let maxEquity = csvData[0].EQUITY;

    // Mapeia os dados originais para um novo formato, calculando o lucro e o Drawdown para o gráfico combinado
    return csvData.map(item => {
      maxEquity = Math.max(maxEquity, item.EQUITY);
      const drawdownValue = item.EQUITY - maxEquity;
      const ddPercent = maxEquity !== 0 ? (drawdownValue / maxEquity) * 100 : 0;

      return {
        ...item, // Mantém todos os dados originais do item
        profit: item.EQUITY - initialEquity, // Adiciona a nova chave 'profit'
        DD: ddPercent, // Adiciona Drawdown percentual para o gráfico
        timestamp: new Date(item.DATE).getTime() // Adiciona timestamp para eixo numérico
      };
    });
  }, [csvData]); // Este hook será executado sempre que 'csvData' mudar

  const drawdownSeries = useMemo(() => {
    if (csvData.length === 0) return [];
    let pico = csvData[0].EQUITY;
    return csvData.map(row => {
      pico = Math.max(pico, row.EQUITY);
      return {
        DATE: row.DATE,
        DD: row.EQUITY - pico, // Este é o Drawdown de *Balance* (Valor)
      };
    });
  }, [csvData]);

  // ▼▼▼ HOOKS USEMEMO PARA GRÁFICOS AVANÇADOS (NÃO PRECISAM MUDAR) ▼▼▼

  const advancedDistributionData = useMemo(() => {
    try {
      if (!csvData || csvData.length < 2) return [];

      // Usa o 'dailyPerformanceData' já calculado que é { ano: { mes: { dia: valor } } }
      let results: number[] = [];
      const granularity = distributionGranularity;

      const dailyResults: number[] = Object.values(dailyPerformanceData)
        .flatMap(months => Object.values(months))
        .flatMap(days => Object.values(days))
        .filter(isFinite);

      if (granularity === 'diario') {
        results = dailyResults;
      } else {
        const resultsByPeriod = new Map<string, number>();
        Object.entries(dailyPerformanceData).forEach(([year, months]) => {
          const yearKey = year;
          Object.entries(months).forEach(([month, days]) => {
            const monthKey = `${year}-${String(Number(month) + 1).padStart(2, '0')}`;

            Object.entries(days).forEach(([day, value]) => {
              if (!isFinite(value)) return;

              if (granularity === 'mensal') {
                resultsByPeriod.set(monthKey, (resultsByPeriod.get(monthKey) || 0) + value);
              } else if (granularity === 'anual') {
                resultsByPeriod.set(yearKey, (resultsByPeriod.get(yearKey) || 0) + value);
              }
            });
          });
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
  }, [dailyPerformanceData, distributionGranularity]); // Depende do 'dailyPerformanceData'

  const scatterPlotData = useMemo(() => {
    // Este gráfico plota o resultado de cada dia
    const results: { x: number, y: number }[] = [];
    Object.entries(dailyPerformanceData).forEach(([year, months]) => {
      Object.entries(months).forEach(([month, days]) => {
        Object.entries(days).forEach(([day, value]) => {
          if (isFinite(value)) {
            const timestamp = new Date(Number(year), Number(month), Number(day)).getTime();
            results.push({ x: timestamp, y: value });
          }
        });
      });
    });
    return results;
  }, [dailyPerformanceData]); // Depende do 'dailyPerformanceData'

  const monteCarloData = useMemo(() => {
    if (csvData.length < 2) return [];

    const simulations = 100;
    const steps = Math.min(60, csvData.length - 1); // csvData.length - 1 para dailyReturns
    const dailyReturns = csvData.slice(1).map((row, i) => {
      const prev = csvData[i].EQUITY;
      return prev !== 0 ? (row.EQUITY - prev) / prev : 0;
    }).filter(v => !isNaN(v) && isFinite(v));

    if (dailyReturns.length === 0) return [];

    const avg = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stddev = Math.sqrt(
      dailyReturns.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / dailyReturns.length
    );

    const getRandomColor = () => `rgb(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)})`;

    return Array.from({ length: simulations }, () => {
      const path = [{ step: 0, value: 1 }];
      let currentVal = 1;
      for (let i = 1; i < steps; i++) {
        const randomFactor = avg + stddev * (Math.random() * 2 - 1); // Simples, não normal
        currentVal *= (1 + randomFactor);
        path.push({ step: i, value: Math.max(0, currentVal) });
      }
      return { path, color: getRandomColor() };
    });
  }, [csvData]);

  // Lógica de loading e erro para o usuário
  if (!user && carregandoDados) return <div className="p-4 text-center text-gray-300">Loading authentication...</div>;
  if (!user && !carregandoDados) {
    // Idealmente redirecionar para login ou mostrar mensagem mais apropriada
    if (typeof window !== "undefined") router.push('/login');
    return <div className="p-4 text-center text-gray-300">User not authenticated. Redirecting...</div>;
  }
  if (carregandoDados && !roboNome) { // Se está carregando mas roboNome ainda não chegou (devido ao Suspense)
    return <div className="p-4 text-center text-gray-300">Analyzing URL...</div>;
  }
  if (carregandoDados) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="p-6 rounded-lg shadow-lg bg-slate-800 text-center border border-slate-700">
          <svg className="animate-spin h-10 w-10 text-purple-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold text-white">Carregando dados do robô...</p>
          <p className="text-sm text-gray-400">Por favor, aguarde um momento.</p>
        </div>
      </div>
    );
  }
  // O restante do seu JSX
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
              <CardTitle className="text-white">{nomeRoboDisplay || roboNome || "Dashboard"}</CardTitle>              <button
                onClick={() => setShowStatsPopup(true)}
                className="bg-purple-600 text-white px-2 py-1 text-xs rounded hover:bg-purple-700 mt-2 md:mt-0 sm:px-1 sm:py-1 sm:text-xxs shadow-[0_0_15px_theme(colors.purple.500/40)]"
              >
                Understand the Statistics
              </button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <p className="font-semibold text-gray-400">Description</p>
                <p className="text-gray-200">{descricao || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400">Market</p>
                <p className="text-gray-200">{mercado || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400">Asset</p>
                <p className="text-gray-200">{ativo || '-'}</p>
              </div>
              <div className="md:col-span-3 flex justify-end mt-4">
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
            <h1 className="text-2xl font-bold text-white">Robot Dashboard</h1>
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

          {/* CONTEÚDO DAS ABAS */}
          {csvData.length === 0 && !carregandoDados && (
            <div className="text-center text-gray-400 py-10">
              No data found for this robot ({roboNome || "ID not specified"}). Check the CSV file or the ID in the URL.
            </div>
          )}

          {csvData.length > 0 && (
            <>
              {/* CONTEÚDO DA ABA RESULTADOS */}
              {abaAtiva === 'resultados' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-800 border-slate-700"> {/* Lucro Total Equity */}
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
                  <Card className="bg-slate-800 border-slate-700"> {/* Fator de Lucro */}
                    <CardHeader> <CardTitle className="text-white text-base font-medium">Profit Factor</CardTitle> </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold mb-4 text-white">
                        <NumericFormat value={fatorLucro} displayType="text" decimalScale={2} fixedDecimalScale />
                      </p>
                      <div className="flex justify-between text-sm text-gray-400">
                        {/* 'taxaAcerto' agora vem do HTML (trades), não dias */}
                        <span className="text-gray-300">Hit Rate: <NumericFormat value={taxaAcerto} displayType="text" decimalScale={1} fixedDecimalScale suffix="%" /></span>
                        <span className="text-gray-300">Recovery Factor: <NumericFormat value={fatorRecuperacao} displayType="text" decimalScale={2} fixedDecimalScale /></span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700"> {/* Payoff */}
                    <CardHeader> <CardTitle className="text-white text-base font-medium">Payoff</CardTitle> </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-white">
                        {/* 'payoff' agora vem do HTML */}
                        <NumericFormat value={payoff} displayType="text" decimalScale={2} fixedDecimalScale />
                      </p>
                      <p className="text-sm text-green-400">
                        {/* 'avgGain' agora vem do HTML (média por trade) */}
                        <NumericFormat value={avgGain} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Average Profitable Trade
                      </p>
                      <p className="text-sm text-red-500">
                        {/* 'avgLoss' agora vem do HTML (média por trade) */}
                        <NumericFormat value={avgLoss} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> Average Losing Trade
                      </p>
                    </CardContent>
                  </Card>

                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Curva de Capital e Métricas Visuais Direita */}

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
                        {/* Wrapper para conter os gráficos */}
                        <div className="flex flex-col space-y-2">
                          <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={profitChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />

                                {/* VOLTAMOS PARA O XAXIS ANTIGO (Sem scale="time") */}
                                <XAxis
                                  dataKey="DATE"
                                  tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  tick={{ fontSize: 10, fill: chartTextFill }}
                                  interval="preserveStartEnd"
                                />

                                <YAxis
                                  yAxisId="profit"
                                  domain={['auto', 'auto']}
                                  tickFormatter={(value) => `$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                                  tick={{ fontSize: 12, fill: chartTextFill }}
                                />
                                <Tooltip
                                  formatter={(value: number, name: string) => {
                                    const label = name === "DD" ? "Drawdown (%)" : "Accumulated Profit (Equity)";
                                    const formattedValue = name === "DD"
                                      ? `${value.toFixed(2)}%`
                                      : `$ ${value.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`;
                                    return [formattedValue, label];
                                  }}
                                  labelFormatter={(label: string) =>
                                    new Date(label).toLocaleDateString("en-GB")
                                  }
                                  wrapperStyle={chartTooltipWrapperStyle}
                                  contentStyle={chartTooltipContentStyle}
                                />
                                {/* Linha do lucro acumulado igual ao antigo */}
                                <Line
                                  yAxisId="profit"
                                  type="monotone"
                                  dataKey="profit"
                                  stroke="#a855f7"
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* === GRÁFICO 2: Drawdown Opcional (Ajustado para acompanhar o estilo do gráfico de cima) === */}
                          {showDrawdownVisible && (
                            <div className="w-full h-[80px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={profitChartData}
                                  margin={{ top: 0, right: 30, left: 30, bottom: 20 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={chartGridStroke}
                                    vertical={false}
                                  />
                                  {/* XAxis ajustado para combinar com o gráfico principal */}
                                  <XAxis
                                    dataKey="DATE"
                                    tickFormatter={(dateStr) =>
                                      new Date(dateStr).toLocaleDateString("en-GB", {
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
                                      "Max. Drawdown (%)",
                                    ]}
                                    labelFormatter={(label: string) =>
                                      new Date(label).toLocaleDateString("en-GB")
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
                    <div className="flex flex-col space-y-4"> {/* Métricas visuais à direita */}
                      {drawdownInfo && (
                        <Card className="bg-slate-800 border-slate-700">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-medium text-white">Maximum Drawdown</CardTitle>
                            <button onClick={() => setShowDrawdownPopup(true)} className="text-xs text-purple-400 hover:underline">Details</button>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-red-500">
                              {/* Valor (Equity DD) vem do HTML, datas (Balance DD) vêm do cálculo */}
                              <NumericFormat value={drawdownInfo.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(drawdownInfo.inicio).toLocaleDateString('en-GB')} - {new Date(drawdownInfo.fim).toLocaleDateString('en-GB')}
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
                              {/* Este valor é calculado a partir do CSV (diário) */}
                              <NumericFormat value={drawdownInfo.maiorLoss.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                            </p>
                            <p className="text-xs text-gray-400">
                              {drawdownInfo.maiorLoss.data ? new Date(drawdownInfo.maiorLoss.data).toLocaleDateString('en-GB') : '-'}
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
                              {/* Este valor é calculado a partir do CSV (diário) */}
                              <NumericFormat value={maiorGainDiario.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                            </p>
                            <p className="text-xs text-gray-400">
                              {maiorGainDiario.data ? new Date(maiorGainDiario.data).toLocaleDateString('en-GB') : '-'}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                  <Card className="md:col-span-2 bg-slate-800 border-slate-700"> {/* Lucro Ano a Ano */}
                    <CardHeader> <CardTitle className="text-white text-base font-medium">Year-over-Year Profit</CardTitle> </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={lucroAno} barSize={50}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                          <XAxis dataKey="ano" tick={{ fontSize: 12, fill: chartTextFill }} />
                          <YAxis tickFormatter={(value) => `$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} tick={{ fontSize: 12, fill: chartTextFill }} />
                          <Tooltip formatter={(value: number) => `$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} wrapperStyle={chartTooltipWrapperStyle} contentStyle={chartTooltipContentStyle} />
                          <Bar dataKey="lucro">
                            {lucroAno.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.lucro < 0 ? '#EF4444' : '#22C55E'} />
                            ))}
                            <LabelList
                              dataKey="lucro"
                              position="top"
                              formatter={(value: number) => `$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              style={{ fontSize: 10, fill: '#e2e8f0' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="md:col-span-1 flex flex-col justify-between bg-slate-800 border-slate-700"> {/* Melhor e Pior Mês */}
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
                          {/* Estes são baseados em dias, calculados do CSV */}
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
                  <MonthlyPerformanceTable
                    data={monthlyPerformanceData}
                    onMonthClick={(year, month) => {
                      setSelectedDateForDailyView({ year, month });
                      setIsDailyViewOpen(true);
                    }}
                  />

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
                  {estagnacaoInfo && ( /* Maior Estagnação */
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
                          {estagnacaoInfo.inicio ? new Date(estagnacaoInfo.inicio).toLocaleDateString('en-GB') : '-'} to  {estagnacaoInfo.fim ? new Date(estagnacaoInfo.fim).toLocaleDateString('en-GB') : '-'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA ABA MÉTRICAS AVANÇADAS */}
              {abaAtiva === 'metricasAvancadas' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                  <Card className="flex items-center p-4 bg-slate-800 border-slate-700"> {/* CAGR */}
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
                  <Card className="flex items-center p-4 bg-slate-800 border-slate-700"> {/* Drawdown Médio */}
                    <img
                      src="/money.png"
                      alt="Ícone de gráfico de crescimento"
                      className="w-8 h-8 mr-3"
                    /><div>
                      <p className="text-gray-400 text-sm">Medium Drawdown</p>
                      <p className="text-2xl font-bold text-white">
                        <NumericFormat value={drawdownMedioPercentual} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                      </p>
                    </div>
                  </Card>
                  <Card className="flex items-center p-4 bg-slate-800 border-slate-700"> {/* Sample Error */}
                    <img
                      src="/bar-chart.png"
                      alt="Ícone de gráfico de crescimento"
                      className="w-8 h-8 mr-3"
                    /><div>
                      <p className="text-gray-400 text-sm">Sample Error (SD of Daily Returns)</p>
                      <p className="text-2xl font-bold text-white">
                        <NumericFormat value={sampleErrorPercentual} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                      </p>
                    </div>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700"> {/* Value at Risk */}
                    <CardHeader className="pb-2"> <CardTitle className="text-base font-medium text-white">Value at Risk (VaR 95%)</CardTitle> </CardHeader>
                    <CardContent>
                      <p className="text-red-500 text-xl font-bold">
                        <NumericFormat value={var95.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                        (<NumericFormat value={var95.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />)
                      </p>
                      <p className="text-gray-400 text-xs">(Maximum daily loss estimate with 95% confidence, based on the Starting Balance above)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700"> {/* Mediana Lucros Mensais */}
                    <CardHeader className="pb-2"> <CardTitle className="text-base font-medium text-white">Median Monthly Profits</CardTitle> </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold" style={{ color: medianaRetornosMensais.valor >= 0 ? '#22C55E' : '#EF4444' }}>
                        <NumericFormat value={medianaRetornosMensais.valor} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />
                        (<NumericFormat value={medianaRetornosMensais.porcentagem} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />)
                      </p>
                      <p className="text-gray-400 text-xs">(Median of absolute monthly profits. % in relation to the Opening Balance above)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700"> {/* Desvio Padrão */}
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
                    {/* A classe 'md:flex-row' foi removida e o alinhamento é sempre central */}
                    <CardContent className="flex flex-col items-center justify-center flex-grow gap-y-4">

                      {/* Medidor Circular */}
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

                      {/* Texto Descritivo (sempre centralizado) */}
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-white">
                          {origem === 'portfolio' ? 'Exclusive for Robots' :
                            daliobotScore === null ? 'Undefined' :
                              daliobotScore >= 8 ? 'Great' :
                                daliobotScore >= 6 ? 'Good' :
                                  daliobotScore >= 3 ? 'Ok' : 'Terrible'}
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


          {/* ▼▼▼ SEÇÃO DE POP-UPS (SEM ALTERAÇÕES) ▼▼▼ */}

          {/* Pop-up de Distribuição (Histograma Responsivo) */}
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
                            value: "Result Range($)",
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
                            value: `Frequency (${distributionGranularity === 'diario' ? 'Dias' : distributionGranularity === 'mensal' ? 'Meses' : 'Anos'})`,
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
                            return [`${value} ${period}`, `Range: ${props.payload.range}`];
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

          {/* Pop-up de Resultados Diários (Gráfico de Dispersão) */}
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
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                        label={{ value: "Data", position: 'insideBottom', offset: -5, fontSize: 12, fill: chartTextFill }}
                        tick={{ fill: chartTextFill, fontSize: 10 }}
                      />
                      <YAxis dataKey="y" domain={['auto', 'auto']}
                        tickFormatter={(value) => `$ ${value.toLocaleString('pt-BR')}`}
                        label={{ value: "Result of the Day ($)", angle: -90, position: 'insideLeft', fontSize: 12, dx: -10, fill: chartTextFill }}
                        tick={{ fill: chartTextFill, fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string, props) => [`$ ${Number(props.payload?.y).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Result"]}
                        labelFormatter={(label: any) => new Date(label).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                  <LineChart data={drawdownSeries}>
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
                  {/* Conteúdo do Popup de Estatísticas */}
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
                  const capitalAgressivo = ddMaxAbs > 0 ? ddMaxAbs : 1; // Evitar divisão por zero
                  const capitalModerado = capitalAgressivo * 2;
                  const capitalConservador = capitalAgressivo * 5;
                  const retornoAgressivo = mediaMensalEquity / capitalAgressivo * 100;
                  const retornoModerado = mediaMensalEquity / capitalModerado * 100;
                  const retornoConservador = mediaMensalEquity / capitalConservador * 100;

                  return (
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="font-medium text-purple-400">
                          <NumericFormat value={capitalAgressivo} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />- Suggested Capital • Aggressive Profile
                        </p>
                        <div className="h-2 bg-purple-600 rounded-full w-full mb-1 mt-1"></div>
                        <p className="text-right text-gray-400 text-xs">
                          Estimated Average Monthly Return: <NumericFormat value={retornoAgressivo} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-purple-400">
                          <NumericFormat value={capitalModerado} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale />- Suggested Capital • Moderate Profile
                        </p>
                        <div className="h-2 bg-purple-500 rounded-full w-3/4 mb-1 mt-1"></div>
                        <p className="text-right text-gray-400 text-xs">
                          Estimated Average Monthly Return:<NumericFormat value={retornoModerado} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-purple-400">
                          <NumericFormat value={capitalConservador} displayType="text" thousandSeparator="." decimalSeparator="," prefix="$ " decimalScale={2} fixedDecimalScale /> - Suggested Capital • Conservative Profile
                        </p>
                        <div className="h-2 bg-purple-400 rounded-full w-1/2 mb-1 mt-1"></div> {/* Ajustado para w-1/2 para melhor visualização */}
                        <p className="text-right text-gray-400 text-xs">
                          Estimated Average Monthly Return:<NumericFormat value={retornoConservador} displayType="text" decimalScale={2} fixedDecimalScale suffix="%" />
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">* The suggested capital is an estimate based on the maximum drawdown from the backtest. Past performance does not guarantee future performance. Invest wisely.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          {isDailyViewOpen && selectedDateForDailyView && (
            <DailyPerformanceTable
              data={dailyPerformanceData[selectedDateForDailyView.year]?.[selectedDateForDailyView.month] || {}}
              year={selectedDateForDailyView.year}
              month={selectedDateForDailyView.month}
              onClose={() => setIsDailyViewOpen(false)}
            />
          )}

          {/* NOVO POP-UP: Accumulated Profit Curve Expandido */}
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
                {/* CONTÊINER FLEX COM ALTURA FIXA PARA EMPILHAR OS GRÁFICOS */}
                <div className="w-full flex flex-col" style={{ height: '70vh' }}>

                  {/* GRÁFICO 1: LUCRO PRINCIPAL (75% da altura) */}
                  <div style={{ height: '75%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={profitChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />

                        {/* XAXIS ALTERADO: Categórico (igual ao dashboard) */}
                        <XAxis
                          dataKey="DATE"
                          tickFormatter={(dateStr) =>
                            new Date(dateStr).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            })
                          }
                          tick={{ fontSize: 10, fill: chartTextFill }}
                          interval="preserveStartEnd"
                        />

                        {/* Y-AXIS PARA LUCRO (Eixo principal à esquerda) */}
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
                            const label = name === 'DD' ? 'Max. Drawdown (%)' : 'Accumulated Profit (Equity)';
                            const formattedValue = name === "DD"
                              ? `${value.toFixed(2)}%`
                              : `$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            return [formattedValue, label];
                          }}
                          labelFormatter={(label: string) =>
                            new Date(label).toLocaleDateString('en-GB')
                          }
                          wrapperStyle={chartTooltipWrapperStyle}
                          contentStyle={chartTooltipContentStyle}
                        />
                        <Line
                          yAxisId="lucro"
                          type="monotone"
                          dataKey="profit"
                          stroke="#a855f7"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* GRÁFICO 2: DRAWDOWN (25% da altura, Alinhado) */}
                  <div style={{ height: '25%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={profitChartData} margin={{ top: 0, right: 30, left: 30, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />

                        {/* XAXIS ALTERADO: Categórico (igual ao de cima) */}
                        <XAxis
                          dataKey="DATE"
                          tickFormatter={(dateStr) =>
                            new Date(dateStr).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            })
                          }
                          tick={{ fontSize: 12, fill: chartTextFill }}
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
                          formatter={(value: number) => [`${value.toFixed(2)}%`, "Max. Drawdown (%)"]}
                          labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-GB')}
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

// Este é o componente de página que envolve DashboardContent com Suspense
export default function DashboardPageContainer() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="p-6 rounded-lg shadow-lg bg-slate-800 text-center border border-slate-700">
          <svg className="animate-spin h-10 w-10 text-purple-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold text-white">Carregando dados do dashboard...</p>
          <p className="text-sm text-gray-400">Por favor, aguarde um momento.</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}