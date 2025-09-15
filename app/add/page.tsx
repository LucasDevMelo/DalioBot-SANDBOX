'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/authcontext';
import { getDatabase, ref as dbRef, set, get } from 'firebase/database';
import Papa from 'papaparse';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { filesize } from 'filesize';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import React from 'react';
import Image from 'next/image';
import { FaTimes } from 'react-icons/fa';

// Interface for processed CSV data
interface CsvData {
    DATE: string;
    BALANCE: number;
    EQUITY: number;
    'DEPOSIT LOAD': number;
}

// Interface for raw CSV data as it is in the Realtime Database
interface OriginalCsvData {
    '<DATE>': string;
    '<BALANCE>': string;
    '<EQUITY>': string;
    '<DEPOSIT LOAD>'?: string;
}

const XIcon = () => (
    <FaTimes className="flex-shrink-0 w-5 h-5 text-red-400" />
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
    
    const { user } = useAuth(); // Alterado: 'subscription' não é mais necessário aqui

    // ✅ REMOVIDO: A lógica de limites de planos e a consulta do plano do usuário.
    // A versão beta não tem restrições de quantidade de robôs.

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

    const processarCSV = (arquivo: File) => {
        return new Promise<OriginalCsvData[]>((resolve, reject) => {
            Papa.parse<OriginalCsvData>(arquivo, {
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

        try {
            // ✅ REMOVIDO: Toda a lógica de verificação de limite de robôs baseada em planos.
            // Agora, todos os usuários beta podem adicionar quantos robôs quiserem.

            const dados = await processarCSV(arquivo);

            if (dados.length === 0 || !dados[0]?.['<DATE>'] || !dados[0]?.['<EQUITY>']) {
                throw new Error('The CSV file is empty or has invalid headers. Make sure it contains <DATE> and <EQUITY> columns.');
            }

            // Validation and calculation of summary metrics
            let saldoTotal = 0;
            let fatorLucro = 0;
            let historicoInicio = '';
            let historicoFim = '';
            let drawdownMaximo = 0;

            const dadosValidados = dados.filter((row) => row['<DATE>'] && parseFloat(String(row['<EQUITY>']).replace(',', '.')));
            
            if (dadosValidados.length > 0) {
                const primeiraLinha = dadosValidados[0];
                const ultimaLinha = dadosValidados[dadosValidados.length - 1];

                const equityInicial = parseFloat(String(primeiraLinha['<EQUITY>']).replace(',', '.'));
                const equityFinal = parseFloat(String(ultimaLinha['<EQUITY>']).replace(',', '.'));
                saldoTotal = equityFinal - equityInicial;

                const dataInicio = new Date(primeiraLinha['<DATE>'].replace(/\./g, '-'));
                const dataFim = new Date(ultimaLinha['<DATE>'].replace(/\./g, '-'));
                historicoInicio = `${String(dataInicio.getDate()).padStart(2, '0')}/${String(dataInicio.getMonth() + 1).padStart(2, '0')}/${dataInicio.getFullYear()}`;
                historicoFim = `${String(dataFim.getDate()).padStart(2, '0')}/${String(dataFim.getMonth() + 1).padStart(2, '0')}/${dataFim.getFullYear()}`;

                const gains: number[] = [];
                const losses: number[] = [];
                let pico = equityInicial;
                let lastEquity = equityInicial;

                for (let i = 1; i < dadosValidados.length; i++) {
                    const row = dadosValidados[i];
                    const equityAtual = parseFloat(String(row['<EQUITY>']).replace(',', '.'));
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
                userId: user.uid,
                nomeRobo: nome,
                mercado,
                ativo,
                tipo,
                descricao,
                dadosCSV: dados, // SAVING THE RAW DATA, AS PER YOUR STRUCTURE
                saldoTotal,
                fatorLucro,
                historicoInicio,
                historicoFim,
                drawdown: Math.abs(drawdownMaximo),
                criadoEm: new Date().toISOString(),
            });

            alert('Strategy added successfully!');
            
            setNome(''); setMercado(''); setAtivo(''); setTipo(''); setDescricao(''); setArquivo(null);
        } catch (error: any) {
            console.error('Error on submit:', error.message);
            setError('Error submitting strategy: ' + error.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Topbar />
            <div className="md:hidden p-2 bg-white shadow z-40">
                <button onClick={() => setSidebarAberta(!sidebarAberta)} className="text-purple-700 font-bold text-xl">☰</button>
            </div>
            <div className="flex flex-1">
                <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-white shadow-md md:shadow-none h-full md:h-auto ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>
                <main className="flex-1 bg-gray-100 p-6">
                    <h1 className="text-2xl font-bold mb-6 text-black">Add Strategy</h1>

                    {error && (
                        <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg text-sm">
                            <p className="text-pink-800">{error}</p>
                        </div>
                    )}
                    
                    {/* ✅ ALTERADO: Mensagem de status para a versão beta */}
                    <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                        <p className="text-purple-800 font-bold">
                            You are on the Beta Plan. Add as many strategies as you want!
                        </p>
                    </div>

                    <div className="bg-white shadow-md rounded-xl p-6 max-w-3xl mx-auto">
                        <form onSubmit={handleEnviar}>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Metatrader 5 Backtest Upload
                                </label>
                                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}`}>
                                    <input {...getInputProps()} />
                                    {arquivo ? (
                                        <div className="flex flex-col items-center space-y-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-gray-800 font-medium">{arquivo.name}</p>
                                            <p className="text-gray-500 text-sm">{filesize(arquivo.size)}</p>
                                            <button className="text-xs text-red-500 hover:underline" onClick={(e) => { e.stopPropagation(); setArquivo(null); }}>Remove file</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4 4H2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 16h-1a4 4 0 00-4-4h-1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12l-3-3m0 0l-3 3m3-3v12" /></svg>
                                            <p>Drag your .csv file here or <span className="text-purple-600 font-semibold">click to select</span></p>
                                            <p className="text-xs mt-1">Historical Data from MetaTrader 5</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mt-2">
                                    Don't know where to get the CSV file?
                                    <button type="button" onClick={() => setIsCsvHelpModalOpen(true)} className="ml-1 text-purple-600 font-semibold hover:underline">
                                        Click here
                                    </button>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Strategy Name" value={nome} onChange={(e) => setNome(e.target.value)} className="p-3 border rounded-md w-full" required />
                                <select className="p-3 border rounded-md w-full" value={mercado} onChange={(e) => setMercado(e.target.value)} required>
                                    <option value="">Select Market</option>
                                    <option>Forex</option><option>Stocks</option><option>Crypto</option><option>Index</option><option>Commodities</option>
                                </select>
                                <select className="p-3 border rounded-md w-full" value={ativo} onChange={(e) => setAtivo(e.target.value)} required>
                                    <option value="">Select Asset</option>
                                    <option>S&P500</option><option>NASDAQ</option><option>DOW JONES</option><option>DAX</option><option>FTSE 100</option><option>NIKKEI 225</option><option>EURUSD</option><option>GBPUSD</option><option>USDJPY</option><option>AUDUSD</option><option>XAUUSD</option><option>XAGUSD</option><option>WTI OIL</option><option>AAPL</option><option>MSFT</option><option>GOOGL</option><option>AMZN</option><option>NVDA</option><option>TSLA</option><option>Other</option>
                                </select>
                                <select className="p-3 border rounded-md w-full" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                                    <option value="">Select Type</option>
                                    <option>Day Trade</option><option>Swing Trade</option><option>Scalping</option><option>Position Trade</option><option>Long-Term Investment</option>
                                </select>
                            </div>
                            <div className="mt-4">
                                <textarea className="w-full p-3 border rounded-md" rows={4} placeholder="Strategy description" value={descricao} onChange={(e) => setDescricao(e.target.value)} required></textarea>
                            </div>
                            <button type="submit" className="mt-6 bg-purple-700 text-white px-6 py-3 rounded-md hover:bg-purple-800 transition">
                                Submit Strategy
                            </button>
                        </form>
                    </div>
                </main>
            </div>

            {isCsvHelpModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h2 className="text-xl font-bold text-gray-800">How to Export Your MetaTrader History</h2>
                            <button onClick={() => setIsCsvHelpModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none" aria-label="Close popup">&times;</button>
                        </div>
                        <div className="text-sm text-gray-600 space-y-4 overflow-y-auto pr-2">
                            <p>To export the trading history of your strategy in MetaTrader 5, follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-3 pl-4">
                                <li>Open the **Strategy Tester** in MetaTrader 5 (shortcut: `Ctrl+R`).</li>
                                <li>In the "Settings" tab, select your strategy, the symbol, the timeframe, and the desired time period.</li>
                                <li>Run the backtest by clicking "Start".</li>
                                <li>After the test is complete, go to the **"Results"** tab.</li>
                                <li>Right-click anywhere in the results area and select the option **"Export to CSV..."**.</li>
                                <li>Save the `.csv` file on your computer. This is the file you should upload here.</li>
                            </ol>
                            <p>The exported file should contain columns like `Date`, `Time`, `Open`, `High`, `Low`, `Close`, etc.</p>
                            <Image src="/mt5-export-csv.png" alt="MetaTrader 5 export instructions" width={800} height={400} className="rounded-lg shadow-md mt-4" />
                        </div>
                        <div className="mt-6 text-right border-t pt-4">
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
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <AdicionarEstrategiaContent />
        </Suspense>
    );
}