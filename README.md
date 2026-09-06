# Rift Impostor

Social deduction game with the League of Legends champions. 3 to 10 players, one
phone passed around the group. No backend, no accounts: everything lives in
`localStorage`.

Bilingual: English at `/`, Spanish at `/es`.

## How to play

The game secretly picks a champion. Everyone sees it on their card except the
impostor. Then a round of one-word clues and a vote.

Before dealing you pick the difficulty with a switch:

- **Class hint on** (default) — the impostor is told it's a mage, a tank, a
  marksman. Something to bluff with. The class is drawn first so all six come up
  equally often.
- **Class hint off** — the impostor knows nothing at all. The champion is then
  drawn flat across all of them, because grouping by class would make each of
  the 17 assassins come up nearly three times as often as each of the 50
  fighters, for no reason.

| What happened | Impostor | Everyone else |
| --- | --- | --- |
| Got away, or the vote tied | 3 | 0 |
| Voted out | 0 | 1 each |

Escaping pays more than catching on purpose: without a shortlist of candidates,
the impostor has to bluff a clue about a champion they can't see, with the class
as their only lead — or nothing at all on hard mode. It's the hardest seat at the
table and it only comes around once every N rounds.

Rules adapted from *The Chameleon* (Big Potato Games) and *Spyfall*, minus the
candidate board: in LoL everybody already shares that board from memory, so
putting 16 portraits on screen only leaked information.

## Dirección visual

La pantalla es oscura por **función**, no por género: a la una de la mañana una
pantalla blanca te ilumina la cara y la lee el sillón de enfrente. Todo lo demás
rompe con el molde gamer — tipografía editorial ancha, una sola brasa ámbar para
la acción, cero glow, cero degradés violetas.

| Token | Valor | Para qué |
| --- | --- | --- |
| `--tinta` | `oklch(0.18 0.022 264)` | fondo |
| `--superficie` | `oklch(0.24 0.026 264)` | tarjetas y filas |
| `--brasa` | `oklch(0.8 0.14 80)` | acción, y "ganó el impostor" |
| `--menta` | `oklch(0.8 0.14 158)` | "ganó el grupo" |
| `--papel` | `oklch(0.96 0.008 264)` | texto (15.4:1 sobre tinta) |

Archivo Expanded 800 en versalitas para titulares, Work Sans para cuerpo, IBM
Plex Mono para metadatos y puntajes. Escala de espaciado de 4 (8/12/16/24/32/48),
márgenes laterales de 20, ningún objetivo táctil por debajo de 56 de alto y el
primario en 64 pegado al borde inferior, donde llega el pulgar.

Tres decisiones que no son estéticas y conviene no deshacer:

- **La carta del impostor tiene la misma silueta que la del inocente.** Mismo
  rectángulo 308×560, mismo borde, mismo botón. Si desde el sillón de enfrente
  se distingue quién es el impostor por la forma de la pantalla, el juego se
  rompe. La tensión la carga la escala tipográfica y el rayado, no el color.
- **La carta se dimensiona por la altura disponible**, no por su ancho: 560px no
  entran en un iPhone SE y sin eso el nombre del campeón se va abajo del fold.
- **Los titulares se dimensionan por el largo del texto** (`lib/typeFit.ts`):
  "Zed" y "Nunu & Willump" tienen que entrar los dos en una línea, y partir una
  palabra a la mitad ("FIDDLESTICK / S") queda peor que achicarla.

El dock de acción es `position: sticky` dentro de una columna de `100dvh`, no un
panel con scroll interno: el bloque de reglas va debajo del juego y tiene que
scrollear como página normal.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static build -> ./out
npm run champions    # regenerate src/data/champions.ts from Data Dragon
```

Run `npm run champions` when a new champion ships: it pulls the list, the image
keys and both locales (`en_US` + `es_MX`) from Riot's official CDN and rewrites
the data module. Never edit `src/data/champions.ts` by hand.

### Adding or changing copy

All user-facing text lives in `src/lib/i18n.ts`. English is the source of truth
and Spanish is typed against it (`const es: Dict`), so a missing or misspelled
key is a **build error**, not a string that silently falls back to English.

## Tests

```bash
npm run test:logic     # 25 checks de la lógica pura, 20.000 rondas por modo
npm run serve:out      # sirve out/ en :4321, igual que nginx
npm run test:e2e       # 99 checks en Chromium, viewport de celular
npm run audit          # layout: 2 idiomas x 8 resoluciones x 2 zooms
npm run shots          # lo mismo, y además guarda capturas en D:/tmp/rift-shots
```

`test:logic` corre contra `src/lib/game.ts` sin montar React. Cubre el sorteo,
la uniformidad del impostor y del primer hablante, y **que el campeón siempre
pertenezca a la clase anunciada** — ver `primaryRole()`.

El E2E juega cuatro rondas completas —los tres desenlaces más una en modo
difícil— y verifica
puntajes, tabla, persistencia al refrescar, cambio de idioma, carga real de las
imágenes de la CDN de Riot, ausencia de scroll horizontal y consola limpia
(incluidos 404 de recursos).

Correrlo también contra los deploys reales, no solo contra localhost:

```bash
E2E_BASE=http://mora-server:8090 npm run test:e2e
E2E_BASE=https://tu-deploy.vercel.app npm run test:e2e
```

Esto no es opcional: hay bugs que **solo** aparecen fuera de localhost. Ver
`newId()` en `src/lib/game.ts` — `crypto.randomUUID()` no existe en contextos
inseguros, así que agregar un jugador explotaba al servir por HTTP en una IP de
LAN o Tailscale, y en localhost el bug era invisible.

### `npm run audit` — el test de layout

`test:e2e` prueba reglas y flujo; `audit` prueba que **nada se corte**. Recorre
las diez pantallas en los dos idiomas, en ocho resoluciones (320×568 a
1920×1080) y con la fuente del navegador al 100% y al 125%, con diez jugadores
de nombre máximo, y falla si encuentra scroll horizontal, un elemento fuera del
viewport o un contenedor recortando su contenido.

El zoom se simula subiendo el `font-size` del `<html>`, que es el caso más duro:
el layout **no** se achica para compensar. Por eso los breakpoints de la barra
superior son container queries en `rem` y no media queries en `px` — una media
query en `px` no ve a un usuario con la fuente grande.

Corre con las animaciones activas a propósito, y muestrea el ancho del documento
durante la revelación: el titular entra escalado a 1.18 y sin recortar hacía
scrollear la página sola medio segundo.

## Deploy

The app is a pure static site (`output: "export"` in `next.config.ts`). There is
no server-side rendering at request time, no ISR and no `next/image`, so the same
`out/` directory works on any host.

### Vercel

```bash
npx vercel login
npx vercel --prod
```

Live at **https://rift-impostor.vercel.app**. The project has this environment
variable set for Production:

```
NEXT_PUBLIC_SITE_URL = https://rift-impostor.vercel.app
```

Change it there (and redeploy) if a custom domain ever replaces it.

Without it, the canonical URLs, the `hreflang` alternates, the `sitemap.xml` and
the Open Graph URLs all point at the fallback domain hardcoded in
`src/lib/site.ts`.

### moraserver (nginx, reachable over Tailscale at `http://mora-server:8090`)

```bash
npm run build
tar -czf - -C out . | ssh -p 2222 mora@wampaland.duckdns.org \
  'rm -rf /var/www/imposter-lol/* && tar -xzf - -C /var/www/imposter-lol'
```

## Structure

```
src/
  app/(en)/       root layout + page for /      -> <html lang="en">
  app/(es)/es/    root layout + page for /es    -> <html lang="es">
  app/sitemap.ts, robots.ts
  components/     Game.tsx is the state machine; screens/ one per phase
                  (setup, deal, clues, vote, reveal, scoreboard)
  lib/i18n.ts     every string, both languages, typed
  lib/game.ts     pure logic: round draw, scoring, ranking
  lib/storage.ts  hydration-safe localStorage hook
  lib/typeFit.ts  pasa el largo del texto a CSS para que el titular se ajuste
  data/           GENERATED — do not edit
scripts/          generador de datos de campeones, E2E y auditoría de layout
legacy/           the original plain-HTML v1, kept for reference
```

Two route groups exist because only a root layout can render `<html>`, and each
language needs its own `lang` attribute. `RootHtml.tsx` holds everything they
share.

`src/lib/game.ts` deliberately imports nothing from React, so it can be tested
with plain Node without mounting a component.

## Sugerencias

No hay formulario en la página porque no hay servidor detrás: el canal es
[GitHub Issues](https://github.com/facuga7van/rift-imposter/issues). GitHub pone
el formulario, el almacenamiento y el aviso por mail, y el sitio sigue sin
guardar un dato de nadie.

Las plantillas viven en `.github/ISSUE_TEMPLATE/` y hay una por idioma
(`sugerencia.yml` y `suggestion.yml`), porque el link del bloque de sugerencias
apunta a la del idioma en el que se está jugando. **Si se renombra un `.yml`, el
link no da 404**: GitHub cae al selector genérico y nadie se entera. Por eso el
E2E verifica el `href` exacto.

La contra de este canal es real y está dicha en la página: hace falta una cuenta
de GitHub para escribir. Es el precio de no tener backend.

## Legal

Fan project. Not endorsed by Riot Games and does not reflect their views. League
of Legends and Riot Games are trademarks of Riot Games, Inc. Champion data and
images come from Data Dragon, Riot's public CDN.
