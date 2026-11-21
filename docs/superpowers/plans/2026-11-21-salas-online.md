# Salas online — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada jugador de una llamada de Discord juegue Rift Impostor desde su propio dispositivo: la app reparte las cartas en secreto, sincroniza las fases y recibe los votos, mientras el modo de un solo celular sigue igual.

**Architecture:** Un Cloudflare Worker sirve el `out/` estático (assets) y atiende `/api/*`: `POST /api/sala` crea una sala y `GET /api/sala/:code/ws` hace upgrade a un Durable Object `Room` (uno por código, API de hibernación, storage SQLite). Toda la regla de juego vive en `src/lib/room/logic.ts`, puro y testeado con Node; `Room` es una capa delgada de sockets, storage, alarm y difusión. El frontend agrega `/play` y `/es/jugar`, un hook `useRoom` y pantallas online que reusan las pantallas locales refactorizadas (Shell, Card, Clues, Vote, Reveal, Scoreboard).

**Tech Stack:** Next.js 16 (`output: "export"`), React 19, TypeScript, Cloudflare Workers + Durable Objects (wrangler 4), Playwright, Node 22/24 con type stripping.

**Spec:** `docs/superpowers/specs/2026-11-21-salas-online-design.md`. Es la fuente de verdad: si algo de este plan la contradice, gana la spec y se avisa.

---

## Reglas de la casa (leer antes de la Task 1)

- **NUNCA `next build` en esta máquina.** La imagen OG se queda sin RAM y Facu prohíbe buildear después de cambios. El build de producción corre en Cloudflare Workers Builds. Para verificar: `npx tsc --noEmit`, los tests de lógica con Node, `next dev` + `wrangler dev` para E2E, y `npx wrangler deploy --dry-run --outdir <tmp>` para el bundle del Worker (no corre `next build`).
- `out/` existe en el repo local (es un build viejo, está en `.gitignore`). `wrangler deploy --dry-run` y `wrangler dev` exigen que el directorio de assets exista, y con eso alcanza: nadie lee su contenido en local. Si no existiera, `mkdir out` y listo.
- Windows + Git Bash. En comandos: `rg`, `fd`, `bat`, `eza`. Nunca `grep`, `find`, `cat`, `ls`, `sed`.
- Commits: Conventional Commits, en inglés. **NUNCA una línea `Co-Authored-By` ni ninguna atribución a una IA.**
- `AGENTS.md`: este Next tiene cambios que rompen. Antes de tocar metadata, rutas o export, leé el doc correspondiente en `node_modules/next/dist/docs/01-app/` (ya revisados para este plan: `02-guides/static-exports.md`, `03-api-reference/04-functions/generate-metadata.md` sección "Merging", `03-api-reference/04-functions/use-search-params.md` sección "Prerendering", `03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`).
- Windows: si los puertos 3000 u 8787 quedan ocupados después de cortar `npx`, liberarlos con `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 | % { Stop-Process -Id $_.OwningProcess -Force }"` (cambiar el puerto según el caso).
- El E2E local (`scripts/e2e.mjs`) es la red de seguridad del refactor: el modo local no puede cambiar de comportamiento.
- Toda la prosa de UI en inglés es la fuente; el español se tipa contra ella (`const es: Dict`).

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `package.json` | Modificar | `wrangler` fijado, scripts `test:room`, `test:e2e:online`, `dev:rooms`, `cf-typegen`; sale `@vercel/analytics` (Task 30) |
| `.gitignore` | Modificar | `.wrangler` |
| `tsconfig.json` | Modificar | `allowImportingTsExtensions`, excluir `worker` |
| `src/lib/game.ts` | Modificar | Solo el import: `../data/champions.ts` |
| `scripts/test-logic.mjs` | Modificar | Importa `game.ts` directo, sin copiar a un temporal |
| `src/lib/room/protocol.ts` | Crear | Tipos de mensajes, `PROTOCOL_VERSION`, códigos de cierre, alfabeto |
| `src/lib/room/logic.ts` | Crear | `reduce`, `snapshotFor`, `nextAlarmAt`, validación de mensajes. Puro |
| `scripts/test-room.mjs` | Crear | Tests de asserts de `logic.ts`, incluido el de privacidad |
| `wrangler.jsonc` | Crear | Assets, binding `ROOM`, migración SQLite, dominio custom |
| `worker/index.ts` | Crear | Router de `/api/*` |
| `worker/room.ts` | Crear | Clase `Room` (Durable Object) |
| `worker/tsconfig.json` | Crear | Tipos de Workers para `tsc -p worker` |
| `worker/worker-configuration.d.ts` | Generar | Salida de `wrangler types` (se commitea) |
| `src/components/Shell.tsx` | Crear | Rail, topbar, banda de contexto y `main`, extraídos de `Game.tsx` |
| `src/components/screens/Card.tsx` | Crear | Carta presentacional (inocente o impostor), extraída de `Deal.tsx` |
| `src/components/Game.tsx` | Modificar | Usa `Shell`; pasa `clueOrder` a `Clues` |
| `src/components/screens/{Deal,Clues,Vote,Reveal,Scoreboard,Setup}.tsx` | Modificar | Props opcionales para el modo online; botón "Jugar online" en Setup |
| `src/lib/i18n.ts` | Modificar | `ONLINE_PATH`, bloque `online`, `reveal.votes`, `setup.playOnline`, textos que dejan de ser ciertos |
| `src/lib/room/useRoom.ts` | Crear | Hook del WebSocket: reconexión, ping, snapshot, `send`, `leave` |
| `src/components/online/{OnlineGame,Entry,Lobby,OnlineDeal}.tsx` | Crear | Pantallas propias del modo online |
| `src/components/online/online.module.css` | Crear | Lo poco que no existe en `game.module.css` (punto de conexión, código) |
| `src/lib/metadata.ts` | Modificar | `buildOnlineMetadata(lang)` |
| `src/app/(en)/play/page.tsx`, `src/app/(es)/es/jugar/page.tsx` | Crear | Páginas online |
| `src/app/sitemap.ts` | Modificar | Entran las páginas online |
| `scripts/e2e-online.mjs` | Crear | E2E con 3 contextos de Playwright |
| `src/components/WebAnalytics.tsx` | Modificar | Cloudflare Web Analytics en vez de Vercel |
| `src/lib/site.ts` | Modificar | Fallback de `SITE_URL` al dominio nuevo |
| `public/_headers` | Crear si hace falta | `Content-Type: image/png` para la OG sin extensión (se decide en la Task 15, se re-verifica en producción en la Task 35) |
| `vercel.json` | Crear | Redirect 308 al dominio nuevo (Task 38) |

---

## Chunk 1: Cimientos

### Task 1: Rama de trabajo y docs

**Files:**
- Commit: `docs/superpowers/specs/2026-11-21-salas-online-design.md`, `docs/superpowers/plans/2026-11-21-salas-online.md`

- [ ] **Step 1: Crear la rama desde `main`**

```bash
cd "D:/code/imposter lol"
git status --short
git switch -c feat/salas-online
```

Expected: `git status --short` muestra solo `?? docs/`. Después: `Switched to a new branch 'feat/salas-online'`.

- [ ] **Step 2: Commitear la spec y este plan**

```bash
git add docs/superpowers/specs/2026-11-21-salas-online-design.md docs/superpowers/plans/2026-11-21-salas-online.md
git commit -m "docs: add online rooms spec and implementation plan"
```

Expected: `2 files changed`.

---

### Task 2: wrangler, scripts y `.gitignore`

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Instalar wrangler fijado**

```bash
cd "D:/code/imposter lol"
npm install --save-dev --save-exact wrangler@4.166.0
npx wrangler --version
```

Expected: `4.166.0` (cualquier versión `>= 4.20` sirve: `run_worker_first` con array apareció en 4.20; si 4.166.0 ya no existe en el registry, usar la última 4.x y fijarla igual).

- [ ] **Step 2: Agregar los scripts**

En `package.json`, dentro de `"scripts"`, agregar después de `"test:logic"`:

```json
    "test:room": "node --experimental-strip-types scripts/test-room.mjs",
    "test:e2e:online": "node scripts/e2e-online.mjs",
    "dev:rooms": "wrangler dev --port 8787",
    "cf-typegen": "wrangler types worker/worker-configuration.d.ts"
```

(Ojo con la coma al final de la línea de `"test:logic"`.)

- [ ] **Step 3: Ignorar el estado local de wrangler**

Agregar al final de `.gitignore`:

```gitignore

# Estado local de wrangler dev (Durable Objects en SQLite, cache)
.wrangler
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "build: add pinned wrangler and room scripts"
```

---

### Task 3: Imports con extensión `.ts` en `game.ts`

La spec pide que `logic.ts`, `protocol.ts` y `game.ts` usen imports relativos con `.ts`, para que Node corra los tests directo y wrangler no dependa del alias `@/`. En `game.ts` es el único cambio. Eso rompe el truco de `test-logic.mjs` (copiaba a un temporal y reescribía `@/data/champions`), así que se simplifica en la misma task.

**Files:**
- Modify: `tsconfig.json`
- Modify: `src/lib/game.ts:1`
- Modify: `scripts/test-logic.mjs:1-37`

- [ ] **Step 1: Línea de base**

```bash
cd "D:/code/imposter lol"
npx tsc --noEmit
npm run test:logic
```

Expected: `tsc` sin salida (exit 0) y `N checks OK, 0 fallaron`. Si `tsc` ya tira errores antes de tocar nada, anotarlos: son preexistentes y no son tuyos.

- [ ] **Step 2: Cambiar el import de `game.ts`**

`src/lib/game.ts`, línea 1:

```ts
import { CHAMPIONS, type Champion, type Role } from "../data/champions.ts";
```

- [ ] **Step 3: Ver que el test viejo falla**

```bash
npm run test:logic
```

Expected: FAIL con `ERR_MODULE_NOT_FOUND` (el temporal no tiene `../data/champions.ts`).

- [ ] **Step 4: `tsconfig.json`**

Agregar en `compilerOptions`, después de `"noEmit": true,`:

```json
    "allowImportingTsExtensions": true,
```

Y cambiar `exclude`:

```json
  "exclude": [
    "node_modules",
    "legacy",
    "worker"
  ]
```

(`worker/` tiene su propio `tsconfig` con tipos de Workers; si lo chequeara el raíz con lib DOM, `next build` se quejaría de `DurableObject`, `WebSocketPair`, etc. `allowImportingTsExtensions` exige `noEmit`, que Next ya usa.)

- [ ] **Step 5: Simplificar `scripts/test-logic.mjs`**

Reemplazar desde la línea 1 hasta `const { CHAMPIONS } = await import(...)` inclusive (líneas 1–37) por:

```js
/**
 * Tests de la logica pura del juego, contra el modulo real.
 *
 *   npm run test:logic
 *
 * game.ts no importa nada de React justamente para poder testearlo asi, y usa
 * imports relativos con extension `.ts`: Node lo corre directo, sin copiar a un
 * temporal ni reescribir el alias `@/`.
 */
import assert from "node:assert/strict";
import {
  createRound,
  scoreRound,
  applyDeltas,
  rankPlayers,
  primaryRole,
  ROLES,
  POINTS_IMPOSTOR_ESCAPES,
  POINTS_CREW_CATCHES,
} from "../src/lib/game.ts";
import { CHAMPIONS } from "../src/data/champions.ts";
```

Y borrar la línea `rmSync(tmp, { recursive: true, force: true });` del final (ya no hay temporal).

(`champions.ts` importa `import type { Lang } from "@/lib/i18n"`: el type stripping de Node borra los `import type` enteros, así que el alias nunca se resuelve.)

- [ ] **Step 6: Verificar**

```bash
npm run test:logic
npx tsc --noEmit
```

Expected: `N checks OK, 0 fallaron` (mismo N que en el Step 1) y `tsc` sin salida.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/lib/game.ts scripts/test-logic.mjs
git commit -m "refactor: use .ts relative import in game logic"
```

---

### Task 4: `protocol.ts`

Tipos y constantes compartidos por Worker y frontend. Sin DOM, sin React, sin Workers.

**Files:**
- Create: `src/lib/room/protocol.ts`

- [ ] **Step 1: Escribir el archivo**

```ts
/**
 * Protocolo de las salas online. Lo comparten el Worker y el frontend, asi que
 * aca no entra nada de DOM, de React ni de Workers: solo tipos y constantes.
 *
 * Imports relativos con extension `.ts` a proposito: Node corre los tests sin
 * bundler y wrangler no depende del alias `@/`.
 */
import type { Role } from "../../data/champions.ts";
import type { Outcome, PlayerStats } from "../game.ts";

/** Subirlo cuando cambie la forma de RoomState o de los mensajes. Un estado
 *  guardado con otra version se trata como sala inexistente, y un socket que
 *  sobrevivio a un deploy con otra version recibe `bad_version`. */
export const PROTOCOL_VERSION = 1;

/** 31 simbolos sin ambiguos (sin 0 O 1 I L): 31^4 = 923.521 codigos. */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 4;

export function isRoomCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === ROOM_CODE_LENGTH &&
    [...value].every((ch) => ROOM_CODE_ALPHABET.includes(ch))
  );
}

export const NAME_MAX = 20;
export const MAX_MESSAGE_BYTES = 1024;
/** Por socket. Protege el tope de 100.000 filas escritas por dia del plan Free. */
export const RATE_LIMIT = { messages: 20, windowMs: 10_000 } as const;

export type ErrorCode =
  | "replaced"
  | "kicked"
  | "room_not_found"
  | "room_full"
  | "bad_version"
  | "too_big"
  | "rate_limited";

/**
 * El navegador no puede leer el status HTTP de un upgrade fallido, asi que los
 * errores fatales viajan como mensaje `error` seguido de un cierre 4000-4999.
 * El cliente NO reconecta ante un cierre 4xxx.
 */
export const CLOSE_CODES: Record<ErrorCode, number> = {
  replaced: 4002,
  kicked: 4003,
  room_not_found: 4004,
  room_full: 4009,
  bad_version: 4010,
  too_big: 4013,
  rate_limited: 4029,
};

export type Phase = "lobby" | "deal" | "clues" | "vote" | "reveal" | "end";

/** Cliente -> servidor. Lo que llega fuera de fase o sin permiso se descarta en silencio. */
export type ClientMessage =
  | { type: "hello"; v: number; token: string; name: string }
  | { type: "settings"; roleHint: boolean }
  | { type: "start" }
  | { type: "ready" }
  | { type: "advance" }
  | { type: "vote"; target: string | null }
  | { type: "closeVote" }
  | { type: "nextRound" }
  | { type: "cancelRound" }
  | { type: "newGame" }
  | { type: "kick"; id: string }
  | { type: "leave" };

export type SeatView = { id: string; name: string; connected: boolean; gone: boolean };

/** La clase solo le llega al impostor, y solo si la pista estaba prendida. */
export type YourRole =
  | { kind: "crew"; championId: string }
  | { kind: "impostor"; roleHint: Role | null }
  | { kind: "waiting" };

export type RevealView = {
  championId: string;
  impostorId: string;
  outcome: Outcome;
  deltas: Record<string, Partial<PlayerStats>>;
  tally: Record<string, number>;
};

/** Estado filtrado para UN jugador. Se arma por lista blanca en logic.ts. */
export type Snapshot = {
  type: "snapshot";
  code: string;
  phase: Phase;
  hostId: string | null;
  seats: SeatView[];
  settings: { roleHint: boolean };
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
  roundNumber: number;
  /** Ids de los participantes de la ronda, en orden de pista. Vacio en lobby. */
  clueOrder: string[];
  ready: string[];
  /** Quien voto, nunca a quien. */
  voted: string[];
  you: { id: string; isHost: boolean; role: YourRole | null };
  /** Solo en `reveal` y `end`. */
  reveal: RevealView | null;
};

export type ServerMessage = Snapshot | { type: "error"; code: ErrorCode };
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/lib/room/protocol.ts
git commit -m "feat(rooms): add shared room protocol"
```

---

### Task 5: `wrangler.jsonc` y bundle de humo

La spec pide como **primer paso** confirmar con `wrangler deploy --dry-run` que el bundler resuelve los imports `.ts`. Se hace acá con un Worker mínimo; la Task 13 y la 14 lo reemplazan por el de verdad.

**Files:**
- Create: `wrangler.jsonc`
- Create: `worker/index.ts` (stub)
- Create: `worker/room.ts` (stub)
- Create: `worker/tsconfig.json`
- Generate: `worker/worker-configuration.d.ts`

- [ ] **Step 1: `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "rift-impostor",
  "main": "worker/index.ts",
  // Si wrangler avisa que la fecha es mas nueva que la que soporta su runtime,
  // usar la que sugiere el aviso.
  "compatibility_date": "2026-11-01",
  "workers_dev": false,
  "preview_urls": false,
  "routes": [{ "pattern": "rift.wampaland.com.ar", "custom_domain": true }],
  "assets": {
    "directory": "./out",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    // Solo /api/* despierta al Worker. El resto son assets: gratis e ilimitados.
    "run_worker_first": ["/api/*"]
  },
  "durable_objects": {
    "bindings": [{ "name": "ROOM", "class_name": "Room" }]
  },
  // SQLite es el unico backend de Durable Objects en el plan Free.
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Room"] }]
}
```

- [ ] **Step 2: Worker stub**

`worker/index.ts`:

```ts
// Stub de humo (Task 5): solo confirma que wrangler empaqueta game.ts con los
// imports `.ts`. La Task 14 lo reemplaza entero.
import { createRound } from "../src/lib/game.ts";

export { Room } from "./room.ts";

export default {
  async fetch(): Promise<Response> {
    return new Response(createRound([{ id: "a", name: "A" }], true).secret.id);
  },
} satisfies ExportedHandler<Env>;
```

`worker/room.ts`:

```ts
// Stub de humo (Task 5). La Task 13 lo reemplaza entero.
import { DurableObject } from "cloudflare:workers";

export class Room extends DurableObject<Env> {}
```

- [ ] **Step 3: `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": [],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "allowImportingTsExtensions": true,
    "paths": { "@/*": ["../src/*"] }
  },
  "include": ["./**/*.ts"]
}
```

(`types: []` evita que `@types/node` choque con los tipos de Workers. `paths` existe porque `champions.ts` hace `import type ... from "@/lib/i18n"`: el bundler lo borra, pero `tsc` igual lo resuelve.)

- [ ] **Step 4: Generar los tipos de Workers**

```bash
npm run cf-typegen
```

Expected: crea `worker/worker-configuration.d.ts` con `ROOM: DurableObjectNamespace<...Room>` y `ASSETS: Fetcher` dentro de `Env`, más los tipos del runtime.

- [ ] **Step 5: Typecheck de los dos lados**

```bash
npx tsc --noEmit -p worker
npx tsc --noEmit
```

Expected: los dos sin salida.

- [ ] **Step 6: Dry-run del bundle**

```bash
test -d out || mkdir out
npx wrangler deploy --dry-run --outdir D:/tmp/rift-dry
eza -l D:/tmp/rift-dry
rg -c "react-dom|__NEXT_DATA__" D:/tmp/rift-dry/index.js
```

Expected:
- wrangler lista los bindings (`env.ROOM (Room)` Durable Object y `env.ASSETS`) y termina con `--dry-run: exiting now.`
- `index.js` pesa del orden de 40–60 KB (los 173 campeones son la mayor parte).
- `rg -c` no imprime nada (exit 1): el bundle no arrastra React ni Next.

Si wrangler no resuelve algún import, la spec prevé la clave `alias` de `wrangler.jsonc`; avisar antes de usarla, porque no debería hacer falta.

- [ ] **Step 7: Commit**

```bash
git add wrangler.jsonc worker/
git commit -m "build(worker): add wrangler config and bundle smoke test"
```

---

## Chunk 2: `logic.ts` con TDD (reglas de partida)

Este chunk y el siguiente construyen `src/lib/room/logic.ts` y `scripts/test-room.mjs` de a un grupo de reglas por task. El archivo de lógica arranca con un esqueleto que tiene **marcadores** en el `switch` de `apply` (`// [T7] ...`); cada task reemplaza su marcador. Los tests se agregan siempre **antes** de la línea `// ---- resumen` de `test-room.mjs`.

El test importa el módulo con `import * as logic`: así, una función que todavía no existe es `undefined` y el test falla con `TypeError: ... is not a function` en vez de romper la carga del archivo.

Contrato central de `reduce`: **si un evento no cambia nada, devuelve el mismo objeto**. `Room` usa esa identidad para no escribir en storage. Los tests lo chequean con `t.state === before`.

### Task 6: Esqueleto, asientos y nombres

**Files:**
- Create: `scripts/test-room.mjs`
- Create: `src/lib/room/logic.ts`

- [ ] **Step 1: Escribir el test (harness + primera sección)**

`scripts/test-room.mjs`:

```js
/**
 * Tests de la logica de las salas online (src/lib/room/logic.ts).
 *
 *   npm run test:room
 *
 * Mismo estilo que test-logic.mjs: asserts planos, sin framework. Importa los
 * .ts directo gracias a los imports relativos con extension.
 */
import assert from "node:assert/strict";
import * as logic from "../src/lib/room/logic.ts";
import { PROTOCOL_VERSION, isRoomCode } from "../src/lib/room/protocol.ts";
import { TARGET_POINTS } from "../src/lib/game.ts";

const {
  HOST_GRACE_MS,
  ROOM_TTL_MS,
  cleanName,
  createRoom,
  isRoomError,
  nextAlarmAt,
  parseHello,
  reduce,
  snapshotFor,
  toEvent,
} = logic;

let ok = 0;
const fails = [];
const check = (label, cond, detail = "") => {
  if (cond) {
    ok++;
    console.log(`  OK   ${label}`);
  } else {
    fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
};
const section = (name) => console.log(`\n== ${name} ==`);

/**
 * Mesa de prueba: estado, quien tiene socket abierto y un reloj que se mueve a
 * mano. Imita lo que hace worker/room.ts: arma el ctx y aplica reduce.
 */
function table(names = ["Ana", "Beto", "Cami"]) {
  let n = 0;
  const t = {
    now: 1_000_000,
    state: createRoom("ABCD", 1_000_000),
    connected: [],
    ids: [],
    ctx: () => ({ now: t.now, connected: t.connected, newId: () => `s${++n}` }),
    /** hello con un token (en los tests el token ES el hash). Devuelve el asiento o el error. */
    hello(token, name) {
      const r = reduce(t.state, { type: "hello", tokenHash: token, name }, t.ctx());
      if (isRoomError(r)) return r;
      t.state = r;
      const seat = r.seats.find((s) => s.tokenHash === token && !s.gone);
      if (seat && !t.connected.includes(seat.id)) t.connected = [...t.connected, seat.id];
      return seat;
    },
    /** Mensaje de cliente de un asiento. */
    send(from, msg) {
      const e = toEvent(msg, from);
      assert.ok(e, `mensaje invalido: ${JSON.stringify(msg)}`);
      const r = reduce(t.state, e, t.ctx());
      assert.ok(!isRoomError(r), "solo hello devuelve errores");
      t.state = r;
      return r;
    },
    /** Se le cae el socket a un asiento. */
    drop(id) {
      t.connected = t.connected.filter((x) => x !== id);
      t.sync();
    },
    /** Evento sin mensaje: cambio de conexion o alarm. */
    sync() {
      t.state = reduce(t.state, { type: "sync" }, t.ctx());
    },
  };
  t.ids = names.map((name, i) => t.hello(`tok${i}`, name).id);
  return t;
}

const host = (t) => t.state.hostId;
const impostorOf = (t) => t.state.round.impostorPlayerId;
const crewOf = (t) => t.state.participants.filter((id) => id !== impostorOf(t));

/** Lleva la mesa de lobby a vote. */
function toVote(t) {
  const h = host(t);
  t.send(h, { type: "start" });
  t.send(h, { type: "advance" });
  t.send(h, { type: "advance" });
  assert.equal(t.state.phase, "vote");
}

/** Ronda completa en la que agarran al impostor. */
function catchImpostor(t) {
  toVote(t);
  const imp = impostorOf(t);
  for (const id of t.state.participants) {
    t.send(id, { type: "vote", target: id === imp ? crewOf(t)[0] : imp });
  }
  assert.equal(t.state.phase, "reveal");
}

// ---- codigos y asientos -------------------------------------------------
section("Codigos de sala");
check("ABCD es valido", isRoomCode("ABCD"));
check("rechaza los ambiguos 0 O 1 I L", ["AB0D", "ABOD", "AB1D", "ABID", "ABLD"].every((c) => !isRoomCode(c)));
check("rechaza minusculas y largo distinto", !isRoomCode("abcd") && !isRoomCode("ABC") && !isRoomCode("ABCDE"));

section("Asientos y nombres");
{
  const t = table();
  check("el primero que entra es el anfitrion", host(t) === t.ids[0]);
  check("asientos en orden de llegada", t.state.seats.map((s) => s.name).join() === "Ana,Beto,Cami");
  const again = t.hello("tok1", "Otro");
  check("el mismo token recupera su asiento", again.id === t.ids[1]);
  check("en lobby el hello renombra", again.name === "Otro");
  const dup = t.hello("tokX", "ana");
  check("nombre repetido (sin importar mayusculas) recibe ' 2'", dup.name === "ana 2", dup.name);
  check("y el siguiente ' 3'", t.hello("tokY", "Ana").name === "Ana 3");
  const before = t.state;
  t.hello("tokZ", "   ");
  check("un hello sin nombre valido no crea asiento (misma referencia)", t.state === before);
  t.now += 5;
  t.hello("tokW", "Wen");
  check("un cambio actualiza lastActivity", t.state.lastActivity === t.now);
}
{
  const t = table();
  for (let i = 3; i < 10; i++) t.hello(`tok${i}`, `P${i}`);
  check("entran hasta 10", t.state.seats.length === 10);
  check("el 11.º recibe room_full", t.hello("tok10", "Once")?.error === "room_full");
}
check("cleanName recorta espacios", cleanName("  Ana  ") === "Ana");
check("cleanName saca caracteres de control", cleanName("A\u0000na\n") === "Ana");
check("cleanName rechaza vacio y no-strings", cleanName("   ") === null && cleanName(42) === null);
check("cleanName corta a 20", [...cleanName("x".repeat(30))].length === 20);
check(
  "parseHello rechaza otra version",
  parseHello({ type: "hello", v: PROTOCOL_VERSION + 1, token: "a".repeat(32), name: "x" }) === "bad_version",
);
check(
  "parseHello rechaza un token mal formado",
  parseHello({ type: "hello", v: PROTOCOL_VERSION, token: "zz", name: "x" }) === null,
);
check(
  "parseHello acepta uno bueno",
  parseHello({ type: "hello", v: PROTOCOL_VERSION, token: "a".repeat(32), name: "x" })?.token === "a".repeat(32),
);
check("parseHello ignora lo que no es hello", parseHello({ type: "start" }) === null);

// ---- resumen ---------------------------------------------------------------
console.log(`\n${"=".repeat(52)}`);
console.log(`${ok} checks OK, ${fails.length} fallaron`);
if (fails.length) {
  fails.forEach((f) => console.log(`  FAIL ${f}`));
  process.exitCode = 1;
}
```

- [ ] **Step 2: Correrlo y ver que falla**

```bash
npm run test:room
```

Expected: FAIL con `ERR_MODULE_NOT_FOUND` (no existe `logic.ts`).

- [ ] **Step 3: Esqueleto de `logic.ts`**

`src/lib/room/logic.ts`:

```ts
/**
 * Logica pura de una sala online: (estado, evento, contexto) -> estado nuevo.
 *
 * Sin I/O, sin reloj y sin tipos de DOM ni de Workers. El Durable Object
 * (worker/room.ts) es una capa delgada: arma el contexto (hora, quien tiene
 * socket abierto), llama a `reduce`, guarda y difunde. Por eso las reglas se
 * testean con Node directo: scripts/test-room.mjs.
 *
 * Contrato: si un evento no cambia nada, `reduce` devuelve EL MISMO objeto.
 * Room usa esa identidad para no escribir en storage (cada escritura cuenta
 * contra el tope diario del plan Free).
 */
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  TARGET_POINTS,
  applyDeltas,
  createRound,
  scoreRound,
  type Outcome,
  type Player,
  type PlayerStats,
  type Round,
} from "../game.ts";
import {
  NAME_MAX,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ErrorCode,
  type Phase,
  type Snapshot,
  type YourRole,
} from "./protocol.ts";

export const HOST_GRACE_MS = 30_000;
export const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

export type Seat = {
  id: string;
  /** SHA-256 del token del cliente. */
  tokenHash: string;
  /** Unico en la sala. */
  name: string;
  /** Se fue o lo expulsaron a mitad de ronda. */
  gone: boolean;
  joinedAt: number;
};

export type RoomState = {
  /** PROTOCOL_VERSION con que se creo. */
  v: number;
  code: string;
  createdAt: number;
  lastActivity: number;
  hostId: string | null;
  hostGraceUntil: number | null;
  phase: Phase;
  settings: { roleHint: boolean };
  /** Orden de llegada. */
  seats: Seat[];
  /** NUNCA sale en un snapshot. */
  round: Round | null;
  /** Ids que juegan la ronda en curso. */
  participants: string[];
  ready: string[];
  /** Voto de cada participante. `null` = "nadie". La clave presente = ya voto. */
  votes: Record<string, string | null>;
  outcome: Outcome | null;
  deltas: Record<string, Partial<PlayerStats>>;
  tally: Record<string, number> | null;
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
};

export type RoomEvent =
  | { type: "hello"; tokenHash: string; name: string }
  /** Cambio una conexion o sono la alarm: solo normaliza. */
  | { type: "sync" }
  | (Exclude<ClientMessage, { type: "hello" }> & { from: string });

export type RoomCtx = {
  now: number;
  /** Ids de asiento con socket abierto. Se deriva de los sockets, no se guarda. */
  connected: readonly string[];
  newId: () => string;
};

export type RoomError = { error: ErrorCode };

export function isRoomError(r: RoomState | RoomError): r is RoomError {
  return "error" in r;
}

export function createRoom(code: string, now: number): RoomState {
  return {
    v: PROTOCOL_VERSION,
    code,
    createdAt: now,
    lastActivity: now,
    hostId: null,
    hostGraceUntil: null,
    phase: "lobby",
    settings: { roleHint: true },
    seats: [],
    round: null,
    participants: [],
    ready: [],
    votes: {},
    outcome: null,
    deltas: {},
    tally: null,
    stats: {},
    roundsPlayed: 0,
  };
}

// ------------------------------------------------------------ borde de confianza

/** 1 a NAME_MAX caracteres despues de trim, sin caracteres de control. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
  const name = [...stripped].slice(0, NAME_MAX).join("").trim();
  return name.length > 0 ? name : null;
}

/** Valida un `hello` crudo. `null` si no es un hello valido. */
export function parseHello(msg: unknown): { token: string; name: string } | "bad_version" | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  if (m.type !== "hello") return null;
  if (m.v !== PROTOCOL_VERSION) return "bad_version";
  if (typeof m.token !== "string" || !/^[0-9a-f]{32}$/.test(m.token)) return null;
  return { token: m.token, name: typeof m.name === "string" ? m.name : "" };
}

/** Valida cualquier otro mensaje de cliente y le pega el emisor. */
export function toEvent(msg: unknown, from: string): RoomEvent | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  const type = m.type;
  switch (type) {
    case "start":
    case "ready":
    case "advance":
    case "closeVote":
    case "nextRound":
    case "cancelRound":
    case "newGame":
    case "leave":
      return { type, from } as RoomEvent;
    case "settings":
      return typeof m.roleHint === "boolean" ? { type: "settings", roleHint: m.roleHint, from } : null;
    case "vote":
      return m.target === null || typeof m.target === "string"
        ? { type: "vote", target: m.target, from }
        : null;
    case "kick":
      return typeof m.id === "string" ? { type: "kick", id: m.id, from } : null;
    default:
      return null;
  }
}

// ----------------------------------------------------------------- helpers

const isLive = (s: RoomState, id: string) => s.seats.some((x) => x.id === id && !x.gone);

const midRound = (phase: Phase) => phase === "deal" || phase === "clues" || phase === "vote";

/** Participantes de la ronda que no se fueron. */
function activeParticipants(s: RoomState): string[] {
  return s.participants.filter((id) => isLive(s, id));
}

function connectedSeats(s: RoomState, connected: readonly string[]): Seat[] {
  return s.seats.filter((x) => !x.gone && connected.includes(x.id));
}

/** El asiento conectado y no retirado mas antiguo (los asientos van en orden de llegada). */
function pickHost(s: RoomState, connected: readonly string[], exclude?: string): string | null {
  return connectedSeats(s, connected).find((x) => x.id !== exclude)?.id ?? null;
}

function toPlayers(seats: Seat[]): Player[] {
  return seats.map(({ id, name }) => ({ id, name }));
}

/** "Ana" -> "Ana 2" -> "Ana 3". Sin importar mayusculas.
 *  ponytail: el sufijo puede pasar NAME_MAX por 2-3 caracteres; no rompe nada. */
function uniqueName(seats: Seat[], name: string, selfId?: string): string {
  const taken = new Set(seats.filter((x) => x.id !== selfId).map((x) => x.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

// ------------------------------------------------------------------ eventos

function hello(s: RoomState, e: { tokenHash: string; name: string }, ctx: RoomCtx): RoomState | RoomError {
  const name = cleanName(e.name);
  const seat = s.seats.find((x) => !x.gone && x.tokenHash === e.tokenHash);

  if (seat) {
    // Recupera su lugar, su carta y su puntaje. El nombre solo se aplica en lobby.
    if (s.phase !== "lobby" || name === null) return s;
    const unique = uniqueName(s.seats, name, seat.id);
    if (unique === seat.name) return s;
    return { ...s, seats: s.seats.map((x) => (x.id === seat.id ? { ...x, name: unique } : x)) };
  }

  if (s.seats.filter((x) => !x.gone).length >= MAX_PLAYERS) return { error: "room_full" };
  // El cliente valida el nombre antes de mandarlo: esto solo frena basura.
  if (name === null) return s;

  const created: Seat = {
    id: ctx.newId(),
    tokenHash: e.tokenHash,
    name: uniqueName(s.seats, name),
    gone: false,
    joinedAt: ctx.now,
  };
  return { ...s, seats: [...s.seats, created] };
}

function apply(s: RoomState, e: RoomEvent, ctx: RoomCtx): RoomState | RoomError {
  if (e.type === "sync") return s;
  if (e.type === "hello") return hello(s, e, ctx);

  const me = s.seats.find((x) => x.id === e.from && !x.gone);
  if (!me) return s;
  const isHost = s.hostId === me.id;
  const active = activeParticipants(s);
  const playing = active.includes(me.id);

  switch (e.type) {
    // [T7] lobby y ronda
    // [T8] votacion
    // [T9] despues del reveal
    // [T10] salidas y expulsiones
    default:
      return s;
  }
}

/** Despues de cada evento: el rol de anfitrion siempre queda en un lugar valido. */
function normalizeHost(s: RoomState, now: number, connected: readonly string[]): RoomState {
  // [T11] gracia del anfitrion
  if (s.hostId !== null && isLive(s, s.hostId)) return s;
  const hostId = pickHost(s, connected);
  return hostId === s.hostId && s.hostGraceUntil === null ? s : { ...s, hostId, hostGraceUntil: null };
}

export function reduce(state: RoomState, event: RoomEvent, ctx: RoomCtx): RoomState | RoomError {
  const result = apply(state, event, ctx);
  if (isRoomError(result)) return result;

  // El socket que manda el hello todavia no figura como conectado: lo sumamos.
  let connected = ctx.connected;
  if (event.type === "hello") {
    const seat = result.seats.find((x) => !x.gone && x.tokenHash === event.tokenHash);
    if (seat && !connected.includes(seat.id)) connected = [...connected, seat.id];
  }

  const next = normalizeHost(result, ctx.now, connected);
  // ponytail: comparar por JSON es mas robusto que cuidar referencias en cada
  // rama; el estado pesa menos de 10 KB.
  if (JSON.stringify(next) === JSON.stringify(state)) return state;
  return { ...next, lastActivity: ctx.now };
}
```

- [ ] **Step 4: Correr los tests**

```bash
npm run test:room
```

Expected: `N checks OK, 0 fallaron`.

- [ ] **Step 5: Typecheck y commit**

```bash
npx tsc --noEmit
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add room logic skeleton with seats and names"
```

---

### Task 7: Lobby y transiciones de la ronda

Reglas: `settings` (anfitrión, lobby), `start` (anfitrión, lobby, ≥ 3 conectados), `ready` (participante, deal), `advance` (anfitrión, deal → clues → vote), `cancelRound` (anfitrión, deal/clues/vote → lobby). Fuera de fase o sin permiso: se descarta (misma referencia).

**Files:**
- Modify: `scripts/test-room.mjs` (antes de `// ---- resumen`)
- Modify: `src/lib/room/logic.ts`

- [ ] **Step 1: Escribir los tests**

```js
// ---- lobby y ronda ------------------------------------------------------
section("Lobby y ronda");
{
  const t = table(["Ana", "Beto"]);
  let before = t.state;
  t.send(t.ids[0], { type: "start" });
  check("con 2 conectados no arranca", t.state === before);
  t.hello("tok2", "Cami");
  before = t.state;
  t.send(t.ids[1], { type: "start" });
  check("un no-anfitrion no puede arrancar", t.state === before);
  t.send(t.ids[1], { type: "settings", roleHint: false });
  check("un no-anfitrion no toca los ajustes", t.state.settings.roleHint === true);
  t.send(t.ids[0], { type: "settings", roleHint: false });
  check("el anfitrion apaga la pista en lobby", t.state.settings.roleHint === false);
  t.send(t.ids[0], { type: "start" });
  check("start pasa a deal", t.state.phase === "deal");
  check("participan los 3 conectados", t.state.participants.length === 3);
  check("la ronda respeta el ajuste", t.state.round.roleHint === false);
  t.send(t.ids[0], { type: "settings", roleHint: true });
  check("fuera del lobby los ajustes no cambian", t.state.settings.roleHint === false);
  t.send(t.ids[1], { type: "ready" });
  before = t.state;
  t.send(t.ids[1], { type: "ready" });
  check("ready duplicado no cambia nada (misma referencia)", t.state === before);
  check("ready registrado", t.state.ready.join() === t.ids[1]);
  t.send(t.ids[1], { type: "advance" });
  check("advance de un no-anfitrion se descarta", t.state.phase === "deal");
  t.send(t.ids[0], { type: "advance" });
  check("deal -> clues", t.state.phase === "clues");
  before = t.state;
  t.send(t.ids[1], { type: "ready" });
  check("ready fuera de deal se descarta", t.state === before);
  t.send(t.ids[0], { type: "advance" });
  check("clues -> vote", t.state.phase === "vote");
  before = t.state;
  t.send(t.ids[0], { type: "advance" });
  check("advance en vote se descarta", t.state === before);
  t.send(t.ids[0], { type: "cancelRound" });
  check(
    "cancelRound vuelve al lobby y limpia la ronda",
    t.state.phase === "lobby" && t.state.round === null && t.state.participants.length === 0,
  );
  before = t.state;
  t.send(t.ids[0], { type: "nextRound" });
  check("nextRound en lobby se descarta", t.state === before);
}
check(
  "toEvent rechaza basura",
  toEvent(null, "x") === null &&
    toEvent({ type: "nope" }, "x") === null &&
    toEvent({ type: "vote", target: 3 }, "x") === null &&
    toEvent({ type: "settings", roleHint: "si" }, "x") === null &&
    toEvent({ type: "kick" }, "x") === null,
);
check("toEvent pega el emisor", toEvent({ type: "kick", id: "s2" }, "s1")?.from === "s1");
{
  const t = table();
  const before = t.state;
  t.send("fantasma", { type: "start" });
  check("un emisor sin asiento se descarta", t.state === before);
}
```

- [ ] **Step 2: Ver que fallan**

```bash
npm run test:room
```

Expected: falla (FAIL o TypeError): `start pasa a deal` y siguientes, porque el `switch` todavía no maneja nada.

- [ ] **Step 3: Implementar**

En `logic.ts`, agregar antes de `function apply`:

```ts
function clearRound(s: RoomState): RoomState {
  return { ...s, round: null, participants: [], ready: [], votes: {}, outcome: null, deltas: {}, tally: null };
}

/** Saca los asientos retirados y sus puntajes. */
function dropGone(s: RoomState): RoomState {
  const seats = s.seats.filter((x) => !x.gone);
  const ids = new Set(seats.map((x) => x.id));
  return { ...s, seats, stats: Object.fromEntries(Object.entries(s.stats).filter(([id]) => ids.has(id))) };
}

/** En lobby no hay asientos retirados: un `gone` solo tiene sentido con una ronda en curso. */
function toLobby(s: RoomState): RoomState {
  return { ...clearRound(dropGone(s)), phase: "lobby" };
}

/** Participantes = asientos conectados y no retirados al arrancar. */
function startRound(s: RoomState, connected: readonly string[]): RoomState {
  const players = toPlayers(connectedSeats(s, connected));
  return {
    ...clearRound(s),
    phase: "deal",
    round: createRound(players, s.settings.roleHint),
    participants: players.map((p) => p.id),
  };
}
```

Y en el `switch` de `apply`, reemplazar la línea `// [T7] lobby y ronda` por:

```ts
    case "settings":
      return isHost && s.phase === "lobby" ? { ...s, settings: { roleHint: e.roleHint } } : s;
    case "start":
      return isHost && s.phase === "lobby" && connectedSeats(s, ctx.connected).length >= MIN_PLAYERS
        ? startRound(s, ctx.connected)
        : s;
    case "ready":
      return s.phase === "deal" && playing && !s.ready.includes(me.id) ? { ...s, ready: [...s.ready, me.id] } : s;
    case "advance":
      if (!isHost) return s;
      if (s.phase === "deal") return { ...s, phase: "clues" };
      if (s.phase === "clues") return { ...s, phase: "vote" };
      return s;
    case "cancelRound":
      return isHost && midRound(s.phase) ? toLobby(s) : s;
```

- [ ] **Step 4: Verificar**

```bash
npm run test:room
npx tsc --noEmit
```

Expected: `N checks OK, 0 fallaron`; `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add lobby and round transitions"
```

---

### Task 8: Votación

Reglas: `target` es un participante no retirado distinto del votante, o `null`. Se puede cambiar hasta el cierre. Cierra sola cuando votaron todos los participantes no retirados (se evalúa solo al recibir un `vote`). `closeVote` del anfitrión exige votos de más de la mitad. Se acusa al más votado; empate en el primer puesto o "nadie" ganador → zafa. Siempre pasa a `reveal`; `scoreRound` y `applyDeltas` sobre los participantes no retirados.

**Files:**
- Modify: `scripts/test-room.mjs`
- Modify: `src/lib/room/logic.ts`

- [ ] **Step 1: Escribir los tests**

```js
// ---- votacion -----------------------------------------------------------
section("Votacion");
{
  const t = table();
  toVote(t);
  const imp = impostorOf(t);
  const [c1, c2] = crewOf(t);
  let before = t.state;
  t.send(c1, { type: "vote", target: c1 });
  check("no se puede votar a uno mismo", t.state === before);
  t.send(c1, { type: "vote", target: "fantasma" });
  check("no se puede votar a un no participante", t.state === before);
  t.send(c1, { type: "vote", target: c2 });
  t.send(c1, { type: "vote", target: imp });
  check("el voto se puede cambiar", t.state.votes[c1] === imp);
  t.send(c2, { type: "vote", target: imp });
  check("con 2 de 3 todavia no cierra", t.state.phase === "vote");
  t.send(imp, { type: "vote", target: c1 });
  check("cierra sola cuando votaron todos", t.state.phase === "reveal");
  check("lo agarraron", t.state.outcome.kind === "caught");
  check("cada inocente suma 1", t.state.stats[c1].points === 1 && t.state.stats[c2].points === 1);
  check(
    "el impostor no suma pero cuenta la ronda",
    t.state.stats[imp].points === 0 && t.state.stats[imp].roundsAsImpostor === 1,
  );
  check("tally cuenta los votos", t.state.tally[imp] === 2 && t.state.tally[c1] === 1);
  check("roundsPlayed sube", t.state.roundsPlayed === 1);
  before = t.state;
  t.send(c1, { type: "vote", target: c2 });
  check("despues del cierre no se vota", t.state === before);
}
{
  const t = table();
  toVote(t);
  const imp = impostorOf(t);
  const [c1, c2] = crewOf(t);
  t.send(imp, { type: "vote", target: c1 });
  t.send(c2, { type: "vote", target: c1 });
  t.send(c1, { type: "vote", target: imp });
  check(
    "acusan a un inocente: zafa con acusado",
    t.state.outcome.kind === "escaped" && t.state.outcome.accusedPlayerId === c1,
  );
  check("el impostor se lleva 3", t.state.stats[imp].points === 3);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const [a, b, c, d] = t.ids;
  t.send(a, { type: "vote", target: b });
  t.send(b, { type: "vote", target: a });
  t.send(c, { type: "vote", target: a });
  t.send(d, { type: "vote", target: b });
  check(
    "empate en el primer puesto: zafa sin acusado",
    t.state.outcome.kind === "escaped" && t.state.outcome.accusedPlayerId === null,
  );
}
{
  const t = table();
  toVote(t);
  for (const id of t.ids) t.send(id, { type: "vote", target: null });
  check(
    "gana 'nadie': zafa sin acusado",
    t.state.outcome.kind === "escaped" && t.state.outcome.accusedPlayerId === null,
  );
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const [a, b, c, d] = t.ids;
  t.send(a, { type: "vote", target: null });
  t.send(b, { type: "vote", target: null });
  t.send(c, { type: "vote", target: a });
  t.send(d, { type: "vote", target: a });
  check("empate entre 'nadie' y alguien: zafa sin acusado", t.state.outcome.accusedPlayerId === null);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const h = host(t);
  const others = t.ids.filter((id) => id !== h);
  t.send(others[0], { type: "vote", target: h });
  let before = t.state;
  t.send(h, { type: "closeVote" });
  check("closeVote con 1 de 4 no cierra", t.state === before);
  t.send(others[1], { type: "vote", target: h });
  before = t.state;
  t.send(h, { type: "closeVote" });
  check("closeVote con 2 de 4 (la mitad justa) no cierra", t.state === before);
  t.send(others[2], { type: "vote", target: h });
  before = t.state;
  t.send(others[0], { type: "closeVote" });
  check("closeVote de un no-anfitrion se descarta", t.state === before);
  t.send(h, { type: "closeVote" });
  check("closeVote con 3 de 4 cierra", t.state.phase === "reveal");
  check("el voto que falto no cuenta", Object.keys(t.state.votes).length === 3);
}
{
  const t = table();
  toVote(t);
  const before = t.state;
  t.send(host(t), { type: "closeVote" });
  check("un anfitrion (impostor o no) no cierra con 0 votos", t.state === before);
}
```

- [ ] **Step 2: Ver que fallan**

```bash
npm run test:room
```

Expected: FAIL desde `el voto se puede cambiar`.

- [ ] **Step 3: Implementar**

Agregar antes de `function apply`:

```ts
/** Cierra la votacion: acusa al mas votado y puntua. Siempre pasa a reveal. */
function closeVote(s: RoomState): RoomState {
  const round = s.round;
  if (!round) return s;

  const tally: Record<string, number> = {};
  let nobody = 0;
  for (const target of Object.values(s.votes)) {
    if (target === null) nobody++;
    else tally[target] = (tally[target] ?? 0) + 1;
  }
  const top = Math.max(nobody, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((id) => tally[id] === top);
  // Empate en el primer puesto, o "nadie" arriba (solo o empatado): el impostor zafa.
  const accused = leaders.length === 1 && nobody < top ? leaders[0]! : null;

  const outcome: Outcome =
    accused === round.impostorPlayerId ? { kind: "caught" } : { kind: "escaped", accusedPlayerId: accused };
  const active = activeParticipants(s);
  const deltas = scoreRound(round, toPlayers(s.seats.filter((x) => active.includes(x.id))), outcome);

  return {
    ...s,
    phase: "reveal",
    outcome,
    deltas,
    tally,
    stats: applyDeltas(s.stats, deltas),
    roundsPlayed: s.roundsPlayed + 1,
  };
}
```

Y reemplazar `// [T8] votacion` por:

```ts
    case "vote": {
      if (s.phase !== "vote" || !playing) return s;
      if (e.target !== null && (e.target === me.id || !active.includes(e.target))) return s;
      const next = { ...s, votes: { ...s.votes, [me.id]: e.target } };
      // Cierra sola cuando votaron todos los participantes no retirados, esten
      // conectados o no. Solo aca: una desconexion nunca cierra la votacion.
      return active.every((id) => id in next.votes) ? closeVote(next) : next;
    }
    case "closeVote": {
      if (!isHost || s.phase !== "vote") return s;
      const voted = active.filter((id) => id in s.votes).length;
      // Mas de la mitad: asi un anfitrion impostor no puede cerrar con 0 votos.
      return voted * 2 > active.length ? closeVote(s) : s;
    }
```

- [ ] **Step 4: Verificar**

```bash
npm run test:room
npx tsc --noEmit
```

Expected: `N checks OK, 0 fallaron`; `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add voting with auto close and majority close"
```

---

### Task 9: Después del reveal (`nextRound`, `end`, `newGame`)

Reglas: desde `reveal`, `nextRound` va a `end` si alguien llegó a `TARGET_POINTS`; a `lobby` si hay menos de 3 conectados; a `deal` en otro caso. Los `gone` se borran al salir de `reveal`. `newGame` (anfitrión, `end`) va a `lobby` con puntajes en 0. La ronda que define la partida igual pasa por `reveal`.

**Files:**
- Modify: `scripts/test-room.mjs`
- Modify: `src/lib/room/logic.ts`

- [ ] **Step 1: Escribir los tests**

```js
// ---- despues del reveal -------------------------------------------------
section("Despues del reveal");
{
  const t = table();
  catchImpostor(t);
  t.send(host(t), { type: "nextRound" });
  check("nextRound con 3 conectados reparte de nuevo", t.state.phase === "deal" && t.state.round !== null);
  check(
    "la ronda nueva limpia votos, listos y resultado",
    Object.keys(t.state.votes).length === 0 &&
      t.state.ready.length === 0 &&
      t.state.outcome === null &&
      t.state.tally === null,
  );
  check("los puntajes se mantienen", Object.values(t.state.stats).some((s) => s.points > 0));
}
{
  const t = table();
  catchImpostor(t);
  t.drop(t.ids.find((id) => id !== host(t)));
  t.send(host(t), { type: "nextRound" });
  check("nextRound con menos de 3 conectados vuelve al lobby", t.state.phase === "lobby");
}
{
  const t = table();
  t.state = {
    ...t.state,
    stats: Object.fromEntries(
      t.ids.map((id) => [id, { points: TARGET_POINTS - 1, roundsAsImpostor: 0, impostorWins: 0 }]),
    ),
  };
  catchImpostor(t);
  check("la ronda que define la partida igual pasa por reveal", t.state.phase === "reveal");
  t.send(host(t), { type: "nextRound" });
  check("si alguien llego a la meta, nextRound va a end", t.state.phase === "end");
  let before = t.state;
  t.send(t.ids.find((id) => id !== host(t)), { type: "newGame" });
  check("newGame de un no-anfitrion se descarta", t.state === before);
  t.send(host(t), { type: "newGame" });
  check("newGame vuelve al lobby", t.state.phase === "lobby");
  check(
    "newGame pone los puntajes en 0",
    Object.keys(t.state.stats).length === 0 && t.state.roundsPlayed === 0,
  );
}
```

- [ ] **Step 2: Ver que fallan**

```bash
npm run test:room
```

Expected: FAIL desde `nextRound con 3 conectados reparte de nuevo`.

- [ ] **Step 3: Implementar**

Agregar antes de `function apply`:

```ts
function nextRound(s: RoomState, connected: readonly string[]): RoomState {
  const clean = dropGone(s);
  // `end` conserva la ronda y el resultado: el snapshot de end los sigue mostrando.
  if (Object.values(clean.stats).some((st) => st.points >= TARGET_POINTS)) return { ...clean, phase: "end" };
  if (connectedSeats(clean, connected).length < MIN_PLAYERS) return toLobby(clean);
  return startRound(clean, connected);
}
```

Y reemplazar `// [T9] despues del reveal` por:

```ts
    case "nextRound":
      return isHost && s.phase === "reveal" ? nextRound(s, ctx.connected) : s;
    case "newGame":
      return isHost && s.phase === "end" ? { ...toLobby(s), stats: {}, roundsPlayed: 0 } : s;
```

- [ ] **Step 4: Verificar**

```bash
npm run test:room
npx tsc --noEmit
```

Expected: `N checks OK, 0 fallaron`; `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add next round, end and new game"
```

---

## Chunk 3: `logic.ts` con TDD (salidas, anfitrión y snapshot)

Sigue el mismo esquema del Chunk 2: tests antes de `// ---- resumen`, marcadores en el `switch` de `apply`.

### Task 10: Entrar tarde, `kick` y `leave`

Reglas: el que entra a mitad de ronda tiene asiento pero no participa, y juega desde la siguiente con 0 puntos. En `lobby`, `leave` y `kick` borran el asiento. A mitad de ronda (y en `reveal`/`end`) lo dejan `gone`, y se borran su voto y los votos en su contra. La ronda se cancela sola si el que se fue era el impostor o si quedan menos de 3 participantes no retirados. El anfitrión no puede expulsarse. El expulsado puede volver a entrar como nuevo: `hello` solo busca asientos no retirados, así que su token viejo ya no lo devuelve al asiento `gone`.

**Files:**
- Modify: `scripts/test-room.mjs`
- Modify: `src/lib/room/logic.ts`

- [ ] **Step 1: Escribir los tests**

```js
// ---- entrar tarde -------------------------------------------------------
section("Entrar tarde");
{
  const t = table();
  t.send(host(t), { type: "start" });
  const late = t.hello("tokL", "Lola");
  check("el que entra a mitad de ronda tiene asiento", !!late && t.state.seats.length === 4);
  check("pero no participa de la ronda en curso", !t.state.participants.includes(late.id));
  t.hello("tokL", "Otro nombre");
  check("fuera del lobby el hello no renombra", t.state.seats.find((s) => s.id === late.id).name === "Lola");
  t.send(host(t), { type: "advance" });
  t.send(host(t), { type: "advance" });
  const before = t.state;
  t.send(late.id, { type: "vote", target: t.ids[0] });
  check("no puede votar", t.state === before);
  const imp = impostorOf(t);
  for (const id of t.state.participants) t.send(id, { type: "vote", target: id === imp ? crewOf(t)[0] : imp });
  check("no suma en la ronda que no jugo", t.state.stats[late.id] === undefined);
  t.send(host(t), { type: "nextRound" });
  check("juega desde la ronda siguiente", t.state.participants.includes(late.id));
  check("con 0 puntos", (t.state.stats[late.id]?.points ?? 0) === 0);
}

// ---- salidas y expulsiones ------------------------------------------------
section("Salidas y expulsiones");
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  const [a, b, c, d] = t.ids;
  t.send(b, { type: "kick", id: c });
  check("un no-anfitrion no expulsa", t.state.seats.length === 4);
  t.send(a, { type: "kick", id: a });
  check("el anfitrion no se expulsa a si mismo", t.state.seats.length === 4);
  t.send(a, { type: "kick", id: d });
  check("en lobby kick borra el asiento", t.state.seats.length === 3 && !t.state.seats.some((s) => s.id === d));
  t.send(c, { type: "leave" });
  check("en lobby leave borra el asiento", t.state.seats.length === 2);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  toVote(t);
  const h = host(t);
  const imp = impostorOf(t);
  const victim = crewOf(t).find((id) => id !== h);
  const other = t.state.participants.find((id) => id !== victim && id !== h);
  t.send(victim, { type: "vote", target: imp });
  t.send(other, { type: "vote", target: victim });
  t.send(h, { type: "kick", id: victim });
  const seat = t.state.seats.find((s) => s.id === victim);
  check("a mitad de ronda kick deja el asiento retirado", seat?.gone === true);
  check("se borra su voto", !(victim in t.state.votes));
  check("y los votos en su contra", !(other in t.state.votes));
  check("con 3 participantes activos la ronda sigue", t.state.phase === "vote");
  const back = t.hello(`tok${t.ids.indexOf(victim)}`, "Vuelvo");
  check(
    "el expulsado puede volver a entrar como nuevo",
    back.id !== victim && !t.state.participants.includes(back.id),
  );
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  t.send(host(t), { type: "start" });
  t.send(impostorOf(t), { type: "leave" });
  check("si se va el impostor la ronda se cancela", t.state.phase === "lobby");
  check("y el retirado se borra al volver al lobby", t.state.seats.length === 3);
}
{
  const t = table();
  t.send(host(t), { type: "start" });
  t.send(crewOf(t).find((id) => id !== host(t)), { type: "leave" });
  check("con menos de 3 participantes la ronda se cancela", t.state.phase === "lobby");
}
{
  const t = table();
  catchImpostor(t);
  const x = t.ids.find((id) => id !== host(t));
  t.send(x, { type: "leave" });
  check(
    "en reveal el que se va queda retirado",
    t.state.seats.find((s) => s.id === x).gone === true && t.state.phase === "reveal",
  );
  t.hello("tokN", "Nico");
  t.send(host(t), { type: "nextRound" });
  check("los retirados se borran al salir del reveal", !t.state.seats.some((s) => s.id === x));
}
for (const phase of ["deal", "clues", "vote"]) {
  for (const type of ["kick", "leave"]) {
    const t = table(["Ana", "Beto", "Cami", "Dani"]);
    const h = host(t);
    t.send(h, { type: "start" });
    if (phase !== "deal") t.send(h, { type: "advance" });
    if (phase === "vote") t.send(h, { type: "advance" });
    const imp = impostorOf(t);
    if (type === "kick" && imp !== h) t.send(h, { type: "kick", id: imp });
    else t.send(imp, { type: "leave" });
    check(
      `${type} del impostor en ${phase} cancela la ronda`,
      t.state.phase === "lobby" && t.state.round === null && !t.state.seats.some((s) => s.id === imp),
    );
  }
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  t.drop(t.ids[3]);
  t.send(host(t), { type: "start" });
  check(
    "un desconectado no participa de la ronda",
    t.state.participants.length === 3 && !t.state.participants.includes(t.ids[3]),
  );
}
{
  const t = table();
  toVote(t);
  const [a, b, c] = t.ids;
  t.send(a, { type: "vote", target: b });
  t.send(b, { type: "vote", target: a });
  t.drop(c);
  check("una desconexion no cierra la votacion", t.state.phase === "vote");
  t.send(host(t), { type: "closeVote" });
  check("el anfitrion la cierra con 2 de 3", t.state.phase === "reveal");
}
```

- [ ] **Step 2: Ver que fallan**

```bash
npm run test:room
```

Expected: el primer FAIL es `en lobby kick borra el asiento` (los dos checks de "no expulsa" pasan solos, porque el `switch` todavía descarta todo).

- [ ] **Step 3: Implementar**

Agregar antes de `function apply`:

```ts
/** Borra (en lobby) o retira (con ronda) un asiento. */
function removeSeat(s: RoomState, id: string): RoomState {
  if (!isLive(s, id)) return s;
  if (s.phase === "lobby") return dropGone({ ...s, seats: s.seats.map((x) => (x.id === id ? { ...x, gone: true } : x)) });

  const next: RoomState = {
    ...s,
    // hello solo busca asientos no retirados: si vuelve con el mismo token, entra como nuevo.
    seats: s.seats.map((x) => (x.id === id ? { ...x, gone: true } : x)),
    ready: s.ready.filter((r) => r !== id),
    votes: Object.fromEntries(
      Object.entries(s.votes).filter(([voter, target]) => voter !== id && target !== id),
    ),
  };
  if (midRound(s.phase) && (s.round?.impostorPlayerId === id || activeParticipants(next).length < MIN_PLAYERS)) {
    return toLobby(next);
  }
  return next;
}
```

Y reemplazar `// [T10] salidas y expulsiones` por:

```ts
    case "kick":
      return isHost && e.id !== me.id ? removeSeat(s, e.id) : s;
    case "leave":
      // Si el que se va es el anfitrion, normalizeHost traspasa el rol sin gracia.
      return removeSeat(s, me.id);
```

(Un veto por token se esquiva borrando `localStorage`, así que no se implementa: lo dice la spec.)

- [ ] **Step 4: Verificar**

```bash
npm run test:room
npx tsc --noEmit
```

Expected: `N checks OK, 0 fallaron`; `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add late join, kick and leave"
```

---

### Task 11: Anfitrión (gracia y traspaso)

Reglas: si el anfitrión no está conectado y `hostGraceUntil` es `null`, se setea a `now + 30 s`; si vuelve antes, se limpia. Al vencer, el rol pasa al asiento conectado y no retirado más antiguo; si no hay nadie, `hostId = null` y el próximo `hello` lo toma. El original que vuelve después no lo recupera. `leave` del anfitrión traspasa sin gracia (ya lo cubre la rama "anfitrión no vivo" del esqueleto).

**Files:**
- Modify: `scripts/test-room.mjs`
- Modify: `src/lib/room/logic.ts` (función `normalizeHost`)

- [ ] **Step 1: Escribir los tests**

```js
// ---- anfitrion ------------------------------------------------------------
section("Anfitrion");
{
  const t = table();
  const [a, b] = t.ids;
  t.drop(a);
  check(
    "si el anfitrion se cae arranca la gracia",
    t.state.hostGraceUntil === t.now + HOST_GRACE_MS && host(t) === a,
  );
  t.now += 10_000;
  t.hello("tok0", "Ana");
  check("si vuelve antes, se limpia", t.state.hostGraceUntil === null && host(t) === a);
  t.drop(a);
  t.now += HOST_GRACE_MS - 1;
  t.sync();
  check("antes de vencer sigue siendo anfitrion", host(t) === a);
  t.now += 1;
  t.sync();
  check("al vencer pasa al conectado mas antiguo", host(t) === b && t.state.hostGraceUntil === null);
  t.hello("tok0", "Ana");
  check("el original que vuelve no lo recupera", host(t) === b);
}
{
  const t = table();
  const [a, b, c] = t.ids;
  t.drop(c);
  t.drop(b);
  t.drop(a);
  t.now += HOST_GRACE_MS;
  t.sync();
  check("sin nadie conectado, hostId queda null", host(t) === null);
  t.hello("tok2", "Cami");
  check("el proximo hello toma el rol", host(t) === c);
}
{
  const t = table();
  const [a, b] = t.ids;
  t.send(a, { type: "leave" });
  check("leave del anfitrion traspasa sin gracia", host(t) === b && t.state.hostGraceUntil === null);
}
{
  const t = table(["Ana", "Beto", "Cami", "Dani"]);
  const [a, b] = t.ids;
  t.send(a, { type: "start" });
  t.send(a, { type: "leave" });
  check("leave del anfitrion a mitad de ronda tambien traspasa", host(t) === b);
}
```

- [ ] **Step 2: Ver que fallan**

```bash
npm run test:room
```

Expected: `FAIL si el anfitrion se cae arranca la gracia` y las de gracia; las de `leave` ya pasan.

- [ ] **Step 3: Implementar**

Reemplazar la función `normalizeHost` entera por:

```ts
/** Despues de cada evento: el rol de anfitrion siempre queda en un lugar valido. */
function normalizeHost(s: RoomState, now: number, connected: readonly string[]): RoomState {
  // Sin anfitrion, o se fue (leave): toma el rol el conectado mas antiguo, sin gracia.
  if (s.hostId === null || !isLive(s, s.hostId)) {
    const hostId = pickHost(s, connected);
    return hostId === s.hostId && s.hostGraceUntil === null ? s : { ...s, hostId, hostGraceUntil: null };
  }
  if (connected.includes(s.hostId)) return s.hostGraceUntil === null ? s : { ...s, hostGraceUntil: null };
  if (s.hostGraceUntil === null) return { ...s, hostGraceUntil: now + HOST_GRACE_MS };
  if (now < s.hostGraceUntil) return s;
  // Vencio la gracia. Si el original vuelve despues, no lo recupera.
  return { ...s, hostId: pickHost(s, connected, s.hostId), hostGraceUntil: null };
}
```

- [ ] **Step 4: Verificar**

```bash
npm run test:room
npx tsc --noEmit
```

Expected: `N checks OK, 0 fallaron`; `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add host grace period and handover"
```

---

### Task 12: `nextAlarmAt`, `snapshotFor` y el test de privacidad

Reglas: `nextAlarmAt = min(hostGraceUntil, lastActivity + 6 h)`. El snapshot se arma **por lista blanca, campo por campo** (nunca se clona `RoomState`). Siempre lleva código, fase, `hostId`, asientos (`id`, `name`, `connected`, `gone`), ajustes, puntajes, número de ronda, `clueOrder`, listos y quién votó. `you.role`: `crew` con campeón, `impostor` con la clase solo si `roleHint`, o `waiting`. En `reveal` y `end`, `reveal` con campeón, impostor, resultado, deltas y tally. **Test obligatorio:** en `deal`, `clues` y `vote`, el JSON del impostor no contiene el campeón, y ningún snapshot contiene `impostorPlayerId` ni `tokenHash`.

Nota: la spec escribe `snapshotFor(state, seatId)`; como `connected` se deriva de los sockets y no se guarda, la función recibe un tercer parámetro `connected`.

**Files:**
- Modify: `scripts/test-room.mjs`
- Modify: `src/lib/room/logic.ts`

- [ ] **Step 1: Escribir los tests**

```js
// ---- alarm --------------------------------------------------------------
section("nextAlarmAt");
{
  const t = table();
  check("sin gracia, la alarma es la expiracion", nextAlarmAt(t.state) === t.state.lastActivity + ROOM_TTL_MS);
  t.drop(t.ids[0]);
  check("con gracia, la alarma es la gracia", nextAlarmAt(t.state) === t.state.hostGraceUntil);
}

// ---- snapshot -----------------------------------------------------------
section("Privacidad del snapshot (obligatorio)");
for (const roleHint of [true, false]) {
  for (const phase of ["deal", "clues", "vote"]) {
    const t = table(["Ana", "Beto", "Cami", "Dani"]);
    t.send(host(t), { type: "settings", roleHint });
    t.send(host(t), { type: "start" });
    if (phase !== "deal") t.send(host(t), { type: "advance" });
    if (phase === "vote") {
      t.send(host(t), { type: "advance" });
      t.send(crewOf(t)[0], { type: "vote", target: impostorOf(t) });
    }
    const round = t.state.round;
    const leaks = [];
    for (const seat of t.state.seats) {
      const json = JSON.stringify(snapshotFor(t.state, seat.id, t.connected));
      if (seat.id === round.impostorPlayerId && json.includes(`"${round.secret.id}"`)) leaks.push("campeon al impostor");
      if (json.includes("impostorPlayerId") || json.includes('"impostorId"')) leaks.push(`impostor en ${seat.name}`);
      if (json.includes("tokenHash") || t.state.seats.some((s) => json.includes(`"${s.tokenHash}"`))) {
        leaks.push(`token en ${seat.name}`);
      }
      if (json.includes('"votes"')) leaks.push(`votos en ${seat.name}`);
    }
    check(`${phase}, pista ${roleHint ? "prendida" : "apagada"}: ningun snapshot filtra nada`, leaks.length === 0, leaks.join(", "));
  }
}

section("Contenido del snapshot");
{
  const t = table();
  t.send(host(t), { type: "start" });
  const r = t.state.round;
  const imp = r.impostorPlayerId;
  const crew = crewOf(t)[0];
  const sc = snapshotFor(t.state, crew, t.connected);
  const si = snapshotFor(t.state, imp, t.connected);
  check("el inocente recibe el campeon", sc.you.role.kind === "crew" && sc.you.role.championId === r.secret.id);
  check(
    "el impostor recibe la clase con la pista prendida",
    si.you.role.kind === "impostor" && si.you.role.roleHint === r.role,
  );
  check("antes del reveal no hay resultado", sc.reveal === null);
  check("isHost marca al anfitrion", snapshotFor(t.state, host(t), t.connected).you.isHost === true);
  check("clueOrder trae a los 3 participantes", sc.clueOrder.length === 3);
  const late = t.hello("tokL", "Lola");
  check("el que entro tarde recibe 'waiting'", snapshotFor(t.state, late.id, t.connected).you.role.kind === "waiting");
  t.drop(crew);
  check(
    "connected se deriva de los sockets",
    snapshotFor(t.state, imp, t.connected).seats.find((s) => s.id === crew).connected === false,
  );
  check("un asiento inexistente no recibe snapshot", snapshotFor(t.state, "fantasma", t.connected) === null);
}
{
  const t = table();
  t.send(host(t), { type: "settings", roleHint: false });
  t.send(host(t), { type: "start" });
  const si = snapshotFor(t.state, impostorOf(t), t.connected);
  check("con la pista apagada el impostor no recibe la clase", si.you.role.roleHint === null);
}
{
  const t = table();
  catchImpostor(t);
  const s = snapshotFor(t.state, t.ids[0], t.connected);
  check(
    "en reveal todos ven campeon, impostor, resultado y tally",
    s.reveal !== null &&
      s.reveal.impostorId === impostorOf(t) &&
      s.reveal.championId === t.state.round.secret.id &&
      s.reveal.outcome.kind === "caught" &&
      s.reveal.tally[impostorOf(t)] === 2,
  );
  check("en reveal el numero de ronda es el de la ronda jugada", s.roundNumber === 1);
  check("voted lista ids, no destinos", s.voted.length === 3 && s.voted.every((id) => t.ids.includes(id)));
}
```

- [ ] **Step 2: Ver que fallan**

```bash
npm run test:room
```

Expected: `TypeError: nextAlarmAt is not a function`.

- [ ] **Step 3: Implementar**

Agregar al final de `logic.ts`:

```ts
// ------------------------------------------------------------------- alarm

/** Una sola alarm por objeto: lo que venza primero entre la gracia y la expiracion. */
export function nextAlarmAt(s: RoomState): number {
  return Math.min(s.hostGraceUntil ?? Infinity, s.lastActivity + ROOM_TTL_MS);
}

export function isExpired(s: RoomState, now: number): boolean {
  return now >= s.lastActivity + ROOM_TTL_MS;
}

// ---------------------------------------------------------------- snapshot

/**
 * Estado filtrado para un jugador. Se arma por LISTA BLANCA, campo por campo:
 * nunca se clona RoomState para borrarle cosas, porque un campo nuevo en el
 * estado se filtraria solo. `round` no sale nunca; el impostor no sale hasta
 * el reveal; tokenHash no sale jamas.
 */
export function snapshotFor(s: RoomState, seatId: string, connected: readonly string[]): Snapshot | null {
  const me = s.seats.find((x) => x.id === seatId);
  if (!me || me.gone) return null;

  const r = s.round;
  let role: YourRole | null = null;
  if (r && (midRound(s.phase) || s.phase === "reveal")) {
    if (!s.participants.includes(me.id)) role = { kind: "waiting" };
    else if (r.impostorPlayerId === me.id) role = { kind: "impostor", roleHint: r.roleHint ? r.role : null };
    else role = { kind: "crew", championId: r.secret.id };
  }

  const revealed = r !== null && s.outcome !== null && (s.phase === "reveal" || s.phase === "end");

  return {
    type: "snapshot",
    code: s.code,
    phase: s.phase,
    hostId: s.hostId,
    seats: s.seats.map((x) => ({ id: x.id, name: x.name, connected: connected.includes(x.id), gone: x.gone })),
    settings: { roleHint: s.settings.roleHint },
    stats: Object.fromEntries(
      Object.entries(s.stats).map(([id, st]) => [
        id,
        { points: st.points, roundsAsImpostor: st.roundsAsImpostor, impostorWins: st.impostorWins },
      ]),
    ),
    roundsPlayed: s.roundsPlayed,
    // En reveal y end la ronda ya se puntuo; en el resto todavia esta en curso.
    roundNumber: s.phase === "reveal" || s.phase === "end" ? s.roundsPlayed : s.roundsPlayed + 1,
    clueOrder: r && s.phase !== "lobby" ? [...r.clueOrder] : [],
    ready: [...s.ready],
    voted: Object.keys(s.votes),
    you: { id: me.id, isHost: s.hostId === me.id, role },
    reveal:
      revealed && r && s.outcome
        ? {
            championId: r.secret.id,
            impostorId: r.impostorPlayerId,
            outcome: s.outcome,
            deltas: s.deltas,
            tally: s.tally ?? {},
          }
        : null,
  };
}
```

- [ ] **Step 4: Verificar todo junto**

```bash
npm run test:room
npm run test:logic
npx tsc --noEmit
```

Expected: los dos tests con `0 fallaron`; `tsc` sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room/logic.ts scripts/test-room.mjs
git commit -m "feat(rooms): add whitelisted snapshots and alarm scheduling"
```

---

## Chunk 4: Worker y Durable Object

### Task 13: `worker/room.ts`

Capa delgada sobre `logic.ts`. Puntos que no se pueden olvidar (todos vienen de la spec):

- `connected` se deriva en cada evento de `ctx.getWebSockets()` + `deserializeAttachment()`. En `webSocketClose` se excluye el socket que se está cerrando.
- Guarda solo si `reduce` devolvió otro objeto. Difunde si cambió el estado **o** una conexión (un cambio de conexión no cambia el estado guardado, pero sí el punto de "conectado"): `hello` y `sync` cuentan como cambio de conexión.
- El SHA-256 del token se calcula **antes** de `this.load()`: así no hay un `await` entre leer el estado y aplicarle el evento.
- Un `hello` con un token que ya tiene socket abierto cierra el viejo con `4002`.
- Mensaje de un socket con otra `v` → `bad_version`. Estado guardado con otra `v` → sala inexistente.
- Mensajes de más de 1 KB → cierre. Más de 20 mensajes en 10 s → cierre.
- Una sola alarm. **Re-armado:** cada `setAlarm` cuenta como fila escrita, así que se re-arma solo si no hay alarm o si la nueva es **más temprana** que la armada. Como `lastActivity` solo crece, la expiración solo se corre para adelante: la alarm vieja suena antes de tiempo, el handler re-lee el estado y re-arma. Es la lectura barata de "se re-arma solo cuando ese valor cambia": evita una escritura de alarm por cada escritura de estado.
- Prohibido `setTimeout` y `setInterval`.

**Files:**
- Modify (reemplazo entero): `worker/room.ts`

- [ ] **Step 1: Escribir `worker/room.ts`**

```ts
/**
 * Durable Object de una sala. Capa delgada: sockets, storage, alarm y
 * difusion. Toda regla de juego vive en src/lib/room/logic.ts.
 *
 * - Un objeto por codigo (idFromName(code)), storage SQLite.
 * - WebSockets con la API de hibernacion: el objeto duerme entre mensajes. El
 *   attachment de cada socket ({ seatId, v }) es lo que lo reconoce al despertar.
 * - `connected` no se guarda: se deriva de los sockets abiertos en cada evento,
 *   asi un reinicio no deja asientos fantasma.
 * - Prohibido setTimeout/setInterval: una sola alarm, min(gracia, expiracion).
 */
import { DurableObject } from "cloudflare:workers";
import {
  CLOSE_CODES,
  MAX_MESSAGE_BYTES,
  PROTOCOL_VERSION,
  RATE_LIMIT,
  type ErrorCode,
  type ServerMessage,
} from "../src/lib/room/protocol.ts";
import {
  createRoom,
  isExpired,
  isRoomError,
  nextAlarmAt,
  parseHello,
  reduce,
  snapshotFor,
  toEvent,
  type RoomCtx,
  type RoomEvent,
  type RoomState,
} from "../src/lib/room/logic.ts";

type Attachment = { seatId: string; v: number };

const STATE_KEY = "state";
const OPEN = 1; // WebSocket.READY_STATE_OPEN
const HOUR = 60 * 60 * 1000;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class Room extends DurableObject<Env> {
  /** ponytail: contador en memoria. Si el objeto hiberna se reinicia, y eso solo
   *  lo vuelve mas permisivo; persistirlo costaria una escritura por mensaje. */
  private rate = new WeakMap<WebSocket, { start: number; count: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Responde el ping del cliente sin despertar al objeto ni cobrarse.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** RPC desde POST /api/sala. "taken" si este codigo ya tiene una sala viva. */
  async init(code: string): Promise<"ok" | "taken"> {
    if (await this.load()) return "taken";
    const state = createRoom(code, Date.now());
    await this.ctx.storage.put(STATE_KEY, state);
    await this.ctx.storage.setAlarm(nextAlarmAt(state));
    return "ok";
  }

  /** Siempre acepta el upgrade: el navegador no puede leer el status de un
   *  upgrade fallido, asi que los errores viajan como mensaje + cierre 4xxx. */
  async fetch(): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    if (new TextEncoder().encode(text).length > MAX_MESSAGE_BYTES) return this.fail(ws, "too_big");
    if (!this.allow(ws)) return this.fail(ws, "rate_limited");

    let msg: unknown;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    // Una pestana vieja que sobrevivio a un deploy sigue conectada sin pasar por hello.
    const att = this.attachment(ws);
    if (att && att.v !== PROTOCOL_VERSION) return this.fail(ws, "bad_version");

    const hello = parseHello(msg);
    if (hello === "bad_version") return this.fail(ws, "bad_version");
    // El hash ANTES de leer el estado: entre load() y reduce() no puede haber
    // otro await, o un evento concurrente trabajaria sobre un estado viejo.
    const tokenHash = hello ? await sha256(hello.token) : null;

    const state = await this.load();
    if (!state) return this.fail(ws, "room_not_found");

    if (hello && tokenHash) return this.hello(ws, state, tokenHash, hello.name);

    if (!att) return; // todavia no mando hello
    const event = toEvent(msg, att.seatId);
    if (event) await this.commit(state, event);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close(1000, "bye");
    } catch {
      // Ya estaba cerrado (auto-reply del runtime).
    }
    const state = await this.load();
    if (state) await this.commit(state, { type: "sync" }, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** Idempotente: re-lee el estado y decide. */
  async alarm(): Promise<void> {
    const state = await this.load();
    if (!state) {
      await this.ctx.storage.deleteAll();
      return;
    }
    const now = Date.now();
    const next = reduce(state, { type: "sync" }, this.ctxFor());
    if (isRoomError(next)) return;

    if (isExpired(next, now) && this.open().length === 0) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return;
    }
    if (next !== state) await this.ctx.storage.put(STATE_KEY, next);
    const at = nextAlarmAt(next);
    // Vencida pero con sockets abiertos (gente quieta 6 h con la pestana abierta):
    // se vuelve a mirar en una hora en vez de sonar en loop.
    await this.ctx.storage.setAlarm(at > now ? at : now + HOUR);
    this.broadcast(next);
  }

  // ------------------------------------------------------------------ privado

  private async hello(ws: WebSocket, state: RoomState, tokenHash: string, name: string): Promise<void> {
    const next = reduce(state, { type: "hello", tokenHash, name }, this.ctxFor());
    if (isRoomError(next)) return this.fail(ws, next.error);

    const seat = next.seats.find((s) => !s.gone && s.tokenHash === tokenHash);
    if (!seat) return; // nombre invalido: el cliente valida antes, asi que no pasa

    // Mismo token en otra pestana: gana la nueva, la vieja se cierra con 4002.
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && this.attachment(other)?.seatId === seat.id) this.fail(other, "replaced");
    }
    ws.serializeAttachment({ seatId: seat.id, v: PROTOCOL_VERSION } satisfies Attachment);
    await this.save(state, next, true);
  }

  private async commit(state: RoomState, event: RoomEvent, except?: WebSocket): Promise<void> {
    const next = reduce(state, event, this.ctxFor(except));
    if (isRoomError(next)) return; // solo hello devuelve errores

    // Sockets cuyo asiento dejo de estar activo: se fue o lo expulsaron.
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachment(ws);
      if (!att || ws === except || next.seats.some((s) => s.id === att.seatId && !s.gone)) continue;
      if (event.type === "leave" && event.from === att.seatId) {
        try {
          ws.close(1000, "left");
        } catch {
          // ya cerrado
        }
      } else {
        this.fail(ws, "kicked");
      }
    }
    await this.save(state, next, event.type === "sync", except);
  }

  /** Escribe solo si cambio el estado. Difunde si cambio el estado o una conexion. */
  private async save(prev: RoomState, next: RoomState, connChanged: boolean, except?: WebSocket): Promise<void> {
    if (next !== prev) {
      await this.ctx.storage.put(STATE_KEY, next);
      const at = nextAlarmAt(next);
      const armed = await this.ctx.storage.getAlarm();
      if (armed === null || at < armed) await this.ctx.storage.setAlarm(at);
    }
    if (next !== prev || connChanged) this.broadcast(next, except);
  }

  private broadcast(state: RoomState, except?: WebSocket): void {
    const connected = this.connected(except);
    for (const ws of this.open(except)) {
      const att = this.attachment(ws);
      const snap = att && snapshotFor(state, att.seatId, connected);
      if (snap) this.send(ws, snap);
    }
  }

  private async load(): Promise<RoomState | null> {
    const state = await this.ctx.storage.get<RoomState>(STATE_KEY);
    // Un estado guardado con otra version se trata como sala inexistente.
    return state && state.v === PROTOCOL_VERSION ? state : null;
  }

  private ctxFor(except?: WebSocket): RoomCtx {
    return { now: Date.now(), connected: this.connected(except), newId: () => crypto.randomUUID() };
  }

  private open(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === OPEN);
  }

  /** Ids de asiento con al menos un socket abierto. */
  private connected(except?: WebSocket): string[] {
    const ids = new Set<string>();
    for (const ws of this.open(except)) {
      const att = this.attachment(ws);
      if (att) ids.add(att.seatId);
    }
    return [...ids];
  }

  private attachment(ws: WebSocket): Attachment | null {
    return (ws.deserializeAttachment() as Attachment | null) ?? null;
  }

  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    const r = this.rate.get(ws);
    if (!r || now - r.start >= RATE_LIMIT.windowMs) {
      this.rate.set(ws, { start: now, count: 1 });
      return true;
    }
    r.count++;
    return r.count <= RATE_LIMIT.messages;
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket cerrandose: el proximo evento lo saca de la lista
    }
  }

  private fail(ws: WebSocket, code: ErrorCode): void {
    this.send(ws, { type: "error", code });
    try {
      ws.close(CLOSE_CODES[code], code);
    } catch {
      // ya cerrado
    }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit -p worker
```

Expected: sin salida (el stub de `worker/index.ts` todavía no llama a `init`, así que no hay nada que pueda fallar ahí). Si `tsc` se queja de `WebSocketPair`, `DurableObjectState` o `WebSocketRequestResponsePair`, regenerar los tipos con `npm run cf-typegen`.

- [ ] **Step 3: Commit**

```bash
git add worker/room.ts
git commit -m "feat(worker): add Room durable object"
```

---

### Task 14: `worker/index.ts`

Router mínimo de `/api/*`. Valida el código contra el alfabeto **antes** de `idFromName` (si no, cualquiera crea objetos con nombres arbitrarios). Nada de lógica de juego.

**Files:**
- Modify (reemplazo entero): `worker/index.ts`

- [ ] **Step 1: Escribir `worker/index.ts`**

```ts
/**
 * Router de /api/*. El resto del sitio son static assets (out/) que Cloudflare
 * sirve sin despertar al Worker (`run_worker_first: ["/api/*"]`).
 *
 *   POST /api/sala            crea una sala y devuelve { code }
 *   GET  /api/sala/:code/ws   upgrade a WebSocket -> Durable Object de esa sala
 */
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode } from "../src/lib/room/protocol.ts";

export { Room } from "./room.ts";

const CODE_ATTEMPTS = 5;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    // `*` porque en desarrollo el front corre en otro origen (next dev en :3000).
    // ponytail: sin preflight; el POST no lleva body ni headers custom, asi que es
    // un "simple request". Agregar OPTIONS si algun dia manda JSON.
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

/** ponytail: n % 31 sobre un Uint32 tiene un sesgo de 1 en 138 millones. Irrelevante. */
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (n) => ROOM_CODE_ALPHABET[n % ROOM_CODE_ALPHABET.length]).join("");
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/sala") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      // Si el codigo ya tiene una sala viva, el objeto responde "taken" y probamos otro.
      for (let i = 0; i < CODE_ATTEMPTS; i++) {
        const code = randomCode();
        const room = env.ROOM.get(env.ROOM.idFromName(code));
        if ((await room.init(code)) === "ok") return json({ code }, 201);
      }
      return json({ error: "no_free_code" }, 503);
    }

    const code = /^\/api\/sala\/([^/]+)\/ws$/.exec(url.pathname)?.[1];
    if (code !== undefined && isRoomCode(code)) {
      if (request.headers.get("Upgrade") !== "websocket") return json({ error: "expected_websocket" }, 426);
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(request);
    }

    return json({ error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit -p worker
npx tsc --noEmit
```

Expected: los dos sin salida.

- [ ] **Step 3: Commit**

```bash
git add worker/index.ts
git commit -m "feat(worker): add api router for room creation and websocket upgrade"
```

---

### Task 15: Dry-run y humo con `wrangler dev`

**Files:** ninguno nuevo.

- [ ] **Step 1: Dry-run del bundle real**

```bash
cd "D:/code/imposter lol"
npx wrangler deploy --dry-run --outdir D:/tmp/rift-dry
rg -c "react-dom|__NEXT_DATA__" D:/tmp/rift-dry/index.js
```

Expected: bindings `env.ROOM (Room)` y `env.ASSETS`, `--dry-run: exiting now.`; `rg` sin salida.

- [ ] **Step 2: Levantar `wrangler dev`**

Correr en background (en Claude Code: `run_in_background: true`):

```bash
cd "D:/code/imposter lol" && npx wrangler dev --port 8787
```

Expected en su salida: `Ready on http://localhost:8787`.

- [ ] **Step 3: Crear una sala y conectarse**

```bash
CODE=$(curl -s -X POST http://localhost:8787/api/sala | rg -o '[2-9A-HJ-NP-Z]{4}')
echo "$CODE"
node -e "
const ws = new WebSocket('ws://localhost:8787/api/sala/$CODE/ws');
ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', v: 1, token: 'a'.repeat(32), name: 'Smoke' }));
ws.onmessage = (e) => { console.log(e.data); if (e.data !== 'pong') ws.send('ping'); else ws.close(); };
"
```

Expected:
- `echo` imprime 4 caracteres del alfabeto (ej. `K7QM`).
- Un JSON `{"type":"snapshot","code":"K7QM","phase":"lobby","hostId":"...","seats":[{"id":"...","name":"Smoke","connected":true,"gone":false}],...,"you":{"id":"...","isHost":true,"role":null},"reveal":null}`.
- Después `pong`.
- En ningún lado aparece `tokenHash`.

- [ ] **Step 4: Errores**

```bash
node -e "
const ws = new WebSocket('ws://localhost:8787/api/sala/ZZZZ/ws');
ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', v: 1, token: 'a'.repeat(32), name: 'X' }));
ws.onmessage = (e) => console.log(e.data);
ws.onclose = (e) => console.log('close', e.code);
"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/api/sala/AB0D/ws
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/api/sala
```

Expected (si `ZZZZ` justo existiera, probar con otro código):
- `{"type":"error","code":"room_not_found"}` y `close 4004`.
- `404` (código con `0`, fuera del alfabeto).
- `405` (GET a `/api/sala`).

- [ ] **Step 5: Mismo token en dos pestañas (`replaced`)**

```bash
node -e "
const hello = JSON.stringify({ type: 'hello', v: 1, token: 'b'.repeat(32), name: 'Dos' });
const url = 'ws://localhost:8787/api/sala/$CODE/ws';
let second;
const first = new WebSocket(url);
first.onmessage = (e) => { if (JSON.parse(e.data).type === 'error') console.log('first:', e.data); };
first.onclose = (e) => { console.log('first close', e.code); second.close(); };
first.onopen = () => {
  first.send(hello);
  setTimeout(() => { second = new WebSocket(url); second.onopen = () => second.send(hello); }, 500);
};
"
```

Expected: `first: {"type":"error","code":"replaced"}` y `first close 4002`.

- [ ] **Step 6: Imagen OG en local (decide si hace falta `_headers`)**

`wrangler dev` sirve el `out/` viejo, que ya tiene `opengraph-image-35z9bs` sin extensión: alcanza para ver qué `Content-Type` le pone Workers Static Assets.

```bash
eza out | rg opengraph
curl -sI http://localhost:8787/opengraph-image-35z9bs | rg -i content-type
```

(Si el hash del archivo es otro, usar el que lista `eza`.)

Expected ideal: `content-type: image/png`. Si es así, no hace falta `_headers`: saltar al Step 7.

Si no es `image/png`, crear `public/_headers` (Next lo copia a `out/` en el build de producción):

```text
/opengraph-image-*
  Content-Type: image/png
/es/opengraph-image-*
  Content-Type: image/png
```

Copiarlo a mano al `out/` local (`cp public/_headers out/_headers`), reiniciar `wrangler dev` y repetir el `curl`. Expected: `content-type: image/png`. **Esto verifica el pendiente de la spec** de que `_headers` fije el `Content-Type` de un asset sin extensión. Si aun así no da, aplicar ya acá el plan B de la Task 35 (forzar el header desde el Worker) y re-verificar.

```bash
git add public/_headers
git commit -m "fix: serve extensionless og images as png"
```

- [ ] **Step 7: Bajar `wrangler dev`** (cortar el proceso en background).

---

## Chunk 5: Refactor de pantallas compartidas (modo local intacto)

Regla de oro: **ninguna pantalla compartida importa nada del modo online**, y el E2E local tiene que dar igual antes y después. Se corre contra `next dev` (no hay `out/` nuevo: nunca se buildea en esta máquina).

### Task 16: Línea de base del E2E local contra `next dev`

**Files:** ninguno.

- [ ] **Step 1: Levantar `next dev` en background**

```bash
cd "D:/code/imposter lol" && npx next dev --port 3000
```

Expected: `Ready` y `http://localhost:3000`.

- [ ] **Step 2: Correr el E2E local**

```bash
cd "D:/code/imposter lol"
E2E_BASE=http://localhost:3000 npm run test:e2e
```

Expected: `N checks OK, 0 fallaron`. **Anotar N y cualquier FAIL**: si algo falla acá, es ruido propio de `next dev` (por ejemplo un error de consola del overlay de desarrollo) y es la línea de base contra la que se comparan las tasks siguientes. No se arregla en este plan.

- [ ] **Step 3: Línea de base del audit de layout**

```bash
npm run audit
```

(`scripts/audit.mjs` usa `http://localhost:3000` por defecto.) Expected: anotar el resumen final (checks OK y fallidos). Es la referencia para las Tasks 20 y 27.

Dejar `next dev` corriendo para el resto del chunk.

---

### Task 17: `Shell`

Se extrae de `Game.tsx` el rail, la topbar, la banda de contexto y el `main`. El cambio de idioma lo pone `Shell`; cada modo pasa sus botones de navegación.

**Files:**
- Create: `src/components/Shell.tsx`
- Modify: `src/components/Game.tsx`

- [ ] **Step 1: Escribir `Shell.tsx`**

```tsx
import type { ReactNode } from "react";
import { otherLang, pathFor, type Dict, type Lang } from "@/lib/i18n";
import styles from "./game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  /** Botones y links propios de cada modo. El cambio de idioma lo agrega Shell. */
  nav: ReactNode;
  /** Por defecto, la portada del otro idioma. El modo online conserva `?c=`. */
  langHref?: string;
  /** Durante el reparto local la barra desaparece: es el momento en que la
   *  pantalla no tiene que invitar a tocar nada mas. */
  hideTopbar?: boolean;
  context: string | null;
  progress?: number | null;
  children: ReactNode;
};

/** Marco comun de los dos modos: rail de escritorio, barra, banda de contexto y main. */
export function Shell({ t, lang, nav, langHref, hideTopbar = false, context, progress = null, children }: Props) {
  const other = otherLang(lang);

  return (
    <div className={styles.page} id="top">
      {/* Adorno de escritorio, no navegacion: nada de lo que dice existe solo
          aca, asi que no entra en el arbol de accesibilidad. */}
      <aside className={styles.rail} aria-hidden="true">
        <span className={`${styles.railMark} display`}>Rift Impostor</span>
        <p className={styles.railLede}>{t.meta.tagline}</p>
        <p className={`${styles.railMeta} mono`}>{t.meta.railMeta}</p>
      </aside>

      <div className={styles.app}>
        {!hideTopbar && (
          <header className={styles.topbar}>
            <span className={styles.wordmark}>
              <span className={styles.wordmarkFull}>Rift Impostor</span>
              <span className={styles.wordmarkShort}>Rift</span>
            </span>
            <nav className={styles.nav}>
              {nav}
              {/* Ancla comun, NO next/link, y a proposito.
                  Los dos idiomas viven en root layouts distintos ((en) y (es)),
                  asi que Next hace navegacion dura entre ellos igual: el <Link>
                  no ahorra nada y encima dispara un prefetch RSC que en
                  `output: export` pide una ruta que no existe (404 en Vercel, y
                  peor en nginx: 200 devolviendo el index). Un <a> es identico
                  para SEO. */}
              <a
                className={`${styles.langBtn} mono`}
                href={langHref ?? pathFor(other)}
                hrefLang={other}
                aria-label={t.nav.switchTo}
              >
                {t.nav.switchShort}
              </a>
            </nav>
          </header>
        )}

        {context && (
          <div className={styles.context}>
            <span className={styles.contextLabel}>{context}</span>
            {progress !== null && (
              <div className={styles.progress} aria-hidden="true">
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* `main` envuelve cuerpo + dock porque los dos son la pantalla activa.
            El dock es sticky adentro suyo, que llega hasta el piso. */}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Usarlo en `Game.tsx`**

1. Agregar el import: `import { Shell } from "./Shell";`
2. Sacar `otherLang` y `pathFor` del import de `@/lib/i18n` (quedan `dict` y `type Lang`).
3. Reemplazar todo el `return (...)` del componente (desde `<div className={styles.page} id="top">` hasta su cierre) por:

```tsx
  return (
    <Shell
      t={t}
      lang={lang}
      hideTopbar={dealing}
      context={context}
      progress={progress}
      nav={
        <>
          {(phase === "reveal" || phase === "scores") && (
            <button type="button" className={styles.navLink} onClick={openSetup}>
              {t.nav.play}
            </button>
          )}
          {phase !== "scores" && phase !== "reveal" && (
            <button type="button" className={styles.navLink} onClick={openScores}>
              {t.nav.table}
            </button>
          )}
          <a className={styles.navLink} href="#rules">
            {t.nav.rules}
          </a>
        </>
      }
    >
      {/* Hasta que localStorage no respondio no sabemos ni los nombres ni en
          que fase quedo la partida. Pintar lo de fabrica y corregir es un
          parpadeo, y en este juego un parpadeo puede mostrar una carta. */}
      {!ready ? (
        <div className={`${styles.body} ${styles.bodyCenter}`} aria-busy="true">
          <p className={styles.note}>{t.loading}</p>
        </div>
      ) : (
        <>
          {/* ...las mismas pantallas que antes, sin tocar (Setup, Deal, Clues,
              Vote, Reveal, Scoreboard)... */}
        </>
      )}
    </Shell>
  );
```

El fragmento `<>...</>` del final lleva **exactamente** el mismo bloque de pantallas que hoy está dentro de `<main>` (de `{phase === "setup" && (` hasta el cierre del `Scoreboard`). Se mueve, no se reescribe.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sin salida.

- [ ] **Step 4: E2E local**

```bash
E2E_BASE=http://localhost:3000 npm run test:e2e
```

Expected: mismo resultado que la línea de base de la Task 16.

- [ ] **Step 5: Commit**

```bash
git add src/components/Shell.tsx src/components/Game.tsx
git commit -m "refactor: extract Shell from Game"
```

---

### Task 18: `Card`

Componente presentacional extraído de `Deal.tsx`, con props `{ t, lang, card }`. `card` es inocente + campeón o impostor + clase opcional (`null` = sin pista).

**Files:**
- Create: `src/components/screens/Card.tsx`
- Modify: `src/components/screens/Deal.tsx`

- [ ] **Step 1: Escribir `Card.tsx`**

```tsx
import { championArt, type Champion, type Role } from "@/data/champions";
import type { Dict, Lang } from "@/lib/i18n";
import { fitLen } from "@/lib/typeFit";
import styles from "../game.module.css";

/** Lo que muestra una carta. `role: null` = el impostor juega sin pista de clase. */
export type CardFace = { kind: "crew"; champion: Champion } | { kind: "impostor"; role: Role | null };

/** La carta abierta. La usan el pasamanos local y la carta propia del modo online. */
export function Card({ t, lang, card }: { t: Dict; lang: Lang; card: CardFace }) {
  return (
    <div className={styles.cardStage}>
      {card.kind === "impostor" ? (
        /* Mismo rectangulo, mismo borde, mismo boton que la carta del
           inocente. Si desde el sillon de enfrente se distingue por la
           silueta, el juego se rompe: la tension la carga la escala
           tipografica y el rayado, no el color. */
        <div className={`${styles.card} ${styles.cardBlank}`}>
          <div className={styles.blankTop}>
            <span className={styles.blankDiamond} aria-hidden="true">
              ◆
            </span>
            <span className={styles.blankEyebrow}>{t.deal.impostorEyebrow}</span>
            <span className={styles.blankRule} aria-hidden="true" />
          </div>

          <div className={styles.blankBody}>
            <p className={styles.impostorTitle}>
              <span className={styles.impostorTitleTop}>{t.deal.impostorTitleTop}</span>{" "}
              <span className={styles.impostorTitleMain}>{t.deal.impostorTitleMain}</span>
              <span className={styles.impostorUnderline} aria-hidden="true" />
            </p>

            {/* Con la pista prendida, la clase es lo unico que sabe el impostor.
                Vive adentro de su carta y en ningun otro lado: mostrarla en la
                carta del inocente la filtraria igual. */}
            {card.role && (
              <div className={styles.hintBox}>
                <span className={styles.hintLabel}>{t.deal.hintLabel}</span>
                <span className={styles.hintValue}>{t.deal.category(t.roles[card.role])}</span>
              </div>
            )}

            <p className={styles.impostorCopy}>{card.role ? t.deal.impostorHint : t.deal.impostorHintBlind}</p>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <img
            className={styles.cardArt}
            src={championArt(card.champion.id)}
            alt={card.champion.name[lang]}
            width={308}
            height={560}
            /* Es la unica imagen que importa en esta pantalla y aparece al
               instante del tap: nada de lazy. */
            fetchPriority="high"
            decoding="async"
          />
          <div className={styles.cardScrim} aria-hidden="true" />
          <div className={styles.cardMeta}>
            <span className={styles.cardName} style={fitLen(card.champion.name[lang])}>
              {card.champion.name[lang]}
            </span>
            <span className={styles.cardTitle}>{card.champion.title[lang]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Usarlo en `Deal.tsx`**

1. Imports: borrar `import { championArt } from "@/data/champions";` y agregar `import { Card } from "./Card";`. `fitLen` se queda: lo sigue usando la pantalla "le toca a" (`passName`).
2. En la rama revelada, reemplazar todo `<div className={styles.cardStage}> ... </div>` (el bloque con el ternario impostor/inocente) por:

```tsx
        <Card
          t={t}
          lang={lang}
          card={
            isImpostor
              ? { kind: "impostor", role: round.roleHint ? round.role : null }
              : { kind: "crew", champion: round.secret }
          }
        />
```

El `<div className={`${styles.body} ${styles.bodyCard}`}>` que lo envuelve y el dock quedan como están.

- [ ] **Step 3: Typecheck y E2E**

```bash
npx tsc --noEmit
E2E_BASE=http://localhost:3000 npm run test:e2e
```

Expected: `tsc` sin salida; E2E igual a la línea de base (incluye los checks de "la carta de impostor no muestra ningún campeón" y "sin pista, la carta del impostor no dice la clase").

- [ ] **Step 4: Commit**

```bash
git add src/components/screens/Card.tsx src/components/screens/Deal.tsx
git commit -m "refactor: extract Card from Deal"
```

---

### Task 19: Props opcionales en Clues, Vote, Reveal y Scoreboard

- `Clues`: recibe `clueOrder: string[]` en vez de `round`; `onDone` opcional (solo lo ve el anfitrión).
- `Vote`: textos opcionales `lede`, `tieLabel`, `confirmLabel` (sacan el "pasá el celular").
- `Reveal`: `tally?` y callbacks opcionales.
- `Scoreboard`: callbacks opcionales para que `end` muestre "Nueva partida" al anfitrión.
- Además, las cuatro reciben `footer?: ReactNode`, que se pinta dentro del dock. Es la forma genérica de que el modo online agregue "esperando al anfitrión", el conteo de votos o el botón de cerrar la votación sin que la pantalla sepa nada del modo online. (No está en la spec con ese nombre; es el mínimo que hace falta para cumplir "solo lo ve el anfitrión" sin importar nada online.)

**Files:**
- Modify: `src/components/screens/Clues.tsx`
- Modify: `src/components/screens/Vote.tsx`
- Modify: `src/components/screens/Reveal.tsx`
- Modify: `src/components/screens/Scoreboard.tsx`
- Modify: `src/components/Game.tsx` (llamada a `Clues`)
- Modify: `src/lib/i18n.ts` (`reveal.votes`)

- [ ] **Step 1: `Clues.tsx`**

Props y firma:

```tsx
import type { ReactNode } from "react";
import type { Player } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  /** Ids en orden de pista. El primero es aleatorio a proposito. */
  clueOrder: string[];
  players: Player[];
  /** Sin esto no hay boton: en el modo online solo avanza el anfitrion. */
  onDone?: () => void;
  footer?: ReactNode;
};

export function Clues({ t, clueOrder, players, onDone, footer }: Props) {
```

Cambiar `round.clueOrder.map(` por `clueOrder.map(`. Reemplazar el dock por:

```tsx
      {(onDone || footer) && (
        <div className={styles.dock}>
          {onDone && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onDone}>
              {t.clues.done}
            </button>
          )}
          {footer}
        </div>
      )}
```

En `Game.tsx`, la llamada queda:

```tsx
                <Clues
                  t={t}
                  clueOrder={round.clueOrder}
                  players={players.value}
                  onDone={() => patch({ phase: "vote" })}
                />
```

- [ ] **Step 2: `Vote.tsx`**

```tsx
import { useState, type ReactNode } from "react";
// ...
type Props = {
  t: Dict;
  /** Candidatos. En el modo online, sin el propio jugador. */
  players: Player[];
  /** null = empate o nadie convence. El impostor zafa. */
  onVote: (accusedPlayerId: string | null) => void;
  lede?: string;
  tieLabel?: string;
  confirmLabel?: string;
  footer?: ReactNode;
};

export function Vote({ t, players, onVote, lede, tieLabel, confirmLabel, footer }: Props) {
```

Usar `{lede ?? t.vote.lede}`, `{tieLabel ?? t.vote.tie}` y `{confirmLabel ?? t.vote.confirm}` donde hoy dice `t.vote.lede`, `t.vote.tie` y `t.vote.confirm`. Agregar `{footer}` como último hijo del dock.

- [ ] **Step 3: `reveal.votes` en `i18n.ts`**

En `en.reveal`, después de `table: "See the scores",`:

```ts
    /** Votos recibidos, al lado del nombre. Solo en el modo online. */
    votes: (n: number) => (n === 1 ? "1 vote" : `${n} votes`),
```

En `es.reveal`, después de `table: "Ver la tabla",`:

```ts
    votes: (n) => (n === 1 ? "1 voto" : `${n} votos`),
```

- [ ] **Step 4: `Reveal.tsx`**

```tsx
import type { ReactNode } from "react";
// ...
type Props = {
  t: Dict;
  lang: Lang;
  round: Round;
  roundNumber: number;
  players: Player[];
  outcome: Outcome;
  deltas: Record<string, Partial<PlayerStats>>;
  /** Votos por jugador. Solo existe en el modo online: en el local vota la mesa a mano. */
  tally?: Record<string, number>;
  onNextRound?: () => void;
  onScores?: () => void;
  footer?: ReactNode;
};
```

Agregar `tally, footer` al destructuring. En la fila de deltas, el nombre queda:

```tsx
                <span className={styles.deltaName}>
                  {p.name}
                  {tally && ` · ${t.reveal.votes(tally[p.id] ?? 0)}`}
                </span>
```

Y el dock:

```tsx
      {(onNextRound || onScores || footer) && (
        <div className={styles.dock}>
          {onNextRound && (
            <button
              type="button"
              className={`${styles.btn} ${escaped ? styles.btnPrimary : styles.btnMint}`}
              onClick={onNextRound}
            >
              {t.reveal.next}
            </button>
          )}
          {onScores && (
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onScores}>
              {t.reveal.table}
            </button>
          )}
          {footer}
        </div>
      )}
```

- [ ] **Step 5: `Scoreboard.tsx`**

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
// ...
type Props = {
  t: Dict;
  players: Player[];
  stats: Record<string, PlayerStats>;
  roundsPlayed: number;
  onBack?: () => void;
  onSetup?: () => void;
  onReset?: () => void;
  /** Reemplaza el dock entero. El modo online lo usa en `end`. */
  footer?: ReactNode;
};

export function Scoreboard({ t, players, stats, roundsPlayed, onBack, onSetup, onReset, footer }: Props) {
```

Cambiar las llamadas por `onSetup?.()`, `onBack?.()`, `onReset?.()` (los `onClick={onSetup}` y `onClick={onBack}` siguen andando tal cual con props opcionales; el único que hay que tocar es `onReset();` → `onReset?.();`). En la rama con partidas jugadas, el dock queda:

```tsx
      <div className={styles.dock}>
        {footer ?? (
          <>
            {/* ...los mismos dos botones y la nota de hoy, sin cambios... */}
          </>
        )}
      </div>
```

- [ ] **Step 6: Typecheck y E2E**

```bash
npx tsc --noEmit
E2E_BASE=http://localhost:3000 npm run test:e2e
```

Expected: `tsc` sin salida; E2E igual a la línea de base.

- [ ] **Step 7: Commit**

```bash
git add src/components/screens/Clues.tsx src/components/screens/Vote.tsx src/components/screens/Reveal.tsx src/components/screens/Scoreboard.tsx src/components/Game.tsx src/lib/i18n.ts
git commit -m "refactor: make shared screens configurable for online mode"
```

Bajar `next dev` al terminar el chunk.

---

## Chunk 6: Frontend online (base)

Para desarrollar este chunk hace falta `.env.local` (está ignorado por git) con:

```dotenv
NEXT_PUBLIC_ROOMS_ORIGIN=http://localhost:8787
```

En producción la variable no existe: vacío = mismo origen.

### Task 20: i18n — rutas, bloque `online` y textos que dejan de ser ciertos

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/site.ts` (solo comentario)
- Modify: `src/components/GamePage.tsx` (solo comentario)
- Modify: `package.json` (`description`)

- [ ] **Step 0: Crear `.env.local`**

```bash
cd "D:/code/imposter lol"
printf 'NEXT_PUBLIC_ROOMS_ORIGIN=http://localhost:8787\n' > .env.local
git check-ignore .env.local
```

Expected: `git check-ignore` imprime `.env.local` (lo cubre el `.env*` del `.gitignore`; nunca se commitea).

- [ ] **Step 1: `ONLINE_PATH`**

En `i18n.ts`, después de la función `pathFor`:

```ts
/** Paginas del modo online. El codigo de sala viaja en `?c=` y se lee en el cliente. */
export const ONLINE_PATH: Record<Lang, string> = { en: "/play", es: "/es/jugar" };
```

- [ ] **Step 2: Textos que ya no son ciertos ("one phone", "there's no server")**

En `en`:

```ts
    description:
      "Social deduction game with League of Legends champions. Everyone sees the same " +
      "champion except one, who has to fake it. Free, no signup: pass one phone around or " +
      "play online, each on your own device. 3 to 10 players.",
```

```ts
    railMeta: "3–10 players · one phone or online · no signup",
```

```ts
    intro: (n: number) =>
      `Rift Impostor is a social deduction game for 3 to 10 people using the ${n} League of ` +
      "Legends champions. Play it on a single phone passed around the group, or online with " +
      "everyone on their own device (made for Discord calls). No signup, nothing to install.",
```

```ts
    feedback:
      "Rift Impostor is open source. Suggestions and bug reports go to the repository on " +
      "GitHub, where you can also see what other people already asked for.",
```

En `es`:

```ts
    description:
      "Juego del impostor con campeones de League of Legends. Todos ven el mismo campeón " +
      "menos uno, que tiene que fingir. Gratis y sin registro: con un solo celular que se " +
      "pasa de mano u online, cada uno desde el suyo. De 3 a 10 jugadores.",
```

```ts
    railMeta: "3–10 jugadores · un celular u online · sin registro",
```

```ts
    intro: (n) =>
      `Rift Impostor es un juego de deducción social para 3 a 10 personas con los ${n} campeones ` +
      "de League of Legends. Se juega desde un solo celular que se pasa de mano en mano, u online " +
      "con cada uno desde su dispositivo (pensado para llamadas de Discord). No hace falta " +
      "registrarse ni instalar nada.",
```

```ts
    feedback:
      "Rift Impostor es código abierto. Las sugerencias y los errores van al repositorio en " +
      "GitHub, donde además podés ver lo que ya pidió el resto.",
```

`package.json`:

```json
  "description": "Social deduction game with League of Legends champions. One phone passed around, or online with everyone on their own device. English and Spanish.",
```

Comentarios que mienten desde ahora: en `src/lib/site.ts` reemplazar el comentario de `REPO_URL` por `/** Repositorio publico. Las sugerencias van a sus Issues. */`; en `GamePage.tsx` reemplazar el comentario `{/* Unico canal de contacto posible sin backend: ... */}` por `{/* Las sugerencias van a GitHub Issues. Hace falta una cuenta, y por eso lo decimos antes de que toquen. */}`.

- [ ] **Step 3: Botón de la portada**

En `en.setup`, después de `start: "Deal the cards",`: `playOnline: "Play online",`. En `es.setup`, después de `start: "Repartir cartas",`: `playOnline: "Jugar online",`.

- [ ] **Step 4: Bloque `online`**

En `en`, después del bloque `rules` (antes del `};` que cierra `en`):

```ts
  online: {
    metaTitle: "Play online",
    metaDescription:
      "Create a room, share the link and play Rift Impostor with everyone on their own " +
      "device. Made for Discord calls: clues and arguing stay on voice.",
    headline: "Play online",
    lede: "Everyone on their own device. Clues and arguing stay on the call.",
    create: "Create a room",
    creating: "Creating…",
    createFailed: "Couldn't create the room. Try again in a moment.",
    codeLabel: "Room code",
    join: "Join",
    badCode: "A code is 4 letters or numbers",
    nameLabel: "Your name",
    nameLede: "This is how the others will see you.",
    enter: "Enter the room",
    connecting: "Connecting to the room…",
    roomLabel: (code: string) => `Room ${code}`,
    roomCode: "Room code",
    share: "Share the link",
    copied: "Link copied",
    shareText: "Join my Rift Impostor room",
    playersLabel: "Players",
    host: "host",
    you: "you",
    online: "connected",
    offline: "disconnected",
    kick: (name: string) => `Remove ${name}`,
    start: "Start the game",
    needPlayers: (n: number) => `You need ${n} connected players`,
    waitHost: "Waiting for the host…",
    leave: "Leave",
    cancelRound: "Cancel round",
    yourCard: "Your card",
    dealLede: "Make sure nobody else can see your screen.",
    ready: "I've seen it",
    readyCount: (k: number, n: number) => `${k} of ${n} ready`,
    advanceDeal: "Go to clues",
    waitingTitle: "You're in",
    waitingText: "You joined mid-round. You play from the next one.",
    voteLede: "Argue on the call, then vote here. You can change your vote until it closes.",
    voteTie: "Nobody, I'm not sure",
    voteConfirm: "Send my vote",
    voteSent: "your vote is in",
    votedCount: (k: number, n: number) => `${k} of ${n} voted`,
    closeVote: "Close the vote",
    newGame: "New game",
    reconnecting: "Reconnecting…",
    errors: {
      room_not_found: "That room doesn't exist or it expired.",
      room_full: "That room is full. 10 players max.",
      bad_version: "There's a new version of the game.",
      kicked: "The host removed you from the room.",
      replaced: "This room is open in another tab.",
      too_big: "Something went wrong with the connection.",
      rate_limited: "Too many messages in a row.",
    },
    createNew: "Create a new room",
    reload: "Reload",
    joinAgain: "Join again",
  },
```

En `es`, en el mismo lugar:

```ts
  online: {
    metaTitle: "Jugar online",
    metaDescription:
      "Creá una sala, compartí el link y jugá Rift Impostor cada uno desde su dispositivo. " +
      "Pensado para llamadas de Discord: las pistas y la discusión siguen por voz.",
    headline: "Jugar online",
    lede: "Cada uno desde su dispositivo. Las pistas y la discusión, por la llamada.",
    create: "Crear sala",
    creating: "Creando…",
    createFailed: "No se pudo crear la sala. Probá de nuevo en un rato.",
    codeLabel: "Código de sala",
    join: "Unirme",
    badCode: "El código tiene 4 letras o números",
    nameLabel: "Tu nombre",
    nameLede: "Así te van a ver los demás.",
    enter: "Entrar a la sala",
    connecting: "Conectando con la sala…",
    roomLabel: (code) => `Sala ${code}`,
    roomCode: "Código de sala",
    share: "Compartir el link",
    copied: "Link copiado",
    shareText: "Sumate a mi sala de Rift Impostor",
    playersLabel: "Jugadores",
    host: "anfitrión",
    you: "vos",
    online: "conectado",
    offline: "desconectado",
    kick: (name) => `Sacar a ${name}`,
    start: "Empezar la partida",
    needPlayers: (n) => `Hacen falta ${n} jugadores conectados`,
    waitHost: "Esperando al anfitrión…",
    leave: "Salir",
    cancelRound: "Cancelar ronda",
    yourCard: "Tu carta",
    dealLede: "Fijate que nadie más esté mirando tu pantalla.",
    ready: "Ya la vi",
    readyCount: (k, n) => `${k} de ${n} listos`,
    advanceDeal: "Pasar a las pistas",
    waitingTitle: "Ya estás adentro",
    waitingText: "Entraste con la ronda empezada. Jugás desde la siguiente.",
    voteLede: "Discutan por la llamada y después votá acá. Podés cambiar el voto hasta que se cierre.",
    voteTie: "Nadie, no estoy seguro",
    voteConfirm: "Mandar mi voto",
    voteSent: "tu voto ya está",
    votedCount: (k, n) => `${k} de ${n} votaron`,
    closeVote: "Cerrar la votación",
    newGame: "Nueva partida",
    reconnecting: "Reconectando…",
    errors: {
      room_not_found: "Esa sala no existe o ya venció.",
      room_full: "La sala está llena. Entran 10 como máximo.",
      bad_version: "Hay una versión nueva del juego.",
      kicked: "El anfitrión te sacó de la sala.",
      replaced: "Esta sala está abierta en otra pestaña.",
      too_big: "Algo salió mal con la conexión.",
      rate_limited: "Demasiados mensajes seguidos.",
    },
    createNew: "Crear una sala nueva",
    reload: "Recargar",
    joinAgain: "Volver a entrar",
  },
```

(Las claves de `errors` son exactamente los `ErrorCode` de `protocol.ts`: así `t.online.errors[code]` tipa sin importar nada del protocolo en el diccionario.)

- [ ] **Step 5: Typecheck y audit**

```bash
npx tsc --noEmit
```

Expected: sin salida. Si falta o sobra una clave en `es`, `tsc` lo marca (es la idea).

Los textos nuevos (`railMeta`, `intro`) cambian de largo: levantar `npx next dev --port 3000` en background (después de crear `.env.local`) y correr:

```bash
npm run audit
```

Expected: mismo resultado que la línea de base de la Task 16. Si aparece un desborde nuevo, acortar el texto.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n.ts src/lib/site.ts src/components/GamePage.tsx package.json
git commit -m "feat(i18n): add online mode copy and drop one-phone-only claims"
```

---

### Task 21: `useRoom`

**Files:**
- Create: `src/lib/room/useRoom.ts`

- [ ] **Step 1: Escribir el hook**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLOSE_CODES,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ErrorCode,
  type ServerMessage,
  type Snapshot,
} from "./protocol";

/** Vacio = mismo origen (produccion). En desarrollo, wrangler dev: http://localhost:8787. */
const ORIGIN = process.env.NEXT_PUBLIC_ROOMS_ORIGIN ?? "";
const PONG_TIMEOUT_MS = 3000;
const BACKOFF_MIN_MS = 500;
const BACKOFF_MAX_MS = 8000;

export type RoomStatus = "connecting" | "open" | "reconnecting" | "closed";
type Outgoing = Exclude<ClientMessage, { type: "hello" }>;

const ERROR_BY_CLOSE = Object.fromEntries(
  Object.entries(CLOSE_CODES).map(([code, n]) => [n, code]),
) as Record<number, ErrorCode>;

const tokenKey = (code: string) => `rift.room.${code}`;

export function readToken(code: string): string | null {
  try {
    return window.localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

export function forgetToken(code: string): void {
  try {
    window.localStorage.removeItem(tokenKey(code));
  } catch {
    // storage bloqueado: no habia nada que borrar
  }
}

/**
 * 128 bits aleatorios. `getRandomValues` existe tambien fuera de HTTPS, a
 * diferencia de `randomUUID` (ver el comentario de newId en game.ts). El token
 * nunca llega a otros jugadores: el servidor guarda solo su hash.
 */
function ensureToken(code: string): string {
  const saved = readToken(code);
  if (saved) return saved;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  try {
    window.localStorage.setItem(tokenKey(code), token);
  } catch {
    // sin storage: la sesion anda, pero un refresco entra como jugador nuevo
  }
  return token;
}

export async function createRoom(): Promise<string> {
  const res = await fetch(`${ORIGIN}/api/sala`, { method: "POST" });
  if (!res.ok) throw new Error(`POST /api/sala: ${res.status}`);
  const { code } = (await res.json()) as { code: string };
  return code;
}

function wsUrl(code: string): string {
  const base = ORIGIN || window.location.origin;
  return `${base.replace(/^http/, "ws")}/api/sala/${code}/ws`;
}

/**
 * Ciclo de vida del WebSocket de una sala. Se conecta cuando hay codigo Y
 * nombre; `null` en cualquiera de los dos = desconectado.
 *
 * - Ante un cierre 4xxx (error fatal) NO reconecta: deja `error` seteado.
 * - Ante cualquier otro cierre, backoff de 0,5 s a 8 s.
 * - Al volver a la pestana manda `ping`; sin `pong` en 3 s, reconecta. El DO
 *   responde el ping con auto-response, sin despertarse.
 */
export function useRoom(code: string | null, name: string | null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [error, setError] = useState<ErrorCode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const nameRef = useRef(name);
  const active = code !== null && name !== null;

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    if (!active || code === null) return;
    let stopped = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let pongTimer: ReturnType<typeof setTimeout> | undefined;
    const token = ensureToken(code);

    const connect = () => {
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      const ws = new WebSocket(wsUrl(code));
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
        ws.send(JSON.stringify({ type: "hello", v: PROTOCOL_VERSION, token, name: nameRef.current ?? "" }));
      };

      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return; // socket viejo: lo que diga ya no importa
        if (ev.data === "pong") {
          clearTimeout(pongTimer);
          return;
        }
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMessage;
        } catch {
          return;
        }
        if (msg.type === "snapshot") setSnapshot(msg);
        else setError(msg.code);
      };

      ws.onclose = (ev) => {
        if (wsRef.current !== ws) return; // reemplazado a mano (pong vencido o desmontaje)
        wsRef.current = null;
        clearTimeout(pongTimer);
        if (stopped) return;
        if (ev.code >= 4000 && ev.code <= 4999) {
          // Fatal. El mensaje `error` llego antes del cierre; el mapa cubre el caso raro en que no.
          stopped = true;
          setError((prev) => prev ?? ERROR_BY_CLOSE[ev.code] ?? "room_not_found");
          setStatus("closed");
          return;
        }
        setStatus("reconnecting");
        retry = setTimeout(connect, Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** attempt++));
      };
    };

    // Un celular que se durmio puede tener el socket muerto sin que el navegador se entere.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || stopped) return;
      const ws = wsRef.current;
      if (!ws) {
        clearTimeout(retry);
        attempt = 0;
        connect();
        return;
      }
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send("ping");
      clearTimeout(pongTimer);
      pongTimer = setTimeout(() => {
        wsRef.current = null;
        ws.close();
        connect();
      }, PONG_TIMEOUT_MS);
    };

    document.addEventListener("visibilitychange", onVisible);
    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(pongTimer);
      document.removeEventListener("visibilitychange", onVisible);
      const ws = wsRef.current;
      wsRef.current = null;
      // Cerrar un socket que todavia conecta ensucia la consola ("closed before
      // the connection is established"), y StrictMode en dev monta dos veces.
      if (ws?.readyState === WebSocket.CONNECTING) ws.onopen = () => ws.close(1000);
      else ws?.close(1000);
      setSnapshot(null);
      setError(null);
      setStatus("connecting");
    };
  }, [code, active]);

  const send = useCallback((msg: Outgoing) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  /** Avisa al servidor y olvida el token. Quien llama desmonta la sala despues
   *  (close() no descarta lo que ya estaba encolado, asi que el leave llega). */
  const leave = useCallback(() => {
    send({ type: "leave" });
    if (code) forgetToken(code);
  }, [send, code]);

  return { snapshot, status, error, send, leave };
}
```

- [ ] **Step 2: Typecheck y commit**

```bash
npx tsc --noEmit
git add src/lib/room/useRoom.ts
git commit -m "feat(rooms): add useRoom websocket hook"
```

Expected: `tsc` sin salida.

---

### Task 22: `Entry` (crear, unirse, nombre) y CSS online

Reusa de `game.module.css`: `body`, `stack`, `headline`, `lede`, `fieldLabel`, `playerRow`, `playerInput`, `btn`, `btnPrimary`, `btnGhost`, `dock`, `dockNote`, `note`.

**Files:**
- Create: `src/components/online/online.module.css`
- Create: `src/components/online/Entry.tsx`

- [ ] **Step 1: `online.module.css`**

```css
/* Lo poco del modo online que no existe en game.module.css. */

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Punto de conexion del lobby. El estado tambien va en texto oculto (srOnly). */
.dot {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--linea-fuerte);
}

.dotOn {
  background: var(--menta);
}

.seatName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code {
  letter-spacing: 0.18em;
}

/* Un <form> que envuelve cuerpo + dock sin romper el layout de main. */
.contents {
  display: contents;
}
```

- [ ] **Step 2: `Entry.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import type { Dict } from "@/lib/i18n";
import { NAME_MAX, ROOM_CODE_LENGTH, isRoomCode } from "@/lib/room/protocol";
import styles from "../game.module.css";
import online from "./online.module.css";

type Props = {
  t: Dict;
  /** null = todavia no hay sala: crear o unirse con codigo. */
  code: string | null;
  savedName: string;
  onCreate: () => Promise<void>;
  onCode: (code: string) => void;
  onJoin: (name: string) => void;
};

export function Entry({ t, code, savedName, onCreate, onCode, onJoin }: Props) {
  if (code) return <NameForm key={code} t={t} code={code} savedName={savedName} onJoin={onJoin} />;
  return <NoRoom t={t} onCreate={onCreate} onCode={onCode} />;
}

function NoRoom({ t, onCreate, onCode }: Pick<Props, "t" | "onCreate" | "onCode">) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [typed, setTyped] = useState("");
  const typedCode = typed.trim().toUpperCase();

  const create = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onCreate();
    } catch {
      // Cuota diaria agotada (429) o red caida: el sitio sigue, la sala no.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (isRoomCode(typedCode)) onCode(typedCode);
  };

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.online.headline}</h2>
          <p className={styles.lede}>{t.online.lede}</p>
        </div>

        <form className={styles.stack} onSubmit={join}>
          <span className={styles.fieldLabel}>{t.online.codeLabel}</span>
          <div className={styles.playerRow}>
            <input
              className={`${styles.playerInput} mono`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={t.online.codeLabel}
              placeholder="ABCD"
              maxLength={ROOM_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
            />
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnGhost}`} disabled={!isRoomCode(typedCode)}>
            {t.online.join}
          </button>
          {typedCode.length === ROOM_CODE_LENGTH && !isRoomCode(typedCode) && (
            <span className={styles.note}>{t.online.badCode}</span>
          )}
        </form>
      </div>

      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={create} disabled={busy}>
          {busy ? t.online.creating : t.online.create}
        </button>
        {failed && (
          <span className={styles.dockNote} role="alert">
            {t.online.createFailed}
          </span>
        )}
      </div>
    </>
  );
}

function NameForm({ t, code, savedName, onJoin }: Pick<Props, "t" | "savedName" | "onJoin"> & { code: string }) {
  const [value, setValue] = useState(savedName);
  const clean = value.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (clean) onJoin(clean);
  };

  return (
    <form className={online.contents} onSubmit={submit}>
      <div className={styles.body}>
        <div className={styles.stack}>
          <h2 className={styles.headline}>{t.online.roomLabel(code)}</h2>
          <p className={styles.lede}>{t.online.nameLede}</p>
        </div>
        <div className={styles.stack}>
          <span className={styles.fieldLabel}>{t.online.nameLabel}</span>
          <div className={styles.playerRow}>
            <input
              className={styles.playerInput}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t.online.nameLabel}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="go"
            />
          </div>
        </div>
      </div>

      <div className={styles.dock}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={!clean}>
          {t.online.enter}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Typecheck y commit**

```bash
npx tsc --noEmit
git add src/components/online/online.module.css src/components/online/Entry.tsx
git commit -m "feat(online): add room entry screens"
```

---

## Chunk 7: Frontend online (pantallas y páginas)

Sigue haciendo falta `.env.local` con `NEXT_PUBLIC_ROOMS_ORIGIN=http://localhost:8787` (Chunk 6).

### Task 23: `Lobby`

Jugadores con punto de conectado, compartir (`navigator.share` solo en pantallas táctiles; en el resto, o si falla, copiar), y para el anfitrión el switch de pista de clase, expulsar y "Empezar". Reusa de `game.module.css`: `body`, `stack`, `fieldLabel`, `fieldHead`, `fieldCount`, `passName`, `playerList`, `playerRow`, `removeBtn`, `note`, `setting`, `settingText`, `settingLabel`, `settingHint`, `switch`, `switchOn`, `btn`, `btnPrimary`, `btnGhost`, `dock`, `dockNote`. Los atributos `data-seat` y `data-connected` existen para el E2E.

**Files:**
- Create: `src/components/online/Lobby.tsx`

- [ ] **Step 1: Escribir `Lobby.tsx`**

```tsx
"use client";

import { useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game";
import type { Dict } from "@/lib/i18n";
import type { Snapshot } from "@/lib/room/protocol";
import styles from "../game.module.css";
import online from "./online.module.css";

type Props = {
  t: Dict;
  snap: Snapshot;
  shareUrl: string;
  onRoleHint: (value: boolean) => void;
  onStart: () => void;
  onKick: (id: string) => void;
};

export function Lobby({ t, snap, shareUrl, onRoleHint, onStart, onKick }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = snap.you.isHost;
  const seats = snap.seats.filter((s) => !s.gone);
  const connected = seats.filter((s) => s.connected).length;
  const canStart = connected >= MIN_PLAYERS;
  const roleHint = snap.settings.roleHint;

  const share = async () => {
    // En escritorio el dialogo de compartir del sistema estorba: copiar es lo que se espera.
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Rift Impostor", text: t.online.shareText, url: shareUrl });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // lo cancelo el usuario
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Sin permiso de portapapeles: el codigo igual esta a la vista.
    }
  };

  return (
    <>
      <div className={styles.body}>
        <div className={styles.stack}>
          <span className={styles.fieldLabel}>{t.online.roomCode}</span>
          <p className={`${styles.passName} ${online.code} mono`}>{snap.code}</p>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={share}>
            {copied ? t.online.copied : t.online.share}
          </button>
        </div>

        <div>
          <div className={styles.fieldHead}>
            <span className={styles.fieldLabel}>{t.online.playersLabel}</span>
            <span className={styles.fieldCount}>{t.setup.playerCount(seats.length, MAX_PLAYERS)}</span>
          </div>
          <ul className={`${styles.playerList} ${online.list}`}>
            {seats.map((s) => (
              <li key={s.id} className={styles.playerRow} data-seat={s.id} data-connected={String(s.connected)}>
                <span className={`${online.dot} ${s.connected ? online.dotOn : ""}`} aria-hidden="true" />
                <span className={online.seatName}>{s.name}</span>
                <span className="srOnly">{s.connected ? t.online.online : t.online.offline}</span>
                {s.id === snap.hostId && <span className={styles.note}>{t.online.host}</span>}
                {s.id === snap.you.id && <span className={styles.note}>{t.online.you}</span>}
                {isHost && s.id !== snap.you.id && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onKick(s.id)}
                    aria-label={t.online.kick(s.name)}
                  >
                    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          /* role="switch" de verdad, igual que en Setup. */
          <button
            type="button"
            role="switch"
            aria-checked={roleHint}
            className={styles.setting}
            onClick={() => onRoleHint(!roleHint)}
          >
            <span className={styles.settingText}>
              <span className={styles.settingLabel}>{t.setup.roleHintLabel}</span>
              <span className={styles.settingHint}>{roleHint ? t.setup.roleHintOn : t.setup.roleHintOff}</span>
            </span>
            <span className={`${styles.switch} ${roleHint ? styles.switchOn : ""}`} aria-hidden="true" />
          </button>
        ) : (
          <p className={styles.note}>{roleHint ? t.setup.roleHintOn : t.setup.roleHintOff}</p>
        )}
      </div>

      <div className={styles.dock}>
        {isHost ? (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={!canStart} onClick={onStart}>
              {t.online.start}
            </button>
            {!canStart && <span className={styles.dockNote}>{t.online.needPlayers(MIN_PLAYERS)}</span>}
          </>
        ) : (
          <span className={styles.dockNote}>{t.online.waitHost}</span>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck y commit**

```bash
npx tsc --noEmit
git add src/components/online/Lobby.tsx
git commit -m "feat(online): add lobby screen"
```

---

### Task 24: `OnlineDeal`

`Card` con tocar-para-ver y "listo". El anfitrión ve el conteo y avanza cuando quiere. El que entró tarde ve "jugás desde la ronda siguiente" (y si justo es el anfitrión, igual puede avanzar). Reusa: `body`, `bodyCenter`, `bodyCard`, `headline`, `lede`, `fieldLabel`, `passLede`, `halo`, `btn`, `btnPrimary`, `btnGhost`, `dock`, `dockNote`.

**Files:**
- Create: `src/components/online/OnlineDeal.tsx`

- [ ] **Step 1: Escribir `OnlineDeal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { CHAMPIONS } from "@/data/champions";
import type { Dict, Lang } from "@/lib/i18n";
import type { Snapshot } from "@/lib/room/protocol";
import { Card, type CardFace } from "../screens/Card";
import styles from "../game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  snap: Snapshot;
  /** Participantes no retirados. */
  active: string[];
  onReady: () => void;
  onAdvance: () => void;
};

export function OnlineDeal({ t, lang, snap, active, onReady, onAdvance }: Props) {
  const [revealed, setRevealed] = useState(false);
  const role = snap.you.role;
  const isHost = snap.you.isHost;
  const readyCount = snap.ready.filter((id) => active.includes(id)).length;

  const footer = (
    <>
      <span className={styles.dockNote}>{t.online.readyCount(readyCount, active.length)}</span>
      {isHost && (
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onAdvance}>
          {t.online.advanceDeal}
        </button>
      )}
    </>
  );

  if (!role || role.kind === "waiting") {
    return (
      <>
        <div className={`${styles.body} ${styles.bodyCenter}`}>
          <h2 className={styles.headline}>{t.online.waitingTitle}</h2>
          <p className={styles.lede}>{t.online.waitingText}</p>
        </div>
        <div className={styles.dock}>{footer}</div>
      </>
    );
  }

  const champion = role.kind === "crew" ? CHAMPIONS.find((c) => c.id === role.championId) : undefined;
  // Un campeon que el cliente no conoce = cliente viejo contra servidor nuevo.
  // Nunca caer a la carta de impostor: le mentiria a un inocente.
  if (role.kind === "crew" && !champion) {
    return (
      <div className={`${styles.body} ${styles.bodyCenter}`}>
        <p className={styles.lede}>{t.online.errors.bad_version}</p>
      </div>
    );
  }
  const card: CardFace = champion
    ? { kind: "crew", champion }
    : { kind: "impostor", role: role.kind === "impostor" ? role.roleHint : null };

  if (!revealed) {
    return (
      <>
        <div className={`${styles.body} ${styles.bodyCenter}`}>
          <span className={styles.fieldLabel}>{t.online.yourCard}</span>
          <p className={styles.passLede}>{t.online.dealLede}</p>
        </div>
        <div className={styles.dock}>
          <span className={styles.halo}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setRevealed(true)}>
              {t.deal.view}
            </button>
          </span>
          {footer}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`${styles.body} ${styles.bodyCard}`}>
        <Card t={t} lang={lang} card={card} />
      </div>
      <div className={styles.dock}>
        {!snap.ready.includes(snap.you.id) && (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onReady}>
            {t.online.ready}
          </button>
        )}
        {footer}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck y commit**

```bash
npx tsc --noEmit
git add src/components/online/OnlineDeal.tsx
git commit -m "feat(online): add deal screen with own card"
```

---

### Task 25: `OnlineGame` (contenedor)

Lee el código de `window.location.search` en un efecto (**no** `useSearchParams`: sin `<Suspense>` rompe el export estático), conecta con `useRoom` y elige pantalla por fase. Si ya hay token para ese código (refresco o vuelta a la pestaña) entra derecho con el último nombre usado. El cambio de idioma conserva `?c=`.

UI que expone cada mensaje del protocolo: `settings`/`start`/`kick` en `Lobby`; `ready`/`advance` en `OnlineDeal`; `advance` en `Clues` (anfitrión); `vote`/`closeVote` en `Vote` + footer; `nextRound` en `Reveal` (anfitrión); `newGame` en `Scoreboard` (anfitrión); `cancelRound` y `leave` en la barra. `kick` solo se ofrece en el lobby: a mitad de ronda el protocolo lo acepta, pero un ausente no traba nada (el anfitrión tiene `closeVote`), así que no se le hace UI.

**Files:**
- Create: `src/components/online/OnlineGame.tsx`

- [ ] **Step 1: Escribir `OnlineGame.tsx`**

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CHAMPIONS } from "@/data/champions";
import { primaryRole, rankPlayers, type Player, type Round } from "@/lib/game";
import { ONLINE_PATH, dict, otherLang, pathFor, type Dict, type Lang } from "@/lib/i18n";
import { isRoomCode, type ErrorCode, type Snapshot } from "@/lib/room/protocol";
import { createRoom, forgetToken, readToken, useRoom } from "@/lib/room/useRoom";
import { Shell } from "../Shell";
import { Clues } from "../screens/Clues";
import { Reveal } from "../screens/Reveal";
import { Scoreboard } from "../screens/Scoreboard";
import { Vote } from "../screens/Vote";
import { Entry } from "./Entry";
import { Lobby } from "./Lobby";
import { OnlineDeal } from "./OnlineDeal";
import styles from "../game.module.css";

const NAME_KEY = "rift.online.name";

function loadName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // sin storage: solo no lo recuerda
  }
}

/** El Round que espera <Reveal>, armado con lo que trae el snapshot de reveal/end. */
function revealRound(snap: Snapshot): Round | null {
  const r = snap.reveal;
  const secret = r && CHAMPIONS.find((c) => c.id === r.championId);
  if (!r || !secret) return null;
  return {
    role: primaryRole(secret),
    roleHint: snap.settings.roleHint,
    secret,
    impostorPlayerId: r.impostorId,
    clueOrder: snap.clueOrder,
  };
}

export function OnlineGame({ lang }: { lang: Lang }) {
  const t = dict(lang);
  /** undefined = todavia no leimos la URL (primer render, igual en server y cliente). */
  const [code, setCode] = useState<string | null | undefined>(undefined);
  /** null = no entramos a la sala. */
  const [name, setName] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    // window.location y no useSearchParams: sin <Suspense> rompe el export estatico.
    const raw = new URLSearchParams(window.location.search).get("c")?.toUpperCase() ?? "";
    const valid = isRoomCode(raw) ? raw : null;
    const saved = loadName();
    setSavedName(saved);
    setCode(valid);
    // Ya tiene asiento en esta sala (refresco, o volvio a la pestana): entra derecho.
    if (valid && readToken(valid) && saved) setName(saved);
  }, []);

  const room = useRoom(code ?? null, name);
  const snap = room.snapshot;

  const goTo = (next: string | null) => {
    window.history.replaceState(null, "", next ? `?c=${next}` : window.location.pathname);
    setCode(next);
    setName(null);
  };
  const join = (n: string) => {
    saveName(n);
    setSavedName(n);
    setName(n);
  };
  const create = async () => goTo(await createRoom());
  const leave = () => {
    room.leave();
    goTo(null);
  };
  const rejoin = () => {
    if (code) forgetToken(code);
    setName(null);
  };

  const inRoom = Boolean(code && name !== null && snap && !room.error);
  const isHost = snap?.you.isHost ?? false;
  const byId = new Map((snap?.seats ?? []).map((s) => [s.id, s]));
  const players = (ids: string[]): Player[] =>
    ids.flatMap((id) => {
      const s = byId.get(id);
      return s ? [{ id: s.id, name: s.name }] : [];
    });
  /** Participantes no retirados, en orden de pista. */
  const active = (snap?.clueOrder ?? []).filter((id) => byId.get(id)?.gone === false);
  const waitHost = <span className={styles.dockNote}>{t.online.waitHost}</span>;

  const phaseScreen = (s: Snapshot): ReactNode => {
    const send = room.send;
    switch (s.phase) {
      case "lobby":
        return (
          <Lobby
            t={t}
            snap={s}
            shareUrl={window.location.href}
            onRoleHint={(roleHint) => send({ type: "settings", roleHint })}
            onStart={() => send({ type: "start" })}
            onKick={(id) => send({ type: "kick", id })}
          />
        );
      case "deal":
        return (
          <OnlineDeal
            key={s.roundNumber}
            t={t}
            lang={lang}
            snap={s}
            active={active}
            onReady={() => send({ type: "ready" })}
            onAdvance={() => send({ type: "advance" })}
          />
        );
      case "clues":
        return (
          <Clues
            t={t}
            clueOrder={active}
            players={players(active)}
            onDone={isHost ? () => send({ type: "advance" }) : undefined}
            footer={isHost ? undefined : waitHost}
          />
        );
      case "vote": {
        const voted = s.voted.filter((id) => active.includes(id)).length;
        const footer = (
          <>
            <span className={styles.dockNote}>
              {t.online.votedCount(voted, active.length)}
              {s.voted.includes(s.you.id) ? ` · ${t.online.voteSent}` : ""}
            </span>
            {isHost && (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled={voted * 2 <= active.length}
                onClick={() => send({ type: "closeVote" })}
              >
                {t.online.closeVote}
              </button>
            )}
          </>
        );
        if (!active.includes(s.you.id)) return <Waiting t={t} footer={footer} />;
        return (
          <Vote
            t={t}
            players={players(active.filter((id) => id !== s.you.id))}
            onVote={(target) => send({ type: "vote", target })}
            lede={t.online.voteLede}
            tieLabel={t.online.voteTie}
            confirmLabel={t.online.voteConfirm}
            footer={footer}
          />
        );
      }
      case "reveal": {
        const round = revealRound(s);
        if (!round || !s.reveal) return <Loading text={t.loading} />;
        // Tabla corrida: en el modo online no hay pantalla de puntajes hasta el final.
        const standings = rankPlayers(players(s.seats.filter((x) => !x.gone).map((x) => x.id)), s.stats)
          .map((r) => `${r.name} ${r.points}`)
          .join(" · ");
        return (
          <Reveal
            t={t}
            lang={lang}
            round={round}
            roundNumber={s.roundNumber}
            players={players(s.clueOrder)}
            outcome={s.reveal.outcome}
            deltas={s.reveal.deltas}
            tally={s.reveal.tally}
            onNextRound={isHost ? () => send({ type: "nextRound" }) : undefined}
            footer={
              <>
                {!isHost && waitHost}
                <span className={styles.dockNote}>{standings}</span>
              </>
            }
          />
        );
      }
      case "end":
        return (
          <Scoreboard
            t={t}
            players={players(s.seats.filter((x) => !x.gone).map((x) => x.id))}
            stats={s.stats}
            roundsPlayed={s.roundsPlayed}
            footer={
              isHost ? (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => send({ type: "newGame" })}>
                  {t.online.newGame}
                </button>
              ) : (
                waitHost
              )
            }
          />
        );
    }
  };

  let screen: ReactNode;
  if (code === undefined) screen = <Loading text={t.loading} />;
  else if (room.error) screen = <RoomError t={t} error={room.error} onCreate={create} onRejoin={rejoin} />;
  else if (!code || name === null) {
    screen = <Entry t={t} code={code} savedName={savedName} onCreate={create} onCode={goTo} onJoin={join} />;
  } else if (!snap) screen = <Loading text={t.online.connecting} />;
  else screen = phaseScreen(snap);

  const context =
    room.status === "reconnecting" && name !== null
      ? t.online.reconnecting
      : !inRoom || !snap
        ? null
        : snap.phase === "lobby"
          ? t.online.roomLabel(snap.code)
          : snap.phase === "deal"
            ? t.reveal.context(snap.roundNumber)
            : snap.phase === "clues"
              ? t.clues.context(snap.roundNumber)
              : snap.phase === "vote"
                ? t.vote.context(snap.roundNumber)
                : null;

  const midRound = snap?.phase === "deal" || snap?.phase === "clues" || snap?.phase === "vote";
  const nav = inRoom ? (
    <>
      {isHost && midRound && (
        <button type="button" className={styles.navLink} onClick={() => room.send({ type: "cancelRound" })}>
          {t.online.cancelRound}
        </button>
      )}
      <button type="button" className={styles.navLink} onClick={leave}>
        {t.online.leave}
      </button>
    </>
  ) : (
    <a className={styles.navLink} href={`${pathFor(lang)}#rules`}>
      {t.nav.rules}
    </a>
  );

  return (
    <Shell
      t={t}
      lang={lang}
      langHref={`${ONLINE_PATH[otherLang(lang)]}${code ? `?c=${code}` : ""}`}
      nav={nav}
      context={context}
    >
      {screen}
    </Shell>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className={`${styles.body} ${styles.bodyCenter}`} aria-busy="true">
      <p className={styles.note}>{text}</p>
    </div>
  );
}

function Waiting({ t, footer }: { t: Dict; footer: ReactNode }) {
  return (
    <>
      <div className={`${styles.body} ${styles.bodyCenter}`}>
        <h2 className={styles.headline}>{t.online.waitingTitle}</h2>
        <p className={styles.lede}>{t.online.waitingText}</p>
      </div>
      <div className={styles.dock}>{footer}</div>
    </>
  );
}

/** Errores legibles: sala inexistente o vencida -> crear otra; version nueva -> recargar. */
function RoomError({
  t,
  error,
  onCreate,
  onRejoin,
}: {
  t: Dict;
  error: ErrorCode;
  onCreate: () => Promise<void>;
  onRejoin: () => void;
}) {
  const action =
    error === "room_not_found" || error === "room_full"
      ? { label: t.online.createNew, run: () => void onCreate().catch(() => {}) }
      : error === "kicked"
        ? { label: t.online.joinAgain, run: onRejoin }
        : { label: t.online.reload, run: () => window.location.reload() };

  return (
    <>
      <div className={`${styles.body} ${styles.bodyCenter}`}>
        <h2 className={styles.headline} style={{ textAlign: "center" }} role="alert">
          {t.online.errors[error]}
        </h2>
      </div>
      <div className={styles.dock}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={action.run}>
          {action.label}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck y commit**

```bash
npx tsc --noEmit
git add src/components/online/OnlineGame.tsx
git commit -m "feat(online): add online game container"
```

---

### Task 26: Páginas, metadata y sitemap

Cada página online exporta su `metadata` (título, canonical, `languages`). **No** se setea `openGraph`: en Next el merge de metadata entre segmentos es superficial (`generate-metadata.md`, "Merging"), así que pisarlo reemplazaría el `openGraph` entero del layout. La imagen OG sale del `opengraph-image.tsx` del grupo de rutas, que aplica también a `/play` y `/es/jugar`.

**Files:**
- Modify: `src/lib/metadata.ts`
- Create: `src/app/(en)/play/page.tsx`
- Create: `src/app/(es)/es/jugar/page.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: `buildOnlineMetadata`**

En `metadata.ts`, cambiar el import de i18n a:

```ts
import { ONLINE_PATH, dict, LANG_META, otherLang, pathFor, type Lang } from "./i18n";
```

Y agregar después de `buildMetadata`:

```ts
/** Paginas online. Heredan el layout (openGraph, imagen OG, robots); solo cambian
 *  titulo, descripcion, canonical y hreflang. `title` pasa por el template
 *  "%s · Rift Impostor" del layout. */
export function buildOnlineMetadata(lang: Lang): Metadata {
  const t = dict(lang);
  return {
    title: t.online.metaTitle,
    description: t.online.metaDescription,
    alternates: {
      canonical: ONLINE_PATH[lang],
      languages: { en: ONLINE_PATH.en, es: ONLINE_PATH.es, "x-default": ONLINE_PATH.en },
    },
  };
}
```

- [ ] **Step 2: Las dos páginas**

`src/app/(en)/play/page.tsx`:

```tsx
import type { Metadata } from "next";
import { OnlineGame } from "@/components/online/OnlineGame";
import { dict } from "@/lib/i18n";
import { buildOnlineMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOnlineMetadata("en");

export default function Play() {
  return (
    <>
      {/* El unico h1, estatico, igual que en la portada. */}
      <h1 className="srOnly">Rift Impostor — {dict("en").online.headline}</h1>
      <OnlineGame lang="en" />
    </>
  );
}
```

`src/app/(es)/es/jugar/page.tsx`:

```tsx
import type { Metadata } from "next";
import { OnlineGame } from "@/components/online/OnlineGame";
import { dict } from "@/lib/i18n";
import { buildOnlineMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOnlineMetadata("es");

export default function Jugar() {
  return (
    <>
      <h1 className="srOnly">Rift Impostor — {dict("es").online.headline}</h1>
      <OnlineGame lang="es" />
    </>
  );
}
```

- [ ] **Step 3: Sitemap**

Reemplazar el cuerpo de `sitemap()` en `src/app/sitemap.ts` (y agregar `ONLINE_PATH` y `type Lang` al import de `@/lib/i18n`):

```ts
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const abs = (path: string) => new URL(path, SITE_URL).toString();

  // Cada idioma entra como URL propia y ademas se declara como alternativa de
  // la otra. Es la misma señal que el hreflang del <head>, por duplicado.
  const page = (paths: Record<Lang, string>, priority: Record<Lang, number>) =>
    LANGS.map((lang) => ({
      url: abs(paths[lang]),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: priority[lang],
      alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, abs(paths[l])])) },
    }));

  return [
    ...page({ en: pathFor("en"), es: pathFor("es") }, { en: 1, es: 0.9 }),
    ...page(ONLINE_PATH, { en: 0.8, es: 0.7 }),
  ];
}
```

- [ ] **Step 4: Verificar contra `next dev`**

Levantar `npx next dev --port 3000` en background (se bajó al final del Chunk 5; tiene que arrancar después de crear `.env.local`):

```bash
npx tsc --noEmit
curl -s http://localhost:3000/play | rg -o '<title>[^<]*</title>|<link rel="canonical"[^>]*>|hrefLang="[a-z-]+" href="[^"]*"'
curl -s http://localhost:3000/es/jugar | rg -o '<title>[^<]*</title>'
curl -s http://localhost:3000/sitemap.xml | rg -o '<loc>[^<]*</loc>'
```

Expected:
- `tsc` sin salida.
- `<title>Play online · Rift Impostor</title>`, canonical terminado en `/play`, hreflang `en` → `/play`, `es` → `/es/jugar`, `x-default` → `/play` (los hosts salen del `SITE_URL` de fallback; está bien).
- `<title>Jugar online · Rift Impostor</title>`.
- Cuatro `<loc>`: `/`, `/es`, `/play`, `/es/jugar`.

(Si `rg` no encuentra los atributos por mayúsculas, probar con `rg -io`: el HTML de Next puede emitir `hreflang` en minúscula.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/metadata.ts "src/app/(en)/play/page.tsx" "src/app/(es)/es/jugar/page.tsx" src/app/sitemap.ts
git commit -m "feat(online): add play pages with metadata and sitemap entries"
```

---

### Task 27: Botón "Jugar online" en la portada y regresión del modo local

**Files:**
- Modify: `src/components/screens/Setup.tsx`
- Modify: `src/components/Game.tsx`
- Modify: `src/components/game.module.css` (`.btn`)

- [ ] **Step 1: `Setup.tsx`**

Agregar `onlineHref: string;` a `Props` y al destructuring. En el dock, después del botón de repartir:

```tsx
        {/* Ancla comun, no next/link: misma razon que el cambio de idioma (sin prefetch RSC en el export). */}
        <a className={`${styles.btn} ${styles.btnGhost}`} href={onlineHref}>
          {t.setup.playOnline}
        </a>
```

- [ ] **Step 2: `Game.tsx`**

Agregar `ONLINE_PATH` al import de `@/lib/i18n` y pasar `onlineHref={ONLINE_PATH[lang]}` a `<Setup ... />`.

- [ ] **Step 3: `.btn` como ancla**

En `game.module.css`, dentro de `.btn { ... }`, agregar `text-decoration: none;` (un `<a>` con `.btn` hereda el subrayado de los links).

- [ ] **Step 4: Regresión**

Levantar `npx next dev --port 3000` en background (se bajó al final del Chunk 5; tiene que arrancar después de crear `.env.local`):

```bash
npx tsc --noEmit
E2E_BASE=http://localhost:3000 npm run test:e2e
npm run audit
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/play
```

Expected: `tsc` sin salida; E2E local igual a la línea de base de la Task 16 (el link nuevo es `role=link`, no choca con `getByRole("button", { name: "Play" })`); audit igual a su línea de base de la Task 16 (el botón nuevo del dock no tiene que desbordar en 320 px); `200`.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/Setup.tsx src/components/Game.tsx src/components/game.module.css
git commit -m "feat(online): link online mode from the home screen"
```

---

## Chunk 8: E2E online

### Task 28: `scripts/e2e-online.mjs`

Tres contextos de Playwright (tres "dispositivos", cada uno con su `localStorage`) contra `next dev` + `wrangler dev`. Cubre lo que pide la spec: crear sala, unirse, ronda completa, desconectar y reconectar a un jugador, y anfitrión que se va. Sigue el estilo de `scripts/e2e.mjs` (`check`, capturas en `D:/tmp`, consola limpia).

**Files:**
- Create: `scripts/e2e-online.mjs`

- [ ] **Step 1: Escribir el script**

```js
/**
 * E2E del modo online: 3 jugadores, cada uno en su propio contexto de navegador.
 *
 *   npx wrangler dev --port 8787        (salas)
 *   npx next dev --port 3000            (con NEXT_PUBLIC_ROOMS_ORIGIN=http://localhost:8787 en .env.local)
 *   npm run test:e2e:online
 *   E2E_BASE=https://rift.wampaland.com.ar npm run test:e2e:online
 *
 * Correrlo tambien contra el deploy real: ahi el Worker y los assets comparten
 * origen y aparecen cosas que en local no (dominio, TLS, hibernacion real).
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const SHOTS = "D:/tmp/shots-online";
/** Espera por pantalla: cada cambio viaja por red ida y vuelta. */
const T = 15_000;

let passed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  OK   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Un "dispositivo": contexto propio (localStorage propio) y la pagina abierta. */
async function device(browser, name) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const d = { name, context, page: null, errors: [] };
  d.open = async (url) => {
    d.page = await context.newPage();
    d.page.on("console", (m) => m.type() === "error" && d.errors.push(`${name}: ${m.text()}`));
    d.page.on("pageerror", (e) => d.errors.push(`${name}: pageerror ${e.message}`));
    await d.page.goto(url, { waitUntil: "domcontentloaded" });
  };
  return d;
}

const button = (page, name) => page.getByRole("button", { name, exact: true });
const appears = (locator) => locator.first().waitFor({ timeout: T }).then(() => true, () => false);

async function enter(d, url) {
  await d.open(url);
  await d.page.getByLabel("Your name", { exact: true }).fill(d.name);
  await button(d.page, "Enter the room").click();
}

/** Mira la carta propia. Devuelve "impostor" o el nombre del campeon. */
async function lookAtCard(page) {
  await button(page, "See my card").click();
  const impostor = page.getByText("You're the impostor");
  await page.locator("main img").or(impostor).first().waitFor({ timeout: T });
  if ((await impostor.count()) > 0) return "impostor";
  return page.locator("main img").first().getAttribute("alt");
}

/** Filas de puntos del reveal. El nombre trae " · N votes" en el modo online. */
async function readDeltas(page) {
  const rows = await page.locator("main ul li").allInnerTexts();
  return Object.fromEntries(
    rows.map((r) => {
      const parts = r.split("\n").map((s) => s.trim()).filter(Boolean);
      return [parts[0].split(" · ")[0], Number(parts[parts.length - 1])];
    }),
  );
}

const run = async () => {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ana = await device(browser, "Ana");
  const beto = await device(browser, "Beto");
  const cami = await device(browser, "Cami");
  const all = [ana, beto, cami];
  const seats = (d, connected) =>
    d.page.locator(connected === undefined ? "[data-seat]" : `[data-seat][data-connected="${connected}"]`);

  // --------------------------------------------------------- crear y unirse
  console.log("\n== Crear y unirse ==");
  await ana.open(`${BASE}/play`);
  await button(ana.page, "Create a room").click();
  await ana.page.waitForURL(/\?c=[2-9A-Z]{4}$/, { timeout: T });
  const code = new URL(ana.page.url()).searchParams.get("c");
  check(`la sala tiene un codigo valido (${code})`, /^[2-9A-HJKMNP-Z]{4}$/.test(code));
  await ana.page.getByLabel("Your name", { exact: true }).fill("Ana");
  await button(ana.page, "Enter the room").click();
  check("el anfitrion ve el lobby", await appears(button(ana.page, "Start the game")));

  for (const d of [beto, cami]) await enter(d, `${BASE}/play?c=${code}`);
  await seats(ana, true).nth(2).waitFor({ timeout: T });
  check("el lobby muestra a los 3 conectados", (await seats(ana, true).count()) === 3);
  check("solo el anfitrion ve Empezar", (await button(beto.page, "Start the game").count()) === 0);
  await ana.page.screenshot({ path: `${SHOTS}/lobby.png` });

  // ----------------------------------------- desconectar y reconectar en lobby
  console.log("\n== Desconectar y reconectar ==");
  await cami.page.close();
  check("el lobby marca a Cami desconectada", await appears(seats(ana, false)));
  check("con 2 conectados no se puede empezar", await button(ana.page, "Start the game").isDisabled());
  // Mismo contexto = mismo token en localStorage: vuelve a su asiento sin pedir nombre.
  await cami.open(`${BASE}/play?c=${code}`);
  await seats(ana, true).nth(2).waitFor({ timeout: T });
  check("Cami vuelve a su asiento, sin duplicarse", (await seats(ana).count()) === 3);
  check("y sin que le pidan el nombre", (await cami.page.getByLabel("Your name", { exact: true }).count()) === 0);

  // ------------------------------------------------------------ ronda 1
  console.log("\n== Ronda 1 ==");
  await button(ana.page, "Start the game").click();
  const cards = {};
  for (const d of all) {
    cards[d.name] = await lookAtCard(d.page);
    await button(d.page, "I've seen it").click();
  }
  const impostor = Object.keys(cards).find((n) => cards[n] === "impostor");
  const crew = all.filter((d) => d.name !== impostor);
  check("exactamente 1 impostor", Object.values(cards).filter((c) => c === "impostor").length === 1, JSON.stringify(cards));
  check("los inocentes ven el mismo campeon", new Set(crew.map((d) => cards[d.name])).size === 1, JSON.stringify(cards));
  check("el anfitrion ve el conteo de listos", await appears(ana.page.getByText("3 of 3 ready")));

  await button(ana.page, "Go to clues").click();
  for (const d of all) await d.page.locator("main ol li").nth(2).waitFor({ timeout: T });
  check("todos ven el orden de pistas con 3", (await beto.page.locator("main ol li").count()) === 3);
  check(
    "solo el anfitrion puede pasar a votar",
    (await button(beto.page, "Clues are done, let's vote").count()) === 0,
  );
  await button(ana.page, "Clues are done, let's vote").click();

  for (const d of all) {
    await d.page.getByRole("radiogroup").waitFor({ timeout: T });
    check(
      `${d.name} no se ve entre los candidatos`,
      (await d.page.getByRole("radio", { name: d.name, exact: true }).count()) === 0,
    );
  }
  await beto.page.screenshot({ path: `${SHOTS}/vote.png` });
  for (const d of all) {
    const target = d.name === impostor ? crew[0].name : impostor;
    await d.page.getByRole("radio", { name: target, exact: true }).click();
    await button(d.page, "Send my vote").click();
  }
  for (const d of all) {
    check(`${d.name} ve que cayo el impostor`, await appears(d.page.getByText("The impostor went down")));
  }
  const deltas = await readDeltas(ana.page);
  check("el impostor no suma", deltas[impostor] === 0, JSON.stringify(deltas));
  check("cada inocente suma 1", crew.every((d) => deltas[d.name] === 1), JSON.stringify(deltas));
  check("solo el anfitrion ve Siguiente ronda", (await button(cami.page, "Next round").count()) === 0);
  await ana.page.screenshot({ path: `${SHOTS}/reveal.png` });

  // ------------------------------------------ ronda 2: reconectar con ronda
  console.log("\n== Ronda 2: reconectar a mitad de ronda ==");
  await button(ana.page, "Next round").click();
  const before = await lookAtCard(beto.page);
  await beto.page.close();
  await beto.open(`${BASE}/play?c=${code}`);
  const after = await lookAtCard(beto.page);
  check("Beto recupera la misma carta al reconectar", before === after, `${before} / ${after}`);

  // ------------------------------------------------- el anfitrion se va
  console.log("\n== El anfitrion se va ==");
  await button(ana.page, "Leave").click();
  check("Ana vuelve a la entrada", await appears(button(ana.page, "Create a room")));
  // Con 2 participantes la ronda se cancela sola, y el rol pasa sin gracia al mas antiguo.
  check("la ronda se cancela y Beto queda de anfitrion", await appears(button(beto.page, "Start the game")));
  check("Cami no es anfitriona", (await button(cami.page, "Start the game").count()) === 0);
  check("quedan 2 asientos", (await seats(beto).count()) === 2);
  check(
    "sin nombres duplicados",
    !(await seats(beto).allInnerTexts()).some((s) => /Beto 2|Cami 2/.test(s)),
  );
  await beto.page.screenshot({ path: `${SHOTS}/host-left.png` });

  // ------------------------------------------------------------- consola
  console.log("\n== Consola ==");
  const errors = all.flatMap((d) => d.errors).filter((e) => !/favicon/i.test(e));
  check("sin errores de JS", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  console.log(`\n${"=".repeat(52)}`);
  console.log(`${passed} checks OK, ${failures.length} fallaron`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  FAIL ${f}`));
    process.exitCode = 1;
  }
};

run().catch((e) => {
  console.error("\nEl E2E online se cayo:", e.message);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/e2e-online.mjs
git commit -m "test(online): add three-player e2e for online rooms"
```

---

### Task 29: Correr el E2E online y arreglar lo que aparezca

**Files:** los que haga falta tocar según lo que falle.

- [ ] **Step 1: Levantar los dos servidores en background**

```bash
cd "D:/code/imposter lol" && npx wrangler dev --port 8787
```

```bash
cd "D:/code/imposter lol" && npx next dev --port 3000
```

Verificar que `.env.local` tiene `NEXT_PUBLIC_ROOMS_ORIGIN=http://localhost:8787` (si se creó con `next dev` ya corriendo, reiniciarlo: las `NEXT_PUBLIC_*` se leen al arrancar).

- [ ] **Step 2: Correr**

```bash
npm run test:e2e:online
```

Expected: `N checks OK, 0 fallaron`. Mirar las capturas en `D:/tmp/shots-online/`.

- [ ] **Step 3: Si algo falla**

Usar @superpowers:systematic-debugging. Pistas probables, en orden:
- Errores de consola `WebSocket ... closed before the connection is established`: revisar el cleanup de `useRoom` (el truco de `onopen = close` para sockets en `CONNECTING`).
- `CORS` en el `POST`: el Worker tiene que devolver `Access-Control-Allow-Origin: *` también en el 201.
- Un check de lógica (votos, anfitrión): reproducirlo primero como test en `scripts/test-room.mjs`, después arreglar `logic.ts`. La regla vive ahí, no en el componente.

Cada arreglo, con su commit (`fix(online): ...` o `fix(rooms): ...`).

- [ ] **Step 4: Regresión completa**

```bash
npm run test:room
npm run test:logic
E2E_BASE=http://localhost:3000 npm run test:e2e
npm run test:e2e:online
npx tsc --noEmit
npx tsc --noEmit -p worker
npx wrangler deploy --dry-run --outdir D:/tmp/rift-dry
```

Expected: todo verde; E2E local igual a la línea de base; dry-run termina en `--dry-run: exiting now.`

Bajar los dos servidores.

---

## Chunk 9: Deploy y migración de hosting

Tareas marcadas **[MANUAL]** necesitan una acción de Facu en un panel o una credencial; las marcadas **[MCP]** se pueden hacer con el MCP de Cloudflare que Facu ya autorizó (tools `mcp__cloudflare__search`, `mcp__cloudflare__execute`, `mcp__cloudflare__docs`; cargarlas con `ToolSearch` → `select:mcp__cloudflare__search,mcp__cloudflare__execute,mcp__cloudflare__docs`). Antes de cualquier escritura con el MCP, mostrarle a Facu qué se va a cambiar y esperar su OK.

### Task 30: Cloudflare Web Analytics en vez de `@vercel/analytics`

Mismo esquema de hoy: detrás de una variable **de build**. Sin la variable, no se emite ningún `<script>`.

**Files:**
- Modify: `src/components/WebAnalytics.tsx`
- Modify: `src/lib/site.ts`
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Reemplazar `WebAnalytics.tsx` entero**

```tsx
/**
 * Cloudflare Web Analytics, con el snippet manual.
 *
 * Se activa con una env var de BUILD (NEXT_PUBLIC_CF_ANALYTICS_TOKEN), no en
 * runtime: Workers Builds la tiene seteada, el build local y moraserver no. Sin
 * la variable esto devuelve null y no se inyecta ningun <script>.
 *
 * Sin cookies y sin datos personales: no hace falta banner de consentimiento.
 *
 * Ojo al diagnosticar: un beacon que responde 200 no prueba que los datos
 * lleguen (ya nos paso con Vercel). La prueba es ver visitas en el panel de
 * Web Analytics o en su API.
 */
export function WebAnalytics() {
  const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
  if (!token) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
```

- [ ] **Step 2: Sacar el paquete**

```bash
npm uninstall @vercel/analytics
rg -n "@vercel/analytics|NEXT_PUBLIC_ANALYTICS" src package.json
```

Expected: `rg` sin resultados.

- [ ] **Step 3: Fallback de `SITE_URL`**

En `src/lib/site.ts`:

```ts
/**
 * URL canonica del sitio. En Workers Builds se setea NEXT_PUBLIC_SITE_URL; el
 * fallback existe para dev y es el mismo dominio, por si alguien se olvida.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rift.wampaland.com.ar";
```

- [ ] **Step 4: Verificar y commitear**

```bash
npx tsc --noEmit
git add src/components/WebAnalytics.tsx src/lib/site.ts package.json package-lock.json
git commit -m "feat: switch to Cloudflare Web Analytics and new canonical domain"
```

---

### Task 31: [MCP] Verificar zona y DNS de `wampaland.com.ar`

`routes: [{ pattern: "rift.wampaland.com.ar", custom_domain: true }]` solo funciona si la zona está en la misma cuenta de Cloudflare y si no existe ya un registro DNS para `rift` (crear el dominio custom falla si hay uno).

- [ ] **Step 1: Buscar la zona y los registros**

Con `mcp__cloudflare__search` encontrar los endpoints de "list zones" y "list DNS records"; con `mcp__cloudflare__execute`, solo lecturas:
- `GET /zones?name=wampaland.com.ar` → anotar `zone_id` y `account.id`.
- `GET /zones/{zone_id}/dns_records?name=rift.wampaland.com.ar`.

Expected: la zona existe y está `active`; no hay registros para `rift`.

- [ ] **Step 2: Si algo no da**

- La zona no está en Cloudflare: **frenar y avisar a Facu.** Mover los nameservers es una decisión suya (y afecta a todo `wampaland.com.ar`).
- Hay un registro `rift` (por ejemplo un CNAME a Vercel de una prueba anterior): mostrárselo a Facu y borrarlo **solo con su OK**, justo antes del primer deploy (Task 34), para no dejar el subdominio caído más de lo necesario.

---

### Task 32: [MANUAL o MCP] Sitio de Web Analytics y token

- [ ] **Step 1: Crear el sitio**

**Panel (Facu):** Cloudflare → *Analytics & Logs* → *Web Analytics* → *Add a site* → hostname `rift.wampaland.com.ar` → elegir la instalación con **JS snippet manual** (no la automática: el snippet ya va en el HTML y la automática lo inyectaría dos veces) → copiar el `token` del snippet.

**Alternativa [MCP]:** buscar con `mcp__cloudflare__search` el endpoint de RUM ("Web Analytics site") y crear el sitio con `host: "rift.wampaland.com.ar"` y `auto_install: false`; la respuesta trae `site_token`.

- [ ] **Step 2:** Guardar el token para la Task 34 (es público: viaja en el HTML; no es un secreto, pero no hace falta commitearlo).

---

### Task 33: [MANUAL] Merge a `main`

Pushear `main` dispara el build de Vercel (si sigue conectado a git) y, desde la Task 34, el de Workers Builds. Es una decisión de Facu.

- [ ] **Step 1:** Usar @superpowers:finishing-a-development-branch. Mostrar a Facu el resumen de la rama (`git log --oneline main..feat/salas-online`) y **preguntar** si se mergea a `main` y se pushea. No seguir sin su respuesta.

- [ ] **Step 2 (con su OK):**

```bash
git switch main
git pull --ff-only
git merge --no-ff feat/salas-online -m "feat: online rooms on Cloudflare Workers"
git push origin main
```

Mientras Vercel siga sirviendo, `/play` ahí va a mostrar la UI pero "Crear sala" falla (Vercel no tiene `/api/sala`): es transitorio hasta el redirect de la Task 38.

---

### Task 34: [MANUAL] Conectar Workers Builds

- [ ] **Step 1: Crear el Worker desde el repo (Facu, en el panel)**

1. Cloudflare → *Workers & Pages* → *Create* → *Import a repository* → conectar GitHub si hace falta → elegir `facuga7van/rift-imposter`.
2. **Project name:** `rift-impostor` (tiene que coincidir con `name` de `wrangler.jsonc`, si no el build falla).
3. **Production branch:** `main`. **Root directory:** `/`.
4. **Build command:** `npx next build`.
5. **Deploy command:** `npx wrangler deploy`.
6. *Builds for non-production branches*: **apagado** (ahorra minutos; `preview_urls` está en `false` igual).
7. *Settings → Build → Variables and secrets* (variables **de build**, no de runtime):
   - `NEXT_PUBLIC_SITE_URL=https://rift.wampaland.com.ar`
   - `NEXT_PUBLIC_CF_ANALYTICS_TOKEN=<token de la Task 32>`
   - Si en Vercel estaba `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, copiarla también (mirar en Vercel → Project `rift-impostor` → Settings → Environment Variables).
   - Node: Next 16 pide Node ≥ 20.9 y la imagen de build ya cumple. La spec menciona Node 24: si se quiere fijar, confirmar con `mcp__cloudflare__docs` cómo se elige la versión en Workers Builds (variable `NODE_VERSION` o archivo `.node-version`) antes de tocar nada.

- [ ] **Step 2: Primer build**

Disparar el build (o hacer *Retry* del primero) y seguir el log. Expected:
- `next build` termina sin errores. **Esto verifica el pendiente de la spec:** que `allowImportingTsExtensions` no moleste a `next build`.
- `wrangler deploy` aplica la migración `v1` (`new_sqlite_classes: Room`), sube los assets de `out/` y crea el dominio custom `rift.wampaland.com.ar`.

Si el deploy falla por permisos del dominio custom, agregarlo a mano: Worker `rift-impostor` → *Settings* → *Domains & Routes* → *Add* → *Custom domain* → `rift.wampaland.com.ar`.

---

### Task 35: Verificar el deploy e imagen OG

**Files:**
- Create (solo si hace falta): `public/_headers`

- [ ] **Step 1: Rutas**

```bash
for p in / /es /play /es/jugar /sitemap.xml /robots.txt /no-existe; do
  printf "%-14s " "$p"; curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://rift.wampaland.com.ar$p"
done
curl -s -X POST https://rift.wampaland.com.ar/api/sala
```

Expected: `200 text/html` para las páginas, `200` para sitemap y robots, `404` para `/no-existe` (con la página 404 de Next), y el POST devuelve `{"code":"XXXX"}`.

- [ ] **Step 2: Canonical**

```bash
curl -s https://rift.wampaland.com.ar/play | rg -io '<link rel="canonical"[^>]*>'
```

Expected: `href="https://rift.wampaland.com.ar/play"`.

- [ ] **Step 3: Imagen OG (Discord depende de esto)**

```bash
OG=$(curl -s https://rift.wampaland.com.ar/ | rg -o 'property="og:image" content="[^"]+"' | rg -o 'https://[^"]+' | head -1)
echo "$OG"
curl -sI "$OG" | rg -i "^(HTTP|content-type)"
OGES=$(curl -s https://rift.wampaland.com.ar/es | rg -o 'property="og:image" content="[^"]+"' | rg -o 'https://[^"]+' | head -1)
curl -sI "$OGES" | rg -i "^(HTTP|content-type)"
```

Expected: `HTTP/2 200` y `content-type: image/png` en las dos. Lo de `_headers` ya se decidió en local en la Task 15, Step 6; acá solo se re-verifica en producción. Si da `image/png`, saltar al Step 5.

- [ ] **Step 4: Si en producción no da `image/png`**

Confirmar que `_headers` llegó al deploy (si la Task 15 creó `public/_headers`, tiene que estar en `out/` del build). Si está y aun así no aplica, plan B en el Worker: agregar `"/opengraph-image-*"` y `"/es/opengraph-image-*"` a `run_worker_first` en `wrangler.jsonc` y, en `worker/index.ts`, antes del `return json({ error: "not_found" }, 404)`:

```ts
    if (url.pathname.includes("/opengraph-image-")) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set("Content-Type", "image/png");
      return new Response(asset.body, { status: asset.status, headers });
    }
```

(Commit `fix(worker): force png content type on og images`, push, y repetir el Step 3.)

- [ ] **Step 5: Preview real en Discord [MANUAL]**

Facu pega `https://rift.wampaland.com.ar/` en un canal de Discord. Expected: aparece la tarjeta con la imagen.

---

### Task 36: [MCP] Regla de rate limiting para `/api/sala`

Free: 1 regla, solo por path, por IP, período de 10 s. Es un freno, no una garantía.

- [ ] **Step 1: Mirar lo que hay**

Con `mcp__cloudflare__execute`: `GET /zones/{zone_id}/rulesets/phases/http_ratelimit/entrypoint`. Si ya existe una regla (el Free tiene una sola), **frenar y preguntarle a Facu**: el `PUT` del Step 2 la reemplazaría.

- [ ] **Step 2: Crear la regla (con el OK de Facu)**

`PUT /zones/{zone_id}/rulesets/phases/http_ratelimit/entrypoint` con:

```json
{
  "rules": [
    {
      "description": "Rift Impostor: crear salas",
      "expression": "(http.request.uri.path eq \"/api/sala\")",
      "action": "block",
      "ratelimit": {
        "characteristics": ["ip.src", "cf.colo.id"],
        "period": 10,
        "requests_per_period": 5,
        "mitigation_timeout": 10
      }
    }
  ]
}
```

Si la API rechaza algún campo por el plan, confirmar los valores permitidos con `mcp__cloudflare__docs` ("rate limiting rules availability") y ajustar.

- [ ] **Step 3: Verificar que aplica a un Worker con dominio custom (pendiente de la spec)**

```bash
for i in 1 2 3 4 5 6 7; do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://rift.wampaland.com.ar/api/sala; done
```

Expected: cinco `201` y después `429`. (Crea cinco salas vacías que se borran solas a las 6 h.) Si los siete dan `201`, la regla no está aplicando al Worker: revisar la expresión y avisar a Facu; el sitio funciona igual, solo sin el freno.

---

### Task 37: E2E contra el deploy real

- [ ] **Step 1: Modo local**

```bash
E2E_BASE=https://rift.wampaland.com.ar npm run test:e2e
```

Expected: `N checks OK, 0 fallaron`.

- [ ] **Step 2: Modo online**

```bash
E2E_BASE=https://rift.wampaland.com.ar npm run test:e2e:online
```

Expected: `N checks OK, 0 fallaron`. Si falla algo que en local pasaba, es justo lo que este paso existe para encontrar: depurar con @superpowers:systematic-debugging (y mirar los logs con `npx wrangler tail rift-impostor`).

---

### Task 38: Redirect de Vercel

Solo después de que la Task 37 dé verde.

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: `vercel.json`**

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "destination": "https://rift.wampaland.com.ar/:path*",
      "permanent": true
    }
  ]
}
```

(`permanent: true` = 308.)

- [ ] **Step 2: Commit y deploy final de Vercel**

```bash
git add vercel.json
git commit -m "chore: redirect vercel deployment to rift.wampaland.com.ar"
git push origin main
```

Si el proyecto de Vercel está conectado a git, el push lo despliega solo. Si no **[MANUAL]**: Facu corre `npx vercel deploy --prod` logueado con su cuenta personal (proyecto `rift-impostor`); el build corre en Vercel, no en esta máquina.

- [ ] **Step 3: Verificar**

```bash
curl -sI https://rift-impostor.vercel.app/es | rg -i "^(HTTP|location)"
```

Expected: `HTTP/2 308` y `location: https://rift.wampaland.com.ar/es`.

mora:8090 queda como está, sin salas (su `/play` muestra la UI, pero crear sala falla con el mensaje de error: es lo esperado).

---

### Task 39: Confirmar que Analytics recibe datos

- [ ] **Step 1:** Abrir `https://rift.wampaland.com.ar/` y `/play` desde un navegador real (no headless) un par de veces.

- [ ] **Step 2:** Después de unos minutos, ver visitas en el panel de Web Analytics del sitio, o consultarlas por la API de GraphQL de Analytics con el MCP (`mcp__cloudflare__docs` → "Web Analytics GraphQL"). **No** dar por bueno un `200` del beacon: es exactamente el "OK engañoso" que ya pasó con Vercel.

- [ ] **Step 3:** Contarle a Facu el estado final: dominio, salas, OG, rate limiting, redirect y analytics, con la evidencia de cada uno.
