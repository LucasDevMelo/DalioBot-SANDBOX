'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/authcontext';
import { getDatabase, ref as dbRef, set } from 'firebase/database';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { filesize } from 'filesize';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import React from 'react';
import Image from 'next/image';
import { FaTimes } from 'react-icons/fa';
import { CheckCircleIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

// Reusable Spinner Component
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full p-8">
        <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

// Interface para o formato de dadosCSV (baseado na sua imagem)
interface DadosCsvItem {
    "<DATE>": string;
    "<BALANCE>": string;
    "<EQUITY>": string;
    "<DEPOSIT LOAD>": string;
}

// Interface para as métricas extraídas do HTML (EXPANDIDA)
interface MetricasBacktest {
    saldoTotal: number;          // Lucro Líquido Total
    fatorLucro: number;          // Fator de Lucro
    drawdown: number;            // Rebaixamento Máximo do Capital Líquido (valor)
    historicoInicio: string;     // Período (início)
    historicoFim: string;        // Período (fim)
    
    // Novas métricas extraídas
    depositoInicial: number;     // Depósito Inicial
    totalNegociacoes: number;    // Total de Negociações
    negociacoesLucro: number;    // Negociações com Lucro (contagem)
    negociacoesPerda: number;    // Negociações com Perda (contagem)
    taxaAcerto: number;          // Negociações com Lucro (% of total) - a porcentagem
    fatorRecuperacao: number;    // Fator de Recuperação
    payoff: number;              // Retorno Esperado (Payoff)
    avgGain: number;             // Média lucro da negociação
    avgLoss: number;             // Média perda na Negociação (salvo como valor positivo)
    maiorGain: number;           // Maior lucro da negociação
    maiorLoss: number;           // Maior perda na Negociação (salvo como valor negativo)
    
    dadosCSV: DadosCsvItem[]; // Agora preenchido com dados das Transações
}

// --- FUNÇÕES HELPER PARA PARSE ---

// Função para parsear números (ex: "5 000.00" ou "1.94" ou "-90.00")
const parseMetric = (str: string): number => {
    if (!str) return 0;
    // Remove todos os espaços, troca vírgula por ponto
    const cleaned = str.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned);
};

// Função para formatar números de volta para o formato string "5000.00"
const formatMetricString = (num: number): string => {
    return num.toFixed(2);
};

// Função para parsear contagem e porcentagem, ex: "65 (60.19%)"
const parseCountPercent = (str: string): { count: number, percent: number } => {
    if (!str) return { count: 0, percent: 0 };
    const match = str.match(/(\d+)\s*\(([\d\.,]+)%\)/);
    if (match && match[1] && match[2]) {
        return {
            count: parseInt(match[1], 10),
            percent: parseMetric(match[2])
        };
    }
    // Fallback se for só um número (ex: "108")
    const countOnly = parseInt(str, 10);
    if (!isNaN(countOnly)) {
         return { count: countOnly, percent: 0 };
    }
    return { count: 0, percent: 0 };
};

// Função para parsear valor de drawdown, ex: "482.20 (7.58%)"
const parseDrawdownValue = (str: string): number => {
     if (!str) return 0;
     const match = str.match(/([\d\s,\.]+) \(/);
     if (match && match[1]) {
         return parseMetric(match[1]);
     }
     return parseMetric(str); // Fallback
};


// Main component for the add strategy page
function AdicionarEstrategiaContent() {
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [arquivo, setArquivo] = useState<File | null>(null);
    const [nome, setNome] = useState('');
    const [mercado, setMercado] = useState('');
    const [ativo, setAtivo] = useState('');
    const [tipo, setTipo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isCsvHelpModalOpen, setIsCsvHelpModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { user } = useAuth();
    const router = useRouter();

    const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
        const file = acceptedFiles[0];
        if (file && (file.type === 'text/html' || file.name.endsWith('.html'))) {
            setArquivo(file);
            setError(null);
        } else {
            setError("Por favor, envie um arquivo .html válido.");
            setArquivo(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/html': ['.html'] },
        multiple: false,
    });

    const processarHTML = (file: File): Promise<MetricasBacktest> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    if (!text) throw new Error("O arquivo está vazio.");

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');

                    // --- PARTE 1: Extrair Métricas Resumidas ---

                    // Função auxiliar multilíngue para encontrar o valor com base em uma lista de labels
                    const getValue = (labels: string[]): string => {
                        const allTds = Array.from(doc.getElementsByTagName('td'));
                        
                        let labelTd: HTMLTableCellElement | undefined;
                        for (const label of labels) { // Procura por cada label na lista
                            labelTd = allTds.find(td => td.textContent?.trim().startsWith(label));
                            if (labelTd) break; // Para quando encontrar
                        }

                        if (!labelTd) throw new Error(`Labels "${labels.join(' / ')}" não encontrados no relatório HTML.`);
                        
                        let valueElement = labelTd.nextElementSibling;
                        while(valueElement && valueElement.tagName !== 'TD') {
                            valueElement = valueElement.nextElementSibling;
                        }
                        if (!valueElement) throw new Error(`Célula de valor para "${labels[0]}" não encontrada.`);
                        
                        const bTag = (valueElement as HTMLElement).querySelector('b');
                        const content = bTag ? bTag.textContent : valueElement.textContent;
                        if (!content) throw new Error(`Conteúdo de valor para "${labels[0]}" não encontrado.`);
                        return content.trim();
                    };

                    // Extrair dados resumidos usando os labels em PT e EN
                    const depositoInicialStr = getValue(['Depósito Inicial:', 'Initial Deposit:']);
                    const lucroLiquidoStr = getValue(['Lucro Líquido Total:', 'Total Net Profit:']);
                    const fatorLucroStr = getValue(['Fator de Lucro:', 'Profit Factor:']);
                    const drawdownStr = getValue(['Rebaixamento Máximo do Capital Líquido:', 'Equity Drawdown Maximal:']);
                    const periodoStr = getValue(['Período:', 'Period:']);
                    const totalNegociacoesStr = getValue(['Total de Negociações:', 'Total Trades:']);
                    const negociacoesLucroStr = getValue(['Negociações com Lucro (% of total):', 'Profit Trades (% of total):']);
                    const negociacoesPerdaStr = getValue(['Negociações com Perda (% of total):', 'Loss Trades (% of total):']);
                    const fatorRecuperacaoStr = getValue(['Fator de Recuperação:', 'Recovery Factor:']);
                    const payoffStr = getValue(['Retorno Esperado (Payoff):', 'Expected Payoff:']);
                    const avgGainStr = getValue(['Média lucro da negociação:', 'Average profit trade:']);
                    const avgLossStr = getValue(['Média perda na Negociação:', 'Average loss trade:']);
                    const maiorGainStr = getValue(['Maior lucro da negociação:', 'Largest profit trade:']);
                    const maiorLossStr = getValue(['Maior perda na Negociação:', 'Largest loss trade:']);

                    // Parsear dados resumidos (a lógica de parse é a mesma)
                    const depositoInicial = parseMetric(depositoInicialStr);
                    const saldoTotal = parseMetric(lucroLiquidoStr);
                    const fatorLucro = parseMetric(fatorLucroStr);
                    const drawdown = parseDrawdownValue(drawdownStr);
                    const totalNegociacoes = parseMetric(totalNegociacoesStr);
                    const { count: negociacoesLucro, percent: taxaAcerto } = parseCountPercent(negociacoesLucroStr);
                    const { count: negociacoesPerda } = parseCountPercent(negociacoesPerdaStr);
                    const fatorRecuperacao = parseMetric(fatorRecuperacaoStr);
                    const payoff = parseMetric(payoffStr);
                    const avgGain = parseMetric(avgGainStr);
                    const avgLoss = Math.abs(parseMetric(avgLossStr));
                    const maiorGain = parseMetric(maiorGainStr);
                    const maiorLoss = parseMetric(maiorLossStr);

                    const periodoMatch = periodoStr.match(/(\d{4}\.\d{2}\.\d{2}) - (\d{4}\.\d{2}\.\d{2})/);
                    if (!periodoMatch) throw new Error("Não foi possível extrair o período do histórico.");
                    const historicoInicio = periodoMatch[1].replace(/\./g, '-'); // Formato AAAA-MM-DD
                    const historicoFim = periodoMatch[2].replace(/\./g, '-'); // Formato AAAA-MM-DD


                    // --- PARTE 2: Extrair dados de Transações para o dadosCSV ---
                    
                    const dadosCSV: DadosCsvItem[] = [];
                    const allThs = Array.from(doc.getElementsByTagName('th'));

                    // Procura pelo cabeçalho da tabela em PT ou EN
                    const tableLabels = ['Transações', 'Deals'];
                    let transacoesHeader: HTMLTableCellElement | undefined;
                    for (const label of tableLabels) {
                        transacoesHeader = allThs.find(th => th.textContent?.trim() === label);
                        if (transacoesHeader) break;
                    }
                    if (!transacoesHeader) throw new Error('Tabela "Transações" / "Deals" não encontrada.');

                    const table = transacoesHeader.closest('table');
                    if (!table) throw new Error('Tabela "Transações" / "Deals" não encontrada.');

                    const rows = Array.from(table.getElementsByTagName('tr'));
                    // Encontra a linha do cabeçalho pela cor (consistente em ambos os idiomas)
                    const columnHeaderRowIndex = rows.findIndex(row => row.getAttribute('bgcolor') === '#E5F0FC');
                    
                    if (columnHeaderRowIndex === -1) throw new Error('Cabeçalho da tabela "Transações" / "Deals" não encontrado.');

                    const dataRows = rows.slice(columnHeaderRowIndex + 1);

                    for (const row of dataRows) {
                        const cells = Array.from(row.getElementsByTagName('td'));
                        // A coluna 'Saldo' / 'Balance' é a 12ª (índice 11)
                        if (cells.length < 13) continue; // Ignora a linha final de total

                        const horario = cells[0]?.textContent?.trim() || ''; // Coluna 'Time'
                        const saldoStr = cells[11]?.textContent?.trim() || '0'; // Coluna 'Balance'
                        
                        if (!horario || !saldoStr) continue; // Pula linha inválida

                        const saldoNum = parseMetric(saldoStr);
                        const saldoFormatado = formatMetricString(saldoNum);
                        
                        // O formato de data (AAAA.MM.DD HH:MM:SS) é o mesmo em ambos os relatórios
                        const dataFormatada = horario.replace(/\./g, '-'); 

                        dadosCSV.push({
                            "<DATE>": dataFormatada,
                            "<BALANCE>": saldoFormatado,
                            "<EQUITY>": saldoFormatado, // Assumindo Equity = Balance
                            "<DEPOSIT LOAD>": "0.0000" // Hardcoded como na imagem
                        });
                    }

                    if (dadosCSV.length === 0) {
                        // O primeiro item é sempre o depósito inicial
                        throw new Error("Nenhuma transação válida foi encontrada no relatório.");
                    }
                    
                    resolve({
                        saldoTotal,
                        fatorLucro,
                        drawdown,
                        historicoInicio,
                        historicoFim,
                        depositoInicial,
                        totalNegociacoes,
                        negociacoesLucro,
                        negociacoesPerda,
                        taxaAcerto,
                        fatorRecuperacao,
                        payoff,
                        avgGain,
                        avgLoss,
                        maiorGain,
                        maiorLoss,
                        dadosCSV // Array de transações preenchido
                    });

                } catch (err: any) {
                    reject(new Error(`Erro ao processar o HTML: ${err.message}`));
                }
            };

            reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
            reader.readAsText(file, 'windows-1252'); // Codificação comum do MetaTrader
        });
    };


    const handleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!arquivo) return setError('Por favor, selecione um arquivo primeiro.');
        if (!user) return setError('Você deve estar logado para enviar.');
        if (!nome || !mercado || !ativo || !tipo || !descricao) return setError('Por favor, preencha todos os campos obrigatórios.');

        setIsSubmitting(true);
        try {
            // Processa o HTML para extrair todas as métricas
            const metricas = await processarHTML(arquivo);

            const db = getDatabase();
            const estrategiaRef = dbRef(db, `estrategias/${user.uid}/${nome}`);
            
            // Salva os dados no Firebase usando as métricas extraídas
            await set(estrategiaRef, {
                userId: user.uid, 
                nomeRobo: nome, 
                mercado, 
                ativo, 
                tipo, 
                descricao,
                criadoEm: new Date().toISOString(),

                // === DADOS DE TRANSAÇÕES (PARA GRÁFICOS) ===
                dadosCSV: metricas.dadosCSV, // Salva o array de transações
                
                // === MÉTRICAS RESUMIDAS (PARA CÁLCULOS) ===
                saldoTotal: metricas.saldoTotal,
                fatorLucro: metricas.fatorLucro,
                historicoInicio: metricas.historicoInicio,
                historicoFim: metricas.historicoFim,
                drawdown: metricas.drawdown,
                
                depositoInicial: metricas.depositoInicial,
                totalNegociacoes: metricas.totalNegociacoes,
                negociacoesLucro: metricas.negociacoesLucro,
                negociacoesPerda: metricas.negociacoesPerda,
                taxaAcerto: metricas.taxaAcerto,
                fatorRecuperacao: metricas.fatorRecuperacao,
                payoff: metricas.payoff,
                avgGain: metricas.avgGain,
                avgLoss: metricas.avgLoss,
                maiorGain: metricas.maiorGain,
                maiorLoss: metricas.maiorLoss,
            });

            alert('Estratégia adicionada com sucesso!');
            router.push('/robos'); // Redireciona após o sucesso
            
        } catch (error: any) {
            console.error('Erro no envio:', error.message);
            setError('Erro ao enviar estratégia: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
            <Topbar />
            <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700 shadow z-40">
                <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-400 font-bold text-xl p-2">☰</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className={`fixed md:static z-50 transition-transform duration-300 transform bg-slate-900 border-r border-slate-800 shadow-lg md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        <section className="mb-8">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                <h1 className="text-2xl font-bold text-white mb-2">Adicionar Nova Estratégia</h1>
                                <p className="text-gray-400 text-sm">Preencha os detalhes e envie seu arquivo de backtest para analisar uma nova estratégia.</p>
                            </div>
                        </section>
                        
                        {error && (
                            <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-sm">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}
                        
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-lg">
                            <form onSubmit={handleEnviar} className="space-y-6">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-2">
                                        Upload do Relatório de Backtest (MetaTrader 5)
                                    </label>
                                    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-purple-500 bg-purple-900/20' : 'border-slate-600 hover:border-slate-500'}`}>
                                        <input {...getInputProps()} />
                                        {arquivo ? (
                                            <div className="flex flex-col items-center space-y-2 text-gray-300">
                                                <CheckCircleIcon className="h-12 w-12 text-green-400" />
                                                <p className="font-medium">{arquivo.name}</p>
                                                <p className="text-gray-400 text-sm">{filesize(arquivo.size)}</p>
                                                <button className="text-xs text-red-400 hover:underline" onClick={(e) => { e.stopPropagation(); setArquivo(null); }}>Remover arquivo</button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <CloudArrowUpIcon className="h-12 w-12 mb-2" />
                                                <p>Arraste seu arquivo .html aqui ou <span className="text-purple-400 font-semibold">clique para selecionar</span></p>
                                                <p className="text-xs mt-1">Relatório de Backtest do MetaTrader 5</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Não sabe onde obter o arquivo HTML?
                                        <button type="button" onClick={() => setIsCsvHelpModalOpen(true)} className="ml-1 text-purple-400 font-semibold hover:underline">
                                            Clique aqui para ajuda
                                        </button>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <input type="text" placeholder="Nome da Estratégia" value={nome} onChange={(e) => setNome(e.target.value)} className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" required />
                                    {/* Corrigido: e.g.target.value -> e.target.value */}
                                    <select className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" value={mercado} onChange={(e) => setMercado(e.target.value)} required>
                                        <option value="">Selecionar Mercado</option>
                                        <option>Forex</option><option>Stocks</option><option>Crypto</option><option>Index</option><option>Commodities</option>
                                    </select>
                                    <select className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" value={ativo} onChange={(e) => setAtivo(e.target.value)} required>
                                        <option value="">Selecionar Ativo</option>
                                        <option>S&P500</option><option>NASDAQ</option><option>DOW JONES</option><option>DAX</option><option>FTSE 100</option><option>NIKKEI 225</option><option>EURUSD</option><option>GBPUSD</option><option>USDJPY</option><option>AUDUSD</option><option>XAUUSD</option><option>XAGUSD</option><option>WTI OIL</option><option>AAPL</option><option>MSFT</option><option>GOOGL</option><option>AMZN</option><option>NVDA</option><option>TSLA</option><option>Other</option>
                                    </select>
                                    <select className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                                        <option value="">Selecionar Tipo</option>
                                        <option>Day Trade</option><option>Swing Trade</option><option>Scalping</option><option>Position Trade</option><option>Long-Term Investment</option>
                                    </select>
                                </div>
                                <div>
                                    <textarea className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg" rows={4} placeholder="Descrição da estratégia..." value={descricao} onChange={(e) => setDescricao(e.target.value)} required></textarea>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto mt-6 bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_0_10px_theme(colors.purple.500/40)]">
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Enviando...
                                        </>
                                    ) : 'Enviar Estratégia'}
                                </button>
                            </form>
                        </div>
                    </div>
                </main>
            </div>

            {isCsvHelpModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                            <h2 className="text-xl font-bold text-white">Como Exportar seu Relatório do MetaTrader</h2>
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="text-gray-500 hover:text-gray-300 text-3xl leading-none" aria-label="Close popup">&times;</button>
                        </div>
                        <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
                            <p>Para exportar o relatório de histórico da sua estratégia no MetaTrader 5, siga estes passos:</p>
                            <ol className="list-decimal list-inside space-y-3 pl-4">
                                <li>Abra o <strong>Testador de Estratégia</strong> (Strategy Tester) no MetaTrader 5 (atalho: `Ctrl+R`).</li>
                                <li>Na aba "Configurações" (Settings), selecione sua estratégia, o símbolo, o timeframe e o período desejado.</li>
                                <li>Execute o backtest clicando em "Iniciar" (Start).</li>
                                <li>Após o término do teste, vá para a aba <strong>"Backtest"</strong> (às vezes rotulada como "Resultados" ou "Results").</li>
                                <li>Clique com o botão direito em qualquer lugar na área de resultados e selecione a opção <strong>"Salvar como Relatório"</strong> (Save as Report).</li>
                                <li>Salve o arquivo em seu computador (será um arquivo .html). Este é o arquivo que você deve enviar aqui.</li>
                            </ol>
                            <p className="!mt-6 text-gray-400">O relatório HTML exportado contém todas as métricas resumidas para o nosso sistema processar.</p>
                        </div>
                        <div className="mt-6 text-right border-t border-slate-700 pt-4">
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Wrapper component with Suspense
export default function AdicionarEstrategiaPageWrapper() {
    return (
        <Suspense fallback={<div className="bg-slate-900 min-h-screen"><LoadingSpinner /></div>}>
            <AdicionarEstrategiaContent />
        </Suspense>
    );
}