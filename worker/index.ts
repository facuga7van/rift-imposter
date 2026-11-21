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
