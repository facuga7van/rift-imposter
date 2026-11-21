// Stub de humo (Task 5): solo confirma que wrangler empaqueta game.ts con los
// imports `.ts`. La Task 14 lo reemplaza entero.
import { createRound } from "../src/lib/game.ts";

export { Room } from "./room.ts";

export default {
  async fetch(): Promise<Response> {
    return new Response(createRound([{ id: "a", name: "A" }], true).secret.id);
  },
} satisfies ExportedHandler<Env>;
