

import type { Player, World, Entities, Progression, Inventory, Session, GameStateData, Tile, EquipmentSlot } from '../types/index';
import { itemTemplates, starterGearTemplates } from '../data/items';
import { Gear } from '../types/index';

export class GameState implements GameStateData {
    player: Player;
    world: World;
    entities: Entities;
    progression: Progression;
    inventory: Inventory;
    session: Session;
    imageCache: { [key: string]: HTMLImageElement };
    nextItemId: number;

    constructor() {
        const initialEquipment: { [key: string]: Gear } = {};

        starterGearTemplates.forEach(starter => {
            const template = itemTemplates[starter.baseItemId];
            if (!template || !template.slot) {
                console.error(`Could not create starter gear from template: ${starter.baseItemId}`);
                return;
            }
    
            // Determine correct slot, especially for rings
            let slot = template.slot;
            if (template.slot === 'finger1' && starter.instanceId.includes('ring2')) {
                slot = 'finger2';
            }
    
            const newGear: Gear = {
                instanceId: starter.instanceId,
                name: starter.name,
                level: 1,
                value: template.value || 0,
                slot: slot,
                baseItemId: starter.baseItemId,
                stats: { ...(template.baseStats || {}) },
                effects: [], // Starter gear has no special effects
                visualTags: [],
                rarity: template.rarity || { name: 'Crude', color: '#9ca3af' },
                rarityColor: template.rarity?.color || '#9ca3af',
                material: starter.material,
                condition: starter.condition,
                affixes: starter.affixes,
            };
            
            initialEquipment[slot] = newGear;
        });
        
        this.player = {
            name: 'Wanderer',
            x: 12.5, y: 12.5, tool: 'interact',
            hp: 100, maxHp: 100,
            woundStain: 0, maxWoundStain: 100,
            lastAttackTime: 0,
            lastHitTime: 0,
            buffs: [],
            equipment: initialEquipment as { [key in EquipmentSlot]?: Gear | null },
            gear: [],
            interactionTarget: null, 
            movementTarget: null, 
            abilityCooldowns: {},
            isMoving: false,
            animationFrame: 0,
            direction: { dx: 0, dy: 1 },
        };
        this.world = {
            gameTime: 360,
            gameDay: 1,
            gameSeason: 'Spring',
            gameYear: 1,
            moonPhase: 'New Moon',
            gameGrid: [],
            dungeonGrid: [],
            dungeonRooms: [],
        };
        this.entities = {
            enemies: [],
            dungeonEnemies: [],
            npcs: [],
            projectiles: [],
            effects: [],
            floatingTexts: [],
            particles: [],
            lootDrops: [],
            ambientParticles: [],
        };
        this.progression = {
            level: 1,
            xp: 0,
            maxXp: 100,
            gold: 50,
            attributePoints: 1, // Start with one point
            stats: {
                mad: { might: 5, agility: 5, defense: 5 }, // Might, Agility, Defense
                sad: { science: 5, arcanum: 5, destiny: 5 }, // Science, Arcanum, Destiny
                pad: { plants: 5, animals: 5, domain: 5 }, // Plants, Animals, Domain
                dad: { development: 0, ancestry: 0, descendants: 0 }, // Meta-progression, starts at 0
            },
            personalLog: [],
            lore: [],
            bestiary: {},
            plantPedia: {},
            quests: {},
            relationships: {},
            ancestors: [],
        };
        this.inventory = { 
            'Soulroot Seed': 5, 
            'Sunpetal': 10,
            'Stone': 10,
            'Glimmering Dust': 10,
            'interact': 1, 'blade': 1, 'scythe': 1, 'hoe': 1, 
            'watering_can': 1, 'axe': 1, 'pickaxe': 1,
            'ability_shadowmend': 1, 'ability_umbrallash': 1
        };
        this.session = {
            gameRunning: false,
            currentGameState: 'farm',
            dungeonFloor: 1,
            dungeonTheme: 'Crypts',
            inBossFight: false,
            inCombat: false,
            farmStateCache: { playerX: 0, playerY: 0 },
            nightAttackState: { isActive: false, enemiesRemaining: 0 },
            nightEventTriggered: false,
            selectedInventoryItem: null,
            selectedGearId: null,
            selectedUpgradeGearId: null,
            currentNpcInteraction: null,
            activeJournalTab: 'character',
            activePediaSubTab: 'plants',
        };
        this.imageCache = {};
        this.nextItemId = 0;
    }

    save() {
        try {
            const saveData = {
                player: { ...this.player, interactionTarget: null, movementTarget: null },
                world: { 
                    gameTime: this.world.gameTime, 
                    gameDay: this.world.gameDay, 
                    gameSeason: this.world.gameSeason,
                    gameYear: this.world.gameYear,
                    moonPhase: this.world.moonPhase, 
                    gameGrid: this.world.gameGrid 
                },
                entities: { npcs: this.entities.npcs },
                progression: this.progression,
                inventory: this.inventory,
                nextItemId: this.nextItemId,
            };
            // Clean non-serializable data
            saveData.world.gameGrid.forEach((row: Tile[]) => row.forEach(tile => { 
                if (tile.crop) tile.crop.mesh = undefined; 
                if (tile.ritualGlyph) tile.ritualGlyph = undefined; // Don't save temporary glyphs
            }));
            
            localStorage.setItem('hollowrootValeSave', JSON.stringify(saveData));
            console.log("Game Saved!");
            return true;
        } catch (e) {
            console.error("Error saving game:", e);
            return false;
        }
    }

    load() {
        try {
            const savedData = localStorage.getItem('hollowrootValeSave');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                Object.assign(this.player, parsed.player);
                Object.assign(this.world, parsed.world);
                this.world.gameYear = parsed.world.gameYear || 1;
                this.world.moonPhase = parsed.world.moonPhase || 'New Moon';
                this.entities.npcs = parsed.entities.npcs;
                Object.assign(this.progression, parsed.progression);
                this.progression.ancestors = parsed.progression.ancestors || [];
                this.progression.personalLog = parsed.progression.personalLog || [];
                this.progression.plantPedia = parsed.progression.plantPedia || {};
                this.inventory = parsed.inventory;
                this.nextItemId = parsed.nextItemId || 0;
                
                // Reset transient state
                this.session.currentGameState = 'farm';
                this.entities.enemies = [];
                this.entities.dungeonEnemies = [];
                
                console.log("Game Loaded!");
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error loading game:", e);
            return false;
        }
    }
}