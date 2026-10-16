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
    const media = window.matchMedia('(min-width: 1440px)')
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
    <div className="flex flex-col gap-[40px]">
      <h1 id="auth-title">{title}</h1>
      {children}
    </div>
  )

  if (desktop) {
    return (
      <dialog
        ref={dialogRef}
        aria-labelledby="auth-title"
        className="relative w-full max-w-[1200px] border-0 bg-ink p-0 text-inherit"
      >
        <button
          type="button"
          className="absolute top-0 right-0"
          onClick={() => dialogRef.current?.close()}
        >
          X
        </button>
        {stack}
      </dialog>
    )
  }

  return (
    <main className="flex flex-col gap-[40px] px-[28px] pb-[24px] pt-[80px]">
      <Link to="/" className="inline-flex h-[34.3px] w-[160px] items-center">
        KURIO
      </Link>
      {stack}
    </main>
  )
}
