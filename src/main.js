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
    
    // Check if materialization protocol has been completed
    const isAudioEnabled = () => {
        return !document.getElementById('audioEnablerContainer') || 
               document.getElementById('audioEnablerContainer').classList.contains('hidden');
    };
    
    // Set up direct pointer lock handler for additional reliability
    canvas.addEventListener('click', () => {
        console.log("Canvas clicked directly from main.js");
        
        // Only request pointer lock if materialization protocol has been completed
        if (!isAudioEnabled()) {
            console.log("Materialization protocol not yet completed, ignoring canvas click");
            return;
        }
        
        // Initialize audio on first click (required by browser policies)
        if (window.audioManager) {
            try {
                console.log("Initializing audio from canvas click");
                if (window.audioManager.context && window.audioManager.context.state !== 'running') {
                    window.audioManager.context.resume().then(() => {
                        console.log("Audio context resumed from canvas click");
                        // Play a silent sound to fully unlock audio
                        const silentOsc = window.audioManager.context.createOscillator();
                        const silentGain = window.audioManager.context.createGain();
                        silentGain.gain.value = 0.001; // Nearly silent
                        silentOsc.connect(silentGain);
                        silentGain.connect(window.audioManager.context.destination);
                        silentOsc.start();
                        silentOsc.stop(window.audioManager.context.currentTime + 0.1);
                        
                        // Play the startup sound once audio is unlocked
                        window.audioManager.playStartupSound();
                    });
                }
            } catch (e) {
                console.warn("Error initializing audio on click:", e);
            }
        }
        
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
