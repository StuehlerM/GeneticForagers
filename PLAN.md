# PLAN — Milestone A: Playable Core Loop

**STATUS: COMPLETE ✅** — all 9 steps done; 97 tests green, typecheck + Vite build clean.
Next: Milestone B (NEAT brains) — see PROJECT.md roadmap.

Scope: get a fun, testable, real-time forager loop on screen with a **fixed-topology**
neural-net brain and simple continuous reproduction. NEAT/rtNEAT come in later milestones
(see PROJECT.md). Rendering = Canvas 2D behind a `Renderer` interface.

## Definition of Done

- [x] `npm run dev` shows a 128×128 biome world with plants, water, and ~150 agents
  moving, eating, drinking, dying, and reproducing in real time.
- [x] Pause/resume + speed control work; a basic stats readout updates live.
- [x] Domain logic is pure and covered by Vitest; `npm run test` and typecheck are green.

## Steps

1. **Project scaffold**
   - Vite + TS (strict) + Vitest. Folder layout: `src/domain`, `src/app`, `src/render`, `src/main.ts`.
   - Scripts: dev, build, test, typecheck. One smoke test to prove the toolchain.

2. **Seeded RNG** (domain, TDD)
   - Deterministic PRNG with an injectable seed; `next()`, `range(min,max)`, `int(n)`, `pick(arr)`.

3. **World & biomes** (domain, TDD)
   - Seeded **Perlin noise** module (deterministic, smooth).
   - `BiomeType` (grassland/forest/jungle/desert/mountains/water) with config
     (regrow rate, max food, passability).
   - Tile grid (128×128) generated from **elevation + moisture** noise via a
     Whittaker-style lookup. Scalar `food` per land tile; regrowth tick.
   - Water tiles for hydration (impassable for now).

4. **Agent & needs** (domain, TDD)
   - Agent state: position, energy, hydration, health, age, cooldown.
   - Need drain per tick; eat replenishes energy, drink replenishes hydration;
     starvation/dehydration damage health; death at health 0 or max age.

5. **Body genome + fixed-topology brain** (domain, TDD)
   - Body traits: maxSpeed, sightRadius, metabolism, size (named constants for ranges).
   - **`Perception` interface** producing a fixed-length `number[]` input vector.
     Default impl = **nearest-k + own needs** (dir+distance to nearest food/water/agent,
     plus normalized energy/hydration/health/age). Rays or scent-field are later swaps.
   - Fixed-topology feed-forward net (weights = genome) consumes the perception vector
     → actions (move dir, eat, drink, seek-mate). `Brain` interface so B/C can swap it.

6. **Reproduction & evolution** (domain, TDD)
   - Mating criteria (adult, sated, off cooldown). Offspring = crossover of parents'
     weights + body traits, plus mutation. Continuous (happens live on mating).

7. **Simulation orchestration** (app, TDD)
   - `Simulation.tick()` advances world + all agents deterministically.
   - Fixed-timestep stepper; run state (paused, speed) as testable app state.

8. **Stats** (domain/app, TDD)
   - Time-series collector: population, births, deaths, avg energy/hydration, avg traits.

9. **Rendering & wiring** (render/app)
   - `Renderer` interface + `Canvas2DRenderer` (tiles, plants, water, agents).
   - `main.ts`: build world, mount canvas + controls (pause/speed/seed), start loop.
   - Minimal stats readout in the DOM (charts deferred to later milestone).

## Out of Scope (this milestone)

- NEAT / rtNEAT / speciation (Milestone B/C).
- Predators, extra biomes, movement cost, day/night (Milestone D).
- Fancy charts panel, agent inspector, save/load (later).

## Notes / Decisions

- Continuous reproduction from the start (matches PROJECT.md), but with a fixed-topology
  brain to keep Milestone A small; the `Brain` interface makes B a swap, not a rewrite.
- Perception is behind a `Perception` interface; Milestone A ships **nearest-k + own needs**.
  Alternatives (vision rays, scent/gradient field) can be swapped later without touching the brain.
