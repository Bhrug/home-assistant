# Hearth implementation plan

**Status date:** 19 June 2026  
**Project location:** `C:\Users\bhrug\code\home-assistant`  
**Current phase:** Prototype vertical slice complete; awaiting Home Assistant installation

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
      |-- MockHomeAssistantAdapter (implemented)
      `-- WebSocketHomeAssistantAdapter (next)
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

- Typed `HomeAssistantAdapter` interface
- Working in-memory `MockHomeAssistantAdapter`
- Mock entities use Home Assistant-style entity, device and area identifiers
- Live subscription contract already used by the UI
- UI is isolated from the future WebSocket implementation

## Verification status

- `npm run lint` — passing
- `npm run build` — passing
- `http://localhost:3100` — serving successfully with HTTP 200
- Visual review — completed by Bhrug in the in-app browser
- Automated browser inspection — unavailable because the browser runtime is blocked by the Windows sandbox; this does not affect the application itself

## Current assumptions

- The final Home Assistant URL is not yet available.
- Home Assistant is not yet installed or configured for this project.
- Current devices and areas are simulated.
- Device names and room assignments will be confirmed after Home Assistant discovery.
- Hearth is a provisional product name and can be changed without affecting the architecture.

## Next milestone: real Home Assistant connection

This milestone begins when Bhrug provides the Home Assistant base URL. No password, access token or other credential should be placed in chat or committed to the repository.

### Work package

1. Install Home Assistant's supported JavaScript WebSocket client.
2. Add Home Assistant OAuth authorisation and token refresh.
3. Implement `WebSocketHomeAssistantAdapter` behind the existing interface.
4. Subscribe to live state, entity, device and area updates.
5. Add an environment-based switch between mock and connected modes.
6. Create an onboarding screen for mapping people to primary areas.
7. Map discovered devices to friendly Hearth capabilities.
8. Replace Yuvi's simulated Alexa, Sonos and thermostat entities with real registry IDs.
9. Validate child and adult permissions using separate Home Assistant users.
10. Retain mock mode for development, automated tests and demonstrations.

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

When Home Assistant is installed, resume with:

> Connect Hearth to the Home Assistant instance using OAuth and the WebSocket API, preserving mock mode and the existing `HomeAssistantAdapter` contract.

