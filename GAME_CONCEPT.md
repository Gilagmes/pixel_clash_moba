# Post-Apocalyptic 3D World — Game Concept

## Vision

Transform the current Pixel Clash Arena prototype into a mobile-first 3D survival/base-building strategy game with a persistent world, living settlement, heroes, army, raids, exploration, zombies and bosses.

## Core loop

1. Explore nearby territory.
2. Gather wood, food, metal, fuel and medical supplies.
3. Build and upgrade the survivor base.
4. Assign living workers to jobs.
5. Recruit and level heroes.
6. Form army squads.
7. Scout locations and launch raids.
8. Fight zombies and bosses.
9. Return with loot and survivors.
10. Unlock new regions and repeat with higher-risk objectives.

## World

- Isometric 3D terrain.
- Forests, roads, rivers, abandoned towns, farms and military facilities.
- Points of interest are persistent map nodes.
- Fog of war hides unexplored regions.
- Day/night and weather can modify visibility and combat conditions.

## Base

The base is a live simulation rather than a static menu.

Workers physically move between buildings and resource nodes. Their state includes profession, energy, health, experience, morale and relationships. Workers can build, repair, transport resources, produce supplies, rest and interact with one another.

Suggested first buildings:

- Headquarters
- Barracks
- Workshop
- Farm
- Medical tent
- Warehouse
- Watchtower
- Training ground
- Generator

## Army

Squads are assembled from combat roles:

- Scout
- Rifleman
- Assault
- Heavy
- Medic
- Commander

A commander provides squad-wide bonuses. Squad composition should matter more than raw power.

## Heroes

Heroes have:

- Level and rarity
- Attack, defense and health
- Active abilities
- Passive abilities
- Weapon and armor slots
- Progression and upgrade costs

Initial archetypes:

- Scout — mobility and reconnaissance
- Soldier — reliable ranged damage
- Medic — healing and survival
- Heavy — frontline protection
- Engineer — structures, vehicles and support

## Zombies

Initial enemy families:

- Walker
- Runner
- Tank
- Spitter
- Mutant
- Elite

Bosses should have readable attack patterns and special mechanics rather than simply inflated health.

## Raid flow

`Map → Location → Squad → Loadout → Scout → Raid → Combat → Loot → Return`

A raid can be short and mostly automated, while major locations can expose tactical combat controls.

## Mobile UX

- One-thumb friendly navigation.
- Pinch zoom and drag on the world map.
- Large touch targets.
- Bottom navigation for Map, Base, Heroes, Army and Inventory.
- Contextual action buttons instead of dense permanent HUD elements.
- Landscape combat view is optional; portrait should remain usable for management screens.

## First playable milestone

Build a vertical slice containing:

1. One 3D settlement.
2. One surrounding forest/road region.
3. Five worker NPCs with simple jobs and navigation.
4. One hero.
5. One army squad.
6. Three zombie types.
7. One raid location.
8. Basic loot and return flow.
9. Mobile touch camera controls.

The goal of this milestone is to validate the complete loop before expanding content.
