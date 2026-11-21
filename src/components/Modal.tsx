import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, eyebrow, children, dismiss }: {
  title: string
  eyebrow: string
  children: ReactNode
  dismiss: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  function close() {
    dialog.current?.close()
    dismiss()
  }

  return (
    <dialog ref={dialog} className="modal" aria-labelledby="modal-title"
      onCancel={(event) => { event.preventDefault(); close() }} onClick={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="modal-content">
        <button className="icon-button modal-close" aria-label="Close dialog" onClick={close}><X size={20} /></button>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </dialog>
  )
}
