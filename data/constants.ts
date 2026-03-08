// --- GAMEPLAY CONSTANTS ---
export const TILE_SIZE = 256; // Doubled again for maximum graphical fidelity
export const VIEW_SCALE = 0.25; // Zoom out to compensate for larger tiles
export const FARM_GRID_SIZE_X = 25;
export const FARM_GRID_SIZE_Y = 25;
export const DUNGEON_GRID_SIZE_X = 30;
export const DUNGEON_GRID_SIZE_Y = 30;
export const BOSS_ARENA_SIZE_X = 20;
export const BOSS_ARENA_SIZE_Y = 15;
export const INTERACTION_RANGE = 1.5;
export const PLAYER_ATTACK_RANGE = 2.0; // Tiles
export const PLAYER_ATTACK_COOLDOWN = 800; // Milliseconds
export const PLAYER_WALK_ANIM_SPEED = 8; // frames per second
export const DUNGEON_FLOORS_PER_THEME = 3;


// --- CALENDAR & BALANCE CONSTANTS ---
export const DAYS_PER_SEASON = 28;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const MOON_PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
export const MOON_PHASE_EMOJIS: {[key: string]: string} = {
    'New Moon': '🌑', 'Waxing Crescent': '🌒', 'First Quarter': '🌓', 'Waxing Gibbous': '🌔',
    'Full Moon': '🌕', 'Waning Gibbous': '🌖', 'Last Quarter': '🌗', 'Waning Crescent': '🌘'
};
export const FULL_MOON_ATTACK_CHANCE_MODIFIER = 2.5;
export const IN_SEASON_GROWTH_MULTIPLIER = 1.5;
export const OUT_OF_SEASON_GROWTH_MULTIPLIER = 0.5;
export const HEALTH_REGEN_PER_SECOND = 0.5;


// --- DATA URI ICONS (NEW PIXEL ART) ---
export const vigorIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjNGEyZDFkIiBkPSJNMTQgMjZoNHY2aC00eiIvPjxwYXRoIGZpbGw9IiNmYWNjMTUiIGQ9Ik0xNSAyNGgydjJoLTJ6Ii8+PHBhdGggZmlsbD0iIzc4MzUwZiIgZD0iTTEwIDIyaDEydjJIMTB6Ii8+PHBhdGggZmlsbD0iI2I1Y2RkYyIgZD0iTTE0IDJoNHYyMGgtNHoiLz48cGF0aCBmaWxsPSIjNzA4MDkwIiBkPSJNMTMgM2gxdjE4aC0xem01IDBoMXYxOGgtMXoiLz48cGF0aCBmaWxsPSIjZjBmOGZmIiBkPSJNMTQgM2g0djFoLTR6Ii8+PC9zdmc+`;
export const resilienceIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjNzA4MDkwIiBkPSJNNCA0aDI0djE4SDJ6Ii8+PHBhdGggZmlsbD0iI2I1Y2RkYyIgZD0iTTYgNmgxOHYxNEg2eiIvPjxwYXRoIGZpbGw9IiM3MDgwOTAiIGQ9Ik0xMCAxMGgxMnY4SDEweiIvPjxwYXRoIGZpbGw9IiNmYWNjMTUiIGQ9Ik0xNCAxNGg0djRoLTR6Ii8+PHBhdGggZmlsbD0iIzRhMmQxZCIgZD0iTTggMmgxNnY0SDh6Ii8+PC9zdmc+`;
export const swiftnessIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmNjIiBkPSJNMjIgOGg4djJoLTh6bS0yIDJoOHYyaC04em0tMiAyaDh2MmgtOHoiLz48cGF0aCBmaWxsPSIjNzg0NDIyIiBkPSJNNiAxNGgxMHYxMmgtM3YtMmgtMmgtMmgtMnYyaC0yeiIvPjxwYXRoIGZpbGw9IiM5OTY2MzMiIGQ9Ik04IDE2aDEwdjhoLTEwdi0yeiIvPjxwYXRoIGZpbGw9IiM0NDIyMDAiIGQ9Ik02IDI2aDEydjRoLTEyWiIvPjwvc3ZnPg==`;
export const potencyIcon = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjY2NiN2ZmIiBkPSJNMTIgMmgydjZoLTJ6Ii8+PHBhdGggZmlsbD0iIzkwNzVFNyIgZD0iTTEwIDRoOHYySDEweiIvPjxwYXRoIGZpbGw9IiM2NjM0REIiIGQ9Ik04IDhoMTZ2MThIOHoiLz48cGF0aCBmaWxsPSIjY2NiN2ZmIiBkPSJNMTggMTJoOHYxMEgxMnoiLz48cGF0aCBmaWxsPSIjOTM3N0U3IiBkPSJNMTIgMTJoOHYxMEgxMnoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTQgNGgxdjFoLTF6bS0yIDRoMnYyaC0yeiIvPjwvc3ZnPg==`;
