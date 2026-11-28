import { useToast } from '../../context/ToastContext';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { bmsApi } from '../../services/bmsApi';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';

interface Cobro {
  id: number;
  transaccion_id: string;
  monto: number;
  moneda: string;
  concepto: string;
  metodo_pago: string;
  estado: string;
  qr_imagen?: string;
  datos_adicionales?: { checkout_url?: string };
  cliente?: { razon_social: string };
  spot?: { titulo_spot: string };
}

interface SpotCobro {
  id: number;
  id_cliente: number;
  titulo_spot: string;
  estado: string;
  cliente?: { razon_social: string; estado: string };
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount);

export function CobrosPublicitarios() {
  const notify = useToast();
  const [payments, setPayments] = useState<Cobro[]>([]);
  const [spots, setSpots] = useState<SpotCobro[]>([]);
  const [method, setMethod] = useState('QR');
  const [spotId, setSpotId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [delivery, setDelivery] = useState<Cobro | null>(null);
  const retry = useRef<{ fingerprint: string; id: string } | null>(null);
  const selected = spots.find(spot => String(spot.id) === spotId);

  useEffect(() => {
    let active = true;
    Promise.all([bmsApi.getPagos(), bmsApi.getSpots()])
      .then(([rows, items]) => {
        if (active) {
          setPayments(rows);
          setSpots(items.filter(spot => spot.estado === 'ACTIVO' && spot.cliente?.estado === 'ACTIVO'));
        }
      })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || busy) return;
    const fields = new FormData(event.currentTarget);
    const concept = String(fields.get('concept')).trim();
    if (!concept) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (method === 'STRIPE') {
        const fingerprint = JSON.stringify([selected.id, concept]);
        if (retry.current?.fingerprint !== fingerprint) {
          retry.current = { fingerprint, id: crypto.randomUUID() };
        }
        const { pago } = await bmsApi.generarStripeCheckout({ id_spot: selected.id, concepto: concept, request_id: retry.current.id });
        retry.current = null;
        setDelivery(pago);
      } else {
        const amount = Number(fields.get('amount'));
        const qr = await bmsApi.generarPagoQr({ id_cliente: selected.id_cliente, id_spot: selected.id, monto: amount, concepto: concept });
        setDelivery({ id: 0, transaccion_id: qr.transaccion_id, concepto: concept, monto: amount, moneda: 'BOB', metodo_pago: 'QR_PAGOFACIL', estado: 'PENDIENTE', qr_imagen: qr.qrBase64 });
      }
      notify(method === 'STRIPE' ? 'Enlace de pago generado.' : 'QR de cobro generado.');
      setPayments(await bmsApi.getPagos());
    } catch (err) {
      setError((err as Error).message);
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (reference: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { pago } = await bmsApi.confirmarPago(reference);
      setPayments(previous => previous.map(item => item.transaccion_id === reference ? { ...item, ...pago } : item));
      setDelivery(previous => previous?.transaccion_id === reference ? { ...previous, estado: pago.estado } : previous);
      notify(pago.estado === 'PAGADO' ? 'La pasarela confirmó el pago.' : `Estado del cobro: ${pago.estado}.`, pago.estado === 'PAGADO' ? 'success' : 'info');
    } catch (err) {
      setError((err as Error).message);
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="bms-card">
        <h3 className="bms-card-title">Generar cobro publicitario</h3>
        <p className="bms-text-muted">Selecciona el spot, registra el concepto acordado y entrega al cliente el QR o el enlace de pago.</p>
        {!delivery && error && <p role="alert" className="operations-error">{error}</p>}
        {!delivery && notice && <p role="status">{notice}</p>}
        <form onSubmit={submit}>
          <fieldset className="program-editor-fields" disabled={busy}>
            <label className="bms-form-group">Spot y cliente
              <select required value={spotId} onChange={event => setSpotId(event.target.value)}>
                <option value="">Selecciona un spot</option>
                {spots.map(spot => <option key={spot.id} value={spot.id}>{spot.titulo_spot} · {spot.cliente?.razon_social}</option>)}
              </select>
            </label>
            <label className="bms-form-group">Método de pago
              <select value={method} onChange={event => setMethod(event.target.value)}>
                <option value="QR">PagoFácil QR (BOB)</option>
                <option value="STRIPE">Stripe Checkout</option>
              </select>
            </label>
            <label className="bms-form-group">Concepto acordado<input name="concept" required maxLength={255} placeholder="Ej. Paquete de 30 pases" /></label>
            {method === 'QR' ? <label className="bms-form-group">Monto acordado (BOB)<input name="amount" type="number" min="0.10" step="0.01" max="99999999.99" required /></label>
              : <p className="bms-text-muted">Stripe cobra el precio único configurado en su catálogo. El importe aparece junto al enlace generado.</p>}
          </fieldset>
          <button type="submit" className="bms-btn-primary" disabled={busy || !selected}>{busy ? 'Procesando…' : method === 'QR' ? 'Generar QR' : 'Generar enlace Stripe'}</button>
        </form>
      </section>
      <section className="bms-card">
        <h3 className="bms-card-title">Historial de cobros</h3>
        <div className="bms-table-container"><table className="bms-table">
          <thead><tr><th>Cliente y spot</th><th>Concepto</th><th>Método</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{payments.map(payment => <tr key={payment.id}>
            <td><strong>{payment.cliente?.razon_social}</strong><small>{payment.spot?.titulo_spot}</small></td>
            <td>{payment.concepto}</td>
            <td>{payment.metodo_pago === 'STRIPE' ? 'Stripe' : 'PagoFácil QR'}</td>
            <td>{formatAmount(payment.monto, payment.moneda)}</td>
            <td>{payment.estado}</td>
            <td>{payment.estado === 'PENDIENTE' && <div className="operations-actions">
              {(payment.qr_imagen || payment.datos_adicionales?.checkout_url) && <button type="button" disabled={busy} onClick={() => { setError(''); setNotice(''); setDelivery(payment); }}>Ver cobro</button>}
              <button type="button" disabled={busy} onClick={() => void verify(payment.transaccion_id)}>Verificar pago</button>
            </div>}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      {delivery && <WorkspaceDialog title={delivery.metodo_pago === 'STRIPE' ? 'Enlace de pago Stripe' : 'QR PagoFácil'} description={delivery.concepto} busy={busy} onClose={() => setDelivery(null)}>
        <div className="workspace-dialog-body quality-ingest">
          <strong>{formatAmount(delivery.monto, delivery.moneda)} · {delivery.estado}</strong>
          {delivery.qr_imagen && <img src={delivery.qr_imagen} alt="QR para pagar en PagoFácil" width={200} height={200} />}
          {delivery.datos_adicionales?.checkout_url && <div className="operations-actions">
            <a href={delivery.datos_adicionales.checkout_url} target="_blank" rel="noreferrer">Abrir Stripe Checkout</a>
            <button type="button" onClick={async () => {
              try {
                await navigator.clipboard.writeText(delivery.datos_adicionales!.checkout_url!);
                notify('Enlace copiado. Puedes compartirlo con el cliente.');
              } catch {
                setNotice('Abre Stripe Checkout y copia el enlace desde el navegador.');
              }
            }}>Copiar enlace</button>
          </div>}
          {delivery.estado === 'PENDIENTE' && <button type="button" className="bms-btn-secondary" disabled={busy} onClick={() => void verify(delivery.transaccion_id)}>Verificar pago</button>}
          {notice && <p role="status">{notice}</p>}
          {error && <p role="alert" className="operations-error">{error}</p>}
        </div>
      </WorkspaceDialog>}
    </div>
  );
}
