# Documentação da API Backend

Este documento serve como referência técnica central para as **Rotas de API Serverless** localizadas no diretório `app/api/`. Estas rotas atuam como a ponte de comunicação crítica entre serviços externos (MetaTrader 5), o frontend da aplicação e a camada de persistência de dados (Firebase Realtime Database).

## Configurações Globais

- **URL Base**: `/api` (Relativo ao domínio da aplicação, ex: `https://daliobot.com/api`)
- **Ambiente de Execução**: Node.js (Next.js App Router)
- **Fuso Horário**: UTC para todos os registros de data e hora (timestamps)
- **Formato de Dados**: JSON é o padrão para troca de dados (exceto para endpoints de upload)

## 1. MetaTrader 5 Bridge (Ponte de Dados)

**Rota**: `POST /api/mt5-bridge`

Este é o endpoint mais crítico do ecossistema DalioBot. Ele é responsável pela ingestão de dados de trading em tempo real, recebendo eventos de transação diretamente dos **Expert Advisors (EAs)** que rodam nos terminais MetaTrader 5 dos usuários.

### Headers Obrigatórios

| Chave        | Valor             | Descrição                                      |
|--------------|-------------------|------------------------------------------------|
| Content-Type | application/json  | Define o corpo da requisição como JSON         |
| User-Agent   | MetaTrader 5      | Recomendado para fins de auditoria e logs      |

### Corpo da Requisição (JSON Payload)

O Expert Advisor (EA) deve enviar um objeto JSON seguindo estritamente a estrutura abaixo a cada evento de negociação:

"""json
{
"magic_number": 123456, // ID numérico único da estratégia no MT5
"user_token": "firebase_uid...", // UID do usuário no Firebase (Token de Autenticação)
"broker": "IC Markets", // Nome da Corretora
"account": 100200300, // Número da conta MT5
"symbol": "EURUSD", // Ativo operado
"balance": 10500.00, // Saldo atual da conta
"equity": 10450.00, // Capital líquido atual (Equity)

// Detalhes da Transação (Deal) - Opcional se for apenas um heartbeat
"ticket": 987654321, // Ticket da ordem/deal
"type": "buy", // Tipo da operação: 'buy' ou 'sell'
"volume": 0.1, // Volume (Lotes)
"price": 1.0850, // Preço de execução
"profit": 5.20, // Lucro líquido (apenas para ordens fechadas)
"time": "2023-10-27 14:30:00" // Horário do Servidor (YYYY-MM-DD HH:MM:SS)
}

text

### Lógica de Processamento

1. **Validação**: O sistema verifica imediatamente se `user_token` e `magic_number` estão presentes
2. **Roteamento no Banco**: Os dados são gravados no nó específico: `robots/{user_token}/{magic_number}`
3. **Persistência de Dados**:
   - Atualiza o objeto de Resumo (Saldo, Equity, Última Atualização)
   - Adiciona a transação ao histórico de Deals (transações) para plotagem de gráficos de performance

### Respostas HTTP

| Código | Descrição                                      |
|--------|------------------------------------------------|
| 200 OK | Dados recebidos, validados e processados com sucesso |
| 400 Bad Request | JSON malformado ou campos obrigatórios ausentes |
| 500 Internal Server Error | Falha de conexão com o Firebase ou erro interno de processamento |

## 2. Gestão de Robôs (API Interna)

**Rota**: `GET /api/robos`

Recupera uma lista consolidada de todas as estratégias (robôs) ativas de um usuário específico. Este endpoint é utilizado principalmente pelo Dashboard para renderização server-side (SSR) ou em cenários onde conexões WebSocket diretas não são ideais.

### Parâmetros de Consulta (Query Params)

| Parâmetro | Tipo  | Obrigatório | Descrição                                          |
|-----------|-------|-------------|----------------------------------------------------|
| `userId`  | string| Sim         | O UID do usuário no Firebase (identificador único) |

### Exemplo de Resposta (JSON)

{
  "robots": [
    {
      "id": "123456",
      "name": "Forex Scalper V1",
      "symbol": "EURUSD",
      "status": "running",
      "metrics": {
        "balance": 5000.00,
        "equity": 5120.50,
        "profit_today": 120.50
      }
    }
  ]
}

### Respostas HTTP

| Código | Descrição                                                 |
|--------|-----------------------------------------------------------|
| 200 OK | Retorna o array de robôs encontrado                       |
| 400 Bad Request | Parâmetro `userId` não fornecido na query string |
| 404 Not Found | Nenhum robô encontrado para o usuário especificado |

