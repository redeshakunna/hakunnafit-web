# HakunnaFit — Landing de venta a entrenadores

Proyecto independiente del sitio de Marion. Este es el sitio que vende la
plataforma HakunnaFit a entrenadores personales (no es un sitio de cliente
final).

## Cómo correrlo

```bash
npm install
npm run dev
```

## Variables de entorno

Reutiliza el mismo proyecto de Supabase que Marion BodyTrainer, solo para
guardar los leads del formulario de interés (tabla `hakunnafit_leads`, RLS de
solo inserción pública — sin lectura desde el sitio):

```
NEXT_PUBLIC_SUPABASE_URL=https://agrhzkwpwklycqtmdmed.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_inlo8UQNdUk91cJWMLvY0w_eCVrCTvi
```

Ya están en `.env.local` para desarrollo local. Para Vercel, agrégalas
manualmente en Project → Settings → Environment Variables.

## Pendientes

- `components/hakunnafit/hero.tsx` exporta `MARION_LIVE_URL` (actualmente
  `"#"`) — reemplázalo por la URL real de producción del sitio de Marion
  cuando esté desplegada, para que el botón "Ver ejemplo en vivo" funcione.
- El logo (`public/images/LogoHakunnaFit.png`) tiene fondo oscuro con glow —
  se usa recortado dentro de una insignia redondeada en el header/footer. Si
  consigues una versión con fondo transparente, el resultado se ve aún mejor.
- Este es el alcance liviano acordado (landing + formulario de interés). La
  multi-tenencia real (subdominio por entrenador, marca configurable) es la
  siguiente fase, una vez haya entrenadores confirmados.
