<?php

namespace App\Services;

use App\Models\Pago;
use App\Models\ClientePublicitario;
use App\Models\SpotPublicitario;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

/**
 * Servicio Modular e Independiente de PagoFácil QR Bolivia
 * Implementación fiel de las especificaciones v1.1.0 (2 de julio de 2025):
 * - POST /login (tcTokenService, tcTokenSecret, Bearer token)
 * - POST /list-enabled-services (servicios habilitados y límites)
 * - POST /generate-qr (generación de orden y QR Base64)
 * - POST /query-transaction (consulta de estado por companyTransactionId o pagofacilTransactionId)
 * - Callback Webhook POST (PedidoID, Fecha, Hora, MetodoPago, Estado) con acuse JSON {error:0, status:1, message, values:true}
 */
class PagoFacilService
{
    protected string $baseUrl;
    protected string $tokenService;
    protected string $tokenSecret;
    protected string $callbackUrl;

    public function __construct(
        ?string $baseUrl = null,
        ?string $tokenService = null,
        ?string $tokenSecret = null,
        ?string $callbackUrl = null
    ) {
        $this->baseUrl = rtrim($baseUrl ?? env('PAGOFACIL_URL', 'https://masterqr.pagofacil.com.bo/api/services/v2'), '/');
        $this->tokenService = $tokenService ?? env('PAGOFACIL_TOKEN_SERVICE', '');
        $this->tokenSecret = $tokenSecret ?? env('PAGOFACIL_TOKEN_SECRET', '');
        $this->callbackUrl = $callbackUrl ?? env('PAGOFACIL_CALLBACK_URL', 'http://127.0.0.1:8000/api/pagos/callback');
    }

    /**
     * Paso 1: Autenticación contra PagoFácil (POST /login)
     * Retorna el accessToken y su tiempo de expiración
     */
    public function login(): ?string
    {
        $cacheKey = 'pagofacil_bearer_token_' . md5($this->tokenService);
        if ($cachedToken = Cache::get($cacheKey)) {
            return $cachedToken;
        }

        try {
            $response = Http::withHeaders([
                'tcTokenService' => $this->tokenService,
                'tcTokenSecret' => $this->tokenSecret,
                'Response-Language' => 'es'
            ])->timeout(8)->post("{$this->baseUrl}/login");

            if ($response->successful()) {
                $data = $response->json();
                if (($data['error'] ?? 1) === 0 && !empty($data['values']['accessToken'])) {
                    $token = $data['values']['accessToken'];
                    $expiresInMinutes = (float)($data['values']['expiresInMinutes'] ?? 60);
                    // Guardar en cache con margen de seguridad de 5 minutos
                    Cache::put($cacheKey, $token, Carbon::now()->addMinutes(max(5, $expiresInMinutes - 5)));
                    return $token;
                }
            }
        } catch (\Throwable $e) {
            // Log si es necesario
        }

        return null;
    }

    /**
     * Paso 2: Listar Métodos Habilitados (POST /list-enabled-services)
     */
    public function listEnabledServices(): array
    {
        $token = $this->login();
        if (!$token) {
            return [
                [
                    'paymentMethodId' => 1,
                    'paymentMethodName' => 'QR Simple BCP / Red Enlace',
                    'currencyName' => 'BOB',
                    'maxAmountPerDay' => 50000.00,
                    'maxAmountPerTransaction' => 10000.00
                ]
            ];
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => "Bearer {$token}",
                'Response-Language' => 'es'
            ])->timeout(8)->post("{$this->baseUrl}/list-enabled-services");

            if ($res->successful() && ($res->json('error') === 0)) {
                return $res->json('values') ?? [];
            }
        } catch (\Throwable $e) {}

        return [];
    }

    public function generarQrSimulado(array $params): array
    {
        $reference = 'DEMO-' . Str::ulid();
        $payload = 'CANAL11:QR-DEMO:' . $reference;
        $pago = Pago::create([
            'id_cliente' => $params['id_cliente'],
            'id_spot' => $params['id_spot'] ?? null,
            'monto' => $params['monto'],
            'moneda' => 'BOB',
            'concepto' => $params['concepto'] ?? 'Pauta publicitaria',
            'metodo_pago' => 'QR_SIMULADO',
            'estado' => 'PENDIENTE',
            'transaccion_id' => $reference,
            'qr_cadena' => $payload,
            'fecha_transaccion' => now(),
        ]);

        return [
            'success' => true,
            'pago' => $pago,
            'transaccion_id' => $reference,
            'qrBase64' => null,
            'qr_imagen' => null,
            'monto' => $pago->monto,
        ];
    }

    /**
     * Paso 3: Generación del QR (POST /generate-qr)
     * Guarda la orden local y devuelve identificadores y Base64 del QR
     */
    public function generarCobroQr(array $params): array
    {
        $clienteId = $params['id_cliente'] ?? null;
        $spotId = $params['id_spot'] ?? null;
        $monto = (float)($params['monto'] ?? 0);
        $concepto = $params['concepto'] ?? 'Servicio de Pauta Publicitaria Canal 11 Grupo 12 SC';
        $moneda = $params['moneda'] ?? 'BOB';

        // Obtener cliente para nombres, nit, etc.
        $cliente = $clienteId ? ClientePublicitario::find($clienteId) : null;
        $nombreCliente = $cliente ? $cliente->razon_social : ($params['clientName'] ?? 'Cliente General');
        $nitCliente = $cliente ? $cliente->nit : ($params['documentId'] ?? '1234567');
        $telefonoCliente = $cliente ? ($cliente->telefono ?? '70000000') : '70000000';
        $emailCliente = $cliente ? ($cliente->email ?? 'contacto@empresa.bo') : 'contacto@empresa.bo';

        // paymentNumber único del comercio
        $paymentNumber = 'VENTA-' . Str::ulid();
        $clientCode = $cliente ? ('CLI-' . str_pad((string)$cliente->id, 5, '0', STR_PAD_LEFT)) : 'CLI-00001';

        // Intentar llamada a PagoFácil API
        $token = $this->login();
        $pfTransactionId = null;
        $qrBase64 = null;
        $expirationDate = Carbon::now()->addHours(2)->toDateTimeString();

        if ($token) {
            try {
                $payload = [
                    'paymentMethod' => 1,
                    'clientName' => $nombreCliente,
                    'documentType' => 1,
                    'documentId' => $nitCliente,
                    'phoneNumber' => $telefonoCliente,
                    'email' => $emailCliente,
                    'paymentNumber' => $paymentNumber,
                    'amount' => $monto,
                    'currency' => 2, // 2 = BOB
                    'clientCode' => $clientCode,
                    'callbackUrl' => $this->callbackUrl,
                    'tcUrlCallBack' => $this->callbackUrl,
                    'orderDetail' => [
                        [
                            'serial' => 1,
                            'product' => $concepto,
                            'quantity' => 1,
                            'price' => $monto,
                            'discount' => 0,
                            'total' => $monto
                        ]
                    ]
                ];

                $pfRes = Http::withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Content-Type' => 'application/json',
                    'Response-Language' => 'es'
                ])->timeout(10)->post("{$this->baseUrl}/generate-qr", $payload);

                if ($pfRes->successful() && $pfRes->json('error') === 0) {
                    $vals = $pfRes->json('values') ?? [];
                    $pfTransactionId = (string)($vals['transactionId'] ?? null);
                    $qrBase64 = $vals['qrBase64'] ?? null;
                    if (!empty($vals['expirationDate'])) {
                        $expirationDate = $vals['expirationDate'];
                    }
                }
            } catch (\Throwable $e) {}
        }

        abort_unless($qrBase64 && $pfTransactionId, 502, 'PagoFácil no generó un QR válido.');
        if (!str_starts_with($qrBase64, 'data:') && !str_starts_with($qrBase64, 'http')) {
            $qrBase64 = 'data:image/png;base64,' . $qrBase64;
        }

        // Registrar orden local
        $pago = Pago::create([
            'id_cliente' => $clienteId,
            'id_spot' => $spotId,
            'monto' => $monto,
            'moneda' => $moneda,
            'concepto' => $concepto,
            'metodo_pago' => 'QR_PAGOFACIL',
            'estado' => 'PENDIENTE',
            'transaccion_id' => $paymentNumber,
            'qr_imagen' => $qrBase64,
            'qr_cadena' => null,
            'fecha_transaccion' => Carbon::now(),
            'datos_adicionales' => [
                'pagofacil_transaction_id' => $pfTransactionId,
                'company_transaction_id' => $paymentNumber,
                'expiration_date' => $expirationDate,
                'ip' => request()->ip(),
                'gateway' => 'PagoFacil Bolivia v2'
            ]
        ]);

        return [
            'success' => true,
            'pago' => $pago,
            'transaccion_id' => $paymentNumber,
            'pagofacil_transaction_id' => $pfTransactionId,
            'qr_imagen' => $qrBase64,
            'qrBase64' => $qrBase64,
            'monto' => $monto,
            'moneda' => $moneda,
            'expiration_date' => $expirationDate
        ];
    }

    /**
     * Paso 4: Consulta de Transacción (POST /query-transaction)
     */
    public function queryTransaction(string $transactionId): array
    {
        $pago = Pago::where('metodo_pago', 'QR_PAGOFACIL')->where('transaccion_id', $transactionId)->firstOrFail();
        $providerId = $pago->datos_adicionales['pagofacil_transaction_id'] ?? null;
        abort_unless($providerId, 409, 'El cobro no tiene una transacción verificable de PagoFácil.');
        $token = $this->login();
        abort_unless($token, 502, 'No se pudo conectar con PagoFácil.');

        try {
            $response = Http::withToken($token)->acceptJson()->timeout(8)
                ->post("{$this->baseUrl}/query-transaction", ['companyTransactionId' => $transactionId]);
        } catch (\Illuminate\Http\Client\ConnectionException) {
            abort(502, 'No se pudo verificar el cobro con PagoFácil.');
        }
        abort_unless($response->successful() && $response->json('error') === 0 && is_array($response->json('values')),
            502, 'PagoFácil no pudo verificar el cobro.');
        $details = $response->json('values');
        $paidStatus = config('services.pagofacil.paid_status');
        if ($paidStatus !== null && $paidStatus !== '' && isset($details['paymentStatus'])
            && (string) $details['paymentStatus'] === (string) $paidStatus) {
            abort_unless(($details['companyTransactionId'] ?? null) === $transactionId
                && (string) ($details['pagofacilTransactionId'] ?? '') === (string) $providerId
                && (string) ($details['currencyId'] ?? '') === '2'
                && is_numeric($details['amount'] ?? null)
                && (int) round((float) $details['amount'] * 100) === (int) round($pago->monto * 100),
                409, 'Los datos del pago no coinciden con el cobro registrado.');
            DB::transaction(function () use ($pago) {
                Pago::whereKey($pago->id)->where('estado', 'PENDIENTE')->update(['estado' => 'PAGADO', 'fecha_pago' => now()]);
            });
        }

        return $details;
    }

    public function handleCallback(array $callbackData): array
    {
        $reference = $callbackData['PedidoID'] ?? $callbackData['pedidoId'] ?? null;
        if (is_string($reference) && Pago::where('metodo_pago', 'QR_PAGOFACIL')->where('estado', 'PENDIENTE')
            ->where('transaccion_id', $reference)->exists()) {
            $this->queryTransaction($reference);
        }

        return ['error' => 0, 'status' => 1, 'message' => 'Notificación recibida', 'values' => true];
    }
}
