export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { allowedAreaIdsFor, members, routines, type MemberId } from "@/data/household";
import type { HomeEntity } from "@/lib/home-assistant/types";

const client = new Anthropic();

type VoiceAction =
  | { type: "control"; entityId: string; state: string; attributes?: HomeEntity["attributes"] }
  | { type: "routine"; routineId: string };

interface VoiceRequestBody {
  transcript: string;
  memberId: MemberId;
  entities: HomeEntity[];
}

export async function POST(request: Request) {
  let body: VoiceRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { transcript, memberId, entities } = body;
  const member = members.find((item) => item.id === memberId);
  if (!transcript || !member) {
    return NextResponse.json({ error: "Missing transcript or unknown member" }, { status: 400 });
  }

  // Server-side permission scoping: the model only ever sees entities this
  // person is allowed to reach. It cannot ask, argue, or prompt its way
  // around this — the boundary is enforced here, not by instruction.
  const allowedAreas = new Set(allowedAreaIdsFor(member));
  const scopedEntities = entities.filter((entity) => allowedAreas.has(entity.areaId));
  const actions: VoiceAction[] = [];

  const listEntities = betaZodTool({
    name: "list_entities",
    description: "List the smart home entities this person is allowed to see and control, optionally filtered by area id.",
    inputSchema: z.object({ areaId: z.string().optional() }),
    run: async ({ areaId }) => {
      const filtered = areaId ? scopedEntities.filter((entity) => entity.areaId === areaId) : scopedEntities;
      return JSON.stringify(
        filtered.map((entity) => ({
          entityId: entity.entityId,
          name: entity.name,
          domain: entity.domain,
          state: entity.state,
          attributes: entity.attributes,
          canControl: entity.canControl,
        }))
      );
    },
  });

  const controlEntity = betaZodTool({
    name: "control_entity",
    description: "Change the state of one smart home entity, e.g. play or pause media, set volume, or set a thermostat temperature. Only entities returned by list_entities may be used.",
    inputSchema: z.object({
      entityId: z.string().describe("The entityId exactly as returned by list_entities"),
      state: z.string().describe("The new state, e.g. 'playing', 'paused', 'heat'"),
      attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    }),
    run: async ({ entityId, state, attributes }) => {
      const entity = scopedEntities.find((item) => item.entityId === entityId);
      if (!entity) return `Denied: ${entityId} is not available to this person.`;
      if (!entity.canControl) return `Denied: ${entity.name} cannot be controlled.`;
      actions.push({ type: "control", entityId, state, attributes });
      return `Done: set ${entity.name} to ${state}.`;
    },
  });

  const runRoutine = betaZodTool({
    name: "run_routine",
    description: "Run one of this person's saved routines.",
    inputSchema: z.object({ routineId: z.enum(["focus", "relax", "bedtime"]) }),
    run: async ({ routineId }) => {
      actions.push({ type: "routine", routineId });
      const routine = routines.find((item) => item.id === routineId);
      return `Started the ${routine?.name ?? routineId} routine.`;
    },
  });

  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: `You are Hearth, a calm voice assistant controlling smart home devices for ${member.name}. Only check or change devices reachable through your tools — never claim to control anything else. Keep spoken replies short and natural, one or two sentences, suitable for text-to-speech.`,
      tools: [listEntities, controlEntity, runRoutine],
      messages: [{ role: "user", content: transcript }],
    });

    const reply = finalMessage.content.find((block) => block.type === "text")?.text ?? "Sorry, I didn't catch that.";
    return NextResponse.json({ reply, actions });
  } catch (error) {
    console.error("Voice assistant error", error);
    return NextResponse.json({ error: "Hearth's voice assistant is unavailable right now." }, { status: 500 });
  }
}
