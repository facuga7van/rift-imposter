# Salas online — diseño

Fecha: 2026-11-21. Estado: v2, revisado por Fable 5.2 (advisor) y con sus cambios aplicados.

## Objetivo

Que un grupo de amigos en una llamada de Discord pueda jugar Rift Impostor cada uno desde su dispositivo. La app reparte las cartas en secreto, sincroniza las fases y recibe los votos. **Las pistas y la discusión siguen siendo por voz.**

El modo actual (un celular que se pasa de mano) queda intacto en su comportamiento. Sus pantallas se refactorizan para compartir piezas con el modo online.

## Decisiones tomadas

| Tema | Decisión | Quién |
|---|---|---|
| Pistas y voto | Pistas por voz; cada uno vota en su dispositivo; el resultado se calcula solo | Facu |
| Control de la partida | Avanza el anfitrión; si se va, el rol pasa a otro conectado | Facu |
| Entrar tarde | Entra con asiento sin carta y juega desde la ronda siguiente, con 0 puntos | Facu |
| Identidad | Link con código corto + nombre. Sin cuentas ni login | Facu |
| Backend | Cloudflare Worker + un Durable Object por sala | Facu |
| Hosting | Todo en Cloudflare: el mismo Worker sirve el `out/` estático y las salas. Dominio `rift.wampaland.com.ar` | Facu |
| Detalle de diseño | Delegado en Fable 5.2 como advisor | Facu |

## Fuera de alcance

Pistas escritas o chat, timers por fase, cuentas, espectadores aparte de los asientos, Discord Activity, varios impostores, mazos nuevos. Se reconsideran con datos de uso.

## Arquitectura

```
navegador ──HTTPS──▶ Worker (rift.wampaland.com.ar)
                      ├─ /api/*  → código del Worker  (run_worker_first: ["/api/*"])
                      │    ├─ POST /api/sala            crea sala, devuelve código
                      │    └─ GET  /api/sala/:code/ws   upgrade → Durable Object
                      └─ resto   → static assets (out/), gratis e ilimitados

Durable Object "Room" (uno por código, idFromName(code))
  ├─ estado en storage (backend SQLite, el único disponible en el plan Free)
  ├─ WebSockets con la API de hibernación
  └─ una sola alarm: min(gracia del anfitrión, expiración)
```

| Archivo | Responsabilidad |
|---|---|
| `wrangler.jsonc` | `assets` (`directory: "./out"`, `binding: "ASSETS"`, `not_found_handling: "404-page"`, `run_worker_first: ["/api/*"]`), binding `ROOM`, migración `new_sqlite_classes: ["Room"]`, `routes: [{ pattern: "rift.wampaland.com.ar", custom_domain: true }]`, `workers_dev: false`, `preview_urls: false` |
| `worker/index.ts` | Router mínimo de `/api/*`. Valida el código contra el alfabeto antes de `idFromName`. Nada de lógica de juego |
| `worker/room.ts` | Clase `Room`. Capa delgada: sockets, storage, alarm, difusión. Delega todo a `logic.ts` |
| `worker/tsconfig.json` | Tipos de Workers (de `wrangler types`). El `tsconfig.json` raíz agrega `worker` a `exclude`, para que `next build` no lo chequee con lib DOM |
| `src/lib/room/logic.ts` | **Lógica pura** de la sala: `reduce(state, event, ctx) → RoomState \| RoomError`, `snapshotFor(state, seatId)`, `nextAlarmAt(state)`. Sin I/O, sin tipos de DOM ni de Workers |
| `src/lib/room/protocol.ts` | Tipos de mensajes, `PROTOCOL_VERSION`, códigos de cierre y alfabeto de códigos. Compartido por Worker y frontend |
| `src/lib/room/useRoom.ts` | Hook del cliente: ciclo del WebSocket, reconexión, ping, snapshot y `send` |
| `src/components/online/*` | Pantallas propias del modo online: entrada, lobby, estado de conexión |
| `src/app/(en)/play/page.tsx`, `src/app/(es)/es/jugar/page.tsx` | Páginas estáticas del modo online |

`wrangler` va como devDependency fijada (`>= 4.20`, necesaria para `run_worker_first` con array).

**Imports:** `logic.ts`, `protocol.ts` y `game.ts` usan imports relativos con extensión `.ts` (`game.ts` importa `../data/champions.ts`), con `allowImportingTsExtensions` en el `tsconfig`. Así Node corre sus tests directo y el bundler de wrangler no depende del alias `@/`. Es el único cambio a `game.ts`. `champions.ts` solo tiene `import type` cruzados: el Worker no arrastra React ni Next (unos 41 KB).

## Modelo de estado (servidor)

```ts
type RoomState = {
  v: number;                          // PROTOCOL_VERSION con que se creó
  code: string;
  createdAt: number;
  lastActivity: number;
  hostId: string | null;
  hostGraceUntil: number | null;
  phase: "lobby" | "deal" | "clues" | "vote" | "reveal" | "end";
  settings: { roleHint: boolean };
  seats: Seat[];                      // orden de llegada, máximo 10
  round: Round | null;                // de game.ts; NUNCA sale en un snapshot
  participants: string[];             // ids que juegan la ronda en curso
  ready: string[];
  votes: Record<string, string | null>;
  outcome: Outcome | null;
  deltas: Record<string, Partial<PlayerStats>>;
  tally: Record<string, number> | null;
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
};

type Seat = {
  id: string;
  tokenHash: string;   // SHA-256 del token del cliente
  name: string;        // único en la sala
  gone: boolean;       // se fue o lo expulsaron a mitad de ronda
  joinedAt: number;
};
```

**`connected` no se guarda: se deriva.** En cada evento, `Room` calcula `connectedIds` desde `ctx.getWebSockets()` + `deserializeAttachment()` y se lo pasa a `reduce` dentro de `ctx`. Así un reinicio del objeto no deja asientos fantasma, y dos pestañas con el mismo token no se pisan.

**Escrituras:** `Room` guarda y difunde solo si `reduce` devolvió un estado distinto. Un voto repetido, un `ready` duplicado o una conexión que no cambia nada no escriben. El estado completo pesa menos de 10 KB y se guarda entero en una clave.

## Identidad y conexión

- Al entrar, el cliente genera `token` (128 bits aleatorios) y lo guarda en `localStorage` bajo `rift.room.<code>`. **El token nunca llega a otros jugadores**; el servidor guarda solo su hash.
- Al conectar, el cliente manda `hello { v, token, name }`. Si el hash coincide con un asiento, recupera su lugar, su carta y su puntaje. Si no hay asiento y queda lugar, se crea uno. El nombre del `hello` se aplica solo en `lobby`.
- **Un `hello` con un token que ya tiene socket abierto cierra el socket viejo** con el código `4002` (reemplazado).
- El attachment del socket guarda `{ seatId, v }`, para reconocerlo después de hibernar.
- **El DO siempre acepta el upgrade.** El navegador no puede leer el status HTTP de un upgrade fallido, así que los errores fatales viajan como mensaje `error` seguido de un cierre con código `4000`–`4999`. **El cliente no reconecta ante un cierre `4xxx`.**
- Reconexión ante cualquier otro cierre: backoff de 0,5 s a 8 s. Además, cuando la pestaña vuelve a estar visible, el cliente manda `ping`. Si no recibe `pong` en 3 s, reconecta. El DO responde con `setWebSocketAutoResponse("ping", "pong")`, que no lo despierta ni se cobra.
- **Versión:** los sockets hibernables sobreviven a un deploy (el update del DO se difiere hasta 300 s), así que una pestaña vieja puede seguir conectada sin pasar por `hello`. Un mensaje de un socket cuya `v` no coincide recibe `bad_version` y cierre. Un estado guardado con otra `v` se trata como sala inexistente.

## Protocolo

Cliente → servidor. Los mensajes fuera de fase o de alguien sin permiso se descartan en silencio.

| Mensaje | Quién | Fase |
|---|---|---|
| `hello { v, token, name }` | todos | cualquiera |
| `settings { roleHint }` | anfitrión | lobby |
| `start` | anfitrión | lobby, con ≥ 3 conectados |
| `ready` | participante | deal |
| `advance` | anfitrión | deal → clues → vote |
| `vote { target: id \| null }` | participante | vote (se puede cambiar hasta el cierre) |
| `closeVote` | anfitrión | vote, con votos de más de la mitad de los participantes no retirados |
| `nextRound` | anfitrión | reveal |
| `cancelRound` | anfitrión | deal, clues, vote |
| `newGame` | anfitrión | end |
| `kick { id }` | anfitrión | cualquiera (no a sí mismo) |
| `leave` | todos | cualquiera |

Servidor → cliente:

- `snapshot`: estado filtrado para cada jugador, después de cada cambio. Nada de diffs.
  - **Se arma por lista blanca, campo por campo. Nunca se clona `RoomState` para borrarle cosas.**
  - Siempre: código, fase, `hostId`, asientos (`id`, `name`, `connected`, `gone`), ajustes, puntajes, número de ronda, `clueOrder`, ids listos, ids que votaron (no a quién).
  - `you: { id, isHost, role }`, con `role` igual a `{ kind: "crew", championId }`, `{ kind: "impostor", roleHint: Role | null }` o `{ kind: "waiting" }` (entró tarde). **La clase solo le llega al impostor, y solo si `roleHint` está prendido.**
  - En `reveal` y `end`, para todos: `{ championId, impostorId, outcome, deltas, tally }`.
  - **Nunca** incluye `round`, `impostorPlayerId` antes de `reveal`, ni `tokenHash`.
- `error { code }` antes de un cierre `4xxx`: `room_not_found` (4004), `room_full` (4009), `bad_version` (4010), `kicked` (4003), reemplazado (4002).

## Reglas del modo online

**Asientos**
- Máximo 10. El 11.º recibe `room_full`.
- El primero que entra es el anfitrión.
- Nombres de 1 a 20 caracteres después de `trim`, sin caracteres de control. Si el nombre ya existe, el servidor le agrega " 2", " 3", etc.

**Ronda**
- **Participantes** = asientos conectados y no retirados al hacer `start` o `nextRound`. Los que entran después ven "entraste, jugás desde la ronda siguiente".
- **Reparto:** cada participante ve su carta y toca "listo". El anfitrión ve el conteo y avanza cuando quiere.
- **Votación:**
  - `target` tiene que ser un participante no retirado distinto del votante, o `null` ("nadie").
  - **Cierra sola cuando votaron todos los participantes no retirados, estén conectados o no.** Eso se evalúa solo al recibir un `vote`, nunca por una desconexión.
  - Si falta alguien, el anfitrión usa `closeVote`, que exige votos de más de la mitad. Así un anfitrión impostor no puede cerrar con 0 votos.
  - Se acusa al más votado. Si hay empate en el primer puesto, o gana "nadie", el impostor zafa.
- **Cierre de la votación:** siempre pasa a `reveal`, también en la ronda que define la partida. `scoreRound` y `applyDeltas` se aplican sobre los participantes (mapeados a `{ id, name }`).
- **Desde `reveal`**, `nextRound` pasa a:
  - `end`, si alguien llegó a `TARGET_POINTS`;
  - `lobby`, si hay menos de 3 conectados;
  - `deal`, en cualquier otro caso.
- `cancelRound` y `newGame` van a `lobby`. `newGame` pone los puntajes en 0.

**Salidas y expulsiones**
- En `lobby`, `leave` y `kick` borran el asiento.
- A mitad de ronda dejan el asiento `gone`, y se borran su voto y los votos en su contra.
- La ronda se cancela sola (→ `lobby`) si el que se fue era el impostor, o si quedan menos de 3 participantes no retirados.
- Los asientos `gone` se borran al salir de `reveal` o con `newGame`.
- Un asiento expulsado recibe `kicked` y se cierra su socket. Puede volver a entrar como nuevo: un veto por token se esquiva borrando `localStorage`, así que no se implementa.

**Anfitrión**
- Después de cada evento se normaliza: si el anfitrión no está conectado y `hostGraceUntil` es `null`, se setea a `now + 30 s`. Si vuelve antes, se limpia.
- Al vencer la gracia, el rol pasa al asiento conectado y no retirado más antiguo. Si no hay nadie, `hostId = null` y el próximo `hello` toma el rol. Si el original vuelve después, no lo recupera.
- `leave` del anfitrión traspasa el rol sin gracia. El anfitrión no puede expulsarse a sí mismo.

**Alarm (una sola por objeto)**
- Se programa en `nextAlarmAt(state) = min(hostGraceUntil, lastActivity + 6 h)`, y se re-arma solo cuando ese valor cambia: cada `setAlarm` cuenta como fila escrita.
- El handler es idempotente y re-lee el estado: si la gracia venció, traspasa; si pasaron 6 h sin actividad y no hay sockets, `deleteAll()`; si no, re-arma.
- Prohibido `setTimeout` y `setInterval` en el DO.

## Códigos de sala

4 caracteres de un alfabeto de 31 símbolos sin ambiguos (sin `0 O 1 I L`): unas 920.000 combinaciones. `POST /api/sala` elige un código al azar y le pide `init` al DO. Si ese objeto ya tiene una sala viva, responde `taken` y el Worker reintenta con otro, hasta 5 veces.

## Abuso y límites

- Mensajes de más de 1 KB → cierre.
- Rate limit por socket: 20 mensajes cada 10 s. Si se pasa, cierre. Protege el tope de 100.000 filas escritas por día.
- Toda transición se valida en el servidor. El cliente nunca decide nada.
- **Creación de salas:** una regla de rate limiting de Cloudflare (Free: 1 regla, solo por path, por IP), path igual a `/api/sala`, 5 pedidos cada 10 s. Es un freno, no una garantía. Si la cuota diaria se agota, `/api/*` responde 429 y el sitio estático sigue andando.
- **Test obligatorio de privacidad:** en `deal`, `clues` y `vote`, el JSON del snapshot de cada jugador no contiene el `championId` si es el impostor, y ningún snapshot contiene `impostorPlayerId` ni `tokenHash`.

## Frontend

**Rutas y metadata**
- `ONLINE_PATH: Record<Lang, string> = { en: "/play", es: "/es/jugar" }` en `i18n.ts`.
- Cada página online exporta su propia `metadata`: título, canonical y `languages`. Entran en `sitemap.ts`.
- El código se lee de `window.location.search` en un efecto, **no con `useSearchParams`**, que sin `Suspense` rompe el export estático. El cambio de idioma conserva `?c=`.
- `NEXT_PUBLIC_ROOMS_ORIGIN`: vacío significa mismo origen; en desarrollo vale `http://localhost:8787`. `POST /api/sala` responde `Access-Control-Allow-Origin: *`. En local se corre `next dev` y `wrangler dev` juntos.

**Refactor de pantallas compartidas.** Ninguna pantalla compartida importa nada del modo online.
- `Shell`: se extrae de `Game.tsx` (rail, topbar, banda de contexto, `main`) y lo usan los dos modos.
- `Card`: componente presentacional extraído de `Deal.tsx`, con props `{ t, lang, card }`, donde `card` es crew + campeón o impostor + clase opcional. `Deal` lo usa para el pasamanos y el modo online para la carta propia.
- `Clues`: recibe `clueOrder: string[]` en vez de `round`, y `onDone` opcional (solo lo ve el anfitrión).
- `Vote`: recibe textos opcionales (`lede`, `tieLabel`, `confirmLabel`) para sacar el "pasá el celular", y la lista de candidatos sin el propio jugador.
- `Reveal`: recibe `tally?` y callbacks opcionales. El cliente arma el `Round` con lo que trae el snapshot de `reveal`.
- La pantalla de `end` es `Scoreboard`, que ya marca al ganador, con "Nueva partida" para el anfitrión.

**Pantallas del modo online**
- **Portada:** botón "Jugar online" → `ONLINE_PATH[lang]`.
- **Sin código:** "Crear sala" o "Unirme con código".
- **Con código:** pide el nombre, precargado del último usado, y entra.
- **Lobby:** jugadores con punto de conectado, botón compartir (`navigator.share`, con copiar como respaldo), y para el anfitrión el switch de pista de clase y "Empezar".
- **Reparto:** `Card` con tocar-para-ver y "listo".
- **Estados:** banda "Reconectando…" y errores legibles (sala inexistente o vencida → "Crear una nueva"; versión nueva → "Recargá").
- **i18n:** bloque `online` en `i18n.ts`, inglés como fuente y español tipado contra él.
- **Textos que cambian:** los que dicen "one phone" o "there's no server behind this page" se ajustan, porque ya no son ciertos.

## Testing

- **`src/lib/room/logic.ts`**: tests de asserts corridos con `node --experimental-strip-types`, gracias a los imports con `.ts`. Cubren:
  - transiciones válidas e inválidas;
  - voto: mayoría, empate, "nadie", y `closeVote` con y sin mayoría;
  - anfitrión: gracia, traspaso y anfitrión nulo;
  - entrar tarde, kick y leave en cada fase, incluido el impostor;
  - cancelación automática con menos de 3 participantes, y fin de partida pasando por `reveal`;
  - nombres repetidos;
  - `nextAlarmAt`;
  - **el test de privacidad del snapshot**.
- **E2E**: `scripts/e2e-online.mjs` con Playwright, 3 contextos contra `next dev` + `wrangler dev`: crear sala, unirse, ronda completa, desconectar y reconectar a un jugador, y anfitrión que se va. Correrlo también contra el deploy real.

## Deploy y migración de hosting

- **Build en Cloudflare Workers Builds** (Free: 3.000 min por mes, 8 GB de RAM, 20 min por build, Node 24), conectado a `facuga7van/rift-imposter`, rama `main`. Build: `next build`. Deploy: `npx wrangler deploy`. En la máquina de Facu no se buildea: la imagen OG se queda sin RAM.
- Variables **de build** en Workers Builds: `NEXT_PUBLIC_SITE_URL=https://rift.wampaland.com.ar` y el token de Web Analytics.
- `@vercel/analytics` se reemplaza por el snippet manual de Cloudflare Web Analytics, detrás de una variable de build, como funciona hoy.
- **Primer paso de implementación:** `wrangler deploy --dry-run --outdir` para confirmar el bundle. Si no resuelve algo, se usa la clave `alias` de `wrangler.jsonc`.
- **Imagen OG:** el export genera `out/opengraph-image-*` sin extensión. Después del primer deploy, `curl -I` a la URL de `og:image`. Si no devuelve `image/png`, agregar `public/_headers` con `/opengraph-image-*` y `/es/opengraph-image-*` → `Content-Type: image/png`. Discord es el canal principal y su preview depende de esto.
- **Vercel:** `vercel.json` con redirect 308 a `rift.wampaland.com.ar` y un deploy final.
- mora:8090 queda como está, sin salas.

## Pendiente de verificar al implementar

- Que la regla de rate limiting aplique a un Worker con dominio custom (probar con `curl`).
- Que `_headers` fije el `Content-Type` de un asset sin extensión.
- Que `allowImportingTsExtensions` no moleste a `next build` (requiere `noEmit`, que Next ya usa).

## Relacionado, para después

Con un Worker propio, el formulario de sugerencias puede ser `POST /api/sugerencia` en el mismo Worker. Ya no hace falta Hostinger.
