import type { Gear, EquipmentSlot } from '../types/index';

// --- Helper Functions ---

function pickRandom<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
}

function pickMany<T>(array: T[], count: number): T[] {
    const copy = [...array];
    const result: T[] = [];
    for (let i = 0; i < count && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

function pickWeighted<T extends { dropWeight: number }>(array: T[]): T {
    const total = array.reduce((sum, a) => sum + a.dropWeight, 0);
    let r = Math.random() * total;
    for (const item of array) {
        if (r < item.dropWeight) return item;
        r -= item.dropWeight;
    }
    return array[array.length - 1];
}

function addStats(base: { [key: string]: number }, mods: { [key: string]: number }) {
    if (!mods) return;
    for (const key in mods) {
        base[key] = (base[key] || 0) + mods[key];
    }
}

function createUniqueId(): string {
    return 'item_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}


export class ItemGenerator {
    private data: { [key: string]: any[] } = {};
    private isLoaded: boolean = false;

    constructor() {}

    async loadData() {
        if (this.isLoaded) return;
        try {
            const pools = ['baseItems', 'prefixes', 'suffixes', 'materials', 'conditions', 'rarities'];
            const promises = pools.map(pool => fetch(`./data/loot/${pool}.json`).then(res => res.json()));
            const results = await Promise.all(promises);
            pools.forEach((pool, index) => {
                this.data[pool] = results[index];
            });
            this.isLoaded = true;
            console.log("Item generator data loaded successfully.");
        } catch (error) {
            console.error("Failed to load item generator data:", error);
        }
    }

    public async generateItem(playerLevel: number, zoneType: string): Promise<Gear | null> {
        if (!this.isLoaded) {
            await this.loadData();
        }
        if (!this.isLoaded) {
            console.error("Cannot generate item, data is not loaded.");
            return null;
        }

        try {
            // 1. Roll Rarity (weighted)
            const chosenRarity = pickWeighted(this.data.rarities);

            // 2. Select Base Item
            const validBaseItems = this.data.baseItems.filter(item => 
                item.validZones.includes('any') || item.validZones.includes(zoneType)
            );
            const baseItem = pickRandom(validBaseItems);
            if (!baseItem) {
                console.error("No valid base items found for zone:", zoneType);
                return null;
            }

            // 3. Roll Affixes
            let chosenAffixes: any[] = [];
            if (chosenRarity.affixCount > 0) {
                const prefixCount = Math.ceil(chosenRarity.affixCount / 2);
                const suffixCount = Math.floor(chosenRarity.affixCount / 2);
                chosenAffixes = [
                    ...pickMany(this.data.prefixes, prefixCount),
                    ...pickMany(this.data.suffixes, suffixCount)
                ];
            }

            // 4. Material and Condition
            const chosenMaterial = pickRandom(this.data.materials)!;
            const chosenCondition = pickRandom(this.data.conditions)!;

            // 5. Assemble Final Item Name
            let name = '';
            const prefix = chosenAffixes.find(a => this.data.prefixes.includes(a));
            const suffix = chosenAffixes.find(a => this.data.suffixes.includes(a));
            
            if (prefix) name += `${prefix.name} `;
            name += `${chosenMaterial.name} ${baseItem.name}`;
            if (suffix) name += ` ${suffix.name}`;


            // 6. Aggregate Stats
            const stats = { ...baseItem.baseStats };
            addStats(stats, chosenMaterial.statModifiers);
            addStats(stats, chosenCondition.statModifiers);
            chosenAffixes.forEach(affix => addStats(stats, affix.statModifiers));

            // 7. Gather Effects and Visual Tags
            const effects = [
                ...(baseItem.effects || []),
                chosenMaterial.inherentEffect,
                ...chosenAffixes.flatMap(a => a.effects || [])
            ].filter(Boolean);

            const visuals = [
                ...(baseItem.visualTags || []),
                ...(chosenMaterial.visualTags || []),
                ...(chosenCondition.visualTags || []),
                ...chosenAffixes.flatMap(a => a.visualTags || [])
            ].filter(Boolean);

            // 8. Final Assembly
            const finalItem: Gear = {
                instanceId: createUniqueId(),
                name: name.trim(),
                slot: baseItem.slot,
                stats: stats,
                effects: effects,
                visualTags: visuals,
                rarity: { name: chosenRarity.name, color: chosenRarity.color },
                rarityColor: chosenRarity.color,
                baseItemId: baseItem.id,
                material: chosenMaterial.name,
                condition: chosenCondition.name,
                affixes: chosenAffixes.map(a => a.name),
                level: 1, // Or scale with playerLevel
                value: 0 // TODO: Calculate value based on components
            };
            
            return finalItem;

        } catch (error) {
            console.error("Error during item generation:", error);
            return null;
        }
    }
}
