# KURIO — Marketplace de NFTs

SPA em React e TypeScript do desafio Frontend da Jungle. Os dados, a sessão, o carrinho e o Socket.IO são simulados no navegador com MSW. Não há backend privado.

## Requisitos

- Node.js 24
- pnpm 10
- Google Chrome, para o Lighthouse local

## Subir o projeto

```bash
pnpm install
pnpm dev
```

O app abre em `http://127.0.0.1:5173`. Os mocks ligam sozinhos.

Variável opcional, em `.env.example`:

```bash
VITE_ENABLE_MSW=true
```

`false` desliga o service worker. Qualquer outro valor mantém os mocks. O build de demonstração precisa deles ligados.

## Contas

Senhas só da demo. O mock guarda salt e hash SHA-256.

| Conta | E-mail          | Senha         |
| ----- | --------------- | ------------- |
| Ada   | ada@demo.jungle | ada-demo-pass |
| Bia   | bia@demo.jungle | bia-demo-pass |

Detalhe em [docs/demo-accounts.md](docs/demo-accounts.md).

## Cenários

Com o app aberto, no mesmo origem:

```bash
curl -X POST http://127.0.0.1:5173/api/demo/reset
curl -X POST http://127.0.0.1:5173/api/demo/scenario \
  -H 'content-type: application/json' \
  -d '{"id":"payment-declined"}'
```

`POST /api/demo/reset` volta à fixture. `POST /api/demo/scenario` aceita `slow`, `timeout`, `validation`, `unauthorized`, `forbidden`, `not-found`, `transient`, `session-expired`, `coupon-invalid`, `coupon-expired`, `price-change`, `sold-out`, `payment-declined` e `payment-confirmed`.

`POST /api/demo/clock` recebe `{ "now": "<ISO>" }` e adianta o relógio do mock. `POST /api/demo/failures` recebe `{ "latencyMs": 2000 }`, `{ "status": 500 }` ou `{ "drop": true }`. Corpo vazio limpa a falha.

`price-change` e `sold-out` também emitem `nft.updated` pelo socket. A lista de ids está em `GET /api/demo/scenarios`.

## Comandos

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm preview
pnpm test:e2e
pnpm lighthouse
```

`pnpm preview` serve o build em `http://127.0.0.1:4173`, com MSW. O Lighthouse mede esse preview: início e detalhe, mobile e desktop, três vezes cada. A mediana fica em [docs/audit/lighthouse/summary.md](docs/audit/lighthouse/summary.md).

O Playwright roda no Chromium, nos projetos `dev` e `preview`. Relatório HTML em `playwright-report/`. O CI publica esse HTML como artifact.

As capturas de início, detalhe, carrinho e pagamento são geradas no Ubuntu do GitHub Actions, com `fonts-liberation` e [e2e/linux-fonts.conf](e2e/linux-fonts.conf). No Windows elas são puladas, para não falhar por fonte do sistema. Para regenerar, dispare o workflow `CI` com `update_snapshots=true` e commit o artifact `visual-snapshots`.

Smoke do deploy, sem subir o preview local:

```bash
SMOKE_URL=https://sua-url.vercel.app pnpm exec playwright test --config=playwright.smoke.config.ts
```

Ele confere o catálogo, `mockServiceWorker.js`, o refresh de `/nfts/nft-aurora` e a troca de preço via `nft.updated`.

## Deploy

A Vercel é o alvo. [vercel.json](vercel.json) reescreve as rotas da SPA e deixa `mockServiceWorker.js` no arquivo estático. A versão publicada tem de ser a do commit entregue, com `VITE_ENABLE_MSW` diferente de `false`.

Arquitetura, contratos e desvios do Figma: [ARCHITECTURE.md](ARCHITECTURE.md).
