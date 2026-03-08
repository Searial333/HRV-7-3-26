
import { Game } from './game/Game';

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
        new Game(canvas);
    } else {
        console.error("Could not find canvas element with id 'game-canvas'");
    }
});