import type {
  Enemy,
  DamagePacket,
  DamageType,
  StatusEffectInstance,
  StatusEffectId,
  CombatResult,
  CreatureTemplate,
  AbilityDefinition,
  LootContext
} from '../types/combat';
import { getCreatureTemplate } from '../data/creatures';
import type { Player, Gear } from '../types/index';
import { ItemGenerator } from './ItemGenerator';

// =====================================================
// CombatSystem - Central ARPG combat resolution,
// status effects, ability execution, and loot generation
// for the Hollowroot Vale project.
// =====================================================

const STATUS_DEFS: Record<StatusEffectId, { name: string; maxStacks: number; durationMs: number; tickMs?: number; color: {r:number,g:number,b:number} }> = {
  bleed:          { name: 'Bleed',          maxStacks: 5, durationMs: 6000, tickMs: 1000, color: {r:200,g:40,b:40} },
  corrosion:      { name: 'Corrosion',      maxStacks: 4, durationMs: 8000, tickMs: 1200, color: {r:80,g:180,b:60} },
  slow:           { name: 'Slow',           maxStacks: 3, durationMs: 4000, color: {r:100,g:140,b:220} },
  fear:           { name: 'Fear',           maxStacks: 2, durationMs: 3500, color: {r:160,g:80,b:220} },
  root:           { name: 'Rooted',         maxStacks: 1, durationMs: 2500, color: {r:60,g:120,b:40} },
  wound_stain:    { name: 'Wound Stain',    maxStacks: 8, durationMs: 12000, color: {r:140,g:40,b:180} },
  enrage:         { name: 'Enraged',        maxStacks: 1, durationMs: 15000, color: {r:220,g:60,b:30} },
  shadow_veil:    { name: 'Shadow Veil',    maxStacks: 1, durationMs: 4000, color: {r:40,g:20,b:80} },
  regeneration:   { name: 'Regeneration',  maxStacks: 3, durationMs: 8000, tickMs: 1000, color: {r:60,g:200,b:100} },
  fragile:        { name: 'Fragile',        maxStacks: 3, durationMs: 6000, color: {r:220,g:180,b:80} },
  empowered:      { name: 'Empowered',      maxStacks: 1, durationMs: 10000, color: {r:255,g:200,b:50} }
};

export class CombatSystem {
  private itemGenerator: ItemGenerator;

  constructor(itemGenerator: ItemGenerator) {
    this.itemGenerator = itemGenerator;
  }

  // -------------------------------------------------
  // Damage Resolution
  // -------------------------------------------------

  calculatePlayerDamage(player: Player, baseDamage: number, damageType: DamageType = 'physical'): DamagePacket {
    // Simplified - expand with real derived stats later
    const might = 5; // placeholder from progression
    const critChance = 0.08;
    const isCrit = Math.random() < critChance;
    let amount = baseDamage + might * 0.6;
    if (isCrit) amount *= 1.75;

    return {
      amount: Math.round(amount),
      type: damageType,
      isCritical: isCrit,
      sourceId: 'player',
      sourceName: player.name
    };
  }

  applyDamageToEnemy(enemy: Enemy, packet: DamagePacket): CombatResult {
    const template = getCreatureTemplate(enemy.templateId);
    if (!template) {
      return { damageDealt: 0, wasCritical: false, statusesApplied: [], killed: false, overkill: 0 };
    }

    // Resistance
    let resist = template.resistances[packet.type] ?? 0;
    if (template.immunities?.includes(packet.type)) {
      return { damageDealt: 0, wasCritical: packet.isCritical, statusesApplied: [], killed: false, overkill: 0 };
    }

    // Fragile increases damage taken
    const fragileStacks = enemy.statusEffects.find(s => s.id === 'fragile')?.stacks ?? 0;
    const fragileMult = 1 + fragileStacks * 0.12;

    // Enrage on the enemy increases its damage but not its taken damage here

    let finalDamage = Math.round(packet.amount * (1 - resist) * fragileMult);
    finalDamage = Math.max(1, finalDamage);

    enemy.hp -= finalDamage;
    enemy.lastHitTime = Date.now();

    // Apply statuses from the packet
    const applied: StatusEffectInstance[] = [];
    if (packet.appliedStatuses) {
      for (const st of packet.appliedStatuses) {
        this.applyStatus(enemy, st.id, st.stacks, packet.sourceId);
        applied.push(st);
      }
    }

    const killed = enemy.hp <= 0;
    const overkill = killed ? Math.abs(enemy.hp) : 0;
    if (killed) {
      enemy.hp = 0;
      enemy.aiState = 'dead';
      enemy.animationState = 'death';
    }

    return {
      damageDealt: finalDamage,
      wasCritical: packet.isCritical,
      statusesApplied: applied,
      killed,
      overkill
    };
  }

  applyDamageToPlayer(player: Player, packet: DamagePacket): number {
    // Simple for now - expand with defense, wound stain interaction etc.
    const defense = 5;
    const reduction = 100 / (100 + defense * 2);
    let dmg = Math.round(packet.amount * reduction);
    dmg = Math.max(1, dmg);
    player.hp = Math.max(0, player.hp - dmg);
    player.lastHitTime = Date.now();

    // Wound stain from certain types
    if (packet.type === 'shadow' || packet.type === 'corrosive') {
      player.woundStain = Math.min(player.maxWoundStain, player.woundStain + Math.ceil(dmg * 0.3));
    }

    return dmg;
  }

  // -------------------------------------------------
  // Status Effects
  // -------------------------------------------------

  applyStatus(target: Enemy | Player, id: StatusEffectId, stacks = 1, sourceId: string | number = 'unknown') {
    const def = STATUS_DEFS[id];
    if (!def) return;

    // For Enemy
    if ('statusEffects' in target) {
      const existing = target.statusEffects.find(s => s.id === id);
      if (existing) {
        existing.stacks = Math.min(def.maxStacks, existing.stacks + stacks);
        existing.remainingMs = def.durationMs; // refresh
      } else {
        target.statusEffects.push({
          id,
          stacks: Math.min(def.maxStacks, stacks),
          remainingMs: def.durationMs,
          sourceId,
          lastTickTime: Date.now()
        });
      }
    }
    // Player status support can be expanded similarly
  }

  updateStatuses(enemy: Enemy, deltaMs: number) {
    const now = Date.now();
    enemy.statusEffects = enemy.statusEffects.filter(st => {
      st.remainingMs -= deltaMs;
      if (st.remainingMs <= 0) return false;

      const def = STATUS_DEFS[st.id];
      if (def?.tickMs && now - st.lastTickTime >= def.tickMs) {
        st.lastTickTime = now;
        // Tick damage examples
        if (st.id === 'bleed' || st.id === 'corrosion') {
          const tickDmg = Math.round(2 + st.stacks * 1.5);
          enemy.hp = Math.max(0, enemy.hp - tickDmg);
        }
        if (st.id === 'regeneration') {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + 3 * st.stacks);
        }
      }
      return true;
    });
  }

  // -------------------------------------------------
  // Ability Execution Helpers
  // -------------------------------------------------

  canUseAbility(enemy: Enemy, ability: AbilityDefinition): boolean {
    const cd = enemy.abilityCooldowns[ability.id] ?? 0;
    return Date.now() >= cd;
  }

  startAbility(enemy: Enemy, ability: AbilityDefinition) {
    enemy.currentAbilityId = ability.id;
    enemy.animationState = ability.animationKey;
    enemy.attackAnimationProgress = 0;
    enemy.lastAttackTime = Date.now();
    enemy.abilityCooldowns[ability.id] = Date.now() + ability.cooldownMs;
  }

  // -------------------------------------------------
  // Loot Generation tied to creature
  // -------------------------------------------------

  async generateLootForEnemy(enemy: Enemy, playerLevel: number, zoneType: string): Promise<(import('../types/index').Gear | { name: string; quantity: number })[]> {
    const template = getCreatureTemplate(enemy.templateId);
    if (!template) return [];

    const items: (import('../types/index').Gear | { name: string; quantity: number })[] = [];

    // Material drops
    for (const [name, range] of Object.entries(template.drops)) {
      const [min, max] = range;
      const qty = Math.floor(Math.random() * (max - min + 1)) + min;
      if (qty > 0) {
        // Elite bonus
        const finalQty = enemy.isElite ? Math.ceil(qty * 1.4) : qty;
        items.push({ name, quantity: finalQty });
      }
    }

    // Gold
    if (template.goldRange) {
      const [gMin, gMax] = template.goldRange;
      let gold = Math.floor(Math.random() * (gMax - gMin + 1)) + gMin;
      if (enemy.isElite) gold = Math.ceil(gold * 1.6);
      if (enemy.isBoss) gold = Math.ceil(gold * 1.3);
      items.push({ name: 'Gold', quantity: gold });
    }

    // Procedural gear chance
    const gearChance = enemy.isBoss ? 0.95 : enemy.isElite ? 0.65 : 0.35;
    if (Math.random() < gearChance) {
      const gear = await this.itemGenerator.generateItem(playerLevel, zoneType);
      if (gear) {
        // Boost elite/boss gear slightly
        if (enemy.isElite || enemy.isBoss) {
          for (const k of Object.keys(gear.stats)) {
            gear.stats[k] = Math.ceil(gear.stats[k] * (enemy.isBoss ? 1.4 : 1.2));
          }
          gear.level = Math.max(gear.level, playerLevel);
        }
        items.push(gear);
      }
    }

    // Unique drops
    if (template.uniqueDropChance && Math.random() < template.uniqueDropChance && template.uniqueDropTable) {
      // Placeholder - in full system would pull from unique item templates
      items.push({ name: template.uniqueDropTable[0] || 'Mysterious Relic', quantity: 1 });
    }

    return items;
  }

  getStatusColor(id: StatusEffectId) {
    return STATUS_DEFS[id]?.color ?? { r: 200, g: 200, b: 200 };
  }
}
