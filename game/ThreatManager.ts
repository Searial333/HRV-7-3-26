import type { Enemy } from '../types/combat';
import type { Player } from '../types/index';

/**
 * ThreatManager - Classic ARPG threat / aggro system.
 * Tracks who each enemy is most angry at, supports multi-target,
 * taunt, and pack focus-fire behavior driven by personality.packInstinct.
 */
export class ThreatManager {
  /** Add threat from a source (usually the player) toward an enemy */
  static addThreat(enemy: Enemy, sourceId: string | number, amount: number) {
    if (!enemy.threatTable) enemy.threatTable = {};
    const key = String(sourceId);
    enemy.threatTable[key] = (enemy.threatTable[key] || 0) + amount;

    // Re-evaluate top target
    let topId: string | number | null = null;
    let topThreat = -1;
    for (const [id, threat] of Object.entries(enemy.threatTable)) {
      if (threat > topThreat) {
        topThreat = threat;
        topId = id === 'player' ? 'player' : id;
      }
    }
    enemy.aggroTargetId = topId;
  }

  /** Decay threat over time so old actions fade */
  static decayAll(enemies: Enemy[], deltaSeconds: number) {
    const decay = 1 - (0.15 * deltaSeconds); // ~15% per second
    for (const e of enemies) {
      if (!e.threatTable) continue;
      for (const id of Object.keys(e.threatTable)) {
        e.threatTable[id] *= decay;
        if (e.threatTable[id] < 1) delete e.threatTable[id];
      }
    }
  }

  /** Pack focus: when one enemy is hit, nearby pack-oriented enemies also gain some threat */
  static applyPackThreat(
    hitEnemy: Enemy,
    allEnemies: Enemy[],
    sourceId: string | number,
    amount: number
  ) {
    const packRange = 5.5;
    for (const other of allEnemies) {
      if (other.id === hitEnemy.id || other.hp <= 0) continue;
      if (other.personality.packInstinct < 0.4) continue;
      const dist = Math.hypot(other.x - hitEnemy.x, other.y - hitEnemy.y);
      if (dist < packRange) {
        // Scale by pack instinct
        const share = amount * 0.35 * other.personality.packInstinct;
        this.addThreat(other, sourceId, share);
      }
    }
  }

  /** Force a target (taunt / special abilities) */
  static forceAggro(enemy: Enemy, sourceId: string | number, bonusThreat = 500) {
    this.addThreat(enemy, sourceId, bonusThreat);
    enemy.aggroTargetId = sourceId;
  }

  /** Get current target position helper */
  static getTargetPosition(enemy: Enemy, player: Player): { x: number; y: number } | null {
    if (!enemy.aggroTargetId || enemy.aggroTargetId === 'player') {
      return { x: player.x, y: player.y };
    }
    // Future: support other entities as targets
    return { x: player.x, y: player.y };
  }
}
