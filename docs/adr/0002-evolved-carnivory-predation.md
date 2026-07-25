# ADR 0002: Predation as evolved carnivory (not a separate creature type)

- Status: Accepted
- Date: 2025-XX-XX
- Context: Milestone D.5

## Context

Milestone D calls for predators. Two options were on the table: a separate,
hard-coded predator entity that hunts foragers, or letting predatory behaviour
**evolve from the single existing population** (an agent may attack another). The
user's concern: if prey have no defence, evolved predators are trivially dominant;
but a separate hard-coded predator type is unnecessary complication.

## Decision

Model predation as an **evolved behaviour of the one population**. Add an `attack`
action output to the brain; when chosen, the agent damages the nearest adjacent
agent and gains energy proportional to the damage dealt, at an energy cost. There
is no separate predator type — "predator" and "prey" are just strategies.

Balance / prey counterplay is provided by **existing, evolvable body traits** plus
ecological feedback, so it is an arms race rather than a massacre:

- **Tankiness:** damage scales with `attackerSize / targetSize`, so evolving a
  larger body reduces damage taken (and raises damage dealt).
- **Fleeing:** the `maxSpeed` trait and the existing "nearest agent" perception let
  prey evolve to detect and move away from approaching agents.
- **Detection:** the `sightRadius` trait gives earlier warning.
- **Cost & risk:** attacking costs energy whether or not it lands, so indiscriminate
  attacking is selected against; predators must actually connect to profit.
- **Ecological feedback:** over-hunting depletes prey, starving predators
  (Lotka–Volterra-style self-regulation) — an emergent, not scripted, balance.

## Consequences

### Positive
- No special-case entity type; reuses the whole agent/genome/brain/sim stack.
- Predator–prey dynamics *emerge* and self-balance; fits the ecosystem theme.
- Prey are never defenceless — defences evolve from the same trait genome.

### Negative
- Adds an output to the brain: `DEFAULT_TOPOLOGY.outputs` 5 → 6. Genomes exported
  before D.5 (5 outputs) are **not** import-compatible with post-D.5 builds.
- Combat balance introduces tuning knobs (base damage, energy gain, energy cost)
  that need playtesting.

## Alternatives considered
- **Separate hard-coded predators** — more code, a second creature type and its own
  balancing; contrary to the emergent, single-population design. Rejected.
- **Add own-size to perception too** — considered, but size-based defence already
  works mechanically without the brain sensing its own size; skipped to avoid also
  changing perception width (keeps inputs, and pre-D.5 export inputs, stable).
