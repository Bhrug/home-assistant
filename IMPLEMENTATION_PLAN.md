# Hearth implementation plan

**Status date:** 13 August 2026  
**Project location:** `C:\Users\bhrug\code\home-assistant`  
**Current phase:** Live Home Assistant connection working for one household member (Bhrug); remaining members still need to connect their own Home Assistant accounts

## Product vision

Hearth is the digital heart of the household: a personal, calm and customisable web experience powered by Home Assistant Core.

Each household member receives an experience shaped around their rooms, devices, routines and permissions. Personalisation controls what appears first; Home Assistant permissions remain the final authority over what each person may view or control.

Initial household profiles:

- Bhrug — owner and home administrator
- Lops — adult and home administrator
- Anni — family member
- Yuvi — family member, with Yuvi's room as his primary space

## Architecture decision

Home Assistant will remain a separately deployed automation core. Hearth will use its supported authentication and API boundaries rather than fork Home Assistant Core or its frontend.

```text
Hearth Next.js UI
      |
Household profiles and presentation preferences
      |
HomeAssistantAdapter
      |-- MockHomeAssistantAdapter (implemented, default until a member connects)
      `-- LiveHomeAssistantAdapter (implemented, per-member OAuth + WebSocket)
      |
Home Assistant Core
      |
Integrations, devices, entities and automations
```

### Home Assistant owns

- User authentication and tokens
- Authorisation and entity permissions
- Areas, floors, devices and entities
- Live device state and event subscriptions
- Service calls, scenes, scripts and automations
- Integration with physical devices and external services

### Hearth owns

- Household member profiles
- Primary room and room ownership
- Favourites and room-first ordering
- Dashboard composition and presentation
- Personal routines and friendly language
- Per-member themes and accessibility preferences
- Adult administration experience

Actions must ultimately execute using the signed-in member's Home Assistant identity. Hearth must not control the home through one shared administrator token.

## Current implementation

The first interactive vertical slice is complete.

### Application foundation

- Next.js 16, React 19 and TypeScript
- Responsive desktop and mobile layout
- Local development server configured permanently for port `3100`
- Production build and ESLint verification passing
- Project documentation in `README.md`

### Household experience

- Profiles for Bhrug, Lops, Anni and Yuvi
- Family profile switching with profile-specific colour accents and greetings
- Yuvi's room shown first when Yuvi is active
- Placeholder primary-room experiences for the other profiles
- Shared navigation for Home, Rooms, Routines and Settings
- Responsive mobile bottom navigation

### Yuvi vertical slice

- Alexa card with play and pause behaviour
- Sonos card with track information and volume controls
- Thermostat card with target-temperature controls and safety limits
- Personal Focus, Relax and Bedtime routines
- Bedtime routine updates Sonos and thermostat mock state
- Other-room navigation for shared household areas
- Status feedback through non-blocking notifications

### Integration boundary

- Typed `HomeAssistantAdapter` interface, unchanged by the live work below
- Working in-memory `MockHomeAssistantAdapter` — still the default for any member who hasn't connected
- `LiveHomeAssistantAdapter` (`src/lib/home-assistant/live-adapter.ts`) — fetch + Server-Sent Events against Hearth's own API, satisfying the same interface
- Per-member automatic selection: `home-dashboard.tsx` checks `/api/home-assistant/status` on sign-in and picks mock or live accordingly — no global switch, each person can be connected independently

### Live Home Assistant connection (new)

Each household member authenticates to Home Assistant with **their own HA user account** via OAuth (same-origin client id, no app registration needed) — Hearth never sees their HA password, they enter it on Home Assistant's own login page. Tokens are stored server-side per member in gitignored `.data/home-assistant-state.json` and refreshed automatically.

- `src/lib/home-assistant/oauth.ts` / `pending-auth.ts` / `store.ts` — the OAuth authorize/callback flow and token persistence
- `src/lib/home-assistant/connections.ts` — one live `home-assistant-js-websocket` connection per member (cached across Fast Refresh), entity/device/area registry resolution, and domain-specific service-call translation (media_player, climate, light, switch, lock, cover)
- `src/lib/home-assistant/scope.ts` + `allowedLiveAreaIdsFor` (`src/data/household.ts`) — server-side scoping before any live data reaches the browser. **Adults/owner are unfiltered** — each person's own Home Assistant permissions (set up by Bhrug per-user in HA) are the real boundary now, not this allow-list. **Children** are scoped to their mapped room plus any live area nobody else has claimed as their primary room.
- Routes under `src/app/api/home-assistant/`: `auth/start`, `auth/callback`, `status`, `entities`, `service-call`, `stream` (SSE), `room-mapping`
- Room mapping: since a member's static `primaryArea` id (e.g. `"yuvi-bedroom"`) never matches a real HA area id, first-time-connected members pick their real room from a live area list (`RoomPicker` in `home-dashboard.tsx`); the choice is persisted per member
- Generic device grid: any connected member now sees real, controllable devices in their mapped room (not just Yuvi) — `GenericDeviceGrid` in `home-dashboard.tsx`, rendered for `media_player`/`climate`/`light`/`switch`/`lock`/`cover` domains
- **Verified live against Bhrug's real instance**: OAuth round-trip, 93 real entities returned (including the always-present `sun.sun`/`person.*`/`zone.home`), room mapping saved and reflected in the UI, a real Sonos `switch` service call executed successfully, SSE push confirmed, and tokens survive a dev-server restart with no re-auth

## Verification status

- `npm run lint` — passing
- `npm run build` — passing
- `http://localhost:3100` — serving successfully with HTTP 200
- Live Home Assistant connection — verified end-to-end for Bhrug's account against the real instance (see above)
- Automated browser inspection — the in-app Browser pane cannot reach the Home Assistant instance directly (it blocks navigation to local-network/mDNS hosts as a safety measure), so the OAuth login step itself was completed manually by Bhrug; everything else was verified via the Browser pane and direct API calls

## Current assumptions

- Home Assistant is installed and reachable at `192.168.106.128:80` (`HOME_ASSISTANT_URL` in `.env.local`) — the `.local` mDNS hostname resolves fine in browsers but not from Node's server-side `fetch`, so the IP is used instead.
- Only Bhrug has connected his Home Assistant account so far. Lops, Anni and Yuvi each have their own HA user (per Bhrug) but haven't gone through the connect flow yet.
- Areas and devices in Home Assistant are real, but sparsely populated — most entities currently have no assigned area (`areaId: "unassigned"`), and several media_player/switch entities report `unavailable` (device online status, not a Hearth issue).
- Hearth is a provisional product name and can be changed without affecting the architecture.

## Next milestone: connect the rest of the household

1. Have Lops, Anni and Yuvi each sign in to Hearth and complete their own "Connect Home Assistant" OAuth flow.
2. For each, pick their room via the `RoomPicker` and confirm `allowedLiveAreaIdsFor` scopes children correctly once more than one person has a room mapped.
3. Once Yuvi is connected, decide whether to keep his bespoke Alexa/Sonos/thermostat cards (they only render when his real entity ids happen to match the `echo`/`sonos` naming heuristic) or retire them in favour of the generic device grid.
4. Confirm HA's own per-user permissions actually restrict what a non-admin user's WebSocket connection can see/control (this was flagged as an open question during design — worth confirming empirically now that non-admin accounts exist).
5. Address the pre-existing `npm audit` findings in transitive deps (Next.js, postcss, sharp) — unrelated to this work, not yet triaged.

### Acceptance test

Yuvi signs in with his own identity, immediately sees his room, observes live state for his available media and climate devices, controls authorised devices, navigates to a permitted shared room and cannot access an adult-only entity. His dashboard preferences persist after signing out.

## Later phases

### Family personalisation

- Real primary-room dashboards for Bhrug, Lops and Anni
- Persistent favourites and card ordering
- Household defaults with per-member overrides
- Shared-tablet profile switching
- Adult management of child permissions
- Themes, accessibility and localisation preferences

### Routines and household context

- Friendly presentation of Home Assistant scenes and scripts
- Time- and presence-aware suggestions
- Household notifications and summaries
- Energy, climate and security views
- Action history attributed to household members

### Production readiness

- PostgreSQL-backed household profile storage
- Automated unit and integration tests
- Offline and reconnect behaviour
- Secure deployment and secrets management
- Backup, migration and recovery documentation
- Monitoring and structured error handling

## Resume point

The Home Assistant OAuth + WebSocket connection is implemented and verified for one member. Resume with:

> Have Lops, Anni and Yuvi each connect their own Home Assistant account through Hearth's existing "Connect Home Assistant" flow, then confirm the child-scoping logic in `allowedLiveAreaIdsFor` behaves correctly once more than one room mapping exists.

