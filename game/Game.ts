



import { GameState } from './GameState';
import { UIManager } from './UIManager';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
// FIX: Corrected import casing to resolve module resolution error.

import { ItemGenerator } from './ItemGenerator';
import { FARM_GRID_SIZE_X, FARM_GRID_SIZE_Y, PLAYER_ATTACK_RANGE, INTERACTION_RANGE, PLAYER_ATTACK_COOLDOWN, PLAYER_WALK_ANIM_SPEED, TILE_SIZE, VIEW_SCALE, DAYS_PER_SEASON, SEASONS, MOON_PHASES, IN_SEASON_GROWTH_MULTIPLIER, DUNGEON_GRID_SIZE_X, DUNGEON_GRID_SIZE_Y, DUNGEON_FLOORS_PER_THEME, OUT_OF_SEASON_GROWTH_MULTIPLIER } from '../data/constants';
import { CREATURE_TEMPLATES } from '../data/creatures';
import { itemTemplates, cropTemplates, smithingRecipes } from '../data/items';
import { EquipmentSlot, Gear, ItemTemplate, NPC, Ritual, CreatureTemplate } from '../types/index';

export class Game {
    state: GameState;
    uiManager: UIManager;
    inputManager: InputManager;
    renderer: Renderer;
    itemGenerator: ItemGenerator;
    rituals: Ritual[];
    camera: { x: number; y: number };
    canvas: HTMLCanvasElement;
    lastTimestamp: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.state = new GameState();
        this.itemGenerator = new ItemGenerator();
        // FIX: Implemented the missing 'defineRituals' method.
        this.rituals = this.defineRituals();
        this.camera = { x: 0, y: 0 };
        this.renderer = new Renderer(canvas, this.state);
        this.uiManager = new UIManager(this.state, this);
        this.inputManager = new InputManager(this.state, this);
        this.init();
    }

    async init() {
        await this.itemGenerator.loadData();
        this.loadSettings();
        this.uiManager.init();
        this.inputManager.init(this.canvas);
        if (this.state.load()) {
            this.uiManager.hideModal();
            this.state.session.gameRunning = true;
        } else {
             this.uiManager.showModal(this.uiManager.dom.mainMenuModal as HTMLElement);
        }
        this.uiManager.updateHotbar();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(timestamp: number) {
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        if (this.state.session.gameRunning) {
            this.update(deltaTime);
        }

        this.updateCamera();
        this.renderer.render(this.camera, deltaTime);
        this.uiManager.updateHUD();

        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    loadSettings() {
        try {
            const settingsString = localStorage.getItem('hollowrootValeSettings');
            if (settingsString) {
                const settings = JSON.parse(settingsString);
                if (settings.resolution && settings.resolution.width && settings.resolution.height) {
                    this.applyResolution(settings.resolution.width, settings.resolution.height, false);
                    return;
                }
            }
        } catch (e) {
            console.error("Could not load settings, using defaults.", e);
        }
        // Default resolution
        this.applyResolution(854, 480, false);
    }

    applyResolution(width: number, height: number, save: boolean = true) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.renderer.resize();

        if (save) {
            try {
                const settings = { resolution: { width, height } };
                localStorage.setItem('hollowrootValeSettings', JSON.stringify(settings));
            } catch (e) {
                console.error("Could not save settings.", e);
            }
        }
    }

    setResolution(resolutionString: string) {
        if (!resolutionString) return;
        const parts = resolutionString.split('x');
        if (parts.length === 2) {
            const width = parseInt(parts[0].trim(), 10);
            const height = parseInt(parts[1].trim(), 10);
            if (!isNaN(width) && !isNaN(height)) {
                this.applyResolution(width, height);
            }
        }
    }

    update(deltaTime: number) {
        // Time progression: 1 real second = 10 game minutes
        const oldTime = this.state.world.gameTime;
        this.state.world.gameTime = (this.state.world.gameTime + deltaTime * 10) % 1440;

        // Check for day rollover
        if (this.state.world.gameTime < oldTime) {
            this.passDay();
        }

        const derivedStats = this.getDerivedStats().derived;
        this.inputManager.handleMovement(derivedStats.moveSpeed, deltaTime);
        this.updateEnemies(deltaTime);
        this.updatePlayer(deltaTime);
        this.updatePlayerActions(deltaTime);
        this.renderer.updateAmbientParticles(deltaTime, this.camera);
    }
    
    updatePlayer(deltaTime: number) {
        const { player } = this.state;
        if(player.isMoving) {
            player.animationFrame = (player.animationFrame + deltaTime * PLAYER_WALK_ANIM_SPEED) % 4;
        }
    }

    updateCamera() {
        const { player } = this.state;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const playerScaledX = player.x * TILE_SIZE * VIEW_SCALE;
        const playerScaledY = player.y * TILE_SIZE * VIEW_SCALE;
    
        const targetX = -playerScaledX + centerX;
        const targetY = -playerScaledY + centerY;
    
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
    }

    getDerivedStats() {
        const { progression, player } = this.state;
        const baseStats: { [key: string]: number } = {};
        const bonuses: { [key: string]: number } = {};
        const statBreakdown: { [key: string]: { base: number; equipment: { [key: string]: number } } } = {};
    
        // Initialize with base stats
        for (const pillar in progression.stats) {
            for (const stat in (progression.stats as any)[pillar]) {
                baseStats[stat] = (progression.stats as any)[pillar][stat];
                statBreakdown[stat] = { base: baseStats[stat], equipment: {} };
            }
        }
    
        // Add equipment bonuses
        Object.values(player.equipment).forEach((item: Gear | null | undefined) => {
            if (item) {
                for (const stat in item.stats) {
                    bonuses[stat] = (bonuses[stat] || 0) + item.stats[stat];
                    if (statBreakdown[stat]) {
                        statBreakdown[stat].equipment[item.name] = (statBreakdown[stat].equipment[item.name] || 0) + item.stats[stat];
                    } else {
                        statBreakdown[stat] = { base: 0, equipment: { [item.name]: item.stats[stat] } };
                    }
                }
            }
        });
    
        const combinedStats: { [key: string]: number } = { ...baseStats };
        for (const stat in bonuses) {
            combinedStats[stat] = (combinedStats[stat] || 0) + bonuses[stat];
        }
    
        const derived = {
            maxHp: 100 + (combinedStats.defense || 0) * 5,
            maxWoundStain: 100 + (combinedStats.destiny || 0) * 5,
            physicalDamageBonus: Math.floor((combinedStats.might || 0) / 2),
            magicalDamageBonus: Math.floor((combinedStats.arcanum || 0) / 2),
            damageReduction: (1 - 100 / (100 + (combinedStats.defense || 0) * 2)),
            critChance: 5 + (combinedStats.agility || 0) * 0.5,
            moveSpeed: 3 + (combinedStats.agility || 0) * 0.05 + (combinedStats.moveSpeed || 0),
            cropGrowthBonus: (combinedStats.plants || 0) * 0.01,
        };
        
        return { bonuses, derived, combinedStats, statBreakdown };
    }

    checkCollision(x: number, y: number): boolean {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        const grid = this.state.session.currentGameState === 'farm' ? this.state.world.gameGrid : this.state.world.dungeonGrid;

        if (!grid || !grid[gridX] || !grid[gridX][gridY]) return true; // Out of bounds

        const tile = grid[gridX][gridY];
        if (tile.type === 'wall' || (tile.object && tile.object.collides)) {
            return true;
        }
        
        return false;
    }

    startNewGame(playerName: string) {
        this.state.player.name = playerName;
        this.generateInitialFarm();
        this.state.player.x = 15.5;
        this.state.player.y = 15.5;
        this.state.session.gameRunning = true;
        this.uiManager.hideModal();
        this.uiManager.updateHotbar();
    }
    
    generateInitialFarm() {
        const grid = [];
        for (let x = 0; x < FARM_GRID_SIZE_X; x++) {
            grid[x] = [];
            for (let y = 0; y < FARM_GRID_SIZE_Y; y++) {
                grid[x][y] = { type: 'grass', isTilled: false, isWatered: false, crop: null, object: null, droppedItem: null };
            }
        }

        // Add boundaries
        for (let x = 0; x < FARM_GRID_SIZE_X; x++) {
            if (!grid[x][0].object) grid[x][0].object = { type: 'tree', variant: 'pine', collides: true, integrity: 3, maxIntegrity: 3 };
            if (!grid[x][FARM_GRID_SIZE_Y - 1].object) grid[x][FARM_GRID_SIZE_Y - 1].object = { type: 'tree', variant: 'pine', collides: true, integrity: 3, maxIntegrity: 3 };
        }
        for (let y = 1; y < FARM_GRID_SIZE_Y - 1; y++) {
            if (!grid[0][y].object) grid[0][y].object = { type: 'tree', variant: 'pine', collides: true, integrity: 3, maxIntegrity: 3 };
            if (!grid[FARM_GRID_SIZE_X - 1][y].object) grid[FARM_GRID_SIZE_X - 1][y].object = { type: 'tree', variant: 'pine', collides: true, integrity: 3, maxIntegrity: 3 };
        }
        
        // Add some random stuff
        for(let i=0; i<150; i++) { // Increased density
            const x = Math.floor(Math.random() * (FARM_GRID_SIZE_X - 2)) + 1;
            const y = Math.floor(Math.random() * (FARM_GRID_SIZE_Y - 2)) + 1;
            if (!grid[x][y].object) {
                const r = Math.random();
                if (r < 0.40) { // 40% chance for a tree
                    const treeTypeRoll = Math.random() * 100;
                    let variant = 'oak';
                    if (treeTypeRoll < 35) variant = 'oak';
                    else if (treeTypeRoll < 65) variant = 'pine';
                    else if (treeTypeRoll < 80) variant = 'birch';
                    else if (treeTypeRoll < 88) variant = 'bloomwood';
                    else if (treeTypeRoll < 94) variant = 'gloom_apple';
                    else if (treeTypeRoll < 98) variant = 'ironwood';
                    else variant = 'wealdwood';
                    grid[x][y].object = { type: 'tree', variant: variant, collides: true, integrity: 3, maxIntegrity: 3 };
                }
                else if (r < 0.70) { // 30% for a rock
                    const rockTypeRoll = Math.random() * 100;
                    let variant = 'stone';
                    if (rockTypeRoll < 60) variant = 'stone';         // 60%
                    else if (rockTypeRoll < 75) variant = 'copper';   // 15%
                    else if (rockTypeRoll < 85) variant = 'iron';     // 10%
                    else if (rockTypeRoll < 92) variant = 'tin';      // 7%
                    else if (rockTypeRoll < 96) variant = 'silver';   // 4%
                    else if (rockTypeRoll < 98) variant = 'quartz';   // 2%
                    else if (rockTypeRoll < 99.5) variant = 'amethyst'; // 1.5%
                    else variant = 'gold';                          // 0.5%
                    grid[x][y].object = { type: 'rock', variant: variant, collides: true, integrity: 3, maxIntegrity: 3 };
                }
                else if (r < 0.95) { // 25% for a bush
                    const bushTypeRoll = Math.random() * 100;
                    let variant = 'valeberry';
                    if (bushTypeRoll < 35) variant = 'valeberry';
                    else if (bushTypeRoll < 55) variant = 'bramble';
                    else if (bushTypeRoll < 70) variant = 'sun_tomato';
                    else if (bushTypeRoll < 82) variant = 'gravepetal';
                    else if (bushTypeRoll < 90) variant = 'shadow_fern';
                    else if (bushTypeRoll < 97) variant = 'moonglow';
                    else variant = 'golden_clover';
                    grid[x][y].object = { type: 'bush', variant: variant, collides: false };
                }
            }
        }

        // Clear a space for the player and important objects
        for(let x = 12; x < 19; x++) {
            for(let y = 12; y < 19; y++) {
                if(grid[x]?.[y]) grid[x][y].object = null;
            }
        }

        // Place key objects
        grid[15][12].object = { type: 'scarecrow', collides: true, id: 'patches' };
        grid[18][15].object = { type: 'portal', collides: false, id: 'hollow_maw' };
        grid[12][15].object = { type: 'forge', collides: true, id: 'forge' };
        grid[15][15].object = { type: 'bed', collides: false, id: 'player_bed' };

        this.state.world.gameGrid = grid;
        
        // Place NPCs
        this.state.entities.npcs = [
            { id: 'elara', name: 'Elara', bio: 'The village herbalist, wise and attuned to the whispers of the vale.', x: 14, y: 16, dialogueTree: { start: { text: "The soil remembers what the mind forgets. Be careful, the Vale is not what it once was.", ends: true } } },
            { id: 'cain', name: 'Cain', bio: 'The stoic blacksmith, his hammer sings songs of steel and sorrow.', x: 17, y: 16, dialogueTree: { start: { text: "Need something forged? Or perhaps... mended?", ends: true } } }
        ];
        
        this.state.progression.relationships['elara'] = 0;
        this.state.progression.relationships['cain'] = 0;
    }

    handleClick(worldX: number, worldY: number) {
        const gridX = Math.floor(worldX);
        const gridY = Math.floor(worldY);
        const { player, world, session, entities } = this.state;
        const enemyList = session.currentGameState === 'farm' ? entities.enemies : entities.dungeonEnemies;
        const grid = session.currentGameState === 'farm' ? world.gameGrid : world.dungeonGrid;

        // Check for enemy click first
        const clickedEnemy = enemyList.find((e: any) => {
            const dist = Math.sqrt(Math.pow(e.x - worldX, 2) + Math.pow(e.y - worldY, 2));
            return dist < 0.8; // Click radius
        });

        if (clickedEnemy) {
            player.interactionTarget = {
                type: 'enemy',
                entity: clickedEnemy,
                requiredTool: 'blade',
                action: 'attack'
            };
            player.movementTarget = null;
            return;
        }

        if (!grid || !grid[gridX] || !grid[gridX][gridY]) return;

        // Check for NPC click
        if (session.currentGameState === 'farm') {
            for (const npc of entities.npcs) {
                const dist = Math.sqrt(Math.pow(npc.x - worldX, 2) + Math.pow(npc.y - worldY, 2));
                if (dist < 0.8) { // Clicked on/near NPC
                    player.interactionTarget = {
                        type: 'npc',
                        entity: npc,
                        requiredTool: 'interact',
                        action: 'talk'
                    };
                    player.movementTarget = null;
                    return;
                }
            }
        }
        
        // Check for Loot Drop Click
        const clickedLoot = entities.lootDrops.find((l: any) => {
            const dist = Math.sqrt(Math.pow(l.x - worldX, 2) + Math.pow(l.y - worldY, 2));
            return dist < 0.8;
        });
        if (clickedLoot) {
             player.interactionTarget = {
                type: 'loot',
                entity: clickedLoot,
                requiredTool: 'interact',
                action: 'pickup_loot'
            };
            player.movementTarget = null;
            return;
        }

        // Check for object click or planting
        const tile = grid[gridX][gridY];
        const object = tile.object;
        if (object) {
            let requiredTool = 'interact';
            let action: string | null = null;

            switch (object.type) {
                case 'tree': requiredTool = 'axe'; action = 'chop'; break;
                case 'rock': requiredTool = 'pickaxe'; action = 'mine'; break;
                case 'bush': action = 'harvest'; break;
                case 'scarecrow': action = 'talk_scarecrow'; break;
                case 'portal': action = 'enter_portal'; break;
                case 'forge': action = 'open_crafting'; break;
                case 'bed': action = 'sleep'; break;
                case 'stairs': action = 'descend_floor'; break;
                case 'exit': action = 'leave_dungeon'; break;
            }

            if (action) {
                player.interactionTarget = {
                    x: gridX,
                    y: gridY,
                    type: 'object',
                    object: object,
                    requiredTool: requiredTool,
                    action: action
                };
                player.movementTarget = null;
                return;
            }
        }
        
        // Check for planting seeds
        const selectedItemName = player.tool;
        const itemTemplate = itemTemplates[selectedItemName];

        if (itemTemplate && itemTemplate.type === 'seed' && (this.state.inventory[selectedItemName] || 0) > 0) {
            if (tile.isTilled && !tile.crop) {
                const cropId = itemTemplate.plants;
                if (!cropId) {
                    console.error(`Seed item ${selectedItemName} is missing 'plants' property.`);
                    return;
                }
                const cropTemplate = cropTemplates[cropId];
                if (cropTemplate) {
                    tile.crop = {
                        name: cropTemplate.name,
                        stage: 0,
                        growthTime: cropTemplate.growthTime,
                        season: cropTemplate.season,
                    };
                    this.state.entities.effects.push({
                        type: 'plant_ripple',
                        x: gridX,
                        y: gridY,
                        startTime: Date.now(),
                        duration: 500
                    });
                    this.state.inventory[selectedItemName]--;
                    if (this.state.inventory[selectedItemName] <= 0) {
                        delete this.state.inventory[selectedItemName];
                        player.tool = 'interact';
                    }
                    this.uiManager.updateHotbar();
                    player.interactionTarget = null;
                    player.movementTarget = null;
                    return;
                }
            }
        }

        // No interactable found, so just move
        player.interactionTarget = null;
        player.movementTarget = { x: worldX, y: worldY };
    }

    updatePlayerActions(deltaTime: number) {
        const { player } = this.state;
        if (!player.interactionTarget) return;

        const target = player.interactionTarget;
        let targetX, targetY;

        if (target.type === 'object') {
            targetX = target.x + 0.5;
            targetY = target.y + 0.5;
        } else { // 'enemy' | 'npc' | 'loot'
            targetX = target.entity.x;
            targetY = target.entity.y;
        }

        const requiredRange = (target.action === 'attack') ? PLAYER_ATTACK_RANGE : INTERACTION_RANGE;
        
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= requiredRange) {
            if (player.tool !== target.requiredTool && target.requiredTool) {
                player.tool = target.requiredTool;
                this.uiManager.updateHotbar();
            }
            
            // Treat chopping and mining like attacks with a cooldown
            if (target.action === 'attack' || target.action === 'chop' || target.action === 'mine') {
                if (Date.now() - player.lastAttackTime > PLAYER_ATTACK_COOLDOWN) {
                    if (target.type === 'enemy') {
                        const damage = this.getDerivedStats().derived.physicalDamageBonus + 5; // Base damage
                        this.dealDamageToEnemy(target.entity, damage);
                    } else if (target.type === 'object') {
                        if (target.action === 'chop') this.chopTree(target.x, target.y);
                        if (target.action === 'mine') this.mineRock(target.x, target.y);
                    }
                    player.lastAttackTime = Date.now();
                }
            } else { // Other interactions are immediate and single-use
                if (target.type === 'object') {
                     switch (target.action) {
                        case 'harvest': this.harvestBush(target.x, target.y); break;
                        // FIX: Implemented the missing 'passDay' method.
                        case 'sleep': this.passDay(); break;
                        case 'talk_scarecrow':
                            this.state.entities.floatingTexts.push({
                                text: `The scarecrow remains silent.`,
                                x: target.x + 0.5, y: target.y - 0.5, startTime: Date.now(), duration: 2500,
                                color: { r: 220, g: 220, b: 220 }
                            });
                            player.interactionTarget = null;
                            break;
                        case 'enter_portal': this.uiManager.showHollowMawModal(); break;
                        case 'open_crafting': 
                            this.uiManager.showModal(this.uiManager.dom.craftingMenu as HTMLElement); 
                            this.uiManager.renderCraftingMenu();
                            this.uiManager.renderUpgradeMenu();
                            break;
                        case 'descend_floor': this.descendFloor(); break;
                        case 'leave_dungeon': this.leaveDungeon(); break;
                    }
                } else if (target.type === 'npc') {
                    if (target.action === 'talk') {
                        this.uiManager.showNpcDialogue(target.entity as NPC, 'start');
                    }
                } else if (target.type === 'loot') {
                     if (target.action === 'pickup_loot') {
                        this.pickupLoot(target.entity);
                     }
                }
                player.interactionTarget = null;
            }
        }
    }

    updateEnemies(deltaTime: number) {
        const { player, entities, session } = this.state;
        const now = Date.now();
        const enemyList = session.currentGameState === 'farm' ? entities.enemies : entities.dungeonEnemies;
        
        const ATTACK_ANIMATION_DURATION = 800; // ms
        const ATTACK_DAMAGE_POINT = 0.6; // 60% through animation
    
        for (const enemy of [...enemyList]) {
            const template = CREATURE_TEMPLATES[enemy.type];
            if (!template) continue;
    
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
            // State transitions
            switch (enemy.aiState) {
                case 'idle':
                    if (distToPlayer < template.detectionRange) {
                        enemy.aiState = 'chase';
                        enemy.isMoving = true;
                    } else {
                        enemy.isMoving = false;
                    }
                    break;
                case 'chase':
                    if (distToPlayer > template.detectionRange * 1.5) { // Leash
                        enemy.aiState = 'idle';
                    } else if (distToPlayer <= template.attackRange) {
                        enemy.aiState = 'attack';
                        enemy.isMoving = false;
                    }
                    break;
                case 'attack':
                    if (distToPlayer > template.attackRange) {
                        enemy.aiState = 'chase';
                        enemy.isMoving = true;
                    }
                    break;
            }
    
            // State actions
            switch (enemy.aiState) {
                case 'chase':
                    const moveSpeed = template.moveSpeed * deltaTime;
                    const moveX = (dx / distToPlayer) * moveSpeed;
                    const moveY = (dy / distToPlayer) * moveSpeed;
                    if (!this.checkCollision(enemy.x + moveX, enemy.y)) enemy.x += moveX;
                    if (!this.checkCollision(enemy.x, enemy.y + moveY)) enemy.y += moveY;
                    break;
                case 'attack':
                    // START attack animation if cooldown is ready
                    if (now - enemy.lastAttackTime > template.attackCooldown) {
                        enemy.lastAttackTime = now; // Marks start of animation
                        enemy.attackAnimationProgress = 0;
                    }
                    break;
            }
            
            // Handle ongoing attack animation for any enemy
            if (typeof enemy.attackAnimationProgress === 'number') {
                const newProgress = (now - enemy.lastAttackTime) / ATTACK_ANIMATION_DURATION;
                
                if (newProgress < 1) {
                    // Deal damage once, right as we cross the damage point threshold
                    if (newProgress >= ATTACK_DAMAGE_POINT && enemy.attackAnimationProgress < ATTACK_DAMAGE_POINT) {
                        this.dealDamageToPlayer(template.baseDamage);
                    }
                    enemy.attackAnimationProgress = newProgress;
                } else {
                    // Animation finished
                    enemy.attackAnimationProgress = undefined;
                    // Cooldown starts from when the animation began.
                }
            }

            // Update animation frame
            if (enemy.isMoving) {
                 enemy.animationFrame = (enemy.animationFrame + deltaTime * template.walkAnimSpeed) % 4;
            }
        }
    }
    
    dealDamageToPlayer(damage: number) {
        const { player, entities } = this.state;
        player.hp -= damage;
        player.lastHitTime = Date.now();
        this.uiManager.flashDamage();
        entities.floatingTexts.push({
            text: `-${damage}`,
            x: player.x, y: player.y - 0.5, startTime: Date.now(), duration: 2000,
            color: { r: 255, g: 80, b: 80 }
        });
        if (player.hp <= 0) {
            // TODO: Player death logic
            console.log("Player has been defeated.");
        }
    }

    dealDamageToEnemy(enemy: any, damage: number) {
        if (!enemy || enemy.hp <= 0) return;
        enemy.hp -= damage;
        enemy.lastHitTime = Date.now();
        this.state.entities.floatingTexts.push({
            text: `-${damage}`,
            x: enemy.x, y: enemy.y, startTime: Date.now(), duration: 2000,
            color: { r: 255, g: 255, b: 200 }
        });
        if (enemy.hp <= 0) {
            this.handleEnemyDeath(enemy);
        }
    }

    async handleEnemyDeath(enemy: any) {
        const template = CREATURE_TEMPLATES[enemy.type];
        if (!template) return;
        // Give XP
        this.state.progression.xp += template.xpValue;
        
        // Remove enemy
        if (this.state.session.currentGameState === 'farm') {
            this.state.entities.enemies = this.state.entities.enemies.filter((e: any) => e.id !== enemy.id);
        } else {
            this.state.entities.dungeonEnemies = this.state.entities.dungeonEnemies.filter((e: any) => e.id !== enemy.id);
        }
        
        // Clear player target if it was this enemy
        const target = this.state.player.interactionTarget;
        if (target && target.type === 'enemy' && target.entity.id === enemy.id) {
            this.state.player.interactionTarget = null;
        }
        
        // FIX: Implemented the missing 'updateBestiary' method.
        this.updateBestiary(enemy.type, template);

        // Generate and drop loot
        const lootItems: (Gear | {name: string, quantity: number})[] = [];

        // Drop materials
        const materialDrops = template.drops;
        for (const itemName in materialDrops) {
            const [min, max] = materialDrops[itemName];
            const amount = Math.floor(Math.random() * (max - min + 1)) + min;
            if (amount > 0) {
                lootItems.push({ name: itemName, quantity: amount });
            }
        }

        // Chance to drop generated gear
        if (Math.random() < 0.5) { // 50% chance to drop gear
            const newItem = await this.itemGenerator.generateItem(this.state.progression.level, this.state.session.currentGameState);
            if (newItem) {
                lootItems.push(newItem);
            }
        }

        if (lootItems.length > 0) {
            const lootDrop = {
                id: 'loot_' + Date.now(),
                x: enemy.x,
                y: enemy.y,
                items: lootItems
            };
            this.state.entities.lootDrops.push(lootDrop);
        }
    }

    pickupLoot(lootDrop: any) {
        for (const item of lootDrop.items) {
            if ('instanceId' in item) { // It's Gear
                this.state.player.gear.push(item);
                this.state.entities.floatingTexts.push({
                    text: `+ ${item.name}`,
                    x: lootDrop.x, y: lootDrop.y, startTime: Date.now(), duration: 2500,
                    color: { r: parseInt(item.rarity.color.slice(1,3), 16), g: parseInt(item.rarity.color.slice(3,5), 16), b: parseInt(item.rarity.color.slice(5,7), 16) }
                });
            } else { // It's a material/consumable
                this.state.inventory[item.name] = (this.state.inventory[item.name] || 0) + item.quantity;
                this.state.entities.floatingTexts.push({
                    text: `+${item.quantity} ${item.name}`,
                    x: lootDrop.x, y: lootDrop.y, startTime: Date.now(), duration: 2000,
                    color: { r: 250, g: 204, b: 21 }
                });
            }
        }
        
        this.state.entities.lootDrops = this.state.entities.lootDrops.filter((l: any) => l.id !== lootDrop.id);
        this.uiManager.renderInventory();
        this.uiManager.updateHotbar();
    }

    chopTree(x: number, y: number) {
        const grid = this.state.world.gameGrid;
        const treeObject = grid[x]?.[y]?.object;
    
        if (treeObject?.type !== 'tree') return;
        
        treeObject.integrity = (treeObject.integrity ?? 1) - 1;

        // Particle effects
        const leafColor = { r: 22, g: 101, b: 52 };
        for (let i = 0; i < 15; i++) {
            this.state.entities.particles.push({
                x: x + 0.5, y: y,
                vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 2 - 4,
                duration: 1500, size: 12 + Math.random() * 20,
                type: 'leaf', color: leafColor, startTime: Date.now()
            });
            this.state.entities.particles.push({
                x: x + 0.5, y: y + 0.5,
                vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 - 3,
                duration: 1000, size: 8 + Math.random() * 16,
                type: 'spark', color: { r: 111, g: 69, b: 42 }, startTime: Date.now()
            });
        }
    
        if (treeObject.integrity <= 0) {
            grid[x][y].object = null; // Remove the tree
            this.state.player.interactionTarget = null; // Clear target

            const variant = treeObject.variant || 'oak';
            let woodName: string;
            let woodAmount = 3 + Math.floor(Math.random() * 3);
            let secondaryDrop: { name: string, amount: number } | null = null;
            let spawnEnemy = false;
        
            switch (variant) {
                case 'pine': woodName = 'Pine Wood'; break;
                case 'birch': woodName = 'Birch Wood'; break;
                case 'wealdwood':
                    woodName = 'Wealdwood';
                    if (Math.random() < 0.25) spawnEnemy = true; // 25% chance
                    break;
                case 'bloomwood':
                    woodName = 'Bloomwood';
                    secondaryDrop = { name: 'Sunpetal', amount: 1 + Math.floor(Math.random() * 2) };
                    break;
                case 'gloom_apple':
                    woodName = 'Oak Wood'; // Apple trees give common wood
                    secondaryDrop = { name: 'Gloom Apple', amount: 2 + Math.floor(Math.random() * 3) };
                    break;
                case 'ironwood': 
                    woodName = 'Ironwood'; 
                    woodAmount = 1 + Math.floor(Math.random() * 2); // Less yield
                    break;
                default: // oak
                    woodName = 'Oak Wood';
                    break;
            }
        
            // Add wood to inventory
            this.state.inventory[woodName] = (this.state.inventory[woodName] || 0) + woodAmount;
            // FIX: Implemented the missing 'updatePlantPedia' method.
            this.updatePlantPedia(woodName);
            this.state.entities.floatingTexts.push({
                text: `+${woodAmount} ${woodName}`,
                x: x + 0.5, y: y, startTime: Date.now(), duration: 2000,
                color: { r: 210, g: 180, b: 140 }
            });
        
            // Add secondary drop to inventory
            if (secondaryDrop) {
                this.state.inventory[secondaryDrop.name] = (this.state.inventory[secondaryDrop.name] || 0) + secondaryDrop.amount;
                // FIX: Implemented the missing 'updatePlantPedia' method.
                this.updatePlantPedia(secondaryDrop.name);
                this.state.entities.floatingTexts.push({
                    text: `+${secondaryDrop.amount} ${secondaryDrop.name}`,
                    x: x + 0.5, y: y - 0.5, startTime: Date.now(), duration: 2000,
                    color: { r: 255, g: 220, b: 150 }
                });
            }
            
            // Spawn enemy if applicable
            if (spawnEnemy) {
                const enemyTemplate = CREATURE_TEMPLATES['weeping_root'];
                this.state.entities.enemies.push({
                    id: Date.now(),
                    type: 'weeping_root',
                    x: x + 0.5,
                    y: y + 0.5,
                    hp: enemyTemplate.baseHp,
                    maxHp: enemyTemplate.baseHp,
                    lastHitTime: 0,
                    aiState: 'idle',
                    lastAttackTime: 0,
                    isMoving: false,
                    animationFrame: 0,
                });
                this.state.entities.floatingTexts.push({
                    text: `A creature appears!`,
                    x: x + 0.5, y: y - 0.5, startTime: Date.now(), duration: 2500,
                    color: { r: 255, g: 50, b: 50 }
                });
            }
        
            this.uiManager.renderInventory();
            this.uiManager.updateHotbar();
        }
    }

    mineRock(x: number, y: number) {
        const grid = this.state.world.gameGrid;
        const rockObject = grid[x]?.[y]?.object;
        if (rockObject?.type !== 'rock') return;
        
        rockObject.integrity = (rockObject.integrity ?? 1) - 1;

        // Particle effects
        for (let i = 0; i < 15; i++) {
            this.state.entities.particles.push({
                x: x + 0.5, y: y + 0.5,
                vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2 - 3,
                duration: 800, size: 8 + Math.random() * 12,
                type: 'spark',
                color: { r: 150, g: 150, b: 150 },
                startTime: Date.now()
            });
        }
        
        if (rockObject.integrity <= 0) {
            grid[x][y].object = null;
            this.state.player.interactionTarget = null;
            
            const variant = rockObject.variant || 'stone';
            const resourceAmount = 2 + Math.floor(Math.random() * 3);
            
            let resourceName = 'Stone';
            let color = { r: 200, g: 200, b: 200 };
            switch (variant) {
                case 'copper': resourceName = 'Copper Ore'; color = {r: 217, g: 119, b: 6}; break;
                case 'tin': resourceName = 'Tin Ore'; color = {r: 212, g: 212, b: 216}; break;
                case 'iron': resourceName = 'Iron Ore'; color = {r:165, g:92, b:61}; break;
                case 'silver': resourceName = 'Silver Ore'; color = {r: 229, g: 231, b: 235}; break;
                case 'gold': resourceName = 'Gold'; color = {r: 245, g: 158, b: 11}; break;
                case 'quartz': resourceName = 'Quartz'; color = {r: 248, g: 250, b: 252}; break;
                case 'amethyst': resourceName = 'Amethyst'; color = {r: 192, g: 132, b: 252}; break;
                default: resourceName = 'Stone'; break;
            }

            this.state.inventory[resourceName] = (this.state.inventory[resourceName] || 0) + resourceAmount;
            // FIX: Implemented the missing 'updatePlantPedia' method.
            this.updatePlantPedia(resourceName);
            this.state.entities.floatingTexts.push({
                text: `+${resourceAmount} ${resourceName}`,
                x: x + 0.5, y: y, startTime: Date.now(), duration: 2000,
                color: color
            });
            
            this.uiManager.renderInventory();
        }
    }

    harvestBush(x: number, y: number) {
        const grid = this.state.world.gameGrid;
        const bushObject = grid[x]?.[y]?.object;

        if (bushObject?.type !== 'bush') return;

        grid[x][y].object = null; // Remove the bush

        // --- Primary Drop ---
        let primaryDrop: string | null = null;
        let dropAmount = 1 + Math.floor(Math.random() * 2);
        let primaryColor = { r: 239, g: 68, b: 68 };

        switch (bushObject.variant) {
            case 'bramble': primaryDrop = 'Brambleberry'; dropAmount = 2; primaryColor = { r: 225, g: 29, b: 72 }; break;
            case 'gravepetal': primaryDrop = 'Gravepetal'; primaryColor = { r: 220, g: 220, b: 250 }; break;
            case 'sun_tomato': primaryDrop = 'Sun-Kissed Tomato'; primaryColor = { r: 255, g: 100, b: 100 }; break;
            case 'shadow_fern': primaryDrop = 'Shadowshroom'; primaryColor = { r: 110, g: 100, b: 130 }; break;
            case 'moonglow': primaryDrop = 'Moonglow'; primaryColor = { r: 200, g: 220, b: 255 }; break;
            case 'golden_clover': primaryDrop = 'Gold'; dropAmount = 5 + Math.floor(Math.random() * 10); primaryColor = { r: 245, g: 158, b: 11 }; break;
            case 'valeberry': primaryDrop = 'Valeberry'; break;
        }

        if (primaryDrop) {
            this.state.inventory[primaryDrop] = (this.state.inventory[primaryDrop] || 0) + dropAmount;
            // FIX: Implemented the missing 'updatePlantPedia' method.
            this.updatePlantPedia(primaryDrop);
            this.state.entities.floatingTexts.push({
                text: `+${dropAmount} ${primaryDrop}`,
                x: x + 0.5, y: y, startTime: Date.now(), duration: 2000,
                color: primaryColor
            });
        }

        // --- Secondary Event Roll ---
        if (bushObject.variant === 'golden_clover') {
            if (Math.random() < 0.1) {
                const treasure = 'Worn Locket';
                this.state.inventory[treasure] = (this.state.inventory[treasure] || 0) + 1;
                this.state.entities.floatingTexts.push({
                    text: `+1 ${treasure}!`,
                    x: x + 0.5, y: y - 0.5, startTime: Date.now(), duration: 2500,
                    color: { r: 250, g: 204, b: 21 }
                });
            }
        } else {
            const roll = Math.random() * 100;
            if (roll < 10) { // 10% enemy
                const enemyType = Math.random() < 0.5 ? 'shadow_creeper' : 'weeping_root';
                const enemyTemplate = CREATURE_TEMPLATES[enemyType];
                this.state.entities.enemies.push({
                    id: Date.now(), type: enemyType,
                    x: x + 0.5, y: y + 0.5,
                    hp: enemyTemplate.baseHp, maxHp: enemyTemplate.baseHp,
                    lastHitTime: 0, aiState: 'idle', lastAttackTime: 0,
                    isMoving: false, animationFrame: 0,
                });
                this.state.entities.floatingTexts.push({
                    text: `Ambush!`,
                    x: x + 0.5, y: y - 0.5, startTime: Date.now(), duration: 2500,
                    color: { r: 255, g: 50, b: 50 }
                });
            } else if (roll < 15) { // 5% treasure (10-15)
                const treasure = Math.random() < 0.9 ? 'Gold' : 'Worn Locket';
                const amount = treasure === 'Gold' ? 5 + Math.floor(Math.random() * 10) : 1;
                this.state.inventory[treasure] = (this.state.inventory[treasure] || 0) + amount;
                this.state.entities.floatingTexts.push({
                    text: `+${amount} ${treasure}!`,
                    x: x + 0.5, y: y - 0.5, startTime: Date.now(), duration: 2500,
                    color: { r: 250, g: 204, b: 21 }
                });
            } else if (roll < 30) { // 15% thorns (15-30)
                const damage = 1 + Math.floor(Math.random() * 3);
                this.dealDamageToPlayer(damage);
            }
        }
        
        this.uiManager.renderInventory();
        this.uiManager.updateHotbar();
    }

    handleKeyboardInteraction() {
        const { player, world, session, entities } = this.state;
        const now = Date.now();

        // Prevent spamming actions
        if ((player.tool === 'blade' || player.tool === 'axe' || player.tool === 'pickaxe') && now - player.lastAttackTime < PLAYER_ATTACK_COOLDOWN) {
            return;
        }

        // Determine target coordinates based on player direction
        const targetX = player.x + player.direction.dx * 0.7;
        const targetY = player.y + player.direction.dy * 0.7;
        const gridX = Math.floor(targetX);
        const gridY = Math.floor(targetY);

        const enemyList = session.currentGameState === 'farm' ? entities.enemies : entities.dungeonEnemies;
        const grid = session.currentGameState === 'farm' ? world.gameGrid : world.dungeonGrid;

        // 1. Check for enemy in front
        const enemyInFront = enemyList.find(e => {
            const dist = Math.sqrt(Math.pow(e.x - targetX, 2) + Math.pow(e.y - targetY, 2));
            return dist < 1.0;
        });

        if (enemyInFront && player.tool === 'blade') {
            player.interactionTarget = { type: 'enemy', entity: enemyInFront, requiredTool: 'blade', action: 'attack' };
            player.movementTarget = null;
            return;
        }

        // 2. Check for object on tile in front
        if (grid && grid[gridX] && grid[gridX][gridY]) {
            const tile = grid[gridX][gridY];
            const object = tile.object;

            if (object) {
                let requiredTool = 'interact';
                let action: string | null = null;
                switch (object.type) {
                    case 'tree': requiredTool = 'axe'; action = 'chop'; break;
                    case 'rock': requiredTool = 'pickaxe'; action = 'mine'; break;
                    case 'bush': requiredTool = 'interact'; action = 'harvest'; break;
                    case 'scarecrow': requiredTool = 'interact'; action = 'talk_scarecrow'; break;
                    case 'portal': requiredTool = 'interact'; action = 'enter_portal'; break;
                    case 'forge': requiredTool = 'interact'; action = 'open_crafting'; break;
                    case 'bed': requiredTool = 'interact'; action = 'sleep'; break;
                    case 'stairs': requiredTool = 'interact'; action = 'descend_floor'; break;
                    case 'exit': requiredTool = 'interact'; action = 'leave_dungeon'; break;
                }

                if (action && player.tool === requiredTool) {
                    player.interactionTarget = { x: gridX, y: gridY, type: 'object', object, requiredTool, action };
                    player.movementTarget = null;
                    return;
                }
            }
        }
        
        // 3. Perform ground-based action if no object/enemy target found
        const tileInFront = grid?.[gridX]?.[gridY];
        if (tileInFront) {
            if (player.tool === 'hoe' && tileInFront.type === 'grass' && !tileInFront.object && !tileInFront.isTilled) {
                tileInFront.isTilled = true;
                return;
            }
            if (player.tool === 'watering_can' && tileInFront.isTilled && !tileInFront.isWatered) {
                tileInFront.isWatered = true;
                return;
            }
             // Check for planting seeds (with seed equipped)
            const selectedItemName = player.tool;
            const itemTemplate = itemTemplates[selectedItemName];
            if (itemTemplate && itemTemplate.type === 'seed' && (this.state.inventory[selectedItemName] || 0) > 0) {
                if (tileInFront.isTilled && !tileInFront.crop) {
                    const cropId = itemTemplate.plants;
                    if (!cropId) return; // fail silently
                    
                    const cropTemplate = cropTemplates[cropId];
                    if (cropTemplate) {
                        tileInFront.crop = {
                            name: cropTemplate.name,
                            stage: 0,
                            growthTime: cropTemplate.growthTime,
                            season: cropTemplate.season,
                        };
                        this.state.entities.effects.push({
                            type: 'plant_ripple',
                            x: gridX,
                            y: gridY,
                            startTime: Date.now(),
                            duration: 500
                        });
                        this.state.inventory[selectedItemName]--;
                        if (this.state.inventory[selectedItemName] <= 0) {
                            delete this.state.inventory[selectedItemName];
                            player.tool = 'interact';
                        }
                        this.uiManager.updateHotbar();
                        return;
                    }
                }
            }
        }

        // 4. Perform a generic tool swing
        if ((player.tool === 'blade' || player.tool === 'axe' || player.tool === 'pickaxe') && now - player.lastAttackTime > PLAYER_ATTACK_COOLDOWN) {
            player.lastAttackTime = now;
            
            // If it's a blade, check for AoE damage
            if (player.tool === 'blade') {
                const attackArcWidth = Math.PI / 2; // 90 degree arc
                const playerAngle = Math.atan2(player.direction.dy, player.direction.dx);

                enemyList.forEach(enemy => {
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < PLAYER_ATTACK_RANGE) {
                        const angleToEnemy = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(playerAngle - angleToEnemy);
                        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                        if (angleDiff <= attackArcWidth / 2) {
                            const damage = this.getDerivedStats().derived.physicalDamageBonus + 5;
                            this.dealDamageToEnemy(enemy, damage);
                        }
                    }
                });
            }
        }
    }

    defineRituals(): Ritual[] {
        // In a full implementation, rituals would be defined here.
        return [];
    }

    passDay() {
        const { world, player, session } = this.state;

        world.gameDay++;
        world.gameTime = 360; // Start day at 6 AM
        session.nightEventTriggered = false;

        if (world.gameDay > DAYS_PER_SEASON) {
            world.gameDay = 1;
            const currentSeasonIndex = SEASONS.indexOf(world.gameSeason);
            const nextSeasonIndex = (currentSeasonIndex + 1) % SEASONS.length;
            world.gameSeason = SEASONS[nextSeasonIndex];
            if (nextSeasonIndex === 0) {
                world.gameYear++;
            }
        }

        const moonIndex = MOON_PHASES.indexOf(world.moonPhase);
        world.moonPhase = MOON_PHASES[(moonIndex + 1) % MOON_PHASES.length];

        for (const row of world.gameGrid) {
            for (const tile of row) {
                if (tile.crop && tile.isWatered) {
                    const template = cropTemplates[tile.crop.name];
                    if (template) {
                        let growthModifier = 1.0;
                        if (template.season === world.gameSeason) {
                            growthModifier = IN_SEASON_GROWTH_MULTIPLIER;
                        } else if (template.season) {
                            growthModifier = OUT_OF_SEASON_GROWTH_MULTIPLIER;
                        }
                        tile.crop.stage += growthModifier;
                    }
                }
                tile.isWatered = false;
            }
        }

        player.hp = this.getDerivedStats().derived.maxHp;
        player.woundStain = 0;
        player.abilityCooldowns = {};

        this.uiManager.updateHotbar();
        this.state.save();
        
        this.uiManager.hideModal();
    }
    
    updateBestiary(creatureType: string, template: CreatureTemplate) {
        if (!this.state.progression.bestiary[creatureType]) {
            this.state.progression.bestiary[creatureType] = {
                name: template.name,
                description: template.description,
                kills: 0,
                drops: template.drops
            };
        }
        this.state.progression.bestiary[creatureType].kills++;
    }

    updatePlantPedia(itemName: string) {
        if (this.state.progression.plantPedia[itemName]) return;

        const item = itemTemplates[itemName] || cropTemplates[itemName];
        if (item && (item.type === 'material' || item.type === 'consumable' || item.type === 'seed' || cropTemplates[itemName])) {
             this.state.progression.plantPedia[itemName] = {
                name: item.name,
                description: item.description,
                yields: cropTemplates[itemName]?.yields || itemName,
                discoveryState: 'discovered'
            };
        }
    }
    

    dropItem(itemName: string) {
        if ((this.state.inventory[itemName] || 0) <= 0) return;

        this.state.inventory[itemName]--;
        if (this.state.inventory[itemName] <= 0) {
            delete this.state.inventory[itemName];
            this.state.session.selectedInventoryItem = null;
        }
        
        console.log(`Dropped 1x ${itemName}`);

        this.uiManager.renderInventory();
        this.uiManager.updateHotbar();
    }
    
    selectDialogueOption(option: { text: string; leadsTo?: string; action?: any }) {
        const npcId = this.state.session.currentNpcInteraction?.npcId;
        if (!npcId) {
             this.uiManager.hideModal();
             return;
        }

        const npc = this.state.entities.npcs.find(n => n.id === npcId);
        if (!npc) {
            this.uiManager.hideModal();
            return;
        }

        if (option.leadsTo) {
            this.uiManager.showNpcDialogue(npc, option.leadsTo);
        } else {
            this.uiManager.hideModal();
        }
    }

    activateAbility(tool: string) { /* Not yet implemented */ }
    
    
    startDungeon() {
        this.uiManager.hideModal();
        const { session, player } = this.state;
        session.farmStateCache = { playerX: player.x, playerY: player.y };
        session.currentGameState = 'dungeon';
        session.dungeonFloor = 1;
        this.generateDungeonFloor();
    }
    
    leaveDungeon() {
        const { session, player } = this.state;
        session.currentGameState = 'farm';
        player.x = session.farmStateCache.playerX;
        player.y = session.farmStateCache.playerY;
        this.state.entities.dungeonEnemies = [];
    }

    descendFloor() {
        this.state.session.dungeonFloor++;
        this.generateDungeonFloor();
    }

    generateDungeonFloor() {
        const { session, world, player, entities } = this.state;
        entities.dungeonEnemies = [];
        entities.lootDrops = [];

        const floor = session.dungeonFloor;
        const themeIndex = Math.floor((floor - 1) / DUNGEON_FLOORS_PER_THEME);
        const themes = ['Crypts', 'Grotto', 'Roots'] as const;
        session.dungeonTheme = themes[themeIndex % themes.length];
        
        const grid = Array(DUNGEON_GRID_SIZE_X).fill(0).map(() => Array(DUNGEON_GRID_SIZE_Y).fill(0).map(() => ({ type: 'wall', isTilled: false, isWatered: false, crop: null, object: null, droppedItem: null })));
        
        const rooms: {x:number, y:number, width:number, height:number}[] = [];
        const numRooms = 7 + Math.floor(Math.random() * 4);

        for (let i=0; i<numRooms; i++) {
            const width = 4 + Math.floor(Math.random() * 5);
            const height = 4 + Math.floor(Math.random() * 5);
            const x = 1 + Math.floor(Math.random() * (DUNGEON_GRID_SIZE_X - width - 2));
            const y = 1 + Math.floor(Math.random() * (DUNGEON_GRID_SIZE_Y - height - 2));
            
            let overlaps = false;
            for (const room of rooms) {
                if (x < room.x + room.width && x + width > room.x && y < room.y + room.height && y + height > room.y) {
                    overlaps = true; break;
                }
            }
            if (!overlaps) rooms.push({ x, y, width, height });
        }
        
        world.dungeonRooms = rooms;

        rooms.forEach((room, index) => {
            for (let rx = room.x; rx < room.x + room.width; rx++) {
                for (let ry = room.y; ry < room.y + room.height; ry++) {
                    grid[rx][ry].type = 'floor';
                }
            }
            if (index > 0) {
                const prev = rooms[index - 1];
                const prevCenterX = prev.x + Math.floor(prev.width / 2);
                const prevCenterY = prev.y + Math.floor(prev.height / 2);
                const currCenterX = room.x + Math.floor(room.width / 2);
                const currCenterY = room.y + Math.floor(room.height / 2);

                if (Math.random() > 0.5) {
                    for(let hx=Math.min(prevCenterX, currCenterX); hx<=Math.max(prevCenterX, currCenterX); hx++) grid[hx][prevCenterY].type = 'floor';
                    for(let vy=Math.min(prevCenterY, currCenterY); vy<=Math.max(prevCenterY, currCenterY); vy++) grid[currCenterX][vy].type = 'floor';
                } else {
                    for(let vy=Math.min(prevCenterY, currCenterY); vy<=Math.max(prevCenterY, currCenterY); vy++) grid[prevCenterX][vy].type = 'floor';
                    for(let hx=Math.min(prevCenterX, currCenterX); hx<=Math.max(prevCenterX, currCenterX); hx++) grid[hx][currCenterY].type = 'floor';
                }
            }
        });

        const startRoom = rooms[0];
        player.x = startRoom.x + Math.floor(startRoom.width / 2);
        player.y = startRoom.y + Math.floor(startRoom.height / 2);
        grid[Math.floor(player.x - 1)][Math.floor(player.y)].object = { type: 'exit', collides: false };
        
        const endRoom = rooms[rooms.length - 1];
        grid[endRoom.x + Math.floor(endRoom.width / 2)][endRoom.y + Math.floor(endRoom.height / 2)].object = { type: 'stairs', collides: false };

        rooms.slice(1).forEach(room => {
            const enemyCount = 1 + Math.floor(Math.random() * 3);
            for(let i=0; i<enemyCount; i++) {
                const ex = room.x + Math.floor(Math.random() * room.width);
                const ey = room.y + Math.floor(Math.random() * room.height);
                if (grid[ex][ey].type === 'floor') {
                    const enemyType = ['weeping_root', 'shadow_creeper', 'stone_golem', 'whispering_shade'][Math.floor(Math.random() * 4)];
                    const template = CREATURE_TEMPLATES[enemyType];
                    entities.dungeonEnemies.push({
                         id: `e_${ex}_${ey}`, type: enemyType, x: ex + 0.5, y: ey + 0.5,
                         hp: template.baseHp, maxHp: template.baseHp,
                         lastHitTime: 0, aiState: 'idle', lastAttackTime: 0,
                         isMoving: false, animationFrame: 0,
                    });
                }
            }
        });

        world.dungeonGrid = grid;
    }

    saveGame() { this.state.save(); }
    loadGame() { 
        if(this.state.load()) {
            this.uiManager.hideModal();
            this.state.session.gameRunning = true;
            this.uiManager.renderJournal();
            this.uiManager.updateHotbar();
        }
     }

    spendAttributePoint(stat: string) {
        if (this.state.progression.attributePoints <= 0) return;

        let statFound = false;
        for (const pillar in this.state.progression.stats) {
            if (Object.keys((this.state.progression.stats as any)[pillar]).includes(stat)) {
                (this.state.progression.stats as any)[pillar][stat]++;
                statFound = true;
                break;
            }
        }

        if (statFound) {
            this.state.progression.attributePoints--;
            this.uiManager.renderCharacterTab();
        }
    }
    
    useInventoryItem(itemName: string) {
        if (!itemName || (this.state.inventory[itemName] || 0) <= 0) return;
        
        const item = itemTemplates[itemName] || cropTemplates[itemName];
        if (!item || item.type !== 'consumable' || !item.effect) return;

        this.state.inventory[itemName]--;
        
        const { effect } = item;
        const { player, entities } = this.state;

        switch (effect.type) {
            case 'heal':
                const oldHp = player.hp;
                player.hp = Math.min(player.maxHp, player.hp + effect.amount);
                const healedAmount = Math.ceil(player.hp - oldHp);
                if (healedAmount > 0) {
                    entities.floatingTexts.push({
                        text: `+${healedAmount} HP`,
                        x: player.x, y: player.y - 0.5, startTime: Date.now(), duration: 2000,
                        color: { r: 100, g: 255, b: 100 }
                    });
                }
                break;
        }

        if (this.state.inventory[itemName] <= 0) {
            delete this.state.inventory[itemName];
        }

        this.uiManager.renderInventory();
        this.uiManager.updateHotbar();
    }

    sellInventoryItem(itemName: string) { /* Not yet implemented */ }
    
    equipGear(gearId: string) {
        const { player } = this.state;
        const gearIndex = player.gear.findIndex(g => g.instanceId === gearId);
        if (gearIndex === -1) return;
    
        const gearToEquip = player.gear[gearIndex];
        const slot = gearToEquip.slot;
    
        // Unequip current item in that slot, if any
        const currentItem = player.equipment[slot];
        if (currentItem) {
            player.gear.push(currentItem);
        }
    
        // Equip new item
        player.equipment[slot] = gearToEquip;
        player.gear.splice(gearIndex, 1);
    
        this.uiManager.renderInventory();
        this.uiManager.renderEquipmentTab();
        this.uiManager.renderCharacterTab();
    }

    unequipGear(slot: EquipmentSlot) {
        const { player } = this.state;
        const itemToUnequip = player.equipment[slot];
        if (!itemToUnequip) return;
    
        player.gear.push(itemToUnequip);
        player.equipment[slot] = null;
    
        this.uiManager.renderInventory();
        this.uiManager.renderEquipmentTab();
        this.uiManager.renderCharacterTab();
    }

    brewRecipe(recipeName: string) { /* Not yet implemented */ }
    
    craftRecipe(recipeName: string) {
        const recipe = smithingRecipes[recipeName];
        if (!recipe) {
            console.error(`Recipe ${recipeName} not found.`);
            return;
        }

        // 1. Check materials
        for (const material in recipe.materials) {
            const required = recipe.materials[material];
            const owned = this.state.inventory[material] || 0;
            if (owned < required) {
                // This case should be prevented by a disabled button, but as a safeguard:
                console.log(`Not enough ${material}.`);
                return;
            }
        }

        // 2. Consume materials
        for (const material in recipe.materials) {
            this.state.inventory[material] -= recipe.materials[material];
            if (this.state.inventory[material] <= 0) {
                delete this.state.inventory[material];
            }
        }

        // 3. Create result item
        const resultTemplate = itemTemplates[recipe.result];
        if (!resultTemplate || !resultTemplate.slot) {
            console.error(`Result item template ${recipe.result} not found or is missing a slot.`);
            // TODO: Ideally, refund materials here.
            return;
        }

        const newGear: Gear = {
            instanceId: `crafted_${recipe.result}_${Date.now()}`,
            name: resultTemplate.name,
            slot: resultTemplate.slot,
            stats: { ...(resultTemplate.baseStats || {}) },
            effects: [],
            visualTags: [],
            rarity: resultTemplate.rarity || { name: 'Simple', color: '#f5f1e8' },
            rarityColor: resultTemplate.rarity?.color || '#f5f1e8',
            baseItemId: recipe.result,
            material: 'Iron', // This could be more dynamic in the future
            condition: 'Sturdy',
            affixes: [],
            level: 1,
            value: resultTemplate.value || 0
        };

        this.state.player.gear.push(newGear);

        // 4. Feedback
        this.state.entities.floatingTexts.push({
            text: `Crafted ${newGear.name}!`,
            x: this.state.player.x, y: this.state.player.y - 0.5, startTime: Date.now(), duration: 2500,
            color: { r: 132, g: 204, b: 22 } // lime-500
        });

        // 5. Update UI
        this.uiManager.renderCraftingMenu();
        this.uiManager.renderInventory();
    }
    
    upgradeGear() {
        const { session, player, progression, inventory } = this.state;
        const gearId = session.selectedUpgradeGearId;
        if (!gearId) return;

        const gear = player.gear.find((g: Gear) => g.instanceId === gearId) || Object.values(player.equipment).find(g => g?.instanceId === gearId);
        if (!gear) {
            this.uiManager.setUpgradeStatus("Selected item not found.", false);
            return;
        }

        const level = gear.level || 0;
        const dustCost = level + 1;
        const goldCost = 50 * Math.pow(level + 1, 2);

        const ownedDust = inventory['Glimmering Dust'] || 0;
        const canAfford = progression.gold >= goldCost && ownedDust >= dustCost;

        if (canAfford) {
            inventory['Glimmering Dust'] -= dustCost;
            progression.gold -= goldCost;
            gear.level++;
            // Basic stat scaling on upgrade
            for(const stat in gear.stats) {
                // A simple multiplier, could be more complex
                gear.stats[stat] = Math.ceil(gear.stats[stat] * 1.12 + 1);
            }
            this.uiManager.setUpgradeStatus("Upgrade successful!", true);
            this.uiManager.renderUpgradeMenu();
            this.uiManager.renderCharacterTab(); // To refresh stats if equipped
        } else {
            this.uiManager.setUpgradeStatus("Insufficient materials or gold.", false);
        }
    }
}