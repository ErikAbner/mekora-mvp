import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { StatusBadge } from '../components/StatusBadge'

async function withLang(lang: string, fn: () => void) {
  await i18n.changeLanguage(lang)
  fn()
}

afterEach(async () => {
  await i18n.changeLanguage('pt')
})

describe('i18n — StatusBadge', () => {
  it('exibe label PT para status "done"', async () => {
    await withLang('pt', () => {
      render(<StatusBadge status="done" />)
      expect(screen.getByText('Concluído')).toBeInTheDocument()
    })
  })

  it('exibe label EN para status "done"', async () => {
    await withLang('en', () => {
      render(<StatusBadge status="done" />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('usa valor bruto como fallback para status desconhecido', async () => {
    await withLang('pt', () => {
      render(<StatusBadge status="custom" />)
      expect(screen.getByText('custom')).toBeInTheDocument()
    })
  })
})

describe('i18n — tradução de chaves', () => {
  it('chave nav.newBook está traduzida em PT', async () => {
    await i18n.changeLanguage('pt')
    expect(i18n.t('nav.newBook')).toBe('Novo Livro')
  })

  it('chave nav.newBook está traduzida em EN', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('nav.newBook')).toBe('New Book')
  })

  it('chave ausente retorna a chave original como fallback', async () => {
    await i18n.changeLanguage('pt')
    expect(i18n.t('chave.inexistente')).toBe('chave.inexistente')
  })

  it('interpolação funciona em PT', async () => {
    await i18n.changeLanguage('pt')
    expect(i18n.t('analysis.pageCount', { count: 42 })).toBe('42 páginas')
  })

  it('interpolação funciona em EN', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('analysis.pageCount', { count: 42 })).toBe('42 pages')
  })
})
