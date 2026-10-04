"use client";

import { FormEvent, useState } from "react";
import { members, type MemberId } from "@/data/household";

function HouseMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 14.5 16 5l11 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13.5V26h16V13.5M12.5 26v-8h7v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4);
const adults = members.filter((member) => member.role !== "child");

function PinInput({ id, value, onChange, placeholder, autoComplete, hasError }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  hasError?: boolean;
}) {
  return (
    <div className={hasError ? "pinField pinFieldError" : "pinField"}>
      <span><LockIcon /></span>
      <input id={id} inputMode="numeric" type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(digitsOnly(event.target.value))} placeholder={placeholder} />
    </div>
  );
}

// An adult (or the owner) approves the reset with their own PIN, then sets a
// new PIN for whoever forgot theirs. Verified server-side in
// src/app/api/auth/reset-pin/route.ts.
function ResetPinForm({ initialTarget, onDone, onCancel }: {
  initialTarget: MemberId;
  onDone: (targetId: MemberId) => void;
  onCancel: () => void;
}) {
  const [targetId, setTargetId] = useState<MemberId>(initialTarget);
  const [authorizerId, setAuthorizerId] = useState<MemberId | null>(null);
  const [authorizerPin, setAuthorizerPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const target = members.find((member) => member.id === targetId) ?? members[0];
  const authorizerOptions = adults.filter((member) => member.id !== targetId);
  const authorizer = authorizerOptions.find((member) => member.id === authorizerId) ?? authorizerOptions[0];
  const mismatch = confirmPin.length === 4 && confirmPin !== newPin;
  const canSubmit = authorizerPin.length === 4 && newPin.length === 4 && confirmPin === newPin && !saving;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizerId: authorizer.id, authorizerPin, targetId, newPin }),
      });
      if (response.ok) {
        onDone(targetId);
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Couldn’t reset the PIN — try again");
      setAuthorizerPin("");
    } catch {
      setError("Couldn’t reach Hearth — try again");
    } finally {
      setSaving(false);
    }
  };

  const choose = (list: typeof members, selectedId: MemberId, label: string, onSelect: (id: MemberId) => void) => (
    <div className="profileChoices" role="radiogroup" aria-label={label}>
      {list.map((member) => (
        <button
          type="button"
          role="radio"
          aria-checked={selectedId === member.id}
          key={member.id}
          className={selectedId === member.id ? "loginProfile selected" : "loginProfile"}
          onClick={() => { onSelect(member.id); setError(""); }}
        >
          <span className={`loginAvatar ${member.avatarClass}`}>{member.initials}</span>
          <strong>{member.name}</strong>
          <span className="profileCheck">&#10003;</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="loginHeading">
        <p className="loginKicker">RESET A PIN</p>
        <h2>Forgot a PIN?</h2>
        <p>An adult approves it with their own PIN, then picks a new one.</p>
      </div>

      <form className="loginForm" onSubmit={submit}>
        <p className="resetLabel">Who forgot their PIN?</p>
        {choose(members, targetId, "Who forgot their PIN", setTargetId)}

        <p className="resetLabel">Approved by</p>
        {choose(authorizerOptions, authorizer.id, "Approved by", setAuthorizerId)}

        <label htmlFor="authorizer-pin">{authorizer.name}&rsquo;s PIN</label>
        <PinInput id="authorizer-pin" value={authorizerPin} onChange={(value) => { setAuthorizerPin(value); setError(""); }} placeholder="Your 4-digit PIN" autoComplete="off" hasError={Boolean(error)} />

        <label className="resetSpaced" htmlFor="new-pin">New PIN for {target.name}</label>
        <PinInput id="new-pin" value={newPin} onChange={setNewPin} placeholder="New 4-digit PIN" autoComplete="new-password" />

        <label className="resetSpaced" htmlFor="confirm-pin">Confirm new PIN</label>
        <PinInput id="confirm-pin" value={confirmPin} onChange={setConfirmPin} placeholder="Repeat the new PIN" autoComplete="new-password" hasError={mismatch} />

        <button className={saving ? "enterButton loading" : "enterButton"} type="submit" disabled={!canSubmit}>
          <span>{saving ? "Saving…" : `Set new PIN for ${target.name}`}</span><ArrowIcon />
        </button>
        <p className={error || mismatch ? "previewNote previewNoteError" : "previewNote"} role="status">
          {error ? <><span>&#9679;</span> {error}</> : mismatch ? <><span>&#9679;</span> The two new PINs don&rsquo;t match</> : <>&nbsp;</>}
        </p>
        <button type="button" className="forgotPinLink" onClick={onCancel}>Back to sign in</button>
      </form>
    </>
  );
}

export function LoginScreen({ onSignIn }: { onSignIn: (memberId: MemberId) => void }) {
  const [selectedMember, setSelectedMember] = useState<MemberId>("you");
  const [pin, setPin] = useState("");
  const [isEntering, setIsEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [resetting, setResetting] = useState(false);
  const selected = members.find((member) => member.id === selectedMember) ?? members[0];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsEntering(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMember, pin }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error ?? "That PIN didn’t match");
        setPin("");
        setIsEntering(false);
        return;
      }
      setErrorMessage("");
      window.setTimeout(() => onSignIn(selectedMember), 450);
    } catch {
      setErrorMessage("Couldn’t reach Hearth — try again");
      setIsEntering(false);
    }
  };

  const finishReset = (targetId: MemberId) => {
    setSelectedMember(targetId);
    setPin("");
    setErrorMessage("");
    setNotice(`PIN updated for ${members.find((member) => member.id === targetId)?.name ?? "that person"} — sign in with the new PIN.`);
    setResetting(false);
  };

  return (
    <main className="loginPage" style={{ "--login-accent": selected.accent } as React.CSSProperties}>
      <section className="loginStory" aria-label="Welcome to Hearth">
        <div className="storyGlow storyGlowOne" />
        <div className="storyGlow storyGlowTwo" />
        <div className="loginBrand light"><span><HouseMark /></span><strong>hearth</strong></div>
        <div className="storyContent">
          <p className="storyEyebrow">YOUR HOME, TOGETHER</p>
          <h1>Everything you love,<br/><em>right where you are.</em></h1>
          <p>One calm place for the people, rooms and little routines that make home feel like home.</p>
        </div>
        <div className="homeMoodCard">
          <div className="moodOrb"><span>19°</span><small>HOME</small></div>
          <div><span className="moodStatus"><i/> Everything&rsquo;s settled</span><strong>Good evening</strong><small>4 people home &middot; 12 devices on</small></div>
        </div>
        <p className="storyFooter">Private by design &middot; Powered by Home Assistant</p>
      </section>

      <section className="loginPanel">
        <div className="loginBrand dark"><span><HouseMark /></span><strong>hearth</strong></div>
        <div className="loginCard">
          {resetting ? (
            <ResetPinForm initialTarget={selectedMember} onDone={finishReset} onCancel={() => setResetting(false)} />
          ) : (
            <>
              <div className="loginHeading">
                <p className="loginKicker">WELCOME HOME</p>
                <h2>Who&rsquo;s here?</h2>
                <p>Choose your profile to open your personal home.</p>
              </div>

              <div className="profileChoices" role="radiogroup" aria-label="Choose your profile">
                {members.map((member) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedMember === member.id}
                    key={member.id}
                    className={selectedMember === member.id ? "loginProfile selected" : "loginProfile"}
                    onClick={() => { setSelectedMember(member.id); setPin(""); setErrorMessage(""); setNotice(""); }}
                  >
                    <span className={`loginAvatar ${member.avatarClass}`}>{member.initials}</span>
                    <strong>{member.name}</strong>
                    <span className="profileCheck">&#10003;</span>
                  </button>
                ))}
              </div>

              <form className="loginForm" onSubmit={submit}>
                <label htmlFor="pin">Your PIN</label>
                <div className={errorMessage ? "pinField pinFieldError" : "pinField"}>
                  <span><LockIcon /></span>
                  <input
                    id="pin"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={pin}
                    onChange={(event) => { setPin(digitsOnly(event.target.value)); setErrorMessage(""); setNotice(""); }}
                    placeholder="4-digit PIN"
                    aria-describedby="preview-note"
                  />
                </div>
                <button className={isEntering ? "enterButton loading" : "enterButton"} type="submit" disabled={isEntering || pin.length < 4}>
                  <span>{isEntering ? "Opening your home…" : `Enter as ${selected.name}`}</span><ArrowIcon />
                </button>
                <p id="preview-note" className={errorMessage ? "previewNote previewNoteError" : notice ? "previewNote previewNoteSuccess" : "previewNote"} role="status">
                  {errorMessage ? <><span>&#9679;</span> {errorMessage}</> : notice ? <><span>&#9679;</span> {notice}</> : <>&nbsp;</>}
                </p>
                <button type="button" className="forgotPinLink" onClick={() => { setResetting(true); setErrorMessage(""); setNotice(""); }}>Forgot PIN?</button>
              </form>

              <div className="loginDivider"><span>or</span></div>
              <button className="homeAssistantButton" type="button" disabled title="Available after Home Assistant is connected">
                <span className="haMark">HA</span><span>Continue with Home Assistant</span><small>COMING NEXT</small>
              </button>
            </>
          )}
        </div>
        <p className="loginLegal">By continuing, you&rsquo;re entering the Bhrug family home.</p>
      </section>
    </main>
  );
}
