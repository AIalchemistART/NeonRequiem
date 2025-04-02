// inputHandler.js - Manages game input (keyboard and mouse)
export default class InputHandler {
    constructor() {
        // Initialize key and mouse button tracking
        this.keys = {
            // Explicitly initialize movement keys to ensure they exist
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false,
            // Add function keys for debug purposes
            F1: false,
            F2: false,
            F3: false,
            F4: false,
            F5: false,
            F6: false,
            F7: false,
            F8: false,
            F9: false,
            F10: false,
            F11: false,
            F12: false,
            // Add shift key for dash
            Shift: false,
            // Add p key for pause
            p: false,
            // Add Enter key for portal interaction
            Enter: false
        };
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = {
            left: false,
            middle: false,
            right: false
        };
        
        // Track click events separately from button state for single-press actions
        this.mouseClicks = {
            left: false,
            middle: false,
            right: false
        };
        
        // Pointer lock state
        this.pointerLocked = false;
        
        // Wait for DOM to fully load before initializing
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    initialize() {
        console.log("Initializing InputHandler...");
        
        // Get canvas reference
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error("Canvas element not found!");
            return;
        }
        
        console.log("Canvas found, setting up event listeners...");
        
        this.setupKeyboardListeners();
        this.setupMouseListeners();
        this.setupPointerLockListeners();
        
        // Prevent default browser actions for game keys
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        console.log("InputHandler initialization complete");
    }
    
    setupKeyboardListeners() {
        // Listen for key down events
        window.addEventListener('keydown', (e) => {
            // Update the state for the pressed key
            console.log("Key pressed:", e.key);
            this.keys[e.key] = true;
            
            // Prevent default behavior for game control keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(e.key)) {
                e.preventDefault();
            }
            
            // Prevent browser from handling function keys for debug features
            if (e.key.startsWith('F') && e.key.length <= 3) {
                e.preventDefault();
            }
        });
        
        // Listen for key up events
        window.addEventListener('keyup', (e) => {
            // Update the state for the released key
            console.log("Key released:", e.key);
            this.keys[e.key] = false;
        });
    }
    
    setupMouseListeners() {
        const gameCanvas = document.getElementById('gameCanvas');
        
        // Track mouse movement
        gameCanvas.addEventListener('mousemove', (e) => {
            // Update the mouse position relative to the canvas
            const rect = gameCanvas.getBoundingClientRect();
            
            if (this.pointerLocked) {
                // In pointer lock, we work with movement deltas
                this.mousePosition.x += e.movementX;
                this.mousePosition.y += e.movementY;
                
                // Keep within canvas bounds
                this.mousePosition.x = Math.max(0, Math.min(this.mousePosition.x, gameCanvas.width));
                this.mousePosition.y = Math.max(0, Math.min(this.mousePosition.y, gameCanvas.height));
            } else {
                // Regular mouse position tracking relative to canvas
                this.mousePosition.x = e.clientX - rect.left;
                this.mousePosition.y = e.clientY - rect.top;
            }
        });
        
        // Track mouse down events
        gameCanvas.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent text selection and default behaviors
            
            // Map button indices to named buttons
            switch (e.button) {
                case 0: // Left button
                    this.mouseButtons.left = true;
                    this.mouseClicks.left = true;
                    break;
                case 1: // Middle button
                    this.mouseButtons.middle = true;
                    this.mouseClicks.middle = true;
                    break;
                case 2: // Right button
                    this.mouseButtons.right = true;
                    this.mouseClicks.right = true;
                    break;
            }
            
            // Request pointer lock on first click
            if (!this.pointerLocked) {
                this.requestPointerLock(gameCanvas);
            }
        });
        
        // Track mouse up events
        gameCanvas.addEventListener('mouseup', (e) => {
            // Map button indices to named buttons
            switch (e.button) {
                case 0: // Left button
                    this.mouseButtons.left = false;
                    break;
                case 1: // Middle button
                    this.mouseButtons.middle = false;
                    break;
                case 2: // Right button
                    this.mouseButtons.right = false;
                    break;
            }
        });
        
        // Prevent context menu on right click
        gameCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    setupPointerLockListeners() {
        // Handle pointer lock change events
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement === document.getElementById('gameCanvas');
            console.log("Pointer lock changed, now:", this.pointerLocked);
            
            // Reset mouse position to center when pointer lock is enabled
            if (this.pointerLocked) {
                const gameCanvas = document.getElementById('gameCanvas');
                this.mousePosition.x = gameCanvas.width / 2;
                this.mousePosition.y = gameCanvas.height / 2;
                
                // Unlock audio context on pointer lock - this is critical as browsers require user interaction
                if (window.audioManager) {
                    try {
                        console.log("Unlocking audio from pointer lock event");
                        // Resume audio context
                        if (window.audioManager.context && window.audioManager.context.state !== 'running') {
                            window.audioManager.context.resume().then(() => {
                                console.log("Audio context resumed from pointer lock event");
                                // Play the startup sound to ensure audio is working
                                window.audioManager.playStartupSound();
                                // Also play the materialization thud sound
                                setTimeout(() => {
                                    window.audioManager.playMaterializationThudSound();
                                }, 500);
                            });
                        }
                    } catch (e) {
                        console.warn("Error unlocking audio:", e);
                    }
                }
            }
        });
        
        // Handle pointer lock error events
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error occurred');
            this.pointerLocked = false;
        });
    }
    
    requestPointerLock(element) {
        try {
            // Try to request pointer lock if it's available
            if (element.requestPointerLock) {
                element.requestPointerLock();
            } else if (element.mozRequestPointerLock) {
                element.mozRequestPointerLock();
            } else if (element.webkitRequestPointerLock) {
                element.webkitRequestPointerLock();
            } else {
                console.warn('Pointer lock not supported in this browser');
            }
        } catch (error) {
            console.error('Error requesting pointer lock:', error);
        }
    }
    
    /**
     * Manually clear a key's state - useful for single-press actions like menu navigation
     * @param {string} key - The key to clear
     */
    clearKey(key) {
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
    }
    
    getInputState() {
        // Create a copy of the click state
        const clickState = {
            left: this.mouseClicks.left,
            right: this.mouseClicks.right
        };
        
        // Reset click flags (they're used for single-frame detection)
        this.mouseClicks.left = false;
        this.mouseClicks.right = false;
        
        // Return a processed input state for the game logic
        return {
            up: this.keys.ArrowUp || this.keys.w,
            down: this.keys.ArrowDown || this.keys.s,
            left: this.keys.ArrowLeft || this.keys.a,
            right: this.keys.ArrowRight || this.keys.d,
            shoot: this.mouseButtons.left, 
            dash: clickState.right, // Use click state instead of button state
            mouseX: this.mousePosition.x,
            mouseY: this.mousePosition.y,
            pointerLocked: this.pointerLocked,
            // Add function keys for debug controls
            F1: this.keys.F1,
            F2: this.keys.F2,
            F3: this.keys.F3,
            F4: this.keys.F4,
            F5: this.keys.F5,
            keys: this.keys // Also include the full keys object for flexibility
        };
    }
    
    exitPointerLock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        } else if (document.mozExitPointerLock) {
            document.mozExitPointerLock();
        } else if (document.webkitExitPointerLock) {
            document.webkitExitPointerLock();
        }
    }
}
