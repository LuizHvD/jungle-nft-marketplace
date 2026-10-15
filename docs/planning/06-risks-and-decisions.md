# Riscos e decisões

Estado em 2026-10-15. Hipótese não é decisão fechada. Nada aqui foi validado por teste de projeto, porque o projeto ainda não existe.

## Decisões

### ADR-01 — MSW 2 com binding Socket.IO

Decisão provisória: pin da última linha MSW 2 que satisfaça `msw ^2.10.2`, mais `@mswjs/socket.io-binding@0.2.0` e `socket.io-client` 4.x.

Alternativa: MSW 3.0.3. Foi rejeitada por enquanto porque o binding não declara esse peer e o namespace do protocolo não está coberto.

Condição: o spike da Fase 1 precisa mostrar um `nft.updated` no Playwright. Se falhar, a decisão reabre antes do catálogo.

### ADR-02 — ETH em wei com bigint

Decisão: string decimal no JSON e `bigint` com 18 casas no `domain/money`.

Alternativa: biblioteca decimal. Foi rejeitada para não somar dependência. Wei representa ETH sem float.

### ADR-03 — Carrinho e confirmação na API

Decisão: o mock é a fonte do carrinho, da cotação e do pedido. Favorito pode ser otimista, com rollback. Status `confirmed` nunca nasce de otimismo.

### ADR-04 — Demo por HTTP

Decisão: cenário, reset, relógio e falha entram por `/api/demo/*`. Componentes não importam handler.

### ADR-05 — Vercel

Decisão preferida: SPA Vite na Vercel, com rewrite para refresh de rota. O README recomenda Vercel. Cloudflare e Netlify continuam aceitos se o service worker do MSW falhar na Vercel. Um deploy experimental pode ocorrer depois da Fase 1, somente com autorização separada. Ele não substitui o deploy de entrega da Fase 10.

### ADR-06 — Sessão de demonstração

Decisão: token opaco no `localStorage`, senha da fixture como salt e hash. O `ARCHITECTURE.md` dirá que isso não é modelo de produção.

### ADR-07 — Git na Fase 1

Decisão: `git init` ocorre na Fase 1, condicionado à autorização explícita dessa fase. O `.gitignore` exclui `.chrome-debug-profile/`, `.env` e `.env.*`, credenciais, `*.pem`, `*.key`, `node_modules/`, `dist/`, relatórios do Playwright, coverage e artefatos temporários. A exceção `!.env.example` permite versionar só configuração fictícia e documentada. Commit e push não acompanham o init.

## Riscos

| ID | Risco | Probabilidade | Impacto | Mitigação | Validação | Fase |
|---|---|---|---|---|---|---|
| R1 | Binding Socket.IO incompatível | alta | alto | MSW 2, namespace `/`, filtro de conexões sem rooms, spike antes das telas | Playwright recebe `nft.updated` | 1 |
| R2 | Service worker quebra no deploy | média | alto | Preview local na Fase 1; deploy experimental só com autorização separada, antes da Fase 10 | smoke na URL, se autorizado | 1 e 10 |
| R3 | Timeout cria dois pedidos ou vaza a tentativa | média | alto | Identificar o ator antes da tabela; indexar ator + chave; consultar essa chave antes de revalidar | um id após timeout; B não vê o pedido de A | 3 e 7 |
| R4 | Conta B vê dado da conta A | média | alto | Handler confere o dono; teste negativo | Playwright de isolamento | 3 e 5 |
| R5 | E2E instável | média | médio | Reset, relógio da API demo, sem sleep | suíte repetível | 4–9 |
| R6 | Lighthouse abaixo da meta por imagem | média | médio | Medir com assets ligados e justificar | doze runs, mediana | 9 |
| R7 | Fonte e ícone ainda não medidos | alta | médio | Fase 2 antes das telas; não inventar token | inventário atualizado | 2 |
| R8 | Evento fora de ordem regride pedido | média | alto | Versão monotônica e estado terminal | grupo 10 | 8 |
| R9 | Cotação aceita preço velho | média | alto | `nft.updated` invalida a quote | grupo 9 | 8 |

## Hipóteses ainda abertas

- O binding emite e o cliente recebe no Chrome de desenvolvimento e no Playwright.
- O menu de exportação do Figma permite SVG e PNG sem alterar o arquivo. Hoje só a cópia `.fig` foi obtida.
- Os nomes finais dos filtros do catálogo saem dos frames, não de uma lista inventada.

## Entrada da Fase 1

Pode começar somente com aprovação explícita, e com estes documentos presentes:

- `00-discovery.md`
- `01-requirements-matrix.md`
- `02-architecture-proposal.md`
- `03-implementation-roadmap.md`
- `04-testing-and-quality.md`
- `05-figma-inventory.md`
- `06-risks-and-decisions.md`

O primeiro aceite implementado continua sendo typecheck, lint, build e o spike do socket. Esta fase não os executa.
