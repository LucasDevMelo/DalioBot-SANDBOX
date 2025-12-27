# DalioBot - Plataforma de Trading Quantitativo

O **DalioBot** é uma plataforma SaaS voltada para traders quantitativos, permitindo o upload de backtests (HTML do MT5), análise de métricas, criação de portfólios e simulações avançadas (Monte Carlo).

## 🚀 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Shadcn/UI.
- **Linguagem:** TypeScript (predominante) e JavaScript.
- **Backend (Serverless):** Next.js API Routes.
- **Database:** Firebase Realtime Database.
- **Auth:** Firebase Authentication + Context API customizado.
- **Performance:** Web Workers para cálculos pesados (Monte Carlo).

## ⚡ Quick Start

1. **Clone o repositório:**
   \`\`\`bash
   git clone [url-do-repo]
   \`\`\`

2. **Instale as dependências:**
   \`\`\`bash
   npm install
   # ou
   yarn install
   \`\`\`

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo \`.env.local\` (veja \`docs/setup.md\` para detalhes).

4. **Rode o servidor de desenvolvimento:**
   \`\`\`bash
   npm run dev
   \`\`\`

Acesse \`http://localhost:3000\`.

## 📚 Documentação

A documentação detalhada para desenvolvedores encontra-se na pasta \`/docs\`:

- [Setup e Instalação](docs/setup.md)
- [Arquitetura do Sistema](docs/architecture.md)
- [Frontend e Componentes](docs/frontend.md)
- [Backend e APIs](docs/backend-api.md)
- [Banco de Dados (Firebase)](docs/database.md)