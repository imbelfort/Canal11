<?php

namespace App\Services;

use App\Models\Pago;
use App\Models\SpotPublicitario;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class StripeCheckoutService
{
    public function create(SpotPublicitario $spot, string $concept, string $requestId): Pago
    {
        $priceId = config('services.stripe.price_id');
        $domain = rtrim((string) config('services.stripe.domain'), '/');
        abort_unless(is_string($priceId) && preg_match('/^price_[a-zA-Z0-9]+$/', $priceId)
            && filter_var($domain, FILTER_VALIDATE_URL) && preg_match('~^https?://~', $domain), 503,
            'Configura el precio y la URL de retorno de Stripe.');

        $key = hash('sha256', $spot->id . '|' . $requestId);
        try {
            $price = $this->result($this->client()->get('/prices/' . $priceId));
            $amount = $price['unit_amount'] ?? null;
            $currency = $price['currency'] ?? null;
            abort_unless(($price['active'] ?? false) && ($price['type'] ?? null) === 'one_time'
                && is_int($amount) && $amount > 0 && $amount <= 9999999999 && in_array($currency, ['bob', 'usd'], true), 503,
                'Stripe requiere un precio activo de pago único en BOB o USD.');
            $session = $this->result($this->client()->withHeader('Idempotency-Key', 'canal11-' . $key)->post('/checkout/sessions', [
                'ui_mode' => 'hosted_page',
                'mode' => 'payment',
                'billing_address_collection' => 'auto',
                'phone_number_collection' => ['enabled' => 'false'],
                'automatic_tax' => ['enabled' => 'false'],
                'allow_promotion_codes' => 'false',
                'submit_type' => 'auto',
                'integration_identifier' => 'hosted_web_0001',
                'origin_context' => 'web',
                'success_url' => $domain . '/?stripe=return&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $domain . '/?stripe=cancel',
                'line_items' => [['price' => $priceId, 'quantity' => 1]],
            ]));
        } catch (ConnectionException) {
            abort(502, 'No se pudo conectar con Stripe. Reintenta el mismo cobro.');
        }

        abort_unless(preg_match('/^cs_[a-zA-Z0-9_]+$/', $session['id'] ?? '')
            && str_starts_with($session['url'] ?? '', 'https://checkout.stripe.com/')
            && ($session['amount_total'] ?? null) === $amount && ($session['currency'] ?? null) === $currency, 502,
            'Stripe devolvió una sesión con datos distintos del precio configurado.');

        return Pago::firstOrCreate(['transaccion_id' => $session['id']], [
            'id_cliente' => $spot->id_cliente,
            'id_spot' => $spot->id,
            'monto' => $amount / 100,
            'moneda' => strtoupper($currency),
            'concepto' => $concept,
            'metodo_pago' => 'STRIPE',
            'estado' => 'PENDIENTE',
            'fecha_transaccion' => now(),
            'datos_adicionales' => ['checkout_url' => $session['url'], 'price_id' => $priceId],
        ]);
    }

    public function reconcile(Pago $pago, bool $failed = false): Pago
    {
        if ($pago->estado === 'PAGADO') {
            return $pago;
        }
        try {
            $session = $this->result($this->client()->get('/checkout/sessions/' . rawurlencode($pago->transaccion_id)));
        } catch (ConnectionException) {
            abort(502, 'No se pudo verificar el cobro con Stripe.');
        }

        abort_unless(($session['id'] ?? null) === $pago->transaccion_id
            && ($session['mode'] ?? null) === 'payment'
            && ($session['amount_total'] ?? null) === (int) round($pago->monto * 100)
            && ($session['currency'] ?? null) === strtolower($pago->moneda), 409, 'El importe o la moneda de Stripe no coincide con el cobro.');

        return DB::transaction(function () use ($pago, $session, $failed) {
            $stored = Pago::query()->lockForUpdate()->findOrFail($pago->id);
            if ($stored->estado !== 'PAGADO' && ($session['payment_status'] ?? null) === 'paid') {
                $stored->update([
                    'estado' => 'PAGADO',
                    'fecha_pago' => now(),
                    'datos_adicionales' => array_replace($stored->datos_adicionales ?? [], ['payment_intent' => $session['payment_intent'] ?? null]),
                ]);
            } elseif ($stored->estado === 'PENDIENTE' && ($session['status'] ?? null) === 'expired') {
                $stored->update(['estado' => 'EXPIRADO']);
            } elseif ($stored->estado === 'PENDIENTE' && $failed && ($session['payment_status'] ?? null) === 'unpaid') {
                $stored->update(['estado' => 'FALLIDO']);
            }

            return $stored;
        });
    }

    public function handleWebhook(string $body, string $signature): void
    {
        $secret = config('services.stripe.webhook_secret');
        abort_unless($secret, 503, 'El webhook de Stripe no está configurado.');
        preg_match('/(?:^|,)t=(\d+)(?:,|$)/', $signature, $timestamp);
        preg_match_all('/(?:^|,)v1=([a-f0-9]{64})(?=,|$)/', $signature, $versions);
        abort_unless(isset($timestamp[1]) && abs(time() - (int) $timestamp[1]) <= 300, 400);
        $expected = hash_hmac('sha256', $timestamp[1] . '.' . $body, $secret);
        abort_unless(collect($versions[1])->contains(fn ($actual) => hash_equals($expected, $actual)), 400);

        $event = json_decode($body, true);
        $type = $event['type'] ?? null;
        if (in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'], true)) {
            $sessionId = $event['data']['object']['id'] ?? null;
            if (is_string($sessionId) && $pago = Pago::where('metodo_pago', 'STRIPE')->where('transaccion_id', $sessionId)->first()) {
                $this->reconcile($pago, $type === 'checkout.session.async_payment_failed');
            }
        }
    }

    private function client(): PendingRequest
    {
        $secret = config('services.stripe.secret');
        abort_unless($secret, 503, 'Stripe aún no está configurado.');

        return Http::baseUrl('https://api.stripe.com/v1')->withBasicAuth($secret, '')->asForm()->acceptJson()->timeout(12);
    }

    private function result(Response $response): array
    {
        abort_unless($response->successful() && is_array($response->json()), 502,
            'Stripe no completó la solicitud. Revisa la configuración y el registro de solicitudes en Stripe.');

        return $response->json();
    }
}
