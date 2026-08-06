import { EnemyFactory } from './EnemyFactory';
import type { Enemy } from '../types/combat';
import type { GameState } from './GameState';
import { CombatFeedback } from './CombatFeedback';

/**
 * SpawnHelpers - Centralized, data-driven enemy spawning with
 * best-practice variety, elite chance, zone filtering, and feedback.
 */
export class SpawnHelpers {
  static spawnInDungeon(
    state: GameState,
    feedback: CombatFeedback,
    roomCenterX: number,
    roomCenterY: number,
    count: number,
    floor: number
  ): Enemy[] {
    const theme = state.session.dungeonTheme;
    const level = Math.max(1, state.progression.level + Math.floor(floor / 2));

    // Zone-appropriate pools
    const pools: Record<string, string[]> = {
      Crypts: ['whispering_shade', 'shadow_creeper', 'stone_golem'],
      Grotto: ['shadow_creeper', 'stone_golem', 'weeping_root'],
      Roots:  ['weeping_root', 'stone_golem', 'whispering_shade']
    };
    const pool = pools[theme] || ['weeping_root', 'shadow_creeper'];

    const spawned: Enemy[] = [];
    for (let i = 0; i < count; i++) {
      const templateId = pool[Math.floor(Math.random() * pool.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.8 + Math.random() * 1.8;
      const e = EnemyFactory.create({
        templateId,
        x: roomCenterX + Math.cos(angle) * dist,
        y: roomCenterY + Math.sin(angle) * dist,
        level
      });
      if (e) {
        spawned.push(e);
        if (e.isElite) feedback.showEliteSpawn(e);
      }
    }
    return spawned;
  }

  static spawnAmbush(state: GameState, feedback: CombatFeedback, x: number, y: number, preferred?: string): Enemy | null {
    const id = preferred || (Math.random() < 0.5 ? 'shadow_creeper' : 'weeping_root');
    const e = EnemyFactory.create({
      templateId: id,
      x, y,
      level: state.progression.level
    });
    if (e) {
      if (e.isElite) feedback.showEliteSpawn(e);
      state.entities.floatingTexts.push({
        text: e.isElite ? `Elite Ambush!` : `Ambush!`,
        x, y: y - 0.6,
        startTime: Date.now(),
        duration: 2200,
        color: { r: 255, g: 50, b: 50 }
      });
    }
    return e;
  }

  static spawnBoss(state: GameState, feedback: CombatFeedback, x: number, y: number): Enemy | null {
    const boss = EnemyFactory.createBoss(x, y, state.progression.level + 3);
    if (boss) {
      feedback.showBossPhase('The Heart Awakens', x, y);
      state.session.inBossFight = true;
    }
    return boss;
  }
}
