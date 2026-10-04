export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { isValidPinFormat, verifyMemberPin } from "@/lib/auth/pins";

interface LoginBody {
  memberId: MemberId;
  pin: string;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const member = members.find((item) => item.id === body.memberId);
  if (!member || !isValidPinFormat(body.pin)) {
    return NextResponse.json({ error: "Missing member or 4-digit PIN" }, { status: 400 });
  }

  const result = await verifyMemberPin(member.id, body.pin);
  if (result.ok) return NextResponse.json({ ok: true });

  if (result.reason === "locked") {
    return NextResponse.json(
      { error: `Too many attempts — try again in ${result.retryAfterSeconds}s`, retryAfterSeconds: result.retryAfterSeconds },
      { status: 429 }
    );
  }
  return NextResponse.json({ error: "That PIN didn’t match" }, { status: 401 });
}
