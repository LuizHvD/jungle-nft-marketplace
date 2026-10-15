# Matriz de requisitos

Fonte: README oficial do desafio Frontend — Marketplace de NFTs. Nenhum item abaixo foi executado. A coluna de evidência descreve o que a fase responsável deverá produzir.

Prioridade: P0 bloqueia a entrega. P1 é obrigatório de fluxo. P2 é obrigatório de qualidade ou auditoria.

Viewports de avaliação do enunciado: 390, 768 e 1440. O frame mobile de 414×896 e o raio de 40 px são referência de design, não limite de viewport e não justificam borda arredondada no `body`. Os dois conjuntos não se substituem.

## Eliminatórios

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| EL-01 | Stack obrigatória participa de fato da solução | P0 | sim | fundação | 1, 10 | Router, Query, Axios, REST, socket.io-client, Tailwind, shadcn, MSW, Playwright e Lighthouse aparecem no build e nos fluxos | inspeção de imports e relatórios | README de execução e CI |
| EL-02 | Fluxos principais executam a ação, não só a pintura | P0 | sim | compra, conta | 4–7 | Busca, login, carrinho e compra alteram dados via API | Playwright | testes dos grupos 1, 3, 5 e 6 |
| EL-03 | Confirmação de compra só após a simulação | P0 | sim | checkout | 7 | A UI mostra confirmado somente com status `confirmed` da API | Playwright | teste do grupo 6 |
| EL-04 | Dados privados não vazam entre usuários | P0 | sim | sessão, mocks | 3, 5 | Usuário A não lê nem altera pedidos, favoritos ou carteiras de B | Playwright negativo | testes de isolamento |
| EL-05 | Tempo real atravessa socket.io-client | P0 | sim | realtime | 1, 8 | `nft.updated` chega pelo transporte, sem setter nem `setQueryData` de teste | Playwright do spike e da fase 8 | teste do grupo 9 |
| EL-06 | E2E executável | P0 | sim | testes | 4–9 | `pnpm exec playwright test` roda no Chromium com relatório HTML | CI | artifact HTML |

## Telas e navegação

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| UI-01 | Início com destaques, catálogo e navegação ao NFT | P1 | não | catalog | 4 | A home lista NFTs e abre o detalhe | Playwright | grupo 1 e 2 |
| UI-02 | Detalhe com galeria, edição, quantidade, favorito e compra | P1 | não | nft | 4, 6 | Controles respeitam estoque e autenticação de favorito | Playwright | grupo 2 e 4 |
| UI-03 | Carrinho com quantidade, remoção, cupom e resumo | P1 | não | cart | 6 | Resumo usa valores da API | Playwright | grupo 5 |
| UI-04 | Pagamento com dados, carteira, rede, revisão e envio | P1 | não | checkout | 7 | Envio só ocorre na revisão com cotação válida | Playwright | grupo 6 |
| UI-05 | Confirmação com transação, itens, taxas e total | P1 | não | orders | 7 | Recibo igual ao snapshot do pedido | Playwright | grupo 6 |
| UI-06 | Login com validação e retorno ao fluxo anterior | P1 | não | auth | 5 | Após login, a rota `returnTo` abre | Playwright | grupo 3 |
| UI-07 | Cadastro com validação e conflito | P1 | não | auth | 5 | E-mail duplicado não cria outra conta | Playwright | grupo 3 |
| UI-08 | Perfil com dados, avatar e senha | P1 | não | profile | 5 | Alteração persiste após refresh | Playwright | grupo 8 |
| UI-09 | Carteiras principal e secundária | P1 | não | wallets | 5 | Cadastro e edição persistem por usuário | Playwright | grupo 8 |
| UI-10 | Confirmação, perfil e carteiras funcionam no mobile sem frame específico | P1 | não | layout | 5, 7 | Essas rotas não estouram em 390 px | Playwright mobile | viewport 390 |
| UI-11 | Rota inexistente e acesso direto | P1 | não | routes | 4 | URL direta de detalhe e 404 têm estado próprio | Playwright | grupo 2 |
| UI-12 | Ações fora do escopo não fingem sucesso | P2 | não | layout | 2, 4 | Link editorial não conclui uma operação de negócio | revisão manual | nota no ARCHITECTURE |

## Catálogo

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| CAT-01 | Listagem REST | P1 | não | catalog | 4 | A grade vem de `GET /api/nfts` | Playwright + MSW | grupo 1 |
| CAT-02 | Busca textual | P1 | não | catalog | 4 | `q` filtra o resultado | Playwright | grupo 1 |
| CAT-03 | Filtros combináveis | P1 | não | catalog | 4 | Dois filtros ativos reduzem a interseção | Playwright | grupo 1 |
| CAT-04 | Ordenação | P1 | não | catalog | 4 | `sort` muda a ordem visível | Playwright | grupo 1 |
| CAT-05 | Paginação | P1 | não | catalog | 4 | Página 2 pede outro recorte à API | Playwright | grupo 1 |
| CAT-06 | Estado na URL, refresh e histórico | P1 | não | catalog | 4 | Voltar restaura filtro e página | Playwright | grupo 1 |
| CAT-07 | Filtro novo volta à página 1 | P1 | não | catalog | 4 | Mudar filtro zera `page` | Playwright | grupo 1 |
| CAT-08 | Resposta obsoleta descartada | P1 | não | catalog | 4 | Resposta lenta da busca anterior não pinta a busca nova | Playwright com latência | grupo 12 |
| CAT-09 | Vazio, loading e erro com nova tentativa | P1 | não | catalog | 4 | Cada estado tem UI e o retry refaz a query | Playwright | grupo 12 |
| CAT-10 | NFT inexistente | P1 | não | nft | 4 | ID ausente mostra não encontrado | Playwright | grupo 2 |
| CAT-11 | Edição esgotada e limite de quantidade | P1 | não | nft | 4, 6 | Quantidade não passa do estoque da edição | Playwright | grupo 2 e 5 |

## Sessão e conta

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| SES-01 | Cadastro, login, logout e sessão via API | P1 | não | auth | 5 | Cada ação chama o contrato, sem atalho local | Playwright | grupo 3 |
| SES-02 | Credencial inválida | P1 | não | auth | 5 | 401 permanece na tela de login | Playwright | grupo 3 |
| SES-03 | Sessão restaurada no refresh | P1 | não | auth | 5 | Recarregar mantém o usuário até expirar | Playwright | grupo 3 |
| SES-04 | Expiração na navegação e no checkout | P1 | não | auth | 5, 7 | 401 guarda `returnTo` e o rascunho do checkout | Playwright | grupo 3 e 7 |
| SES-05 | Troca de usuário limpa cache e listeners | P0 | sim | auth | 5, 8 | Depois do logout, a conta nova não vê favoritos da anterior | Playwright | grupo 3 |
| SES-06 | Rotas privadas exigem sessão | P1 | não | routes | 5 | Checkout, perfil, carteiras, favoritos e pedidos redirecionam | Playwright | grupo 3 |
| SES-07 | Duas contas fictícias e senha sem texto puro | P1 | não | mocks | 3 | Fixture guarda salt e hash; README lista as senhas de demo | revisão do mock e Vitest do hash | nota de segurança |
| SES-08 | Sessão no navegador é só demonstração | P2 | não | docs | 10 | ARCHITECTURE declara que o armazenamento não é modelo de produção | revisão | ARCHITECTURE.md |

## Favoritos, carrinho e dinheiro

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| FAV-01 | Favorito persiste para o autenticado | P1 | não | favorites | 6 | Refresh mantém o favorito daquela conta | Playwright | grupo 4 |
| FAV-02 | Mutation otimista com rollback | P1 | não | favorites | 6 | Falha de rede desfaz o coração marcado | Playwright | grupo 4 |
| CART-01 | Incluir, alterar e remover por edição | P1 | não | cart | 6 | Item único por NFT e edição | Playwright | grupo 5 |
| CART-02 | Visitante persiste e faz merge no login | P1 | não | cart | 6 | Item do visitante aparece na conta sem duplicar | Playwright | grupo 5 |
| CART-03 | Cupom válido, inválido, expirado e removido | P1 | não | cart | 6 | Só o válido muda desconto; removê-lo restaura o total sem desconto | Playwright | grupo 5 |
| CART-04 | Subtotal, desconto, taxa e total da API | P1 | não | quote | 6, 7 | Sem rede, a taxa é a estimativa da fixture e o total preliminar não é definitivo; a rede do checkout gera a cotação final | Playwright | grupo 5 e 6 |
| CART-05 | Preço e estoque ao vivo no carrinho | P1 | não | cart | 8 | `nft.updated` altera o resumo e invalida a cotação | Playwright | grupo 9 |
| MON-01 | ETH em string decimal e quantidade inteira | P1 | não | money | 3 | Contrato rejeita número JSON para valor | Vitest | teste de schema |
| MON-02 | Cálculo em wei com bigint | P1 | não | money | 3 | Soma e desconto não usam float | Vitest | teste de `domain/money` |
| MON-03 | Snapshot do pedido imutável | P1 | não | orders | 7 | Mudança posterior de preço não altera o recibo | Playwright | grupo 6 |

## Checkout e pedidos

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| CHK-01 | Revisão antes do envio | P1 | não | checkout | 7 | O botão final só existe na etapa de revisão | Playwright | grupo 6 |
| CHK-02 | Carteira, rede, conexão, recusa e desconexão | P1 | não | wallets | 7 | Recusa ou desconexão impede o envio | Playwright | grupo 6 |
| CHK-03 | Revalidar preço, estoque, cupom e taxa | P1 | não | quote | 7 | Total diferente exige nova confirmação | Playwright | grupo 9 |
| CHK-04 | Cotação velha bloqueia a compra | P1 | não | quote | 7, 8 | `nft.updated` marca a cotação como inválida | Playwright | grupo 9 |
| CHK-05 | Uma Idempotency-Key por tentativa | P1 | não | orders | 7 | Refresh e retry reenviam a mesma chave | Playwright | grupo 7 |
| CHK-06 | Mesma chave e mesmo payload devolvem o mesmo pedido do mesmo ator | P1 | não | orders | 3, 7 | O ator é identificado antes da tabela; a chave é ator + `Idempotency-Key`; cotação expirada ainda devolve o pedido já criado | Vitest do mock e Playwright | grupo 7 |
| CHK-07 | Mesma chave e payload diferente geram conflito | P1 | não | orders | 3 | Resposta 409 `IDEMPOTENCY_CONFLICT` para o mesmo ator | Vitest | teste de contrato |
| CHK-12 | B não reutiliza a tentativa de A | P0 | sim | orders | 3, 7 | B, com a chave e o payload de A, não recebe o pedido de A | Vitest e Playwright | teste negativo de idempotência |
| CHK-08 | Clique repetido e timeout não duplicam | P0 | sim | orders | 7 | Um único pedido após timeout | Playwright | grupo 7 |
| CHK-09 | Pending, confirmed e declined | P1 | não | orders | 7, 8 | Recusado não vira confirmado; terminal não regride | Playwright | grupos 6, 7 e 10 |
| CHK-10 | Recuperação após refresh e reconexão | P1 | não | orders | 7, 8 | Pedido pending reaparece sem nova compra | Playwright | grupo 10 |
| CHK-11 | Carrinho perde só as quantidades compradas | P1 | não | cart | 7 | Falha preserva o carrinho; sucesso remove o comprado | Playwright | grupos 6 e 7 |

## Perfil e carteiras

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| ACC-01 | Editar perfil, avatar e senha | P1 | não | profile | 5 | Valor novo sobrevive ao refresh; senha antiga falha | Playwright | grupo 8 |
| ACC-02 | Erros de validação da API ligados ao campo | P1 | não | profile | 5 | Mensagem associada ao input | Playwright e axe | grupos 8 e 11 |
| ACC-03 | Carteira isolada por usuário | P0 | sim | wallets | 5 | Conta B não vê o endereço da conta A | Playwright | grupo 8 |

## Contratos, mocks e tempo real

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| API-01 | Contratos tipados e documentados | P1 | não | contracts | 3 | Zod na borda HTTP e no mock | Vitest | docs de contrato |
| API-02 | Erros de validação, sessão, permissão, ausência, conflito e falha transitória | P1 | não | mocks | 3 | Códigos estáveis cobertos por teste | Vitest | tabela de erros |
| MSW-01 | Mocks na rede, não nos componentes | P0 | sim | mocks | 3 | Nenhum componente importa handler | revisão e lint de fronteira | CI |
| MSW-02 | Estado consistente e reset determinístico | P1 | não | mocks | 3 | Reset depois de falha volta à fixture | Playwright | grupo 12 |
| MSW-03 | Cenários de lentidão, timeout, 4xx, 5xx, sessão, cupom, preço, estoque, pagamento | P1 | não | demo | 3, 7, 8 | Cada cenário é selecionável pela API demo | Playwright | grupos 7, 9 e 12 |
| MSW-04 | Mocks ativos no build público | P1 | não | demo | 10 | A URL publicada lista o catálogo sem backend privado | smoke | URL pública |
| RT-01 | `nft.updated` público, com id, recurso e versão | P1 | não | realtime | 3, 8 | Evento antigo ou duplicado é descartado; mais de um cliente pode recebê-lo | Playwright | grupo 10 |
| RT-02 | `order.updated` privado atualiza pending sem duplicar efeito | P1 | não | realtime | 8 | Só o dono autenticado recebe; confirmação chega uma vez | Playwright | grupo 10 |
| RT-03 | Reconexão reconcilia por REST | P1 | não | realtime | 8 | Após queda, o pedido pending consulta `GET /api/orders/:id` | Playwright | grupo 10 |
| RT-04 | Evento de outra sessão é ignorado | P0 | sim | realtime | 8 | Logout encerra o listener antes do próximo login | Playwright | grupo 10 |

## Interface, acessibilidade, performance e entrega

| ID | Descrição | Prioridade | Eliminatório | Feature | Fase | Aceite | Validação | Evidência |
|---|---|---|---|---|---|---|---|---|
| A11Y-01 | Teclado, foco visível, diálogo e drawer | P1 | não | ui | 2, 9 | Foco volta ao acionador ao fechar | Playwright | grupo 11 |
| A11Y-02 | Label, erro associado, texto alternativo, contraste e estado além da cor | P1 | não | ui | 2, 9 | axe sem violação grave nas rotas principais | `@axe-core/playwright` | relatório axe |
| A11Y-03 | Skeletons com shimmer e reduced motion | P1 | não | ui | 4, 9 | Catálogo, detalhe e resumo reservam altura | Playwright | grupo 12 |
| A11Y-04 | Sem overflow horizontal em 390, 768 e 1440 | P1 | não | layout | 9 | `scrollWidth` não excede a viewport | Playwright | três projetos |
| A11Y-05 | Zoom de página sem perda de conteúdo | P1 | não | layout | 9 | Em 200% o texto e os controles continuam alcançáveis, sem corte obrigatório | Playwright | grupo 11 |
| A11Y-06 | Anúncio acessível de mutation e de evento em tempo real | P1 | não | ui | 6, 8 | Sucesso, erro e `nft.updated` ou `order.updated` entram em live region | Playwright | grupos 9 e 11 |
| VIS-01 | Fidelidade ao que foi medido no Figma | P1 | não | design | 2, 9 | Telas usam `#140D0A` e as larguras medidas; o resto aguarda a Fase 2 | revisão visual | baselines |
| VIS-02 | Regressão visual de início, detalhe, carrinho e pagamento | P2 | não | testes | 9 | Baselines desktop e mobile versionadas | Playwright screenshot | grupo visual |
| PERF-01 | Lighthouse nas metas do enunciado | P2 | não | audit | 9 | Mediana de 3 runs: performance ≥ 90, a11y ≥ 95, best practices ≥ 95, SEO ≥ 90 | Lighthouse | HTML, JSON e mediana |
| DOC-01 | README, ARCHITECTURE, contratos e cenários | P1 | não | docs | 10 | Um checkout limpo sobe com os comandos documentados | revisão | README |
| DOC-02 | Deploy público com refresh de rota | P0 | não | deploy | 10 | URL pública abre detalhe direto e mantém mocks | smoke manual | link no README |
| GIT-01 | CI sem segredo: install, tipos, lint, build, Chromium do Playwright e testes | P2 | não | ci | 10 | O workflow instala o Chromium do Playwright antes de `playwright test` | CI | artifact de teste |
| GIT-02 | Repositório local na Fase 1, após autorização dessa fase | P2 | não | git | 1 | `.gitignore` exclui perfil Chrome, `.env` real, chaves e artefatos, e permite `.env.example` fictício; sem push nesta autorização | revisão do arquivo | `.gitignore` |

Dependências transversais: CAT e CHK dependem dos contratos da Fase 3. RT-01 depende do spike EL-05 na Fase 1. VIS-01 depende da medição restante na Fase 2. EL-04 depende dos handlers e dos testes negativos, não só das query keys.
