
import type { ItemTemplate } from "../types/index";

const toolIcon = (path: string) => `data:image/svg+xml;base64,${btoa(path)}`;

// Rarity definitions to be used in item templates, matching rarities.json
const RARITIES = {
    CRUDE: { name: 'Crude', color: '#9ca3af' },
    SIMPLE: { name: 'Simple', color: '#f5f1e8' },
    STANDARD: { name: 'Standard', color: '#60a5fa' },
    PREMIUM: { name: 'Premium', color: '#c084fc' },
    PERFECT: { name: 'Perfect', color: '#f59e0b' },
};

export const itemTemplates: { [key: string]: ItemTemplate } = {
    // Tools & Abilities
    'interact': { name: 'Interact', description: 'Interact with objects and people.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#fff" d="M8 0L6 4h4zM8 16L6 12h4zM0 8l4-2v4zM16 8l-4-2v4z"/><path fill="#ff0" d="M7 7h2v2H7z"/></svg>`), rarity: RARITIES.SIMPLE },
    'blade': { name: 'Blade', description: 'A simple, sharp blade for combat.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#4a2d1d" d="M7 12h2v4H7z"/><path fill="#708090" d="M6 3h4v1h1v1h1v5H4V5h1V4h1z"/><path fill="#b5cddc" d="M7 4h2v8H7z"/><path fill="#ffc107" d="M6 11h4v1H6z"/></svg>`), rarity: RARITIES.SIMPLE },
    'scythe': { name: 'Scythe', description: 'Harvests mature crops.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#6f452a" d="M12 0h1v16h-1z"/><path fill="#708090" d="M11 2H5v1H4v1H3v1h1v1h1v1h6z"/><path fill="#b5cddc" d="M10 3H6v1H5v1h1v1h4z"/></svg>`), rarity: RARITIES.SIMPLE },
    'hoe': { name: 'Hoe', description: 'Tills soil for planting.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#6f452a" d="M3 0h1v16H3z"/><path fill="#708090" d="M4 11h6v4H4z"/><path fill="#b5cddc" d="M5 12h4v2H5z"/></svg>`), rarity: RARITIES.SIMPLE },
    'watering_can': { name: 'Watering Can', description: 'Waters tilled soil.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#a0a0a0" d="M2 5h12v7H2z"/><path fill="#c0c0c0" d="M3 6h10v5H3z"/><path fill="#60a5fa" d="M14 8h2v1h-2zm-1-1h1v1h-1z"/><path fill="#a0a0a0" d="M5 4h6v1H5zm6-1h1v1h-1z"/></svg>`), rarity: RARITIES.SIMPLE },
    'axe': { name: 'Axe', description: 'Chops down trees.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#6f452a" d="M7 6h2v10H7z"/><path fill="#708090" d="M5 0h6v7H5z"/><path fill="#b5cddc" d="M6 1h4v5H6z"/></svg>`), rarity: RARITIES.SIMPLE },
    'pickaxe': { name: 'Pickaxe', description: 'Breaks rocks and mines ore.', type: 'tool', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#6f452a" d="M7 4h2v12H7z"/><path fill="#708090" d="M2 0h12v5H2z"/><path fill="#b5cddc" d="M3 1h10v3H3z"/></svg>`), rarity: RARITIES.SIMPLE },
    'ability_shadowmend': { name: 'Shadowmend', description: 'Heal yourself with forbidden shadow magic.', type: 'tool', isAbility: true, cooldown: 15000, iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><circle cx="8" cy="8" r="7" fill="#c084fc"/><path fill="#4c1d95" d="M7 2h2v4h4v2H9v4H7V8H3V6h4z"/><path fill="#166534" d="M7 4h2v2h2v2H9v2H7V8H5V6h2z"/></svg>`), rarity: RARITIES.STANDARD },
    'ability_umbrallash': { name: 'Umbral Lash', description: 'A quick strike of shadow energy.', type: 'tool', isAbility: true, cooldown: 5000, iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#c084fc" d="M2 3l1 1v1l1 1v2l1 1v1l1 1v1l1 1h2l1-1V9l1-1V7l1-1V4l1-1h1L2 14z"/><path fill="#4c1d95" d="M3 4l1 1v1l1 1v2l1 1v1l1 1h1V8L8 7 7 6 6 5 5 4z"/></svg>`), rarity: RARITIES.STANDARD },
    'Soulroot Seed': { name: 'Soulroot Seed', description: 'A strange, faintly glowing seed. Prefers Spring.', type: 'seed', plants: 'Soulroot', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#4a2d1d" d="M7 8h2v8H7z"/><path fill="#8a6e4b" d="M6 7h4v1H6z"/><path fill="#a3e635" d="M8 0L6 4h4z"/><path fill="#22c55e" d="M8 2L7 4h2z"/></svg>`), rarity: RARITIES.STANDARD },
    'Moonpetal Seed': { name: 'Moonpetal Seed', description: 'A seed that seems to absorb moonlight. Prefers Autumn.', type: 'seed', plants: 'Moonpetal', iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#4b5563" d="M7 8h2v8H7z"/><path fill="#9ca3af" d="M6 7h4v1H6z"/><path fill="#e0e7ff" d="M8 0L6 4h4z"/><path fill="#a5b4fc" d="M8 2L7 4h2z"/></svg>`), rarity: RARITIES.STANDARD },
    
    // Base Starter Gear Templates
    'starter_sword': { name: 'Worn Shortsword', description: 'A basic sword, pitted and rusted.', type: 'weapon', slot: 'mainHand', baseStats: { might: 3 }, value: 5, iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#4a2d1d" d="M7 12h2v4H7z"/><path fill="#708090" d="M6 3h4v1h1v1h1v5H4V5h1V4h1z"/><path fill="#b5cddc" d="M7 4h2v8H7z"/><path fill="#ffc107" d="M6 11h4v1H6z"/></svg>`), rarity: RARITIES.CRUDE },
    'leather_cap_01': { name: 'Leather Cap', description: 'A simple cap made of boiled leather.', type: 'armor', slot: 'head', baseStats: { defense: 1 }, value: 2, rarity: RARITIES.CRUDE },
    'leather_pauldrons_01': { name: 'Leather Pauldrons', description: 'Shoulder guards of hardened leather.', type: 'armor', slot: 'shoulders', baseStats: { defense: 1 }, value: 2, rarity: RARITIES.CRUDE },
    'leather_jerkin_01': { name: 'Leather Jerkin', description: 'A vest of sturdy leather.', type: 'armor', slot: 'torso', baseStats: { defense: 2 }, value: 3, rarity: RARITIES.CRUDE },
    'cloth_bracers_01': { name: 'Cloth Bracers', description: 'Simple cloth wrappings for the wrists.', type: 'armor', slot: 'wrists', baseStats: { arcanum: 1 }, value: 1, rarity: RARITIES.CRUDE },
    'leather_gloves_01': { name: 'Leather Gloves', description: 'Basic leather hand protection.', type: 'armor', slot: 'hands', baseStats: { agility: 1 }, value: 2, rarity: RARITIES.CRUDE },
    'leather_belt_01': { name: 'Leather Belt', description: 'A simple leather belt.', type: 'armor', slot: 'waist', baseStats: { }, value: 1, rarity: RARITIES.CRUDE },
    'cloth_trousers_01': { name: 'Cloth Trousers', description: 'Rough-spun trousers.', type: 'armor', slot: 'legs', baseStats: { defense: 1 }, value: 1, rarity: RARITIES.CRUDE },
    'leather_boots_01': { name: 'Leather Boots', description: 'Sturdy leather boots for walking.', type: 'armor', slot: 'feet', baseStats: { defense: 1 }, value: 2, rarity: RARITIES.CRUDE },
    'woven_idol_01': { name: 'Woven Idol', description: 'A small idol woven from twine.', type: 'relic', slot: 'neck', baseStats: { plants: 1 }, value: 1, rarity: RARITIES.CRUDE },
    'iron_ring_01': { name: 'Iron Ring', description: 'A plain ring of rusted iron.', type: 'relic', slot: 'finger1', baseStats: { }, value: 1, rarity: RARITIES.CRUDE },
    'buckler_01': { name: 'Buckler', description: 'A small wooden shield.', type: 'weapon', slot: 'offHand', baseStats: { defense: 2 }, value: 2, rarity: RARITIES.CRUDE },
    
    // Other Gear
    'sturdy_iron_sword': {
        name: 'Sturdy Iron Sword',
        description: 'A well-made sword of solid iron.',
        type: 'weapon',
        slot: 'mainHand',
        baseStats: { might: 8, defense: 1 },
        value: 50,
        iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#4a2d1d" d="M7 12h2v4H7z"/><path fill="#9ca3af" d="M5 2h6v1h1v1h1v6H3V4h1V3h1z"/><path fill="#e5e7eb" d="M6 3h4v9H6z"/><path fill="#78350f" d="M5 10h6v2H5z"/></svg>`),
        rarity: RARITIES.STANDARD
    },

    // Materials
    'Sunpetal': { name: 'Sunpetal', description: 'A petal that radiates a faint warmth.', type: 'material', rarity: RARITIES.SIMPLE },
    'Glimmering Dust': { name: 'Glimmering Dust', description: 'Sparkling dust with latent magical energy.', type: 'material', rarity: RARITIES.STANDARD },
    'Stone': { name: 'Stone', description: 'A common rock.', type: 'material', rarity: RARITIES.SIMPLE },
    'Oak Wood': { name: 'Oak Wood', description: 'Sturdy wood from an oak tree.', type: 'material', value: 2, rarity: RARITIES.SIMPLE },
    'Pine Wood': { name: 'Pine Wood', description: 'Wood from a pine tree, smells faintly of sap.', type: 'material', value: 2, rarity: RARITIES.SIMPLE },
    'Iron Ore': { name: 'Iron Ore', description: 'A chunk of unrefined iron.', type: 'material', value: 4, iconUrl: toolIcon(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#4b5563" d="M3 5h10v6H3z"/><path fill="#a16207" d="M5 7h6v2H5z"/><path fill="#78350f" d="M4 6h1v1H4zm7 3h1v1h-1z"/></svg>`), rarity: RARITIES.SIMPLE },

    // Consumables
    'Valeberry': { name: 'Valeberry', description: 'A common but restorative berry.', type: 'consumable', value: 5, effect: { type: 'heal', amount: 15 }, rarity: RARITIES.SIMPLE },
};

export const cropTemplates: { [key: string]: any } = {
    'Soulroot': { name: 'Soulroot', description: 'A strange, faintly glowing plant.', yields: 'Soulroot', growthTime: 5, season: 'Spring', iconUrl: itemTemplates['Soulroot Seed'].iconUrl, rarity: RARITIES.STANDARD },
    'Moonpetal': { name: 'Moonpetal', description: 'A flower that seems to drink moonlight.', yields: 'Moonpetal', growthTime: 6, season: 'Autumn', iconUrl: itemTemplates['Moonpetal Seed'].iconUrl, rarity: RARITIES.STANDARD },
};

export const alchemyRecipes: { [key: string]: any } = {};

export const smithingRecipes: { [key: string]: any } = {
    'sturdy_iron_sword': {
        name: 'Sturdy Iron Sword',
        materials: { 'Iron Ore': 5, 'Oak Wood': 2 },
        result: 'sturdy_iron_sword',
        skill: 'Smithing',
        level: 1,
    }
};

export const starterGearTemplates = [
    { instanceId: 'starter_sword_01', name: 'Worn Shortsword', baseItemId: 'starter_sword', material: 'Iron', condition: 'Rusty', affixes: [] },
    { instanceId: 'starter_helm_01', name: 'Worn Leather Cap', baseItemId: 'leather_cap_01', material: 'Leather', condition: 'Worn', affixes: [] },
    { instanceId: 'starter_shoulders_01', name: 'Worn Leather Pauldrons', baseItemId: 'leather_pauldrons_01', material: 'Leather', condition: 'Worn', affixes: [] },
    { instanceId: 'starter_chest_01', name: 'Tattered Leather Jerkin', baseItemId: 'leather_jerkin_01', material: 'Leather', condition: 'Torn', affixes: [] },
    { instanceId: 'starter_wrists_01', name: 'Frayed Cloth Bracers', baseItemId: 'cloth_bracers_01', material: 'Cloth', condition: 'Frayed', affixes: [] },
    { instanceId: 'starter_hands_01', name: 'Worn Leather Gloves', baseItemId: 'leather_gloves_01', material: 'Leather', condition: 'Worn', affixes: [] },
    { instanceId: 'starter_waist_01', name: 'Frayed Rope Belt', baseItemId: 'leather_belt_01', material: 'Rope', condition: 'Frayed', affixes: [] },
    { instanceId: 'starter_legs_01', name: 'Tattered Trousers', baseItemId: 'cloth_trousers_01', material: 'Cloth', condition: 'Tattered', affixes: [] },
    { instanceId: 'starter_feet_01', name: 'Worn Leather Boots', baseItemId: 'leather_boots_01', material: 'Leather', condition: 'Worn', affixes: [] },
    { instanceId: 'starter_neck_01', name: 'Simple Twine Amulet', baseItemId: 'woven_idol_01', material: 'Twine', condition: 'Simple', affixes: [] },
    { instanceId: 'starter_ring1_01', name: 'Rusty Iron Ring', baseItemId: 'iron_ring_01', material: 'Iron', condition: 'Rusty', affixes: [] },
    { instanceId: 'starter_ring2_01', name: 'Bent Iron Ring', baseItemId: 'iron_ring_01', material: 'Iron', condition: 'Bent', affixes: [] },
    { instanceId: 'starter_offhand_01', name: 'Plank Buckler', baseItemId: 'buckler_01', material: 'Wood', condition: 'Cracked', affixes: [] },
];
