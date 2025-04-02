// game.js - Core game class and game loop
import Player from './player.js';
import Room from './room.js';
import { Camera } from './camera.js';
import { Physics } from './physics.js';
import { EffectsManager } from '../rendering/effects/effectsManager.js';
import { ProceduralGenerator } from './proceduralGenerator.js';
import { StartingRoom } from './startingRoom.js';
import AudioManager from '../audio/audioManager.js';
import { PauseMenu } from '../ui/pauseMenu.js';

export default class Game {
    constructor(width, height, renderer, inputHandler) {
        this.width = width;
        this.height = height;
        this.renderer = renderer;
        this.inputHandler = inputHandler;
        this.running = false;
        this.lastTimestamp = 0;
        this.doorTransitionCooldown = 0;
        this._lastDashState = false;
        this.debugMode = false; // New debug mode flag
        this.lastFrameTime = 16; // Store last frame time for FPS calculation
        this._lastLockedDoorCheck = null; // Track last locked door check time
        this.roomsCleared = 0; // Track room progression
        this.score = 0; // Player's score
        this._lastScore = 0; // Track last score for glow effect
        this._scoreChangeTime = null; // Time when score last changed
        
        // Initialize audio manager
        this.audioManager = new AudioManager();
        
        // Initialize pause menu
        this.pauseMenu = new PauseMenu(this);
        
        // Add game state to track whether we're in the starting room or main game
        this.gameState = 'starting'; // 'starting' or 'playing'
        
        // Set up grid-based spatial partitioning
        this.gridSize = 100; // Size of each grid cell in pixels
        
        // Initialize physics system
        this.physics = new Physics();
        
        // Initialize effects manager for visual effects
        this.effects = new EffectsManager(300); // Allow up to 300 particles
        
        // Initialize procedural generator
        this.generator = new ProceduralGenerator();
        
        // Enable the item-obstacle collision checking system
        this.generator.addItemCollisionCheckToRoom(Room);
        
        // Initialize the player with effects manager
        this.player = new Player(width / 2, height / 2 - 20);
        this.player.effects = this.effects; // Pass effects manager to player
        this.player.visible = false; // Initially set player to invisible until materialization completes
        
        // Set up renderer properties for projectiles
        this.player.canvasWidth = width;
        this.player.canvasHeight = height;
        
        // Create player stats object for initial dungeon generation
        const initialPlayerStats = {
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            ammo: this.player.ammo,
            maxAmmo: this.player.maxAmmo
        };
        
        // Dungeon generation
        const dungeonSize = 10; // Number of rooms in the dungeon
        this.dungeon = this.generator.generateDungeon(dungeonSize, {
            width: width,
            height: height,
            includeBossRoom: true
        }, initialPlayerStats);
        
        // Initialize with starting room instead of first room of dungeon
        this.startingRoom = new StartingRoom(this);
        this.currentRoom = this.startingRoom;
        
        // Store the main game start data for when we transition
        this.currentRoomId = this.dungeon.startRoomId;
        this.mainGameStartData = {
            roomId: this.currentRoomId,
            roomData: this.dungeon.rooms[this.currentRoomId]
        };
        
        // Track the last door the player entered through
        this.lastEntryDoorIndex = -1; // -1 means no entry door (first room)
        
        // Initialize the camera
        this.camera = new Camera(width, height, this.currentRoom.width, this.currentRoom.height);
        
        // Set the camera target to the player
        this.camera.target = this.player;
        
        // Set the camera in the renderer
        this.renderer.setCamera(this.camera);
        
        // Set effects manager in the room
        if (this.currentRoom.effects === undefined) {
            this.currentRoom.effects = this.effects;
        }
        
        // Initialize collision grid
        this.collisionGrid = this.buildCollisionGrid();
        
        // Create an initial burst of particles to demonstrate the system
        this.effects.createGlowEffect(width / 2, height / 2, 20, '#00FFFF', 1.5);
        
        // Track player's previous position for trail effects
        this.prevPlayerX = this.player.x;
        this.prevPlayerY = this.player.y;
        
        // Set up environment particle timer
        this.environmentParticleTimer = 0;
        this.environmentParticleInterval = 500; // ms between spawns
        
        // Bind the game loop method to this instance
        this.gameLoop = this.gameLoop.bind(this);
        
        // Future accessibility settings
        // TODO: Category 10 - Final Polish: Implement full accessibility menu and settings system
        this.accessibilitySettings = {
            uiScale: 1, // Adjustable via settings menu to scale UI elements
            highContrast: false // Toggle for high contrast mode for visual accessibility
        };
        
        // Track game start time for dynamic difficulty scaling
        this.gameStartTime = Date.now();
        
        // Private property to track animation frame ID
        this._animFrameId = null;
    }
    
    /**
     * Builds a spatial partitioning grid for efficient collision detection.
     * The grid divides the game world into cells based on gridSize, allowing
     * for optimized collision checks between entities that are close to each other.
     * 
     * @returns {Object} Grid object with cell coordinates as keys and arrays of entities as values
     */
    buildCollisionGrid() {
        const grid = {};
        const cols = Math.ceil(this.width / this.gridSize);
        const rows = Math.ceil(this.height / this.gridSize);
        
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                grid[`${x},${y}`] = { 
                    enemies: [], 
                    projectiles: [] 
                };
            }
        }
        
        console.log(`Created collision grid with ${cols}x${rows} cells`);
        return grid;
    }
    
    /**
     * Updates the spatial partitioning grid with current entity positions.
     * This method is called each frame to ensure the grid accurately reflects
     * the current positions of all dynamic entities (enemies and projectiles).
     * Optimizes collision detection by only checking entities in the same or adjacent cells.
     */
    updateCollisionGrid() {
        // Clear the grid
        for (const key in this.collisionGrid) {
            this.collisionGrid[key].enemies = [];
            this.collisionGrid[key].projectiles = [];
        }
        
        // Assign enemies to grid cells
        for (const enemy of this.currentRoom.enemies) {
            if (enemy.active && !enemy.dying) {
                const cellX = Math.floor(enemy.x / this.gridSize);
                const cellY = Math.floor(enemy.y / this.gridSize);
                const key = `${cellX},${cellY}`;
                
                if (this.collisionGrid[key]) {
                    this.collisionGrid[key].enemies.push(enemy);
                }
            }
        }
        
        // Assign projectiles to grid cells
        for (const projectile of this.player.projectiles) {
            if (projectile.active) {
                const cellX = Math.floor(projectile.x / this.gridSize);
                const cellY = Math.floor(projectile.y / this.gridSize);
                const key = `${cellX},${cellY}`;
                
                if (this.collisionGrid[key]) {
                    this.collisionGrid[key].projectiles.push(projectile);
                }
            }
        }
    }
    
    start() {
        if (!this.running) {
            this.running = true;
            this.lastTimestamp = performance.now();
            
            // Check if materialization protocol has been engaged
            const isAudioEnabled = () => {
                return !document.getElementById('audioEnablerContainer') || 
                      document.getElementById('audioEnablerContainer').classList.contains('hidden');
            };
            
            // Only create materialization effect if audio has been enabled
            if (isAudioEnabled()) {
                console.log("Materialization protocol already completed, playing startup effects");
                
                // Force AudioManager initialization by playing startup sound
                if (window.audioManager) {
                    window.audioManager.playStartupSound();
                }
                
                // Create player materialization effect
                this.createPlayerMaterializationEffect();
            } else {
                console.log("Waiting for materialization protocol to engage...");
                
                // Wait for the materialization protocol to be engaged before proceeding with effects
                const checkMaterialization = setInterval(() => {
                    if (isAudioEnabled()) {
                        clearInterval(checkMaterialization);
                        console.log("Materialization protocol engaged, creating player effect");
                        
                        // Create the effect after a short delay to let audio initialize
                        setTimeout(() => {
                            this.createPlayerMaterializationEffect();
                        }, 200);
                    }
                }, 100);
            }
            
            // Start the game loop
            requestAnimationFrame(this.gameLoop);
        }
    }
    
    stop() {
        this.running = false;
    }
    
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        // Store the frame time for FPS calculation in debug mode
        this.lastFrameTime = deltaTime;
        
        // Clear the canvas
        this.renderer.clear('#111111');
        
        // Update camera
        this.camera.update(deltaTime);
        
        // Check for player death and handle game restart
        if (this.player && this.player.isDead) {
            if (this.player.isDeathComplete()) {
                console.log("Death animation complete, restarting game");
                this.restartGame();
                return; // Skip the rest of the update since we're restarting
            }
        }
        
        // Update game state
        this.update(deltaTime);
        
        // Render game
        this.render();
        
        // Continue the game loop if still running
        if (this.running) {
            this._animFrameId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    processInput(deltaTime) {
        // This method is now unused, as we handle input directly in the update method
        // Keeping the method for backward compatibility but not updating the player here
    }
    
    update(deltaTime) {
        // Processing inputs for this frame
        const inputState = this.inputHandler.getInputState();
        
        // Check for pause toggle with 'p' key
        if (inputState.keys['p'] && !this._lastPauseState) {
            this.pauseMenu.toggle();
        }
        this._lastPauseState = inputState.keys['p'];
        
        // Handle pause menu input if paused
        if (this.pauseMenu.isPaused) {
            this.pauseMenu.handleInput(this.inputHandler);
            this.pauseMenu.update(deltaTime);
            return; // Skip the rest of the update when paused
        }
        
        // Handle keyboard input for room interactions (portals, etc.)
        this.handleKeyboardInput();
        
        // Check for debug mode toggle
        if (inputState.F3 && !this._lastF3State) {
            this.debugMode = !this.debugMode;
            console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
        }
        this._lastF3State = inputState.F3;
        
        // Update player using physics system first
        this.player.update(deltaTime, inputState, this.effects);
        
        // Use physics to move entities (if they don't handle their own movement)
        this.physics.move(this.player, deltaTime);
        
        // Only update enemies in main game mode
        if (this.gameState === 'playing') {
            this.currentRoom.enemies.forEach(enemy => {
                if (enemy.active && !enemy.dying) {
                    // Update enemies AI first, passing the full player object
                    enemy.update(deltaTime, this.player, this.effects);
                    // Then let physics handle the actual movement
                    this.physics.move(enemy, deltaTime);
                }
            });
        }
        
        // Update effects system
        this.effects.update(deltaTime);
        
        // Create movement trail for player
        this.effects.createPlayerMovementTrail(
            this.player.x, 
            this.player.y, 
            this.prevPlayerX, 
            this.prevPlayerY, 
            this.player.isDashing
        );
        
        // Store player's current position for next frame
        this.prevPlayerX = this.player.x;
        this.prevPlayerY = this.player.y;
        
        // Add ambient environmental particles
        this.updateEnvironmentParticles(deltaTime);
        
        // Update projectiles with physics
        this.player.projectiles.forEach(projectile => {
            if (projectile.active) {
                this.physics.move(projectile, deltaTime);
            }
        });
        
        // For dashing, implement continuous collision detection to prevent wall clipping
        if (this.player.isDashing) {
            // Calculate how far the player will move this frame
            const dashDistanceX = this.player.velocityX * (deltaTime / 1000);
            const dashDistanceY = this.player.velocityY * (deltaTime / 1000);
            const totalDistance = Math.sqrt(dashDistanceX * dashDistanceX + dashDistanceY * dashDistanceY);
            
            // If dash distance is significant, use continuous collision detection
            if (totalDistance > 10) {
                // Number of steps based on dash distance (more steps for longer distances)
                const steps = Math.ceil(totalDistance / 10);
                const stepX = dashDistanceX / steps;
                const stepY = dashDistanceY / steps;
                
                if (this.debugMode) {
                    console.log(`Dash continuous collision: distance=${totalDistance.toFixed(2)}, steps=${steps}`);
                }
                
                // Store original position in case we need to debug
                const originalX = this.player.x;
                const originalY = this.player.y;
                
                // Track if any collisions happened during stepping
                let collisionOccurred = false;
                
                for (let i = 0; i < steps; i++) {
                    // Move player a small step
                    this.player.x += stepX;
                    this.player.y += stepY;
                    
                    // Check and resolve collisions at this intermediate position
                    const hadCollision = this.handlePlayerBoundaryCollisionsAndReturnResult();
                    if (hadCollision && !collisionOccurred) {
                        collisionOccurred = true;
                        if (this.debugMode) {
                            console.log(`Dash collision at step ${i+1}/${steps}, preventing wall clip`);
                        }
                    }
                }
                
                if (collisionOccurred && this.debugMode) {
                    const distanceMoved = Math.sqrt(
                        Math.pow(this.player.x - originalX, 2) + 
                        Math.pow(this.player.y - originalY, 2)
                    );
                    console.log(`Dash collision happened. Original distance: ${totalDistance.toFixed(2)}, actual distance: ${distanceMoved.toFixed(2)}`);
                }
                
                // The physics system will still try to move the player after this,
                // so we need to save the current position
                this.player.dashLastX = this.player.x;
                this.player.dashLastY = this.player.y;
            }
        }
        
        // Apply room boundary collisions after entity positions are updated
        if (this.currentRoom) {
            // Apply wall collisions after player has moved
            this.handlePlayerBoundaryCollisions();
        }
        
        // If the player is dashing, check for dash damage (only in main game)
        if (this.gameState === 'playing' && this.player.isDashing) {
            this.checkDashDamageCollisions(this.currentRoom.enemies);
        }
        
        // Make the camera follow the player
        this.camera.follow(this.player.x, this.player.y, deltaTime);
        this.camera.updateShake(deltaTime);
        
        // Check for dash zoom effect
        if (this.player.isDashing && !this._lastDashState) {
            // Player just started dashing, trigger zoom effect
            this.camera.zoomTo(1.1); // Zoom out slightly during dash
            setTimeout(() => {
                this.camera.zoomTo(1.0); // Return to normal zoom
            }, this.player.dashDuration);
        }
        // Store dash state for next frame
        this._lastDashState = this.player.isDashing;
        
        // Update room with special handling for starting room
        if (this.currentRoom) {
            if (this.gameState === 'starting') {
                // Simpler update for starting room
                this.currentRoom.update(deltaTime, this.player);
                
                // Check for door transition to main game
                this.checkDoorTransitions();
            } else {
                // Update room with player, projectiles, and effects manager
                this.currentRoom.update(deltaTime, this.player, this.player.projectiles, this.effects);
                
                // Check if player has cleared the room (defeated all enemies)
                const activeEnemies = this.currentRoom.enemies.filter(enemy => enemy.active && !enemy.dying);
                if (activeEnemies.length === 0 && !this.currentRoom.doorsOpen) {
                    this.currentRoom.openDoors(this.lastEntryDoorIndex); // Pass the entry door index
                    // Add camera effects for door opening
                    this.camera.shake(5, 300);
                    this.camera.pulseZoom(0.15, 300); // Brief zoom pulse when doors open
                    
                    // Add bonus points for clearing the room
                    const roomClearBonus = 500 + (this.roomsCleared * 100); // Base 500 + 100 per room previously cleared
                    this.score += roomClearBonus;
                    console.log(`Room cleared! Bonus: ${roomClearBonus}, Total score: ${this.score}`);
                }
                
                // Check for room transitions in main game
                const doors = this.currentRoom.doors;
                
                // Loop through all doors to find collisions with unlocked doors
                for (let doorIndex = 0; doorIndex < doors.length; doorIndex++) {
                    const door = doors[doorIndex];
                    
                    // Skip locked doors
                    if (door.locked) {
                        continue;
                    }
                    
                    // Calculate collision boundaries
                    const padding = 20; // pixels of extra collision area
                    const doorLeft = door.x - door.width / 2 - padding;
                    const doorRight = door.x + door.width / 2 + padding;
                    const doorTop = door.y - door.height / 2 - padding;
                    const doorBottom = door.y + door.height / 2 + padding;
                    
                    // Player bounds
                    const playerCenterX = this.player.x;
                    const playerCenterY = this.player.y;
                    const playerHalfWidth = this.player.width / 2;
                    const playerHalfHeight = this.player.height / 2;
                    
                    // Check collision
                    if (playerCenterX + playerHalfWidth > doorLeft && 
                        playerCenterX - playerHalfWidth < doorRight && 
                        playerCenterY + playerHalfHeight > doorTop && 
                        playerCenterY - playerHalfHeight < doorBottom) {
                        
                        if (this.doorTransitionCooldown <= 0) {
                            console.log(`Player collided with unlocked door ${doorIndex}`);
                            
                            // Create new room based on direction
                            this.createNewRoom(doorIndex);
                            
                            // Add transition effects
                            this.camera.shake(8, 500);
                            this.camera.pulseZoom(0.2, 300);
                            
                            // Set door transition cooldown to prevent multiple transitions
                            this.doorTransitionCooldown = 1000; // ms
                            
                            // Play door transition sound
                            if (window.audioManager) {
                                window.audioManager.playRoomTransitionSound();
                            }
                            
                            // Increment room counter when player moves to a new room
                            this.roomsCleared++;
                            
                            break;
                        }
                    }
                }
            }
        }
        
        // Update the collision grid
        this.updateCollisionGrid();
        
        // Handle projectile collisions using the grid
        this.handleGridBasedCollisions();
        
        // Maintain door transition cooldown
        if (this.doorTransitionCooldown > 0) {
            this.doorTransitionCooldown -= deltaTime;
        }
        
        // Process player-enemy collisions
        this.processPlayerEnemyCollisions();
    }
    
    /**
     * Create a new room for the player to transition to
     * @param {number} doorIndex - The index of the door the player entered through
     */
    createNewRoom(doorIndex) {
        console.log(`Transitioning through door ${doorIndex}`);
        
        // Set cooldown to prevent rapid transitions
        this.doorTransitionCooldown = 1000; // 1 second cooldown
        
        // Store the current door index as the entry door for the new room
        this.lastEntryDoorIndex = doorIndex;
        
        // Get the direction for the door
        // Door indices: 0 = north, 1 = east, 2 = south, 3 = west
        
        // Find the connected room in this direction from current room
        const connections = this.dungeon.connections[this.currentRoomId] || {};
        
        if (connections[doorIndex] !== undefined) {
            // Connected room exists in this direction
            const nextRoomId = connections[doorIndex];
            console.log(`Found connected room ${nextRoomId} in direction ${doorIndex} from room ${this.currentRoomId}`);
            
            // Update current room ID
            this.currentRoomId = nextRoomId;
            
            // Get the room data from the dungeon
            const roomData = this.dungeon.rooms[nextRoomId];
            
            // Check if we need to add a guaranteed item
            if (!roomData.items || roomData.items.length === 0) {
                console.log("No items in connected room, adding a guaranteed item");
                
                // Generate items with player stats for balanced distribution
                roomData.items = [];
                this.generator.generateItems(roomData, roomData.difficulty || this.getCurrentDifficulty(), {
                    health: this.player.health,
                    maxHealth: this.player.maxHealth,
                    ammo: this.player.ammo,
                    maxAmmo: this.player.maxAmmo
                });
            }
            
            // Increment the rooms cleared counter
            if (!this.visitedRooms) {
                this.visitedRooms = new Set();
            }
            
            // Only increment if we haven't visited this room before
            if (!this.visitedRooms.has(nextRoomId)) {
                this.roomsCleared++;
                this.visitedRooms.add(nextRoomId);
            }
            
            // Create a new Room instance with the connected room data
            this.currentRoom = new Room(this.width, this.height, {
                obstacles: roomData.obstacles,
                template: roomData.template,
                enemies: roomData.enemies,
                items: roomData.items,
                difficulty: roomData.difficulty || this.getCurrentDifficulty()
            });
            
            // Regular room transition effects
            this.camera.pulseZoom(0.2, 500);
            this.camera.shake(10, 500);
            
            // Create room transition effect
            this.effects.createRoomTransitionEffect(
                this.currentRoom.width, 
                this.currentRoom.height, 
                this.player.x, 
                this.player.y
            );
            
            // Reset player position based on entry door (opposite of the door they exited through)
            this.resetPlayerPositionForNewRoom(doorIndex);
            
            // Clear the player's projectiles when entering a new room
            this.player.projectiles = [];
            
            // Reset dash damage tracking for new room
            if (this.player.hasDealtDashDamage) {
                this.player.hasDealtDashDamage.clear();
            }
            
            // Reset collision grid for the new room
            this.collisionGrid = this.buildCollisionGrid();
            
            console.log(`Transitioned to connected room ${nextRoomId}`);
        } else {
            // Fallback to legacy random room generation if no connected room exists
            console.warn(`No connected room found in direction ${doorIndex}, falling back to random generation`);
            
            // Get current difficulty level 
            const difficulty = this.getCurrentDifficulty();
            console.log(`Creating new random room with difficulty: ${difficulty}, rooms cleared: ${this.roomsCleared}`);
            
            // Calculate where the player will enter the new room BEFORE generating the room
            // The entry door is opposite to the exit door
            const entryDoorIndex = (doorIndex + 2) % 4;
            let playerEntryX = this.width / 2;  // default to center
            let playerEntryY = this.height / 2; // default to center
            
            // Set player entry position based on which door they're entering from
            const offsetDistance = 80; // pixels to offset from door center
            
            // The room doesn't exist yet, so we need to calculate the door positions
            const wallThickness = 20; // Match the Room class wall thickness
            const doorWidth = 100;    // Match the Room class door width
            
            switch (entryDoorIndex) {
                case 0: // Entering from top
                    playerEntryX = this.width / 2;
                    playerEntryY = wallThickness + offsetDistance;
                    break;
                case 1: // Entering from right
                    playerEntryX = this.width - wallThickness - offsetDistance;
                    playerEntryY = this.height / 2;
                    break;
                case 2: // Entering from bottom
                    playerEntryX = this.width / 2;
                    playerEntryY = this.height - wallThickness - offsetDistance;
                    break;
                case 3: // Entering from left
                    playerEntryX = wallThickness + offsetDistance;
                    playerEntryY = this.height / 2;
                    break;
            }
            
            console.log(`Player will enter at position: (${playerEntryX}, ${playerEntryY})`);
            
            // Generate room configuration with base structure and components
            const roomData = this.generator.generateRoom(this.width, this.height, difficulty, playerEntryX, playerEntryY);
            
            // We've already generated items, but now regenerate with player stats
            // This ensures balanced item distribution based on player health and ammo
            roomData.items = [];
            this.generator.generateItems(roomData, difficulty, {
                health: this.player.health,
                maxHealth: this.player.maxHealth,
                ammo: this.player.ammo,
                maxAmmo: this.player.maxAmmo
            });
            
            console.log(`Room data generated:`, 
                `Template: ${roomData.template}`,
                `Obstacles: ${roomData.obstacles ? roomData.obstacles.length : 0}`,
                `Enemies: ${roomData.enemies ? roomData.enemies.length : 0}`,
                `Items: ${roomData.items ? roomData.items.length : 0}`
            );
            
            // Create a new Room instance with the generated data
            this.currentRoom = new Room(this.width, this.height, {
                obstacles: roomData.obstacles,
                template: roomData.template,
                enemies: roomData.enemies,
                items: roomData.items,
                difficulty: difficulty
            });
            
            // Add a camera transition effect
            this.camera.pulseZoom(0.2, 500);
            this.camera.shake(10, 500);
            
            // Reset player position based on entry door
            this.resetPlayerPositionForNewRoom(doorIndex);
            
            // Clear the player's projectiles when entering a new room
            this.player.projectiles = [];
            
            // Reset dash damage tracking for new room
            if (this.player.hasDealtDashDamage) {
                this.player.hasDealtDashDamage.clear();
            }
            
            // Reset collision grid for the new room
            this.collisionGrid = this.buildCollisionGrid();
            
            // Create room transition effect
            this.effects.createRoomTransitionEffect(
                this.currentRoom.width, 
                this.currentRoom.height, 
                this.player.x, 
                this.player.y
            );
            
            // Force enemy spawning if no enemies were created
            if (!this.currentRoom.enemies || this.currentRoom.enemies.length === 0) {
                console.warn("No enemies were created during room generation. Forcing enemy spawning.");
                this.currentRoom.spawnEnemies(3 + Math.floor(difficulty));
            } else {
                console.log(`Room created with ${this.currentRoom.enemies.length} enemies`);
            }
        }
    }
    
    /**
     * Get the current difficulty level based on game progression and player performance
     * @returns {number} Difficulty level (starting at 1)
     */
    getCurrentDifficulty() {
        // Base difficulty from rooms cleared
        const roomProgress = Math.floor(this.roomsCleared / 3) + 1;
        
        // Track additional stats for the player if they don't exist yet
        if (!this.player.stats) {
            this.player.stats = {
                totalKills: 0,
                timeSpentInRooms: 0,
                deathCount: 0,
                damageTaken: 0
            };
        }
        
        // Calculate additional difficulty modifiers
        let difficultyModifiers = 0;
        
        // Calculate time-based difficulty scaling (late game difficulty)
        // Every 5 minutes adds 1 to difficulty
        const playTimeMinutes = ((Date.now() - (this.gameStartTime || Date.now())) / 60000);
        const timeModifier = Math.floor(playTimeMinutes / 5);
        
        // Calculate performance-based scaling
        // If player has high health, we can increase difficulty
        const healthRatio = this.player.health / this.player.maxHealth;
        const healthModifier = healthRatio > 0.8 ? 1 : 0;
        
        // Apply all modifiers (capped to prevent excessive difficulty spikes)
        difficultyModifiers = Math.min(3, timeModifier + healthModifier);
        
        // Calculate final difficulty (base + modifiers), minimum of 1
        const finalDifficulty = Math.max(1, roomProgress + difficultyModifiers);
        
        console.log(`Difficulty calculation: Base=${roomProgress}, TimeMod=${timeModifier}, HealthMod=${healthModifier}, Final=${finalDifficulty}`);
        
        return finalDifficulty;
    }
    
    /**
     * Reset the player's position for a new room based on the entry door
     * @param {number} doorIndex - The index of the door the player entered through
     */
    resetPlayerPositionForNewRoom(doorIndex) {
        // Determine exit door (opposite side)
        // If player leaves through top (0), they enter from bottom (2)
        // If player leaves through right (1), they enter from left (3)
        // If player leaves through bottom (2), they enter from top (0)
        // If player leaves through left (3), they enter from right (1)
        const exitDoorIndex = (doorIndex + 2) % 4;
        console.log(`Player will enter new room from door ${exitDoorIndex}`);
        
        // Position player just inside the room near the entry door
        // Add offset to prevent instant re-triggering
        const entryDoor = this.currentRoom.doors[exitDoorIndex];
        
        // Determine offset direction based on entry door
        const offsetDistance = 80; // pixels to offset from door center
        
        switch (exitDoorIndex) {
            case 0: // Entering from top
                this.player.y = entryDoor.y + offsetDistance;
                this.player.x = entryDoor.x;
                break;
            case 1: // Entering from right
                this.player.x = entryDoor.x - offsetDistance;
                this.player.y = entryDoor.y;
                break;
            case 2: // Entering from bottom
                this.player.y = entryDoor.y - offsetDistance;
                this.player.x = entryDoor.x;
                break;
            case 3: // Entering from left
                this.player.x = entryDoor.x + offsetDistance;
                this.player.y = entryDoor.y;
                break;
        }
        
        // Track the last door the player entered through
        this.lastEntryDoorIndex = exitDoorIndex;
        console.log(`Setting lastEntryDoorIndex to ${this.lastEntryDoorIndex}`);
    }
    
    render() {
        // Start rendering with camera transformation
        this.renderer.beginRender();
        
        try {
            // Render the current room (walls, doors, obstacles)
            if (this.currentRoom) {
                this.currentRoom.render(this.renderer);
            }
            
            // Render player
            if (this.player) {
                this.player.render(this.renderer);
            }
            
            // End rendering with camera transformation
            this.renderer.endRender();
            
            // Render UI elements (these are rendered without camera transform)
            this.renderUI();
            
            // Render effects (these should be rendered after everything else)
            if (this.effects) {
                this.effects.render(this.renderer.ctx);
            }
            
            // Render debug information if debug mode is enabled
            if (this.debugMode) {
                this.renderDebugInfo();
            }
            
            // Render pause menu on top of everything if paused
            this.pauseMenu.render(this.renderer.ctx);
        } catch (error) {
            console.error("Error during rendering:", error);
        }
    }
    
    renderDebugInfo() {
        const ctx = this.renderer.ctx;
        ctx.save();
        
        // Set text properties
        ctx.font = '12px monospace';
        ctx.fillStyle = '#00FF00';
        ctx.textAlign = 'left';
        
        // Debug information
        const debugInfo = [
            `FPS: ${Math.round(1000 / this.lastFrameTime)}`,
            `Player Position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
            `Enemies: ${this.currentRoom.enemies.filter(e => e.active).length}`,
            `Projectiles: ${this.player.projectiles.filter(p => p.active).length}`,
            `Particles: ${this.effects.getParticleCount()}`
        ];
        
        // Render debug text
        let y = 20;
        for (const line of debugInfo) {
            ctx.fillText(line, 10, y);
            y += 15;
        }
        
        ctx.restore();
    }
    
    renderUI() {
        // Get canvas dimensions for responsive UI
        const canvasWidth = this.renderer.ctx.canvas.width;
        const canvasHeight = this.renderer.ctx.canvas.height;
        
        // Calculate UI scale factor based on canvas size with accessibility scaling
        // Combines both responsive sizing and accessibility scaling
        const responsiveScale = Math.min(canvasWidth, canvasHeight) / 800;
        const uiScale = responsiveScale * this.accessibilitySettings.uiScale;
        const padding = 10 * uiScale;
        
        // UI position offsets
        const leftUIOffsetX = 15; // Move left UI elements right by 15px
        const leftUIOffsetY = 10; // Move left UI elements down by 10px
        const rightUIOffsetX = 0; // No right offset (moved left 15 from previous position of 15)
        const rightUIOffsetY = 10; // Reduced from 15 to 10 (moving up 5 from previous position)
        
        // Display enemy count
        const enemyCount = this.currentRoom.enemies.filter(e => e.active).length;
        this.renderer.drawScreenText(
            `Enemies: ${enemyCount}`, 
            padding + leftUIOffsetX, 
            padding * 3 + leftUIOffsetY, 
            this.accessibilitySettings.highContrast ? '#FFFFFF' : '#00FFFF', 
            `${16 * uiScale}px`, 
            'Courier New'
        );
        
        // Display player health
        const healthPercent = Math.min(1, this.player.health / this.player.maxHealth);
        const healthColor = this.accessibilitySettings.highContrast 
            ? (healthPercent > 0.3 ? '#FFFFFF' : '#FFFF00') // Simplified high contrast colors
            : this.getHealthColor(healthPercent);
            
        this.renderer.drawScreenText(
            `Health: ${Math.floor(this.player.health)}`, 
            padding + leftUIOffsetX, 
            padding * 6 + leftUIOffsetY - 5, // Move health percentage up by 5 units
            healthColor, 
            `${16 * uiScale}px`, 
            'Courier New'
        );
        
        // Health bar (responsive dimensions)
        const barWidth = canvasWidth * 0.15;
        const barHeight = Math.max(5, 5 * uiScale);
        const barX = padding * 9 * uiScale + leftUIOffsetX;
        const barY = padding * 5.5 + leftUIOffsetY;
        
        // Background bar (gray or black for high contrast)
        this.renderer.drawScreenRect(
            barX, 
            barY, 
            barWidth, 
            barHeight, 
            this.accessibilitySettings.highContrast ? '#000000' : '#333333'
        );
        
        // Health bar with animated fill
        const healthWidth = barWidth * healthPercent;
        
        // Draw with gradient overlay for more visual appeal
        const healthGradient = this.renderer.ctx.createLinearGradient(barX, barY, barX + healthWidth, barY);
        
        // Apply pulse effect to colors when health is full
        if (healthPercent >= 1) {
            if (this.accessibilitySettings.highContrast) {
                // Use a simple bright color for high contrast
                healthGradient.addColorStop(0, '#00FF00');
                healthGradient.addColorStop(1, '#00FF00');
            } else {
                const baseColor = healthColor;
                const pulseColor = this.adjustBrightness(healthColor, 1.3);
                const glowColor = this.adjustBrightness(healthColor, 1.5);
                
                healthGradient.addColorStop(0, baseColor);
                healthGradient.addColorStop(0.7, pulseColor);
                healthGradient.addColorStop(1, glowColor);
                
                // Add glow effect around the health bar when full
                this.renderer.ctx.shadowColor = healthColor;
                this.renderer.ctx.shadowBlur = 5;
            }
        } else {
            if (this.accessibilitySettings.highContrast) {
                // Simplified colors for high contrast mode
                healthGradient.addColorStop(0, healthColor);
                healthGradient.addColorStop(1, healthColor);
            } else {
                healthGradient.addColorStop(0, healthColor);
                healthGradient.addColorStop(0.7, healthColor);
                healthGradient.addColorStop(1, this.adjustBrightness(healthColor, 1.3));
            }
            
            // No glow for non-full health
            this.renderer.ctx.shadowBlur = 0;
        }
        
        this.renderer.drawScreenRect(
            barX, 
            barY, 
            healthWidth, 
            barHeight, 
            this.accessibilitySettings.highContrast ? healthColor : healthGradient
        );
        
        // Reset shadow
        this.renderer.ctx.shadowBlur = 0;
        
        // Render dash cooldown indicator
        this.renderDashCooldown(uiScale, padding, canvasWidth, leftUIOffsetX, leftUIOffsetY);
        
        // Render score counter in top right
        const scoreColor = this.accessibilitySettings.highContrast ? '#FFFFFF' : '#FF00FF'; // Magenta for neon aesthetic
        const scoreX = canvasWidth - padding - 150 * uiScale + rightUIOffsetX; // Position on right side with offset
        this.renderer.drawScreenText(
            `Score: ${this.score.toLocaleString()}`, 
            scoreX, 
            padding * 3 + rightUIOffsetY, 
            scoreColor, 
            `${16 * uiScale}px`, 
            'Courier New'
        );
        
        // Add a pulsing neon effect around the score when it changes
        if (this._lastScore !== this.score) {
            // Store the time when score changed
            if (!this._scoreChangeTime) {
                this._scoreChangeTime = Date.now();
            }
            
            // Calculate time since score change
            const timeSinceChange = Date.now() - this._scoreChangeTime;
            
            // If within 1 second of score change, add glow effect
            if (timeSinceChange < 1000) {
                const glowIntensity = 15 * Math.max(0, 1 - timeSinceChange / 1000);
                
                // Only apply if not in high contrast mode
                if (!this.accessibilitySettings.highContrast) {
                    this.renderer.ctx.save();
                    this.renderer.ctx.shadowColor = scoreColor;
                    this.renderer.ctx.shadowBlur = glowIntensity;
                    // Redraw text with glow
                    this.renderer.drawScreenText(
                        `Score: ${this.score.toLocaleString()}`, 
                        scoreX, 
                        padding * 3 + rightUIOffsetY, 
                        scoreColor, 
                        `${16 * uiScale}px`, 
                        'Courier New'
                    );
                    this.renderer.ctx.restore();
                }
            } else {
                // Reset score change time after effect completes
                this._scoreChangeTime = null;
            }
            
            // Update last score
            this._lastScore = this.score;
        }
        
        // Render room counter below score
        const roomColor = this.accessibilitySettings.highContrast ? '#FFFFFF' : '#00FFFF'; // Cyan for neon aesthetic
        this.renderer.drawScreenText(
            `Rooms: ${this.roomsCleared}`, 
            scoreX, 
            padding * 6 + rightUIOffsetY, 
            roomColor, 
            `${16 * uiScale}px`, 
            'Courier New'
        );
    }
    
    getHealthColor(healthPercent) {
        if (healthPercent > 0.7) return '#00FF00'; // Green for high health
        if (healthPercent > 0.3) return '#FFFF00'; // Yellow for medium health
        return '#FF0000'; // Red for low health
    }
    
    // Helper function to adjust color brightness
    adjustBrightness(color, factor) {
        // Parse the hex color into RGB components
        let r, g, b;
        
        if (color.startsWith('rgb')) {
            // Handle rgb format
            const rgbValues = color.match(/\d+/g);
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
        } else {
            // Handle hex format
            const hex = color.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        }
        
        // Adjust brightness
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    renderDashCooldown(uiScale, padding, canvasWidth, leftUIOffsetX, leftUIOffsetY) {
        const dashCooldownPercent = this.player.dashCooldownTimer / this.player.dashCooldown;
        const dashAvailable = dashCooldownPercent <= 0;
        
        // Store last cooldown value for smooth animation
        if (!this._lastDashCooldown) {
            this._lastDashCooldown = dashCooldownPercent;
        }
        
        // Smoothly interpolate between last and current cooldown value
        const smoothingFactor = 0.05;
        this._lastDashCooldown += (dashCooldownPercent - this._lastDashCooldown) * smoothingFactor;
        
        // If close enough to actual value, snap to it
        if (Math.abs(this._lastDashCooldown - dashCooldownPercent) < 0.01) {
            this._lastDashCooldown = dashCooldownPercent;
        }
        
        // Use the smoothed value for animations with quadratic easing
        const animatedCooldownPercent = this._lastDashCooldown;
        // Apply quadratic easing to make the animation smoother
        const easedCooldownPercent = animatedCooldownPercent ** 2;
        
        // Draw dash cooldown text with appropriate contrast
        const dashTextColor = this.accessibilitySettings.highContrast
            ? (dashAvailable ? '#FFFFFF' : '#999999')
            : (dashAvailable ? '#00FFFF' : '#555555');
            
        this.renderer.drawScreenText(
            `Dash: ${dashAvailable ? 'READY' : 'COOLING'}`, 
            padding + leftUIOffsetX, 
            padding * 9 + leftUIOffsetY - 5, // Move READY/COOLING text up by 5 units
            dashTextColor, 
            `${16 * uiScale}px`, 
            'Courier New'
        );
        
        // Draw dash cooldown bar (responsive dimensions)
        const barWidth = canvasWidth * 0.15;
        const barHeight = Math.max(5, 5 * uiScale);
        const barX = padding * 6.5 * uiScale + leftUIOffsetX;
        const barY = padding * 8.5 + leftUIOffsetY;
        
        // Background bar (gray or black for high contrast)
        this.renderer.drawScreenRect(
            barX, 
            barY, 
            barWidth, 
            barHeight, 
            this.accessibilitySettings.highContrast ? '#000000' : '#333333'
        );
        
        if (!dashAvailable) {
            // Cooldown progress with smooth animation using quadratic easing
            const cooldownWidth = barWidth * (1 - easedCooldownPercent);
            
            // Choose color based on accessibility settings
            let fillColor;
            if (this.accessibilitySettings.highContrast) {
                // Use a simple bright color for high contrast
                fillColor = '#00FFFF';
            } else {
                // Use the regular cooldown color gradient
                const cooldownColor = this.getCooldownColor(animatedCooldownPercent);
                
                // Create gradient for more dynamic look
                const cooldownGradient = this.renderer.ctx.createLinearGradient(barX, barY, barX + cooldownWidth, barY);
                cooldownGradient.addColorStop(0, cooldownColor);
                cooldownGradient.addColorStop(0.7, cooldownColor);
                cooldownGradient.addColorStop(1, this.adjustBrightness(cooldownColor, 1.3));
                
                fillColor = cooldownGradient;
            }
            
            this.renderer.drawScreenRect(
                barX, 
                barY, 
                cooldownWidth, 
                barHeight, 
                fillColor
            );
        } else {
            // When dash is ready, create pulsing effect
            const pulseIntensity = this.accessibilitySettings.highContrast ? 0 : 0.2 * Math.sin(Date.now() / 150);
            
            // Choose color based on accessibility settings
            let readyColor;
            if (this.accessibilitySettings.highContrast) {
                // Use a simple bright color for high contrast
                readyColor = '#00FFFF';
            } else {
                // Use pulsing effect for normal mode
                readyColor = this.adjustBrightness('#00FFFF', 1 + pulseIntensity);
                
                // Add glow effect
                this.renderer.ctx.shadowColor = '#00FFFF';
                this.renderer.ctx.shadowBlur = 5 + 3 * Math.abs(pulseIntensity);
            }
            
            this.renderer.drawScreenRect(
                barX, 
                barY, 
                barWidth, 
                barHeight, 
                readyColor
            );
            
            // Reset shadow
            this.renderer.ctx.shadowBlur = 0;
        }
    }
    
    getCooldownColor(percent) {
        // Gradient from red (hot) to cyan (cold/ready)
        const r = Math.min(255, Math.floor(255 * percent * 2));
        const g = Math.min(255, Math.floor(255 * (1 - percent)));
        const b = Math.min(255, Math.floor(255 * (1 - percent / 2)));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Add ambient environmental particles for atmosphere
    updateEnvironmentParticles(deltaTime) {
        this.environmentParticleTimer -= deltaTime;
        
        if (this.environmentParticleTimer <= 0) {
            this.environmentParticleTimer = this.environmentParticleInterval;
            
            // Get camera bounds
            const cameraLeft = this.camera.x;
            const cameraTop = this.camera.y;
            const cameraRight = cameraLeft + this.width / this.camera.zoom;
            const cameraBottom = cameraTop + this.height / this.camera.zoom;
            
            // Add a few ambient particles within the view
            const particleCount = 3; // Don't add too many per interval
            
            for (let i = 0; i < particleCount; i++) {
                // Random position within camera view
                const x = cameraLeft + Math.random() * (cameraRight - cameraLeft);
                const y = cameraTop + Math.random() * (cameraBottom - cameraTop);
                
                // Determine if we're near a wall or door for context-specific particles
                const nearWall = this.isNearWall(x, y, 100);
                const nearDoor = this.isNearDoor(x, y, 100);
                
                if (nearDoor && Math.random() < 0.7) {
                    // Door energy particles
                    const door = this.getNearestDoor(x, y);
                    const doorColor = door && !door.locked ? '#00FFFF' : '#FF00FF';
                    
                    this.effects.createGlowEffect(
                        x, y, 
                        1 + Math.floor(Math.random() * 3),
                        doorColor,
                        1.5 + Math.random() * 2
                    );
                } else if (nearWall && Math.random() < 0.3) {
                    // Wall dust particles
                    const angle = Math.random() * Math.PI * 2;
                    this.effects.particleSystem.createParticle(
                        x, y,
                        Math.cos(angle) * 10, Math.sin(angle) * 10,
                        1 + Math.random() * 2,
                        '#AAAAAA',
                        0.5 + Math.random() * 1.5
                    );
                } else if (Math.random() < 0.2) {
                    // Ambient floating energy particles
                    const colors = ['#00FFFF', '#FF00FF', '#AAAAAA', '#FFFFFF'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    
                    this.effects.particleSystem.createParticle(
                        x, y,
                        (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20,
                        1 + Math.random() * 2,
                        color,
                        2 + Math.random() * 3
                    );
                }
            }
        }
    }
    
    // Helper method to check if a position is near any wall
    isNearWall(x, y, threshold) {
        // Create wall coordinates (same as in Room class)
        const walls = [
            // Left wall
            { 
                x: 0, 
                y: 0, 
                width: this.currentRoom.wallThickness, 
                height: this.currentRoom.height 
            },
            // Right wall
            { 
                x: this.currentRoom.width - this.currentRoom.wallThickness, 
                y: 0, 
                width: this.currentRoom.wallThickness, 
                height: this.currentRoom.height 
            },
            // Top wall
            { 
                x: 0, 
                y: 0, 
                width: this.currentRoom.width, 
                height: this.currentRoom.wallThickness 
            },
            // Bottom wall
            { 
                x: 0, 
                y: this.currentRoom.height - this.currentRoom.wallThickness, 
                width: this.currentRoom.width, 
                height: this.currentRoom.wallThickness 
            }
        ];
        
        for (const wall of walls) {
            // Calculate closest point on the wall
            const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
            
            // Calculate distance to the closest point
            const dx = x - closestX;
            const dy = y - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < threshold) {
                return true;
            }
        }
        return false;
    }
    
    // Helper method to check if a position is near any door
    isNearDoor(x, y, threshold) {
        for (const door of this.currentRoom.doors) {
            // Calculate center of the door
            const doorCenterX = door.x;
            const doorCenterY = door.y;
            
            // Calculate distance to the door center
            const dx = x - doorCenterX;
            const dy = y - doorCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < threshold) {
                return true;
            }
        }
        return false;
    }
    
    // Get the nearest door to a position
    getNearestDoor(x, y) {
        let nearestDoor = null;
        let minDistance = Infinity;
        
        for (const door of this.currentRoom.doors) {
            const dx = x - door.x;
            const dy = y - door.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestDoor = door;
            }
        }
        
        return nearestDoor;
    }
    
    /**
     * Check for collisions between two objects using AABB collision detection
     * @param {Object} obj1 - First object with x, y, width, height properties
     * @param {Object} obj2 - Second object with x, y, width, height properties
     * @returns {boolean} True if objects are colliding
     */
    checkCollision(obj1, obj2) {
        // Calculate the half-widths and half-heights of both objects
        const halfWidth1 = obj1.width / 2;
        const halfHeight1 = obj1.height / 2;
        const halfWidth2 = obj2.width / 2;
        const halfHeight2 = obj2.height / 2;
        
        // Calculate centers of objects
        const centerX1 = obj1.x;
        const centerY1 = obj1.y;
        const centerX2 = obj2.x;
        const centerY2 = obj2.y;
        
        // Calculate the distance between centers
        const distX = Math.abs(centerX1 - centerX2);
        const distY = Math.abs(centerY1 - centerY2);
        
        // Calculate minimum distance before collision
        const minDistX = halfWidth1 + halfWidth2;
        const minDistY = halfHeight1 + halfHeight2;
        
        // Check if objects are colliding
        return distX < minDistX && distY < minDistY;
    }
    
    /**
     * Resolve a collision by pushing the player outside the collided object
     * @param {Object} player - Player object to resolve collision for
     * @param {Object} obstacle - Obstacle object that player collided with
     */
    resolveCollision(player, obstacle) {
        // Calculate the half-widths and half-heights
        const playerHalfWidth = player.width / 2;
        const playerHalfHeight = player.height / 2;
        const obstacleHalfWidth = obstacle.width / 2;
        const obstacleHalfHeight = obstacle.height / 2;
        
        // Calculate centers
        const playerCenterX = player.x;
        const playerCenterY = player.y;
        const obstacleCenterX = obstacle.x;
        const obstacleCenterY = obstacle.y;
        
        // Calculate the overlap on each axis
        const overlapX = (playerHalfWidth + obstacleHalfWidth) - Math.abs(playerCenterX - obstacleCenterX);
        const overlapY = (playerHalfHeight + obstacleHalfHeight) - Math.abs(playerCenterY - obstacleCenterY);
        
        // Resolve the collision by moving the player along the axis with the smallest overlap
        if (overlapX < overlapY) {
            // Resolve on X-axis
            if (playerCenterX < obstacleCenterX) {
                // Player is on the left side of the obstacle
                player.x = obstacleCenterX - obstacleHalfWidth - playerHalfWidth;
            } else {
                // Player is on the right side of the obstacle
                player.x = obstacleCenterX + obstacleHalfWidth + playerHalfWidth;
            }
        } else {
            // Resolve on Y-axis
            if (playerCenterY < obstacleCenterY) {
                // Player is above the obstacle
                player.y = obstacleCenterY - obstacleHalfHeight - playerHalfHeight;
            } else {
                // Player is below the obstacle
                player.y = obstacleCenterY + obstacleHalfHeight + playerHalfHeight;
            }
        }
    }
    
    /**
     * Handle player's wall, door, and obstacle collisions and return if any collision occurred
     * @returns {boolean} Whether any collision was detected and resolved
     */
    handlePlayerBoundaryCollisionsAndReturnResult() {
        // Get walls from current room
        const walls = this.currentRoom.getWalls();
        
        let hadCollision = false;
        
        // Handle wall collisions
        for (const wall of walls) {
            if (this.checkCollision(this.player, wall)) {
                this.resolveCollision(this.player, wall);
                hadCollision = true;
            }
        }
        
        // Handle door collisions - block movement through locked doors
        const doors = this.currentRoom.doors;
        for (const door of doors) {
            // Only check locked doors - we want to block movement through them
            if (door.locked) {
                // Create a collision box for the door
                const doorCollider = {
                    x: door.x,
                    y: door.y,
                    width: door.width,
                    height: door.height
                };
                
                // Check if player is colliding with a locked door
                if (this.checkCollision(this.player, doorCollider)) {
                    // Player is trying to pass through a locked door - resolve the collision
                    this.resolveCollision(this.player, doorCollider);
                    hadCollision = true;
                    
                    // Only trigger effects if we haven't triggered them recently for this door
                    if (!door.lastCollisionTime || Date.now() - door.lastCollisionTime > 500) {
                        door.lastCollisionTime = Date.now();
                        
                        // Play the locked door sound effect
                        if (window.audioManager) {
                            window.audioManager.playDoorLockedSound();
                        }
                        
                        // Visual effects code...
                    }
                }
            }
        }
        
        // Handle obstacle collisions
        const obstacles = this.currentRoom.obstacles;
        for (const obstacle of obstacles) {
            // Create a collision box for the obstacle
            const obstacleCollider = {
                x: obstacle.x + obstacle.width / 2, // Center the obstacle
                y: obstacle.y + obstacle.height / 2,
                width: obstacle.width,
                height: obstacle.height
            };
            
            // Check if player is colliding with this obstacle
            if (this.checkCollision(this.player, obstacleCollider)) {
                // Resolve the collision by pushing the player outside the obstacle
                this.resolveCollision(this.player, obstacleCollider);
                hadCollision = true;
            }
        }
        
        return hadCollision;
    }
    
    /**
     * Handle player's wall, door, and obstacle collisions
     */
    handlePlayerBoundaryCollisions() {
        this.handlePlayerBoundaryCollisionsAndReturnResult();
    }
    
    /**
     * Check for collisions between the player and enemies
     */
    checkPlayerEnemyCollisions() {
        if (this.player.isDead) return; // Skip if player is dead
        
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = this.player.radius;

        this.currentRoom.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            const enemyX = enemy.x;
            const enemyY = enemy.y;
            const enemyRadius = enemy.radius || 15; // Default to 15 if not specified
            
            const dx = playerX - enemyX;
            const dy = playerY - enemyY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < playerRadius + enemyRadius) {
                // If player is dashing and has not dealt dash damage to this enemy
                if (this.player.isDashing && !this.player.hasDealtDashDamage.has(enemy.id)) {
                    // Player damages enemy when dashing
                    enemy.takeDamage(this.player.dashDamage, this.effects);
                    this.player.hasDealtDashDamage.add(enemy.id);
                } else if (!this.player.isDashing) {
                    // Enemy damages player when not dashing
                    if (this.player.takeDamage(10)) { // Apply 10 damage to player
                        // Camera shake effect when player takes damage
                        this.camera.shake(10, 150); // intensity, duration
                    }
                    
                    // Simple knockback effect
                    const knockbackForce = 5;
                    const knockbackX = (dx / distance) * knockbackForce;
                    const knockbackY = (dy / distance) * knockbackForce;
                    
                    // Apply knockback to player position directly
                    this.player.x += knockbackX;
                    this.player.y += knockbackY;
                }
            }
        });
    }
    
    /**
     * Handle collisions between projectiles and enemies using the spatial grid
     * for optimized collision detection
     */
    handleGridBasedCollisions() {
        // Check collisions within each grid cell
        for (const key in this.collisionGrid) {
            const cell = this.collisionGrid[key];
            
            // Skip empty cells for performance
            if (cell.projectiles.length === 0 && !this.player.isDashing) {
                continue;
            }
            
            // Get the coordinates of this cell
            const [cellX, cellY] = key.split(',').map(Number);
            
            // Get all potential adjacent cells too (including diagonals)
            const neighbors = this.getNeighborCells(cellX, cellY);
            
            // Collect all enemies from this cell and its neighbors
            const relevantEnemies = [...cell.enemies];
            for (const neighborKey of neighbors) {
                if (this.collisionGrid[neighborKey]) {
                    relevantEnemies.push(...this.collisionGrid[neighborKey].enemies);
                }
            }
            
            // Skip if no enemies found in or around this cell
            if (relevantEnemies.length === 0) continue;
            
            // Check collisions between projectiles in this cell and all relevant enemies
            for (const projectile of cell.projectiles) {
                if (!projectile.active) continue;
                
                for (const enemy of relevantEnemies) {
                    if (!enemy.active || enemy.dying) continue;
                    
                    // Simple circle-based collision detection
                    const dx = projectile.x - enemy.x;
                    const dy = projectile.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < projectile.radius + enemy.width / 2) {
                        // Hit detected
                        projectile.active = false;
                        enemy.takeDamage(projectile.damage, this.effects);
                        
                        // Determine if it's a critical hit (can be based on game mechanics)
                        const isCritical = Math.random() < 0.2; // 20% chance of critical
                        
                        // Create particle effect for projectile hit
                        this.effects.createEnemyHitEffect(
                            enemy.x, enemy.y,
                            projectile.x, projectile.y,
                            projectile.damage,
                            isCritical
                        );
                        
                        console.log(`Hit ${enemy.type} enemy, health: ${enemy.health}`);
                        break; // A projectile can only hit one enemy
                    }
                }
            }
        }
    }
    
    /**
     * Get the keys of all 8 neighboring cells around the given cell
     * @param {number} cellX - X coordinate of the cell
     * @param {number} cellY - Y coordinate of the cell
     * @returns {Array} Array of cell keys for the neighboring cells
     */
    getNeighborCells(cellX, cellY) {
        // Return the keys of all 8 adjacent cells
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                // Skip the cell itself
                if (dx === 0 && dy === 0) continue;
                
                neighbors.push(`${cellX + dx},${cellY + dy}`);
            }
        }
        return neighbors;
    }
    
    /**
     * Check for collisions between a dashing player and enemies
     * @param {Array} enemies - Array of enemy objects
     */
    checkDashDamageCollisions(enemies) {
        if (!this.player.isDashing || !enemies || enemies.length === 0) return;
        
        // The player's collision box during a dash
        const playerDashHitboxSize = this.player.width * 1.2; // Slightly larger hitbox during dash
        
        // Check all enemies
        for (const enemy of enemies) {
            if (!enemy.active || enemy.dying) continue;
            
            // Skip enemies we already hit during this dash
            if (this.player.hasDealtDashDamage.has(enemy)) continue;
            
            // Simple circle collision detection for dash damage
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (playerDashHitboxSize / 2) + (enemy.width / 2)) {
                // Dash collision detected!
                enemy.takeDamage(this.player.dashDamage, this.effects);
                
                // Apply knockback in the direction the player is dashing
                // The knockback direction is the same as the dash direction
                enemy.applyKnockback(this.player.dashDirection, 1.5);
                
                // Add visual and audio feedback for dash hit
                this.camera.shake(3, 150); // Smaller shake effect
                
                // Create particle effect for dash hit
                this.effects.createEnemyHitEffect(
                    enemy.x, enemy.y,
                    this.player.x, this.player.y,
                    this.player.dashDamage,
                    true // Treat dash hits as critical for better visual feedback
                );
                
                // Play dash hit sound
                if (window.audioManager) {
                    window.audioManager.playDashHitSound();
                }
                
                // Track this enemy as hit during this dash to prevent multiple hits
                this.player.hasDealtDashDamage.add(enemy);
            }
        }
    }
    
    /**
     * New method to handle transition from starting room to main game
     * @param {Object} exitInfo - Information about the exit
     */
    transitionToMainGame(exitInfo) {
        console.log("Transitioning from starting room to main game!");
        
        // Apply special transition effects
        this.camera.shake(10, 500);
        this.camera.zoomTo(1.2); // Zoom out
        this.effects.createScreenFlash('#ffffff', 0.7); // Bright flash
        
        // Set cooldown to prevent immediate transitions
        this.doorTransitionCooldown = 1000;
        
        // Play transition sound if available
        if (window.audioManager) {
            window.audioManager.playGameStartSound();
        }
        
        // Change game state
        this.gameState = 'playing';
        
        // Create the first room of the main game using stored data
        const roomData = this.mainGameStartData.roomData;
        this.currentRoom = new Room(this.width, this.height, {
            obstacles: roomData.obstacles,
            template: roomData.template,
            enemies: roomData.enemies,
            items: roomData.items,
            difficulty: roomData.difficulty || 1,
            physics: this.physics,
            procGen: this.generator
        });
        
        // Set current room ID
        this.currentRoomId = this.mainGameStartData.roomId;
        
        // Set effects in the new room
        this.currentRoom.effects = this.effects;
        
        // Position player at the entry point based on exit direction
        const entryPoint = exitInfo.entryPoint;
        const entryPosition = this.currentRoom.getEntryPosition(entryPoint);
        this.player.x = entryPosition.x;
        this.player.y = entryPosition.y;
        
        // Reset player trail history
        this.prevPlayerX = this.player.x;
        this.prevPlayerY = this.player.y;
        
        // Reset player velocity
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        
        // Update camera immediately
        this.camera.jumpTo(this.player.x, this.player.y);
        setTimeout(() => {
            this.camera.zoomTo(1.0, 800); // Return to normal zoom with duration
        }, 300);
        
        // Start playing a random background track
        this.audioManager.playRandomBackground();
        
        console.log("Transitioned to main game successfully");
    }

    /**
     * Restart the game after player death - complete reinitialization
     */
    restartGame() {
        console.log("Completely restarting game from scratch...");
        
        // Stop the current game loop
        this.running = false;
        cancelAnimationFrame(this._animFrameId);
        
        // Reset core game properties similar to the constructor
        this.score = 0;
        this.waveCounter = 0;
        this.lastTimestamp = performance.now();
        this.gameStartTime = Date.now();
        
        // Initialize the effects manager first
        this.effects = new EffectsManager(300); // Allow up to 300 particles
        
        // Create the player in the center of the screen
        this.player = new Player(this.width / 2, this.height / 2);
        this.player.effects = this.effects;
        this.player.visible = false; // Initially set player to invisible until materialization completes
        
        // Important: pass 'this' to StartingRoom constructor instead of dimensions
        this.currentRoom = new StartingRoom(this);
        
        // Reset camera completely
        this.camera.reset();
        this.camera.target = this.player;
        
        // Reset UI elements
        this.selectedMenuItem = 0;
        this.menuOpen = false;
        
        // Create player reconstitution effect before camera animation
        this.createPlayerMaterializationEffect();
        
        // Fade in music
        if (window.audioManager) {
            window.audioManager.fadeInBackgroundMusic(2000);
        }
        
        // Enhanced camera animation sequence for restart
        // Start with zoom out and shake
        this.camera.shake(25, 400); // Increased intensity and duration
        this.camera.zoomTo(0.7, 300); // Zoom out
        
        // After initial shake, do a smooth zoom transition sequence
        setTimeout(() => {
            this.camera.shake(15, 250); // Additional shake during zoom in
            this.camera.zoomTo(1.2, 400); // Overshoot zoom in
            
            setTimeout(() => {
                this.camera.shake(10, 200); // More shake during pullback
                this.camera.zoomTo(0.9, 250); // Quick pull back
                
                setTimeout(() => {
                    this.camera.shake(5, 150); // Subtle shake during final settle
                    this.camera.zoomTo(1.0, 350); // Settle to normal
                    
                    // Add a subtle final shake for emphasis
                    setTimeout(() => {
                        this.camera.shake(8, 300);
                    }, 350);
                    
                }, 250);
            }, 400);
        }, 300);
        
        // Reset input state (don't use resetState as it doesn't exist)
        if (this.inputHandler) {
            // Clear any pressed keys
            this.inputHandler.keys = {};
            this.inputHandler.mousePosition = { x: 0, y: 0 };
            this.inputHandler.mouseDown = false;
        }
        
        // Reset all collections
        this.projectiles = [];
        this.particles = [];
        this.powerUps = [];
        
        // Set game state back to 'playing'
        this.gameState = 'playing';
        
        // Restart the game loop
        this.running = true;
        this.lastTimestamp = performance.now();
        this._animFrameId = requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Handle special keyboard inputs for the game
     */
    handleKeyboardInput() {
        // Handle P key for test projectiles or other debug features
        if (this.inputHandler.keys['p'] || this.inputHandler.keys['P']) {
            // Reset key state to prevent continuous firing
            this.inputHandler.keys['p'] = false;
            this.inputHandler.keys['P'] = false;
            
            // Call room's key handler with player parameter
            if (this.currentRoom && typeof this.currentRoom.handleKeyDown === 'function') {
                this.currentRoom.handleKeyDown({key: 'P'}, this.player);
                console.log("DEBUG: P key pressed - firing test projectiles");
            }
        }
        
        // Handle Enter key for portal interaction
        if (this.inputHandler.keys['Enter']) {
            // Reset key state to prevent continuous firing
            this.inputHandler.keys['Enter'] = false;
            
            // Call room's key handler with player parameter
            if (this.currentRoom && typeof this.currentRoom.handleKeyDown === 'function') {
                this.currentRoom.handleKeyDown({key: 'Enter'}, this.player);
                console.log("DEBUG: Enter key pressed - checking portal interaction");
            }
        }
    }
    
    /**
     * Check for door transitions
     */
    checkDoorTransitions() {
        if (this.doorTransitionCooldown > 0) {
            return;
        }

        const exitInfo = this.currentRoom.checkExit(this.player);
        
        if (exitInfo) {
            console.log(`Exit detected: ${JSON.stringify(exitInfo)}`);
            
            // Check if this is the starting room transition to main game
            if (this.gameState === 'starting' && exitInfo.targetRoom === 'main_game') {
                this.transitionToMainGame(exitInfo);
                return;
            }
            
            // Handle normal room transitions for the main game
            this.handleRoomTransition(exitInfo);
        }
    }
    
    /**
     * Handle room transitions
     * @param {Object} exitInfo - Information about the exit
     */
    handleRoomTransition(exitInfo) {
        console.log(`Exiting room ${this.currentRoomId} through door ${exitInfo.doorIndex}`);
        
        // Set cooldown to prevent rapid transitions
        this.doorTransitionCooldown = 1000; // 1 second cooldown
        
        // Store the current door index as the entry door for the new room
        this.lastEntryDoorIndex = exitInfo.doorIndex;
        
        // Get the direction for the door
        // Door indices: 0 = north, 1 = east, 2 = south, 3 = west
        
        // Find the connected room in this direction from current room
        const connections = this.dungeon.connections[this.currentRoomId] || {};
        
        // Create player stats object for balanced item generation
        const playerStats = {
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            ammo: this.player.ammo,
            maxAmmo: this.player.maxAmmo
        };
        
        if (connections[exitInfo.doorIndex] !== undefined) {
            // Connected room exists in this direction
            const nextRoomId = connections[exitInfo.doorIndex];
            console.log(`Found connected room ${nextRoomId} in direction ${exitInfo.doorIndex} from room ${this.currentRoomId}`);
            
            // Update current room ID
            this.currentRoomId = nextRoomId;
            
            // Get the room data from the dungeon
            const roomData = this.dungeon.rooms[nextRoomId];
            
            // Check if we need to add a guaranteed item
            if (!roomData.items || roomData.items.length === 0) {
                console.log("No items in connected room, adding a guaranteed item");
                
                // Generate items with player stats for balanced distribution
                roomData.items = [];
                this.generator.generateItems(roomData, roomData.difficulty || this.getCurrentDifficulty(), playerStats);
            }
            
            // Increment the rooms cleared counter
            if (!this.visitedRooms) {
                this.visitedRooms = new Set();
            }
            
            // Only increment if we haven't visited this room before
            if (!this.visitedRooms.has(nextRoomId)) {
                this.roomsCleared++;
                this.visitedRooms.add(nextRoomId);
            }
            
            // Create a new Room instance with the connected room data
            this.currentRoom = new Room(this.width, this.height, {
                obstacles: roomData.obstacles,
                template: roomData.template,
                enemies: roomData.enemies,
                items: roomData.items,
                difficulty: roomData.difficulty || this.getCurrentDifficulty()
            });
            
            // Regular room transition effects
            this.camera.pulseZoom(0.2, 500);
            this.camera.shake(10, 500);
            
            // Create room transition effect
            this.effects.createRoomTransitionEffect(
                this.currentRoom.width, 
                this.currentRoom.height, 
                this.player.x, 
                this.player.y
            );
            
            // Reset player position based on entry door (opposite of the door they exited through)
            this.resetPlayerPositionForNewRoom(exitInfo.doorIndex);
            
            // Clear the player's projectiles when entering a new room
            this.player.projectiles = [];
            
            // Reset dash damage tracking for new room
            if (this.player.hasDealtDashDamage) {
                this.player.hasDealtDashDamage.clear();
            }
            
            // Reset collision grid for the new room
            this.collisionGrid = this.buildCollisionGrid();
            
            console.log(`Transitioned to connected room ${nextRoomId}`);
        } else {
            // Fallback to legacy random room generation if no connected room exists
            console.warn(`No connected room found in direction ${exitInfo.doorIndex}, falling back to random generation`);
            
            // Get current difficulty level 
            const difficulty = this.getCurrentDifficulty();
            console.log(`Creating new random room with difficulty: ${difficulty}, rooms cleared: ${this.roomsCleared}`);
            
            // Calculate where the player will enter the new room BEFORE generating the room
            // The entry door is opposite to the exit door
            const entryDoorIndex = (exitInfo.doorIndex + 2) % 4;
            let playerEntryX = this.width / 2;  // default to center
            let playerEntryY = this.height / 2; // default to center
            
            // Set player entry position based on which door they're entering from
            const offsetDistance = 80; // pixels to offset from door center
            
            // The room doesn't exist yet, so we need to calculate the door positions
            const wallThickness = 20; // Match the Room class wall thickness
            const doorWidth = 100;    // Match the Room class door width
            
            switch (entryDoorIndex) {
                case 0: // Entering from top
                    playerEntryX = this.width / 2;
                    playerEntryY = wallThickness + offsetDistance;
                    break;
                case 1: // Entering from right
                    playerEntryX = this.width - wallThickness - offsetDistance;
                    playerEntryY = this.height / 2;
                    break;
                case 2: // Entering from bottom
                    playerEntryX = this.width / 2;
                    playerEntryY = this.height - wallThickness - offsetDistance;
                    break;
                case 3: // Entering from left
                    playerEntryX = wallThickness + offsetDistance;
                    playerEntryY = this.height / 2;
                    break;
            }
            
            console.log(`Player will enter at position: (${playerEntryX}, ${playerEntryY})`);
            
            // Generate room configuration with base structure and components
            const roomData = this.generator.generateRoom(this.width, this.height, difficulty, playerEntryX, playerEntryY);
            
            // We've already generated items, but now regenerate with player stats
            // This ensures balanced item distribution based on player health and ammo
            roomData.items = [];
            this.generator.generateItems(roomData, difficulty, playerStats);
            
            console.log(`Room data generated:`, 
                `Template: ${roomData.template}`,
                `Obstacles: ${roomData.obstacles ? roomData.obstacles.length : 0}`,
                `Enemies: ${roomData.enemies ? roomData.enemies.length : 0}`,
                `Items: ${roomData.items ? roomData.items.length : 0}`
            );
            
            // Create a new Room instance with the generated data
            this.currentRoom = new Room(this.width, this.height, {
                obstacles: roomData.obstacles,
                template: roomData.template,
                enemies: roomData.enemies,
                items: roomData.items,
                difficulty: difficulty
            });
            
            // Add a camera transition effect
            this.camera.pulseZoom(0.2, 500);
            this.camera.shake(10, 500);
            
            // Reset player position based on entry door
            this.resetPlayerPositionForNewRoom(exitInfo.doorIndex);
            
            // Clear the player's projectiles when entering a new room
            this.player.projectiles = [];
            
            // Reset dash damage tracking for new room
            if (this.player.hasDealtDashDamage) {
                this.player.hasDealtDashDamage.clear();
            }
            
            // Reset collision grid for the new room
            this.collisionGrid = this.buildCollisionGrid();
            
            // Create room transition effect
            this.effects.createRoomTransitionEffect(
                this.currentRoom.width, 
                this.currentRoom.height, 
                this.player.x, 
                this.player.y
            );
            
            // Force enemy spawning if no enemies were created
            if (!this.currentRoom.enemies || this.currentRoom.enemies.length === 0) {
                console.warn("No enemies were created during room generation. Forcing enemy spawning.");
                this.currentRoom.spawnEnemies(3 + Math.floor(difficulty));
            } else {
                console.log(`Room created with ${this.currentRoom.enemies.length} enemies`);
            }
        }
    }
    
    /**
     * Handle player boundary collisions with room walls
     */
    handlePlayerBoundaryCollisions() {
        if (this.currentRoom) {
            this.currentRoom.handleBoundaryCollisions(this.player);
        }
    }
    
    /**
     * Process player-enemy collisions
     */
    processPlayerEnemyCollisions() {
        if (this.player.isDead) return; // Skip if player is dead
        
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = this.player.radius;

        this.currentRoom.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            const enemyX = enemy.x;
            const enemyY = enemy.y;
            const enemyRadius = enemy.radius || 15; // Default to 15 if not specified
            
            const dx = playerX - enemyX;
            const dy = playerY - enemyY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < playerRadius + enemyRadius) {
                // If player is dashing and has not dealt dash damage to this enemy
                if (this.player.isDashing && !this.player.hasDealtDashDamage.has(enemy.id)) {
                    // Player damages enemy when dashing
                    enemy.takeDamage(this.player.dashDamage, this.effects);
                    this.player.hasDealtDashDamage.add(enemy.id);
                } else if (!this.player.isDashing) {
                    // Enemy damages player when not dashing
                    if (this.player.takeDamage(10)) { // Apply 10 damage to player
                        // Camera shake effect when player takes damage
                        this.camera.shake(10, 150); // intensity, duration
                    }
                    
                    // Simple knockback effect
                    const knockbackForce = 5;
                    const knockbackX = (dx / distance) * knockbackForce;
                    const knockbackY = (dy / distance) * knockbackForce;
                    
                    // Apply knockback to player position directly
                    this.player.x += knockbackX;
                    this.player.y += knockbackY;
                }
            }
        });
    }
    
    /**
     * Creates a dramatic particle effect when the player is reconstituted
     * @deprecated Use createPlayerMaterializationEffect instead
     */
    createPlayerReconstitutionEffect() {
        // For backwards compatibility, just call the newer method
        this.createPlayerMaterializationEffect();
    }
    
    /**
     * Creates a materialization effect for the player at game startup
     * This adds visual flair and helps initialize audio system immediately
     */
    createPlayerMaterializationEffect() {
        if (!this.player) return;
        
        console.log('Creating player materialization effect');
        
        // Force audio context to resume immediately
        if (window.audioManager) {
            // Try resuming and playing a silent sound to unlock audio
            try {
                const context = window.audioManager.context;
                if (context) {
                    console.log('Audio context state:', context.state);
                    context.resume().then(() => console.log('Audio context resumed successfully'));
                    
                    // Create a silent oscillator to unlock audio on Safari/iOS
                    const silentOsc = context.createOscillator();
                    const silentGain = context.createGain();
                    silentGain.gain.value = 0.001;
                    silentOsc.connect(silentGain);
                    silentGain.connect(context.destination);
                    silentOsc.start();
                    silentOsc.stop(context.currentTime + 0.1);
                }
            } catch (e) {
                console.warn('Error trying to unlock audio:', e);
            }
        }
        
        // Player's current position
        const centerX = this.player.x;
        const centerY = this.player.y;
        
        // Ensure player is initially invisible
        this.player.visible = false;
        
        // Initial camera effect to indicate something is about to happen
        if (this.camera) {
            this.camera.zoomTo(0.9, 300); // Slight zoom out in anticipation
        }
        
        // Create pre-materialization particle effect
        if (this.effects) {
            // Small energy gathering particles
            this.effects.createParticleBurst(
                centerX, 
                centerY,
                15, // Number of particles
                {
                    color: ['#00ffff', '#33ffff', '#66ffff', '#ffffff'], // Cyan to white
                    minSpeed: 20,
                    maxSpeed: 50,
                    minLifetime: 0.5,
                    maxLifetime: 1.0,
                    minSize: 1,
                    maxSize: 3,
                    gravity: -50 // Particles float upward slightly
                }
            );
        }
        
        // First phase - energy gathering (sound only)
        if (window.audioManager) {
            console.log('Initiating materialization sound sequence - phase 1');
            // Play a subtle charging sound if available
            try {
                const context = window.audioManager.context;
                if (context) {
                    // Create a rising tone
                    const osc = context.createOscillator();
                    const gain = context.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(100, context.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(400, context.currentTime + 0.9);
                    
                    gain.gain.setValueAtTime(0, context.currentTime);
                    gain.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.3);
                    gain.gain.linearRampToValueAtTime(0.05, context.currentTime + 0.9);
                    
                    osc.connect(gain);
                    gain.connect(window.audioManager.masterGain);
                    
                    osc.start();
                    osc.stop(context.currentTime + 0.9);
                }
            } catch (e) {
                console.warn('Error creating pre-materialization sound:', e);
            }
        }
        
        // Second phase - materialization flash (after delay)
        setTimeout(() => {
            // Create main materialization flash effect
            if (this.effects) {
                this.effects.createParticleBurst(
                    centerX, 
                    centerY,
                    25, // More particles for the main effect
                    {
                        color: ['#ffffff', '#ccffff', '#99ffff', '#66ffff'], // White to cyan
                        minSpeed: 100,
                        maxSpeed: 250,
                        minLifetime: 0.3,
                        maxLifetime: 0.8,
                        minSize: 2,
                        maxSize: 6
                    }
                );
            }
            
            // Camera zoom effect for the flash
            if (this.camera) {
                this.camera.zoomTo(1.1, 200); // Quick zoom in for impact
            }
            
            // Make player visible with flash
            this.player.visible = true;
            
            // Play the materialization thud sound for impact
            if (window.audioManager) {
                console.log('Materialization sound sequence - phase 2 (thud)');
                window.audioManager.playMaterializationThudSound();
            }
            
            // Third phase - final impact boom (after short delay)
            setTimeout(() => {
                console.log('Materialization sound sequence - phase 3 (boom)');
                
                // Camera shake for materialization impact
                if (this.camera) {
                    this.camera.shake(12, 400);
                }
                
                // Create a direct boom sound
                if (window.audioManager) {
                    try {
                        const context = window.audioManager.context;
                        if (context) {
                            // Create a powerful low frequency sound
                            const osc = context.createOscillator();
                            const gain = context.createGain();
                            
                            osc.type = 'sine';
                            osc.frequency.value = 35; // Very low frequency
                            
                            gain.gain.setValueAtTime(0, context.currentTime);
                            gain.gain.linearRampToValueAtTime(0.9, context.currentTime + 0.02);
                            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.2);
                            
                            osc.connect(gain);
                            gain.connect(window.audioManager.masterGain);
                            
                            osc.start();
                            osc.stop(context.currentTime + 1.2);
                            
                            // Clean up
                            setTimeout(() => {
                                try {
                                    osc.disconnect();
                                    gain.disconnect();
                                } catch (e) {
                                    console.warn('Error cleaning up boom sound:', e);
                                }
                            }, 1500);
                        }
                    } catch (e) {
                        console.warn('Error creating boom sound:', e);
                    }
                }
                
                // Fourth phase - settling effect
                setTimeout(() => {
                    // Final camera adjustment to normal
                    if (this.camera) {
                        this.camera.zoomTo(1.0, 350); // Settle to normal zoom
                    }
                    
                    // Ensure player is fully visible
                    this.player.visible = true;
                    
                    // Small particle effect for "dust settling"
                    if (this.effects) {
                        this.effects.createParticleBurst(
                            centerX, 
                            centerY,
                            10, // Just a few particles
                            {
                                color: ['#33ffff', '#66ffff'], // Cyan variants
                                minSpeed: 20,
                                maxSpeed: 60,
                                minLifetime: 0.5,
                                maxLifetime: 1.2,
                                minSize: 1,
                                maxSize: 3,
                                gravity: 20 // Light downward effect
                            }
                        );
                    }
                }, 400);
                
            }, 200); // Delay between visibility and boom
            
        }, 800); // Initial delay before materialization
    }
}
