# Puesta en marcha de Stripe Checkout

El BMS registra un cobro por spot y cliente. El operador indica el concepto acordado y entrega al cliente el QR de PagoFácil o el enlace de Stripe. Cada pauta representa un pase publicitario. Los cobros de esta versión se registran por spot y no consumen pases, calculan tarifas por horario ni autorizan automáticamente la salida al aire.

## Valores a reemplazar

[Plantilla de variables](backend/.env.example) · [Creación de Checkout](backend/app/Services/StripeCheckoutService.php)

| Campo | Valor inicial | Configuración |
|---|---|---|
| `mode` | `payment` | Mantener para cobros publicitarios únicos. |
| `success_url` | `http://localhost:5173/?stripe=return&session_id={CHECKOUT_SESSION_ID}` | Configurar `STRIPE_CHECKOUT_DOMAIN` con la URL pública del frontend. Mantener el marcador de sesión. |
| `cancel_url` | `http://localhost:5173/?stripe=cancel` | Usa la misma URL pública. |
| `line_items[].price` | `price_...` | Configurar `STRIPE_PRICE_ID` con el ID de un [precio activo de pago único](https://dashboard.stripe.com/prices) en BOB o USD. El precio se consulta en el servidor y fija el importe del cobro. |
| `STRIPE_SECRET_KEY` | Vacío | Configurar la clave secreta del entorno correspondiente en Laravel. |
| `STRIPE_WEBHOOK_SECRET` | Vacío | Configurar el secreto de firma del endpoint de Stripe. |
| `PAGOFACIL_PAID_STATUS` | Vacío | Obtener de PagoFácil el valor exacto de `paymentStatus` que representa un pago confirmado. Configurarlo en Laravel. |

## Parámetros de Checkout Studio

[Servicio Stripe Checkout](backend/app/Services/StripeCheckoutService.php)

| Parámetro | Valor |
|---|---|
| `ui_mode` | `hosted_page` |
| `billing_address_collection` | `auto` |
| `phone_number_collection.enabled` | `false` |
| `automatic_tax.enabled` | `false` |
| `allow_promotion_codes` | `false` |
| `submit_type` | `auto` |
| `integration_identifier` | `hosted_web_0001` |
| `origin_context` | `web` |

El cobro único omite `payment_method_collection`, que corresponde al modo de suscripción. Laravel usa su cliente HTTP existente y la versión predeterminada de la cuenta de Stripe. La cuenta debe aceptar `hosted_page` y los parámetros vigentes de Checkout Studio. El navegador usa la URL alojada de la sesión y no necesita una clave pública. [Referencia de Checkout](https://docs.stripe.com/api/checkout/sessions/create)

## Configuración y pruebas

1. Completa las variables en `backend/.env`. Para Stripe Payments confirma que la cuenta comercial opera en un país admitido. Bolivia no figura en la lista para alta de cuentas de Payments. [Disponibilidad global](https://stripe.com/global)
2. Registra `POST /api/pagos/stripe/webhook` en Stripe con URL HTTPS pública para `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`. Usa el secreto de ese endpoint. En desarrollo, Stripe CLI puede reenviar a `localhost:8000/api/pagos/stripe/webhook`. [Webhooks de Checkout](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page)
3. En **Gestión BMS → Programación → Cobros publicitarios**, selecciona un spot, elige Stripe y genera el enlace. En modo de prueba usa `4242 4242 4242 4242`, una fecha futura y un CVC de tres dígitos. Prueba también cancelar y pulsar **Verificar pago**. [Tarjetas de prueba](https://docs.stripe.com/testing)
4. Verifica que el pago se registre una vez, con el cliente, spot, moneda e importe correctos. La página de retorno informa al cliente. La confirmación contable consulta la sesión de Stripe desde el servidor.
5. Prueba PagoFácil con credenciales válidas y su código de pago confirmado. Revisa los pagos históricos si se usó la antigua simulación de confirmación.
6. Antes de cobrar en producción, confirma la tarifa comercial y los requisitos de facturación. Si se venden varios paquetes, define los precios por paquete y la relación entre cobro y pases contratados.

La integración está en el [servicio Laravel](backend/app/Services/StripeCheckoutService.php), las [rutas API](backend/routes/api.php) y la [vista de cobros](frontend/src/components/BmsViews/CobrosPublicitarios.tsx). Ambos medios usan la tabla `pagos` existente.

[Soporte de Stripe](https://support.stripe.com) · [Stripe MCP](https://docs.stripe.com/mcp)
