# Arquitetura do Sistema - DalioBot

## 1. Visão Geral do Sistema

O **DalioBot** é uma plataforma SaaS (Software as a Service) projetada para análise quantitativa de estratégias de trading. O sistema opera sob uma arquitetura **Serverless** e **Event-Driven** (orientada a eventos), focada em alta disponibilidade e escalabilidade automática.

O núcleo da aplicação é construído sobre o **Next.js 14** (App Router), utilizando o paradigma Fullstack onde o frontend e a camada de API residem no mesmo repositório, mas são executados em ambientes distintos (Browser e Node.js Runtime/Edge).

### Principais Características Arquiteturais:
- **Serverless Compute:** Não há servidores fixos para gerenciar. As APIs rodam como funções lambda (Next.js API Routes).
- **Client-Side Heavy Processing:** Para reduzir custos de servidor e latência, o processamento pesado (parsing de arquivos HTML e cálculos estatísticos como Correlação e Monte Carlo) é delegado ao navegador do cliente.
- **Real-time Data:** A persistência e sincronização de dados utilizam WebSockets via Firebase Realtime Database.

## 2. Fluxo de Ingestão de Dados (ETL Client-Side)

Diferente de sistemas tradicionais que processam arquivos no backend, o DalioBot realiza a extração, transformação e carregamento (ETL) diretamente no navegador do usuário para garantir privacidade e velocidade.

### 2.1. Upload e Parsing (Add Strategy)
1. **Input:** O usuário fornece um arquivo `.html` (Relatório de Backtest do MetaTrader 5).
2. **Parsing (DOM Parser):** O navegador lê o arquivo como texto e utiliza o `DOMParser` para interpretar a estrutura HTML.
3. **Extração de Métricas:**
   * **Métricas de Cabeçalho:** Extrai dados sumarizados como *Total Net Profit*, *Drawdown*, *Profit Factor*, *Sharpe Ratio* identificando labels em múltiplos idiomas (PT-BR/EN).
   * **Dados de Transação (Deals):** Localiza a tabela de transações e itera sobre as linhas para construir um JSON array.
4. **Normalização:** Os dados brutos são convertidos para um formato JSON padronizado com chaves específicas (ex: `<DATE>`, `<BALANCE>`, `<EQUITY>`) para manter compatibilidade com a estrutura de dados legada e garantir precisão numérica.
5. **Persistência:** O objeto JSON final é enviado diretamente para o Firebase Realtime Database sob o nó `estrategias/{userId}/{strategyName}`.

## 3. Motor de Portfólio e Dashboard

A lógica de renderização do dashboard é responsável por consolidar múltiplas estratégias individuais em uma visão unificada.

### 3.1. Fetching e Reconstrução
* O sistema busca os metadados do portfólio em `portfolios/{userId}/{portfolioId}`.
* Em paralelo, busca os dados brutos de cada estratégia vinculada em `estrategias/{userId}/{strategyId}`.

### 3.2. Normalização e Consolidação (Bridge)
Como os dados salvos possuem o formato de relatório HTML (chaves com brackets `< >`), o Dashboard possui uma camada de adaptação que:
1. **Normaliza:** Converte chaves como `<DATE>` e `<BALANCE>` para propriedades padrão (`DATE`, `BALANCE`).
2. **Reconstrói a Linha do Tempo:** Cria uma "Master Timeline" combinando todas as transações de todas as estratégias ordenadas cronologicamente.
3. **Cálculo de Equity Combinado:** Recalcula o saldo acumulado dia a dia, somando o resultado líquido de cada trade individual ao saldo inicial consolidado.

### 3.3. Cálculo Estatístico On-the-Fly
As métricas avançadas não são pré-calculadas no banco, mas geradas em tempo real ao carregar o dashboard:
* **Correlação de Pearson:** Matriz calculada comparando os retornos diários das estratégias selecionadas.
* **Monte Carlo:** Simulação estocástica baseada na média e desvio padrão dos retornos históricos.
* **Risco (VaR):** Cálculo de Value at Risk e análise de Drawdown máximo.

## 4. Estrutura de Dados (Firebase NoSQL)

O banco de dados segue uma estrutura hierárquica baseada em JSON:

```jsonc
{
    "users": {
    "uid": { "email": "...", "plano": "..." }
    },
    "estrategias": {
    "uid": {
    "strategyName": {
    "nome": "String",
    "mercado": "String",
    "dadosCSV": [
{ "<DATE>": "YYYY-MM-DD", "<BALANCE>": "1000.00", "<EQUITY>": "1000.00" },

],
"metrics": { "fatorLucro": 1.5, "drawdown": 1000, ... }
}
}
},
"portfolios": {
"uid": {
"portfolioId": {
"nomePortfolio": "String",
"robos": ["strategyName1", "strategyName2"],
"dataCriacao": "ISOString"
}
}
}
}
```

## 5. Stack Tecnológico
- **Frontend Framework:** Next.js 14 (React)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + Shadcn/ui
- **Visualização de Dados:** Recharts (Gráficos compostos, Scatter e Linhas)
- **Autenticação & DB:** Firebase (Auth e Realtime Database)
- **Manipulação de Arquivos:** React Dropzone + HTML DOM Parser API

## 6. Segurança
- **Autenticação:** Gerenciada via Context API (authcontext.tsx) integrada ao Firebase Auth.
- **Proteção de Rotas:** Hooks de verificação de sessão impedem acesso a páginas protegidas (/dashboard, /add) sem login.
- **Segregação de Dados:** Regras de segurança do Firebase garantem que usuários só possam ler/escrever em nós que contêm seu próprio uid.

---

### O que foi adicionado/corrigido:

1. **Seção 2 (Fluxo de Ingestão):** Expliquei explicitamente que agora o sistema faz o parsing de HTML (DOM Parser) e não apenas leitura de CSV. Isso é crucial para entender o `add/page.tsx`.
2. **Seção 3 (Motor de Portfólio):** Documentei a "Bridge" que criamos no `dashboardportfolio/page.tsx`, explicando como o sistema lida com as chaves `<DATE>` e consolida múltiplas estratégias.
3. **Seção 4 (Estrutura de Dados):** Atualizei o exemplo do JSON para mostrar o formato real que está sendo salvo (`<DATE>`, `<BALANCE>`), que é diferente do CSV padrão.
4. **Seção 5 (Stack):** Adicionei as bibliotecas específicas que você usa (Recharts, Shadcn/ui).