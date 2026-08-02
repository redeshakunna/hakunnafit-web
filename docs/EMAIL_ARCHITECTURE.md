# Arquitectura oficial del sistema de correos de HakunnaFit

Estado: **aprobado, vigente**. Toda implementación nueva de correo (server actions, crons, webhooks) debe pasar por este sistema — no se crean plantillas HTML sueltas ni se llama a Resend directamente desde otro lugar del código.

## 0. Resumen ejecutivo

Un solo motor de envío (`lib/email/`), un solo layout HTML reutilizable, y una capa de **identidad** que decide qué logo, colores, footer y remitente se ven — sin duplicar plantillas. Cada correo concreto ("cita agendada", "pago aprobado", etc.) es un **flow**: una función pura que arma el contenido (asunto, texto, botón) y declara de qué identidad viene. El motor combina flow + identidad + layout y produce el HTML final.

Esto es exactamente cómo lo resuelven Stripe, Shopify y Notion: ellos tampoco tienen "una plantilla por correo" — tienen un layout, una capa de theming, y decenas de generadores de contenido pequeños y tipados.

## 1. Simplificación clave respecto al brief original

El brief describe **3 tipos de identidad** (HakunnaFit / Entrenador / Cliente). Al diseñar el sistema encontramos que en realidad hay **2 identidades visuales** y una **audiencia** ortogonal a ellas:

- Identidad **HakunnaFit** (marca genérica): correos corporativos, siempre igual.
- Identidad **Entrenador** (marca del negocio del entrenador: logo, nombre comercial, colores, contacto): usada tanto para correos *al* entrenador como *a su cliente final* — el propio brief lo confirma ("Visualmente deben ser prácticamente iguales a los correos del entrenador").

Lo que cambia entre "correo al entrenador" y "correo al cliente" no es la marca, es:
- El **footer** (al entrenador se le muestran sus propios datos completos de contacto; al cliente se le muestran los datos de contacto *del entrenador*, más "Powered by HakunnaFit").
- El **tono/saludo** ("Hola Marion, tienes una cita nueva" vs. "Hola Juan, tu entrenador Marion te agendó una cita").
- El **remitente visible pensado por Resend** (incluye "vía Hakunna Fit" en ambos casos, pero el reply-to cambia).

Modelar esto como `identidad × audiencia` en vez de "3 identidades" evita triplicar el código de theming — el theming del entrenador se escribe una sola vez y se reutiliza para trainer y para cliente.

```ts
type Brand =
  | { kind: "hakunnafit" }
  | { kind: "trainer"; trainer: TrainerBrandingData };

type Audience = "admin" | "trainer" | "client";
```

Reglas: `kind: "hakunnafit"` solo se combina con `audience: "admin"`. `kind: "trainer"` se combina con `audience: "trainer"` o `"client"`. TypeScript puede modelar esto con tipos discriminados para que sea imposible construir, por ejemplo, un correo "cliente" sin datos del entrenador.

## 2. Estructura del layout (el "shell" único)

```
┌──────────────────────────────┐
│ Barra superior (slogan, opc.) │
├──────────────────────────────┤
│ HEADER (según identidad)      │  ← logo/mascota o logo+nombre del entrenador
├──────────────────────────────┤
│ CONTENIDO                     │  ← saludo, título, mensaje (por flow)
├──────────────────────────────┤
│ BOTÓN PRINCIPAL (opcional)    │  ← una sola acción, nunca varias
├──────────────────────────────┤
│ CAJA DE INFORMACIÓN (opcional)│  ← tabla de datos clave (fecha/hora, monto, etc.)
├──────────────────────────────┤
│ FOOTER (según identidad+aud.) │  ← contacto + redes + "Powered by" si aplica
└──────────────────────────────┘
```

Reglas de diseño (Gmail/Outlook/Apple Mail/Yahoo-safe, estilo Stripe/Shopify):
- Tablas + estilos inline únicamente (nada de flexbox/grid en el HTML del correo).
- Una sola imagen "hero" (logo o mascota pequeña) — nunca banners grandes ni composiciones de varias imágenes.
- Texto de preheader oculto (`display:none` + el truco de padding invisible) para controlar la línea de preview en la bandeja de entrada — el sistema actual no lo tiene y es una mejora fácil.
- Un único botón de acción por correo (mejor tasa de clic, y evita el problema de "3 CTAs distintos" que ya tienen algunos correos legacy).
- Mucho espacio en blanco, tipografía limpia con fallback de sistema si Google Fonts no carga (ya se hace hoy, se mantiene).

## 3. Variables dinámicas — el contrato `EmailContext`

```ts
// lib/mail/types.ts (ver nota de nombre en la sección 4)

export interface TrainerBrandingData {
  businessName: string;
  logoUrl: string | null;       // fallback: nombre estilizado en texto (ya existe el patrón en el editor)
  colorPrimario: string;
  colorSecundario: string;
  whatsapp: string | null;      // whatsapp_publico con fallback a whatsapp interno
  instagram: string | null;
  emailPublico: string | null;  // usado como reply-to
  subdominio: string | null;    // link a su landing
  avatarUrl: string | null;     // foto del entrenador (opcional en el header)
}

export type Brand =
  | { kind: "hakunnafit" }
  | { kind: "trainer"; trainer: TrainerBrandingData };

export type Audience = "admin" | "trainer" | "client";

export interface InfoBoxRow { label: string; value: string; }
export interface InfoBox { title?: string; rows: InfoBoxRow[]; }

export interface EmailContext {
  brand: Brand;
  audience: Audience;
  to: string;
  recipientName: string;
  subject: string;
  preheader?: string;
  heading: string;
  message: string;          // ya escapado o markdown mínimo (negritas) — decide el flow
  primaryButton?: { label: string; url: string };
  infoBox?: InfoBox;
  accentColorOverride?: string; // rara vez necesario; por defecto se deriva del brand
}
```

Todo flow produce un `EmailContext`; el layout nunca recibe HTML crudo salvo el ya generado internamente.

## 4. Organización del código

> **Nota de nombre:** conceptualmente esto es "lib/email/", pero el motor
> vive físicamente en **`lib/mail/`** — ya existía `lib/email.ts` (el
> archivo legacy) y el entorno de desarrollo usado para construir esto no
> permitió eliminarlo para liberar ese nombre de carpeta. Es un detalle de
> implementación sin impacto en el diseño; queda documentado para que nadie
> se sorprenda buscando "lib/email/" y solo encuentre el archivo legacy.

```
lib/mail/
  types.ts        → contratos (arriba)
  layout.ts        → renderEmailShell(ctx): string — el único generador de <html>...
  identity.ts       → resolveHeader(), resolveFooter(), resolveSender(), resolveAccentColor()
  send.ts          → sendEmail(ctx): Promise<void> — arma from/replyTo, llama a Resend, escribe en email_log
  registry.ts       → catálogo de flows (id, categoría, audiencia, builder) — alimenta el módulo admin
  flows/
    corporate/
      lead-nuevo.ts
      pago-aprobado.ts
      pago-rechazado.ts
      credenciales-acceso.ts
      cobro-proximo.ts
      cuenta-suspendida.ts
      cuenta-reactivada.ts
      soporte.ts
    trainer/
      nueva-cita.ts
      cita-reprogramada.ts
      cita-cancelada.ts
      nuevo-cliente-registrado.ts
      cobro-proximo-trainer.ts
    client/
      cita-agendada.ts
      cita-cambio.ts
      cita-cancelada.ts
      rutina-lista.ts
      recordatorio-entreno.ts
```

Cada archivo en `flows/**` exporta una función **pura** `build(input): EmailContext` (sin I/O) — fácil de testear y de usar en el preview del admin sin mandar nada de verdad.

`lib/email.ts` (el archivo actual) pasa a ser una capa de compatibilidad: sus funciones existentes (`sendAdminEmail`, `sendLeadEmail`, `renderNotificationEmail`, `renderLeadEmail`) se reescriben por dentro para llamar al nuevo motor, así los ~15 puntos del código que ya las usan seguirán funcionando sin tocarlos, pero automáticamente heredan el layout nuevo. Los flows *nuevos* (como la Agenda) se escriben directo contra `lib/email/` — la migración del resto de flows legacy a archivos dedicados en `flows/` es incremental, no un big-bang.

## 5. Cómo se almacenan las plantillas

**Decisión: código, no base de datos.** Los flows viven en TypeScript versionado en git, no como HTML editable desde el Super Admin. Razones:

- Seguridad: permitir HTML arbitrario editable desde un panel abre la puerta a inyección (XSS en correos que después se reenvían, se citan, etc.) y a romper el layout sin control de tipos.
- Trazabilidad: un cambio de copy pasa por commit + `tsc` + revisión, igual que cualquier otro cambio de producto — consistente con Clean Code / control de versiones que ya rige el resto del proyecto.
- Simplicidad (YAGNI): con un equipo de una persona, un CMS de correos interno es sobre-ingeniería. Si más adelante Marketing necesita editar copy sin depender de un deploy, la extensión natural es mover *solo los strings* (asunto/heading/mensaje) de flows puntuales a una tabla `email_copy_overrides` — el layout y la lógica de theming se quedan en código siempre. Se deja documentado como posible Fase 4, no se construye ahora.

## 6. Módulo de administración de correos (Super Admin)

Nueva pantalla `/panel-hakunna/correos`:

- Lista los flows del `registry.ts`, agrupados en 3 pestañas: Corporativo / Entrenador / Cliente.
- Por cada flow: nombre, última vez enviado (desde `email_log`), y botón "Previsualizar".
- Previsualizar abre un panel con el HTML renderizado (vía `renderEmailShell` + datos de ejemplo) en un `<iframe srcDoc=...>` — nunca se envía nada solo por previsualizar.
- "Enviar prueba": formulario con un correo destino; llama al mismo `sendEmail()` real con `isTest: true`, así se prueba el pipeline completo (Resend, remitente, footer) sin ensuciar métricas de envíos reales.
- Tabla de "Envíos recientes" leída de `email_log`: flow, destinatario, estado (enviado/fallido/omitido por falta de config), fecha — esto es lo que hoy no existe y fue exactamente el problema de "no me llegó el correo y no sabíamos por qué".

## 7. Preview y envío de prueba — detalle técnico

Un flow es una función pura `(input) => EmailContext`. El módulo admin y el preview usan **los mismos datos mock** que cualquier test unitario del flow — no hay una "versión especial para preview". Esto garantiza que lo que ves en el preview es exactamente lo que se manda en producción (mismo layout.ts, misma resolución de identidad).

## 8. Remitente y "reply-to" sin verificar un dominio por entrenador

Verificar un subdominio de envío distinto por cada entrenador en Resend no escala (sería una entrada DNS y una verificación manual por cliente). En vez de eso:

- **From** siempre sale del dominio verificado de HakunnaFit: `soporte@send.hakunnafit.com`.
- El **nombre visible** del remitente cambia dinámicamente: `"Hakunna Fit"` para corporativo, `"{Nombre del negocio} vía Hakunna Fit"` para entrenador/cliente — Resend permite un display name arbitrario sin verificar nada adicional.
- **Reply-To** se pone al `email_publico` del entrenador (si existe) en los correos de audiencia `trainer`/`client` — así, si un cliente responde el correo de su cita, la respuesta llega directo al entrenador, no a HakunnaFit. Esto es lo mismo que hacen plataformas como Calendly o Acuity para "correos en nombre de".

## 9. Buenas prácticas / por qué esto escala

- **Tipado estricto por audiencia**: imposible construir en tiempo de compilación un `EmailContext` de audiencia `client` sin `trainer` en el brand.
- **Registro de envíos (`email_log`)**: fin de los correos "silenciosamente no enviados" sin rastro.
- **Fallback silencioso preservado**: si falta `RESEND_API_KEY`, el sistema sigue sin lanzar error (como hoy), pero ahora queda constancia en `email_log` con estado `omitido_config`.
- **Migración incremental**: los ~15 call-sites actuales no se tocan de golpe; heredan el layout nuevo automáticamente vía la capa de compatibilidad, y se migran a `flows/` uno a uno cuando se toque ese código por otra razón.
- **Un solo lugar para cambiar el diseño**: si mañana cambia el logo o la paleta, se edita `layout.ts`/`identity.ts` una vez, no 20 plantillas.

## 10. Roadmap de implementación

1. **Fase 1 (esta sesión):** fundación de código (`lib/mail/types.ts`, `layout.ts`, `identity.ts`, `send.ts`), tabla `email_log`, y migración del flow de citas de la Agenda (`notifyAppointment`) como prueba de concepto end-to-end con marca real del entrenador.
2. **Fase 2:** módulo `/panel-hakunna/correos` (registry + preview + envío de prueba + tabla de envíos recientes).
3. **Fase 3:** migrar uno a uno los ~15 correos legacy (`lead_nuevo`, `pago-aprobado`, credenciales, etc.) a `flows/` dedicados.
4. **Fase 4 (si hace falta):** copy editable desde BD para flows puntuales, sin tocar layout/lógica.
