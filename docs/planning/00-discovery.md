# Discovery

Data da auditoria: 2026-10-15. Fonte de comportamento: [README oficial](https://github.com/junglegaming/frontend-challenge). Fonte visual: [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1), consolidada em [05-figma-inventory.md](05-figma-inventory.md).

## Ambiente

O workspace `Desafio Jungle` estava vazio e não é um repositório Git. Nada foi inicializado nesta fase. O `git init` fica para a Fase 1, e só se essa fase for autorizada.

| Ferramenta | Versão observada |
|---|---|
| Sistema | Windows 10 |
| Shell | Git Bash |
| Node.js | v24.12.0 |
| npm | 11.7.0 |
| pnpm | 10.27.0 |
| Corepack | 0.34.5 |
| Git | 2.52.0 |
| GitHub CLI | 2.96.0 |
| Playwright via `npx` | 1.64.1, ainda fora do projeto |

Yarn não está instalado. Comandos futuros usam Git Bash e pnpm. Não há PowerShell, WSL nem Linux como premissa.

O repositório oficial contém apenas `README.md` (SHA `7e0beff`). Não há código, fixtures nem assets para reutilizar. Soluções de outros candidatos ficam fora de escopo.

## Enunciado

Marketplace fictício de NFTs, sem blockchain, carteira externa ou gateway real. A aplicação precisa cobrir descoberta, compra e conta, em desktop e mobile, com dados simulados na camada de rede.

Telas obrigatórias: início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil e carteiras. Páginas editoriais, suporte, atividade, ofertas e downloads não entram. Ações fora do escopo não podem parecer sucesso.

Stack obrigatória, com uso efetivo: React, TypeScript, TanStack Router, TanStack Query, Axios, REST, Socket.IO, Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse.

Eliminatórios do README:

1. Stack obrigatória ausente ou apenas declarada.
2. Fluxos principais só visuais.
3. Compra confirmada sem resposta da simulação.
4. Dados privados vazando entre usuários.
5. Eventos de tempo real injetados direto na UI, sem `socket.io-client`.
6. Ausência de testes E2E executáveis.

A pontuação oficial soma 100: visual 20, fluxos 20, integração 15, tempo real 10, mocking 10, testes 10, acessibilidade 5, performance 5, arquitetura e documentação 5.

## Figma

A inspeção autenticada via Chrome com CDP em `127.0.0.1:9222` mediu 15 frames numa página, `Marketplace de NFTs GreenMint`: 9 desktop e 6 mobile. Desktop com largura 1440. O frame mobile mede 414×896, com raio 40 onde o painel listou. Esse frame é referência de design: não fixa a viewport e não manda arredondar o `body`. A aplicação também precisa funcionar em 390 e 768. Preenchimento `Color/Ink` `#140D0A`.

Capturas em `docs/planning/figma-captures/frames/`. Cópia local em `assets-src/Frontend Challenge.fig`.

O MCP do Figma continua sem permissão de inspeção. Fontes, sombras, ícones, tokens além de `Color/Ink` e exports PNG/SVG soltos continuam pendentes. Essa pendência não bloqueia a fundação. A Fase 2 mede o que falta antes das telas. Nenhum valor visual não medido entra nos documentos como fato.

Viewports de avaliação do enunciado, 390, 768 e 1440, não se confundem com o frame mobile de 414. O raio de 40 px permanece medida do frame, não do documento HTML.

## Complexidade

O risco está no comportamento, não na quantidade de telas. Checkout idempotente, cotação que pode expirar, carrinho de visitante, isolamento entre usuários e eventos fora de ordem exigem contratos e testes antes da interface. A integração Socket.IO com MSW ainda é hipótese até o spike da Fase 1.

## Lacunas registradas

- Tipografia, sombra, borda e espaçamento interno de componentes.
- Assets de imagem e SVG ainda não exportados.
- Compatibilidade real de `@mswjs/socket.io-binding` com o MSW escolhido.
- Filtros visuais do catálogo além dos parâmetros mínimos de busca, ordenação, paginação e disponibilidade. Os nomes finais dos filtros seguem o Figma na Fase 2.
