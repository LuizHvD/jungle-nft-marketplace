# Proposta de arquitetura

Decisões confirmadas estão marcadas como decisão. O transporte Socket.IO permanece hipótese até o spike da Fase 1. Detalhes visuais não medidos não entram aqui; ver [05-figma-inventory.md](05-figma-inventory.md).

## Stack

Decisão: Vite, React 19, TypeScript strict, pnpm, TanStack Router, TanStack Query, Axios, Zod, React Hook Form, Tailwind CSS 4, shadcn/ui tematizado na Fase 2, MSW 2.x compatível com o peer `msw ^2.10.2` de `@mswjs/socket.io-binding@0.2.0`, `socket.io-client` 4.x, Vitest, Playwright, `@axe-core/playwright`, ESLint e Prettier. Publicação preferida: Vercel.

Fora do desenho: Redux, Next.js, backend Node próprio, microfrontends.

MSW 3 existe e não declara compatibilidade com o binding. Por isso a linha 2 fica pinada. Se o spike falhar, a Fase 1 para e a decisão é reaberta. Até lá, Socket.IO não é tratado como integração pronta.

## Pastas

```text
src/
  app/                 providers, QueryClient, bootstrap do worker
  routes/              rotas, search params Zod, guards
  features/            catalog, nft, cart, checkout, orders, auth, profile, wallets, favorites, demo
  components/ui/       shadcn
  components/layout/
  contracts/           Zod de request, response e evento
  domain/              dinheiro, idempotência, versão de evento, merge de carrinho
  lib/http/            Axios, erro normalizado
  lib/realtime/        socket.io-client, ciclo de vida, reconexão
  lib/session/         token de demo, expiração, returnTo
  mocks/               handlers, db, fixtures, cenários, socket
e2e/
docs/planning/
```

Componentes não importam `mocks/`. Regras puras ficam em `domain/` para o cliente e o mock usarem a mesma função. Chamadas REST passam por Axios. Estado remoto fica no Query. Filtro, busca, ordenação e página ficam na URL.

## Identidade e isolamento

O mock é a autoridade. Todo handler privado lê o ator do token e recusa recurso de outro ator com 403 ou 404, conforme o caso. Filtrar na UI ou na query key não substitui essa checagem.

O token de demonstração é opaco, com `expiresAt`, guardado no `localStorage` apenas para a demo sobreviver ao refresh. A senha da fixture é salt mais hash SHA-256 via Web Crypto. Isso não é recomendação de autenticação de produção e será dito no `ARCHITECTURE.md`.

Logout remove o token, cancela queries privadas, limpa o cache do ator e desconecta o socket. Login seguinte não reutiliza cache nem listener da conta anterior.

Query keys privadas incluem o id do ator: `['cart', actorId]`, `['favorites', userId]`, `['orders', userId]`, `['wallets', userId]`, `['profile', userId]`.

## Dinheiro

Transporte: string decimal. Domínio: `bigint` em wei, 18 casas, sem `parseFloat`. Quantidade é inteiro. A cotação da API é a fonte do subtotal, desconto, taxa e total no checkout. O cliente pode mostrar a resposta; não recalcula o total como autoridade.

Alternativa rejeitada: biblioteca decimal. Wei cobre ETH e evita dependência.

## Carrinho e checkout

O carrinho vive no mock, separado por ator. Visitante usa id opaco no `localStorage` e fala com a mesma API. Login chama `POST /api/cart/merge`. Item único por NFT e edição. Favorito é a mutation otimista, com rollback. O carrinho não confirma compra no cliente.

Uma tentativa de compra gera uma `Idempotency-Key` e a guarda até o desfecho. Refresh, timeout e retry reenviam a mesma chave e o mesmo payload canônico. Payload diferente com a mesma chave responde 409 `IDEMPOTENCY_CONFLICT`. Nova tentativa, depois de um desfecho terminal ou de mudança explícita do carrinho, gera outra chave.

Ao receber `POST /api/orders`, o mock autentica e identifica o ator antes de abrir a tabela de idempotência. A tentativa é indexada por ator + `Idempotency-Key`. Uma linha de A nunca é lida para B: a chave de A, mesmo com o mesmo payload, não devolve o pedido de A. O teste negativo cobre B reutilizando a chave e o payload de A e confere que a resposta não traz o pedido de A.

Para o ator autenticado, a consulta da própria chave vem em seguida. Se a chave já existe e o payload canônico é o mesmo, devolve o pedido já criado, mesmo que a cotação original tenha expirado. Essa cotação não é revalidada para decidir se o pedido antigo continua válido. Se a chave é nova para esse ator, aí sim valida cotação, dono, estoque, preço, cupom e estado do carrinho antes de criar o pedido. Total diferente do `expectedTotal` nessa tentativa nova responde 409 `QUOTE_STALE` e não cria pedido. O usuário precisa aceitar a cotação nova, com outra chave. Clique repetido não dispara segundo POST enquanto o primeiro não resolve.

O carrinho do visitante pode pedir uma cotação preliminar sem carteira. Preço, desconto e taxa usam a mesma precisão em wei. Sem rede escolhida, a taxa é a estimativa declarada na fixture para a rede padrão da demo, e a resposta marca o total como não definitivo. Esse total não autoriza a compra. No checkout, carteira, rede e conexão simulada válida são obrigatórias. A rede escolhida gera a cotação final daquela rede, com taxa própria e total definitivo. Se carteira, rede ou conexão mudarem, o cliente pede outra cotação final antes de criar o pedido.

Estados: `pending`, `confirmed`, `declined`. Terminais não regridem. A UI só mostra confirmado quando o GET ou o evento traz `confirmed`. Falha não esvazia o carrinho. Sucesso remove só as quantidades compradas. O recibo congela o snapshot.

## Rede

Queries idempotentes podem repetir com limite baixo. Mutations de pedido, cadastro e pagamento não repetem sozinhas. Resposta atrasada de outra chave de busca é ignorada pelo `signal` da query. Loading, vazio, erro e sucesso têm estado visível. Cenário de falha entra pelo endpoint demo, não por estado React. O reset volta à fixture mesmo depois de um cenário de erro.

## Contratos

Base `/api`. Corpo JSON. Valores ETH em string. Erros: `{ code, message, fieldErrors? }`.

Códigos: `VALIDATION` 400, `SESSION_EXPIRED` 401, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `SOLD_OUT` 409, `QUANTITY_LIMIT` 422, `COUPON_INVALID` 422, `COUPON_EXPIRED` 422, `QUOTE_STALE` 409, `IDEMPOTENCY_CONFLICT` 409, `TIMEOUT` simulado sem status, `TRANSIENT` 500.

### Auth

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | não | nome, e-mail, senha | sessão | 400, 409 e-mail | cadastro e conflito |
| POST | `/api/auth/login` | não | e-mail, senha | sessão | 401 | credencial inválida |
| GET | `/api/auth/session` | sim | — | sessão ou 401 | 401 | refresh |
| POST | `/api/auth/logout` | sim | — | 204 | 401 | limpa cache |

### Perfil

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| GET | `/api/profile` | sim | — | perfil do ator | 401 | isolamento |
| PATCH | `/api/profile` | sim | nome e campos do layout | perfil | 400 | persistência |
| PATCH | `/api/profile/avatar` | sim | imagem ou id de avatar da demo | perfil | 400 | refresh |
| PATCH | `/api/profile/password` | sim | senha atual, senha nova | 204 | 400, 401 | senha antiga falha |

### NFTs

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| GET | `/api/nfts` | não | `q`, `sort`, `page`, `pageSize`, disponibilidade e filtros medidos na Fase 2 | página de itens | 500, timeout | busca, ordem, página, obsoleto |
| GET | `/api/nfts/:id` | não | — | NFT e edições | 404 | inexistente e esgotado |

### Favoritos

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| GET | `/api/favorites` | sim | — | ids do ator | 401 | não lista o de outro |
| PUT | `/api/favorites/:nftId` | sim | — | favorito | 401, 404 | rollback |
| DELETE | `/api/favorites/:nftId` | sim | — | 204 | 401, 403 se não for do ator | isolamento |

### Carrinho e cotação

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| GET | `/api/cart` | ator, inclusive visitante | — | itens do ator | — | persistência |
| POST | `/api/cart/items` | ator | nftId, editionId, quantity | carrinho | 409, 422 | sem duplicar linha |
| PATCH | `/api/cart/items/:id` | dono | quantity | carrinho | 403, 422 | limite |
| DELETE | `/api/cart/items/:id` | dono | — | carrinho | 403 | remoção |
| POST | `/api/cart/merge` | usuário | guestId | carrinho fundido | 401 | merge |
| POST | `/api/quotes` | ator, inclusive visitante | itens, couponCode opcional; network omitida na preliminar; walletId, network e conexão na final | quoteId, versão, subtotal, desconto, taxa, total, expiresAt, `definitive` | 422 cupom; 422 se checkout sem carteira, rede ou conexão válida | preliminar não definitiva; final segue a rede |

### Carteiras

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| GET | `/api/wallets` | sim | — | carteiras do ator | 401 | B não vê A |
| POST | `/api/wallets` | sim | rótulo, endereço, papel | carteira | 400 | validação |
| PATCH | `/api/wallets/:id` | dono | campos editáveis | carteira | 403, 400 | isolamento |
| POST | `/api/wallets/:id/connection` | dono | network, action connect, disconnect ou reject | estado simulado | 403 | recusa bloqueia checkout |

### Pedidos

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| POST | `/api/orders` | sim, ator identificado antes da tabela | quoteId, expectedTotal, header `Idempotency-Key` indexada com o ator | pedido do próprio ator se a chave e o payload coincidirem; senão pending novo | 401 antes da consulta; 409 stale só em tentativa nova; 409 conflito de chave; timeout após persistir | B não recebe o pedido de A; chave própria ignora expiração da cotação |
| GET | `/api/orders/:id` | dono | — | estado e snapshot | 403, 404 | recibo imutável |

### Demo

| Método | Rota | Auth | Request | Response | Erros | Teste |
|---|---|---|---|---|---|---|
| GET | `/api/demo/scenarios` | não | — | lista | — | painel |
| POST | `/api/demo/scenario` | não | id do cenário | estado | 404 | cada teste escolhe o seu |
| POST | `/api/demo/reset` | não | — | fixture | — | roda depois de falha |
| POST | `/api/demo/clock` | não | now | relógio | — | cupom expirado |
| POST | `/api/demo/failures` | não | latência, status ou queda | cenário | — | grupo 12 |

Mutação de preço ou status no demo altera o banco e só então emite socket. O painel chama esses endpoints por Axios.

## Eventos

Hipótese até o spike. Namespace único `/`. O binding não cobre rooms, namespaces nem broadcast nativo. O mock guarda a lista de conexões e filtra na hora de emitir. Não usa sala para separar público de privado.

O handshake leva o token de demonstração quando há sessão. Sem token, a conexão é anônima e só pode receber evento público. Logout fecha o socket e descarta o listener. Login abre outra conexão. Reconexão repete o handshake com o token vigente e, em seguida, as queries ativas refazem REST. O cliente descarta `eventId` repetido e versão menor ou igual.

`nft.updated` é público: `eventId`, `nftId`, `editionId?`, `version`, `price`, `availableSupply`. Pode ir a todos os clientes conectados, autenticados ou não, porque o catálogo não é privado.

`order.updated` é privado: `eventId`, `orderId`, `version`, `status`. Só sai para conexões cujo token pertence ao dono do pedido. Conexão anônima e conexão de outro usuário não recebem esse evento. Status terminal não volta.

## Fronteiras de cache

Catálogo é público e chaveado pelos search params. Cotação é inválida quando um item citado recebe `nft.updated` de versão nova. Pedido pending é revalidado no foco e na reconexão. Nenhuma mutation de pedido usa atualização otimista para o status `confirmed`.
