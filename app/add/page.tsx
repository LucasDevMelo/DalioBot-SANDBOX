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

// Interface for the CSV data format (based on your image)
interface DadosCsvItem {
    "<DATE>": string;
    "<BALANCE>": string;
    "<EQUITY>": string;
    "<DEPOSIT LOAD>": string;
}

// Interface for the metrics extracted from HTML (EXPANDED)
interface MetricasBacktest {
    saldoTotal: number;       // Total Net Profit
    fatorLucro: number;       // Profit Factor
    drawdown: number;         // Maximal Equity Drawdown (value)
    historicoInicio: string;  // Period (start)
    historicoFim: string;     // Period (end)
    
    // New extracted metrics
    depositoInicial: number;  // Initial Deposit
    totalNegociacoes: number; // Total Trades
    negociacoesLucro: number; // Profit Trades (count)
    negociacoesPerda: number; // Loss Trades (count)
    taxaAcerto: number;       // Profit Trades (% of total) - the percentage
    fatorRecuperacao: number; // Recovery Factor
    payoff: number;           // Expected Payoff
    avgGain: number;          // Average profit trade
    avgLoss: number;          // Average loss trade (saved as a positive value)
    maiorGain: number;        // Largest profit trade
    maiorLoss: number;        // Largest loss trade (saved as a negative value)
    
    dadosCSV: DadosCsvItem[]; // Now filled with data from Deals
}

// --- PARSE HELPER FUNCTIONS ---

// Function to parse numbers (e.g., "5 000.00" or "1.94" or "-90.00")
const parseMetric = (str: string): number => {
    if (!str) return 0;
    // Removes all spaces, replaces comma with dot
    const cleaned = str.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned);
};

// Function to format numbers back to the "5000.00" string format
const formatMetricString = (num: number): string => {
    return num.toFixed(2);
};

// Function to parse count and percentage, e.g., "65 (60.19%)"
const parseCountPercent = (str: string): { count: number, percent: number } => {
    if (!str) return { count: 0, percent: 0 };
    const match = str.match(/(\d+)\s*\(([\d\.,]+)%\)/);
    if (match && match[1] && match[2]) {
        return {
            count: parseInt(match[1], 10),
            percent: parseMetric(match[2])
        };
    }
    // Fallback if it's just a number (e.g., "108")
    const countOnly = parseInt(str, 10);
    if (!isNaN(countOnly)) {
         return { count: countOnly, percent: 0 };
    }
    return { count: 0, percent: 0 };
};

// Function to parse drawdown value, e.g., "482.20 (7.58%)"
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
            setError("Please upload a valid .html file.");
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
                    if (!text) throw new Error("The file is empty.");

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');

                    // --- PART 1: Extract Summary Metrics ---

                    // Multi-language helper function to find the value based on a list of labels
                    const getValue = (labels: string[]): string => {
                        const allTds = Array.from(doc.getElementsByTagName('td'));
                        
                        let labelTd: HTMLTableCellElement | undefined;
                        for (const label of labels) { // Searches for each label in the list
                            labelTd = allTds.find(td => td.textContent?.trim().startsWith(label));
                            if (labelTd) break; // Stops when found
                        }

                        if (!labelTd) throw new Error(`Labels "${labels.join(' / ')}" not found in the HTML report.`);
                        
                        let valueElement = labelTd.nextElementSibling;
                        while(valueElement && valueElement.tagName !== 'TD') {
                            valueElement = valueElement.nextElementSibling;
                        }
                        if (!valueElement) throw new Error(`Value cell for "${labels[0]}" not found.`);
                        
                        const bTag = (valueElement as HTMLElement).querySelector('b');
                        const content = bTag ? bTag.textContent : valueElement.textContent;
                        if (!content) throw new Error(`Value content for "${labels[0]}" not found.`);
                        return content.trim();
                    };

                    // Extract summary data using labels in PT and EN
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

                    // Parse summary data (the parsing logic is the same)
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
                    if (!periodoMatch) throw new Error("Could not extract the history period.");
                    const historicoInicio = periodoMatch[1].replace(/\./g, '-'); // YYYY-MM-DD Format
                    const historicoFim = periodoMatch[2].replace(/\./g, '-'); // YYYY-MM-DD Format


                    // --- PART 2: Extract Deals data for dadosCSV ---
                    
                    const dadosCSV: DadosCsvItem[] = [];
                    const allThs = Array.from(doc.getElementsByTagName('th'));

                    // Search for the table header in PT or EN
                    const tableLabels = ['Transações', 'Deals'];
                    let transacoesHeader: HTMLTableCellElement | undefined;
                    for (const label of tableLabels) {
                        transacoesHeader = allThs.find(th => th.textContent?.trim() === label);
                        if (transacoesHeader) break;
                    }
                    if (!transacoesHeader) throw new Error('Table "Transações" / "Deals" not found.');

                    const table = transacoesHeader.closest('table');
                    if (!table) throw new Error('Table "Transações" / "Deals" not found.');

                    const rows = Array.from(table.getElementsByTagName('tr'));
                    // Find the header row by color (consistent in both languages)
                    const columnHeaderRowIndex = rows.findIndex(row => row.getAttribute('bgcolor') === '#E5F0FC');
                    
                    if (columnHeaderRowIndex === -1) throw new Error('Header for table "Transações" / "Deals" not found.');

                    const dataRows = rows.slice(columnHeaderRowIndex + 1);

                    for (const row of dataRows) {
                        const cells = Array.from(row.getElementsByTagName('td'));
                        // The 'Saldo' / 'Balance' column is the 12th (index 11)
                        if (cells.length < 13) continue; // Ignore the final total row

                        const horario = cells[0]?.textContent?.trim() || ''; // 'Time' Column
                        const saldoStr = cells[11]?.textContent?.trim() || '0'; // 'Balance' Column
                        
                        if (!horario || !saldoStr) continue; // Skip invalid row

                        const saldoNum = parseMetric(saldoStr);
                        const saldoFormatado = formatMetricString(saldoNum);
                        
                        // The date format (YYYY.MM.DD HH:MM:SS) is the same in both reports
                        const dataFormatada = horario.replace(/\./g, '-'); 

                        dadosCSV.push({
                            "<DATE>": dataFormatada,
                            "<BALANCE>": saldoFormatado,
                            "<EQUITY>": saldoFormatado, // Assuming Equity = Balance
                            "<DEPOSIT LOAD>": "0.0000" // Hardcoded as in the image
                        });
                    }

                    if (dadosCSV.length === 0) {
                        // The first item is always the initial deposit
                        throw new Error("No valid deals were found in the report.");
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
                        dadosCSV // Filled deals array
                    });

                } catch (err: any) {
                    reject(new Error(`Error processing the HTML: ${err.message}`));
                }
            };

            reader.onerror = () => reject(new Error("Error reading the file."));
            reader.readAsText(file, 'windows-1252'); // Common MetaTrader encoding
        });
    };


    const handleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!arquivo) return setError('Please select a file first.');
        if (!user) return setError('You must be logged in to submit.');
        if (!nome || !mercado || !ativo || !tipo || !descricao) return setError('Please fill in all required fields.');

        setIsSubmitting(true);
        try {
            // Process the HTML to extract all metrics
            const metricas = await processarHTML(arquivo);

            const db = getDatabase();
            const estrategiaRef = dbRef(db, `estrategias/${user.uid}/${nome}`);
            
            // Save the data to Firebase using the extracted metrics
            await set(estrategiaRef, {
                userId: user.uid, 
                nome: nome, 
                mercado, 
                ativo, 
                tipo, 
                descricao,
                criadoEm: new Date().toISOString(),

                // === DEAL DATA (FOR CHARTS) ===
                dadosCSV: metricas.dadosCSV, // Save the deals array
                
                // === SUMMARY METRICS (FOR CALCULATIONS) ===
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

            alert('Strategy added successfully!');
            router.push('/robots'); // Redirect after success
            
        } catch (error: any) {
            console.error('Submit error:', error.message);
            setError('Error submitting strategy: ' + error.message);
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
                                <h1 className="text-2xl font-bold text-white mb-2">Add New Strategy</h1>
                                <p className="text-gray-400 text-sm">Fill in the details and upload your backtest file to analyze a new strategy.</p>
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
                                        Backtest Report Upload (MetaTrader 5)
                                    </label>
                                    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-purple-500 bg-purple-900/20' : 'border-slate-600 hover:border-slate-500'}`}>
                                        <input {...getInputProps()} />
                                        {arquivo ? (
                                            <div className="flex flex-col items-center space-y-2 text-gray-300">
                                                <CheckCircleIcon className="h-12 w-12 text-green-400" />
                                                <p className="font-medium">{arquivo.name}</p>
                                                <p className="text-gray-400 text-sm">{filesize(arquivo.size)}</p>
                                                <button className="text-xs text-red-400 hover:underline" onClick={(e) => { e.stopPropagation(); setArquivo(null); }}>Remove file</button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <CloudArrowUpIcon className="h-12 w-12 mb-2" />
                                                <p>Drag your .html file here or <span className="text-purple-400 font-semibold">click to select</span></p>
                                                <p className="text-xs mt-1">MetaTrader 5 Backtest Report</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Not sure where to get the HTML file?
                                        <button type="button" onClick={() => setIsCsvHelpModalOpen(true)} className="ml-1 text-purple-400 font-semibold hover:underline">
                                            Click here for help
                                        </button>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <input type="text" placeholder="Strategy Name" value={nome} onChange={(e) => setNome(e.target.value)} className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" required />
                                    {/* Fixed: e.g.target.value -> e.target.value */}
                                    <select className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" value={mercado} onChange={(e) => setMercado(e.target.value)} required>
                                        <option value="">Select Market</option>
                                        <option>Forex</option><option>Stocks</option><option>Crypto</option><option>Index</option><option>Commodities</option>
                                    </select>
                                    <select className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" value={ativo} onChange={(e) => setAtivo(e.target.value)} required>
                                        <option value="">Select Asset</option>
                                        <option>S&P500</option><option>NASDAQ</option><option>DOW JONES</option><option>DAX</option><option>FTSE 100</option><option>NIKKEI 225</option><option>EURUSD</option><option>GBPUSD</option><option>USDJPY</option><option>AUDUSD</option><option>XAUUSD</option><option>XAGUSD</option><option>WTI OIL</option><option>AAPL</option><option>MSFT</option><option>GOOGL</option><option>AMZN</option><option>NVDA</option><option>TSLA</option><option>Other</option>
                                    </select>
                                    <select className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                                        <option value="">Select Type</option>
                                        <option>Day Trade</option><option>Swing Trade</option><option>Scalping</option><option>Position Trade</option><option>Long-Term Investment</option>
                                    </select>
                                </div>
                                <div>
                                    <textarea className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg" rows={4} placeholder="Strategy description..." value={descricao} onChange={(e) => setDescricao(e.target.value)} required></textarea>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto mt-6 bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_0_10px_theme(colors.purple.500/40)]">
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : 'Submit Strategy'}
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
                            <h2 className="text-xl font-bold text-white">How to Export Your MetaTrader Report</h2>
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="text-gray-500 hover:text-gray-300 text-3xl leading-none" aria-label="Close popup">&times;</button>
                        </div>
                        
                        {/* Este div agora contém a lista E a imagem */}
                        <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
                            <p>To export the history report for your strategy in MetaTrader 5, follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-3 pl-4">
                                <li>Open the <strong>Strategy Tester</strong> in MetaTrader 5 (shortcut: `Ctrl+R`).</li>
                                <li>In the "Settings" tab, select your strategy, symbol, timeframe, and the desired period.</li>
                                <li>Run the backtest by clicking "Start".</li>
                                <li>After the test finishes, go to the <strong>"Backtest"</strong> tab (sometimes labeled "Results").</li>
                                <li>Right-click anywhere in the results area and select the <strong>"Save as Report"</strong> option.</li>
                                <li>Save the file to your computer (it will be an .html file). This is the file you should upload here.</li>
                            </ol>
                            <p className="!mt-6 text-gray-400">The exported HTML report contains all the summary metrics for our system to process.</p>

                            {/* ============================================================
                                INÍCIO DA SEÇÃO ADICIONADA
                            ============================================================
                            
                            NOTA: 
                            1. Ajuste o 'src' se a extensão do arquivo não for .png (ex: /howto.jpg).
                            2. Ajuste 'width' e 'height' para a proporção real da sua imagem
                               para evitar distorção e otimizar o carregamento.
                            
                            */}
                            <div className="my-5 rounded-lg overflow-hidden border border-slate-600 shadow-md">
                                <Image
                                    src="/howto.png" // Caminho relativo à pasta /public
                                    alt="Visual guide on how to export MetaTrader report"
                                    width={650}     // Largura de exemplo (ajuste para a proporção da sua imagem)
                                    height={400}    // Altura de exemplo (ajuste para a proporção da sua imagem)
                                    layout="responsive"
                                    className="w-full h-auto"
                                />
                            </div>
                            {/* ============================================================
                                FIM DA SEÇÃO ADICIONADA
                            ============================================================
                            */}

                        </div>
                        
                        <div className="mt-6 text-right border-t border-slate-700 pt-4">
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">
                                Got it
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