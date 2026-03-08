

import type { GameState } from './GameState';
import { TILE_SIZE, VIEW_SCALE } from '../data/constants';
import type { AmbientParticle, Enemy, FloatingText, InteractionTarget, LootDrop, NPC, Particle, Player, Tile, GameObject, GameEffect } from '../types/index';
import { itemTemplates, cropTemplates } from '../data/items';

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
        // 1. Clear main canvas
        if (this.state.session.currentGameState === 'farm') {
            this.ctx.fillStyle = '#1a2e05'; // Darker forest green
        } else {
            this.ctx.fillStyle = '#1a1515';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Render Scaled World
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
                if (this.state.session.currentGameState === 'farm') {
                    this.drawFarmTile(x, y);
                } else {
                    this.drawDungeonTile(x, y);
                }
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
        this.drawAttackAnimation();
        this.drawProjectilesAndEffects();

        this.ctx.restore();
        
        // 3. Render overlays (lighting, particles, text) in screen space
        this.drawLightingOverlay(camera);
        this.drawAmbientParticles(camera);
        this.drawFloatingTexts(camera);
    }
    
    drawLightingOverlay(camera: {x: number, y: number}) {
        const { player, world, entities } = this.state;
        const time = world.gameTime;
        let opacity = 0;
        
        // Night time between 8 PM (1200) and 5 AM (300)
        if (time > 1200 || time < 300) {
            if (time > 1200) { // Evening fade in
                opacity = Math.min(0.9, (time - 1200) / 180 * 0.9); // Darker
            } else { // Morning fade out
                opacity = Math.max(0, (300 - time) / 120 * 0.9);
            }
        }
    
        // Fill canvas with darkness
        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = `rgba(10, 5, 30, ${opacity})`;
        this.lightCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
        // "Punch out" light sources
        this.lightCtx.globalCompositeOperation = 'destination-out';
    
        // Always draw a faint ambient light around the player
        const playerScreenX = (player.x * TILE_SIZE) * VIEW_SCALE + camera.x;
        const playerScreenY = (player.y * TILE_SIZE - TILE_SIZE * 0.5) * VIEW_SCALE + camera.y;
        this.drawLightSource(this.lightCtx, playerScreenX, playerScreenY, 240 * VIEW_SCALE, { r: 255, g: 255, b: 255}, 0.1);


        if (opacity > 0) {
            // Player main light source
            const flicker = Math.sin(Date.now() / 150) * 40;
            this.drawLightSource(this.lightCtx, playerScreenX, playerScreenY, (880 + flicker) * VIEW_SCALE, { r: 255, g: 245, b: 220 }, 1.0);

            // Other light sources in the world
            const grid = this.state.session.currentGameState === 'farm' ? this.state.world.gameGrid : this.state.world.dungeonGrid;
            const startX = Math.max(0, Math.floor(-camera.x / (TILE_SIZE * VIEW_SCALE)));
            const endX = Math.min(grid.length, Math.ceil((this.canvas.width - camera.x) / (TILE_SIZE * VIEW_SCALE)));
            const startY = Math.max(0, Math.floor(-camera.y / (TILE_SIZE * VIEW_SCALE)));
            const endY = Math.min(grid[0].length, Math.ceil((this.canvas.height - camera.y) / (TILE_SIZE * VIEW_SCALE)));
            
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const tile = grid[x]?.[y];
                    if (!tile) continue;
                    let lightX = (x * TILE_SIZE + TILE_SIZE/2) * VIEW_SCALE + camera.x;
                    let lightY = (y * TILE_SIZE + TILE_SIZE/2) * VIEW_SCALE + camera.y;

                    if (tile.object?.type === 'forge') {
                        const forgeFlicker = Math.sin(Date.now() / 100 + x) * 32;
                        this.drawLightSource(this.lightCtx, lightX, lightY, (720 + forgeFlicker) * VIEW_SCALE, { r: 255, g: 140, b: 50 }, 1.0);
                    }
                    if (tile.object?.type === 'bush' && tile.object.variant === 'moonglow') {
                         this.drawLightSource(this.lightCtx, lightX, lightY + TILE_SIZE * 0.25 * VIEW_SCALE, 320 * VIEW_SCALE, { r: 180, g: 200, b: 255 }, 1.0);
                    }
                }
            }
        }
    
        // Draw the lightmap onto the main canvas
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

        enemyList.forEach((e: Enemy) => queue.push({ entity: e, sortY: e.y, type: 'enemy' }));
        if(session.currentGameState === 'farm') {
            entities.npcs.forEach((n: NPC) => queue.push({ entity: n, sortY: n.y, type: 'npc' }));
        }
        entities.lootDrops.forEach((l: LootDrop) => queue.push({ entity: l, sortY: l.y, type: 'loot' }));

        const grid = session.currentGameState === 'farm' ? world.gameGrid : world.dungeonGrid;
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = grid[x]?.[y];
                if (!tile) continue;

                if (tile.object) {
                    let objectSortY;
                    switch(tile.object.type) {
                        case 'tree': case 'scarecrow': case 'bed': case 'forge': case 'mausoleum':
                            objectSortY = y + 1; break;
                        default: objectSortY = y + 0.5;
                    }
                    queue.push({x, y, sortY: objectSortY, type: 'object', grid: session.currentGameState });
                }
                if (tile.crop) {
                    queue.push({x, y, sortY: y + 1, type: 'crop'});
                }
            }
        }
        queue.push({ sortY: player.y, type: 'player' });
        return queue;
    }

    drawFarmTile(x: number, y: number) {
        const tile = this.state.world.gameGrid[x]?.[y];
        if (!tile) return;
        
        const drawX = x * TILE_SIZE;
        const drawY = y * TILE_SIZE;
        const seed = (x * 13 + y * 59);
        const sway = Math.sin(Date.now()/500 + seed/5) * 8;
        
        // Base ground
        this.ctx.fillStyle = '#22340f'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = '#314917'; this.ctx.fillRect(drawX, drawY, TILE_SIZE-4, TILE_SIZE-4);

        // Texture
        this.ctx.fillStyle = 'rgba(26,46,5,0.4)';
        for(let i = 0; i < 3; i++) {
            this.ctx.fillRect(drawX + (seed*(i+1)*3)%TILE_SIZE, drawY + (seed*(i+1)*5)%TILE_SIZE, 12, 12);
        }

        if (tile.isTilled) {
            this.ctx.fillStyle = '#573b26'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
            this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX+8, drawY+8, TILE_SIZE-16, TILE_SIZE-16);
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for(let i = 32; i < TILE_SIZE; i += 64) { this.ctx.fillRect(drawX, drawY + i, TILE_SIZE, 24); }
             if (tile.isWatered) {
                this.ctx.fillStyle = 'rgba(20, 10, 5, 0.4)'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
            }
        } else {
             // Animated Grass Blades
            this.ctx.fillStyle = '#4d7c0f';
            for(let i = 0; i < 4; i++) {
                const rX = (seed * 3 + i * 17) % TILE_SIZE;
                const rY = (seed * 5 + i * 23) % TILE_SIZE;
                this.ctx.beginPath();
                this.ctx.moveTo(drawX + rX, drawY + rY);
                this.ctx.quadraticCurveTo(drawX + rX + sway, drawY + rY - 32, drawX + rX + 8, drawY + rY);
                this.ctx.fill();
            }
        }
        
        // Dropped items and ritual glyphs
        if (tile.droppedItem) {
            this.drawDroppedItem(drawX, drawY, tile.droppedItem.name);
        }
        if (tile.ritualGlyph) {
            this.drawRitualGlyph(drawX, drawY, tile.ritualGlyph);
        }
    }

    drawDungeonTile(x: number, y: number) {
        const tile = this.state.world.dungeonGrid[x]?.[y];
        if (!tile) return;
        const drawX = x * TILE_SIZE;
        const drawY = y * TILE_SIZE;
        const seed = (x * 13 + y * 59);
        const theme = this.state.session.dungeonTheme;

        // Base color
        const baseColors = {
            Crypts: ['#3a352e', '#4a413a'],
            Grotto: ['#2c3e50', '#34495e'],
            Roots: ['#4a2d1d', '#573b26']
        };
        this.ctx.fillStyle = baseColors[theme][0]; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = baseColors[theme][1]; this.ctx.fillRect(drawX + 4, drawY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

        // Theme-specific details
        if (tile.type === 'floor') {
            switch(theme) {
                case 'Crypts':
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)'; this.ctx.lineWidth = 4;
                    if (seed % 10 < 3) { // 30% chance of cracks
                        this.ctx.beginPath(); this.ctx.moveTo(drawX + (seed*3)%TILE_SIZE, drawY + (seed*5)%TILE_SIZE);
                        this.ctx.lineTo(drawX + (seed*7)%TILE_SIZE, drawY + (seed*11)%TILE_SIZE); this.ctx.stroke();
                    }
                    if (seed % 20 < 1) { // 5% chance of bones
                        this.ctx.fillStyle = 'rgba(215, 207, 178, 0.7)'; this.ctx.fillRect(drawX + 64, drawY+128, 128, 64);
                    }
                    break;
                case 'Grotto':
                    if (seed % 10 < 3) { // 30% chance of water puddle
                        this.ctx.fillStyle = 'rgba(52, 144, 220, 0.4)'; this.ctx.beginPath(); this.ctx.ellipse(drawX + TILE_SIZE/2, drawY + TILE_SIZE/2, TILE_SIZE/3, TILE_SIZE/4, (seed % 10)*0.1, 0, 7); this.ctx.fill();
                    }
                    break;
                case 'Roots':
                     if (seed % 10 < 4) { // 40% chance of roots
                        this.ctx.strokeStyle = '#3a2d1d'; this.ctx.lineWidth = 12 + (seed % 5)*4;
                        this.ctx.beginPath(); this.ctx.moveTo(drawX, drawY + seed%TILE_SIZE); this.ctx.quadraticCurveTo(drawX + TILE_SIZE/2, drawY + (seed*3)%TILE_SIZE, drawX + TILE_SIZE, drawY + (seed*5)%TILE_SIZE); this.ctx.stroke();
                     }
                    break;
            }
        } else if (tile.type === 'wall') {
            // Wall face
            this.ctx.fillStyle = '#2e2824'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
            this.ctx.fillStyle = '#3a352e'; this.ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE-8);
            
            // Wall details based on theme
             switch(theme) {
                case 'Crypts':
                    this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    for(let i = 0; i < TILE_SIZE; i += 64) { this.ctx.fillRect(drawX, drawY + i, TILE_SIZE, 4); this.ctx.fillRect(drawX + (i % 128 === 0 ? 0 : TILE_SIZE/2), drawY + i, 4, 64); }
                    if(seed % 15 < 1) { this.ctx.fillStyle = '#78350f'; this.ctx.fillRect(drawX + 32, drawY + 64, 192, 128); } // Wooden plank
                    break;
                case 'Grotto':
                    if (seed % 10 < 5) { // Dripping water
                         const dripProg = (Date.now() / 1000 + seed) % 2;
                         if (dripProg > 1) {
                            this.ctx.fillStyle = `rgba(120, 180, 255, ${2 - dripProg})`;
                            this.ctx.fillRect(drawX + seed % TILE_SIZE, drawY, 8, dripProg * TILE_SIZE);
                         }
                    }
                    break;
                case 'Roots':
                    if (seed % 10 < 3) {
                         this.ctx.strokeStyle = '#3a2d1d'; this.ctx.lineWidth = 24; this.ctx.beginPath(); this.ctx.moveTo(drawX + seed % TILE_SIZE, drawY); this.ctx.lineTo(drawX + (seed*3) % TILE_SIZE, drawY + TILE_SIZE); this.ctx.stroke();
                    }
                    break;
             }
        }
    
        // Wall top/shadow
        const tileBelow = this.state.world.dungeonGrid[x]?.[y + 1];
        if (tile.type === 'wall' && tileBelow && tileBelow.type === 'floor') {
            // Wall top
            this.ctx.fillStyle = '#2e2824'; this.ctx.fillRect(drawX, y * TILE_SIZE, TILE_SIZE, 32);
            // Shadow cast on floor
            const grad = this.ctx.createLinearGradient(drawX, (y+1)*TILE_SIZE, drawX, (y+1)*TILE_SIZE + 96);
            grad.addColorStop(0, 'rgba(0,0,0,0.5)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(drawX, (y+1)*TILE_SIZE, TILE_SIZE, 96);
        }
    }

    drawCrop(x: number, y: number) {
        const crop = this.state.world.gameGrid[x][y].crop;
        if (!crop) return;

        const stage = Math.min(1, crop.stage / crop.growthTime);
        const drawX = x * TILE_SIZE;
        const drawY = y * TILE_SIZE;
        
        // Stage 0: Planted seed mound
        this.ctx.fillStyle = '#4a2d1d'; // dark brown
        this.ctx.beginPath();
        this.ctx.ellipse(drawX + TILE_SIZE / 2, drawY + TILE_SIZE * 0.9, TILE_SIZE * 0.2, TILE_SIZE * 0.1, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (stage > 0.05) { // Stage 1: Sprout
            const sproutHeight = Math.min(TILE_SIZE * 0.4, (stage - 0.05) * TILE_SIZE * 5);
            this.ctx.fillStyle = '#65a30d'; // lime green
            this.ctx.beginPath();
            this.ctx.moveTo(drawX + TILE_SIZE / 2 - 8, drawY + TILE_SIZE * 0.85);
            this.ctx.quadraticCurveTo(drawX + TILE_SIZE/2, drawY + TILE_SIZE * 0.85 - sproutHeight, drawX + TILE_SIZE / 2 + 8, drawY + TILE_SIZE * 0.85);
            this.ctx.fill();
        }

        if (stage > 0.3) { // Stage 2: Growing plant (stem and leaves)
            const plantHeight = Math.min(TILE_SIZE * 0.6, (stage - 0.3) * TILE_SIZE * 1.2);
            // Stem
            this.ctx.fillStyle = '#22c55e'; // green
            this.ctx.fillRect(drawX + TILE_SIZE / 2 - 8, drawY + TILE_SIZE * 0.8 - plantHeight, 16, plantHeight);
            
            // Leaves
            const leafCount = Math.floor(stage * 4);
            this.ctx.fillStyle = '#166534'; // dark green
            for(let i=0; i<leafCount; i++) {
                const leafSide = (i % 2 === 0) ? -1 : 1;
                const leafY = drawY + TILE_SIZE * 0.7 - (i/4) * plantHeight * 0.8;
                this.ctx.beginPath();
                this.ctx.ellipse(drawX + TILE_SIZE/2 + (leafSide * 40), leafY, 40, 20, leafSide * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        if (stage >= 1) { // Stage 3: Mature, harvest-ready crop with "fruit"
            let hash = 0;
            for (let i = 0; i < crop.name.length; i++) {
                hash = crop.name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            const fruitColor = "#" + "00000".substring(0, 6 - c.length) + c;

            this.ctx.fillStyle = fruitColor;
            
            const plantTopY = drawY + TILE_SIZE * 0.2;
            const fruitSize = TILE_SIZE * 0.15;
            
            this.ctx.beginPath();
            this.ctx.arc(drawX + TILE_SIZE / 2, plantTopY, fruitSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(drawX + TILE_SIZE / 2 - fruitSize, plantTopY + fruitSize * 0.8, fruitSize * 0.8, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(drawX + TILE_SIZE / 2 + fruitSize, plantTopY + fruitSize * 0.8, fruitSize * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawObject(x: number, y: number, gridType: string) {
        const grid = gridType === 'farm' ? this.state.world.gameGrid : this.state.world.dungeonGrid;
        const obj = grid[x]?.[y]?.object;
        if (!obj) return;

        switch(obj.type) {
            case 'tree': this.drawPixelArtTree(x * TILE_SIZE, y * TILE_SIZE, obj, x, y); break;
            case 'rock': this.drawPixelArtRock(x * TILE_SIZE, y * TILE_SIZE, obj, x, y); break;
            case 'bush': this.drawPixelArtBush(x * TILE_SIZE, y * TILE_SIZE, obj.variant!, x, y); break;
            case 'scarecrow': this.drawPixelArtScarecrow(x * TILE_SIZE, y * TILE_SIZE, x, y); break;
            case 'forge': this.drawForge(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'portal': this.drawPortal(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'bed': this.drawBed(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'stairs': this.drawStairs(x * TILE_SIZE, y * TILE_SIZE); break;
            case 'exit': this.drawExit(x * TILE_SIZE, y * TILE_SIZE); break;
            default: break;
        }
    }
    
    drawPixelArtTree(x: number, y: number, obj: GameObject, gridX: number, gridY: number) {
        const variant = obj.variant || 'oak';
        const integrity = obj.integrity ?? 3;
        const maxIntegrity = obj.maxIntegrity ?? 3;
        const integrityRatio = integrity / maxIntegrity;

        const treeX = x;
        const treeY = y - TILE_SIZE;
        const sway = Math.sin(Date.now()/800 + gridX) * 12;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath(); this.ctx.ellipse(treeX + 128, treeY + 448, 120, 60, 0, 0, 7); this.ctx.fill();

        let trunkColor = '#4a2d1d', trunkHighlight = '#6f452a';
        let leafColors = ['#14532d', '#166534', '#22c55e', '#a3e635'];
        
        switch (variant) {
            case 'pine': leafColors = ['#1a2e05', '#14532d', '#166534', '#15803d']; break;
            case 'birch': trunkColor = '#d1d5db'; trunkHighlight = '#f9fafb'; leafColors = ['#4d7c0f', '#65a30d', '#a3e635', '#bef264']; break;
            case 'wealdwood': trunkColor = '#27272a'; trunkHighlight = '#404040'; leafColors = ['#1f2937', '#374151', '#4b5563', '#6b7280']; break;
            case 'ironwood': trunkColor = '#4b5563'; trunkHighlight = '#6b7280'; leafColors = ['#1a2e05', '#2a4d08', '#4d7c0f', '#65a30d']; break;
        }
        
        // Trunk with detail
        this.ctx.fillStyle = trunkColor; this.ctx.fillRect(treeX + 96, treeY + 256, 64, 192);
        this.ctx.fillStyle = trunkHighlight; this.ctx.fillRect(treeX + 104, treeY + 256, 16, 192);
        if (variant === 'birch') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(treeX + 104, treeY + 280, 8, 32); this.ctx.fillRect(treeX + 144, treeY + 360, 8, 24);
        }

        // Damage Gash
        if (integrityRatio < 0.9) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this.ctx.beginPath();
            this.ctx.moveTo(treeX + 100, treeY + 300);
            this.ctx.lineTo(treeX + 156, treeY + 320);
            this.ctx.lineTo(treeX + 148, treeY + 400);
            this.ctx.lineTo(treeX + 92, treeY + 380);
            this.ctx.closePath();
            this.ctx.fill();
        }
    
        // Layered leaf clusters
        const drawCluster = (lx: number, ly: number, r: number, color1: string, color2: string, color3: string) => {
            this.ctx.fillStyle = color1; this.ctx.beginPath(); this.ctx.arc(lx, ly, r, 0, 7); this.ctx.fill();
            this.ctx.fillStyle = color2; this.ctx.beginPath(); this.ctx.arc(lx, ly - r * 0.1, r * 0.85, 0, 7); this.ctx.fill();
            this.ctx.fillStyle = color3; this.ctx.beginPath(); this.ctx.arc(lx + r*0.2, ly + r*0.1, r * 0.5, 0, 7); this.ctx.fill();
        }
        
        if (integrityRatio > 0.6) { // Full health and first hit
            drawCluster(treeX + 128 + sway, treeY + 192, 160, leafColors[0], leafColors[1], leafColors[2]);
        }
        if (integrityRatio > 0.3) { // All but heavily damaged
            drawCluster(treeX + 224 + sway, treeY + 256, 100, leafColors[0], leafColors[1], leafColors[2]);
        }
        drawCluster(treeX + 48 + sway, treeY + 272, 80 * integrityRatio, leafColors[1], leafColors[2], leafColors[3]);
        
        // Fruit/Flower decorations
        if ((variant === 'bloomwood' || variant === 'gloom_apple') && integrityRatio > 0.5) {
            const decorColor = variant === 'bloomwood' ? '#ec4899' : '#9f1239';
            this.ctx.fillStyle = decorColor;
            for(let i = 0; i < 5 * integrityRatio; i++) {
                const angle = i * 1.25; const r = 100;
                const dx = treeX + 128 + sway + Math.cos(angle) * r;
                const dy = treeY + 192 + Math.sin(angle) * r;
                this.ctx.beginPath(); this.ctx.arc(dx, dy, 24, 0, 7); this.ctx.fill();
            }
        }
    }

    drawPixelArtRock(x: number, y: number, obj: GameObject, gridX: number, gridY: number) {
        const variant = obj.variant || 'stone';
        const integrity = obj.integrity ?? 3;
        
        const rockX = x + 32, rockY = y + 64;
        const colors: {[key: string]: string[]} = {
            stone: ['#4b5563', '#6b7280', '#9ca3af'],
            copper: ['#78350f', '#b45309', '#d97706'],
            tin: ['#9ca3af', '#d4d4d8', '#e5e7eb'],
            iron: ['#4b5563', '#78350f', '#a16207'],
            silver: ['#9ca3af', '#e5e7eb', '#f9fafb'],
            gold: ['#6b7280', '#f59e0b', '#facc15'],
            quartz: ['#d1d5db', '#e5e7eb', '#f8fafc'],
            amethyst: ['#6b21a8', '#9333ea', '#c084fc'],
        };
        const [dark, base, light] = colors[variant] || colors.stone;

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)'; this.ctx.beginPath(); this.ctx.ellipse(rockX + 96, rockY + 152, 104, 52, 0, 0, 7); this.ctx.fill();

        this.ctx.fillStyle = dark;
        this.ctx.beginPath();
        this.ctx.moveTo(rockX, rockY + 160); this.ctx.lineTo(rockX + 192, rockY + 160);
        this.ctx.lineTo(rockX + 160, rockY); this.ctx.lineTo(rockX + 32, rockY - 32); this.ctx.closePath(); this.ctx.fill();
        
        this.ctx.fillStyle = base;
        this.ctx.beginPath();
        this.ctx.moveTo(rockX + 16, rockY + 144); this.ctx.lineTo(rockX + 176, rockY + 144);
        this.ctx.lineTo(rockX + 144, rockY + 16); this.ctx.lineTo(rockX + 48, rockY - 16); this.ctx.closePath(); this.ctx.fill();

        this.ctx.fillStyle = light;
        this.ctx.fillRect(rockX + 48, rockY, 32, 32); this.ctx.fillRect(rockX + 112, rockY + 48, 24, 24);

        // Cracks for damage
        if (integrity < 3) {
            this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(rockX + 40, rockY - 20);
            this.ctx.lineTo(rockX + 100, rockY + 150);
            this.ctx.stroke();
        }
        if (integrity < 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(rockX + 170, rockY + 20);
            this.ctx.lineTo(rockX + 30, rockY + 90);
            this.ctx.stroke();
        }
        
        if (variant.match(/quartz|amethyst|silver|gold/)) {
            const pulse = 0.5 + Math.sin(Date.now()/400 + gridX)*0.5;
            this.ctx.fillStyle = `rgba(255,255,255,${pulse * 0.5})`;
            this.ctx.fillRect(rockX + 48, rockY, 32, 32);
        }
    }
    
     drawPixelArtBush(x: number, y: number, variant: string, gridX: number, gridY: number) {
        const bushX = x, bushY = y + 64;
        let leaf1 = '#14532d', leaf2 = '#166534', leaf3 = '#22c55e';
        const sway = Math.sin(Date.now()/600 + gridX/2) * 8;
        
        switch (variant) {
            case 'shadow_fern': leaf1 = '#374151'; leaf2 = '#4b5563'; leaf3 = '#6b7280'; break;
            case 'bramble': leaf1 = '#450a0a'; leaf2 = '#7f1d1d'; leaf3 = '#b91c1c'; break;
        }

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)'; this.ctx.beginPath(); this.ctx.ellipse(bushX + 128, bushY + 184, 128, 64, 0, 0, 7); this.ctx.fill();
        
        this.ctx.fillStyle = leaf1; this.ctx.beginPath(); this.ctx.ellipse(bushX + 128, bushY + 128, 120, 96, 0, 0, 7); this.ctx.fill();
        this.ctx.fillStyle = leaf2; this.ctx.beginPath(); this.ctx.ellipse(bushX + 104 + sway, bushY + 104, 80, 64, 0.3, 0, 7); this.ctx.fill();
        this.ctx.fillStyle = leaf3; this.ctx.beginPath(); this.ctx.ellipse(bushX + 168 - sway, bushY + 144, 64, 48, -0.3, 0, 7); this.ctx.fill();

        let decorColor = '';
        switch(variant) {
            case 'valeberry': decorColor = '#ef4444'; break; case 'bramble': decorColor = '#e11d48'; break;
            case 'sun_tomato': decorColor = '#dc2626'; break; case 'gravepetal': decorColor = '#e5e7eb'; break;
            case 'shadow_fern': decorColor = '#9333ea'; break; case 'moonglow': decorColor = '#c7d2fe'; break;
            case 'golden_clover': decorColor = '#facc15'; break;
        }
        if (decorColor) {
            this.ctx.fillStyle = decorColor;
            for(let i = 0; i < 3; i++) {
                const angle = i * 2.1;
                const r = 48 + Math.sin(angle) * 20;
                this.ctx.fillRect(bushX + 128 + sway + Math.cos(angle) * r, bushY + 128 + Math.sin(angle) * r * 0.7 - 16, 24, 24);
            }
        }
    }
    
    drawPlayer() {
        const { player } = this.state;
        const drawX = player.x * TILE_SIZE;
        const drawY = player.y * TILE_SIZE;
        const now = Date.now();
        const attackDuration = 250;
        const isAttacking = (now - player.lastAttackTime < attackDuration) && (player.tool === 'blade' || player.tool === 'axe' || player.tool === 'pickaxe');

        const frame = Math.floor(player.animationFrame);
        let yBob = player.isMoving ? Math.sin(player.animationFrame * Math.PI / 2) * 16 : Math.sin(Date.now() / 300) * 8;

        this.ctx.save();
        if (player.lastHitTime && now - player.lastHitTime < 150) {
            this.ctx.filter = 'brightness(3) drop-shadow(0 0 10px white)';
        }

        // Shadow
        this.ctx.fillStyle = 'rgba(10, 5, 2, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(drawX, drawY + 120, 80, 40, 0, 0, 7);
        this.ctx.fill();

        const y = drawY - TILE_SIZE * 0.7 + yBob;
        let leftLegX = -48, rightLegX = 16;
        if (player.isMoving && (frame === 1 || frame === 2)) {
            leftLegX = -16;
            rightLegX = -16;
        }

        // Left Leg
        this.ctx.fillStyle = '#3f6212'; this.ctx.fillRect(drawX + leftLegX, y + 192, 32, 48);
        this.ctx.fillStyle = '#291d13'; this.ctx.fillRect(drawX + leftLegX - 8, y + 232, 48, 40);
        // Right Leg
        this.ctx.fillStyle = '#4d7c0f'; this.ctx.fillRect(drawX + rightLegX, y + 192, 32, 48);
        this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX + rightLegX - 8, y + 232, 48, 40);
        // Torso
        this.ctx.fillStyle = '#1e40af'; this.ctx.fillRect(drawX - 56, y + 88, 112, 112);
        this.ctx.fillStyle = '#1e3a8a'; this.ctx.fillRect(drawX - 56, y + 144, 112, 56); // Lower torso shade
        this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX - 64, y + 160, 128, 32); // Belt
        this.ctx.fillStyle = '#facc15'; this.ctx.fillRect(drawX - 16, y + 168, 32, 16); // Buckle
        
        // Head is drawn before the attacking arm to ensure correct layering.
        const drawHeadAndHair = () => {
            // Head
            this.ctx.fillStyle = '#e6c6a7'; this.ctx.fillRect(drawX - 40, y + 32, 80, 80);
            this.ctx.fillStyle = '#d8b08e'; this.ctx.fillRect(drawX - 40, y + 96, 80, 16); // Chin
            this.ctx.fillStyle = '#1f2937'; // Eyes
            this.ctx.fillRect(drawX - 24, y + 64, 16, 16); this.ctx.fillRect(drawX + 8, y + 64, 16, 16);
            // Hair
            this.ctx.fillStyle = '#3a2d1d'; this.ctx.fillRect(drawX - 48, y + 16, 96, 48);
            this.ctx.fillStyle = '#5a3d2d'; this.ctx.fillRect(drawX - 48, y + 16, 96, 16);
        };
        
        // ARMS AND WEAPON
        if (isAttacking) {
            drawHeadAndHair(); // Draw head under the swinging arm
            
            const attackProgress = (now - player.lastAttackTime) / attackDuration;
            const swingArc = Math.sin(attackProgress * Math.PI); // Goes 0 -> 1 -> 0
            
            let targetAngle;
            const target = player.interactionTarget;
            if (target) {
                let targetX, targetY;
                 if (target.type === 'object') {
                    targetX = (target.x + 0.5);
                    targetY = (target.y + 0.5);
                } else {
                    targetX = target.entity.x;
                    targetY = target.entity.y;
                }
                targetAngle = Math.atan2(targetY - player.y, targetX - player.x);
            } else {
                targetAngle = Math.atan2(player.direction.dy, player.direction.dx);
            }

            const finalAngle = targetAngle - (Math.PI / 2) + (swingArc * 1.8);

            this.ctx.save();
            this.ctx.translate(drawX, y + 128); // Pivot from shoulder
            this.ctx.rotate(finalAngle);

            // Arm
            this.ctx.fillStyle = '#d8b08e'; 
            this.ctx.fillRect(0, -16, 80, 32); 

            // Weapon
            if (player.tool === 'blade') {
                 this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(80, -8, 24, 16); // hilt
                 this.ctx.fillStyle = '#708090'; this.ctx.fillRect(104, -12, 80, 24); // blade
                 this.ctx.fillStyle = '#b5cddc'; this.ctx.fillRect(104, -8, 80, 8); // highlight
            } else if (player.tool === 'axe') {
                 this.ctx.fillStyle = '#6f452a'; this.ctx.fillRect(80, -8, 80, 16); // handle
                 this.ctx.fillStyle = '#708090'; this.ctx.fillRect(160, -40, 48, 80); // head
                 this.ctx.fillStyle = '#b5cddc'; this.ctx.fillRect(192, -32, 16, 64); // highlight
            } else if (player.tool === 'pickaxe') {
                 this.ctx.fillStyle = '#6f452a'; this.ctx.fillRect(80, -8, 80, 16); // handle
                 this.ctx.fillStyle = '#708090'; this.ctx.fillRect(160, -16, 64, 32); // head
                 this.ctx.fillStyle = '#b5cddc'; this.ctx.fillRect(168, -12, 48, 24); // highlight
            }
            
            this.ctx.restore();
        } else {
            // Idle arms
            this.ctx.fillStyle = '#d8b08e';
            this.ctx.fillRect(drawX - 72, y + 96, 24, 64); // Left Arm
            this.ctx.fillStyle = '#e6c6a7';
            this.ctx.fillRect(drawX + 48, y + 96, 24, 64); // Right Arm
            drawHeadAndHair(); // Draw head on top of idle arms
        }
        
        this.ctx.restore();
    }
    
    drawEnemy(enemy: Enemy) {
        const drawX = enemy.x * TILE_SIZE;
        const drawY = enemy.y * TILE_SIZE;
        let bob = enemy.isMoving ? Math.sin(enemy.animationFrame * Math.PI / 2) * 16 : Math.sin(Date.now() / 400 + (enemy.id as number)) * 12;

        this.ctx.save();
        if (enemy.lastHitTime && Date.now() - enemy.lastHitTime < 100) {
            this.ctx.filter = 'brightness(3)';
        }

        // Shadow
        this.ctx.fillStyle = 'rgba(10, 5, 2, 0.4)'; this.ctx.beginPath(); this.ctx.ellipse(drawX, drawY + TILE_SIZE*0.45, 88, 44, 0, 0, 7); this.ctx.fill();

        switch(enemy.type) {
            case 'weeping_root':
                let lungeOffset = 0;
                if (typeof enemy.attackAnimationProgress === 'number') {
                    lungeOffset = Math.sin(enemy.attackAnimationProgress * Math.PI) * -64; // Lunge up/forward
                }
                const rootY = drawY - 192 + bob + lungeOffset;
                this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX-32, rootY, 64, 256);
                this.ctx.fillStyle = '#6f452a'; this.ctx.fillRect(drawX-24, rootY, 16, 256);
                this.ctx.fillStyle = '#166534'; this.ctx.fillRect(drawX-48, rootY - 32, 96, 48);
                this.ctx.fillStyle = '#ef4444'; this.ctx.fillRect(drawX-16, rootY + 80, 32, 32);
                break;
            case 'shadow_creeper':
                let pounceOffset = 0;
                if (typeof enemy.attackAnimationProgress === 'number') {
                    pounceOffset = Math.sin(enemy.attackAnimationProgress * Math.PI) * -48;
                }
                this.ctx.fillStyle = '#1e1b4b'; this.ctx.beginPath(); this.ctx.ellipse(drawX, drawY - 64 + bob + pounceOffset, 96, 64, 0, 0, 7); this.ctx.fill();
                this.ctx.fillStyle = '#ef4444';
                const eye_bob = Math.sin(Date.now() / 100 + (enemy.id as number)) * 8;
                this.ctx.beginPath(); this.ctx.arc(drawX - 32, drawY - 64 + bob + pounceOffset, 16, 0, 7); this.ctx.fill(); this.ctx.beginPath(); this.ctx.arc(drawX + 32, drawY - 64 + bob + pounceOffset + eye_bob, 16, 0, 7); this.ctx.fill();
                break;
            case 'stone_golem':
                 const golemY = drawY - 256 + bob;
                 // Body
                 this.ctx.fillStyle = '#4b5563'; this.ctx.fillRect(drawX - 96, golemY, 192, 320);
                 this.ctx.fillStyle = '#6b7280'; this.ctx.fillRect(drawX - 80, golemY + 16, 160, 288);
                 // Core
                 this.ctx.fillStyle = '#c084fc'; 
                 const pulse = 1 + Math.sin(Date.now() / 200) * 0.2;
                 this.ctx.fillRect(drawX - 32*pulse, drawY - 96 + bob - 32*pulse, 64 * pulse, 64 * pulse);
                 // Attack Animation
                 if (typeof enemy.attackAnimationProgress === 'number') {
                    const swingArc = Math.sin(enemy.attackAnimationProgress * Math.PI);
                    const armAngle = -Math.PI / 4 + swingArc * Math.PI / 1.5;
                    
                    this.ctx.save();
                    this.ctx.translate(drawX + 80, golemY + 80); // Shoulder pivot
                    this.ctx.rotate(armAngle);
                    this.ctx.fillStyle = '#6b7280'; this.ctx.fillRect(0, -24, 128, 48);
                    this.ctx.fillStyle = '#4b5563'; this.ctx.fillRect(100, -32, 48, 64); // Fist
                    this.ctx.restore();
                 }
                break;
            case 'whispering_shade':
                let pulseScale = 1;
                if (typeof enemy.attackAnimationProgress === 'number') {
                    pulseScale = 1 + Math.sin(enemy.attackAnimationProgress * Math.PI) * 0.3;
                }
                this.ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 500 + (enemy.id as number)) * 0.2;
                this.ctx.fillStyle = '#4338ca'; this.ctx.beginPath(); this.ctx.moveTo(drawX, drawY - (240*pulseScale) + bob); this.ctx.bezierCurveTo(drawX-(160*pulseScale), drawY, drawX+(160*pulseScale), drawY, drawX, drawY - (240*pulseScale) + bob); this.ctx.fill();
                this.ctx.globalAlpha = 1;
                break;
            case 'heart_of_the_hollow':
                const h_pulse = Math.sin(Date.now() / 500) * TILE_SIZE * 0.1;
                this.drawLightSource(this.ctx, drawX, drawY, TILE_SIZE * 1.5 + h_pulse, {r: 138, g: 43, b: 226});
                this.ctx.fillStyle = '#c084fc'; this.ctx.beginPath(); this.ctx.arc(drawX, drawY - TILE_SIZE, TILE_SIZE * 0.8 + h_pulse/2, 0, 7); this.ctx.fill();
                break;
        }
        this.ctx.restore();

        // Draw health bar
        if (enemy.hp > 0 && enemy.type !== 'heart_of_the_hollow') {
            const barWidth = TILE_SIZE * 0.5;
            const barHeight = 16;
            const barYOffset = -TILE_SIZE;
            const barX = drawX - barWidth / 2;
            const barY = drawY + barYOffset;

            // Background
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            // Fill
            const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
            this.ctx.fillStyle = '#b91c1c';
            this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

            // Border
            this.ctx.strokeStyle = '#111';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
    
    drawPixelArtNPC(npc: NPC) {
        const drawX = npc.x * TILE_SIZE;
        const drawY = npc.y * TILE_SIZE;
        const bob = Math.sin(Date.now() / 450 + (npc.id as string).charCodeAt(0)) * 8;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(10, 5, 2, 0.3)';
        this.ctx.beginPath(); this.ctx.ellipse(drawX, drawY + 120, 80, 40, 0, 0, 7); this.ctx.fill();
        
        const y = drawY - TILE_SIZE*0.7 + bob;

        if (npc.id === 'elara') { // Wise Herbalist
            this.ctx.fillStyle = '#064e3b'; this.ctx.fillRect(drawX - 48, y + 80, 96, 192); // Robes
            this.ctx.fillStyle = '#10b981'; this.ctx.fillRect(drawX - 56, y + 88, 112, 24); // Sash
            this.ctx.fillStyle = '#fde68a'; this.ctx.fillRect(drawX - 32, y + 32, 64, 64); // Head
            this.ctx.fillStyle = '#e5e7eb'; this.ctx.fillRect(drawX - 40, y, 80, 40); // Hair
            this.ctx.fillStyle = '#065f46'; this.ctx.fillRect(drawX - 40, y + 64, 16, 16); this.ctx.fillRect(drawX + 24, y+64, 16, 16); // Eyes
        } else if (npc.id === 'cain') { // Stoic Blacksmith
            this.ctx.fillStyle = '#4b5563'; this.ctx.fillRect(drawX - 48, y + 96, 96, 80); // Shirt
            this.ctx.fillStyle = '#374151'; this.ctx.fillRect(drawX - 32, y + 176, 24, 64); this.ctx.fillRect(drawX + 8, y + 176, 24, 64); // Legs
            this.ctx.fillStyle = '#78350f'; this.ctx.fillRect(drawX - 56, y + 120, 112, 64); // Apron
            this.ctx.fillStyle = '#fde68a'; this.ctx.fillRect(drawX - 32, y + 32, 64, 64); // Head
            this.ctx.fillStyle = '#1f2937'; this.ctx.fillRect(drawX - 40, y, 80, 40); // Hair
            this.ctx.fillRect(drawX - 40, y + 24, 80, 40); // Beard
        }
    }

    drawLootDrop(loot: LootDrop) {
        const drawX = loot.x * TILE_SIZE;
        const drawY = loot.y * TILE_SIZE;
        const bob = Math.sin(Date.now() / 250 + (loot.id as number)) * 16;

        this.ctx.fillStyle = 'rgba(10,5,2,0.4)'; this.ctx.beginPath(); this.ctx.ellipse(drawX, drawY-16+bob, 64, 32, 0, 0, 7); this.ctx.fill();

        this.ctx.fillStyle = '#4a2d1d'; this.ctx.fillRect(drawX - 48, drawY - 80 + bob, 96, 96);
        this.ctx.fillStyle = '#facc15'; this.ctx.fillRect(drawX - 32, drawY - 88 + bob, 64, 16);
        this.ctx.fillStyle = '#6f452a'; this.ctx.fillRect(drawX - 40, drawY - 72 + bob, 80, 80);
    }
    
    drawParticles(deltaTime: number) {
        const now = Date.now();
        this.state.entities.particles = this.state.entities.particles.filter((p: Particle) => {
            const life = (now - p.startTime) / p.duration;
            if (life > 1) return false;

            const currentX = p.x + p.vx * life;
            const currentY = p.y + p.vy * life - life * life * 80; // gravity
            const alpha = 1 - life;
            
            this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;

            if (p.type === 'glyph' && p.data?.char) {
                this.ctx.font = `${p.size}px "Cinzel"`;
                this.ctx.fillText(p.data.char, currentX * TILE_SIZE, currentY * TILE_SIZE);
            } else if (p.type === 'spark') {
                this.ctx.fillRect((currentX * TILE_SIZE) - p.size/2, (currentY * TILE_SIZE) - p.size/2, p.size, p.size);
            } else { // leaf
                this.ctx.beginPath();
                this.ctx.arc(currentX * TILE_SIZE, currentY * TILE_SIZE, p.size, 0, 7);
                this.ctx.fill();
            }
            return true;
        });
        
        // ritual glyphs on ground
        this.state.world.gameGrid.forEach(col => col.forEach(tile => {
            if (tile.ritualGlyph) {
                tile.ritualGlyph.duration -= deltaTime * 1000;
                if (tile.ritualGlyph.duration <= 0) {
                    tile.ritualGlyph = undefined;
                }
            }
        }));
    }

    updateAmbientParticles(deltaTime: number, camera: {x: number, y: number}) {
        const { entities, world, session } = this.state;
        const now = Date.now();
        
        entities.ambientParticles = entities.ambientParticles.filter((p: AmbientParticle) => now < p.endTime);

        let particleType = 'none';
        const time = world.gameTime;
        if (session.currentGameState === 'farm' && (time > 1200 || time < 300)) {
            particleType = 'firefly';
        } else if (session.currentGameState === 'dungeon') {
            particleType = 'dust';
        }

        if (particleType !== 'none' && Math.random() < 0.2) { // spawn chance
            const worldViewWidth = this.canvas.width / VIEW_SCALE / TILE_SIZE;
            const worldViewHeight = this.canvas.height / VIEW_SCALE / TILE_SIZE;
            const worldViewX = -camera.x / (TILE_SIZE * VIEW_SCALE);
            const worldViewY = -camera.y / (TILE_SIZE * VIEW_SCALE);
            
            const x = worldViewX + Math.random() * worldViewWidth;
            const y = worldViewY + Math.random() * worldViewHeight;


            if (particleType === 'firefly') {
                 entities.ambientParticles.push({
                    x, y, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5,
                    startTime: now, endTime: now + 5000 + Math.random() * 5000,
                    type: 'firefly', color: {r: 220, g:255, b:180}
                 });
            } else if (particleType === 'dust') {
                 entities.ambientParticles.push({
                    x, y, vx: (Math.random()-0.5)*0.2, vy: (Math.random()-0.5)*0.2,
                    startTime: now, endTime: now + 8000 + Math.random() * 5000,
                    type: 'dust', color: {r: 200, g:190, b:180}
                 });
            }
        }
    }

    drawAmbientParticles(camera: {x: number, y: number}) {
        const { entities } = this.state;
        const now = Date.now();
        entities.ambientParticles.forEach((p: AmbientParticle) => {
            const life = (now - p.startTime) / (p.endTime - p.startTime);
            let pX = p.x, pY = p.y;
            let alpha = Math.sin(life * Math.PI);
            let size = 8;

            if(p.type === 'firefly') {
                pX += Math.sin(now / 500 + p.startTime / 100) * 0.5;
                pY += Math.cos(now / 500 + p.startTime / 100) * 0.5;
                size = 12 + Math.sin(now/200 + p.startTime/50)*8;
            } else {
                 pX += p.vx * life * 2;
                 pY += p.vy * life * 2;
            }

            const screenX = pX * TILE_SIZE * VIEW_SCALE + camera.x;
            const screenY = pY * TILE_SIZE * VIEW_SCALE + camera.y;

            this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, size, 0, 7);
            this.ctx.fill();

            if(p.type === 'firefly') {
                 this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
                 this.ctx.beginPath();
                 this.ctx.arc(screenX, screenY, size/2, 0, 7);
                 this.ctx.fill();
            }
        });
    }

    drawTargetHighlight() {
        const { player } = this.state;
        const target = player.movementTarget || player.interactionTarget;
        if (target) {
            let highlightX = 0, highlightY = 0;

            if ('type' in target) {
                // It's an InteractionTarget
                const interactionTarget = target as InteractionTarget;
                if (interactionTarget.type === 'object') {
                    highlightX = (interactionTarget.x + 0.5) * TILE_SIZE;
                    highlightY = (interactionTarget.y + 0.5) * TILE_SIZE;
                } else { // 'enemy', 'npc', 'loot'
                    highlightX = interactionTarget.entity.x * TILE_SIZE;
                    highlightY = interactionTarget.entity.y * TILE_SIZE;
                }
            } else { // Is MovementTarget
                const movementTarget = target as {x: number, y: number};
                highlightX = movementTarget.x * TILE_SIZE;
                highlightY = movementTarget.y * TILE_SIZE;
            }

            const angle = (Date.now() / 200) % (Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 150, 0.9)';
            this.ctx.lineWidth = 12;
            this.ctx.setLineDash([40, 20]);
            this.ctx.beginPath();
            this.ctx.arc(highlightX, highlightY, 128, angle, angle + Math.PI * 1.8);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawAttackAnimation() {
        // This logic is now part of drawPlayer to create an animated character swing.
        // The old arc visual effect is removed to avoid visual clutter.
    }

    drawProjectilesAndEffects() {
        const now = Date.now();
        this.state.entities.effects = this.state.entities.effects.filter((effect: GameEffect) => {
            const life = (now - effect.startTime) / effect.duration;
            if (life > 1) return false;

            if (effect.type === 'plant_ripple') {
                const drawX = effect.x * TILE_SIZE;
                const drawY = effect.y * TILE_SIZE;
                const progress = life; // 0 to 1
                const radius = progress * TILE_SIZE * 0.4;
                const alpha = 1 - progress;

                this.ctx.strokeStyle = `rgba(163, 230, 53, ${alpha})`; // A lime green color
                this.ctx.lineWidth = 12 * (1 - progress);
                this.ctx.beginPath();
                this.ctx.arc(drawX + TILE_SIZE / 2, drawY + TILE_SIZE / 2, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            return true;
        });
    }

    drawFloatingTexts(camera: {x: number, y: number}) {
        const now = Date.now();
        this.state.entities.floatingTexts = this.state.entities.floatingTexts.filter((ft: FloatingText) => {
            const life = (now - ft.startTime) / ft.duration;
            if (life > 1) return false;

            const yOffset = -life * 80; // Adjusted for better feel with zoom
            const alpha = Math.sin((1 - life) * Math.PI); // Fade in and out smoothly
            
            const drawX = ft.x * TILE_SIZE * VIEW_SCALE + camera.x;
            const drawY = ft.y * TILE_SIZE * VIEW_SCALE + camera.y + yOffset;
            
            this.ctx.font = 'bold 36px "Cinzel", "serif"';
            this.ctx.fillStyle = `rgba(${ft.color.r}, ${ft.color.g}, ${ft.color.b}, ${alpha})`;
            this.ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.8})`;
            this.ctx.lineWidth = 6;
            this.ctx.textAlign = 'center';
            this.ctx.strokeText(ft.text, drawX, drawY);
            this.ctx.fillText(ft.text, drawX, drawY);
            
            return true;
        });
    }

    drawPixelArtScarecrow(x: number, y: number, gridX: number, gridY: number) {
        const drawX = x;
        const drawY = y - TILE_SIZE * 0.5;
        const sway = Math.sin(Date.now()/700 + gridX) * 8;
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)'; this.ctx.beginPath(); this.ctx.ellipse(drawX + 132, drawY + 320, 80, 40, 0, 0, 7); this.ctx.fill();

        this.ctx.fillStyle = '#5a3d2d'; this.ctx.fillRect(drawX + 120, drawY, 24, 320);
        this.ctx.fillStyle = '#6f452a'; this.ctx.fillRect(drawX + 64, drawY + 64, 128, 24);
        this.ctx.fillStyle = '#d2b48c'; this.ctx.fillRect(drawX + 88 + sway, drawY - 32, 80, 80);
        this.ctx.fillStyle = '#3a2d1d'; this.ctx.fillRect(drawX + 80 + sway, drawY - 48, 96, 32);
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(drawX + 104 + sway, drawY, 8, 16); this.ctx.fillRect(drawX + 144 + sway, drawY, 8, 16);
    }
    
    drawForge(x: number, y: number) {
        const drawX = x; const drawY = y;
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)'; this.ctx.beginPath(); this.ctx.ellipse(drawX + 128, drawY + TILE_SIZE - 16, 144, 72, 0, 0, 7); this.ctx.fill();

        this.ctx.fillStyle = '#4b5563'; this.ctx.fillRect(drawX, drawY + 64, TILE_SIZE, TILE_SIZE * 0.75);
        this.ctx.fillStyle = '#6b7280'; this.ctx.fillRect(drawX + 16, drawY + 80, TILE_SIZE - 32, TILE_SIZE * 0.75 - 32);
        this.ctx.fillStyle = '#2e2824'; this.ctx.fillRect(drawX - 16, drawY + 48, TILE_SIZE + 32, 48);
        const pulse = 0.5 + Math.sin(Date.now() / 200 + x) * 0.5;
        this.ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`; this.ctx.fillRect(drawX + 64, drawY + 64, 128, 32);
        this.ctx.fillStyle = `rgba(252, 211, 77, ${pulse})`; this.ctx.fillRect(drawX + 80, drawY + 72, 96, 24);
    }
    
    drawBed(x: number, y: number) {
        const drawX = x; const drawY = y;
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)'; this.ctx.beginPath(); this.ctx.ellipse(drawX + 128, drawY + TILE_SIZE - 24, 128, 64, 0, 0, 7); this.ctx.fill();

        this.ctx.fillStyle = '#4a2d1d'; // Bed frame
        this.ctx.fillRect(drawX + 16, drawY + TILE_SIZE * 0.5, TILE_SIZE - 32, TILE_SIZE * 0.4);
        this.ctx.fillRect(drawX, drawY + TILE_SIZE * 0.4, TILE_SIZE, 32); // Headboard
        this.ctx.fillStyle = '#d7c7b2'; // Mattress
        this.ctx.fillRect(drawX + 24, drawY + TILE_SIZE * 0.5 + 8, TILE_SIZE - 48, TILE_SIZE * 0.4 - 16);
        this.ctx.fillStyle = '#7f1d1d'; // Blanket
        this.ctx.fillRect(drawX + 24, drawY + TILE_SIZE * 0.65, TILE_SIZE - 48, TILE_SIZE * 0.25);
    }

    drawPortal(x: number, y: number) {
        const drawX = x + TILE_SIZE / 2; const drawY = y + TILE_SIZE / 2;
        const colors = ['#4c1d95', '#7e22ce', '#c084fc'];
        const time = Date.now() / 1500;
        
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
            const rotation = time * (i + 1) * 0.5;
            const radius = TILE_SIZE * 0.4 + Math.sin(time*2 + i) * 20;
            const gradient = this.ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, radius);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, `${colors[i]}88`);
            gradient.addColorStop(1, `${colors[i]}00`);
            this.ctx.fillStyle = gradient;
            this.ctx.save();
            this.ctx.translate(drawX, drawY);
            this.ctx.rotate(rotation);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, radius, radius*0.5, 0, 0, 7);
            this.ctx.fill();
            this.ctx.restore();
        }
        this.ctx.restore();
    }
    
    drawDroppedItem(x: number, y: number, itemName: string) {
        const itemTemplate = itemTemplates[itemName];
        if (!itemTemplate || !itemTemplate.iconUrl) return;

        const img = new Image();
        img.src = itemTemplate.iconUrl;
        
        if (img.complete) {
            this.ctx.drawImage(img, x + TILE_SIZE / 2 - 32, y + TILE_SIZE / 2 - 32, 64, 64);
        } else {
            img.onload = () => { /* The game will re-render */ };
        }
    }

    drawRitualGlyph(x: number, y: number, glyph: any) {
        const alpha = Math.min(1, glyph.duration / 2000);
        this.ctx.fillStyle = `rgba(77, 208, 225, ${alpha * 0.5})`;
        this.ctx.beginPath();
        this.ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawStairs(x: number, y: number) {
        const drawX = x;
        const drawY = y;
        this.ctx.fillStyle = '#1c1917';
        this.ctx.fillRect(drawX + 32, drawY + 32, TILE_SIZE - 64, TILE_SIZE - 64);
        for(let i = 0; i < 4; i++) {
            this.ctx.fillStyle = '#3a352e';
            this.ctx.fillRect(drawX + 32 + i * 16, drawY + 32 + i * 16, TILE_SIZE - 64 - i*32, TILE_SIZE - 64 - i * 32);
        }
    }
    
    drawExit(x: number, y: number) {
        const drawX = x + TILE_SIZE / 2;
        const drawY = y + TILE_SIZE / 2;
        
        const time = Date.now() / 1000;
        const radius = TILE_SIZE * 0.3 + Math.sin(time) * 10;
        
        this.ctx.fillStyle = `rgba(180, 220, 255, 0.7)`;
        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}