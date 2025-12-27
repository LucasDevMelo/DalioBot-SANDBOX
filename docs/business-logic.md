# REGRAS DE NEGÓCIO E LÓGICA DE PROCESSAMENTO

Este documento descreve a lógica interna ("Business Logic") dos principais módulos do DalioBot. Ele explica como os dados são transformados, validados e processados desde a entrada (Upload/Bridge) até a visualização.

## PROCESSAMENTO DE RELATÓRIOS (BACKTEST PARSER)

**Local**: `app/add/page.tsx`

O DalioBot não armazena o arquivo HTML bruto do MetaTrader 5. Em vez disso, realizamos um processo de ETL (Extract, Transform, Load) diretamente no navegador do cliente (Client-Side Parsing).

### REGRAS DE EXTRAÇÃO (SCRAPING LOCAL)

O sistema lê o DOM do arquivo HTML carregado e busca por chaves específicas em Português e Inglês.

**Identificação de Campos**: O parser procura por células (`<td>`) contendo labels como:
- Lucro Líquido Total / Total Net Profit
- Rebaixamento Máximo / Maximal Drawdown  
- Fator de Lucro / Profit Factor
- Tabela de Transações (Deals): O sistema localiza a tabela "Deals" (ou "Transações") para extrair o histórico trade-a-trade.

**Filtro**: Linhas que não contêm dados numéricos de saldo são descartadas.

**Normalização de Data**: Converte formatos `YYYY.MM.DD HH:MM` para ISO String.

**Normalização Numérica**: Remove espaços (ex: `10 000.00 -> 10000.00`) e converte vírgulas em pontos decimais.

### VALIDAÇÃO DE ENTRADA

Antes de salvar no Firebase, o sistema valida:
- Se o arquivo é um `.html` ou `.htm`.
- Se a tabela de "Deals" existe e não está vazia.
- Se o Saldo Inicial pode ser detectado.

## MOTOR DE SIMULAÇÃO DE MONTE CARLO

**Local**: `app/montecarlosimulation/`

A simulação é utilizada para testar a robustez de uma estratégia, aplicando variações estatísticas sobre o histórico de trades original.

### ARQUITETURA DE PROCESSAMENTO (WEB WORKERS)

Devido à alta carga computacional (ex: 2.000 simulações x 1.000 trades = 2 milhões de iterações), a lógica roda em uma **Thread Separada (Web Worker)** para não travar a interface do usuário.

### ALGORITMO DE SIMULAÇÃO

O método utilizado é o **Resampling (Reamostragem)** com ou sem reposição (configurável), também conhecido como **Bootstrapping**.

**Input**: Array de Lucro/Prejuízo (PnL) de cada trade da estratégia original.

**Embaralhamento (Shuffle)**: O algoritmo (Fisher-Yates) reordena aleatoriamente a sequência de trades.

**Recálculo**: Para cada nova sequência gerada, calcula-se:
- Nova Curva de Capital (Equity Curve)
- Novo Drawdown Máximo
- Novo Lucro Final

**Output Estatístico**: O sistema agrega os resultados para definir intervalos de confiança:
- **Best Case** (Melhor 5%)
- **Worst Case** (Pior 5% - VaR)
- **Median** (Média provável)

## GESTÃO DE PORTFÓLIOS

**Local**: `app/portfolios/` e `app/optimizer/`

Permite ao usuário combinar múltiplas estratégias para analisar a correlação e o desempenho conjunto.

### LÓGICA DE COMBINAÇÃO

O sistema não apenas soma os saldos finais. Ele realiza a **Sincronização Temporal** das estratégias:

- **Normalização de Tempo**: Cria uma linha do tempo mestre que abrange o início da estratégia mais antiga até o fim da mais recente.
- **Merge de Deals**: Agrupa transações de diferentes robôs que ocorreram no mesmo período.
- **Cálculo de Drawdown Combinado**: O drawdown é recalculado baseando-se na soma do equity diário de todos os robôs. Isso revela se os robôs perdem dinheiro simultaneamente (alta correlação positiva) ou se compensam perdas (correlação negativa/descorrelação).

## BRIDGE EM TEMPO REAL (MT5)

**Local**: `app/api/mt5-bridge/`

A lógica de recepção de dados em tempo real prioriza a velocidade e a consistência do estado.

### IDENTIFICAÇÃO ÚNICA

Um robô é unicamente identificado pela composição: **ID = User_UID + Magic_Number**

Isso impede que dois usuários com o mesmo "Magic Number" (comum em EAs baixados da internet) colidam seus dados no banco.

### LÓGICA DE ATUALIZAÇÃO (UPSERT)

O sistema opera em modo **Upsert (Update or Insert)**:
- Se o nó do robô não existe no Firebase, ele é criado com o saldo inicial informado.
- Se já existe, apenas o Balance, Equity e o array de Deals são atualizados.

**Heartbeat**: Mesmo sem novos trades, o EA envia atualizações periódicas de Equity para manter o gráfico de "Floating PnL" vivo no dashboard.

## REGRAS DE ACESSO E PLANOS (SAAS)

**Integração**: Paddle e Middleware

### HIERARQUIA DE ACESSO

O acesso às funcionalidades é controlado via Claims no token de autenticação ou verificação no banco de dados:

| Plano                   | Funcionalidades                                                                                        |
|-------------------------|--------------------------------------------------------------------------------------------------------|
| **Visitante**           | Acesso apenas à Home e Login                                                                           |
| **Usuário Free/Trial**  | Upload de até X estratégias (definido na env/config). Acesso limitado ao Monte Carlo (menos iterações) |
| **Usuário Pro/Premium** | Uploads ilimitados. Acesso total ao Otimizador de Portfólio. Conexão via Bridge MT5 permitida          |

### CICLO DE VIDA DA ASSINATURA

- **Past Due**: Se o pagamento falhar, o sistema entra em Grace Period (configurável no Paddle), mas o DalioBot pode bloquear novas inserções de dados imediatamente, mantendo apenas leitura.
- **Cancelamento**: O acesso permanece "Pro" até o fim do ciclo de faturamento atual (`next_bill_date`).
