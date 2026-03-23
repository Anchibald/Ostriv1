# Implementation Plan: Core RPG Session & Terminal Sync

## Phase 1: Project Scaffolding & Setup [checkpoint: cb30fd7]
- [x] **Task: Initialize Backend Structure** (354b8ef)
    - [x] Create basic Fastify server with Socket.io configuration.
    - [x] Define initial session management logic (room creation/joining).
- [x] **Task: Initialize Frontend Structure** (b471802)
    - [x] Create Vite + React (TypeScript) project.
    - [x] Configure Tailwind CSS and apply "Island Survival" theme colors.
- [x] **Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)** (cb30fd7)

## Phase 2: Core Real-time Functionality
- [x] **Task: Implement Real-time Sync** (db559ec)
    - [x] Setup Socket.io events for broadcasting messages and dice rolls.
    - [x] Develop basic terminal component for displaying game logs.
- [x] **Task: Implement Command System** (e5aacd5)
    - [x] Develop `/roll` command on frontend and backend (random number generation).
    - [x] Develop `/emote` command for character narrative actions.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)**

## Phase 3: Persistence & Polish
- [ ] **Task: Simple JSON Persistence**
    - [ ] Integrate `lowdb` for saving and loading session state.
    - [ ] Ensure players can reconnect and retrieve history.
- [ ] **Task: UI/UX Polishing**
    - [ ] Apply final "Island Survival" styles to terminal and character sheets.
    - [ ] Add mobile-friendly touch optimizations.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)**
