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

export function LoginScreen({ onSignIn }: { onSignIn: (memberId: MemberId) => void }) {
  const [selectedMember, setSelectedMember] = useState<MemberId>("you");
  const [pin, setPin] = useState("");
  const [isEntering, setIsEntering] = useState(false);
  const [error, setError] = useState(false);
  const selected = members.find((member) => member.id === selectedMember) ?? members[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pin !== selected.pin) {
      setError(true);
      setPin("");
      return;
    }
    setError(false);
    setIsEntering(true);
    window.setTimeout(() => onSignIn(selectedMember), 450);
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
                onClick={() => { setSelectedMember(member.id); setPin(""); setError(false); }}
              >
                <span className={`loginAvatar ${member.avatarClass}`}>{member.initials}</span>
                <strong>{member.name}</strong>
                <span className="profileCheck">&#10003;</span>
              </button>
            ))}
          </div>

          <form className="loginForm" onSubmit={submit}>
            <label htmlFor="pin">Your PIN</label>
            <div className={error ? "pinField pinFieldError" : "pinField"}>
              <span><LockIcon /></span>
              <input
                id="pin"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(false); }}
                placeholder="4-digit PIN"
                aria-describedby="preview-note"
              />
            </div>
            <button className={isEntering ? "enterButton loading" : "enterButton"} type="submit" disabled={isEntering || pin.length < 4}>
              <span>{isEntering ? "Opening your home…" : `Enter as ${selected.name}`}</span><ArrowIcon />
            </button>
            <p id="preview-note" className={error ? "previewNote previewNoteError" : "previewNote"}>
              {error ? <><span>&#9679;</span> That PIN didn&rsquo;t match &mdash; try again</> : <>&nbsp;</>}
            </p>
          </form>

          <div className="loginDivider"><span>or</span></div>
          <button className="homeAssistantButton" type="button" disabled title="Available after Home Assistant is connected">
            <span className="haMark">HA</span><span>Continue with Home Assistant</span><small>COMING NEXT</small>
          </button>
        </div>
        <p className="loginLegal">By continuing, you&rsquo;re entering the Bhrug family home.</p>
      </section>
    </main>
  );
}
