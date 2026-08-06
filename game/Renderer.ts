
import type { GameState } from './GameState';
import { TILE_SIZE, VIEW_SCALE } from '../data/constants';
import type { AmbientParticle, FloatingText, InteractionTarget, LootDrop, NPC, Particle, Player, Tile, GameObject, GameEffect } from '../types/index';
import type { Enemy as AdvancedEnemy } from '../types/combat';
import { itemTemplates, cropTemplates } from '../data/items';
import { getCreatureTemplate } from '../data/creatures';

// Compatibility: support both old simple Enemy and new AdvancedEnemy
type AnyEnemy = AdvancedEnemy & { type?: string };

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    state: GameState;
    lightCanvas: HTMLCanvasElement;
    lightCtx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement, state: GameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.state = state;
        this.lightCanvas = document.createElement('canvas');
        this.lightCtx = this.lightCanvas.getContext('2d')!;
        this.resize();
    }
    
    resize() {
        this.lightCanvas.width = this.canvas.width;
        this.lightCanvas.height = this.canvas.height;
    }

    render(camera: {x: number, y: number}, deltaTime: number) {
        if (this.state.session.currentGameState === 'farm') {
            this.ctx.fillStyle = '#1a2e05';
        } else {
            this.ctx.fillStyle = '#1a1515';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(camera.x, camera.y);
        this.ctx.scale(VIEW_SCALE, VIEW_SCALE);
        
        const grid = this.state.session.currentGameState === 'farm' ? this.state.world.gameGrid : this.state.world.dungeonGrid;
        const gridWidth = grid?.length || 0;
        const gridHeight = grid[0]?.length || 0;

        const startX = Math.max(0, Math.floor(-camera.x / (TILE_SIZE * VIEW_SCALE)));
        const endX = Math.min(gridWidth, Math.ceil((this.canvas.width - camera.x) / (TILE_SIZE * VIEW_SCALE)));
        const startY = Math.max(0, Math.floor(-camera.y / (TILE_SIZE * VIEW_SCALE)));
        const endY = Math.min(gridHeight, Math.ceil((this.canvas.height - camera.y) / (TILE_SIZE * VIEW_SCALE)));

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (this.state.session.currentGameState === 'farm') this.drawFarmTile(x, y);
                else this.drawDungeonTile(x, y);
            }
        }
        
        const drawQueue = this.buildDrawQueue(startX, endX, startY, endY);
        drawQueue.sort((a, b) => a.sortY - b.sortY);

        drawQueue.forEach((item: any) => {
            switch (item.type) {
                case 'player': this.drawPlayer(); break;
                case 'enemy': this.drawEnemy(item.entity); break;
                case 'npc': this.drawPixelArtNPC(item.entity); break;
                case 'object': this.drawObject(item.x, item.y, item.grid); break;
                case 'crop': this.drawCrop(item.x, item.y); break;
                case 'loot': this.drawLootDrop(item.entity); break;
            }
        });

        this.drawParticles(deltaTime);
        this.drawTargetHighlight();
        this.drawProjectilesAndEffects();
        this.drawTelegraphs(); // NEW: ability telegraphs

        this.ctx.restore();
        
        this.drawLightingOverlay(camera);
        this.drawAmbientParticles(camera);
        this.drawFloatingTexts(camera);
    }

    // =====================================================
    // ENHANCED ENEMY RENDERING - unique, lifelike characters
    // =====================================================
    drawEnemy(enemy: AnyEnemy) {
        const templateId = (enemy as any).templateId || enemy.type || 'weeping_root';
        const template = getCreatureTemplate(templateId);
        const sizeScale = (enemy as any).sizeScale ?? 1.0;
        const visualSeed = (enemy as any).visualSeed ?? 0;
        const isElite = !!(enemy as any).isElite;
        const isBoss = !!(enemy as any).isBoss;
        const currentPhase = (enemy as any).currentPhaseIndex ?? 0;
        const animState = (enemy as any).animationState || 'idle';
        const statusEffects = (enemy as any).statusEffects || [];

        const drawX = enemy.x * TILE_SIZE;
        const drawY = enemy.y * TILE_SIZE;

        // Unique bob based on visualSeed so individuals feel different
        const bobSpeed = 350 + (visualSeed % 200);
        let bob = enemy.isMoving
            ? Math.sin(enemy.animationFrame * Math.PI / 2) * 16 * sizeScale
            : Math.sin(Date.now() / bobSpeed + visualSeed) * 10 * sizeScale;

        this.ctx.save();

        // Hit flash
        if (enemy.lastHitTime && Date.now() - enemy.lastHitTime < 120) {
            this.ctx.filter = 'brightness(2.8) saturate(1.4)';
        }

        // Elite golden aura
        if (isElite) {
            const auraPulse = 0.4 + Math.sin(Date.now() / 280 + visualSeed) * 0.25;
            this.ctx.fillStyle = `rgba(255, 190, 40, ${auraPulse * 0.35})`;
            this.ctx.beginPath();
            this.ctx.ellipse(drawX, drawY + TILE_SIZE * 0.2, 110 * sizeScale, 50 * sizeScale, 0, 0, 7);
            this.ctx.fill();
        }

        // Boss deep purple aura
        if (isBoss) {
            const bossPulse = 0.5 + Math.sin(Date.now() / 400) * 0.3;
            this.ctx.fillStyle = `rgba(140, 40, 200, ${bossPulse * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(drawX, drawY - TILE_SIZE * 0.3, 180 * sizeScale, 0, 7);
            this.ctx.fill();
        }

        // Phase tint (applied via globalAlpha + composite for subtle color shift)
        let phaseTint: { r: number; g: number; b: number } | null = null;
        if (template?.phases && currentPhase > 0) {
            phaseTint = template.phases[currentPhase - 1]?.visualTint || null;
        }

        // Shadow (scaled)
        this.ctx.fillStyle = 'rgba(10, 5, 2, 0.4)';
        this.ctx.beginPath();
        this.ctx.ellipse(drawX, drawY + TILE_SIZE * 0.45 * sizeScale, 88 * sizeScale, 44 * sizeScale, 0, 0, 7);
        this.ctx.fill();

        // Apply size scale around the draw origin
        this.ctx.translate(drawX, drawY);
        this.ctx.scale(sizeScale, sizeScale);
        this.ctx.translate(-drawX, -drawY);

        // Subtle hue shift from visualSeed for individual uniqueness
        if (visualSeed && !isElite) {
            const hueShift = (visualSeed % 40) - 20;
            // We approximate uniqueness by slight color variation in the switch below
        }

        // Draw the creature body based on templateId
        switch (templateId) {
            case 'weeping_root': {
                let lungeOffset = 0;
                if (typeof enemy.attackAnimationProgress === 'number') {
                    lungeOffset = Math.sin(enemy.attackAnimationProgress * Math.PI) * -64;
                }
                const rootY = drawY - 192 + bob + lungeOffset;
                // Variant tint from seed
                const rootBase = visualSeed % 3 === 0 ? '#3a2515' : visualSeed % 3 === 1 ? '#4a2d1d' : '#5a3525';
                this.ctx.fillStyle = rootBase; this.ctx.fillRect(drawX - 32, rootY, 64, 256);
                this.ctx.fillStyle = '#6f452a'; this.ctx.fillRect(drawX - 24, rootY, 16, 256);
                this.ctx.fillStyle = phaseTint ? `rgb(${phaseTint.r},${phaseTint.g},${phaseTint.b})` : '#166534';
                this.ctx.fillRect(drawX - 48, rootY - 32, 96, 48);
                this.ctx.fillStyle = '#ef4444'; this.ctx.fillRect(drawX - 16, rootY + 80, 32, 32);
                // Sap drip when weeping
                if (animState === 'weep' || (enemy.hp / enemy.maxHp < 0.4)) {
                    this.ctx.fillStyle = 'rgba(80, 180, 60, 0.6)';
                    this.ctx.fillRect(drawX - 8, rootY + 120, 6, 30 + Math.sin(Date.now()/200)*10);
                }
                break;
            }
            case 'shadow_creeper': {
                let pounceOffset = 0;
                if (typeof enemy.attackAnimationProgress === 'number') {
                    pounceOffset = Math.sin(enemy.attackAnimationProgress * Math.PI) * -48;
                }
                const bodyAlpha = animState === 'veil' ? 0.25 : 0.95;
                this.ctx.globalAlpha = bodyAlpha;
                this.ctx.fillStyle = phaseTint ? `rgb(${phaseTint.r},${phaseTint.g},${phaseTint.b})` : '#1e1b4b';
                this.ctx.beginPath();
                this.ctx.ellipse(drawX, drawY - 64 + bob + pounceOffset, 96, 64, 0, 0, 7);
                this.ctx.fill();
                this.ctx.fillStyle = '#ef4444';
                const eyeBob = Math.sin(Date.now() / 100 + visualSeed) * 8;
                this.ctx.beginPath(); this.ctx.arc(drawX - 32, drawY - 64 + bob + pounceOffset, 16, 0, 7); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(drawX + 32, drawY - 64 + bob + pounceOffset + eyeBob, 16, 0, 7); this.ctx.fill();
                this.ctx.globalAlpha = 1;
                break;
            }
            case 'stone_golem': {
                const golemY = drawY - 256 + bob;
                const bodyColor = phaseTint ? `rgb(${Math.min(255, phaseTint.r + 40)},${phaseTint.g},${phaseTint.b})` : '#4b5563';
                this.ctx.fillStyle = bodyColor; this.ctx.fillRect(drawX - 96, golemY, 192, 320);
                this.ctx.fillStyle = '#6b7280'; this.ctx.fillRect(drawX - 80, golemY + 16, 160, 288);
                // Core
                this.ctx.fillStyle = currentPhase > 0 ? '#f97316' : '#c084fc';
                const pulse = 1 + Math.sin(Date.now() / 200) * 0.2;
                this.ctx.fillRect(drawX - 32 * pulse, drawY - 96 + bob - 32 * pulse, 64 * pulse, 64 * pulse);
                if (typeof enemy.attackAnimationProgress === 'number') {
                    const swingArc = Math.sin(enemy.attackAnimationProgress * Math.PI);
                    const armAngle = -Math.PI / 4 + swingArc * Math.PI / 1.5;
                    this.ctx.save();
                    this.ctx.translate(drawX + 80, golemY + 80);
                    this.ctx.rotate(armAngle);
                    this.ctx.fillStyle = '#6b7280'; this.ctx.fillRect(0, -24, 128, 48);
                    this.ctx.fillStyle = '#4b5563'; this.ctx.fillRect(100, -32, 48, 64);
                    this.ctx.restore();
                }
                break;
            }
            case 'whispering_shade': {
                let pulseScale = 1;
                if (typeof enemy.attackAnimationProgress === 'number') {
                    pulseScale = 1 + Math.sin(enemy.attackAnimationProgress * Math.PI) * 0.3;
                }
                this.ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 500 + visualSeed) * 0.25;
                this.ctx.fillStyle = phaseTint ? `rgb(${phaseTint.r},${phaseTint.g},${phaseTint.b})` : '#4338ca';
                this.ctx.beginPath();
                this.ctx.moveTo(drawX, drawY - (240 * pulseScale) + bob);
                this.ctx.bezierCurveTo(drawX - (160 * pulseScale), drawY, drawX + (160 * pulseScale), drawY, drawX, drawY - (240 * pulseScale) + bob);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                break;
            }
            case 'heart_of_the_hollow': {
                const hPulse = Math.sin(Date.now() / 500) * TILE_SIZE * 0.1;
                const heartColor = currentPhase >= 2 ? { r: 220, g: 30, b: 90 } : currentPhase === 1 ? { r: 140, g: 40, b: 180 } : { r: 138, g: 43, b: 226 };
                this.drawLightSource(this.ctx, drawX, drawY, TILE_SIZE * 1.5 + hPulse, heartColor);
                this.ctx.fillStyle = `rgb(${heartColor.r},${heartColor.g},${heartColor.b})`;
                this.ctx.beginPath();
                this.ctx.arc(drawX, drawY - TILE_SIZE, TILE_SIZE * 0.8 + hPulse / 2, 0, 7);
                this.ctx.fill();
                break;
            }
            default: {
                // Fallback simple shape
                this.ctx.fillStyle = '#7f1d1d';
                this.ctx.fillRect(drawX - 40, drawY - 80, 80, 120);
            }
        }

        this.ctx.restore(); // restore scale + filter

        // ----- Status Auras (drawn after body so they sit on top) -----
        for (const st of statusEffects) {
            const alpha = 0.25 + Math.sin(Date.now() / 300 + st.stacks) * 0.15;
            let color = 'rgba(200,200,200,';
            switch (st.id) {
                case 'corrosion': color = `rgba(80,180,60,`; break;
                case 'bleed': color = `rgba(200,40,40,`; break;
                case 'fear': color = `rgba(160,80,220,`; break;
                case 'slow': color = `rgba(100,140,220,`; break;
                case 'enrage': color = `rgba(220,60,30,`; break;
                case 'shadow_veil': color = `rgba(40,20,80,`; break;
                case 'wound_stain': color = `rgba(140,40,180,`; break;
            }
            this.ctx.fillStyle = color + alpha + ')';
            this.ctx.beginPath();
            this.ctx.arc(drawX, drawY - TILE_SIZE * 0.3 * sizeScale, 70 * sizeScale + st.stacks * 8, 0, 7);
            this.ctx.fill();
        }

        // ----- Health Bar (improved for elites/bosses) -----
        if (enemy.hp > 0 && templateId !== 'heart_of_the_hollow') {
            const barWidth = TILE_SIZE * (isElite ? 0.7 : 0.5) * sizeScale;
            const barHeight = isElite ? 20 : 16;
            const barX = drawX - barWidth / 2;
            const barY = drawY - TILE_SIZE * 1.1 * sizeScale;

            this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
            this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

            const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
            this.ctx.fillStyle = isElite ? '#f59e0b' : '#b91c1c';
            this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

            // Elite star marker
            if (isElite) {
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.font = 'bold 22px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('★', drawX, barY - 8);
            }
        }

        // Boss name plate
        if (isBoss && enemy.hp > 0) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(drawX - 140, drawY - TILE_SIZE * 2.2, 280, 36);
            this.ctx.fillStyle = '#e9d5ff';
            this.ctx.font = 'bold 24px "Cinzel", serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(enemy.name || 'Heart of the Hollow', drawX, drawY - TILE_SIZE * 2.0);
        }
    }

    // =====================================================
    // TELEGRAPH RENDERING - clear, readable attack warnings
    // =====================================================
    drawTelegraphs() {
        const list = (this.state.session.currentGameState === 'farm'
            ? this.state.entities.enemies
            : this.state.entities.dungeonEnemies) as AnyEnemy[];

        for (const enemy of list) {
            if (!enemy.currentAbilityId || typeof enemy.attackAnimationProgress !== 'number') continue;
            const template = getCreatureTemplate((enemy as any).templateId || enemy.type || '');
            if (!template) continue;
            const ability = template.abilities.find(a => a.id === enemy.currentAbilityId);
            if (!ability || ability.telegraphStyle === 'none') continue;

            const progress = enemy.attackAnimationProgress;
            // Only show during cast window (first portion)
            const castRatio = ability.castTimeMs / (ability.castTimeMs + ability.recoveryMs);
            if (progress > castRatio) continue;

            const alpha = 0.25 + (progress / castRatio) * 0.45;
            const drawX = enemy.x * TILE_SIZE;
            const drawY = enemy.y * TILE_SIZE;

            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 80, 60, ${alpha})`;
            this.ctx.fillStyle = `rgba(255, 60, 40, ${alpha * 0.25})`;
            this.ctx.lineWidth = 10;

            if (ability.telegraphStyle === 'circle' && ability.aoeRadius) {
                const r = ability.aoeRadius * TILE_SIZE * (0.6 + progress * 0.4);
                this.ctx.beginPath();
                this.ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else if (ability.telegraphStyle === 'line') {
                // Simple forward line toward player
                const player = this.state.player;
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                const len = (ability.range || 4) * TILE_SIZE;
                this.ctx.beginPath();
                this.ctx.moveTo(drawX, drawY);
                this.ctx.lineTo(drawX + Math.cos(angle) * len, drawY + Math.sin(angle) * len);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }
    }

    // ---------- Rest of original Renderer (tiles, player, objects, etc.) ----------
    // (Preserved for functionality; only enemy path was heavily upgraded)

    drawLightingOverlay(camera: {x: number, y: number}) {
        const { player, world } = this.state;
        const time = world.gameTime;
        let opacity = 0;
        if (time > 1200 || time < 300) {
            if (time > 1200) opacity = Math.min(0.9, (time - 1200) / 180 * 0.9);
            else opacity = Math.max(0, (300 - time) / 120 * 0.9);
        }
        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = `rgba(10, 5, 30, ${opacity})`;
        this.lightCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.lightCtx.globalCompositeOperation = 'destination-out';
        const playerScreenX = (player.x * TILE_SIZE) * VIEW_SCALE + camera.x;
        const playerScreenY = (player.y * TILE_SIZE - TILE_SIZE * 0.5) * VIEW_SCALE + camera.y;
        this.drawLightSource(this.lightCtx, playerScreenX, playerScreenY, 240 * VIEW_SCALE, { r: 255, g: 255, b: 255}, 0.1);
        if (opacity > 0) {
            const flicker = Math.sin(Date.now() / 150) * 40;
            this.drawLightSource(this.lightCtx, playerScreenX, playerScreenY, (880 + flicker) * VIEW_SCALE, { r: 255, g: 245, b: 220 }, 1.0);
        }
        this.ctx.drawImage(this.lightCanvas, 0, 0);
    }
    
    drawLightSource(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: {r:number, g:number, b:number}, baseAlpha: number = 1.0) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${baseAlpha * 1.0})`);
        gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${baseAlpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    buildDrawQueue(startX: number, endX: number, startY: number, endY: number) {
        const queue: any[] = [];
        const { entities, world, session, player } = this.state;
        const enemyList = session.currentGameState === 'farm' ? entities.enemies : entities.dungeonEnemies;
        enemyList.forEach((e: any) => queue.push({ entity: e, sortY: e.y, type: 'enemy' }));
        if (session.currentGameState === 'farm') {
            entities.npcs.forEach((n: NPC) => queue.push({ entity: n, sortY: n.y, type: 'npc' }));
        }
        entities.lootDrops.forEach((l: LootDrop) => queue.push({ entity: l, sortY: l.y, type: 'loot' }));
        const grid = session.currentGameState === 'farm' ? world.gameGrid : world.dungeonGrid;
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = grid[x]?.[y];
                if (!tile) continue;
                if (tile.object) {
                    let objectSortY = (tile.object.type === 'tree' || tile.object.type === 'scarecrow' || tile.object.type === 'bed' || tile.object.type === 'forge') ? y + 1 : y + 0.5;
                    queue.push({x, y, sortY: objectSortY, type: 'object', grid: session.currentGameState });
                }
                if (tile.crop) queue.push({x, y, sortY: y + 1, type: 'crop'});
            }
        }
        queue.push({ sortY: player.y, type: 'player' });
        return queue;
    }

    drawFarmTile(x: number, y: number) {
        const tile = this.state.world.gameGrid[x]?.[y];
        if (!tile) return;
        const drawX = x * TILE_SIZE, drawY = y * TILE_SIZE;
        const seed = (x * 13 + y * 59);
        const sway = Math.sin(Date.now()/500 + seed/5) * 8;
        this.ctx.fillStyle = '#22340f'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = '#314917'; this.ctx.fillRect(drawX, drawY, TILE_SIZE-4, TILE_SIZE-4);
        this.ctx.fillStyle = 'rgba(26,46,5,0.4)';
        for(let i = 0; i < 3; i++) this.ctx.fillRect(drawX + (seed*(i+1)*3)%TILE_SIZE, drawY + (seed*(i+1)*5)%TILE_SIZE, 12, 12);
        if (tile.isTilled) {
            this.ctx.fillStyle = '#573b26'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
            this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX+8, drawY+8, TILE_SIZE-16, TILE_SIZE-16);
            if (tile.isWatered) { this.ctx.fillStyle = 'rgba(20, 10, 5, 0.4)'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE); }
        } else {
            this.ctx.fillStyle = '#4d7c0f';
            for(let i = 0; i < 4; i++) {
                const rX = (seed * 3 + i * 17) % TILE_SIZE, rY = (seed * 5 + i * 23) % TILE_SIZE;
                this.ctx.beginPath(); this.ctx.moveTo(drawX + rX, drawY + rY);
                this.ctx.quadraticCurveTo(drawX + rX + sway, drawY + rY - 32, drawX + rX + 8, drawY + rY); this.ctx.fill();
            }
        }
    }

    drawDungeonTile(x: number, y: number) {
        const tile = this.state.world.dungeonGrid[x]?.[y];
        if (!tile) return;
        const drawX = x * TILE_SIZE, drawY = y * TILE_SIZE;
        const theme = this.state.session.dungeonTheme;
        const baseColors: any = { Crypts: ['#3a352e', '#4a413a'], Grotto: ['#2c3e50', '#34495e'], Roots: ['#4a2d1d', '#573b26'] };
        this.ctx.fillStyle = baseColors[theme][0]; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = baseColors[theme][1]; this.ctx.fillRect(drawX + 4, drawY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        if (tile.type === 'wall') {
            this.ctx.fillStyle = '#2e2824'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
            this.ctx.fillStyle = '#3a352e'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE-8);
        }
    }

    drawCrop(x: number, y: number) {
        const crop = this.state.world.gameGrid[x]?.[y]?.crop;
        if (!crop) return;
        const stage = Math.min(1, crop.stage / crop.growthTime);
        const drawX = x * TILE_SIZE, drawY = y * TILE_SIZE;
        this.ctx.fillStyle = '#4a2d1d';
        this.ctx.beginPath(); this.ctx.ellipse(drawX + TILE_SIZE/2, drawY + TILE_SIZE*0.9, TILE_SIZE*0.2, TILE_SIZE*0.1, 0, 0, 7); this.ctx.fill();
        if (stage > 0.3) {
            this.ctx.fillStyle = '#22c55e';
            this.ctx.fillRect(drawX + TILE_SIZE/2 - 8, drawY + TILE_SIZE*0.5, 16, TILE_SIZE*0.4);
        }
    }
    
    drawObject(x: number, y: number, gridType: string) {
        const grid = gridType === 'farm' ? this.state.world.gameGrid : this.state.world.dungeonGrid;
        const obj = grid[x]?.[y]?.object;
        if (!obj) return;
        switch(obj.type) {
            case 'tree': this.drawPixelArtTree(x * TILE_SIZE, y * TILE_SIZE, obj, x, y); break;
            case 'rock': this.drawPixelArtRock(x * TILE_SIZE, y * TILE_SIZE, obj, x, y); break;
            case 'bush': this.drawPixelArtBush(x * TILE_SIZE, y * TILE_SIZE, obj.variant || 'valeberry', x, y); break;
            case 'scarecrow': this.drawPixelArtScarecrow(x * TILE_SIZE, y * TILE_SIZE, x, y); break;
            case 'forge': this.drawForge(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'portal': this.drawPortal(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'bed': this.drawBed(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'stairs': this.drawStairs(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'exit': this.drawExit(x * TILE_SIZE, y * TILE_SIZE); break;
        }
    }

    drawPixelArtTree(x: number, y: number, obj: GameObject, gridX: number, _gridY: number) {
        const integrity = obj.integrity ?? 3;
        const treeX = x, treeY = y - TILE_SIZE;
        const sway = Math.sin(Date.now()/800 + gridX) * 12;
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)'; this.ctx.beginPath(); this.ctx.ellipse(treeX+128, treeY+448, 120, 60, 0, 0, 7); this.ctx.fill();
        this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(treeX+96, treeY+256, 64, 192);
        this.ctx.fillStyle = '#166534'; this.ctx.beginPath(); this.ctx.arc(treeX+128+sway, treeY+192, 160*(integrity/3), 0, 7); this.ctx.fill();
    }

    drawPixelArtRock(x: number, y: number, obj: GameObject, _gx: number, _gy: number) {
        const rockX = x+32, rockY = y+64;
        this.ctx.fillStyle = '#4b5563';
        this.ctx.beginPath(); this.ctx.moveTo(rockX, rockY+160); this.ctx.lineTo(rockX+192, rockY+160); this.ctx.lineTo(rockX+160, rockY); this.ctx.lineTo(rockX+32, rockY-32); this.ctx.closePath(); this.ctx.fill();
    }

    drawPixelArtBush(x: number, y: number, variant: string, gridX: number, _gy: number) {
        const bushX = x, bushY = y+64;
        const sway = Math.sin(Date.now()/600 + gridX/2) * 8;
        this.ctx.fillStyle = '#14532d'; this.ctx.beginPath(); this.ctx.ellipse(bushX+128, bushY+128, 120, 96, 0, 0, 7); this.ctx.fill();
        this.ctx.fillStyle = '#22c55e'; this.ctx.beginPath(); this.ctx.ellipse(bushX+104+sway, bushY+104, 80, 64, 0.3, 0, 7); this.ctx.fill();
    }

    drawPlayer() {
        const { player } = this.state;
        const drawX = player.x * TILE_SIZE, drawY = player.y * TILE_SIZE;
        const now = Date.now();
        const isAttacking = (now - player.lastAttackTime < 250) && (player.tool === 'blade' || player.tool === 'axe' || player.tool === 'pickaxe');
        let yBob = player.isMoving ? Math.sin(player.animationFrame * Math.PI / 2) * 16 : Math.sin(Date.now()/300)*8;
        this.ctx.save();
        if (player.lastHitTime && now - player.lastHitTime < 150) this.ctx.filter = 'brightness(3)';
        this.ctx.fillStyle = 'rgba(10,5,2,0.3)'; this.ctx.beginPath(); this.ctx.ellipse(drawX, drawY+120, 80, 40, 0, 0, 7); this.ctx.fill();
        const y = drawY - TILE_SIZE*0.7 + yBob;
        this.ctx.fillStyle = '#1e40af'; this.ctx.fillRect(drawX-56, y+88, 112, 112);
        this.ctx.fillStyle = '#e6c6a7'; this.ctx.fillRect(drawX-40, y+32, 80, 80);
        this.ctx.fillStyle = '#3a2d1d'; this.ctx.fillRect(drawX-48, y+16, 96, 48);
        this.ctx.restore();
    }

    drawPixelArtNPC(npc: NPC) {
        const drawX = npc.x * TILE_SIZE, drawY = npc.y * TILE_SIZE;
        const bob = Math.sin(Date.now()/450) * 8;
        this.ctx.fillStyle = 'rgba(10,5,2,0.3)'; this.ctx.beginPath(); this.ctx.ellipse(drawX, drawY+120, 80, 40, 0, 0, 7); this.ctx.fill();
        this.ctx.fillStyle = npc.id === 'elara' ? '#064e3b' : '#4b5563';
        this.ctx.fillRect(drawX-48, drawY - TILE_SIZE*0.7 + bob + 80, 96, 160);
    }

    drawLootDrop(loot: LootDrop) {
        const drawX = loot.x * TILE_SIZE, drawY = loot.y * TILE_SIZE;
        const bob = Math.sin(Date.now()/250) * 16;
        this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX-48, drawY-80+bob, 96, 96);
        this.ctx.fillStyle = '#facc15'; this.ctx.fillRect(drawX-32, drawY-88+bob, 64, 16);
    }

    drawParticles(deltaTime: number) {
        const now = Date.now();
        this.state.entities.particles = this.state.entities.particles.filter((p: Particle) => {
            const life = (now - p.startTime) / p.duration;
            if (life > 1) return false;
            const currentX = p.x + p.vx * life;
            const currentY = p.y + p.vy * life - life * life * 80;
            this.ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${1-life})`;
            if (p.type === 'spark') this.ctx.fillRect(currentX*TILE_SIZE - p.size/2, currentY*TILE_SIZE - p.size/2, p.size, p.size);
            else { this.ctx.beginPath(); this.ctx.arc(currentX*TILE_SIZE, currentY*TILE_SIZE, p.size, 0, 7); this.ctx.fill(); }
            return true;
        });
    }

    updateAmbientParticles(deltaTime: number, camera: {x:number,y:number}) {
        const { entities, world, session } = this.state;
        const now = Date.now();
        entities.ambientParticles = entities.ambientParticles.filter(p => now < p.endTime);
        if (Math.random() < 0.15) {
            const w = this.canvas.width / VIEW_SCALE / TILE_SIZE;
            const h = this.canvas.height / VIEW_SCALE / TILE_SIZE;
            const wx = -camera.x / (TILE_SIZE * VIEW_SCALE) + Math.random()*w;
            const wy = -camera.y / (TILE_SIZE * VIEW_SCALE) + Math.random()*h;
            if (session.currentGameState === 'farm' && (world.gameTime > 1200 || world.gameTime < 300)) {
                entities.ambientParticles.push({ x: wx, y: wy, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, startTime: now, endTime: now+6000, type: 'firefly', color: {r:220,g:255,b:180} });
            }
        }
    }

    drawAmbientParticles(camera: {x:number,y:number}) {
        const now = Date.now();
        this.state.entities.ambientParticles.forEach(p => {
            const life = (now - p.startTime) / (p.endTime - p.startTime);
            const alpha = Math.sin(life * Math.PI);
            const sx = p.x * TILE_SIZE * VIEW_SCALE + camera.x;
            const sy = p.y * TILE_SIZE * VIEW_SCALE + camera.y;
            this.ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha*0.5})`;
            this.ctx.beginPath(); this.ctx.arc(sx, sy, 10, 0, 7); this.ctx.fill();
        });
    }

    drawTargetHighlight() {
        const target = this.state.player.movementTarget || this.state.player.interactionTarget;
        if (!target) return;
        let hx = 0, hy = 0;
        if ('type' in target) {
            if (target.type === 'object') { hx = (target.x+0.5)*TILE_SIZE; hy = (target.y+0.5)*TILE_SIZE; }
            else { hx = target.entity.x*TILE_SIZE; hy = target.entity.y*TILE_SIZE; }
        } else { hx = target.x*TILE_SIZE; hy = target.y*TILE_SIZE; }
        const angle = (Date.now()/200) % (Math.PI*2);
        this.ctx.strokeStyle = 'rgba(255,255,150,0.9)'; this.ctx.lineWidth = 12;
        this.ctx.setLineDash([40,20]); this.ctx.beginPath(); this.ctx.arc(hx, hy, 128, angle, angle+Math.PI*1.8); this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawProjectilesAndEffects() {
        const now = Date.now();
        this.state.entities.effects = this.state.entities.effects.filter(e => {
            const life = (now - e.startTime) / e.duration;
            if (life > 1) return false;
            if (e.type === 'plant_ripple') {
                this.ctx.strokeStyle = `rgba(163,230,53,${1-life})`; this.ctx.lineWidth = 12*(1-life);
                this.ctx.beginPath(); this.ctx.arc(e.x*TILE_SIZE + TILE_SIZE/2, e.y*TILE_SIZE + TILE_SIZE/2, life*TILE_SIZE*0.4, 0, 7); this.ctx.stroke();
            }
            return true;
        });
    }

    drawFloatingTexts(camera: {x:number,y:number}) {
        const now = Date.now();
        this.state.entities.floatingTexts = this.state.entities.floatingTexts.filter(ft => {
            const life = (now - ft.startTime) / ft.duration;
            if (life > 1) return false;
            const yOff = -life * 80;
            const alpha = Math.sin((1-life)*Math.PI);
            const dx = ft.x * TILE_SIZE * VIEW_SCALE + camera.x;
            const dy = ft.y * TILE_SIZE * VIEW_SCALE + camera.y + yOff;
            this.ctx.font = 'bold 36px "Cinzel", serif';
            this.ctx.fillStyle = `rgba(${ft.color.r},${ft.color.g},${ft.color.b},${alpha})`;
            this.ctx.strokeStyle = `rgba(0,0,0,${alpha*0.8})`; this.ctx.lineWidth = 6;
            this.ctx.textAlign = 'center'; this.ctx.strokeText(ft.text, dx, dy); this.ctx.fillText(ft.text, dx, dy);
            return true;
        });
    }

    drawPixelArtScarecrow(x: number, y: number, gridX: number, _gy: number) {
        const sway = Math.sin(Date.now()/700 + gridX) * 8;
        this.ctx.fillStyle = '#5a3d2d'; this.ctx.fillRect(x+120, y - TILE_SIZE*0.5, 24, 320);
        this.ctx.fillStyle = '#d2b48c'; this.ctx.fillRect(x+88+sway, y - TILE_SIZE*0.5 - 32, 80, 80);
    }
    drawForge(x: number, y: number) {
        this.ctx.fillStyle = '#4b5563'; this.ctx.fillRect(x, y+64, TILE_SIZE, TILE_SIZE*0.75);
        const pulse = 0.5 + Math.sin(Date.now()/200)*0.5;
        this.ctx.fillStyle = `rgba(239,68,68,${pulse})`; this.ctx.fillRect(x+64, y+64, 128, 32);
    }
    drawBed(x: number, y: number) {
        this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(x+16, y + TILE_SIZE*0.5, TILE_SIZE-32, TILE_SIZE*0.4);
        this.ctx.fillStyle = '#7f1d1d'; this.ctx.fillRect(x+24, y + TILE_SIZE*0.65, TILE_SIZE-48, TILE_SIZE*0.25);
    }
    drawPortal(x: number, y: number) {
        const cx = x + TILE_SIZE/2, cy = y + TILE_SIZE/2;
        this.ctx.fillStyle = 'rgba(124,58,237,0.6)'; this.ctx.beginPath(); this.ctx.arc(cx, cy, TILE_SIZE*0.4, 0, 7); this.ctx.fill();
    }
    drawStairs(x: number, y: number) {
        this.ctx.fillStyle = '#1c1917'; this.ctx.fillRect(x+32, y+32, TILE_SIZE-64, TILE_SIZE-64);
    }
    drawExit(x: number, y: number) {
        this.ctx.fillStyle = 'rgba(180,220,255,0.7)'; this.ctx.beginPath(); this.ctx.arc(x+TILE_SIZE/2, y+TILE_SIZE/2, TILE_SIZE*0.3, 0, 7); this.ctx.fill();
    }
}
