# Project

Interactive building leakage diagnosis and repair simulator. Preserve the existing UI, Three.js scene and pointer workflow. Do not migrate to React or redesign unrelated UI.

# Core rule

This is a simulation, not an animation demo. Never generate random moisture readings. Measurement tools read SimulationState. Scenarios 01, 02A (bathroom membrane failure) and 02B (concealed hot-water pipe failure) are implemented cellular simulations; other scenarios are explicitly labeled legacy demonstrations until migrated.

# Architecture

- Simulation: actions + fixed deltaTime -> state. No DOM, Three.js or timers in simulation modules.
- Renderer: state -> screen. Canvas textures may be used on the existing 3D wall.
- Tools: pointer interaction -> validated simulation actions.
- TypeScript strict for new code. Keep main.ts small. src/legacy is a transitional compatibility boundary, not a place for new physics.
- No setTimeout-based physics. Keep moisture, pressure, damage and repair material in one authoritative SimulationState.
- Distinguish leakage sources from surface symptoms. Drying must take time; accumulated surface damage does not disappear just because water stops.
- Run lint, typecheck, tests and build after meaningful changes. Run browser tests for interaction changes.
- Preserve docs/original-prototype.html as the original user-provided reference.

- Scenario 02A shares water between a slab grid and an adjacent-wall grid. Keep observation coordinates distinct.
- Surface cleanup must not stop sources or erase stored moisture. Membrane repair needs floor use off; pipe bypass needs the supply valve closed and must isolate the old pipe. Verify after restoring the same supply conditions.

- Indoor floor has its own floor grid, finite floorTests and floorJunctions. Floor local depth is world z - 0.65; do not mix it with wall height or the upstairs slab.
- Keep floor telemetry separate from wall/ceiling repair baselines. Active floor water tests must finish before source-repair verification. Legacy wall demos do not supply the new floor network until explicitly migrated.
