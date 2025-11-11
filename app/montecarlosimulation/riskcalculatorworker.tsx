// Conteúdo de riskcalculator.worker.tsx

// Interface para garantir tipagem
interface WorkerData {
    riscoAceito: number;
    todosMaioresDrawdownsSimulacao: number[];
    maiorDrawdown: number;
    drawdownMedio: number;
    mediaMes: number;
}

self.onmessage = (event: MessageEvent<WorkerData>) => {
    const { 
        riscoAceito, 
        todosMaioresDrawdownsSimulacao, 
        maiorDrawdown, 
        drawdownMedio, 
        mediaMes 
    } = event.data;

    const baseParaCapital = Math.abs(maiorDrawdown !== 0 ? maiorDrawdown : drawdownMedio);
    let capitalRec = 0;
    let retornoMensalEst = 0;
    let riscoDeRuina = 0;
    let ocorrenciasDeRuina = 0;

    if (baseParaCapital === 0 || riscoAceito === 0) {
        capitalRec = Infinity;
        // Os outros valores permanecem 0
    } else {
        capitalRec = baseParaCapital / riscoAceito; 
        retornoMensalEst = (mediaMes / capitalRec) * 100;
        
        const limiteQuebra = -capitalRec;
        ocorrenciasDeRuina = todosMaioresDrawdownsSimulacao.filter(dd => dd <= limiteQuebra).length;
        riscoDeRuina = todosMaioresDrawdownsSimulacao.length > 0 ? (ocorrenciasDeRuina / todosMaioresDrawdownsSimulacao.length) * 100 : 0;
    }

    const resultado = { 
        capitalRecomendado: capitalRec, 
        retornoMensalEstimado: retornoMensalEst, 
        riscoRuinaEstimado: riscoDeRuina, 
        ocorrenciasRuina: ocorrenciasDeRuina 
    };

    // Posta o resultado de volta para o thread principal
    self.postMessage({ resultado });
};