'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/authcontext';
import { getDatabase, ref as dbRef, set } from 'firebase/database';
import Papa from 'papaparse';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { filesize } from 'filesize';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import React from 'react';
import Image from 'next/image';
import { FaTimes } from 'react-icons/fa';
import { CheckCircleIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

// Interface for raw CSV data
interface OriginalCsvData {
    '<DATE>': string;
    '<BALANCE>': string;
    '<EQUITY>': string;
    '<DEPOSIT LOAD>'?: string;
}

// Reusable Spinner Component
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full p-8">
        <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

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
        if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
            setArquivo(file);
            setError(null);
        } else {
            setError("Please upload a valid .csv file.");
            setArquivo(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });

    const processarCSV = (file: File): Promise<OriginalCsvData[]> => {
        return new Promise((resolve, reject) => {
            Papa.parse<OriginalCsvData>(file, {
                header: true,
                skipEmptyLines: true,
                error: (err) => reject(err),
                complete: (resultado) => {
                    if (resultado.errors.length) {
                        reject(new Error(`Error parsing the CSV: ${resultado.errors[0].message}`));
                    } else {
                        resolve(resultado.data);
                    }
                },
            });
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
            const dados = await processarCSV(arquivo);

            if (dados.length === 0 || !dados[0]?.['<DATE>'] || !dados[0]?.['<EQUITY>']) {
                throw new Error('The CSV file is empty or has invalid headers. Make sure it contains <DATE> and <EQUITY> columns.');
            }

            // Validation and calculation of summary metrics
            let saldoTotal = 0, fatorLucro = 0, historicoInicio = '', historicoFim = '', drawdownMaximo = 0;
            const dadosValidados = dados.filter((row) => row['<DATE>'] && parseFloat(String(row['<EQUITY>']).replace(',', '.')));
            
            if (dadosValidados.length > 0) {
                const primeiraLinha = dadosValidados[0];
                const ultimaLinha = dadosValidados[dadosValidados.length - 1];
                const equityInicial = parseFloat(String(primeiraLinha['<EQUITY>']).replace(',', '.'));
                const equityFinal = parseFloat(String(ultimaLinha['<EQUITY>']).replace(',', '.'));
                saldoTotal = equityFinal - equityInicial;
                historicoInicio = primeiraLinha['<DATE>'];
                historicoFim = ultimaLinha['<DATE>'];

                const gains: number[] = [], losses: number[] = [];
                let pico = equityInicial, lastEquity = equityInicial;

                for (let i = 1; i < dadosValidados.length; i++) {
                    const equityAtual = parseFloat(String(dadosValidados[i]['<EQUITY>']).replace(',', '.'));
                    if (equityAtual > pico) pico = equityAtual;
                    const drawdownAtual = equityAtual - pico;
                    if (drawdownAtual < drawdownMaximo) drawdownMaximo = drawdownAtual;
                    
                    const diff = equityAtual - lastEquity;
                    if (diff > 0) gains.push(diff);
                    if (diff < 0) losses.push(diff);
                    lastEquity = equityAtual;
                }
                const totalGains = gains.reduce((a, b) => a + b, 0);
                const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
                fatorLucro = totalLosses !== 0 ? parseFloat((totalGains / totalLosses).toFixed(3)) : 0;
            }
            
            const db = getDatabase();
            const estrategiaRef = dbRef(db, `estrategias/${user.uid}/${nome}`);
            await set(estrategiaRef, {
                userId: user.uid, nomeRobo: nome, mercado, ativo, tipo, descricao,
                dadosCSV: dados, saldoTotal, fatorLucro, historicoInicio, historicoFim,
                drawdown: Math.abs(drawdownMaximo), criadoEm: new Date().toISOString(),
            });

            alert('Strategy added successfully!');
            router.push('/robos'); // Redirect after success
            
        } catch (error: any) {
            console.error('Error on submit:', error.message);
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
                                        MetaTrader 5 Backtest Upload
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
                                                <p>Drag your .csv file here or <span className="text-purple-400 font-semibold">click to select</span></p>
                                                <p className="text-xs mt-1">Historical Data from MetaTrader 5</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Don't know where to get the CSV file?
                                        <button type="button" onClick={() => setIsCsvHelpModalOpen(true)} className="ml-1 text-purple-400 font-semibold hover:underline">
                                            Click here for help
                                        </button>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <input type="text" placeholder="Strategy Name" value={nome} onChange={(e) => setNome(e.target.value)} className="p-3 bg-slate-800 border border-slate-600 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500" required />
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
                            <h2 className="text-xl font-bold text-white">How to Export Your MetaTrader History</h2>
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="text-gray-500 hover:text-gray-300 text-3xl leading-none" aria-label="Close popup">&times;</button>
                        </div>
                        <div className="text-sm text-gray-300 space-y-4 overflow-y-auto pr-2">
                            <p>To export the trading history of your strategy in MetaTrader 5, follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-3 pl-4">
                                <li>Open the <strong>Strategy Tester</strong> in MetaTrader 5 (shortcut: `Ctrl+R`).</li>
                                <li>In the "Settings" tab, select your strategy, the symbol, the timeframe, and the desired time period.</li>
                                <li>Run the backtest by clicking "Start".</li>
                                <li>After the test is complete, go to the <strong>"Backtest"</strong> tab (sometimes labeled "Results").</li>
                                <li>Right-click anywhere in the results area and select the option <strong>"Export to XML/CSV..."</strong>.</li>
                                <li>Save the file on your computer. This is the file you should upload here.</li>
                            </ol>
                            <p className="!mt-6 text-gray-400">The exported file should contain the necessary columns for our system to process the equity curve.</p>
                            <Image src="/mt5-export-csv.png" alt="MetaTrader 5 export instructions" width={800} height={400} className="rounded-lg shadow-md mt-4 opacity-80" />
                        </div>
                        <div className="mt-6 text-right border-t border-slate-700 pt-4">
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">
                                Got It
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