import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { closeAuthTarget } from '@/lib/session/return-to.ts'

import { focusAuthTrigger } from './focus-auth-trigger.ts'

type AuthScreenProps = {
  title: string
  returnTo?: string
  children: ReactNode
}

export function AuthScreen({ title, returnTo, children }: AuthScreenProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const ignoreClose = useRef(false)
  const navigate = useNavigate()
  const [desktop, setDesktop] = useState(false)

  useLayoutEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const apply = () => setDesktop(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useLayoutEffect(() => {
    if (!desktop) {
      return
    }
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (!dialog.open) {
      dialog.showModal()
    }
    dialog.querySelector('input')?.focus()
    const onClose = () => {
      if (ignoreClose.current) {
        return
      }
      void navigate({ href: closeAuthTarget(returnTo) }).then(() => {
        focusAuthTrigger()
      })
    }
    dialog.addEventListener('close', onClose)
    return () => {
      ignoreClose.current = true
      dialog.removeEventListener('close', onClose)
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [desktop, navigate, returnTo])

  const stack = (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <h1 id="auth-title" className="text-center text-2xl font-bold">
        {title}
      </h1>
      {children}
    </div>
  )

  if (desktop) {
    return (
      <dialog
        ref={dialogRef}
        aria-labelledby="auth-title"
        className="m-auto w-full max-w-lg rounded-xl border border-border bg-surface p-8 text-inherit"
      >
        <button
          type="button"
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-brand"
          onClick={() => dialogRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Fechar</span>
        </button>
        {stack}
      </dialog>
    )
  }

  return (
    <main className="flex flex-col gap-10 px-7 pt-16 pb-8">
      <Link to="/" className="mx-auto text-2xl font-bold tracking-[0.2em]">
        KURIO
      </Link>
      {stack}
    </main>
  )
}
