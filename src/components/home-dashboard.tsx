"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { areas, members, routines, type MemberId } from "@/data/household";
import { MockHomeAssistantAdapter } from "@/lib/home-assistant/mock";
import { LiveHomeAssistantAdapter } from "@/lib/home-assistant/live-adapter";
import type { HomeAssistantAdapter, HomeEntity } from "@/lib/home-assistant/types";

type IconName = "home" | "grid" | "sparkles" | "headphones" | "moon" | "settings" | "bed" | "sofa" | "utensils" | "speaker" | "thermometer" | "play" | "pause" | "minus" | "plus" | "chevron" | "bell" | "sun" | "lock" | "leaf" | "more" | "volume" | "shield" | "mic";

type VoiceAction =
  | { type: "control"; entityId: string; state: string; attributes?: HomeEntity["attributes"] }
  | { type: "routine"; routineId: string };

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m5.5 13 .8 2.7 2.7.8-2.7.8L5.5 20l-.8-2.7-2.7-.8 2.7-.8.8-2.7ZM18.5 13l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z"/></>,
  headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"/></>,
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  bed: <><path d="M3 18v-7h18v7M3 15h18M6 11V7h5a3 3 0 0 1 3 3v1M3 18v2M21 18v2"/></>,
  sofa: <><path d="M5 12V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M5 11H4a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2h-1v4H5v-4ZM5 18v2M19 18v2"/></>,
  utensils: <><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 2 4 5 4 8h-4"/></>,
  speaker: <><rect x="5" y="2.5" width="14" height="19" rx="4"/><circle cx="12" cy="14.5" r="4"/><circle cx="12" cy="7" r="1"/></>,
  thermometer: <><path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z"/><path d="M10 17V8"/></>,
  play: <path d="m9 7 8 5-8 5V7Z"/>, pause: <><path d="M9 7v10M15 7v10"/></>,
  minus: <path d="M5 12h14"/>, plus: <><path d="M5 12h14M12 5v14"/></>, chevron: <path d="m9 18 6-6-6-6"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  leaf: <><path d="M20 4C11 4 5 8 5 14a6 6 0 0 0 6 6c6 0 9-7 9-16Z"/><path d="M4 21c2-5 6-8 11-11"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></>,
  shield: <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z"/>,
  mic: <><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M6 11a6 6 0 0 0 12 0M12 19v3"/></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const mockAdapter = new MockHomeAssistantAdapter();

const DISPLAYABLE_DOMAINS = new Set(["media_player", "climate", "light", "switch", "lock", "cover"]);
const ICON_TINTS = ["lavender", "peach", "mint"] as const;

interface LiveArea {
  areaId: string;
  name: string;
}

function RoomPicker({
  memberId,
  liveAreas,
  onMapped,
}: {
  memberId: MemberId;
  liveAreas: LiveArea[];
  onMapped: (areaId: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  const choose = async (areaId: string) => {
    setSaving(areaId);
    try {
      const response = await fetch("/api/home-assistant/room-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, areaId }),
      });
      if (response.ok) onMapped(areaId);
    } finally {
      setSaving(null);
    }
  };

  if (liveAreas.length === 0) {
    return (
      <div className="emptyPersonalCard">
        <span className="deviceIcon lavender"><Icon name="home"/></span>
        <div><h3>No rooms found yet</h3><p>Add an area in Home Assistant, then come back to choose your room.</p></div>
      </div>
    );
  }

  return (
    <div className="areaList">
      {liveAreas.map((area) => (
        <button key={area.areaId} className="areaRow" onClick={() => choose(area.areaId)} disabled={saving !== null}>
          <span className="areaIcon"><Icon name="home"/></span>
          <span><strong>{area.name}</strong><small>{saving === area.areaId ? "Saving…" : "Choose this as your room"}</small></span>
        </button>
      ))}
    </div>
  );
}

function GenericDeviceGrid({
  entities: deviceEntities,
  onChange,
}: {
  entities: HomeEntity[];
  onChange: (entity: HomeEntity | undefined, state: string, attributes?: HomeEntity["attributes"]) => void;
}) {
  return (
    <div className="deviceGrid">
      {deviceEntities.map((entity, index) => {
        const tint = ICON_TINTS[index % ICON_TINTS.length];

        if (entity.domain === "media_player") {
          const isPlaying = entity.state === "playing";
          return (
            <article className="deviceCard" key={entity.entityId}>
              <div className="cardTop"><span className={`deviceIcon ${tint}`}><Icon name="speaker"/></span><span className={isPlaying ? "liveBadge" : "subtleBadge"}>{entity.state.toUpperCase()}</span></div>
              <div><h3>{entity.name}</h3><p>{String(entity.attributes.media_title ?? entity.state)}</p></div>
              <div className="cardControls">
                <button className="roundControl primary" aria-label={isPlaying ? "Pause" : "Play"} onClick={() => onChange(entity, isPlaying ? "paused" : "playing")}>
                  <Icon name={isPlaying ? "pause" : "play"}/>
                </button>
                <span className="controlLabel">Tap to {isPlaying ? "pause" : "play"}</span>
              </div>
            </article>
          );
        }

        if (entity.domain === "climate") {
          const target = Number(entity.attributes.temperature ?? 21);
          return (
            <article className="deviceCard" key={entity.entityId}>
              <div className="cardTop"><span className={`deviceIcon ${tint}`}><Icon name="thermometer"/></span><span className="subtleBadge"><span className="heatDot"/> {entity.state.toUpperCase()}</span></div>
              <div><h3>{entity.name}</h3><p>Room is {Number(entity.attributes.current_temperature ?? target)}°</p></div>
              <div className="temperatureControl">
                <button aria-label="Lower temperature" onClick={() => onChange(entity, entity.state, { temperature: target - 0.5 })}><Icon name="minus"/></button>
                <div><strong>{target}°</strong><span>SET TO</span></div>
                <button aria-label="Raise temperature" onClick={() => onChange(entity, entity.state, { temperature: target + 0.5 })}><Icon name="plus"/></button>
              </div>
            </article>
          );
        }

        const isOn = ["on", "unlocked", "open"].includes(entity.state);
        const nextState = entity.domain === "lock" ? (isOn ? "locked" : "unlocked") : entity.domain === "cover" ? (isOn ? "closed" : "open") : isOn ? "off" : "on";
        return (
          <article className="deviceCard" key={entity.entityId}>
            <div className="cardTop"><span className={`deviceIcon ${tint}`}><Icon name={entity.domain === "lock" ? "lock" : "sun"}/></span><span className={isOn ? "liveBadge" : "subtleBadge"}>{entity.state.toUpperCase()}</span></div>
            <div><h3>{entity.name}</h3><p>{entity.domain}</p></div>
            <div className="cardControls">
              <button className="roundControl primary" aria-label={`Toggle ${entity.name}`} onClick={() => onChange(entity, nextState)}>
                <Icon name={isOn ? "pause" : "play"}/>
              </button>
              <span className="controlLabel">Tap to {isOn ? "turn off" : "turn on"}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function HomeDashboard({ initialMemberId = "yuvi", onSignOut }: { initialMemberId?: MemberId; onSignOut?: () => void }) {
  const memberId = initialMemberId;
  const [entities, setEntities] = useState<HomeEntity[]>([]);
  const [activeNav, setActiveNav] = useState("home");
  const [toast, setToast] = useState("");
  const [routineRunning, setRoutineRunning] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const member = members.find((item) => item.id === memberId) ?? members[0];

  // null = still checking; false = confirmed not connected; true = live.
  const [liveConnected, setLiveConnected] = useState<boolean | null>(null);
  const [roomMappingInfo, setRoomMappingInfo] = useState<{ areas: LiveArea[]; mappedAreaId: string | null } | null>(null);

  // initialMemberId never changes for the lifetime of a mounted
  // HomeDashboard — switching people always signs out and remounts via
  // LoginScreen — so this effect only ever runs once per sign-in.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/home-assistant/status?memberId=${memberId}`)
      .then((res) => (res.ok ? res.json() : { connected: false }))
      .then((data) => { if (!cancelled) setLiveConnected(Boolean(data.connected)); })
      .catch(() => { if (!cancelled) setLiveConnected(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  useEffect(() => {
    if (!liveConnected) return;
    let cancelled = false;
    fetch(`/api/home-assistant/room-mapping?memberId=${memberId}`)
      .then((res) => (res.ok ? res.json() : { areas: [], mappedAreaId: null }))
      .then((data) => { if (!cancelled) setRoomMappingInfo({ areas: data.areas ?? [], mappedAreaId: data.mappedAreaId ?? null }); })
      .catch(() => { if (!cancelled) setRoomMappingInfo({ areas: [], mappedAreaId: null }); });
    return () => { cancelled = true; };
  }, [liveConnected, memberId]);

  const adapter: HomeAssistantAdapter = useMemo(
    () => (liveConnected ? new LiveHomeAssistantAdapter(memberId) : mockAdapter),
    [liveConnected, memberId]
  );

  useEffect(() => {
    if (liveConnected === null) return;
    return adapter.subscribe(setEntities);
  }, [adapter, liveConnected]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const myAreaId = liveConnected ? roomMappingInfo?.mappedAreaId ?? null : member.primaryArea;
  const roomEntities = useMemo(() => (myAreaId ? entities.filter((entity) => entity.areaId === myAreaId) : []), [entities, myAreaId]);
  const primaryArea = areas.find((area) => area.id === member.primaryArea);
  const myAreaName = liveConnected ? roomMappingInfo?.areas.find((area) => area.areaId === myAreaId)?.name : primaryArea?.name;
  const alexa = roomEntities.find((entity) => entity.entityId.includes("echo"));
  const sonos = roomEntities.find((entity) => entity.entityId.includes("sonos"));
  const heating = roomEntities.find((entity) => entity.domain === "climate");
  const hasYuviCards = member.id === "yuvi" && Boolean(alexa || sonos || heating);
  const needsRoomMapping = Boolean(liveConnected) && roomMappingInfo !== null && !roomMappingInfo.mappedAreaId;
  const displayableEntities = useMemo(
    () => roomEntities.filter((entity) => DISPLAYABLE_DOMAINS.has(entity.domain) && entity.canControl),
    [roomEntities]
  );

  const changeEntity = (entity: HomeEntity | undefined, state: string, attributes: HomeEntity["attributes"] = {}) => {
    if (!entity) return;
    void adapter.setState(entity.entityId, state, attributes);
  };

  const startHomeAssistantConnect = (id: MemberId) => {
    window.location.href = `/api/home-assistant/auth/start?memberId=${id}`;
  };

  // Switching to a different person always goes back through the login
  // screen's PIN check — there is no in-dashboard way to become someone
  // else without re-authenticating.
  const selectMember = (id: MemberId) => {
    if (id === memberId) return;
    onSignOut?.();
  };

  const runRoutine = (id: string, name: string) => {
    setRoutineRunning(id);
    setToast(`${name} is running`);
    window.setTimeout(() => setRoutineRunning(null), 1800);
    if (id === "bedtime") {
      changeEntity(sonos, "paused");
      changeEntity(heating, "heat", { temperature: 18 });
    }
  };

  const applyVoiceActions = (actions: VoiceAction[]) => {
    for (const action of actions) {
      if (action.type === "control") {
        void adapter.setState(action.entityId, action.state, action.attributes);
      } else {
        const routine = routines.find((item) => item.id === action.routineId);
        runRoutine(action.routineId, routine?.name ?? action.routineId);
      }
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    setToast(`Heard: "${transcript}"`);
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, memberId: member.id, entities }),
      });
      const data = await response.json();
      if (!response.ok) {
        setToast(data.error ?? "Hearth's voice assistant is unavailable right now.");
        return;
      }
      applyVoiceActions(data.actions ?? []);
      setToast(data.reply);
      if ("speechSynthesis" in window && data.reply) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.reply));
      }
    } catch {
      setToast("Couldn't reach Hearth's voice assistant.");
    }
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setToast("Voice control needs a browser like Chrome that supports speech recognition.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript;
      if (transcript) void handleVoiceTranscript(transcript);
    };
    recognition.onerror = () => setToast("Didn't catch that — try again.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setToast("Listening…");
  };

  return (
    <div className="appShell" style={{ "--member-accent": member.accent } as React.CSSProperties}>
      <aside className="sidebar">
        <div className="brand"><span className="brandMark"><Icon name="home" size={19}/></span><span>hearth</span></div>
        <nav className="mainNav" aria-label="Main navigation">
          {[
            ["home", "Home", "home"], ["rooms", "Rooms", "grid"], ["routines", "Routines", "sparkles"], ["settings", "Settings", "settings"],
          ].map(([id, label, icon]) => (
            <button key={id} className={activeNav === id ? "navItem active" : "navItem"} onClick={() => { setActiveNav(id); setToast(`${label} selected`); }}><Icon name={icon as IconName}/><span>{label}</span></button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <p className="sidebarLabel">YOUR FAMILY</p>
          <div className="familyStack">
            {members.map((person) => <button key={person.id} aria-label={`Switch to ${person.name}`} title={person.name} onClick={() => selectMember(person.id)} className={`miniAvatar ${person.avatarClass} ${person.id === memberId ? "selected" : ""}`}>{person.initials}</button>)}
          </div>
          <button className="profileButton" onClick={() => setToast("Profile settings coming next")}>
            <span className={`profileAvatar ${member.avatarClass}`}>{member.initials}</span><span><strong>{member.name}</strong><small>{member.role === "child" ? "Family member" : "Home admin"}</small></span><Icon name="more"/>
          </button>
          {onSignOut && <button className="signOutButton" onClick={onSignOut}>Sign out</button>}
        </div>
      </aside>

      <main className="mainContent">
        <header className="topbar">
          <div className="mobileBrand"><span className="brandMark"><Icon name="home" size={17}/></span><span>hearth</span></div>
          <div className="statusPill"><span className="statusDot"/> All good at home</div>
          <div className="topActions"><button className={`iconButton ${listening ? "listening" : ""}`} aria-label={listening ? "Stop listening" : "Talk to Hearth"} onClick={toggleListening}><Icon name="mic"/></button><button className="iconButton" aria-label="Notifications" onClick={() => setToast("No new notifications")}><Icon name="bell"/></button><button className={`headerAvatar ${member.avatarClass}`} onClick={() => onSignOut ? onSignOut() : setToast(`${member.name} is signed in`)} title={onSignOut ? "Sign out" : member.name}>{member.initials}</button></div>
        </header>

        <div className="contentWrap">
          <section className="welcomeRow">
            <div><p className="eyebrow">THURSDAY · 19 JUNE</p><h1>Hey {member.name} <span>👋</span></h1><p>{member.greeting}</p></div>
            <div className="weather"><span className="weatherIcon"><Icon name="sun" size={28}/></span><div><strong>19°</strong><small>Bright outside</small></div></div>
          </section>

          <section className="sectionBlock">
            <div className="sectionHeading"><div><p className="eyebrow">YOUR SPACE</p><h2>{hasYuviCards ? "Yuvi’s room" : (myAreaName ?? primaryArea?.name)}</h2></div><button className="textButton" onClick={() => setToast("Room detail view coming next")}>View room <Icon name="chevron" size={16}/></button></div>
            {hasYuviCards ? (
              <div className="deviceGrid">
                <article className="deviceCard alexaCard">
                  <div className="cardTop"><span className="deviceIcon lavender"><Icon name="speaker"/></span><span className={alexa?.state === "playing" ? "liveBadge" : "subtleBadge"}>{alexa?.state === "playing" ? "PLAYING" : "READY"}</span></div>
                  <div><h3>Alexa</h3><p>{alexa?.state === "playing" ? "Playing in your room" : "Ready when you are"}</p></div>
                  <div className="cardControls"><button className="roundControl primary" aria-label={alexa?.state === "playing" ? "Pause Alexa" : "Play Alexa"} onClick={() => changeEntity(alexa, alexa?.state === "playing" ? "paused" : "playing")}><Icon name={alexa?.state === "playing" ? "pause" : "play"}/></button><span className="controlLabel">Tap to {alexa?.state === "playing" ? "pause" : "play"}</span><button className="roundControl" aria-label="Alexa volume"><Icon name="volume"/></button></div>
                </article>

                <article className="deviceCard sonosCard">
                  <div className="cardTop"><span className="deviceIcon peach"><Icon name="speaker"/></span><button className="moreButton" aria-label="Sonos options" onClick={() => setToast("Sonos options coming next")}><Icon name="more"/></button></div>
                  <div><h3>Sonos</h3><p className="trackTitle">{String(sonos?.attributes.title ?? sonos?.attributes.media_title ?? "Nothing playing")}</p><p>{String(sonos?.attributes.artist ?? sonos?.attributes.media_artist ?? "Yuvi’s speaker")}</p></div>
                  <div className="volumeRow"><button aria-label="Lower volume" onClick={() => changeEntity(sonos, sonos?.state ?? "idle", { volume: Math.max(0, Number(sonos?.attributes.volume ?? 0) - 5) })}><Icon name="minus" size={17}/></button><div className="volumeTrack"><span style={{ width: `${Number(sonos?.attributes.volume ?? 0)}%` }}/></div><strong>{Number(sonos?.attributes.volume ?? 0)}%</strong><button aria-label="Raise volume" onClick={() => changeEntity(sonos, sonos?.state ?? "idle", { volume: Math.min(100, Number(sonos?.attributes.volume ?? 0) + 5) })}><Icon name="plus" size={17}/></button></div>
                </article>

                <article className="deviceCard heatingCard">
                  <div className="cardTop"><span className="deviceIcon mint"><Icon name="thermometer"/></span><span className="subtleBadge"><span className="heatDot"/> HEATING</span></div>
                  <div><h3>Heating</h3><p>Room is {Number(heating?.attributes.current_temperature ?? 20.5)}°</p></div>
                  <div className="temperatureControl"><button aria-label="Lower temperature" onClick={() => changeEntity(heating, "heat", { temperature: Math.max(16, Number(heating?.attributes.temperature ?? 21) - 0.5) })}><Icon name="minus"/></button><div><strong>{Number(heating?.attributes.temperature ?? 21)}°</strong><span>SET TO</span></div><button aria-label="Raise temperature" onClick={() => changeEntity(heating, "heat", { temperature: Math.min(24, Number(heating?.attributes.temperature ?? 21) + 0.5) })}><Icon name="plus"/></button></div>
                </article>
              </div>
            ) : needsRoomMapping ? (
              <RoomPicker
                memberId={member.id}
                liveAreas={roomMappingInfo?.areas ?? []}
                onMapped={(areaId) => setRoomMappingInfo((prev) => (prev ? { ...prev, mappedAreaId: areaId } : prev))}
              />
            ) : liveConnected && displayableEntities.length > 0 ? (
              <GenericDeviceGrid entities={displayableEntities} onChange={changeEntity} />
            ) : liveConnected ? (
              <div className="emptyPersonalCard">
                <span className="deviceIcon lavender"><Icon name="home"/></span>
                <div><h3>{myAreaName ?? "This room"} is ready</h3><p>No controllable devices found in this room yet — add some in Home Assistant.</p></div>
              </div>
            ) : (
              <div className="emptyPersonalCard">
                <span className="deviceIcon lavender"><Icon name="home"/></span>
                <div><h3>{primaryArea?.name} is ready</h3><p>This profile demonstrates household switching. We’ll map this person’s real devices next.</p></div>
                {liveConnected === false ? (
                  <button onClick={() => startHomeAssistantConnect(member.id)}>Connect Home Assistant</button>
                ) : (
                  <button onClick={() => selectMember("yuvi")}>Return to prototype</button>
                )}
              </div>
            )}
          </section>

          <section className="twoColumnSection">
            <div className="sectionBlock routinesBlock">
              <div className="sectionHeading"><div><p className="eyebrow">MAKE IT YOURS</p><h2>Your routines</h2></div><button className="textButton" onClick={() => setToast("Routine editor coming next")}>Customise <Icon name="chevron" size={16}/></button></div>
              <div className="routineList">
                {routines.map((routine) => <button key={routine.id} className={`routineRow ${routineRunning === routine.id ? "running" : ""}`} onClick={() => runRoutine(routine.id, routine.name)}><span className={`routineIcon ${routine.id}`}><Icon name={routine.icon}/></span><span><strong>{routine.name}</strong><small>{routine.detail}</small></span><span className="routinePlay"><Icon name={routineRunning === routine.id ? "sparkles" : "play"} size={17}/></span></button>)}
              </div>
            </div>

            <div className="sectionBlock homeBlock">
              <div className="sectionHeading"><div><p className="eyebrow">AROUND THE HOUSE</p><h2>Other rooms</h2></div><button className="textButton" onClick={() => { setActiveNav("rooms"); setToast("All rooms selected"); }}>All rooms <Icon name="chevron" size={16}/></button></div>
              <div className="areaList">
                {areas.filter((area) => area.id !== "yuvi-bedroom").slice(0, 3).map((area) => <button className="areaRow" key={area.id} onClick={() => setToast(`${area.name}: ${area.activeDevices} devices active`)}><span className="areaIcon"><Icon name={area.icon}/></span><span><strong>{area.name}</strong><small>{area.activeDevices} devices active</small></span><span className="areaTemp">{area.temperature}°</span><Icon name="chevron" size={17}/></button>)}
              </div>
            </div>
          </section>

          <footer className="homeFooter">
            {liveConnected ? (
              <span><Icon name="shield" size={16}/> Connected securely to Home Assistant</span>
            ) : (
              <button className="textButton" onClick={() => startHomeAssistantConnect(member.id)}><Icon name="shield" size={16}/> Connect to Home Assistant</button>
            )}
            <span><Icon name="leaf" size={16}/> Home energy is looking good</span>
          </footer>
        </div>
      </main>

      <nav className="mobileNav" aria-label="Mobile navigation">{[["home", "Home", "home"], ["rooms", "Rooms", "grid"], ["routines", "Routines", "sparkles"], ["settings", "Settings", "settings"]].map(([id, label, icon]) => <button key={id} className={activeNav === id ? "active" : ""} onClick={() => setActiveNav(id)}><Icon name={icon as IconName}/><span>{label}</span></button>)}</nav>
      {toast && <div className="toast" role="status"><span className="statusDot"/>{toast}</div>}
    </div>
  );
}
