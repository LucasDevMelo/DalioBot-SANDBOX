'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard, LineChart, Dices, Target, Briefcase, Zap, Bot, Library,
  ArrowLeft, CheckCircle2, AlertCircle, TrendingUp, ShieldAlert, BookOpen, 
  Layers, Activity, Settings, Save, AlertTriangle, Scale, Clock, Trash2, Edit, Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';

// ==================================================================================
// CONTEÚDO DOS ARTIGOS
// ==================================================================================

const articlesData: any = {
  // --------------------------------------------------------------------------------
  // LEVEL 1: THE BASICS
  // --------------------------------------------------------------------------------
  'dashboard': {
    title: 'Dashboard',
    icon: <LayoutDashboard className="w-8 h-8 text-purple-400" />,
    level: 'The Basics',
    description: 'O guia definitivo para interpretar cada número do seu painel. Entenda o que é ruído e o que é sinal na performance do seu robô.',
    content: (
      <div className="space-y-12 text-slate-300">
        
        {/* INTRODUÇÃO */}
        <section className="border-b border-slate-800 pb-8">
          <p className="lead text-lg text-slate-400 mb-4">
            O Dashboard do DalioBot não mostra apenas "quanto você ganhou". Ele foi desenhado para responder à pergunta: 
            <span className="text-white font-semibold"> "Vale a pena correr esse risco?"</span>. 
            Abaixo, explicamos detalhadamente cada bloco de informação.
          </p>
        </section>

        {/* 1. MÉTRICAS DE EFICIÊNCIA (KPIS) */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Scale className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">1. Eficiência da Estratégia</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Profit Factor (Fator de Lucro)</strong>
              <p className="text-sm text-slate-400 mb-3">
                É a divisão do Lucro Bruto pela Perda Bruta. Responde: "Para cada $1 que o robô perdeu, quantos dólares ele ganhou?"
              </p>
              <ul className="text-xs space-y-1 text-slate-500">
                <li>• <strong>Abaixo de 1.0:</strong> Estratégia perdedora.</li>
                <li>• <strong>1.2 a 1.5:</strong> Aceitável.</li>
                <li>• <strong>Acima de 1.6:</strong> Excelente robustez.</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Recovery Factor (Fator de Recuperação)</strong>
              <p className="text-sm text-slate-400 mb-3">
                Lucro Líquido dividido pelo Drawdown Máximo. Mede a capacidade da estratégia de sair do buraco.
              </p>
              <div className="bg-green-500/10 p-2 rounded text-xs text-green-300 border border-green-500/20">
                <strong>Dica Dalio:</strong> Preferimos robôs com Recovery Factor maior que 3.0. Isso indica que ele recupera perdas rapidamente.
              </div>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Payoff (Risco x Retorno por Trade)</strong>
              <p className="text-sm text-slate-400">
                Média de Ganho / Média de Perda. Se o Payoff é <strong>2.0</strong>, significa que seu ganho médio é o dobro da sua perda média. Estratégias seguidoras de tendência costumam ter Payoff alto e Taxa de Acerto menor.
              </p>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Win Rate (Taxa de Acerto)</strong>
              <p className="text-sm text-slate-400">
                Porcentagem de dias (ou trades) que fecharam no positivo. Cuidado: Uma taxa de acerto de 90% pode quebrar se o Payoff for muito baixo (ganha de colherinha, perde de balde).
              </p>
            </div>
          </div>
        </section>

        {/* 2. GESTÃO DE RISCO */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">2. Risco & Drawdown</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 p-6 rounded-xl border-l-4 border-red-500">
              <h4 className="text-white font-bold text-lg">Maximum Drawdown (DD)</h4>
              <p className="text-slate-400 mt-1">
                A maior queda percentual ou financeira que a conta sofreu desde um topo histórico até o fundo subsequente. 
                <br/><span className="text-sm italic opacity-70">Exemplo: Se você tinha $10.000, caiu para $8.000 e depois subiu para $12.000, seu Drawdown foi de 20% ($2.000).</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <strong className="text-white block">VaR 95% (Value at Risk)</strong>
                <p className="text-sm text-slate-400 mt-2">
                  Uma estimativa estatística. Diz: "Com 95% de confiança, sua perda máxima em um único dia não passará deste valor". É o seu "limite de dor" diário esperado.
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <strong className="text-white block">Maior Perda Diária</strong>
                <p className="text-sm text-slate-400 mt-2">
                  O pior dia financeiro registrado no histórico. Diferente do VaR (que é teórico), este valor realmente aconteceu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ESTATÍSTICAS DE TEMPO & CONSISTÊNCIA */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">3. Tempo & Consistência</h3>
          </div>

          <ul className="space-y-4">
            <li className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="min-w-[150px]">
                <strong className="text-blue-400">Estagnação (Stagnation)</strong>
              </div>
              <div className="text-sm text-slate-300">
                Também conhecido como <em>Time to Recovery</em>. É o maior número de dias que o robô ficou "de lado" ou no prejuízo sem renovar a máxima histórica de lucro. 
                <br/><strong>Alerta:</strong> Estagnações maiores que 180 dias podem indicar que a estratégia parou de funcionar.
              </div>
            </li>
            <li className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="min-w-[150px]">
                <strong className="text-blue-400">CAGR</strong>
              </div>
              <div className="text-sm text-slate-300">
                <em>Compound Annual Growth Rate</em>. A taxa de crescimento anual composta. É a melhor forma de comparar a rentabilidade do robô com investimentos tradicionais (como CDI ou S&P500).
              </div>
            </li>
            <li className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="min-w-[150px]">
                <strong className="text-blue-400">Sample Error</strong>
              </div>
              <div className="text-sm text-slate-300">
                Desvio padrão dos retornos diários. Mede a volatilidade da curva. Quanto maior, mais "nervoso" é o gráfico de lucro.
              </div>
            </li>
          </ul>
        </section>

        {/* 4. DALIOBOT SCORE */}
        <section className="bg-slate-800/50 p-6 rounded-2xl border border-purple-500/30 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl text-white font-bold">DalioBot Score (0-10)</h3>
          </div>
          <p className="text-slate-300 mb-6">
            Nosso algoritmo proprietário que condensa todas as métricas acima em uma nota única para facilitar a decisão.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <span className="text-xs uppercase tracking-wider text-slate-500">Peso 35%</span>
              <strong className="block text-white mt-1">Retorno</strong>
              <p className="text-xs text-slate-400 mt-2">CAGR e Lucro Total</p>
            </div>
            <div className="text-center p-4 bg-slate-900 rounded-lg border border-purple-500/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
              <span className="text-xs uppercase tracking-wider text-purple-400 font-bold">Peso 45%</span>
              <strong className="block text-white mt-1">Risco</strong>
              <p className="text-xs text-slate-400 mt-2">Drawdown e VaR</p>
            </div>
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <span className="text-xs uppercase tracking-wider text-slate-500">Peso 20%</span>
              <strong className="block text-white mt-1">Estabilidade</strong>
              <p className="text-xs text-slate-400 mt-2">Sharpe e Volatilidade</p>
            </div>
          </div>
        </section>

      </div>
    )
  },

  'robots': {
    title: 'My Robots',
    icon: <Bot className="w-8 h-8 text-cyan-400" />,
    level: 'The Basics',
    description: 'A garagem das suas estratégias. Aprenda a catalogar, organizar e gerenciar seu portfólio de backtests em um único lugar.',
    content: (
      <div className="space-y-12 text-slate-300">
        
        {/* INTRODUÇÃO */}
        <section className="border-b border-slate-800 pb-8">
          <p className="lead text-lg text-slate-400 mb-6">
            A tela <strong>My Robots</strong> é o repositório central de todas as estratégias que você já testou e importou. 
            Pense nela como uma biblioteca organizada onde você pode comparar rapidamente o desempenho de diferentes robôs antes de mergulhar nos detalhes.
          </p>
          
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h4 className="flex items-center gap-2 text-white font-bold mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
              Resumo do Card
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              Cada robô é representado por um "Card" inteligente que resume os dados vitais do backtest importado:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Market</span>
                 <strong className="block text-white">Forex/Stocks</strong>
               </div>
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Total Balance</span>
                 <strong className="block text-green-400">R$ Profit</strong>
               </div>
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Profit Factor</span>
                 <strong className="block text-white">Ex: 1.54</strong>
               </div>
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Period</span>
                 <strong className="block text-white">Data Início - Fim</strong>
               </div>
            </div>
          </div>
        </section>

        {/* 2. GERENCIAMENTO E EDIÇÃO */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Settings className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">2. Gerenciamento e Organização</h3>
          </div>

          <p className="text-slate-400 mb-6">
            Manter suas estratégias organizadas é fundamental quando você começa a testar dezenas de variações. Utilize as ferramentas de edição para manter tudo em ordem.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-800 rounded-lg text-pink-400 border border-slate-700">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-white block mb-1">Editar Metadados</strong>
                  <p className="text-sm text-slate-400">
                    Clicando no ícone de lápis, você pode renomear a estratégia, categorizar o <strong>Mercado</strong> (Forex, Crypto, Indices), definir o <strong>Ativo</strong> (EURUSD, BTC, etc.) e o <strong>Tipo Operacional</strong> (Scalping, Swing, Day Trade).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-800 rounded-lg text-purple-400 border border-slate-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-white block mb-1">Excluir Estratégias</strong>
                  <p className="text-sm text-slate-400">
                    Remova testes antigos ou estratégias descartadas para limpar sua visualização. A exclusão é permanente e remove os dados da nuvem.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
               <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-purple-400" />
                 A Importância da Descrição
               </h4>
               <p className="text-sm text-slate-400 leading-relaxed">
                 No modal de edição, existe um campo de <strong>Descrição</strong>. Recomendamos fortemente que você use este espaço para anotar detalhes técnicos do setup, como:
               </p>
               <ul className="list-disc pl-5 mt-3 space-y-1 text-sm text-slate-500">
                 <li>Timeframe utilizado (H1, M15).</li>
                 <li>Indicadores principais (RSI, MA).</li>
                 <li>Motivo do teste ou hipótese.</li>
               </ul>
            </div>
          </div>
        </section>

        {/* 3. AÇÕES RÁPIDAS */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">3. Adicionando Estratégias</h3>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-6">
             <div className="flex-1">
               <p className="text-slate-300 mb-4">
                 O botão <strong>"+ Add a Strategy"</strong> é a porta de entrada. Ele redireciona você para a tela de Upload, onde o sistema processa automaticamente arquivos do MetaTrader 5:
               </p>
               <ul className="space-y-2 text-sm text-slate-400">
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Relatórios HTML (Backtest padrão).</li>
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Arquivos CSV/XLSX (Exportação de histórico).</li>
               </ul>
             </div>
             <div className="w-full md:w-auto">
               <button className="w-full md:w-auto bg-purple-600/20 text-purple-400 border border-purple-500/50 px-6 py-3 rounded-lg font-bold cursor-default">
                 + Add a Strategy
               </button>
             </div>
          </div>
        </section>

      </div>
    )
  },

  'library': {
    title: 'Setup Library',
    icon: <Library className="w-8 h-8 text-pink-400" />,
    level: 'The Basics',
    description: 'Seu repositório seguro. Armazene arquivos .set (configurações), versões de estratégias e documentação para nunca perder um parâmetro vencedor.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="mb-4">
            Quantas vezes você perdeu aquele "set" otimizado porque formatou o PC ou esqueceu onde salvou? A Library é sua nuvem pessoal para estratégias.
          </p>
        </section>
        
        <section>
          <h3 className="text-xl text-white font-bold mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-pink-400" />
            O que você pode salvar?
          </h3>
          <ul className="space-y-4">
            <li className="bg-slate-900/50 p-4 rounded border-l-2 border-pink-500">
              <strong className="text-white block">Arquivos .SET</strong>
              <p className="text-sm mt-1">Upload direto dos arquivos de configuração do MetaTrader. Você pode baixá-los em qualquer computador, a qualquer momento.</p>
            </li>
            <li className="bg-slate-900/50 p-4 rounded border-l-2 border-pink-500">
              <strong className="text-white block">Versionamento</strong>
              <p className="text-sm mt-1">Mantenha histórico: <em>"Estratégia Volatilidade v1.0"</em>, <em>"v1.2 (Ajuste Stop)"</em>. Nunca sobrescreva um set bom por acidente.</p>
            </li>
          </ul>
        </section>

        <section>
          <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg flex items-start gap-3">
             <BookOpen className="w-5 h-5 text-pink-400 flex-shrink-0 mt-1" />
             <p className="text-sm text-pink-100">
               <strong>Organização é Lucro:</strong> Recomendamos usar a Library para salvar o "Set Otimizado" logo após rodar o Optimizer. Assim, você mantém a fonte da sua estratégia segura.
             </p>
          </div>
        </section>
      </div>
    )
  },

  // --------------------------------------------------------------------------------
  // LEVEL 2: ANALYSIS & VALIDATION
  // --------------------------------------------------------------------------------
  'analysis': {
    title: 'Analysis',
    icon: <LineChart className="w-8 h-8 text-blue-400" />,
    level: 'Analysis & Validation',
    description: 'Auditoria profunda de backtests. Visualize métricas ocultas, identifique padrões de erro e valide a consistência antes de arriscar dinheiro real.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="lead text-lg text-slate-400 mb-4">
            O relatório padrão do MT5 é limitado. A ferramenta Analysis importa esses dados e aplica uma camada de inteligência visual.
          </p>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Funcionalidades Chave</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 hover:border-blue-500 transition">
              <strong className="text-blue-400 text-lg">1. Upload Multi-Formato</strong>
              <p className="mt-2 text-sm">
                Suportamos relatórios HTML (Backtest Report) e CSV (Exportação de Excel) do MetaTrader 5. Basta arrastar o arquivo para gerar os gráficos instantaneamente.
              </p>
            </div>
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 hover:border-blue-500 transition">
              <strong className="text-blue-400 text-lg">2. Gráfico de Dispersão Diária</strong>
              <p className="mt-2 text-sm">
                Visualize cada dia de operação como um ponto no gráfico. Isso ajuda a identificar <em>Outliers</em> (lucros ou perdas anormais) que podem distorcer a realidade da estratégia.
              </p>
            </div>
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 hover:border-blue-500 transition">
              <strong className="text-blue-400 text-lg">3. Análise de Consistência</strong>
              <p className="mt-2 text-sm">
                Verifique a distribuição de lucros mensais e anuais. Uma boa estratégia não deve depender de um único "mês de sorte" para ser lucrativa no ano.
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  },
  'monte-carlo': {
    title: 'Monte Carlo',
    icon: <Dices className="w-8 h-8 text-red-400" />,
    level: 'Analysis & Validation',
    description: 'Simulação de cenários alternativos. Embaralhamos a ordem dos seus trades milhares de vezes para descobrir o risco oculto da estratégia.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <div className="flex items-start gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-red-400 font-bold mb-1">Por que usar?</h4>
              <p className="text-sm text-red-100/80">
                O backtest mostra apenas <strong>uma</strong> sequência histórica de eventos. Mas o futuro pode apresentar esses mesmos eventos em uma ordem diferente, o que pode ser fatal para o seu capital.
              </p>
            </div>
          </div>
          <p>
            O simulador Monte Carlo reordena (embaralha) os retornos diários da sua estratégia 100, 500 ou 1.000 vezes, criando "universos paralelos" da sua performance.
          </p>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Interpretando os Resultados</h3>
          <ul className="space-y-4">
            <li className="bg-slate-900 p-4 rounded border-l-4 border-red-500">
              <strong className="text-white block text-lg">Cone de Probabilidade</strong>
              <p className="text-sm mt-1">
                O gráfico mostra várias linhas coloridas. A linha central é a média. As linhas superiores e inferiores mostram até onde sua estratégia pode chegar (para o bem ou para o mal) com <strong>95% ou 99% de confiança</strong>.
              </p>
            </li>
            <li className="bg-slate-900 p-4 rounded border-l-4 border-red-500">
              <strong className="text-white block text-lg">Drawdown Estimado</strong>
              <p className="text-sm mt-1">
                Muitas vezes, o Monte Carlo revela que seu Drawdown real pode ser 2x maior que o do backtest simplesmente mudando a ordem dos dias negativos. <strong>Esteja preparado para esse cenário.</strong>
              </p>
            </li>
          </ul>
        </section>
      </div>
    )
  },
  'optimizer': {
    title: 'Optimizer',
    icon: <Target className="w-8 h-8 text-green-400" />,
    level: 'Analysis & Validation',
    description: 'Encontre a robustez, não apenas o lucro máximo. Utilize mapas de calor e análise paramétrica para evitar o "Overfitting".',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="mb-4">
            Otimizar não é apenas encontrar o parâmetro que deu mais dinheiro. Isso geralmente leva ao <em>Overfitting</em> (ajuste excessivo ao passado). O Optimizer do DalioBot ajuda a encontrar <strong>zonas de estabilidade</strong>.
          </p>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Como utilizar?</h3>
          <ol className="list-decimal pl-5 space-y-4">
            <li>
              <strong>Importe os Resultados da Otimização:</strong> Exporte a tabela de otimização do MT5 (XML/CSV) e carregue aqui.
            </li>
            <li>
              <strong>Analise o Mapa de Calor (Heatmap):</strong>
              <p className="text-sm mt-1 text-slate-400">
                Procure por "manchas" verdes grandes e contínuas no gráfico. Isso indica que, mesmo se o mercado mudar um pouco (ou se você errar levemente o parâmetro), a estratégia continua lucrando.
              </p>
            </li>
            <li>
              <strong>Evite Picos Solitários:</strong>
              <p className="text-sm mt-1 text-slate-400">
                Se um parâmetro gera 500% de lucro, mas o parâmetro vizinho gera prejuízo, fuja! Isso é sorte, não robustez.
              </p>
            </li>
          </ol>
        </section>
      </div>
    )
  },

  // --------------------------------------------------------------------------------
  // LEVEL 3: EXECUTION & SCALING
  // --------------------------------------------------------------------------------
  'portfolios': {
    title: 'Portfolios',
    icon: <Briefcase className="w-8 h-8 text-yellow-400" />,
    level: 'Execution & Scaling',
    description: 'O poder da diversificação. Combine múltiplos robôs para suavizar a curva de capital e reduzir o risco global da conta.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="lead text-lg text-slate-400 mb-6">
            O "Santo Graal" do trading não é um robô perfeito, é um portfólio de robôs imperfeitos que se complementam.
          </p>
          
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center">
             <div className="flex-1">
               <h4 className="text-yellow-400 font-bold text-lg mb-2">Simulação Combinada</h4>
               <p className="text-sm">
                 Selecione 2, 3 ou 10 robôs da sua lista. O sistema irá somar as curvas de capital dia a dia. Muitas vezes, quando o Robô A perde, o Robô B ganha, mantendo seu saldo estável.
               </p>
             </div>
             <Layers className="w-16 h-16 text-slate-700" />
          </div>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Análise de Correlação</h3>
          <p className="mb-4">
            Para que a diversificação funcione, os robôs devem ser <strong>descorrelacionados</strong>.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <strong>Correlação Baixa/Negativa:</strong> Ideal. Os robôs operam de formas diferentes.
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <strong>Correlação Alta (perto de 1):</strong> Perigo. Se um perder, o outro também perderá, dobrando seu risco.
            </li>
          </ul>
        </section>
      </div>
    )
  },
  'realtime': {
    title: 'Realtime Monitor',
    icon: <Zap className="w-8 h-8 text-orange-400" />,
    level: 'Execution & Scaling',
    description: 'Conexão ao vivo. Monitore o que está acontecendo na sua conta MetaTrader 5 agora mesmo, sem precisar abrir o terminal.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="mb-4">
            O Realtime Monitor atua como uma ponte (Bridge) entre o servidor web do DalioBot e o seu terminal MT5 instalado no PC ou VPS.
          </p>
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
             <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
               <Activity className="w-4 h-4" /> Dados ao Vivo
             </h4>
             <ul className="list-disc pl-5 space-y-1 text-sm text-orange-100/80">
               <li>Lucro/Prejuízo (PnL) das posições abertas.</li>
               <li>Saldo e Equity atualizados instantaneamente.</li>
               <li>Latência da conexão (Ping).</li>
             </ul>
          </div>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Requisitos</h3>
          <p className="text-sm mb-4">
            Para que esta funcionalidade opere, você precisa instalar o <strong>Expert Advisor (EA) Ponte</strong> no seu MetaTrader 5 e ativar a opção "Allow WebRequest" nas configurações do terminal.
          </p>
          <p className="text-sm text-slate-400">
            <em>Nota: Esta funcionalidade depende de o terminal MT5 estar aberto e conectado à internet.</em>
          </p>
        </section>
      </div>
    )
  }
};

// ==================================================================================
// COMPONENTE DA PÁGINA (LÓGICA DE RENDERIZAÇÃO)
// ==================================================================================

export default function HelpArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Busca o artigo no objeto acima
  const article = articlesData[slug];

  // Fallback 404 Estilizado
  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Topbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Artigo não encontrado</h2>
          <p className="text-slate-400 mb-6">O tópico "{slug}" ainda não foi documentado ou não existe.</p>
          <Link href="/help" className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
            Voltar para o Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Topbar />

      {/* Mobile Toggle */}
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-purple-400 text-xl font-bold">☰</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`absolute md:static z-50 h-full bg-slate-900 border-r border-slate-800 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            {/* Breadcrumb / Navigation */}
            <Link href="/help" className="group inline-flex items-center text-slate-400 hover:text-purple-400 mb-8 transition-colors">
              <div className="bg-slate-800 p-2 rounded-full mr-3 group-hover:bg-purple-500/20 transition-colors">
                 <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Voltar para Help Center</span>
            </Link>

            {/* Cabeçalho do Artigo */}
            <div className="mb-10 pb-10 border-b border-slate-800">
              <span className="inline-block text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 mb-6">
                {article.level}
              </span>
              
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center shadow-lg shadow-black/20">
                  {article.icon}
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{article.title}</h1>
                    <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
                        {article.description}
                    </p>
                </div>
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-6 md:p-10">
                  {/* Renderização do Conteúdo JSX */}
                  <div className="prose prose-invert prose-purple max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300">
                      {article.content}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer de Ajuda */}
            <div className="mt-12 bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                <h4 className="text-white font-semibold mb-2">Ainda tem dúvidas sobre {article.title}?</h4>
                <p className="text-slate-400 text-sm mb-6">Nossa equipe técnica pode ajudar a analisar seu caso específico.</p>
                <div className="flex justify-center gap-4">
                    <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition text-sm font-medium">
                        Ver Tutoriais em Vídeo
                    </button>
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition text-sm font-medium shadow-lg shadow-purple-500/20">
                        Contatar Suporte
                    </button>
                </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}