# ADR 0001: System-driven, fitness-weighted reproduction (rtNEAT)

- Status: Accepted
- Date: 2025-XX-XX
- Supersedes: the "simple continuous reproduction" gate from Milestone A

## Context

Milestone A shipped a playable loop where reproduction is **agent-driven**: two
agents reproduce only when *all* of the following hold in the same tick:

1. both are adult (`age >= adultAge`),
2. both are well-fed (`energy >= mateEnergyMin`, `hydration >= mateHydrationMin`),
3. they are physically adjacent, **and**
4. both brains output a "mate" action above threshold.

Playtesting exposed a fatal bootstrap problem: with **random initial brains**, no
agent can reliably eat/drink (fails #2) or purposefully seek and choose a mate
(fails #3–#4). The probability of two random agents satisfying all four conditions
simultaneously is effectively zero, so **no offspring are ever produced and the whole
population ages out or starves — extinction before the first birth.** In short,
reproduction depended on a competence the first generation does not yet have, so
evolution never got off the ground. Observed behaviour: "they didn't really do
anything before dying."

We want an **emergent ecosystem** (Milestone C, rtNEAT) in which behaviour *evolves*
from nothing, the run never dead-ends, and there is real selection pressure toward
better neural networks. Goals:

- Selection must not presuppose competent agents (must bootstrap from random brains).
- The world should feel alive: creatures wander, live, and die of hunger or old age.
- There must be genuine, measurable selection toward better brains over time.
- Everything stays deterministic (seeded RNG) and unit-testable; the `Brain` and
  `Perception` interfaces and the tick loop shape stay intact.

## Decision

Adopt the defining idea of **rtNEAT: reproduction is system-driven, not
agent-driven.** The simulation itself selects parents by fitness and produces
offspring on a cadence, decoupling *viability of the run* from *competence of the
agents*.

### Reproduction (birth) — system-driven
- On a birth cadence and/or whenever population is below a target, the simulation
  selects **two parents weighted by fitness** from the eligible living population
  (eligible = `age >= minParentAge`). Parents do **not** need to meet, be well-fed,
  or choose to mate.
- Offspring = NEAT crossover of the parents' genomes + mutation (Milestone B engine).
- The child is placed on a passable tile near a parent (wrapping on the torus).
- Population is held near a target / carrying capacity via the birth cadence.

### Death — natural (the selection pressure)
- Agents die from starvation/dehydration (`health -> 0`) or old age (`age >= MAX_AGE`).
- This is the real selective force: brains that fail to eat/drink die young, earn low
  fitness, and rarely become parents. Good brains live longer and breed more.

### Fitness
```
fitness = age
        + FOOD_FITNESS_WEIGHT     * totalFoodEaten
        + OFFSPRING_FITNESS_WEIGHT * offspringProduced
```
- **Age** (survival time) is the primary term — proven survival. Naturally capped
  because agents die at `MAX_AGE`.
- **Small food bonus** rewards actually foraging, not just idling to survive.
- **Small offspring bonus** rewards lineages that successfully reproduce.
- The two bonuses are deliberately small so age/survival dominates; they exist to
  nudge agents toward *doing things*.

### Extinction floor
- If population falls below a floor, reseed by breeding the top-fitness survivors
  (or, if truly extinct, inject fresh random genomes) so a run can never become
  permanently dead.

### Retired for now
- Spatial mating and the agents' "mate" NN output are retired as a reproduction
  mechanism. The output slot may be repurposed later or re-enabled as a realism
  layer once brains are competent.

### Deferred
- **Speciation** (dynamic compatibility threshold, fitness sharing) is deferred to a
  later step, but the NEAT compatibility-distance function will be built so it slots
  in without reworking reproduction.

## Consequences

### Positive
- **Bootstraps from random brains**: the run always makes progress; eating/drinking
  behaviour emerges over generations instead of being a precondition.
- **No dead-end runs**: birth cadence + extinction floor guarantee ongoing simulation.
- **Real, measurable selection**: fitness ranking and a champion genome become
  available for stats/inspection.
- **Simpler than spatial mating**: no pair-finding, adjacency, or energy gates to tune.
- **Reuses existing domain**: world, torus, needs, perception, body genome and the
  `Brain` interface are untouched; only the orchestration layer changes.

### Negative
- **Less biologically literal**: pairing is manager-mediated rather than emerging from
  agents meeting; some "ecosystem" purity is traded for viability.
- **Deviates from textbook rtNEAT**, which removes the single worst-fitness agent per
  birth to hold population exactly constant; we instead rely on natural death and top
  up via births (accepted trade for the ecosystem feel).
- **Fitness weights are tuning knobs** that need playtesting to balance idling vs.
  foraging vs. breeding.
- The agents' "mate" output becomes vestigial until re-purposed.

## Alternatives Considered

- **Keep spatial/agent-driven mating (Milestone A design)**
  - Pros: most biologically literal; emergent pair-forming.
  - Cons: the proven cause of extinction; requires competent brains to bootstrap,
    which random genomes lack. Rejected.

- **Spatial mating + system safety-net**
  - Pros: keeps emergent pairing while preventing extinction.
  - Cons: two overlapping reproduction paths to tune and test; the spatial path still
    contributes ~nothing until brains are competent, so it is complexity without early
    payoff. Deferred as a possible later realism layer.

- **Generational tournament (batch GA/NEAT)**
  - Pros: cleanest "find the best NN", clear fitness curve and champion.
  - Cons: world is a reset-every-generation test harness, not a living ecosystem —
    contrary to the desired emergent-ecosystem experience. Rejected for this project.

- **Fitness = pure age (no bonuses)**
  - Pros: simplest.
  - Cons: rewards idle survival; agents have no gradient toward foraging/breeding.
    Rejected in favour of age + small food/offspring bonuses.
