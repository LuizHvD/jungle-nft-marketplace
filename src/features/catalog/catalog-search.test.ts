import { describe, expect, it } from 'vitest'

import { parseCatalogSearch } from './catalog-search.ts'

describe('parseCatalogSearch', () => {
  it('descarta o parâmetro inválido e conserva os válidos', () => {
    expect(
      parseCatalogSearch({
        q: 'moss',
        sort: 'nope',
        page: '2',
        pageSize: 10,
        available: true,
      }),
    ).toEqual({
      q: 'moss',
      page: 2,
      pageSize: 10,
      available: 'true',
    })
  })

  it('omite página, tamanho e disponibilidade fora do contrato', () => {
    expect(
      parseCatalogSearch({
        q: 'aurora',
        page: 0,
        pageSize: 100,
        available: 'maybe',
        sort: 'price-desc',
      }),
    ).toEqual({
      q: 'aurora',
      sort: 'price-desc',
    })
  })

  it('trata q vazio como ausente', () => {
    expect(parseCatalogSearch({ q: '', sort: 'price-asc' })).toEqual({
      sort: 'price-asc',
    })
  })
})
