# Testes e qualidade

Nenhum teste desta lista foi executado. Playwright está disponível via `npx` 1.64.1 e ainda não é dependência do projeto.

## Pirâmide

Vitest cobre regra pura e contrato: conversão para wei, desconto, hash canônico da idempotência, descarte de evento antigo, o 409 quando a chave do mesmo ator muda de payload e a recusa quando B reenvia a chave e o payload de A. Também cobre o handler que recusa recurso de outro usuário.

Playwright cobre o fluxo visível. O teste não importa handler, não chama setter e não faz `setQueryData` para fingir socket ou REST. A página fala com Axios. O MSW responde. O `socket.io-client` recebe o evento.

## Playwright

Cada teste começa do reset. O `beforeEach` chama `POST /api/demo/reset` e, quando preciso, `POST /api/demo/scenario`, pela própria aplicação, não por estado React. Relógio e latência vêm de `/api/demo/clock` e `/api/demo/failures`. A espera usa locator e resposta observável, sem `sleep` fixo.

Projetos Chromium: desktop 1440×900 e mobile 390×844. Uma passagem extra em 768 confirma tablet. O frame do Figma, 1440 de largura e 414×896 com raio 40, serve para a revisão visual das telas desenhadas. Não é viewport obrigatória e não aplica `border-radius` no `body`. Ele não substitui os três viewports do enunciado. O grupo 11 também cobre zoom de 200% sem perda de conteúdo e live region para mutation e evento de socket.

Relatório HTML e trace na falha. Screenshot só quando o teste pede regressão ou quando falha.

### Grupos do enunciado

| Grupo | O que o teste observa | Fase |
|---|---|---|
| 1 | Busca, dois filtros, ordem, página 2, voltar e refresh | 4 |
| 2 | URL direta do detalhe e id inexistente | 4 |
| 3 | Cadastro, conflito, login inválido, expiração, logout, troca de conta | 5 |
| 4 | Favorito e rollback quando a mutation falha | 6 |
| 5 | Quantidade, remoção, cupom inválido, expirado e removido com total sem desconto, refresh, merge | 6 |
| 6 | Catálogo até recibo `confirmed`, com snapshot estável | 7 |
| 7 | Pagamento recusado, clique duplo, timeout com a mesma chave | 7 |
| 8 | Perfil, avatar, senha e carteira com erro de campo | 5 |
| 9 | Preço via socket invalida a cotação no checkout | 8 |
| 10 | Evento duplicado, evento velho, queda e pedido pending recuperado | 8 |
| 11 | Tab até o erro do formulário, foco que volta do diálogo, zoom sem perda e anúncio de mutation ou evento | 9, com base na Fase 2 |
| 12 | Skeleton em rede lenta, erro e retry | 4 e 9 |

Negativos de isolamento, junto dos grupos 3, 7 e 8: A não abre pedido, favorito nem carteira de B. B não recebe o pedido criado com a chave e o payload de A. Logout deixa o cache privado vazio antes do login de B.

## Rede

Query de catálogo e de sessão pode repetir em falha transitória, com limite. `POST /api/orders`, cadastro e troca de senha não repetem sozinhos. O teste de timeout observa um único id de pedido. O reset continua disponível depois do cenário de 500: o teste seguinte chama reset e vê a fixture padrão.

## Acessibilidade

`@axe-core/playwright` nas rotas de catálogo, detalhe, login, carrinho e checkout, em 390 e 1440. Além do axe: foco visível, label ligado ao erro, imagem com alternativa, e o skeleton respeitando `prefers-reduced-motion`.

## Regressão visual

Baselines de início, detalhe, carrinho e pagamento, desktop e mobile, com a fixture padrão e movimento reduzido. Atualização de baseline só depois de mudança visual intencional, registrada no PR.

## Lighthouse

Alvo, no build de preview com mocks e imagens ligados:

| Categoria | Meta |
|---|---:|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | ≥ 90 |

Quatro combinações: início e detalhe, cada uma em perfil mobile e desktop. Três medições cada, doze no total. Publicar a mediana, mais LCP, CLS e TBT. Guardar HTML e JSON, versão do Lighthouse, sistema e o fato de ter rodado no Windows com o Chrome local. Resultado abaixo da meta fica escrito com a causa. Não se desliga funcionalidade para subir a nota.

## CI

GitHub Actions, sem segredo: `pnpm install --frozen-lockfile`, `tsc --noEmit`, lint, build, instalação do Chromium do Playwright e só então `playwright test`. O relatório HTML sobe como artifact. O workflow não chama serviço privado.

## Comandos previstos

No Git Bash, depois da Fase 1 existir:

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm preview
pnpm exec playwright test
```

`pnpm build` e `pnpm preview` entram no aceite da Fase 1. O spike, com tela mínima e fixture simples, passa no dev server e nesse preview. O CI instala o Chromium do Playwright antes dos testes. O comando exato do Lighthouse entra na Fase 9. Nesta fase nenhum deles foi rodado no projeto, porque o projeto ainda não foi criado.
