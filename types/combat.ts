// =====================================================
// Hollowroot Vale - Advanced ARPG Combat & Creature System
// Core type definitions for lifelike enemies, combat resolution,
// status effects, and procedural uniqueness.
// =====================================================

import type { EquipmentSlot, Gear, Stats } from './index';

// ---------- Damage & Combat Primitives ----------

export type DamageType = 'physical' | 'magical' | 'corrosive' | 'shadow' | 'nature' | 'true';

export interface DamagePacket {
  amount: number;
  type: DamageType;
  isCritical: boolean;
  sourceId: string | number;
  sourceName: string;
  appliedStatuses?: StatusEffectInstance[];
  knockback?: { dx: number; dy: number; force: number };
}

export type StatusEffectId =
  | 'bleed'
  | 'corrosion'
  | 'slow'
  | 'fear'
  | 'root'
  | 'wound_stain'
  | 'enrage'
  | 'shadow_veil'
  | 'regeneration'
  | 'fragile'
  | 'empowered';

export interface StatusEffectDefinition {
  id: StatusEffectId;
  name: string;
  description: string;
  maxStacks: number;
  durationMs: number;
  tickIntervalMs?: number;
  // Visual / gameplay hooks
  color: { r: number; g: number; b: number };
  onApply?: string; // particle / floating text key
  onTick?: string;
}

export interface StatusEffectInstance {
  id: StatusEffectId;
  stacks: number;
  remainingMs: number;
  sourceId: string | number;
  lastTickTime: number;
}

// ---------- Creature Personality & Behavior ----------

export type AIState =
  | 'idle'
  | 'wander'
  | 'alert'
  | 'chase'
  | 'combat'
  | 'special'
  | 'flee'
  | 'recover'
  | 'phase_transition'
  | 'dead';

export type BehaviorTag =
  | 'melee'
  | 'ranged'
  | 'support'
  | 'tank'
  | 'assassin'
  | 'summoner'
  | 'boss'
  | 'elite'
  | 'swarm'
  | 'ambush';

export interface PersonalityProfile {
  aggression: number;   // 0-1  how quickly engages
  bravery: number;      // 0-1  how long stays in fight at low HP
  curiosity: number;    // 0-1  investigates noises / player presence
  packInstinct: number; // 0-1  calls allies / focuses fire
  sadism: number;       // 0-1  prioritizes wounded / applies debuffs
}

export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  cooldownMs: number;
  range: number;
  castTimeMs: number;       // telegraph window
  recoveryMs: number;
  damage?: { base: number; type: DamageType; scalingStat?: string };
  statuses?: { id: StatusEffectId; chance: number; stacks?: number }[];
  aoeRadius?: number;
  projectileSpeed?: number;
  telegraphStyle: 'circle' | 'cone' | 'line' | 'none';
  animationKey: string;
  particleKey?: string;
}

// ---------- Expanded Creature Template ----------

export interface CreatureTemplate {
  id: string;
  name: string;
  description: string;
  lore?: string;

  // Core combat
  baseHp: number;
  baseDamage: number;
  damageType: DamageType;
  stats: { mad: number; sad: number; pad: number; dad: number };
  resistances: Partial<Record<DamageType, number>>; // 0-1 reduction
  immunities?: DamageType[];

  // Movement & detection
  moveSpeed: number;
  detectionRange: number;
  attackRange: number;
  attackCooldown: number; // fallback basic attack

  // AI & personality
  behaviorTags: BehaviorTag[];
  personality: PersonalityProfile;
  preferredStates: AIState[]; // order of priority when deciding

  // Abilities (ordered by priority / phase)
  abilities: AbilityDefinition[];
  basicAttackId?: string;

  // Phases for bosses / elites
  phases?: {
    hpThreshold: number; // 0-1
    name: string;
    abilityOverrides?: string[];
    visualTint?: { r: number; g: number; b: number };
    moveSpeedMult?: number;
    damageMult?: number;
  }[];

  // Rewards
  xpValue: number;
  goldRange?: [number, number];
  drops: { [itemName: string]: [number, number] }; // material drops
  uniqueDropChance?: number; // 0-1 for special named gear
  uniqueDropTable?: string[]; // item template ids

  // Visual & animation
  walkAnimSpeed: number;
  sizeScale: number; // base 1.0
  visualVariants?: string[]; // color / accessory variants
  deathParticle?: string;
  ambientParticle?: string;

  // Spawn rules
  validZones: string[]; // 'farm', 'Crypts', 'Grotto', 'Roots', 'any'
  minLevel?: number;
  maxLevel?: number;
  eliteChance?: number;
}

// ---------- Runtime Enemy Instance ----------

export interface Enemy {
  id: string | number;
  templateId: string;
  name: string;                 // can be unique for elites ("Bloodsoaked Weeping Root")
  isElite: boolean;
  isBoss: boolean;

  x: number;
  y: number;
  hp: number;
  maxHp: number;

  // Combat runtime
  lastHitTime: number;
  lastAttackTime: number;
  attackAnimationProgress?: number;
  currentAbilityId?: string;
  abilityCooldowns: { [abilityId: string]: number };
  statusEffects: StatusEffectInstance[];
  threatTable: { [entityId: string]: number }; // for multi-target
  aggroTargetId: string | number | null;

  // AI
  aiState: AIState;
  previousAiState: AIState;
  stateEnterTime: number;
  wanderTarget?: { x: number; y: number };
  personality: PersonalityProfile; // instance can vary slightly

  // Animation & visual uniqueness
  isMoving: boolean;
  animationFrame: number;
  animationState: string; // 'idle' | 'walk' | 'attack' | 'cast' | 'hurt' | 'death' | phase name
  visualSeed: number;     // for procedural tint / scale / extra details
  sizeScale: number;
  currentPhaseIndex: number;

  // Derived / cached
  moveSpeed: number;
  detectionRange: number;
  attackRange: number;
}

// ---------- Loot Context ----------

export interface LootContext {
  playerLevel: number;
  zoneType: string;
  creatureTemplateId: string;
  isElite: boolean;
  isBoss: boolean;
  creatureLevel: number;
  luckBonus?: number;
}

// ---------- Combat Result ----------

export interface CombatResult {
  damageDealt: number;
  wasCritical: boolean;
  statusesApplied: StatusEffectInstance[];
  killed: boolean;
  overkill: number;
}
