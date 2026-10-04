export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { isValidPinFormat, setMemberPin, verifyMemberPin } from "@/lib/auth/pins";

interface ResetPinBody {
  authorizerId: MemberId;
  authorizerPin: string;
  targetId: MemberId;
  newPin: string;
}

// An adult or the owner approves the reset by entering their own PIN; the
// check shares the login attempt throttle, so this route can't be used to
// guess an adult's PIN any faster than the login route can.
export async function POST(request: Request) {
  let body: ResetPinBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const authorizer = members.find((item) => item.id === body.authorizerId);
  const target = members.find((item) => item.id === body.targetId);
  if (!authorizer || !target || !isValidPinFormat(body.authorizerPin)) {
    return NextResponse.json({ error: "Missing or unknown person" }, { status: 400 });
  }
  if (!isValidPinFormat(body.newPin)) {
    return NextResponse.json({ error: "The new PIN must be exactly 4 digits" }, { status: 400 });
  }
  if (authorizer.role === "child") {
    return NextResponse.json({ error: "Only an adult can reset a PIN" }, { status: 403 });
  }

  const result = await verifyMemberPin(authorizer.id, body.authorizerPin);
  if (!result.ok) {
    if (result.reason === "locked") {
      return NextResponse.json(
        { error: `Too many attempts — try again in ${result.retryAfterSeconds}s`, retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: `${authorizer.name}’s PIN didn’t match` }, { status: 401 });
  }

  await setMemberPin(target.id, body.newPin);
  return NextResponse.json({ ok: true });
}
