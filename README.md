# Finanças

Aplicação de finanças pessoais em React, TypeScript e Firebase (Auth e Firestore).

## Arrancar

```bash
npm install
cp .env.example .env.local   # preencher com os valores da consola Firebase
npm run dev
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Valida os tipos e gera `dist/` |
| `npm test` | Testes (Firebase simulado em memória, sem rede) |
| `npm run lint` | ESLint |

A app usa rotas reais (`/despesas`, etc.). No alojamento, todos os caminhos têm de servir `index.html`; no Firebase Hosting isso faz-se com `"rewrites": [{ "source": "**", "destination": "/index.html" }]`.

## Arquitetura

```
src/
  app/        Composição: providers e rotas
  features/   Uma pasta por domínio
    accounts, transactions, budgets, investments, reports, settings, auth
    dashboard Página principal
    finance   Cálculos e dados que cruzam domínios (património, posições sem conta)
    shell     Sidebar, navegação mobile e cabeçalho das páginas
  shared/     Código sem conhecimento de domínio
    firebase/ Inicialização do Firebase
    auth/     Sessão atual (useSession, useUid)
    data/     Repositório genérico de coleções e hooks de dados
    ui/       Drawer, feedback (avisos, confirmação), formulários, estados, gráficos
    lib/      Formatação, datas, períodos, CSV, tema
  styles/     Tokens de design e estilos globais
```

- **Dependências num só sentido:** `app` → `features` → `shared`. `shared` nunca importa de `features`.
- **O Firestore fica nos repositórios.** Os componentes usam hooks; os hooks usam repositórios.
- **Regras de negócio são funções puras** e estão testadas em `features/finance/domain.test.ts`.
- **Dados do servidor ficam no TanStack Query.** As chaves incluem o `uid` e a cache é limpa ao terminar sessão.
- **Escritas que alteram vários documentos são atómicas** (`runTransaction`, `writeBatch`).

## Modelo de dados

Tudo fica em `users/{uid}/...`.

| Coleção | Conteúdo | Origem |
| --- | --- | --- |
| `accounts` | Saldo em `value`; campos novos `type`, `archived`, `excludeFromNetWorth`, `notes` | Existente |
| `expenses`, `income` | Movimentos; campos novos `notes` e, nas receitas, `category`, `accountId` | Existentes |
| `investments` | Posições; campos novos `ticker`, `assetType`, `quantity`, `avgPrice`, `currency`, `accountId` | Existente |
| `transfers` | Transferências entre contas | Nova |
| `budgets` | Limite mensal por categoria | Nova |
| `investmentOperations` | Compras e vendas | Nova |
| `investmentValuations` | Valor de uma posição numa data | Nova |
| `netWorthSnapshots` | Património de cada mês (id `AAAA-MM`) | Nova |

### Migração

Não há migração de dados. Os documentos antigos são adaptados na leitura (`accountFromDoc`, `transactionFromDoc`, `positionFromDoc`) e só ganham campos novos quando são editados. `category` nas contas nunca é reescrita.

As **regras de segurança** têm de permitir as coleções novas. O ficheiro `firestore.rules` restringe cada utilizador ao seu `uid` e publica-se com `firebase deploy --only firestore:rules`. Compara-o primeiro com as regras atuais na consola Firebase.

### Regras de cálculo

- **Património líquido** = ativos − passivos, só com contas ativas e não excluídas.
- **Corretora com posições associadas** vale a soma das posições; sem posições, vale o saldo. Posições sem conta ficam fora do património e são assinaladas, para nunca haver dupla contagem.
- **Saldo disponível** = contas à ordem + dinheiro.
- **Transferências** nunca contam como receita ou despesa.
- **Compras e vendas** usam custo médio e não alteram saldos de contas. Os totais são em EUR, sem conversão automática.

## Antes de escalar para negócio

1. **Valores em cêntimos inteiros.** Hoje são decimais, com arredondamento na escrita. Exige migrar os dados.
2. **Lógica financeira no servidor.** Os saldos são calculados no cliente; com clientes reais devem passar para Cloud Functions ou uma API.
3. **Testes das regras do Firestore** com o emulador, e validação de campos nas regras.
4. **Paginação no servidor.** Cada lista carrega a coleção inteira.
5. **Conformidade (RGPD).** Exportação completa, eliminação de conta e auditoria.
6. **Operação.** CI/CD, ambientes separados, monitorização de erros e recuperação de palavra-passe.
