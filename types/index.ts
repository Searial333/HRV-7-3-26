

// --- Core Game State ---
export interface GameStateData {
    player: Player;
    world: World;
    entities: Entities;
    progression: Progression;
    inventory: Inventory;
    session: Session;
    imageCache: { [key: string]: HTMLImageElement };
    nextItemId: number;
}

// --- Player & Character ---

export type EquipmentSlot = 'head' | 'shoulders' | 'torso' | 'wrists' | 'hands' | 'waist' | 'legs' | 'feet' | 'neck' | 'finger1' | 'finger2' | 'mainHand' | 'offHand';
export type DungeonTheme = 'Crypts' | 'Grotto' | 'Roots';

export interface Player {
    name: string;
    x: number;
    y: number;
    tool: string;
    hp: number;
    maxHp: number;
    woundStain: number;
    maxWoundStain: number;
    lastAttackTime: number;
    lastHitTime: number;
    buffs: any[]; // TODO: Define buff type later
    equipment: { [key in EquipmentSlot]?: Gear | null };
    gear: Gear[]; 
    interactionTarget: InteractionTarget | null;
    movementTarget: { x: number; y: number } | null;
    abilityCooldowns: { [key: string]: number };
    isMoving: boolean;
    animationFrame: number;
    direction: { dx: number; dy: number };
}

export interface Stats {
    mad: { might: number; agility: number; defense: number };
    sad: { science: number; arcanum: number; destiny: number };
    pad: { plants: number; animals: number; domain: number };
    dad: { development: number; ancestry: number; descendants: number };
}

export interface PersonalLogEntry {
    text: string;
    icon: string;
    day: number;
}

export interface BestiaryEntry {
    name: string;
    description: string;
    kills: number;
    drops: { [key: string]: [number, number] };
}

export interface PlantPediaEntry {
    name: string;
    description: string;
    yields: string;
    discoveryState: 'discovered' | 'harvested' | 'used_in_ritual';
}

export interface Progression {
    level: number;
    xp: number;
    maxXp: number;
    gold: number;
    attributePoints: number;
    stats: Stats;
    personalLog: PersonalLogEntry[];
    lore: any[];
    bestiary: { [key: string]: BestiaryEntry };
    plantPedia: { [key: string]: PlantPediaEntry };
    quests: { [key: string]: any }; // TODO: Define quest type later
    relationships: { [key: string]: number };
    ancestors: any[]; // TODO: Define ancestor type later
}

// --- World & Environment ---
export interface World {
    gameTime: number;
    gameDay: number;
    gameSeason: string;
    gameYear: number;
    moonPhase: string;
    gameGrid: Tile[][];
    dungeonGrid: Tile[][];
    dungeonRooms: any[];
}

export interface Tile {
    type: string;
    isTilled: boolean;
    isWatered: boolean;
    crop: Crop | null;
    object: GameObject | null;
    droppedItem: { name: string, quantity: number } | null;
    ritualGlyph?: { type: string, duration: number };
}

export interface Crop {
    name: string;
    stage: number;
    growthTime: number;
    season: string; // Added preferred season
    mesh?: any; 
}

export interface GameObject {
    type: string;
    variant?: string;
    collides: boolean;
    id?: string;
    integrity?: number;
    maxIntegrity?: number;
}

// --- Entities ---
export interface GameEffect {
    x: number;
    y: number;
    type: 'plant_ripple';
    startTime: number;
    duration: number;
}

export interface Entities {
    enemies: Enemy[];
    dungeonEnemies: Enemy[];
    npcs: NPC[];
    projectiles: any[];
    effects: GameEffect[];
    floatingTexts: FloatingText[];
    particles: Particle[];
    lootDrops: LootDrop[];
    ambientParticles: AmbientParticle[];
}

export interface Entity {
    id: number | string;
    x: number;
    y: number;
}

export interface Enemy extends Entity {
    type: string;
    hp: number;
    maxHp: number;
    lastHitTime: number;
    aiState: 'idle' | 'chase' | 'attack';
    lastAttackTime: number;
    isMoving: boolean;
    animationFrame: number;
    attackAnimationProgress?: number;
}

export interface NPC extends Entity {
    name: string;
    bio: string;
    dialogueTree: any; // TODO: Define dialogue tree type later
}

export interface LootDrop extends Entity {
    items: (Gear | { name: string, quantity: number })[];
}

// --- Visuals & Effects ---
export interface FloatingText {
    text: string;
    x: number;
    y: number;
    startTime: number;
    duration: number;
    color: { r: number; g: number; b: number };
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    duration: number;
    size: number;
    type: 'leaf' | 'spark' | 'glyph';
    color: { r: number; g: number; b: number };
    startTime: number;
    data?: any; // For extra particle data, like glyph character
}

export interface AmbientParticle {
     x: number;
     y: number;
     vx: number;
     vy: number;
     startTime: number;
     endTime: number;
     type: 'firefly' | 'dust';
     color: {r: number, g: number, b: number};
}


// --- Game Session & Misc ---
export interface Session {
    gameRunning: boolean;
    currentGameState: 'farm' | 'dungeon';
    dungeonFloor: number;
    dungeonTheme: DungeonTheme;
    inBossFight: boolean;
    inCombat: boolean;
    farmStateCache: { playerX: number; playerY: number };
    nightAttackState: { isActive: boolean; enemiesRemaining: number };
    nightEventTriggered: boolean;
    selectedInventoryItem: string | null;
    selectedGearId: string | null;
    selectedUpgradeGearId: string | null;
    currentNpcInteraction: { npcId: string, dialogueNodeKey: string } | null;
    activeJournalTab: string;
    activePediaSubTab: string;
}

export type Inventory = { [key: string]: number };

export type InteractionTarget = {
    x: number;
    y: number;
    type: 'object';
    object: GameObject;
    requiredTool: string;
    action: string;
} | {
    type: 'enemy';
    entity: Enemy;
    requiredTool: string;
    action: string;
} | {
    type: 'npc';
    entity: NPC;
    requiredTool: string;
    action: string;
} | {
    type: 'loot';
    entity: LootDrop;
    requiredTool: string;
    action: string;
};

// --- Data Templates ---

export interface ItemTemplate {
    name: string;
    description: string;
    type: 'tool' | 'material' | 'consumable' | 'treasure' | 'weapon' | 'armor' | 'relic' | 'seed';
    slot?: EquipmentSlot;
    iconUrl?: string;
    isAbility?: boolean;
    cooldown?: number;
    value?: number;
    alchemicalAspect?: string;
    effect?: { type: string, amount: number, duration?: number, stat?: string };
    baseStats?: {[key: string]: number};
    rarity?: { name: string; color: string; };
    plants?: string; // The ID of the crop this seed grows
}

export interface Gear {
    instanceId: string;
    name: string;
    slot: EquipmentSlot;
    stats: { [key: string]: number };
    effects: string[];
    visualTags: string[];
    rarity: { name: string; color: string; };
    rarityColor: string; // for compatibility with old code, can be merged
    baseItemId: string;
    material: string;
    condition: string;
    affixes: string[];
    level: number;
    value: number;
}


export interface CreatureTemplate {
    name: string;
    description: string;
    drops: { [key: string]: [number, number] };
    baseHp: number;
    baseDamage: number;
    stats: { mad: number; sad: number; pad: number; dad: number };
    moveSpeed: number;
    detectionRange: number;
    attackRange: number;
    attackCooldown: number;
    xpValue: number;
    walkAnimSpeed: number;
}

export interface Ritual {
    name: string;
    catalyst: string;
    pattern: { [key: string]: string }; // "dx,dy": "itemName"
    effect: (game: any, x: number, y: number) => void;
}