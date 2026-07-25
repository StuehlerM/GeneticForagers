# GeneticForagers — Project Vision

A browser-based forager simulation: little agents walk a biome world, manage needs
(eat, drink), mate and reproduce, and evolve their behaviour over time via
neuro-evolution. This document is the **living source of truth** for the whole
project. `PLAN.md` tracks only the increment we are actively building.

## Goals

- A fun, watchable, real-time evolving ecosystem in the browser.
- Emergent foraging behaviour that improves across generations without hand-coding it.
- Clean, testable domain logic; rendering and browser concerns kept at the edges.

## Non-Goals (for now)

- In-lifetime reinforcement learning (kept possible via the `Brain` interface, not built).
- Multiplayer / networking / server.
- 3D. This is a 2D top-down grid world.

## Tech Stack

- **Language:** TypeScript (strict).
- **Build/dev:** Vite.
- **Rendering:** HTML Canvas 2D, hidden behind a `Renderer` interface so a WebGL
  backend can be added later if we scale to thousands of agents. No GPU work up front.
- **Tests:** Vitest. Domain logic is pure and unit-tested; DOM lives only in the render/app layer.
- **No heavy runtime dependencies** (charts hand-rolled on canvas).

## Architecture (layers)

```
domain/      pure simulation: world, tiles, agents, needs, genome, brain, evolution, stats
app/         orchestration: sim loop, fixed-timestep stepper, input/UI state, config
render/      Renderer interface + Canvas2D implementation, charts
main.ts      wiring: build world, start loop, mount canvas + UI
```

- **Determinism:** the sim uses an injectable seeded RNG so runs are reproducible and testable.
- **Sim/Render split:** fixed simulation timestep (tick-based), decoupled from the
  variable render framerate.
- **Brain is an interface:** `Brain { decide(inputs): outputs }`. Implementations evolve
  from fixed-topology → NEAT → rtNEAT without touching the rest of the sim.

## World Model

- **Grid:** discrete tiles. Start **128×128**.
- **Biomes / tile types:** grassland, forest, jungle, desert, mountains, water
  (extensible). Each biome defines food-regrowth rate, passability, and (later)
  movement cost. Rough food levels: jungle (high) > grassland/forest (medium) >
  desert/mountains (very low) > water (none). Water is a hydration source and
  impassable for now.
- **Generation:** deterministic Perlin noise. Two fields (elevation + moisture)
  drive a Whittaker-style biome lookup: low elevation = water, high = mountains;
  moisture separates desert/grassland/forest/jungle in between.
- **Resources:**
  - **Plants/food:** grow on land tiles per-biome regrow timer; eaten by herbivores.
  - **Water:** water tiles provide hydration when adjacent/entered.
- **Coordinates:** agents live on the grid; positions in world/tile space, mapped to
  pixels only at the render boundary.

## Agents

- **Needs:** energy/hunger, hydration, health, age. Needs drain over time; eating and
  drinking replenish them; starvation/dehydration reduce health; health 0 = death;
  age has a soft cap.
- **Senses (brain inputs):** local perception around the agent — nearby food, water,
  other agents, own needs, maybe orientation. Exact vector defined per milestone.
- **Actions (brain outputs):** movement (direction/turn + move), eat, drink, seek-mate.
- **Reproduction:** two agents that meet the mating criteria (sated, adult, cooldown)
  produce offspring; offspring genome = crossover of parents + mutation.
- **Diet:** v1 = **herbivores only**. **Predators** (agents eating other agents) are a
  planned later extension.

## Genome

- **Brain genome:** NEAT genome (nodes + connections, historical markings) that expresses
  into the agent's neural network.
- **Body genome:** small fixed-length trait vector evolved alongside the brain, e.g.
  max speed, sight radius, metabolism rate, size. Traits feed into sim mechanics and
  (optionally) appearance.
- Crossover + mutation operate on both parts.

## Evolution

Built in three layers (see Roadmap). End state = **rtNEAT** (real-time NEAT):

- A live, continuously running population.
- Continuous reproduction when agents mate; the world periodically removes weak agents
  and lets fit species reproduce, maintaining ongoing **speciation**.
- Fitness is emergent (survival/offspring), not a hand-tuned score, as far as practical.

## Data & Analytics

- **Stats module** collects time-series: population, births, deaths, average fitness,
  species count, average body traits over time.
- **Charts** rendered with a small hand-rolled canvas chart component.
- (Later) save/load of populations.

## UI / Controls

- Canvas view of the world.
- Controls: pause/resume, sim speed, (later) inspect an agent, seed input.
- Stats/charts panel.
- Input-affecting UI state (paused, speed, selection) lives in the app/domain layer so
  it stays unit-testable; the DOM layer only routes events to it.

## Roadmap / Milestones

- **Milestone A — Playable core loop** *(current focus, see PLAN.md)*
  - Seeded RNG, grid world with biomes, plant regrowth, water.
  - Agents with needs, movement, eat/drink, death.
  - **Fixed-topology** neural net brain (evolvable weights) + body traits.
  - Simple continuous reproduction (crossover + mutation of weights/traits).
  - Fixed-timestep sim loop + Canvas2D renderer + basic run controls.
  - Basic stats readout.
- **Milestone B — NEAT brains**
  - Replace fixed-topology brain with NEAT genome → network expression.
  - Mutation/crossover with historical markings; still continuous reproduction.
- **Milestone C — rtNEAT + speciation**
  - Ongoing speciation, real-time worst-removal / fit-reproduction dynamics.
  - Species-count and lineage analytics.
- **Milestone D — Richer ecosystem**
  - Predators, more biomes, movement costs, day/night or seasons.
  - Charts panel, agent inspector, save/load.

## Open Questions / Parking Lot

- Perception encoding (ray/grid patch/nearest-k) — decide at Milestone A brain design.
- Exact fitness signal for rtNEAT reproduction eligibility.
- When (if) to introduce WebGL renderer.
- Whether body traits also drive rendering (color/size) for visual differentiation.

## Conventions

- Clean code: KISS, DRY, YAGNI, SOLID; no magic numbers (named constants/config).
- TDD: red → green → refactor for domain logic.
- Keep the domain layer free of `app`/`render`/DOM imports.
