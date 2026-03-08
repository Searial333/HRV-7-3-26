

import type { Game } from './Game';
import type { GameState } from './GameState';
import { PLAYER_ATTACK_RANGE, INTERACTION_RANGE, TILE_SIZE, VIEW_SCALE } from '../data/constants';
import type { InteractionTarget } from '../types/index';
import { itemTemplates, cropTemplates } from '../data/items';

export class InputManager {
    state: GameState;
    game: Game;
    keys: { [key: string]: boolean };

    constructor(state: GameState, game: Game) {
        this.state = state;
        this.game = game;
        this.keys = {};
    }

    init(canvas: HTMLCanvasElement) {
        window.addEventListener('keydown', e => {
            if (!this.keys[e.code]) { // Fire only on first press
                this.keys[e.code] = true;
                if (!this.game.uiManager.activeModal) {
                    this.state.player.isMoving = ['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code);
                }
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
             if (!['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].some(k => this.keys[k])) {
                this.state.player.isMoving = false;
            }
            if ((e.code === 'KeyE' || e.code === 'Space') && !this.game.uiManager.activeModal) {
                this.game.handleKeyboardInteraction();
            }
        });

        canvas.addEventListener('mousedown', e => {
            if (e.button !== 0) return; // Only left click
            if (this.game.uiManager.activeModal) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            const worldPixelX = (mouseX - this.game.camera.x) / VIEW_SCALE;
            const worldPixelY = (mouseY - this.game.camera.y) / VIEW_SCALE;

            const worldX = worldPixelX / TILE_SIZE;
            const worldY = worldPixelY / TILE_SIZE;
            
            this.game.handleClick(worldX, worldY);
        });
        
        window.addEventListener('keydown', e => {
            if (this.game.uiManager.activeModal) {
                if(e.code === 'Escape') this.game.uiManager.hideModal();
                return;
            };
            const hotbarSlots = (this.game.uiManager.dom.hotbar as HTMLElement).querySelectorAll<HTMLElement>('.hotbar-slot');
            let keyIndex = -1;
            if (e.code.startsWith('Digit')) {
                keyIndex = parseInt(e.code.substring(5)) - 1;
                if (keyIndex === -1) keyIndex = 9; // Digit0 maps to 10th slot, but arrays are 0-indexed so its 9
            }

            if (keyIndex >= 0 && keyIndex < hotbarSlots.length) {
                const slot = hotbarSlots[keyIndex];
                const tool = slot.dataset.tool;
                if (tool) {
                    if (tool.startsWith('ability_')) {
                        this.game.activateAbility(tool);
                    } else {
                        this.state.player.tool = tool;
                        this.game.uiManager.updateHotbar();
                    }
                }
            }
             if (e.code === 'KeyI' || e.code === 'Tab') {
                e.preventDefault();
                if(this.game.uiManager.activeModal) {
                    this.game.uiManager.hideModal();
                } else {
                    this.game.uiManager.showModal(this.game.uiManager.dom.journalMenu as HTMLElement);
                    this.game.uiManager.renderJournal();
                }
             }
        });
    }

    handleMovement(speed: number, deltaTime: number) {
        const { player } = this.state;
        let dx = 0;
        let dy = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            player.movementTarget = null;
            player.interactionTarget = null;
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            const moveDistance = speed * deltaTime;
            const moveX = (dx / magnitude) * moveDistance;
            const moveY = (dy / magnitude) * moveDistance;

            player.direction = { dx: dx / magnitude, dy: dy / magnitude };
            if (!this.game.checkCollision(player.x + moveX, player.y)) player.x += moveX;
            if (!this.game.checkCollision(player.x, player.y + moveY)) player.y += moveY;
            player.isMoving = true;
        } else {
            const target = player.interactionTarget || player.movementTarget;
            if (target) {
                player.isMoving = true;
                let targetX = 0, targetY = 0;
                let arrivalThreshold = 0.1;
                
                if ('type' in target) {
                    // It's an InteractionTarget
                    const interactionTarget = target as InteractionTarget;
                    if (interactionTarget.type === 'object') {
                        arrivalThreshold = INTERACTION_RANGE;
                        targetX = interactionTarget.x + 0.5;
                        targetY = interactionTarget.y + 0.5;
                    } else { // 'enemy', 'npc', or 'loot'
                        arrivalThreshold = interactionTarget.type === 'enemy' ? PLAYER_ATTACK_RANGE : INTERACTION_RANGE;
                        targetX = interactionTarget.entity.x;
                        targetY = interactionTarget.entity.y;
                    }
                } else {
                    // It's a MovementTarget
                    const movementTarget = target as {x: number, y: number};
                    arrivalThreshold = 0.1;
                    targetX = movementTarget.x;
                    targetY = movementTarget.y;
                }

                const mdx = targetX - player.x;
                const mdy = targetY - player.y;
                const dist = Math.sqrt(mdx * mdx + mdy * mdy);
                
                if (dist > arrivalThreshold) {
                    const moveDistance = speed * deltaTime;
                    const moveX = (mdx / dist) * moveDistance;
                    const moveY = (mdy / dist) * moveDistance;

                    const finalMoveX = Math.abs(moveX) > Math.abs(mdx) ? mdx : moveX;
                    const finalMoveY = Math.abs(moveY) > Math.abs(mdy) ? mdy : moveY;

                    if (!this.game.checkCollision(player.x + finalMoveX, player.y)) player.x += finalMoveX;
                    if (!this.game.checkCollision(player.x, player.y + finalMoveY)) player.y += finalMoveY;
                } else {
                    if (player.movementTarget) player.movementTarget = null;
                     player.isMoving = false;
                }
            } else {
                player.isMoving = false;
            }
        }
    }
}
