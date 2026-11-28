import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function DemoQr({ payload }: { payload: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    let active = true;
    QRCode.toCanvas(canvas.current, payload, { width: 200, margin: 4 })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [payload]);

  return failed ? <p>Referencia de prueba: {payload}</p> : <canvas ref={canvas} role="img" aria-label="Código QR de demostración" />;
}
