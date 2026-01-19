# Zone 2: Desert Outpost - Design Document

**Created:** 2026-01-18
**Status:** Design Complete - Ready for Implementation Planning

---

## 1. Overview & Narrative

### Setting
A desert military outpost with a nearby historic church, under alien assault. The player, having saved New York in Zone 1, is deployed to defend this strategic location as part of the Sequential Liberation campaign.

### Zone Unlock
Zone 2 becomes permanently available on the stage select screen after defeating the Zone 1 boss. Each zone has independent progression:
- Fresh lives (default starting lives)
- Separate high score leaderboard
- Can be replayed independently

### Structure
Mirrors Zone 1:
- 5 waves of increasing difficulty
- Mini-boss after wave 2 (Vulture King)
- Mini-boss after wave 4 (Sandstorm Colossus)
- Final boss after wave 5 (Siege Crawler)

### HUD Changes
- Wave counter format changes from `WAVE 3` to `1-3` (zone-wave)
- Format applies retroactively to Zone 1 (`1-1` through `1-5`)
- Zone start displays splash: "ENTERING THE DESERT"

### Environmental Features
- Same day/night cycle as Zone 1 (Day/Dusk/Night/Dawn with score multipliers)
- **Heat shimmer effect:** Periodic wavy screen distortion that makes precise aiming slightly harder (every 30-45 seconds). **Only active during day cycle.**

---

## 2. Buildings & Defense Abilities

### Layout (left to right)

```
[Bunker] - [Barracks] - [Radar Tower] - [Church] - [Control Tower] - [Ammo Depot]
  Edge      Mid-left     Center-left    CENTER     Center-right       Edge
```

Powerful abilities positioned in the middle (harder to defend from all angles).

### Kill-Streak Charge System

Buildings "charge up" based on enemies killed nearby:
1. **Proximity calculation:** Enemy death position to building's bottom-center point (nearest building gets credit)
2. **Visual indicator:** When fully charged, a glowing flag raises from the rooftop
3. **Activation:** Player touches flag to trigger the defense ability
4. **Cooldown:** Charge resets after activation; must earn kills again

### Charge Costs (tiered by power)

| Building | Ability | Kills to Charge | Effect |
|----------|---------|-----------------|--------|
| Bunker | AA Battery | 5 | Auto-turret spawns, targets enemies (20 sec) |
| Ammo Depot | Artillery Barrage | 5 | 3-4 mortar shells rain on enemy clusters |
| Barracks | Infantry Squad | 6 | 3-4 rooftop soldiers shoot enemies (15-20 sec) |
| Control Tower | Targeting Boost | 8 | Player homing shots + fire rate (10 sec) |
| Radar Tower | Air Strike | 10 | Fighter jet sweeps screen, damages all airborne |
| Church | Bell Tower Alert | 12 | Slows all enemies and projectiles (8-10 sec) |

### Health Scaling Discount
Damaged buildings charge faster:
- Full health = base cost
- 50% health = reduced cost (exact formula TBD)
- **60%+ destruction = cannot charge** (ability disabled until repaired)

Note: Charge disability is not permanent - repair mechanics may restore functionality.

---

## 3. Enemy Roster

### Returning Enhanced (from Zone 1)

| Enemy | Zone 1 Stats | Zone 2 Enhancement |
|-------|--------------|-------------------|
| Standard Drone | Speed: 60, HP: 1 | +25% speed (75), HP: 2 |
| Aggressive Drone | 3-shot burst | 4-shot burst, more erratic movement |

### New Desert Enemies

#### Dust Devil (replaces Bomber)
- **Behavior:** Spiral/corkscrew dive toward target
- **Difficulty:** Harder to hit than straight-line Bomber, but slower overall
- **Primary target:** Buildings
- **HP:** 1

#### Sandworm
- **Movement:** Visible as sand trail moving on ground
- **Vulnerability:** Can be shot even while burrowing (hit the sand trail)
- **Telegraph:** Dust trail while moving + ground bulge before surfacing
- **Attack:** Surfaces once per building, destroys 1-2 foundation blocks
- **Pattern:** Visits all buildings sequentially, then burrows off-screen and despawns
- **Despawn penalty:** No score, no charge contribution (incentivizes killing early)
- **HP:** 2-3 (TBD)

#### Sandstorm Carrier (replaces Carrier)
- **Behavior:** Flies across screen, drops burrowing pods
- **Pod mechanic:** Pods burrow into ground, drones erupt after 4-5 second delay
- **Strategic choice:** Track pods or chase carrier?
- **HP:** 3 (same as Zone 1 Carrier)

#### Scorpion Tank (replaces Gunship)
- **Movement:** Ground-based siege unit, climbs building walls
- **Climbing damage:** Destroys 1 block per 2 seconds while climbing
- **Attack:** Fires stinger projectiles at player every 2 seconds
- **Rooftop behavior:** Pauses, fires rapid burst, then leaps to nearest building
- **HP:** 5-6 hits

---

## 4. Wave Pacing & Enemy Unlocks

### Enemy Introduction by Wave

| Wave | New Enemy Added | Active Roster |
|------|-----------------|---------------|
| 1 | Enhanced Standard | Standard |
| 2 | Enhanced Aggressive | Standard, Aggressive |
| 3 | Dust Devil, Sandworm | Standard, Aggressive, Dust Devil, Sandworm |
| 4 | Sandstorm Carrier | All above + Carrier |
| 5 | Scorpion Tank | Full roster (6 types) |

### Difficulty Notes
- **Wave 3 spike:** Two new enemy types simultaneously (aerial Dust Devil + ground-based Sandworm) forces adaptation to multiple threat vectors

### Boss Triggers
- Wave 2 complete → Vulture King mini-boss
- Wave 4 complete → Sandstorm Colossus mini-boss
- Wave 5 complete → Siege Crawler final boss

### Wave Breaks
2-second pause between wave completion and mini-boss appearance (same as Zone 1)

### Spawn Weights (suggested)

| Enemy Type | Weight |
|------------|--------|
| Standard Drone | 40% |
| Aggressive Drone | 20% |
| Dust Devil | 15% |
| Sandworm | 10% |
| Sandstorm Carrier | 10% |
| Scorpion Tank | 5% |

---

## 5. Bosses

### Mini-Boss 1: Vulture King (after Wave 2)

| Attribute | Value |
|-----------|-------|
| HP | 10-12 hits |
| Primary Target | Buildings (not player) |

**Behavior:**
1. **Circling phase:** Flies high in wide pattern, difficult to hit (small target at distance)
2. **Dive attack:** Swoops down at buildings, damages on impact
3. **Debris mechanic:** Grabs debris chunk from impacted building, drops on another building (double damage potential)
4. **Recovery window:** Brief low hover after each dive (vulnerability window)

**Design Intent:** Player must intercept dives to protect buildings rather than just surviving. Strategic threat to objective.

---

### Mini-Boss 2: Sandstorm Colossus (after Wave 4)

| Attribute | Value |
|-----------|-------|
| HP | 15-18 hits |
| Direct Attack | None |

**Behavior:**
1. **Movement:** Massive carrier that slowly crosses the screen
2. **Sandstorm aura:** Reduces visibility across entire screen while alive (dust overlay)
3. **Drone spawning:** Continuously spawns enhanced drones every 3-4 seconds
4. **Threat model:** Purely drones + visibility reduction; no direct attacks

**Design Intent:** A test of focus and DPS. Ignore drones, burn down Colossus fast to clear the storm.

---

### Final Boss: Siege Crawler (after Wave 5)

| Attribute | Value |
|-----------|-------|
| Total HP | 43 hits |
| Core HP | 15 (exposed after Shield Generator destroyed) |

**Behavior:**
1. **Movement:** Enormous ground mech that slowly advances toward buildings
2. **Reaching buildings:** Causes massive damage burst (50-60% destruction)
3. **After destroying building:** Resumes crawling toward next building
4. **Fail state:** Continues until destroyed or all buildings fall

**Destructible Weapon Systems (any order):**

| System | HP | Effect When Active |
|--------|----|--------------------|
| Missile Pods | 4 | Fires homing missiles at player |
| Drone Bay | 8 | Spawns drones periodically |
| Mortar Cannon | 10 | Lobs shells at buildings |
| Shield Generator | 6 | Core invulnerable until destroyed |

**Design Intent:** Player chooses which systems to disable first - tactical decision under time pressure. The advancing threat creates urgency.

---

## 6. Assets Required

### Building Sprites (desert/military themed)
- Bunker
- Barracks
- Radar Tower
- Church
- Control Tower
- Ammo Depot
- Glowing flag (charge indicator, animated)

### Enemy Sprites
- Enhanced Standard Drone (recolor/variant of existing)
- Enhanced Aggressive Drone (recolor/variant)
- Dust Devil (spiral projectile/enemy)
- Sandworm (sand trail + emerging animation)
- Sandstorm Carrier (96x96, similar to Carrier)
- Scorpion Tank (climbing animation, multi-directional)

### Boss Sprites
- Vulture King (circling + diving animations)
- Sandstorm Colossus (large carrier, 128x128 or larger)
- Siege Crawler (large ground mech, destructible parts highlighted)

### Effect Sprites/Shaders
- Sand trail particle effect
- Ground bulge warning sprite
- Sandstorm overlay (visibility reduction, alpha layer)
- Heat shimmer shader/overlay (day cycle only)
- Fighter jet flyby sprite (Radar Tower ability)
- Mortar shell + artillery explosion (Ammo Depot ability)
- Infantry soldiers on rooftops (Barracks ability)
- AA turret (Bunker ability)
- Bell ring visual effect (Church ability)

### UI Assets
- Zone splash screen ("ENTERING THE DESERT")
- Updated wave counter format (zone-wave display)
- Stage select screen with Zone 1 / Zone 2 options

### Background
- Desert military outpost scene (parallax layers matching Zone 1 style)

---

## 7. Implementation Considerations

### Code Architecture Changes
1. **Zone system:** Abstract wave/building configuration to support multiple zones
2. **Building abilities:** New charge system, flag entity, ability trigger logic
3. **HUD updates:** Zone-wave format, zone splash screen
4. **Stage select:** New menu state, zone unlock persistence
5. **Enemy variants:** Enhanced stat loading, new enemy classes
6. **Boss classes:** Three new boss implementations with unique mechanics

### Suggested Implementation Order
1. Zone/wave system refactor (HUD, stage select)
2. Desert buildings with charge system
3. Enhanced returning enemies
4. New desert enemies (Dust Devil, Sandworm, Scorpion Tank, Sandstorm Carrier)
5. Building defense abilities
6. Mini-bosses (Vulture King, Sandstorm Colossus)
7. Final boss (Siege Crawler)
8. Environmental effects (heat shimmer)
9. Polish and balancing

---

## 8. Open Questions for Implementation

1. **Exact charge discount formula** for damaged buildings
2. **Sandworm HP** - 2 or 3 hits?
3. **Heat shimmer intensity** - subtle or noticeable?
4. **Siege Crawler advance speed** - how long before reaching first building?
5. **Building ability cooldowns** - can the same building be charged multiple times per wave?
6. **Stage select UI design** - simple list or visual map?

---

*Document ready for implementation planning phase.*
