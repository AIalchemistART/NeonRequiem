// main.js - Entry point for Neon Requiem
import Game from './game/game.js';
import Renderer from './rendering/renderer.js';
import InputHandler from './input/inputHandler.js';
import AudioManager from './audio/audioManager.js';

// Wait for DOM to load before initializing the game
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game...");
    
    const canvas = document.getElementById('gameCanvas');
    
    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 600;
    
    // Get the rendering context
    const ctx = canvas.getContext('2d');
    
    // Initialize core components
    const renderer = new Renderer(ctx);
    const inputHandler = new InputHandler();
    
    // Initialize audio manager and make it globally available
    // This is done for easy access from player.js without modifying core update loops
    window.audioManager = new AudioManager();
    console.log("Audio manager initialized:", window.audioManager);
    
    // Set up direct pointer lock handler for additional reliability
    canvas.addEventListener('click', () => {
        console.log("Canvas clicked directly from main.js");
        
        if (!document.pointerLockElement && 
            !document.mozPointerLockElement && 
            !document.webkitPointerLockElement) {
            
            try {
                // Try to request pointer lock directly
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                    console.log("Main.js: Requested pointer lock");
                } else if (canvas.mozRequestPointerLock) {
                    canvas.mozRequestPointerLock();
                    console.log("Main.js: Requested Mozilla pointer lock");
                } else if (canvas.webkitRequestPointerLock) {
                    canvas.webkitRequestPointerLock();
                    console.log("Main.js: Requested WebKit pointer lock");
                } else {
                    console.warn("Main.js: Pointer lock API not supported in this browser");
                    if (window.showNotification) {
                        window.showNotification('Your browser does not support pointer lock');
                    }
                }
            } catch (error) {
                console.error("Main.js: Error requesting pointer lock:", error);
            }
        }
    });
    
    // Create and start the game
    const game = new Game(canvas.width, canvas.height, renderer, inputHandler);
    game.start();
    
    // Display initial instructions using the notification system
    if (window.showNotification) {
        window.showNotification('Click the game to enable pointer lock mode');
    }
    
    console.log("Game initialization complete!");
});
