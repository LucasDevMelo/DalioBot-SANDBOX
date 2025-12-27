# Arquitetura do Sistema - DalioBot

## 1. Visão Geral do Sistema

O **DalioBot** é uma plataforma SaaS (Software as a Service) projetada para análise quantitativa de estratégias de trading. O sistema opera sob uma arquitetura **Serverless** e **Event-Driven** (orientada a eventos), focada em alta disponibilidade e escalabilidade automática.

O núcleo da aplicação é construído sobre o **Next.js 14** (App Router), utilizando o paradigma Fullstack onde o frontend e a camada de API residem no mesmo repositório, mas são executados em ambientes distintos (Browser e Node.js Runtime/Edge).

### Principais Características Arquiteturais:
- **Serverless Compute:** Não há servidores fixos para gerenciar. As APIs rodam como funções lambda (Next.js API Routes).
- **Client-Side Heavy Processing:** Para reduzir custos de servidor e latência, o processamento pesado (parsing de arquivos e simulações matemáticas) é delegada ao navegador do cliente via Web Workers.
- **Real-time Data:** A persistência e sincronização de dados utilizam WebSockets via Firebase Realtime Database.

