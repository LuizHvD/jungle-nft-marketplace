type UnavailablePageProps = {
  title: string
}

export function UnavailablePage({ title }: UnavailablePageProps) {
  return (
    <main className="flex flex-col gap-4 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-xl text-muted-foreground">
        Esta área ainda não faz parte do catálogo. O mercado, a conta e a compra
        continuam nas rotas atuais.
      </p>
    </main>
  )
}
