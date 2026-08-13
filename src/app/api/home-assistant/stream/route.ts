export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { members, type MemberId } from "@/data/household";
import { subscribeLiveEntities } from "@/lib/home-assistant/connections";
import { scopeLiveEntities } from "@/lib/home-assistant/scope";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId") as MemberId | null;
  const member = members.find((item) => item.id === memberId);
  if (!member) {
    return new Response("Unknown member", { status: 400 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const closeOnce = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      };

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      request.signal.addEventListener("abort", closeOnce);

      try {
        const unsub = await subscribeLiveEntities(member.id, (entities) => {
          scopeLiveEntities(member, entities)
            .then((scoped) => send("entities", scoped))
            .catch((error) => console.error("Home Assistant stream scope error", error));
        });
        if (!unsub) {
          send("error", { message: "Not connected to Home Assistant" });
          closeOnce();
          return;
        }
        if (closed) {
          unsub();
          return;
        }
        unsubscribe = unsub;
      } catch (error) {
        console.error("Home Assistant stream subscribe error", error);
        send("error", { message: "Home Assistant stream unavailable" });
        closeOnce();
      }
    },
    cancel() {
      unsubscribe?.();
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
