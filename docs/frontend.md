# DOCUMENTAÇÃO DO FRONTEND

Esta seção detalha a arquitetura da interface do usuário do DalioBot. O frontend é construído sobre o framework **Next.js 14** utilizando a arquitetura **App Router**, priorizando a performance, a renderização do lado do servidor (SSR) onde possível, e interatividade rica do lado do cliente (Client Components) para as ferramentas de análise quantitativa.

## STACK TECNOLÓGICO

- **Framework**: Next.js 14 (React 18)
- **Linguagem**: TypeScript (.tsx, .ts) e JavaScript (.js)
- **Estilização**: Tailwind CSS (Utility-first)
- **Componentes de UI**: Shadcn/UI (baseado em Radix UI) e componentes customizados
- **Ícones**: Heroicons, React Icons (Fa), Lucide React
- **Gráficos**: Recharts (para curvas de equity, drawdowns e histogramas)
- **Gerenciamento de Estado**: React Context API (AuthContext) + Hooks locais (useState, useReducer, useEffect)

## ESTRUTURA DE DIRETÓRIOS (APP ROUTER)

O projeto segue a convenção de roteamento baseada em arquivos do Next.js dentro da pasta `app/`.

| Caminho                      | Responsabilidade (Página/Rota)                          |
|------------------------------|---------------------------------------------------------|
| `app/layout.js`              | Root Layout. Define fontes (Inter), meta tags globais, CSS global e envolve a aplicação no AuthContext          |
| `app/page.js`                | Landing Page. Página pública inicial                    |
| `app/add/page.tsx`           | Upload de Estratégia. Parser de HTML do MT5             |
| `app/dashboard/page.tsx`     | Painel Principal. Visão geral do backtestr do EA        |
| `app/montecarlosimulation/`  | Ferramenta de Simulação Monte Carlo                     |
| `app/analise/page.tsx`       | Detalhes da Estratégia. Métricas avançadas              |
| `app/portfolios/page.tsx`    | Gestão de Portfólio                                     |
| `app/optimizer/page.tsx`     | Otimizador de portfólio                                 |
| `app/realtime/page.tsx`      | Monitoramento em Tempo Real (Bridge MT5)                |
| `app/login/ & app/cadastro/` | Autenticação                                            |
| `app/profile/ & app/settings/` | Configurações e perfil                               |
| `app/help/`                  | Central de Ajuda                                        |

## LÓGICA DE COMPONENTES CHAVE

### PARSER DE ESTRATÉGIAS (CLIENT-SIDE)

**Arquivo**: `app/add/page.tsx`

O DalioBot processa os relatórios HTML do MetaTrader 5 diretamente no navegador do usuário para garantir velocidade e privacidade.

**Tecnologia**: DOMParser API

**Fluxo de Execução**:
1. Usuário arrasta arquivo `.html` (react-dropzone)
2. Lê como string de texto (FileReader)
3. DOMParser converte para documento HTML virtual
4. **Scraping** extrai metadados e tabela de Deals
5. JSON estruturado é enviado para Firebase via `set()`

### SIMULAÇÃO DE MONTE CARLO (WEB WORKERS)

**Arquivos**: `app/montecarlosimulation/page.tsx`, `montecarloworker.tsx`, `riskcalculatorworker.tsx`

**Arquitetura**:
UI (page.tsx) → postMessage() → Worker → onmessage() → Gráficos Atualizados

1. UI coleta parâmetros (Risco %, Nº Simulações, Dados dos Trades)
2. Instancia `new Worker(...)` em thread separada
3. Worker processa cálculos intensivos (Shuffle, Reamostragem)
4. Retorna: Worst Case, Best Case, Median

### DASHBOARD E COMPONENTES DE UI

**Localização**: `components/`

- `components/ui/card.tsx`: Bloco fundamental para métricas e gráficos
- `components/sidebar.js & topbar.tsx`: Navegação responsiva
- `components/UploadPopup.tsx`: Modal reutilizável
- `components/Dashboard.jsx`: Visão inicial agregada

## GERENCIAMENTO DE ESTADO E AUTENTICAÇÃO

### CONTEXTO DE AUTENTICAÇÃO (AUTHCONTEXT)

**Arquivo**: `src/context/authcontext.tsx`

Envolve toda aplicação em `app/layout.js`.

**Responsabilidades**:
- Inicializa Firebase Auth
- Escuta `onAuthStateChanged`
- Fornece `useAuth()` hook global

### PROTEÇÃO DE ROTAS (CLIENT-SIDE)

```js
const { user, loading } = useAuth();
const router = useRouter();

useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
}, [user, loading, router]);
```

## ESTILIZAÇÃO E DESIGN SYSTEM

- **Tailwind CSS**: Utility-first com bundle pequeno
- **Configuração**: `tailwind.config.js` (slate-900, purple-600, emerald-500)
- **Responsividade**: `sm:`, `md:`, `lg:`, `xl:`
- **Utilitários**: `lib/utils.ts` com `cn()` (clsx + tailwind-merge)

## INTEGRAÇÃO COM FIREBASE (CAMADA CLIENTE)

**Arquivo**: `src/firebase.js`

| Operação              | Método Firebase                  | Uso                                      |
|-----------------------|----------------------------------|------------------------------------------|
| **Leitura Única**     | `get(child(ref(db), path))`      | Perfis, configurações estáticas          |
| **Leitura Real-Time** | `onValue(ref(db), callback)`     | Dashboard, Bridge (WebSockets)           |
| **Escrita Completa**  | `set()`                          | Nova estratégia                          |
| **Escrita Parcial**   | `update()`                       | Modificar campos específicos             |
| **Storage**           | `uploadBytes()`                  | Imagens, relatórios grandes              |

## VISUALIZAÇÃO DE DADOS (GRÁFICOS)

**Biblioteca**: Recharts (declarativa + React)

| Tipo de Gráfico     | Uso                                      |
|---------------------|------------------------------------------|
| `LineChart`         | Equity Curve, Balance, Drawdown          |
| `BarChart`          | Distribuição mensal, Monte Carlo         |
| `ComposedChart`     | Volume + Preço combinados                |

**Otimização**: Downsampling para datasets >10k trades