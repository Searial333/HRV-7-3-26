import type { Enemy, AIState, AbilityDefinition } from '../types/combat';
import { getCreatureTemplate } from '../data/creatures';
import type { Player } from '../types/index';
import { CombatSystem } from './CombatSystem';

// =====================================================
// AIController - Personality-driven advanced AI for
// lifelike ARPG enemies. Handles state transitions,
// ability selection, phase changes, and unique behaviors.
// =====================================================

export class AIController {
  private combat: CombatSystem;

  constructor(combat: CombatSystem) {
    this.combat = combat;
  }

  /**
   * Main per-frame update for a single enemy.
   * Returns true if the enemy died this frame.
   */
  update(enemy: Enemy, player: Player, deltaTime: number, checkCollision: (x: number, y: number) => boolean): boolean {
    if (enemy.aiState === 'dead' || enemy.hp <= 0) {
      enemy.aiState = 'dead';
      return true;
    }

    const template = getCreatureTemplate(enemy.templateId);
    if (!template) return false;

    // Status ticks
    this.combat.updateStatuses(enemy, deltaTime * 1000);

    // Phase check (bosses / elites)
    this.checkPhaseTransition(enemy, template);

    // Core decision
    this.decideState(enemy, player, template);

    // Execute current state
    switch (enemy.aiState) {
      case 'idle':
      case 'wander':
        this.doIdleOrWander(enemy, deltaTime, checkCollision);
        break;
      case 'alert':
      case 'chase':
        this.doChase(enemy, player, deltaTime, checkCollision);
        break;
      case 'combat':
      case 'special':
        this.doCombat(enemy, player, template, deltaTime, checkCollision);
        break;
      case 'flee':
        this.doFlee(enemy, player, deltaTime, checkCollision);
        break;
      case 'phase_transition':
        // brief lock while transitioning
        break;
    }

    // Animation frame
    if (enemy.isMoving) {
      enemy.animationFrame = (enemy.animationFrame + deltaTime * (template.walkAnimSpeed || 5)) % 4;
    }

    return enemy.hp <= 0;
  }

  private checkPhaseTransition(enemy: Enemy, template: ReturnType<typeof getCreatureTemplate>) {
    if (!template?.phases || template.phases.length === 0) return;

    const hpRatio = enemy.hp / enemy.maxHp;
    let newPhase = 0;
    for (let i = 0; i < template.phases.length; i++) {
      if (hpRatio <= template.phases[i].hpThreshold) {
        newPhase = i + 1;
      }
    }

    if (newPhase > enemy.currentPhaseIndex) {
      enemy.currentPhaseIndex = newPhase;
      enemy.aiState = 'phase_transition';
      enemy.stateEnterTime = Date.now();
      enemy.animationState = template.phases[newPhase - 1]?.name?.toLowerCase() || 'phase';

      // Apply phase modifiers
      const phase = template.phases[newPhase - 1];
      if (phase.moveSpeedMult) enemy.moveSpeed *= phase.moveSpeedMult;
      // visual tint handled in renderer via currentPhaseIndex
    }
  }

  private decideState(enemy: Enemy, player: Player, template: NonNullable<ReturnType<typeof getCreatureTemplate>>) {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    const hpRatio = enemy.hp / enemy.maxHp;
    const p = enemy.personality;

    // Fear / low bravery → flee
    if (hpRatio < 0.25 && p.bravery < 0.4 && Math.random() < 0.4) {
      if (enemy.aiState !== 'flee') {
        enemy.previousAiState = enemy.aiState;
        enemy.aiState = 'flee';
        enemy.stateEnterTime = Date.now();
      }
      return;
    }

    // Detection
    if (dist > enemy.detectionRange * 1.4) {
      enemy.aiState = Math.random() < 0.3 ? 'wander' : 'idle';
      enemy.aggroTargetId = null;
      return;
    }

    if (dist > enemy.detectionRange) {
      if (enemy.aiState === 'idle' || enemy.aiState === 'wander') {
        // curiosity can make them investigate
        if (Math.random() < p.curiosity * 0.3) {
          enemy.aiState = 'alert';
        }
      }
      return;
    }

    // In detection range
    enemy.aggroTargetId = 'player';

    if (dist <= enemy.attackRange * 1.1) {
      // Prefer special abilities when available and personality allows
      const canSpecial = this.pickAbility(enemy, template, dist) !== null;
      enemy.aiState = canSpecial && Math.random() < (0.4 + p.aggression * 0.4) ? 'special' : 'combat';
    } else {
      enemy.aiState = 'chase';
    }
  }

  private pickAbility(enemy: Enemy, template: NonNullable<ReturnType<typeof getCreatureTemplate>>, dist: number): AbilityDefinition | null {
    // Prefer phase-overridden abilities if any
    let candidates = template.abilities;
    if (template.phases && enemy.currentPhaseIndex > 0) {
      const phase = template.phases[enemy.currentPhaseIndex - 1];
      if (phase.abilityOverrides) {
        candidates = template.abilities.filter(a => phase.abilityOverrides!.includes(a.id));
      }
    }

    // Filter by cooldown, range, and not basic if we want special
    const usable = candidates.filter(a => {
      if (a.id === 'basic_melee') return false;
      if (!this.combat.canUseAbility(enemy, a)) return false;
      if (a.range > 0 && dist > a.range * 1.2) return false;
      return true;
    });

    if (usable.length === 0) return null;
    // Simple priority: first usable (templates are ordered by designer priority)
    return usable[0];
  }

  private doIdleOrWander(enemy: Enemy, deltaTime: number, checkCollision: (x: number, y: number) => boolean) {
    enemy.isMoving = false;
    enemy.animationState = 'idle';

    if (enemy.aiState === 'wander') {
      if (!enemy.wanderTarget || Math.hypot(enemy.x - enemy.wanderTarget.x, enemy.y - enemy.wanderTarget.y) < 0.3) {
        enemy.wanderTarget = {
          x: enemy.x + (Math.random() - 0.5) * 4,
          y: enemy.y + (Math.random() - 0.5) * 4
        };
      }
      this.moveToward(enemy, enemy.wanderTarget.x, enemy.wanderTarget.y, deltaTime, checkCollision);
    }
  }

  private doChase(enemy: Enemy, player: Player, deltaTime: number, checkCollision: (x: number, y: number) => boolean) {
    enemy.animationState = 'walk';
    this.moveToward(enemy, player.x, player.y, deltaTime, checkCollision);
  }

  private doCombat(enemy: Enemy, player: Player, template: NonNullable<ReturnType<typeof getCreatureTemplate>>, deltaTime: number, checkCollision: (x: number, y: number) => boolean) {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    const ability = this.pickAbility(enemy, template, dist);

    if (ability) {
      // Start casting / attacking
      this.combat.startAbility(enemy, ability);
      enemy.aiState = 'special';
      // Actual damage application happens when attackAnimationProgress crosses threshold
      // (handled in Game or here on progress)
    } else {
      // Basic attack fallback
      const basic = template.abilities.find(a => a.id === template.basicAttackId) || template.abilities[template.abilities.length - 1];
      if (basic && this.combat.canUseAbility(enemy, basic) && dist <= enemy.attackRange) {
        this.combat.startAbility(enemy, basic);
      } else if (dist > enemy.attackRange * 0.9) {
        // close the gap
        this.moveToward(enemy, player.x, player.y, deltaTime, checkCollision);
      } else {
        enemy.isMoving = false;
        enemy.animationState = 'idle';
      }
    }

    // Advance attack animation and apply damage at the right moment
    if (typeof enemy.attackAnimationProgress === 'number' && enemy.currentAbilityId) {
      const ab = template.abilities.find(a => a.id === enemy.currentAbilityId);
      if (ab) {
        const totalTime = ab.castTimeMs + ab.recoveryMs;
        const progress = (Date.now() - enemy.lastAttackTime) / totalTime;
        enemy.attackAnimationProgress = progress;

        // Damage point ~60% through cast+recovery or at end of castTime
        const damagePoint = ab.castTimeMs / totalTime;
        if (progress >= damagePoint && progress < damagePoint + 0.08) {
          // Apply once
          const dmg = (ab.damage?.base || template.baseDamage) * (enemy.isElite ? 1.25 : 1);
          // In full integration Game will call combat.applyDamageToPlayer
          // For now we just mark that the attack landed
          enemy.attackAnimationProgress = damagePoint + 0.1; // prevent re-trigger
        }

        if (progress >= 1) {
          enemy.attackAnimationProgress = undefined;
          enemy.currentAbilityId = undefined;
          enemy.animationState = 'idle';
        }
      }
    }
  }

  private doFlee(enemy: Enemy, player: Player, deltaTime: number, checkCollision: (x: number, y: number) => boolean) {
    enemy.animationState = 'walk';
    // Run away from player
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    const targetX = enemy.x + (dx / len) * 3;
    const targetY = enemy.y + (dy / len) * 3;
    this.moveToward(enemy, targetX, targetY, deltaTime, checkCollision);

    // Recover bravery after some time or distance
    if (Date.now() - enemy.stateEnterTime > 4000 || Math.hypot(dx, dy) > enemy.detectionRange) {
      enemy.aiState = 'idle';
    }
  }

  private moveToward(enemy: Enemy, tx: number, ty: number, deltaTime: number, checkCollision: (x: number, y: number) => boolean) {
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.05) {
      enemy.isMoving = false;
      return;
    }
    const speed = enemy.moveSpeed * deltaTime;
    const mx = (dx / dist) * speed;
    const my = (dy / dist) * speed;

    if (!checkCollision(enemy.x + mx, enemy.y)) enemy.x += mx;
    if (!checkCollision(enemy.x, enemy.y + my)) enemy.y += my;
    enemy.isMoving = true;
  }
}
