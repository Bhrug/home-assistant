# Hearth

Hearth is a personal, room-first home dashboard for one household. It uses Home Assistant as the automation and device core while providing a calmer experience tailored to each family member.

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the current status, architectural decisions and phased roadmap.

The current vertical slice is intentionally backed by a mock Home Assistant adapter. It demonstrates:

- Profiles for You, Lops, Anni and Yuvi
- A personalised, room-first dashboard for Yuvi
- Interactive Alexa, Sonos and thermostat controls
- Personal routines
- Navigation to shared household rooms
- Responsive desktop and mobile layouts
- A typed adapter boundary for the future Home Assistant WebSocket connection

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Architecture

```text
Custom Next.js UI
      |
HomeAssistantAdapter
      |-- MockHomeAssistantAdapter (current)
      `-- WebSocketHomeAssistantAdapter (next)
      |
Home Assistant Core
```

Home Assistant will remain responsible for authentication, permissions, areas, devices, entities, state and service calls. Hearth will own household profiles, primary rooms, favourites, dashboard composition and presentation preferences.

## Next milestone

Replace the mock adapter with an authenticated Home Assistant WebSocket adapter while preserving the existing UI contract. Actions must execute using each member's Home Assistant identity rather than a shared administrator token.
