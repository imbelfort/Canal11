import { useEffect, useId, useRef, type ReactNode } from 'react';

interface WorkspaceDialogProps {
  title: string;
  description?: string;
  wide?: boolean | 'full';
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function WorkspaceDialog({ title, description, wide, busy, onClose, children }: WorkspaceDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const panel = dialog.current;
    panel?.showModal();
    return () => { panel?.close(); };
  }, []);

  return (
    <dialog ref={dialog} className={`workspace-dialog${wide === 'full' ? ' workspace-dialog-full' : wide ? ' workspace-dialog-wide' : ''}`}
      aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <header className="workspace-dialog-header">
        <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
        <div className="operations-actions"><button type="button" disabled={busy} onClick={onClose}>Cerrar</button></div>
      </header>
      {children}
    </dialog>
  );
}
