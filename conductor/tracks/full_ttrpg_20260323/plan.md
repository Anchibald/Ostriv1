# Implementation Plan: Island Survival TTRPG Full Features

## Phase 1: Session Management & Character Entry
- [x] **Task: Update Database Schema** (f03d7f2)
    - [x] Redesign `db.json` to store island names, session metadata, player stats, and inventory.
- [x] **Task: Implement GM Dashboard (Session Manager)** (bc7a0f9)
    - [x] Create atmospheric UI with random island name generator.
    - [x] List all sessions with "Manage as GM" and "Delete" functionality.
- [x] **Task: Character Creation & Join Logic** (d35611a)
    - [x] Implement player join form (Character Name + Starting Item).
    - [x] Add persistence for character identity (auto-reconnect player to character).
- [ ] **Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)**

## Phase 2: GM Real-time Control Panel
- [ ] **Task: GM Interface - Player Stats Management**
    - [ ] Build player cards with HP/Food/Water bars and controls.
    - [ ] Implement Shelter status toggles and Inventory viewing.
- [ ] **Task: Game Progression & Events**
    - [ ] Implement "Next Day" button with automatic resource consumption logic.
    - [ ] Create "Tide" event generator for random item drops.
- [ ] **Task: Global Game State Sync**
    - [ ] Sync day/night status and a global shared timer across all clients.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)**

## Phase 3: Player Experience & Inventory Systems
- [ ] **Task: Player Character View**
    - [ ] Create personal character sheet with animated D20 roll notifications.
- [ ] **Task: Multi-Inventory System (Personal & Camp)**
    - [ ] Implement personal inventory editing (+/- quantity, add new items).
    - [ ] Build shared Camp inventory view and interaction.
- [ ] **Task: Item & Resource Transfers**
    - [ ] Create modal system for transferring items/food/water between players or to the camp.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)**

## Phase 4: Final Atmosphere & Persistence Polish
- [ ] **Task: Visual & Thematic Polish**
    - [ ] Apply "Old Island Map" and "Island Survival" styles across all screens.
- [ ] **Task: Event Log Enhancement**
    - [ ] Improve real-time logging for game actions, findings, and status changes.
- [ ] **Task: Persistence & Reconnection Testing**
    - [ ] Ensure full session state recovery for GM and players after server restarts.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)**
