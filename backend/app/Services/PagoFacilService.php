<?php

namespace App\Services;

use App\Models\Pago;
use App\Models\ClientePublicitario;
use App\Models\SpotPublicitario;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PagoFacilService
{
    /**
     * Módulo reutilizable de integración con PagoFácil (QR / Tarjetas)
     * Puede utilizarse con Cliente, Spot o de manera independiente.
     */
    protected string $serviceUrl;
    protected string $tokenService;
    protected string $tokenSecret;

    public function __construct()
    {
        $this->serviceUrl = config('services.pagofacil.url', 'https://serviciopagofacil.com.bo/api');
        $this->tokenService = config('services.pagofacil.token_service', 'DEMO_TOKEN_SERVICE');
        $this->tokenSecret = config('services.pagofacil.token_secret', 'DEMO_TOKEN_SECRET');
    }

    /**
     * Generar Orden de Cobro y QR
     */
    public function generarCobroQr(array $params): array
    {
        $clienteId = $params['id_cliente'] ?? null;
        $spotId = $params['id_spot'] ?? null;
        $monto = (float)($params['monto'] ?? 0);
        $concepto = $params['concepto'] ?? 'Servicio de Pauta Publicitaria Canal 11 Grupo 12 SC';
        $moneda = $params['moneda'] ?? 'BOB';

        $transaccionId = 'PF-' . strtoupper(Str::random(10)) . '-' . time();

        // Generar un código QR visual o payload para la pasarela PagoFacil
        // Payload emulado / dinámico compatible con el protocolo QR Simple de PagoFácil
        $qrCadena = "PAGOFACIL|{$transaccionId}|{$monto}|{$moneda}|" . urlencode($concepto);
        
        // Formato Data URI SVG/PNG para QR legible de prueba
        $qrSvg = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" . urlencode($qrCadena);

        $pago = Pago::create([
            'id_cliente' => $clienteId,
            'id_spot' => $spotId,
            'monto' => $monto,
            'moneda' => $moneda,
            'concepto' => $concepto,
            'metodo_pago' => 'QR_PAGOFACIL',
            'estado' => 'PENDIENTE',
            'transaccion_id' => $transaccionId,
            'qr_imagen' => $qrSvg,
            'qr_cadena' => $qrCadena,
            'fecha_transaccion' => Carbon::now(),
            'datos_adicionales' => [
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'gateway' => 'PagoFacil Bolivia'
            ]
        ]);

        return [
            'success' => true,
            'pago' => $pago,
            'transaccion_id' => $transaccionId,
            'qr_imagen' => $qrSvg,
            'qr_cadena' => $qrCadena,
            'monto' => $monto,
            'moneda' => $moneda
        ];
    }

    /**
     * Confirmar / Conciliar Pago (Callback Webhook o Consulta Manual)
     */
    public function confirmarPago(string $transaccionId, array $datosPasarela = []): Pago
    {
        $pago = Pago::where('transaccion_id', $transaccionId)->firstOrFail();
        $pago->estado = 'PAGADO';
        $pago->fecha_pago = Carbon::now();
        $pago->datos_adicionales = array_merge($pago->datos_adicionales ?? [], [
            'callback_confirmado' => Carbon::now()->toDateTimeString(),
            'pasarela_response' => $datosPasarela
        ]);
        $pago->save();

        return $pago;
    }

    /**
     * Consultar Estado
     */
    public function consultarEstado(string $transaccionId): ?Pago
    {
        return Pago::with(['cliente', 'spot'])->where('transaccion_id', $transaccionId)->first();
    }
}
