import type { Enemy, CreatureTemplate, PersonalityProfile, AIState } from '../types/combat';
import { CREATURE_TEMPLATES, getCreatureTemplate } from '../data/creatures';

// =====================================================
// EnemyFactory - Creates unique, lifelike enemy instances
// with variance, elite upgrades, level scaling, and
// personality-driven uniqueness.
// =====================================================

let nextEnemyId = 1;

function createId(): string {
  return `enemy_${nextEnemyId++}_${Date.now().toString(36)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function varyPersonality(base: PersonalityProfile, seed: number): PersonalityProfile {
  // Small random variance so no two enemies of the same type feel identical
  const r = (offset: number) => ((Math.sin(seed * 12.9898 + offset) * 43758.5453) % 1);
  return {
    aggression: clamp(base.aggression + (r(1) - 0.5) * 0.18, 0, 1),
    bravery: clamp(base.bravery + (r(2) - 0.5) * 0.15, 0, 1),
    curiosity: clamp(base.curiosity + (r(3) - 0.5) * 0.2, 0, 1),
    packInstinct: clamp(base.packInstinct + (r(4) - 0.5) * 0.15, 0, 1),
    sadism: clamp(base.sadism + (r(5) - 0.5) * 0.18, 0, 1)
  };
}

function generateEliteName(baseName: string, seed: number): string {
  const prefixes = ['Bloodsoaked', 'Ancient', 'Hollow-Touched', 'Ravenous', 'Cursed', 'Twilight', 'Vile', 'Elder'];
  const suffixes = ['the Weeping', 'of the Deep', 'the Unyielding', 'Shadeborn', 'Rootbound'];
  const r = Math.abs(Math.sin(seed * 7.13)) % 1;
  if (r < 0.55) {
    return `${prefixes[Math.floor(r * prefixes.length * 1.8) % prefixes.length]} ${baseName}`;
  }
  return `${baseName} ${suffixes[Math.floor(r * suffixes.length * 1.7) % suffixes.length]}`;
}

export interface SpawnOptions {
  templateId: string;
  x: number;
  y: number;
  level?: number;          // area / player level for scaling
  forceElite?: boolean;
  forceBoss?: boolean;
  visualSeed?: number;
}

export class EnemyFactory {
  /**
   * Creates a fully realized enemy instance with unique personality,
   * possible elite upgrade, level scaling, and visual variance.
   */
  static create(options: SpawnOptions): Enemy | null {
    const template = getCreatureTemplate(options.templateId);
    if (!template) {
      console.error(`EnemyFactory: unknown template ${options.templateId}`);
      return null;
    }

    const seed = options.visualSeed ?? (Math.random() * 100000 | 0);
    const level = options.level ?? 1;
    const levelMult = 1 + (level - 1) * 0.12;

    // Elite roll
    const eliteChance = template.eliteChance ?? 0.1;
    const isElite = options.forceElite || (!options.forceBoss && Math.random() < eliteChance);
    const isBoss = options.forceBoss || template.behaviorTags.includes('boss');

    // Scale core stats
    let maxHp = Math.round(template.baseHp * levelMult * (isElite ? 1.65 : 1) * (isBoss ? 1 : 1));
    let moveSpeed = template.moveSpeed * (isElite ? 1.12 : 1);
    let detectionRange = template.detectionRange * (isElite ? 1.15 : 1);
    let attackRange = template.attackRange;

    // Personality variance for lifelike uniqueness
    const personality = varyPersonality(template.personality, seed);

    // Name
    let name = template.name;
    if (isElite) {
      name = generateEliteName(template.name, seed);
    }

    // Size variance
    const sizeScale = template.sizeScale * (0.92 + (Math.sin(seed) * 0.5 + 0.5) * 0.18) * (isElite ? 1.18 : 1);

    const enemy: Enemy = {
      id: createId(),
      templateId: template.id,
      name,
      isElite,
      isBoss,

      x: options.x,
      y: options.y,
      hp: maxHp,
      maxHp,

      lastHitTime: 0,
      lastAttackTime: 0,
      attackAnimationProgress: undefined,
      currentAbilityId: undefined,
      abilityCooldowns: {},
      statusEffects: [],
      threatTable: {},
      aggroTargetId: null,

      aiState: 'idle',
      previousAiState: 'idle',
      stateEnterTime: Date.now(),
      personality,

      isMoving: false,
      animationFrame: 0,
      animationState: 'idle',
      visualSeed: seed,
      sizeScale,
      currentPhaseIndex: 0,

      moveSpeed,
      detectionRange,
      attackRange
    };

    // Initialize ability cooldowns so first use is available after a short delay
    for (const ab of template.abilities) {
      enemy.abilityCooldowns[ab.id] = Date.now() + (ab.cooldownMs * 0.3);
    }

    return enemy;
  }

  /** Convenience: spawn a group with some variance */
  static createGroup(templateId: string, centerX: number, centerY: number, count: number, level = 1): Enemy[] {
    const result: Enemy[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 0.6 + Math.random() * 1.4;
      const e = this.create({
        templateId,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        level,
        visualSeed: (Math.random() * 99999) | 0
      });
      if (e) result.push(e);
    }
    return result;
  }

  /** Create the boss with forced flags */
  static createBoss(x: number, y: number, level = 1): Enemy | null {
    return this.create({
      templateId: 'heart_of_the_hollow',
      x,
      y,
      level,
      forceBoss: true,
      visualSeed: 1337
    });
  }
}
