import type { CreatureTemplate, AbilityDefinition } from '../types/combat';

// =====================================================
// Hollowroot Vale - Creature Templates
// Fully designed unique, lifelike enemy characters with
// personality-driven AI, multi-phase behaviors, and
// integrated combat/loot identity.
// =====================================================

const basicMelee: AbilityDefinition = {
  id: 'basic_melee',
  name: 'Strike',
  description: 'A basic physical attack.',
  cooldownMs: 1800,
  range: 1.4,
  castTimeMs: 300,
  recoveryMs: 400,
  damage: { base: 1, type: 'physical', scalingStat: 'mad' },
  telegraphStyle: 'none',
  animationKey: 'attack'
};

export const CREATURE_TEMPLATES: { [key: string]: CreatureTemplate } = {

  weeping_root: {
    id: 'weeping_root',
    name: 'Weeping Root',
    description: 'A twisted, ambulatory root that weeps a corrosive sap. It lunges from the undergrowth and tries to drag prey into the soil.',
    lore: 'The roots remember every footstep that crushed them. Now they walk.',
    baseHp: 38,
    baseDamage: 7,
    damageType: 'corrosive',
    stats: { mad: 4, sad: 2, pad: 6, dad: 1 },
    resistances: { physical: 0.15, corrosive: 0.6, nature: 0.3 },
    immunities: [],
    moveSpeed: 1.65,
    detectionRange: 7.5,
    attackRange: 1.35,
    attackCooldown: 1900,
    behaviorTags: ['melee', 'ambush', 'swarm'],
    personality: {
      aggression: 0.85,
      bravery: 0.25,
      curiosity: 0.4,
      packInstinct: 0.75,
      sadism: 0.6
    },
    preferredStates: ['chase', 'combat', 'special'],
    abilities: [
      {
        id: 'corrosive_lunge',
        name: 'Corrosive Lunge',
        description: 'Lunges forward, dealing corrosive damage and leaving a sap puddle.',
        cooldownMs: 6500,
        range: 3.2,
        castTimeMs: 450,
        recoveryMs: 600,
        damage: { base: 12, type: 'corrosive' },
        statuses: [{ id: 'corrosion', chance: 0.85, stacks: 2 }],
        aoeRadius: 1.1,
        telegraphStyle: 'circle',
        animationKey: 'lunge',
        particleKey: 'sap_burst'
      },
      {
        id: 'weep',
        name: 'Weeping Sap',
        description: 'When wounded, weeps corrosive droplets around itself.',
        cooldownMs: 9000,
        range: 0,
        castTimeMs: 200,
        recoveryMs: 300,
        damage: { base: 4, type: 'corrosive' },
        statuses: [{ id: 'corrosion', chance: 1.0, stacks: 1 }],
        aoeRadius: 1.8,
        telegraphStyle: 'circle',
        animationKey: 'weep',
        particleKey: 'sap_drip'
      },
      basicMelee
    ],
    basicAttackId: 'basic_melee',
    xpValue: 14,
    goldRange: [2, 8],
    drops: {
      'Oak Wood': [1, 3],
      'Weeping Essence': [1, 2],
      'Glimmering Dust': [0, 1]
    },
    uniqueDropChance: 0.04,
    walkAnimSpeed: 6,
    sizeScale: 1.0,
    visualVariants: ['pale', 'bloodied', 'mossy'],
    deathParticle: 'root_shatter',
    ambientParticle: 'sap_drip',
    validZones: ['farm', 'Roots', 'any'],
    eliteChance: 0.12
  },

  shadow_creeper: {
    id: 'shadow_creeper',
    name: 'Shadow Creeper',
    description: 'A skittering creature of pure shadow, hard to pin down. It vanishes and reappears behind its prey.',
    lore: 'Born from the places light refuses to enter.',
    baseHp: 28,
    baseDamage: 9,
    damageType: 'shadow',
    stats: { mad: 7, sad: 5, pad: 2, dad: 3 },
    resistances: { physical: 0.1, shadow: 0.7, magical: 0.25 },
    immunities: [],
    moveSpeed: 2.7,
    detectionRange: 11,
    attackRange: 1.1,
    attackCooldown: 1400,
    behaviorTags: ['melee', 'assassin', 'ambush'],
    personality: {
      aggression: 0.9,
      bravery: 0.45,
      curiosity: 0.7,
      packInstinct: 0.3,
      sadism: 0.85
    },
    preferredStates: ['chase', 'combat', 'special'],
    abilities: [
      {
        id: 'shadow_blink',
        name: 'Shadow Blink',
        description: 'Teleports behind the target and strikes.',
        cooldownMs: 5200,
        range: 6.5,
        castTimeMs: 180,
        recoveryMs: 250,
        damage: { base: 14, type: 'shadow' },
        statuses: [{ id: 'fear', chance: 0.35, stacks: 1 }],
        telegraphStyle: 'none',
        animationKey: 'blink',
        particleKey: 'shadow_burst'
      },
      {
        id: 'shadow_veil',
        name: 'Veil of Night',
        description: 'Briefly becomes nearly invisible and gains move speed.',
        cooldownMs: 11000,
        range: 0,
        castTimeMs: 100,
        recoveryMs: 200,
        statuses: [{ id: 'shadow_veil', chance: 1.0 }],
        telegraphStyle: 'none',
        animationKey: 'veil'
      },
      basicMelee
    ],
    basicAttackId: 'basic_melee',
    xpValue: 16,
    goldRange: [3, 10],
    drops: {
      'Shadowshroom': [1, 3],
      'Glimmering Dust': [0, 2]
    },
    uniqueDropChance: 0.06,
    walkAnimSpeed: 11,
    sizeScale: 0.9,
    visualVariants: ['deep', 'violet', 'ashen'],
    deathParticle: 'shadow_dissolve',
    validZones: ['farm', 'Crypts', 'Grotto', 'any'],
    eliteChance: 0.15
  },

  stone_golem: {
    id: 'stone_golem',
    name: 'Stone Golem',
    description: 'A slow but incredibly resilient construct animated by a captured earth spirit. When wounded it becomes a living avalanche.',
    lore: 'The earth does not forget those who dig too deep.',
    baseHp: 95,
    baseDamage: 11,
    damageType: 'physical',
    stats: { mad: 3, sad: 1, pad: 9, dad: 4 },
    resistances: { physical: 0.45, magical: 0.15, corrosive: 0.3 },
    immunities: ['fear'],
    moveSpeed: 0.95,
    detectionRange: 6.5,
    attackRange: 1.7,
    attackCooldown: 2800,
    behaviorTags: ['melee', 'tank'],
    personality: {
      aggression: 0.35,
      bravery: 0.95,
      curiosity: 0.15,
      packInstinct: 0.2,
      sadism: 0.2
    },
    preferredStates: ['combat', 'special', 'chase'],
    abilities: [
      {
        id: 'earth_slam',
        name: 'Earth Slam',
        description: 'Slams the ground, creating a shockwave.',
        cooldownMs: 7500,
        range: 2.8,
        castTimeMs: 700,
        recoveryMs: 900,
        damage: { base: 18, type: 'physical' },
        statuses: [{ id: 'slow', chance: 0.7, stacks: 1 }],
        aoeRadius: 2.4,
        telegraphStyle: 'circle',
        animationKey: 'slam',
        particleKey: 'rock_burst'
      },
      {
        id: 'enrage',
        name: 'Awakened Fury',
        description: 'At low health the golem enrages, gaining damage and speed.',
        cooldownMs: 999999,
        range: 0,
        castTimeMs: 400,
        recoveryMs: 200,
        statuses: [{ id: 'enrage', chance: 1.0 }],
        telegraphStyle: 'none',
        animationKey: 'enrage'
      },
      basicMelee
    ],
    basicAttackId: 'basic_melee',
    phases: [
      {
        hpThreshold: 0.4,
        name: 'Enraged',
        abilityOverrides: ['earth_slam', 'enrage'],
        visualTint: { r: 180, g: 60, b: 40 },
        moveSpeedMult: 1.45,
        damageMult: 1.35
      }
    ],
    xpValue: 28,
    goldRange: [8, 22],
    drops: {
      'Stone': [3, 6],
      'Iron Ore': [1, 3],
      'Glimmering Dust': [0, 2]
    },
    uniqueDropChance: 0.08,
    walkAnimSpeed: 3,
    sizeScale: 1.35,
    visualVariants: ['granite', 'obsidian', 'moss_covered'],
    deathParticle: 'stone_crumble',
    validZones: ['Crypts', 'Grotto', 'Roots'],
    eliteChance: 0.1
  },

  whispering_shade: {
    id: 'whispering_shade',
    name: 'Whispering Shade',
    description: 'A tormented spirit whose whispers unnerve the most steadfast warrior. It prefers to stay at a distance and break the mind before the body.',
    lore: 'They still speak the last words of those who died alone in the Hollow.',
    baseHp: 42,
    baseDamage: 8,
    damageType: 'shadow',
    stats: { mad: 3, sad: 8, pad: 1, dad: 6 },
    resistances: { physical: 0.05, shadow: 0.65, magical: 0.4 },
    immunities: [],
    moveSpeed: 2.1,
    detectionRange: 10,
    attackRange: 4.5,
    attackCooldown: 2100,
    behaviorTags: ['ranged', 'support'],
    personality: {
      aggression: 0.55,
      bravery: 0.3,
      curiosity: 0.6,
      packInstinct: 0.7,
      sadism: 0.9
    },
    preferredStates: ['combat', 'special', 'flee'],
    abilities: [
      {
        id: 'soul_whisper',
        name: 'Soul Whisper',
        description: 'A ranged psychic attack that applies fear and wound stain.',
        cooldownMs: 3200,
        range: 5.5,
        castTimeMs: 550,
        recoveryMs: 400,
        damage: { base: 11, type: 'shadow' },
        statuses: [
          { id: 'fear', chance: 0.55, stacks: 1 },
          { id: 'wound_stain', chance: 0.7, stacks: 1 }
        ],
        telegraphStyle: 'line',
        animationKey: 'whisper',
        particleKey: 'shadow_whisper'
      },
      {
        id: 'chorus_of_the_dead',
        name: 'Chorus of the Dead',
        description: 'Calls nearby shades or applies a group debuff.',
        cooldownMs: 14000,
        range: 0,
        castTimeMs: 800,
        recoveryMs: 600,
        statuses: [{ id: 'fear', chance: 0.8, stacks: 1 }],
        aoeRadius: 4.0,
        telegraphStyle: 'circle',
        animationKey: 'chorus'
      },
      basicMelee
    ],
    basicAttackId: 'soul_whisper',
    xpValue: 22,
    goldRange: [5, 15],
    drops: {
      'Cursed Coin': [1, 2],
      'Glimmering Dust': [1, 3]
    },
    uniqueDropChance: 0.07,
    walkAnimSpeed: 0,
    sizeScale: 1.1,
    visualVariants: ['pale', 'violet', 'crimson'],
    deathParticle: 'shade_fade',
    ambientParticle: 'whisper_wisps',
    validZones: ['Crypts', 'Grotto', 'Roots'],
    eliteChance: 0.13
  },

  heart_of_the_hollow: {
    id: 'heart_of_the_hollow',
    name: 'Heart of the Hollow',
    description: "The pulsating, malevolent core of the dungeon's corruption. It reshapes itself as it is wounded.",
    lore: 'All paths in the Hollow lead here. All roots drink from this heart.',
    baseHp: 620,
    baseDamage: 16,
    damageType: 'shadow',
    stats: { mad: 6, sad: 9, pad: 5, dad: 9 },
    resistances: { physical: 0.2, magical: 0.35, shadow: 0.5, corrosive: 0.25 },
    immunities: ['fear', 'root'],
    moveSpeed: 0,
    detectionRange: 22,
    attackRange: 12,
    attackCooldown: 1600,
    behaviorTags: ['boss', 'ranged', 'summoner'],
    personality: {
      aggression: 1.0,
      bravery: 1.0,
      curiosity: 0.0,
      packInstinct: 0.8,
      sadism: 0.95
    },
    preferredStates: ['combat', 'special', 'phase_transition'],
    abilities: [
      {
        id: 'heart_pulse',
        name: 'Heart Pulse',
        description: 'Emits a wave of pure corruption.',
        cooldownMs: 4000,
        range: 10,
        castTimeMs: 600,
        recoveryMs: 400,
        damage: { base: 18, type: 'shadow' },
        statuses: [{ id: 'wound_stain', chance: 0.9, stacks: 2 }],
        aoeRadius: 6,
        telegraphStyle: 'circle',
        animationKey: 'pulse',
        particleKey: 'corruption_wave'
      },
      {
        id: 'summon_roots',
        name: 'Call of the Roots',
        description: 'Summons Weeping Roots to protect the Heart.',
        cooldownMs: 18000,
        range: 0,
        castTimeMs: 1200,
        recoveryMs: 800,
        telegraphStyle: 'circle',
        animationKey: 'summon'
      },
      {
        id: 'void_collapse',
        name: 'Void Collapse',
        description: 'Phase 3 ultimate - massive delayed explosion.',
        cooldownMs: 22000,
        range: 0,
        castTimeMs: 1800,
        recoveryMs: 1000,
        damage: { base: 45, type: 'true' },
        aoeRadius: 8,
        telegraphStyle: 'circle',
        animationKey: 'collapse',
        particleKey: 'void_implosion'
      }
    ],
    phases: [
      {
        hpThreshold: 0.66,
        name: 'Awakening',
        abilityOverrides: ['heart_pulse', 'summon_roots'],
        visualTint: { r: 140, g: 40, b: 180 },
        damageMult: 1.15
      },
      {
        hpThreshold: 0.33,
        name: 'Apotheosis',
        abilityOverrides: ['heart_pulse', 'void_collapse', 'summon_roots'],
        visualTint: { r: 220, g: 30, b: 90 },
        moveSpeedMult: 0,
        damageMult: 1.4
      }
    ],
    xpValue: 550,
    goldRange: [80, 160],
    drops: {
      'Perfect Heartstone': [1, 1],
      'Gold': [60, 140],
      'Glimmering Dust': [5, 12]
    },
    uniqueDropChance: 1.0,
    uniqueDropTable: ['heartstone_relic', 'hollow_crown'],
    walkAnimSpeed: 0,
    sizeScale: 2.2,
    visualVariants: ['core'],
    deathParticle: 'heart_shatter',
    ambientParticle: 'corruption_aura',
    validZones: ['Roots'],
    eliteChance: 0
  }
};

export function getCreatureTemplate(id: string): CreatureTemplate | null {
  return CREATURE_TEMPLATES[id] || null;
}
