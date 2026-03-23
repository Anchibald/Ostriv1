# Specification: Island Survival TTRPG Implementation

## 1. Goal
Implement a complete real-time TTRPG web application for survival on a deserted island with dedicated GM and Player roles, integrated stat management, inventory systems, and atmospheric UI.

## 2. Roles & Access
- **Game Master (GM):** High-level control over the game world, player stats, and events.
- **Player:** Controls an individual character, manages personal inventory, and survives.
- **Language:** Ukrainian (primary interface language).

## 3. Core Components
### A. Session Manager (GM Main)
- Atmospheric background (old island map).
- "Create Session" button with random island name generator (e.g., "Острів Загублених Душ").
- List of active sessions with "Enter as GM" and "Delete" buttons.

### B. Join/Creation Page
- Form for player character creation: **Name** and **Starting Item**.
- "Start Survival" button to enter the session.
- Automatic redirect if character already exists in the session.

### C. GM Panel (Command Center)
- **Player Cards:** Real-time stats (HP progress bar, Food/Water counters) with +/- controls.
- **Character Info:** View shelter status and inventory for each player.
- **Camp Inventory:** Shared resource management (shared food/water/items).
- **Game Controls:** "Next Day" (triggers resource consumption), "Tide" (random item), "Invite Player" link, Timer controls, Day/Night toggle, "Finish Session".
- **Event Log:** History of all actions and automated game events.

### D. Player Interface
- **Character Card:** Dynamic stats (HP/Food/Water bars), shelter status.
- **Dice:** D20 roll button with global notifications.
- **Personal Inventory:** List of items with +/- quantity controls, "Add Item" form.
- **Transfer System:** Transfer items/resources to other players or the Camp.
- **Camp Inventory:** View and "Take" items/resources from shared storage.
- **Event Log & Timer:** Sync'd with GM controls.

## 4. Mechanics & Logic
- **Survival:** HP loss when food/water reaches 0 or shelter is missing during "Next Day".
- **Resource Consumption:** Triggered by GM's "Next Day" button.
- **Inventory Transfer:** Real-time updates for both sender and receiver.
- **Persistence:** LocalStorage for character identity and `lowdb` for full session state recovery.

## 5. Technical Stack
- **Backend:** Fastify + Socket.io + lowdb (Node.js).
- **Frontend:** React + Tailwind CSS + Vite (TypeScript).
