# Arquitetura

Marketplace fictício. React 19, Vite, TypeScript strict, TanStack Router, TanStack Query, Axios, Zod, React Hook Form, Tailwind CSS 4 e o `Button` do shadcn/ui (`class-variance-authority` e `@radix-ui/react-slot`). O restante da interface usa os mesmos tokens, sem kit extra.

Os componentes não importam `src/mocks`. O ESLint barra esse caminho. A UI fala com Axios em `/api`. O MSW responde. O `socket.io-client` recebe o evento.

## Pastas

- `src/routes` — rotas, search params e guarda de sessão
- `src/features` — catálogo, detalhe, carrinho, checkout, pedidos, conta
- `src/contracts` — Zod na borda HTTP e nos eventos
- `src/domain` — wei, cotação, idempotência, versão de evento, merge
- `src/lib/http` — Axios e erro normalizado
- `src/lib/session` — token de demo, expiração, `returnTo`
- `src/lib/realtime` — socket, versão e reconciliação
- `src/mocks` — handlers, IndexedDB, fixtures e cenários
- `e2e` — Playwright. O teste não chama setter nem `setQueryData`

`/spike` e `/fundacao` são rotas técnicas das fases 1 e 2. Não estão no header.

## Contratos

Base `/api`. ETH em string decimal. Quantidade inteira. Erro `{ code, message, fieldErrors? }`.

Códigos usados: `VALIDATION` 400, `UNAUTHORIZED` 401, `SESSION_EXPIRED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `SOLD_OUT` 409, `QUOTE_STALE` 409, `IDEMPOTENCY_CONFLICT` 409, `QUANTITY_LIMIT` 422, `COUPON_INVALID` 422, `COUPON_EXPIRED` 422, `TRANSIENT` 500. Timeout de pedido é queda da resposta, sem status.

| Recurso   | Operações                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Sessão    | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`                        |
| NFTs      | `GET /api/nfts`, `GET /api/nfts/:id`                                                                                       |
| Favoritos | `GET /api/favorites`, `PUT /api/favorites/:nftId`, `DELETE /api/favorites/:nftId`                                          |
| Carrinho  | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `POST /api/cart/merge` |
| Cotação   | `POST /api/quotes`                                                                                                         |
| Pedidos   | `POST /api/orders` com `Idempotency-Key`, `GET /api/orders/:id`                                                            |
| Perfil    | `GET /api/profile`, `PATCH /api/profile`, `PATCH /api/profile/avatar`, `PATCH /api/profile/password`                       |
| Carteiras | `GET /api/wallets`, `POST /api/wallets`, `PATCH /api/wallets/:id`, `POST /api/wallets/:id/connection`                      |

Os schemas estão em `src/contracts`. A tabela acima é o mapa. O mock e o cliente usam o mesmo Zod.

Eventos, em `src/contracts/events.ts`:

- `nft.updated` — público. Traz `eventId`, `nftId`, `editionId`, `version`, `price`, `availableSupply`. Chega a quem estiver conectado.
- `order.updated` — privado. Traz o pedido e a versão. O mock só entrega ao token do dono. Não há rooms.

Evento antigo ou duplicado é descartado. Estado terminal de pedido não regride. Depois de reconectar, o pedido pendente é lido de novo em `GET /api/orders/:id`.

## Sessão

O token é um UUID opaco, com `expiresAt`, no `localStorage` (`jungle.session`). Isso existe para a demo sobreviver ao refresh. Não é modelo de produção: não há cookie `HttpOnly`, rotação nem proteção contra XSS.

A senha da fixture é salt mais SHA-256 no Web Crypto. O texto puro não fica no estado do mock. As senhas de demo estão no README.

Logout apaga o token, limpa o cache privado do Query, desconecta o socket e cancela a sessão anterior. O login seguinte não reutiliza listener nem dado da conta anterior. Handler privado lê o ator do token. A chave de idempotência é ator + `Idempotency-Key`: a conta B, com a chave e o payload de A, não recebe o pedido de A.

Rotas privadas: `/perfil`, `/carteiras`, `/checkout`, `/favoritos`, `/pedidos` e `/pedidos/:id`. Sem sessão, vão para `/login?returnTo=`. Expiração no checkout guarda a rede, a carteira e a etapa em `sessionStorage` (`jungle.checkout-draft`) e o `returnTo` traz a rota de volta.

## Carrinho, cotação e pedido

O carrinho mora no mock. Visitante usa id opaco no `localStorage` e a mesma API. No login, `POST /api/cart/merge` junta as linhas sem duplicar NFT e edição.

Favorito é a mutation otimista, com rollback. Compra não é otimista. A UI mostra confirmado só quando o status da API é `confirmed`.

Sem rede escolhida, a cotação é preliminar: a taxa é a estimativa da fixture e o total não fecha pedido. No checkout, carteira conectada na rede escolhida gera a cotação definitiva. `nft.updated` invalida essa cotação. O envio usa o total da cotação. Total diferente responde `QUOTE_STALE` e não cria pedido.

Uma tentativa guarda uma `Idempotency-Key` até o desfecho. Refresh, timeout e retry reenviam a mesma chave e o mesmo payload. Payload diferente, mesma chave, mesmo ator: `409 IDEMPOTENCY_CONFLICT`. Clique repetido não dispara outro POST enquanto o primeiro não resolve. Queries de leitura podem repetir uma falha transitória. `POST /api/orders`, cadastro e troca de senha não repetem sozinhos.

A lista `/pedidos` mostra os ids gravados na sessão (`jungle.order-index`). O recibo em si vem de `GET /api/orders/:id`. Pedido `confirmed` tira do carrinho só a quantidade da cotação. `declined` deixa o carrinho. O recibo é a rota `/pedidos/:id`, porque o refresh precisa reabri-lo por `GET /api/orders/:id`. O snapshot congela itens, preços, taxa e total. O contrato do item não tem nome de exibição: o recibo mostra `nftId`, edição, quantidade e preço do snapshot.

## Cache

Query keys privadas incluem o ator: `['cart', actorId]`, `['favorites', userId]`, `['orders', userId]`, `['wallets', userId]`, `['profile', userId]`. Catálogo e NFT são públicos e levam os parâmetros da URL. `refetchOnWindowFocus` está desligado. Retry padrão de query é falso; a sessão repete no máximo uma falha 5xx ou de rede.

Busca, filtro, ordem e página ficam na URL. Resposta atrasada de outra busca é ignorada pelo `signal` da query. Filtro novo volta à página 1.

## MSW e Socket.IO

MSW 2.15 com `@mswjs/socket.io-binding` 0.2.0 e `socket.io-client` 4.8. O worker é `public/mockServiceWorker.js`, escopo `/`. O estado da demo fica no IndexedDB do navegador. `POST /api/demo/reset` recria a fixture.

O transporte é o protocolo Socket.IO interceptado pelo service worker, no path `/socket.io/`, websocket, origem da página. Não existe servidor Socket.IO na Vercel. Se o service worker não controlar a página, o tempo real não chega. O binding não implementa rooms: o filtro de `order.updated` é feito no mock, pelo token.

O rewrite da Vercel manda o restante das rotas para `index.html` e não substitui `mockServiceWorker.js`, que continua arquivo estático.

## Ações fora do escopo

Newsletter, medalhões, colunas `Link 1`–`Link 4`, `Social` e `Carteira` do rodapé não concluem operação. O envio da newsletter só chama `preventDefault`. Páginas editoriais, suporte, atividade, ofertas e downloads não existem.

## Figma

Medido e usado: `Color/Ink` `#140D0A`, `Color/Primary` `#D28A4C`, `Color/Surface Card` `#241612`, largura 1440, paddings e raios lidos em [docs/planning/05-figma-inventory.md](docs/planning/05-figma-inventory.md). O frame mobile 414×896 e o raio 40 são referência do frame, não da viewport e não do `body`. As viewports de avaliação são 390, 768 e 1440.

Sem medida, e portanto sem token inventado:

- família tipográfica: `sans-serif` do sistema
- cor de texto: `#FFFFFF` como fallback de leitura sobre o ink
- ícones Home, Shop, User e Filter: SVG provisório na caixa medida
- rótulos do rodapé e o primeiro item de navegação que o painel não entregou
- sombra: nenhuma

O contorno de `:focus-visible` é o `outline: auto` do navegador.

## Testes e auditoria

Vitest cobre wei, idempotência, isolamento de handler e descarte de evento. Playwright cobre os doze grupos do enunciado. Axe roda no preview, em início, detalhe, login, carrinho e checkout, a 390 e 1440. Zoom de 200% usa `zoom` CSS no Chromium e exige que busca, compra e fechar o diálogo continuem visíveis e sem corte de `overflow: hidden`.

Baselines visuais só passam no job `visual` do GitHub Actions (Ubuntu, Liberation Sans via `FONTCONFIG_FILE`). Assim a comparação não depende da fonte do Windows nem do macOS.

O Lighthouse 13.5.0 rodou no preview local, Windows 10, Chrome headless. Três medições de início e de detalhe, em mobile e desktop. A mediana está em `docs/audit/lighthouse/summary.md`. Nenhuma categoria ficou abaixo da meta. A auditoria `robots-txt` marca `/robots.txt` porque o preview devolve o HTML da SPA nesse caminho. A nota de SEO permanece acima de 90, então o arquivo não foi criado só para subir o número.
