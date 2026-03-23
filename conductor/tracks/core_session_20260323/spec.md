# Specification: Core RPG Session & Terminal Sync

## Goal
Implement a functional MVP with session management (GM creating a session, players joining) and real-time synchronization of game events (dice rolls, messages) via a terminal-style interface.

## Scope
- **Backend:** Fastify server with Socket.io for real-time events.
- **Frontend:** React application with basic terminal UI (Xterm.js or custom CSS).
- **Session Management:** GM creates a room, players join using a room ID.
- **Terminal Interaction:** Basic commands (`/roll`, `/emote`, `/help`) and live log updates.
- **Persistence:** Simple JSON storage for session state.

## Tech Stack
- Node.js + Fastify + Socket.io
- React + Tailwind CSS
- lowdb (JSON storage)

## Success Criteria
- GM can create a session and get a unique ID.
- Multiple players can join the session using the ID.
- A dice roll command from one player is immediately visible to all other connected participants.
- The UI follows the "Island Survival" theme guidelines.
