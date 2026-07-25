# HANDOVER

## Current state

**Milestone A (Playable Core Loop) is COMPLETE.** See `PROJECT.md` (full vision) and
`PLAN.md` (Milestone A steps, all done).

- 97 unit tests passing (Vitest), `tsc --noEmit` clean, `vite build` clean (~15 kB bundle).
- Smoke-tested full scale: 128×128 world, 150 agents, ~3.2 ms/tick.

## Architecture (as built)

- `src/domain/` — pure, DOM-free, fully unit-tested:
  - `rng.ts` seeded RNG · `noise.ts` seeded Perlin · `biome.ts` 6 biomes + Whittaker
    classifier · `world.ts` tile grid gen + food regrow/consume.
  - `agent.ts` needs/metabolism/eat/drink/death · `body.ts` trait genome ·
    `perception.ts` nearest-k input vector (interface point) · `brain.ts` hand-rolled
    fixed-topology feed-forward net (`Brain` interface) · `genome.ts` crossover+mutation.
  - `forager.ts` agent+genome+traits+brain bundle · `simulation.ts` deterministic
    tick loop (perceive→move/eat/drink→metabolize→mate→cull) · `stats.ts` time series.
- `src/app/` — `runState.ts` (pause/speed, tested) · `fixedStepper.ts` (fixed-timestep, tested).
- `src/render/` — `colors.ts` (tested) · `renderer.ts` interface · `canvasRenderer.ts` (Canvas2D).
- `src/main.ts` — wiring: world + canvas + controls (pause/speed/seed/regenerate) + stats readout.

## How to run

Environment: **WSL, but Node is the Windows install (`node.exe`)**. Direct `npm`/`node`
calls hit EISDIR on stdio. Run npm via cmd.exe with redirected stdio:

```
cmd.exe /c "npm run dev   < NUL 1> out.txt 2> err.txt"   # dev server
cmd.exe /c "npm test      < NUL 1> out.txt 2> err.txt"   # vitest
cmd.exe /c "npm run typecheck < NUL 1> out.txt 2> err.txt"
cmd.exe /c "npm run build < NUL 1> out.txt 2> err.txt"
```

`out.txt`/`err.txt` are gitignored scratch files. `/tmp` is invisible to Windows node —
keep scratch scripts inside the repo.

## Key design decisions

- No ML libs (no TensorFlow): nets are evolved, not trained, so we only need a forward
  pass — a few lines of TS. NEAT (next) also wants a hand-rolled graph evaluator.
- `Brain` and perception are interfaces so Milestones B/C swap the brain without touching
  the sim. `topology.inputs === PERCEPTION_SIZE` is asserted by a test.
- Continuous (real-time) reproduction from the start; health regenerates only when both
  energy and hydration are ≥80%.

## Next phase — Milestone B (NEAT brains)

Replace `FeedForwardBrain` with a NEAT genome → network expression:
- Node/connection genes with historical markings (innovation numbers).
- Structural + weight mutations; crossover aligning innovations.
- Express genome into a graph evaluator implementing the existing `Brain` interface.
- Keep everything deterministic + unit-tested; the sim loop should be untouched.
Then Milestone C = rtNEAT speciation; Milestone D = predators/charts/inspector/save-load.

## Git status

- Branch `master`, prior commit "Initial commit" by StuehlerM.
- **Uncommitted**: all new source/config, `PROJECT.md`, `PLAN.md`, `HANDOVER.md`.
  (`LICENSE` shows a line-ending-only diff — leave unstaged.)
- Local git identity is unset; reuse `StuehlerM <23291111+StuehlerM@users.noreply.github.com>`
  or the user's preferred identity before committing.
- Nothing committed yet this session — awaiting the user's go-ahead to commit.
