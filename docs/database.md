# ESTRUTURA DO BANCO DE DADOS (FIREBASE REALTIME DB)

O DalioBot utiliza o **Firebase Realtime Database**, um banco de dados NoSQL hospedado na nuvem. Os dados são armazenados como uma grande árvore JSON.

Esta documentação descreve o esquema de dados ("Schema"), as chaves principais e os tipos de dados esperados para cada nó.

## VISÃO GERAL DA ÁRVORE

A raiz do banco de dados é dividida em quatro coleções principais:

- `/users`: Perfis de usuários e status de assinatura
- `/strategies`: Dados estáticos de backtests importados (antigo `/estrategias`)
- `/robots`: Dados em tempo real vindos da Bridge MT5
- `/portfolios`: Agrupamentos lógicos de estratégias

## USUÁRIOS (/USERS)

**Caminho**: `/users/{userId}`

Armazena informações de identificação e status comercial (SaaS) do usuário.

```jsonc
{
  "userId": "JzK9sTv...",
  "email": "trader@email.com",
  "name": "John Doe",
  "photoUrl": "https://...",
  "createdAt": "2023-10-27T...",
  "subscription": {
    "status": "active",
    "planId": "pro_monthly",
    "customerId": "ctm_12345",
    "nextBillDate": "2023-11-27",
    "updatePaymentUrl": "https://..."
  },
  "settings": {
    "theme": "dark",
    "language": "en"
  }
}
```

## ESTRATÉGIAS (/STRATEGIES)

**Caminho**: `/strategies/{userId}/{strategyName}`  
**Nota de Migração**: Anteriormente chamado de `/estrategias`.

Armazena os relatórios de backtest enviados pelo usuário via upload de HTML. Estes dados são estáticos após a criação.

```jsonc
{
  "id": "strategy_uuid_v4...",
  "name": "Forex Scalper V1",
  "market": "Forex",
  "asset": "EURUSD",
  "type": "Scalping",
  "description": "Estratégia baseada em RSI...",
  "createdAt": "2023-10-27T...",
  "initialDeposit": 10000.00,
  "totalBalance": 1500.00,
  "profitFactor": 1.5,
  "drawdown": 120.50,
  "drawdownPercent": 1.2,
  "totalTrades": 150,
  "winRate": 65.5,
  "csvData": [
    {
      "<DATE>": "2023-01-01",
      "<BALANCE>": "10050.00",
      "<EQUITY>": "10050.00",
      "<DEPOSIT LOAD>": "0.1"
    }
  ]
}
```

## ROBÔS EM TEMPO REAL (/ROBOTS)

**Caminho**: `/robots/{userId}/{magicNumber}`

Armazena o estado atual dos Expert Advisors conectados via Bridge. Estes dados são atualizados frequentemente (alta frequência de escrita).

```jsonc
{
  "magicNumber": 123456,
  "name": "Live Scalper",
  "broker": "IC Markets",
  "account": 99887766,
  "symbol": "EURUSD",
  "status": "running",
  "lastUpdate": 1698415000,
  "metrics": {
    "balance": 5200.00,
    "equity": 5250.00,
    "dailyProfit": 50.00,
    "totalProfit": 200.00
  },
  "deals": {
    "ticket_987654": {
      "type": "buy",
      "volume": 0.1,
      "price": 1.0800,
      "time": "2023-10-27 10:00:00",
      "profit": 5.00
    }
  }
}
```

## PORTFÓLIOS (/PORTFOLIOS)

**Caminho**: `/portfolios/{userId}/{portfolioId}`

Agrupa múltiplas estratégias para análise de correlação. Este nó armazena apenas referências e configurações, não duplica os dados brutos das estratégias.

```jsonc
{
  "id": "port_uuid_v4...",
  "name": "Forex Aggressive Mix",
  "createdAt": "2023-10-27T...",
  "strategyIds": [
    "Forex Scalper V1",
    "Gold Swing V2"
  ],
  "stats": {
    "totalNetProfit": 3000.00,
    "maxDrawdownCombined": 500.00,
    "correlationMatrix": [
      [1.0, 0.2],
      [0.2, 1.0]
    ]
  }
}
```

## REGRAS DE SEGURANÇA (FIREBASE RULES)

Para garantir a integridade dos dados, as seguintes regras devem ser aplicadas no Console do Firebase:

```jsonc
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "strategies": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "robots": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "portfolios": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

