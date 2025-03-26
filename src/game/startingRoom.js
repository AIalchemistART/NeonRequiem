// startingRoom.js - Self-contained starting room with menu functionality
import { Physics } from './physics.js';
import { createVibePortal } from './vibePortal.js';

export class StartingRoom {
    constructor(game) {
        this.game = game;
        this.width = game.width;
        this.height = game.height;
        this.wallThickness = 20;
        this.doorWidth = 100;
        this.doorHeight = this.wallThickness;
        this.wallColor = '#3a1a5a'; // Dark purple for walls
        this.unlockedDoorColor = '#33ff77'; // Bright green for the start door
        this.obstacleColor = '#8800ff'; // Neon purple for obstacles
        
        this.physics = game.physics || new Physics();
        this.effects = game.effects;
        
        // Flag to identify this as the starting room
        this.isStartingRoom = true;
        
        // Initialize only a right-side door (east)
        this.initDoors();
        
        // No enemies in starting room
        this.enemies = [];
        
        // No obstacles for now
        this.obstacles = [];
        
        // No items
        this.items = [];
        
        // This room is always considered "cleared" to keep door unlocked
        this.cleared = true;
        this.doorsOpen = true;
        
        // Title and instruction text
        this.title = "NEON REQUIEM";
        this.instructions = [
            "WASD / Arrow Keys: Move",
            "Mouse: Aim & Shoot",
            "Shift / Space: Dash",
            "P: Pause Game",
        ];
        
        // Create Vibeverse portal if portal parameter is in URL
        this.vibePortal = null;
        if (new URLSearchParams(window.location.search).get('portal')) {
            // Create entry portal if we came from another portal
            this.vibePortal = createVibePortal('entry', 
                this.wallThickness + 80, // Left side of room, moved 20 units to the right
                this.height / 2, // Middle of room height
                {
                    destinationUrl: this.getRefUrl(),
                    label: 'RETURN PORTAL',
                    showInteractionHint: false // Disable the "Press ENTER" hint text
                }
            );
        }
        
        // Always create exit portal to Vibeverse
        this.exitPortal = createVibePortal('exit',
            this.wallThickness + 80, // Left side of room, moved 20 units to the right
            this.height / 2 + 150, // Lower middle of room height
            {
                destinationUrl: 'https://portal.pieter.com',
                label: 'VIBEVERSE PORTAL'
                // showInteractionHint is true by default
            }
        );
        
        // Add demo powerup items in safe locations
        this.spawnStartingItems();
    }
    
    /**
     * Initialize door for the room (only right/east door)
     */
    initDoors() {
        // Define only the right door
        this.doors = [
            // Right door (east)
            {
                x: this.width - this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.doorWidth,
                locked: false // Never locked in starting room
            }
        ];
    }
    
    /**
     * Update method - simplified compared to regular room
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} player - The player object
     */
    update(deltaTime, player) {
        // No need to update enemies or check for clears
        // This is mostly a static room with minimal logic
        
        // Update Vibeverse portals
        if (this.vibePortal) {
            this.vibePortal.update(deltaTime);
            
            // Check if player is near the portal
            this.vibePortal.checkCollision(player);
            // Portal activation moved to handleKeyDown
        }
        
        if (this.exitPortal) {
            this.exitPortal.update(deltaTime);
            
            // Check if player is near the portal
            this.exitPortal.checkCollision(player);
            // Portal activation moved to handleKeyDown
        }
        
        // Create subtle ambient particles if effects are available
        if (this.effects && typeof this.effects.createParticle === 'function') {
            if (Math.random() < 0.05) { // Occasional particle
                const x = Math.random() * this.width;
                const y = Math.random() * this.height;
                
                this.effects.createParticle(
                    x, y,
                    0, -20, // Slow upward drift
                    Math.random() * 3 + 1, // Size
                    ['#ff00ff', '#00ffff', '#33ff77'][Math.floor(Math.random() * 3)], // Random neon color
                    Math.random() * 3 + 2 // Longer lifetime for ambience
                );
            }
        }
    }
    
    /**
     * Check if player is touching the door, returns door index or -1
     * @param {Object} player - The player object 
     * @returns {number} Door index or -1 if not at door
     */
    checkDoorCollision(player) {
        // Only have one door (index 0)
        const door = this.doors[0];
        
        // Calculate player center point
        const playerCenterX = player.x;
        const playerCenterY = player.y;
        
        // Calculate door bounds with padding for better detection
        const padding = 10; // pixels
        const doorLeft = door.x - door.width / 2 - padding;
        const doorRight = door.x + door.width / 2 + padding;
        const doorTop = door.y - door.height / 2 - padding;
        const doorBottom = door.y + door.height / 2 + padding;
        
        // Check if player overlaps with door
        const playerHalfWidth = player.width / 2;
        const playerHalfHeight = player.height / 2;
        
        if (playerCenterX + playerHalfWidth > doorLeft &&
            playerCenterX - playerHalfWidth < doorRight &&
            playerCenterY + playerHalfHeight > doorTop &&
            playerCenterY - playerHalfHeight < doorBottom) {
            
            console.log(`Player at starting room exit door`);
            
            // Play sound if available
            if (window.audioManager) {
                window.audioManager.playDoorUnlockSound(0);
            }
            
            return 0; // Return the door index (only one door)
        }
        
        return -1; // No collision
    }
    
    /**
     * Check if player is exiting the room and return exit info
     * @param {Object} player - The player object
     * @returns {Object|null} Exit info or null if not exiting
     */
    checkExit(player) {
        const doorIndex = this.checkDoorCollision(player);
        
        if (doorIndex !== -1) {
            // Player is touching the door, prepare to transition to main game
            return {
                direction: 'east',
                targetRoom: 'main_game', // Special target indicating transition to main game
                entryPoint: 'west'      // Player will enter main game from the west
            };
        }
        
        // Check for portal collisions - portal navigation is handled in update()
        
        return null; // No exit
    }
    
    /**
     * Handle boundary collisions for player
     * @param {Object} player - The player object
     */
    handleBoundaryCollisions(player) {
        // Get walls excluding the door
        const walls = this.getWalls();
        
        // Special handling for dash attempts that would pass through walls
        if (player.isDashing) {
            // Calculate the player's potential next position based on dash
            const nextX = player.x + player.dashDirection.x * player.dashSpeed * 0.03; // Predict next frame position
            const nextY = player.y + player.dashDirection.y * player.dashSpeed * 0.03;
            
            // Create a test player hitbox for collision prediction
            const testPlayer = {
                x: nextX,
                y: nextY,
                width: player.width,
                height: player.height,
                radius: player.radius
            };
            
            // Check if the predicted position would result in a wall collision
            for (const wall of walls) {
                const atDoor = this.isWallAtDoor(wall);
                
                // Skip collision check if at unlocked door
                if (atDoor) {
                    continue;
                }
                
                // Check if the predicted dash position would hit a wall
                if (this.physics.checkCollision(testPlayer, wall)) {
                    // Find the closest safe position to the wall
                    this.resolveUltraStrongWallCollision(player, wall);
                    
                    // If player was dashing, reset velocity to prevent pass-through
                    if (player.velocityX !== 0 || player.velocityY !== 0) {
                        const vMag = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY);
                        const wallNormal = this.calculateWallNormal(player, wall);
                        
                        // Apply wall friction to reduce speed in the normal direction
                        const dotProduct = player.velocityX * wallNormal.x + player.velocityY * wallNormal.y;
                        player.velocityX -= wallNormal.x * dotProduct;
                        player.velocityY -= wallNormal.y * dotProduct;
                    }
                    
                    // Continue the dash parallel to the wall if applicable
                    if (player.isDashing) {
                        const wallNormal = this.calculateWallNormal(player, wall);
                        
                        // Calculate the component of dash direction parallel to the wall
                        const dotProduct = player.dashDirection.x * wallNormal.x + player.dashDirection.y * wallNormal.y;
                        player.dashDirection.x -= wallNormal.x * dotProduct;
                        player.dashDirection.y -= wallNormal.y * dotProduct;
                        
                        // Normalize the new dash direction
                        const magnitude = Math.sqrt(player.dashDirection.x * player.dashDirection.x + player.dashDirection.y * player.dashDirection.y);
                        if (magnitude > 0) {
                            player.dashDirection.x /= magnitude;
                            player.dashDirection.y /= magnitude;
                        }
                    }
                }
            }
        }
        
        // Standard collision handling
        for (const wall of walls) {
            const atDoor = this.isWallAtDoor(wall);
            
            // Skip collision check if at unlocked door
            if (atDoor) {
                continue;
            }
            
            // Enhanced collision detection
            if (this.physics.checkCollision(player, wall)) {
                this.resolveUltraStrongWallCollision(player, wall);
            }
        }
    }
    
    /**
     * Calculate wall normal vector for a collision
     * @param {Object} player - The player object
     * @param {Object} wall - The wall object
     * @returns {Object} Normalized wall normal vector {x, y}
     */
    calculateWallNormal(player, wall) {
        // Determine which side of the wall the player is hitting
        const playerCenter = { x: player.x, y: player.y };
        const wallCenter = { 
            x: wall.x + wall.width / 2, 
            y: wall.y + wall.height / 2 
        };
        
        // Vector from wall to player
        const dx = playerCenter.x - wallCenter.x;
        const dy = playerCenter.y - wallCenter.y;
        
        // Determine the primary collision axis based on wall shape
        let normalX = 0;
        let normalY = 0;
        
        if (wall.width > wall.height) {
            // Horizontal wall - normal is primarily vertical
            normalY = dy > 0 ? 1 : -1;
        } else if (wall.height > wall.width) {
            // Vertical wall - normal is primarily horizontal
            normalX = dx > 0 ? 1 : -1;
        } else {
            // Square wall - determine based on approach angle
            if (Math.abs(dx) > Math.abs(dy)) {
                normalX = dx > 0 ? 1 : -1;
            } else {
                normalY = dy > 0 ? 1 : -1;
            }
        }
        
        // Normalize the normal vector
        const magnitude = Math.sqrt(normalX * normalX + normalY * normalY);
        return {
            x: normalX / magnitude,
            y: normalY / magnitude
        };
    }
    
    /**
     * Resolve collision with ultra-strong walls that block dashing
     * @param {Object} player - The player object
     * @param {Object} wall - The wall to resolve collision with
     */
    resolveUltraStrongWallCollision(player, wall) {
        // Use physics engine for basic collision resolution
        this.physics.resolveCollision(player, wall);
        
        // Additional safety margin to keep player away from wall
        const safetyMargin = 2;
        const wallNormal = this.calculateWallNormal(player, wall);
        
        // Apply additional push based on wall normal
        player.x += wallNormal.x * safetyMargin;
        player.y += wallNormal.y * safetyMargin;
    }
    
    /**
     * Is this wall segment at a door location?
     * @param {Object} wall - Wall segment to check
     * @returns {boolean} True if wall is at door location
     */
    isWallAtDoor(wall) {
        // Only one door to check (right/east wall)
        const door = this.doors[0];
        
        // Check if wall overlaps with door
        // For right wall, door is on the right
        if (wall.x > this.width - this.wallThickness * 2) {
            // Right wall
            if (wall.y + wall.height > door.y - door.height / 2 &&
                wall.y < door.y + door.height / 2) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get wall boundaries for collision detection
     * @returns {Array} Array of wall objects
     */
    getWalls() {
        // Return walls with gaps for doors
        const walls = [];
        
        // Wall collision padding to prevent dash-through
        const collisionPadding = 15; // Extra padding for collision boundaries
        
        // Top wall (no door)
        walls.push({
            x: 0,
            y: -collisionPadding,  // Extended outside visible area
            width: this.width,
            height: this.wallThickness + collisionPadding,
            isCollisionOnly: true
        });
        
        // Bottom wall (no door)
        walls.push({
            x: 0,
            y: this.height - this.wallThickness,
            width: this.width,
            height: this.wallThickness + collisionPadding,
            isCollisionOnly: true
        });
        
        // Left wall (no door)
        walls.push({
            x: -collisionPadding,  // Extended outside visible area
            y: 0,
            width: this.wallThickness + collisionPadding,
            height: this.height,
            isCollisionOnly: true
        });
        
        // Right wall - top segment (above door)
        walls.push({
            x: this.width - this.wallThickness,
            y: 0,
            width: this.wallThickness + collisionPadding,
            height: this.height / 2 - this.doorWidth / 2,
            isCollisionOnly: true
        });
        
        // Right wall - bottom segment (below door)
        walls.push({
            x: this.width - this.wallThickness,
            y: this.height / 2 + this.doorWidth / 2,
            width: this.wallThickness + collisionPadding,
            height: this.height / 2 - this.doorWidth / 2,
            isCollisionOnly: true
        });
        
        return walls;
    }
    
    /**
     * Spawn items in the starting room, ensuring they're in open areas
     */
    spawnStartingItems() {
        // Define item types similar to the procedural generator
        const itemTypes = {
            health: { color: '#ff0000', radius: 10, effect: 'restoreHealth' },
            speedBoost: { color: '#00ffff', radius: 8, effect: 'increaseSpeed' },
            shield: { color: '#ffff00', radius: 12, effect: 'addShield' },
            ammo: { color: '#00ff00', radius: 8, effect: 'addAmmo' }
        };
        
        // Create one of each item type for demonstration
        const itemsToCreate = [
            { type: 'health', offsetX: -120, offsetY: -80 },
            { type: 'speedBoost', offsetX: -120, offsetY: 80 },
            { type: 'shield', offsetX: 0, offsetY: 0 },
            { type: 'ammo', offsetX: 120, offsetY: -80 }
        ];
        
        // Place items in safe positions based on center of room
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        for (const itemConfig of itemsToCreate) {
            const itemInfo = itemTypes[itemConfig.type];
            
            // Try to find a valid position
            const position = this.findSafeItemPosition(
                centerX + itemConfig.offsetX,
                centerY + itemConfig.offsetY,
                itemInfo.radius
            );
            
            if (position) {
                this.items.push({
                    x: position.x,
                    y: position.y,
                    type: itemConfig.type,
                    color: itemInfo.color,
                    radius: itemInfo.radius,
                    effect: itemInfo.effect,
                    active: true
                });
            }
        }
    }
    
    /**
     * Find a safe position for an item, away from walls and obstacles
     * @param {number} preferredX - Preferred X position
     * @param {number} preferredY - Preferred Y position
     * @param {number} itemRadius - Radius of the item
     * @returns {Object|null} Safe position {x, y} or null if no position found
     */
    findSafeItemPosition(preferredX, preferredY, itemRadius) {
        // Wall safety margins
        const wallMargin = this.wallThickness + itemRadius + 10;
        
        // Bounds for valid item placement
        const minX = wallMargin;
        const maxX = this.width - wallMargin;
        const minY = wallMargin;
        const maxY = this.height - wallMargin;
        
        // Check if the preferred position is valid
        if (preferredX >= minX && preferredX <= maxX && 
            preferredY >= minY && preferredY <= maxY) {
            // Check all walls, including the door area
            const walls = this.getWalls();
            
            // Create a test item for collision checks
            const testItem = { 
                x: preferredX, 
                y: preferredY, 
                radius: itemRadius 
            };
            
            // Check if item would collide with any wall
            let collides = false;
            for (const wall of walls) {
                if (this.physics.checkCollision(testItem, wall)) {
                    collides = true;
                    break;
                }
            }
            
            // Check if item would collide with any obstacle
            for (const obstacle of this.obstacles) {
                if (this.physics.checkCollision(testItem, obstacle)) {
                    collides = true;
                    break;
                }
            }
            
            // If no collisions, this position is valid
            if (!collides) {
                return { x: preferredX, y: preferredY };
            }
        }
        
        // If the preferred position is not valid, try to find an alternative
        // Try a spiral pattern to find a valid position
        const spiralStep = 20;
        const maxSpirals = 10;
        
        for (let spiral = 1; spiral <= maxSpirals; spiral++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const offsetX = Math.cos(angle) * spiral * spiralStep;
                const offsetY = Math.sin(angle) * spiral * spiralStep;
                
                const newX = preferredX + offsetX;
                const newY = preferredY + offsetY;
                
                // Check if the new position is within bounds
                if (newX >= minX && newX <= maxX && newY >= minY && newY <= maxY) {
                    // Create a test item for collision checks
                    const testItem = { 
                        x: newX, 
                        y: newY, 
                        radius: itemRadius 
                    };
                    
                    // Check if item would collide with any wall
                    let collides = false;
                    const walls = this.getWalls();
                    for (const wall of walls) {
                        if (this.physics.checkCollision(testItem, wall)) {
                            collides = true;
                            break;
                        }
                    }
                    
                    // Check if item would collide with any obstacle
                    for (const obstacle of this.obstacles) {
                        if (this.physics.checkCollision(testItem, obstacle)) {
                            collides = true;
                            break;
                        }
                    }
                    
                    // If no collisions, this position is valid
                    if (!collides) {
                        return { x: newX, y: newY };
                    }
                }
            }
        }
        
        // No valid position found
        return null;
    }
    
    /**
     * Render the starting room
     * @param {Object} renderer - The renderer object
     */
    render(renderer) {
        const ctx = renderer.ctx;
        
        // Apply camera transformations from the renderer
        const camera = renderer.camera;
        const viewPosition = camera.getViewPosition();
        
        // Draw background with neon glow
        ctx.fillStyle = '#120b1a'; // Darker version of wall color
        ctx.fillRect(viewPosition.x, viewPosition.y, this.width, this.height);
        
        // Draw walls
        ctx.fillStyle = this.wallColor;
        
        // Top wall
        ctx.fillRect(viewPosition.x, viewPosition.y, this.width, this.wallThickness);
        
        // Bottom wall
        ctx.fillRect(viewPosition.x, viewPosition.y + this.height - this.wallThickness, this.width, this.wallThickness);
        
        // Left wall
        ctx.fillRect(viewPosition.x, viewPosition.y, this.wallThickness, this.height);
        
        // Right wall - top segment
        ctx.fillRect(
            viewPosition.x + this.width - this.wallThickness,
            viewPosition.y,
            this.wallThickness,
            this.height / 2 - this.doorWidth / 2
        );
        
        // Right wall - bottom segment
        ctx.fillRect(
            viewPosition.x + this.width - this.wallThickness,
            viewPosition.y + this.height / 2 + this.doorWidth / 2,
            this.wallThickness,
            this.height / 2 - this.doorWidth / 2
        );
        
        // Draw door (always unlocked)
        ctx.fillStyle = this.unlockedDoorColor;
        const door = this.doors[0];
        ctx.fillRect(
            viewPosition.x + door.x - door.width / 2,
            viewPosition.y + door.y - door.height / 2,
            door.width,
            door.height
        );
        
        // Add pulsing glow effect to door
        const pulseIntensity = 0.7 + Math.sin(Date.now() / 300) * 0.3;
        
        // Draw door glow
        const doorGradient = ctx.createRadialGradient(
            viewPosition.x + door.x, viewPosition.y + door.y, 0,
            viewPosition.x + door.x, viewPosition.y + door.y, door.height * 1.5
        );
        doorGradient.addColorStop(0, `rgba(51, 255, 119, ${0.5 * pulseIntensity})`);
        doorGradient.addColorStop(1, 'rgba(51, 255, 119, 0)');
        ctx.fillStyle = doorGradient;
        ctx.beginPath();
        ctx.ellipse(viewPosition.x + door.x, viewPosition.y + door.y, door.height * 1.5, door.height * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw title and instructions
        this.renderText(ctx, viewPosition);
        
        // Add an arrow pointing to the door
        this.renderArrow(ctx, viewPosition);
        
        // Draw Vibeverse portals
        if (this.vibePortal) {
            this.vibePortal.render(ctx);
        }
        
        if (this.exitPortal) {
            this.exitPortal.render(ctx);
        }
    }
    
    /**
     * Render title and instructions
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} viewPosition - View position
     */
    renderText(ctx, viewPosition) {
        // Title text
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // Neon glow effect for title
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.title, viewPosition.x + this.width / 2, viewPosition.y + this.height / 3);
        
        // Reset shadow for instructions
        ctx.shadowBlur = 0;
        
        // Instructions
        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = '#cccccc';
        
        this.instructions.forEach((instruction, index) => {
            ctx.fillText(
                instruction,
                viewPosition.x + this.width / 2,
                viewPosition.y + this.height / 2 + (index * 30)
            );
        });
        
        // Additional instruction with arrow pointing to door
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillStyle = this.unlockedDoorColor;
        ctx.fillText(
            "→ START →",
            viewPosition.x + this.width - 100,
            viewPosition.y + this.height / 2 + 5.5
        );
        
        // Powerups section header
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('ITEMS', viewPosition.x + this.width / 2, viewPosition.y + this.height - 150);

        // Powerup descriptions (2 columns)
        ctx.font = '14px Arial, sans-serif';
        ctx.textAlign = 'left';
        const leftColumnX = viewPosition.x + this.width / 2 - 100;
        const rightColumnX = viewPosition.x + this.width / 2 + 20;
        const baseY = viewPosition.y + this.height - 120;

        // Add glow effect to powerup text
        ctx.shadowBlur = 5;
        
        // Health (Red)
        ctx.shadowColor = '#FF0000';
        ctx.fillStyle = '#FF0000';
        ctx.fillText('♥ Health: +25 Max HP', leftColumnX - 45, baseY);
        
        // Speed (Green)
        ctx.shadowColor = '#00FF00';
        ctx.fillStyle = '#00FF00';
        ctx.fillText('➜ Speed: +15% Movement', leftColumnX - 65, baseY + 30);

        // Ammo (Blue)
        ctx.shadowColor = '#0088FF';
        ctx.fillStyle = '#0088FF';
        ctx.fillText('◆ Ammo: +10 Capacity', rightColumnX - 5, baseY);
        
        // Shield (Yellow)
        ctx.shadowColor = '#FFFF00';
        ctx.fillStyle = '#FFFF00';
        ctx.fillText('⊕ Shield: Absorbs 1 Hit', rightColumnX - 7, baseY + 30);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render animated arrow pointing to door
     * @param {CanvasRenderingContext2D} ctx - Canvas context 
     * @param {Object} viewPosition - View position
     */
    renderArrow(ctx, viewPosition) {
        // Animation timing
        const arrowOffset = Math.sin(Date.now() / 300) * 10;
        
        // Arrow position
        const arrowX = viewPosition.x + this.width - 180 + arrowOffset;
        const arrowY = viewPosition.y + this.height / 2;
        
        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - 30, arrowY - 15);
        ctx.lineTo(arrowX - 30, arrowY + 15);
        ctx.closePath();
        
        // Arrow fill with glow
        ctx.shadowColor = this.unlockedDoorColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.unlockedDoorColor;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    /**
     * Get the reference URL from URL parameters
     * @returns {string} - Reference URL or default portal URL
     */
    getRefUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        let refUrl = urlParams.get('ref');
        
        if (refUrl) {
            // Add https if not present
            if (!refUrl.startsWith('http://') && !refUrl.startsWith('https://')) {
                refUrl = 'https://' + refUrl;
            }
            return refUrl;
        }
        
        return 'https://portal.pieter.com'; // Default portal hub
    }
    
    /**
     * Handle key press events in the starting room
     * @param {Object} event - Key event object
     * @param {Object} player - The player object
     */
    handleKeyDown(event, player) {
        // Check if Enter key was pressed to activate portals
        if (event.key === 'Enter') {
            // Check if player is near the entry portal and activate it
            if (this.vibePortal && this.vibePortal.interactable) {
                console.log('Return portal is only decorative - cannot be used as entry point');
                
                // Visual feedback that portal is inactive (particle burst)
                if (this.effects) {
                    this.effects.createParticleBurst(
                        this.vibePortal.x, 
                        this.vibePortal.y,
                        20, // More particles for visible feedback
                        {
                            color: ['#ff0000', '#ff3333', '#ff6666'], // Red color variants
                            minSpeed: 50,
                            maxSpeed: 150,
                            minLifetime: 0.5,
                            maxLifetime: 1.2
                        }
                    );
                }
                
                return;
            }
            
            // Check if player is near the exit portal and activate it
            if (this.exitPortal && this.exitPortal.interactable) {
                console.log('Activating exit portal to Vibeverse');
                this.exitPortal.activate();
                return;
            }
        }
        
        // Handle other keys as needed
        if (event.key === 'P' || event.key === 'p') {
            console.log('Pause key pressed in starting room');
            // Toggle pause state via game
            if (this.game && typeof this.game.togglePause === 'function') {
                this.game.togglePause();
            }
        }
    }
}
