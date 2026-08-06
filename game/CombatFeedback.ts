import type { Enemy } from '../types/combat';
import type { GameState } from './GameState';

/**
 * CombatFeedback - Best-practice juiciness layer for ARPG combat.
 * Handles floating combat text variants, hit-stop, screen shake hooks,
 * death bursts, elite callouts, and status popups.
 * Keeps Game.ts clean by centralizing all player-facing feedback.
 */
export class CombatFeedback {
  private state: GameState;
  private shakeIntensity = 0;
  private hitStopUntil = 0;

  constructor(state: GameState) {
    this.state = state;
  }

  // ---------- Floating Combat Text ----------
  showDamage(x: number, y: number, amount: number, isCrit: boolean, isPlayer = false) {
    const color = isPlayer
      ? { r: 255, g: 80, b: 80 }
      : isCrit
        ? { r: 255, g: 220, b: 50 }
        : { r: 255, g: 255, b: 200 };

    this.state.entities.floatingTexts.push({
      text: isCrit ? `${amount}!` : `-${amount}`,
      x, y: y - 0.3,
      startTime: Date.now(),
      duration: isCrit ? 1600 : 1200,
      color
    });
  }

  showHeal(x: number, y: number, amount: number) {
    this.state.entities.floatingTexts.push({
      text: `+${amount}`,
      x, y: y - 0.4,
      startTime: Date.now(),
      duration: 1400,
      color: { r: 100, g: 255, b: 120 }
    });
  }

  showStatus(x: number, y: number, name: string, color: { r: number; g: number; b: number }) {
    this.state.entities.floatingTexts.push({
      text: name,
      x, y: y - 0.7,
      startTime: Date.now(),
      duration: 1800,
      color
    });
  }

  showEliteSpawn(enemy: Enemy) {
    this.state.entities.floatingTexts.push({
      text: `★ ${enemy.name} ★`,
      x: enemy.x, y: enemy.y - 1.2,
      startTime: Date.now(),
      duration: 2800,
      color: { r: 255, g: 180, b: 40 }
    });
  }

  showBossPhase(name: string, x: number, y: number) {
    this.state.entities.floatingTexts.push({
      text: `— ${name} —`,
      x, y: y - 1.5,
      startTime: Date.now(),
      duration: 2500,
      color: { r: 200, g: 80, b: 255 }
    });
  }

  // ---------- Juice ----------
  triggerHitStop(ms = 45) {
    this.hitStopUntil = Date.now() + ms;
  }

  triggerShake(intensity = 6) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  isInHitStop(): boolean {
    return Date.now() < this.hitStopUntil;
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.shakeIntensity <= 0) return { x: 0, y: 0 };
    const ox = (Math.random() - 0.5) * this.shakeIntensity;
    const oy = (Math.random() - 0.5) * this.shakeIntensity;
    this.shakeIntensity *= 0.85;
    if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
    return { x: ox, y: oy };
  }

  // ---------- Death Burst ----------
  spawnDeathParticles(enemy: Enemy, particleType: string = 'spark') {
    const count = enemy.isElite || enemy.isBoss ? 28 : 14;
    for (let i = 0; i < count; i++) {
      this.state.entities.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 4 - 2,
        duration: 900 + Math.random() * 600,
        size: 8 + Math.random() * 16,
        type: particleType as any,
        color: enemy.isElite
          ? { r: 255, g: 180, b: 40 }
          : { r: 180, g: 160, b: 140 },
        startTime: Date.now()
      });
    }
  }

  // ---------- Loot Beam (visual hint) ----------
  spawnLootBeam(x: number, y: number, rarityColor: { r: number; g: number; b: number }) {
    for (let i = 0; i < 8; i++) {
      this.state.entities.particles.push({
        x, y: y - 0.2,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -1.5 - Math.random() * 2,
        duration: 1200,
        size: 6 + Math.random() * 8,
        type: 'spark',
        color: rarityColor,
        startTime: Date.now()
      });
    }
  }
}
