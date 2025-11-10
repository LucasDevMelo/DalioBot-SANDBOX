// --- Interfaces (Definidas no worker para serem auto-contidas) ---
interface PathPoint { step: number; value: number; }
interface Simulation { path: PathPoint[]; color: string; }
interface OcorrenciaDrawdown {
    label: string;
    limite: number;
    vezes: number;
    porcentagem: number;
    histograma: { name: string; ocorrencias: number }[];
}

// --- Funções de Utilidade Otimizadas ---

/**
 * Calcula a porcentagem de janelas 'rolantes' negativas de forma eficiente (O(n)).
 * @param data Array de ganhos/perdas.
 * @param windowSize O tamanho da janela (ex: 3 para trimestres).
 * @returns A porcentagem de janelas com soma negativa.
 */
function calculateRollingNegativePercentage(data: number[], windowSize: number): number {
    if (data.length < windowSize) return 0;

    let negativeWindowCount = 0;
    const numPossibleWindows = data.length - windowSize + 1;
    if (numPossibleWindows <= 0) return 0;

    // Calcula a soma da primeira janela
    let currentWindowSum = 0;
    for (let i = 0; i < windowSize; i++) {
        currentWindowSum += data[i];
    }
    if (currentWindowSum < 0) {
        negativeWindowCount++;
    }

    // "Desliza" a janela: remove o primeiro elemento, adiciona o próximo
    for (let k = 1; k < numPossibleWindows; k++) {
        // Subtrai o elemento que saiu e adiciona o que entrou
        currentWindowSum = currentWindowSum - data[k - 1] + data[k + windowSize - 1];
        if (currentWindowSum < 0) {
            negativeWindowCount++;
        }
    }

    return (negativeWindowCount / numPossibleWindows) * 100;
}


// --- Lógica Principal do Worker ---

/**
 * Ouve o evento 'message' da thread principal para iniciar a simulação.
 */
self.onmessage = (e: MessageEvent) => {
    const { 
        quantidadeSimulacoes, 
        stepsSimulacao, 
        retornoMedioSimulacao, 
        desvioPadraoSimulacao 
    } = e.data;

    // --- Início da Lógica de gerarSimulacoes ---
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

    // --- Loop Principal da Simulação ---
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
            
            // Correção: Usando a Transformada de Box-Muller para uma distribuição normal padrão
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2); // Z-score
            
            const randomShock = retornoMedioSimulacao + desvioPadraoSimulacao * z;
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
            if (j % 21 === 0 || j === stepsSimulacao) { // Assumindo 21 dias úteis/mês
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

            // Usando a função otimizada
            percentagesNegativeTrimesters.push(calculateRollingNegativePercentage(ganhosMensaisDaSimulacao, 3));
            percentagesNegativeSemesters.push(calculateRollingNegativePercentage(ganhosMensaisDaSimulacao, 6));
            percentagesNegativeYears.push(calculateRollingNegativePercentage(ganhosMensaisDaSimulacao, 12));
        } else {
            percentagesNegativeMonths.push(0); percentagesNegativeTrimesters.push(0);
            percentagesNegativeSemesters.push(0); percentagesNegativeYears.push(0);
        }

        // Envia atualizações de progresso
        // Atualiza a cada 100 simulações ou no final
        if (i % 100 === 0 || i === quantidadeSimulacoes - 1) {
            const progress = Math.floor(((i + 1) / quantidadeSimulacoes) * 100);
            // Envia uma mensagem de progresso para a thread principal
            postMessage({ type: 'progress', progress });
        }
    }

    // --- Cálculo de Estatísticas (Após o loop) ---
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

    const estatisticas = {
        maiorDrawdown: maiorDD, drawdownMedio: ddMedio, menorDrawdown: menorDD, desvioPadraoDrawdowns: dpDD,
        ocorrenciasDrawdown: ocorrenciasDD, melhorEstagnacao: melhorEst, piorEstagnacao: piorEst,
        mediaEstagnacao: mediaEst, melhorMes: melhorM, piorMes: piorM, mediaMes: mediaM,
        histMensal: todosGanhosMensaisAgregados,
        frequenciaPeriodosNegativos: {
            meses: avgPercNegMonths, trimestres: avgPercNegTrimesters,
            semestres: avgPercNegSemesters, anos: avgPercNegYears,
        },
    };

    // --- Envia o Resultado Final ---
    // Envia a mensagem final com todos os dados para a thread principal
    postMessage({
        type: 'result',
        data: {
            monteCarloData: simulacoesGeradas,
            estatisticas,
            todosMaioresDrawdownsSimulacao: todosOsDrawdowns,
        }
    });
};

/**
 * Handler de erro para capturar exceções dentro do worker.
 */
self.onerror = (errorEvent) => {
    let errorMessage = 'Unknown worker error';

    // O erro pode vir como um ErrorEvent (padrão)
    if (errorEvent instanceof ErrorEvent) {
        errorMessage = errorEvent.message;
        console.error('Error in worker:', errorEvent.message, 'at', errorEvent.filename, 'line', errorEvent.lineno);
    } 
    // Ou às vezes apenas como uma string
    else if (typeof errorEvent === 'string') {
        errorMessage = errorEvent;
        console.error('Error in worker (string):', errorEvent);
    } 
    // Fallback
    else {
        console.error('Error in worker (unknown type):', errorEvent);
    }

    // Envia a mensagem de erro formatada para a página principal
    postMessage({ type: 'error', error: errorMessage });
};