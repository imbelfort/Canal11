import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';
type Notify = (message: string, kind?: ToastKind) => void;
interface Toast { id: number; message: string; kind: ToastKind }

const ToastContext = createContext<Notify>(() => {});
const icons = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info };

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const nextId = useRef(0);
  const active = useRef(new Map<number, Toast>());
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    active.current.delete(id);
    setToasts(Array.from(active.current.values()));
  }, []);

  const notify = useCallback<Notify>((message, kind = 'success') => {
    const text = message.trim();
    if (!text || Array.from(active.current.values()).some(toast => toast.message === text && toast.kind === kind)) return;
    const id = ++nextId.current;
    active.current.set(id, { id, message: text, kind });
    if (active.current.size > 4) {
      const oldest = active.current.keys().next().value;
      if (oldest !== undefined) dismiss(oldest);
    }
    setToasts(Array.from(active.current.values()));
    timers.current.set(id, window.setTimeout(() => dismiss(id), kind === 'error' ? 9000 : 5500));
  }, [dismiss]);

  useEffect(() => {
    const updateTarget = () => setTarget(Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? document.body);
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    updateTarget();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pending = timers.current;
    const queued = active.current;
    return () => {
      pending.forEach(timer => window.clearTimeout(timer));
      pending.clear();
      queued.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {target && toasts.length > 0 && createPortal(
        <div className="app-toasts" aria-label="Notificaciones">
          {toasts.map(({ id, kind, message }) => {
            const Icon = icons[kind];
            return <div className="app-toast" data-kind={kind} key={id}>
              <Icon size={19} aria-hidden="true" />
              <span role={kind === 'error' ? 'alert' : 'status'}>{message}</span>
              <button type="button" aria-label="Cerrar notificación" onClick={() => dismiss(id)}><X size={16} /></button>
            </div>;
          })}
        </div>, target,
      )}
    </ToastContext.Provider>
  );
}
