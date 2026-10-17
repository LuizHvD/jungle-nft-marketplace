import { Link } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type ReactNode } from 'react'

const features = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    description: 'Proteja a carteira e colecione arte digital verificada.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    description: 'Artistas e estúdios que moldam a cultura digital.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    description: 'Calendário de cunhagem e novidades do mercado.',
  },
]

const helpLinks = [
  'Central de ajuda',
  'Guia de compra',
  'Carteira e segurança',
  'Política do mercado',
]

const socials = ['Facebook', 'Instagram', 'X', 'LinkedIn', 'YouTube']

export function SiteFooter() {
  const [notice, setNotice] = useState('')

  return (
    <footer
      data-testid="site-footer"
      className="page-container px-6 pt-16 pb-28 md:px-8 md:pb-10 min-[1440px]:px-[120px]"
    >
      <div className="overflow-hidden bg-surface">
        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.letter} className="flex flex-col">
              <span
                aria-hidden="true"
                className="flex size-[74px] items-center justify-center rounded-full bg-primary text-[22px] font-bold text-ink"
              >
                {feature.letter}
              </span>
              <h2 className="mt-3 text-[17px] leading-6 font-semibold">
                {feature.title}
              </h2>
              <p className="mt-1.5 max-w-[220px] text-sm leading-[22px] text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
          <NewsletterForm onNotice={setNotice} />
        </div>
        <div className="grid items-center gap-4 bg-surface-strong px-6 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <span className="text-[15px] font-bold tracking-[0.08em]">KURIO</span>
          <p className="max-w-60 leading-[22px]">
            Feito para colecionadores e cultura digital
          </p>
          <a href="mailto:contato@email.com" className="w-fit hover:text-brand">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="w-fit hover:text-brand">
            +55 11 4002 8922
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 px-6 pt-7 pb-10 md:grid-cols-4">
          <FooterColumn title="Meu perfil">
            <Link to="/perfil" className="text-sm hover:text-brand">
              Meu perfil
            </Link>
            <Soon label="Minha coleção" onNotice={setNotice} />
            <Link to="/pedidos" className="text-sm hover:text-brand">
              Pedidos
            </Link>
            <Link to="/favoritos" className="text-sm hover:text-brand">
              Lista de interesse
            </Link>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            {helpLinks.map((label) => (
              <Soon key={label} label={label} onNotice={setNotice} />
            ))}
          </FooterColumn>
          <FooterColumn title="Coleções">
            <Link to="/" hash="mercado" className="text-sm hover:text-brand">
              Todos os NFTs
            </Link>
            <Soon label="Arte digital" onNotice={setNotice} />
            <Soon label="Fotografia" onNotice={setNotice} />
            <Soon label="Música" onNotice={setNotice} />
          </FooterColumn>
          <div className="col-span-2 flex flex-col md:col-span-1">
            <h2 className="text-lg leading-7 font-semibold">Redes sociais</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {socials.map((label) => (
                <li key={label}>
                  <button
                    type="button"
                    aria-label={`${label.slice(0, 2)}, Kurio no ${label}`}
                    className="flex size-8 items-center justify-center rounded-sm border border-primary text-[10px] font-bold text-primary hover:bg-primary/15"
                    onClick={() =>
                      setNotice(
                        `O perfil no ${label} ainda não está publicado.`,
                      )
                    }
                  >
                    <span aria-hidden="true">{label.slice(0, 2)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <h2 className="mt-7 text-lg leading-7 font-semibold">
              Carteiras compatíveis
            </h2>
            <p className="mt-3 w-fit rounded-sm border border-border bg-surface-strong px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-brand">
              Carteira simulada da conta
            </p>
          </div>
        </div>
      </div>
      {notice ? (
        <p
          role="status"
          className="mt-3 text-center text-sm text-muted-foreground"
        >
          {notice}
        </p>
      ) : null}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        © 2026 Kurio. Propriedade digital para colecionadores.
      </p>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg leading-7 font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function Soon({
  label,
  onNotice,
}: {
  label: string
  onNotice: (message: string) => void
}) {
  return (
    <button
      type="button"
      className="w-fit text-left text-sm text-subtle-foreground"
      onClick={() => onNotice(`${label} chega em uma próxima versão.`)}
    >
      {label}
    </button>
  )
}

function NewsletterForm({ onNotice }: { onNotice: (message: string) => void }) {
  const inputId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }
    setError('')
    onNotice('A inscrição em alertas ainda não envia e-mail.')
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      <h2 className="text-lg leading-6 font-semibold">Newsletter</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Antecipe-se ao próximo lançamento
      </p>
      <div className="mt-4 flex">
        <label htmlFor={inputId} className="sr-only">
          Alertas de lançamento
        </label>
        <input
          id={inputId}
          type="email"
          value={email}
          placeholder="digite seu e-mail..."
          aria-invalid={error ? true : undefined}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-l-sm border border-transparent bg-surface-strong px-3 text-sm placeholder:text-subtle-foreground"
        />
        <button
          type="submit"
          className="h-10 rounded-r-sm bg-primary px-4 font-bold text-ink hover:bg-primary/85"
        >
          Enviar
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <p className="mt-3 text-[13px] leading-[22px] text-muted-foreground">
        Lançamentos selecionados e novidades do mercado.
      </p>
    </form>
  )
}
