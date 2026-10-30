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
  app/        Composição: providers, rotas e layout
  features/   Uma pasta por domínio (accounts, expenses, income, investments, overview, auth)
  shared/     Código sem conhecimento de domínio
    firebase/ Inicialização do Firebase
    auth/     Sessão atual (useSession, useUid)
    data/     Repositório genérico de coleções e hooks de dados
    ui/       Componentes reutilizáveis (DataTable, RecordForm, StatCard)
    lib/      Formatação, datas e cálculos
```

Regras que mantêm o projeto escalável:

- **Dependências num só sentido:** `app` → `features` → `shared`. `shared` nunca importa de `features`.
- **O Firestore fica nos repositórios.** Os componentes usam hooks, os hooks usam a interface `CollectionRepository`. Trocar o Firestore por uma API própria implica mudar os repositórios, não a UI.
- **Regras de negócio são funções puras** junto do domínio (`totalAssets`, `monthExpenses`, `portfolioSummary`).
- **Dados do servidor ficam no TanStack Query**, não em estado global próprio. As chaves incluem o `uid`.
- **Escritas que alteram vários documentos usam transações**, como em `features/expenses/expenses.ts`.

### Adicionar um domínio

1. Criar `features/<dominio>/<dominio>.ts` com o tipo, `createUserCollection` e `createCollectionHooks`.
2. Criar a página com `DataTable` e `RecordForm`.
3. Adicionar a rota em `app/App.tsx` e o separador em `app/AppLayout.tsx`.

## Modelo de dados

Todos os dados ficam em `users/{uid}/{accounts|expenses|income|investments}`. O modelo é igual ao da versão HTML original, por isso os dados existentes continuam acessíveis.

## Antes de escalar para negócio

Estes pontos ainda não estão feitos e devem ser decididos antes de haver clientes:

1. **Valores em cêntimos inteiros.** Hoje são `number` decimal, com arredondamento na escrita. Exige migrar os dados.
2. **Lógica financeira no servidor.** O saldo é calculado no browser; com clientes reais, deve passar para Cloud Functions ou uma API.
3. **Regras do Firestore versionadas.** As regras não estão neste repositório; é preciso trazê-las para cá, com testes.
4. **Paginação.** Cada lista carrega a coleção inteira.
5. **Conformidade (RGPD).** Exportação e eliminação de conta, e auditoria de alterações.
6. **Operação.** CI/CD, ambientes separados (dev e produção), monitorização de erros e recuperação de palavra-passe.
7. **Datas em UTC.** `shared/lib/date.ts` replica o original: logo após a meia-noite em Portugal, no horário de verão, a data sugerida ainda é a de ontem.
