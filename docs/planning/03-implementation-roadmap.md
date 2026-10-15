# Roadmap de implementação

A Fase 0 termina nestes documentos. Nenhuma fase abaixo começa sem aprovação explícita. Testes nascem na fase da funcionalidade. A Fase 9 audita o conjunto. Esforço é relativo, sem prazo de calendário.

## Fase 1 — Fundação e spike

Objetivo: projeto instalável, prova do transporte Socket.IO e build local que sobe no preview.

Escopo: Vite, TypeScript strict, pnpm, ESLint, Prettier, Router, Query, Axios, MSW 2, `socket.io-client`, binding. O spike usa só uma tela técnica mínima, uma fixture simples de NFT e um endpoint de teste que altera o estado simulado e emite `nft.updated`. Catálogo completo, filtros, layout definitivo e design system ficam para as fases seguintes. O mesmo spike roda no desenvolvimento e no build servido por `pnpm preview`, com MSW e Socket.IO ligados.

Git local entra nesta fase, só depois da autorização explícita dela. O `.gitignore` cobre `.chrome-debug-profile/`, `.env` e `.env.*`, com exceção de `.env.example`, que pode ser versionado só com configuração fictícia e documentada. Também cobre credenciais, `*.pem`, `*.key`, `node_modules/`, `dist/`, relatórios do Playwright, coverage e artefatos temporários. Commit e push continuam fora até pedido explícito.

Deploy experimental não faz parte do aceite obrigatório. Ele só ocorre com autorização separada, para revelar service worker e refresh antes da Fase 10.

Requisitos: EL-01, EL-05 no nível do transporte, GIT-01 parcial.

Teste: Playwright abre a tela mínima, o endpoint de teste altera a fixture e a UI mostra o preço vindo do socket. Sem `setQueryData` no teste. O mesmo caminho passa no dev server e em `pnpm preview`.

Aceite: `pnpm exec tsc --noEmit`, lint, `pnpm build` e `pnpm preview` saem sem erro. O teste do spike passa no Chromium.

Evidência: log do teste e nota se o binding funcionou. Se falhar, a fase para.

Risco: peer do binding. Dependência da Fase 3 e de todo tempo real.

## Fase 2 — Design system

Objetivo: tokens e layout antes das telas.

Escopo: medir o que o inventário ainda lista como pendente (fonte, sombra, ícone, assets). Aplicar só valores medidos. shadcn tematizado. Header, footer, navegação desktop e mobile. Skeleton com shimmer e `prefers-reduced-motion`.

Requisitos: VIS-01, A11Y-01 a A11Y-03 no nível das primitivas, UI-12 no comportamento de links.

Teste: uma rota de fundação renderiza o skeleton e não estoura em 390 px.

Aceite: `#140D0A` entra nos tokens. A largura 1440 e o frame 414×896 são referência de layout. O raio de 40 px do frame mobile não vira borda do `body`. A página também funciona em 390 e 768. Nenhum hex inventado.

Evidência: atualização do inventário com o que for medido.

Depende da Fase 1. Não depende do spike para layout, mas o spike não pode ficar aberto se a Fase 1 tiver parado.

## Fase 3 — Contratos e mock

Objetivo: backend simulado consistente.

Escopo: Zod, `domain/money`, idempotência, handlers, fixtures com duas contas, carrinho de visitante, cupons, cotações, pedidos, demo e reset. Eventos definidos, ainda sem todas as telas.

Requisitos: API-01, API-02, MSW-01 a MSW-03, MON-01, MON-02, CHK-06, CHK-07, SES-07.

Teste: Vitest de wei, hash de payload, 409 de chave do mesmo ator e recusa quando B reenvia a chave de A. Um teste de handler garante que o pedido de A não sai para B.

Aceite: reset depois de um cenário de erro restaura a fixture. Componentes ainda não importam handlers.

Evidência: testes Vitest verdes.

Depende da Fase 1. O contrato de evento depende do spike ter passado.

## Fase 4 — Catálogo e detalhe

Objetivo: descoberta real.

Escopo: home, busca, filtros, ordenação, paginação na URL, detalhe, edição esgotada, 404, skeletons.

Requisitos: UI-01, UI-02 parcial, UI-11, CAT-01 a CAT-11.

Teste: Playwright dos grupos 1, 2 e do loading do grupo 12, desktop e mobile.

Aceite: filtro sobrevive ao refresh, página volta a 1, resposta lenta não pinta por cima da busca nova.

Evidência: relatório Playwright.

Depende das Fases 2 e 3.

## Fase 5 — Conta

Objetivo: sessão e dados privados.

Escopo: cadastro, login, guards, expiração, logout, perfil, avatar, senha, carteiras.

Requisitos: UI-06 a UI-09, SES-01 a SES-06, ACC-01 a ACC-03, EL-04 no REST.

Teste: grupo 3 e grupo 8. Negativos de isolamento.

Aceite: trocar de conta não mostra favorito, carteira nem pedido da anterior.

Evidência: Playwright.

Depende das Fases 3 e 4 para o `returnTo` do detalhe.

## Fase 6 — Carrinho e favoritos

Objetivo: carrinho persistente e favorito otimista.

Escopo: CRUD, cupom aplicado e removido, merge, estoque, rollback do favorito. A cotação preliminar sem rede usa a taxa estimada da fixture e não fecha compra.

Requisitos: FAV-01, FAV-02, CART-01 a CART-04, UI-03, A11Y-06 no anúncio da mutation.

Teste: grupos 4 e 5.

Aceite: visitante mantém o item no refresh e, ao entrar, não duplica a linha.

Evidência: Playwright.

Depende das Fases 4 e 5.

## Fase 7 — Checkout e pedidos

Objetivo: compra confiável.

Escopo: cotação, carteira, rede, revisão, idempotência, pending, confirmed, declined, recibo, remoção parcial do carrinho.

Requisitos: UI-04, UI-05, UI-10, CHK-01 a CHK-03, CHK-05 a CHK-11, MON-03, EL-02, EL-03.

Teste: grupos 6 e 7.

Aceite: timeout não cria segundo pedido. A chave do mesmo ator devolve o pedido já criado mesmo com a cotação expirada. B não recebe o pedido de A. Confirmado só aparece com a API. Falha não esvazia o carrinho.

Evidência: Playwright.

Depende da Fase 6.

## Fase 8 — Tempo real

Objetivo: eventos resilientes.

Escopo: preço e estoque no catálogo, detalhe, carrinho e cotação. `nft.updated` chega a todos os clientes conectados. `order.updated` só chega ao dono autenticado, sem rooms. Versão, duplicata, reconexão, REST de reconciliação, isolamento de sessão.

Requisitos: CART-05, CHK-04, CHK-09, CHK-10, RT-01 a RT-04, EL-05 completo.

Teste: grupos 9 e 10.

Aceite: preço novo invalida a cotação. Pedido pending sobrevive à queda sem segunda compra. Listener da conta anterior não roda.

Evidência: Playwright atravessando o socket.

Depende das Fases 1, 3, 4 e 7.

## Fase 9 — Auditoria

Objetivo: estabilizar o que já existe.

Escopo: suíte completa, visual de início, detalhe, carrinho e pagamento, axe, 390, 768 e 1440, Lighthouse com três medições.

Requisitos: A11Y-04, A11Y-05, A11Y-06, VIS-02, PERF-01 e revisão dos grupos 11 e 12.

Teste: a suíte inteira. Nada novo de produto, salvo correção.

Aceite: falha encontrada vira correção antes de declarar a fase pronta. Meta de Lighthouse abaixo do enunciado fica justificada com causa, não omitida.

Evidência: HTML do Playwright, axe e mediana do Lighthouse.

Depende das Fases 2 a 8.

## Fase 10 — Entrega

Objetivo: reproduzir e publicar.

Escopo: README, ARCHITECTURE, CI, deploy autorizado, smoke de catálogo, login, carrinho, checkout, pedido e refresh.

Requisitos: DOC-01, DOC-02, SES-08, MSW-04, GIT-01, EL-01, EL-06.

Teste: CI verde e smoke na URL pública.

Aceite: a versão publicada é a do código entregue. Mocks e o transporte simulado funcionam sem serviço privado.

Evidência: link do repositório e da URL.

Depende da Fase 9 e de aprovação para o deploy de entrega. O Git local, se a Fase 1 tiver sido autorizada, já existe. Um deploy experimental anterior, também sujeito a autorização própria, não substitui o smoke desta fase.
