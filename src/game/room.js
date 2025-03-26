// room.js - Room class
import Enemy from './enemy.js';
import { Physics } from './physics.js';
import { ProceduralGenerator } from './proceduralGenerator.js';

export default class Room {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.wallThickness = 20;
        this.doorWidth = 100;
        this.doorHeight = this.wallThickness;
        this.wallColor = '#3a1a5a'; // Dark purple for walls
        this.doorColor = '#ff3366'; // Red for locked doors
        this.unlockedDoorColor = '#33ff77'; // Bright green for unlocked doors
        this.obstacleColor = '#8800ff'; // Neon purple for obstacles
        
        // Handle options - can be difficulty (number) or object with room data
        if (typeof options === 'number') {
            this.difficulty = options;
            this.roomData = null;
        } else {
            this.difficulty = options.difficulty || 1;
            this.roomData = options;
        }
        
        // Set up physics if provided, otherwise create new instance
        this.physics = options.physics || new Physics();
        
        // Initialize procedural generator with seed if not provided
        this.generator = options.procGen || new ProceduralGenerator();
        
        // Initialize doors for the room
        this.initDoors();
        
        // Initialize arrays for procedurally generated content
        this.enemies = [];
        this.obstacles = [];
        this.items = [];
        
        // Either use provided room data or generate new content
        if (this.roomData && (this.roomData.obstacles || this.roomData.enemyData || this.roomData.template)) {
            console.log('Using provided room data:', this.roomData);
            this.applyRoomData(this.roomData);
        } else {
            console.log('Generating new room content');
            this.generateContent();
        }
        
        // Flag to track if room has been cleared of enemies
        this.cleared = false;
        this.doorsOpen = false;
        this.lastLockedDoorTime = null; // New property to track last locked door interaction time
    }
    
    /**
     * Apply room data from procedural generator
     * @param {Object} roomData - Data for room generation
     */
    applyRoomData(roomData) {
        console.log(`Applying room data with template: ${roomData.template}`);
        
        // Set obstacles if provided
        if (roomData.obstacles && roomData.obstacles.length > 0) {
            // Fix obstacle coordinates - ensure they're centered properly
            this.obstacles = roomData.obstacles.map(obstacle => {
                return {
                    // Convert from top-left coordinates to center coordinates if needed
                    x: obstacle.x + (obstacle.width / 2),
                    y: obstacle.y + (obstacle.height / 2),
                    width: obstacle.width,
                    height: obstacle.height
                };
            });
            console.log(`Applied ${this.obstacles.length} obstacles from room data`);
        }
        
        // Set template
        if (roomData.template) {
            this.template = roomData.template;
        }
        
        // Spawn enemies if enemy data is provided
        if (roomData.enemyData && roomData.enemyData.length > 0) {
            this.spawnEnemiesFromData(roomData.enemyData);
        } else if (roomData.enemies && roomData.enemies.length > 0) {
            this.spawnEnemiesFromData(roomData.enemies);
        }
        
        // Add items if provided
        if (roomData.itemData && roomData.itemData.length > 0) {
            this.items = roomData.itemData.map(item => ({
                ...item,
                collected: false,
                radius: item.radius || 10
            }));
        } else if (roomData.items && roomData.items.length > 0) {
            this.items = roomData.items.map(item => ({
                ...item,
                collected: false,
                radius: item.radius || 10
            }));
        }
    }
    
    /**
     * Spawn enemies from provided data
     * @param {Array} enemyData - Array of enemy configuration objects
     */
    spawnEnemiesFromData(enemyData) {
        console.log(`Spawning ${enemyData.length} enemies from data`);
        this.enemies = [];
        
        if (!enemyData || enemyData.length === 0) {
            console.warn('No enemy data provided!');
            
            // Fallback: create a few enemies manually
            for (let i = 0; i < 5; i++) {
                // Create a random position for the enemy, away from walls
                const x = 50 + Math.random() * (this.width - 100);
                const y = 50 + Math.random() * (this.height - 100);
                
                // Randomly select an enemy type
                const type = Math.random() < 0.3 ? 'fast' : Math.random() < 0.6 ? 'strong' : 'normal';
                
                // Determine enemy properties based on type
                let speed, health;
                switch (type) {
                    case 'fast':
                        speed = 75;
                        health = 50;
                        break;
                    case 'strong':
                        speed = 40;
                        health = 150;
                        break;
                    default: // normal
                        speed = 50;
                        health = 100;
                        break;
                }
                
                try {
                    // Create the enemy
                    const enemy = new Enemy(x, y, speed, health, type);
                    
                    // Ensure enemy has all required properties for rendering
                    enemy.radius = enemy.radius || 15;
                    enemy.color = enemy.color || '#FF00FF'; // Magenta for normal enemies
                    enemy.active = true;
                    enemy.health = health;
                    enemy.maxHealth = health;
                    
                    this.enemies.push(enemy);
                    console.log(`Spawned ${type} enemy at ${x},${y}`);
                } catch (error) {
                    console.error('Error creating enemy:', error);
                }
            }
        } else {
            // Use the procedurally generated enemy data
            console.log(`Using ${enemyData.length} procedurally generated enemies`);
            this.enemies = enemyData.map(enemyConfig => {
                // Skip invalid enemy configs
                if (!enemyConfig || typeof enemyConfig !== 'object') {
                    console.warn('Invalid enemy config:', enemyConfig);
                    return null;
                }
                
                // Ensure we have x and y coordinates
                if (typeof enemyConfig.x !== 'number' || typeof enemyConfig.y !== 'number') {
                    console.warn('Enemy missing coordinates:', enemyConfig);
                    return null;
                }
                
                // Determine enemy properties based on type
                let speed, health;
                const type = enemyConfig.type || 'normal';
                
                switch (type) {
                    case 'fast':
                        speed = 75;
                        health = 50;
                        break;
                    case 'strong':
                        speed = 40;
                        health = 150;
                        break;
                    default: // 'normal'
                        speed = 50;
                        health = 100;
                        break;
                }
                
                try {
                    // Create the enemy
                    const enemy = new Enemy(enemyConfig.x, enemyConfig.y, speed, health, type);
                    
                    // Ensure enemy has all required properties for rendering
                    enemy.radius = enemy.radius || 15;
                    enemy.color = enemy.color || '#FF00FF'; // Magenta for normal enemies
                    enemy.active = true;
                    enemy.health = health;
                    enemy.maxHealth = health;
                    
                    return enemy;
                } catch (error) {
                    console.error('Error creating enemy:', error);
                    return null;
                }
            }).filter(enemy => enemy !== null);
        }
    }
    
    /**
     * Initialize doors for the room
     */
    initDoors() {
        // Define door positions (centered on walls)
        this.doors = [
            // Top door
            {
                x: this.width / 2,
                y: this.wallThickness / 2,
                width: this.doorWidth,
                height: this.wallThickness,
                locked: true // All doors start locked
            },
            // Right door
            {
                x: this.width - this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.doorWidth,
                locked: true
            },
            // Bottom door
            {
                x: this.width / 2,
                y: this.height - this.wallThickness / 2,
                width: this.doorWidth,
                height: this.wallThickness,
                locked: true
            },
            // Left door
            {
                x: this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.doorWidth,
                locked: true
            }
        ];
        
        // Debug initial door states
        console.log("Door states after initialization:");
        this.doors.forEach((door, i) => {
            console.log(`Door ${i}: locked = ${door.locked}`);
        });
    }
    
    /**
     * Generate room content using procedural generation
     */
    generateContent() {
        console.log(`Generating room content with difficulty ${this.difficulty}`);
        
        // Generate obstacle layout based on room template
        const template = this.generator.selectRoomTemplate();
        this.obstacles = [];
        
        // Generate obstacles based on template
        this.generateObstacles(template);
        console.log(`Generated ${this.obstacles.length} obstacles with template: ${template}`);
        
        // Generate enemies
        this.spawnEnemies();
        console.log(`Generated ${this.enemies.length} enemies for the room`);
        
        // Generate items
        this.generateItems();
    }
    
    /**
     * Generate obstacles based on a template
     * @param {string} template - The room template to use
     */
    generateObstacles(template) {
        const padding = 60; // Minimum distance from walls
        
        switch (template) {
            case 'corners':
                // Add obstacles in corners
                const cornerSize = Math.min(this.width, this.height) * 0.15;
                this.obstacles.push(
                    { x: padding, y: padding, width: cornerSize, height: cornerSize },
                    { x: this.width - padding - cornerSize, y: padding, width: cornerSize, height: cornerSize },
                    { x: padding, y: this.height - padding - cornerSize, width: cornerSize, height: cornerSize },
                    { x: this.width - padding - cornerSize, y: this.height - padding - cornerSize, width: cornerSize, height: cornerSize }
                );
                break;
                
            case 'cross':
                // Add cross-shaped obstacle in center
                const crossWidth = this.width * 0.1;
                const crossHeight = this.height * 0.6;
                const crossX = (this.width - crossWidth) / 2;
                const crossY = (this.height - crossHeight) / 2;
                
                this.obstacles.push(
                    { x: crossX, y: crossY, width: crossWidth, height: crossHeight }, // Vertical part
                    { x: this.width * 0.2, y: (this.height - crossWidth) / 2, width: this.width * 0.6, height: crossWidth } // Horizontal part
                );
                break;
                
            case 'pillars':
                // Add several pillars
                const pillarCount = 4 + Math.floor(this.generator.getRandom() * 3); // 4-6 pillars
                const pillarSize = Math.min(this.width, this.height) * 0.08;
                
                for (let i = 0; i < pillarCount; i++) {
                    let x, y, valid;
                    const minPillarDistance = pillarSize * 3;
                    let attempts = 0;
                    
                    do {
                        valid = true;
                        x = padding + this.generator.getRandom() * (this.width - 2 * padding - pillarSize);
                        y = padding + this.generator.getRandom() * (this.height - 2 * padding - pillarSize);
                        
                        // Check distance from existing pillars
                        for (const obstacle of this.obstacles) {
                            const dx = x - obstacle.x;
                            const dy = y - obstacle.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < minPillarDistance) {
                                valid = false;
                                break;
                            }
                        }
                        
                        attempts++;
                    } while (!valid && attempts < 20);
                    
                    if (valid) {
                        this.obstacles.push({ x, y, width: pillarSize, height: pillarSize });
                    }
                }
                break;
                
            case 'asymmetric':
                // Add asymmetric layout
                const barrierWidth = this.width * 0.05;
                const barrierHeight = this.height * 0.7;
                const barrierX = this.width * (0.3 + this.generator.getRandom() * 0.4); // Barrier in middle third
                const barrierY = (this.height - barrierHeight) / 2;
                
                this.obstacles.push(
                    { x: barrierX, y: barrierY, width: barrierWidth, height: barrierHeight }
                );
                
                // Add some random smaller obstacles
                for (let i = 0; i < 3; i++) {
                    const obstacleSize = Math.min(this.width, this.height) * (0.05 + this.generator.getRandom() * 0.05);
                    const x = padding + this.generator.getRandom() * (this.width - 2 * padding - obstacleSize);
                    const y = padding + this.generator.getRandom() * (this.height - 2 * padding - obstacleSize);
                    
                    this.obstacles.push({ x, y, width: obstacleSize, height: obstacleSize });
                }
                break;
                
            case 'maze':
                // Create a simple maze-like structure
                const wallWidth = this.width * 0.04;
                const gap = this.width * 0.15;
                
                // Horizontal barriers
                for (let i = 0; i < 2; i++) {
                    const y = this.height * (0.33 + i * 0.33);
                    this.obstacles.push({ x: padding, y, width: this.width - gap - padding * 2, height: wallWidth });
                }
                
                // Vertical barriers (offset from horizontal ones)
                for (let i = 0; i < 2; i++) {
                    const x = this.width * (0.33 + i * 0.33);
                    this.obstacles.push({ x, y: padding, width: wallWidth, height: this.height - gap - padding * 2 });
                }
                break;
                
            case 'empty':
            default:
                // No obstacles or just a few random ones
                for (let i = 0; i < 2; i++) {
                    const size = Math.min(this.width, this.height) * (0.05 + this.generator.getRandom() * 0.05);
                    const x = padding + this.generator.getRandom() * (this.width - 2 * padding - size);
                    const y = padding + this.generator.getRandom() * (this.height - 2 * padding - size);
                    
                    this.obstacles.push({ x, y, width: size, height: size });
                }
                break;
        }
        
        // Mark obstacles with radius property for collision detection
        for (const obstacle of this.obstacles) {
            obstacle.radius = Math.max(obstacle.width, obstacle.height) / 2;
        }
    }
    
    /**
     * Generate items for the room
     */
    generateItems() {
        // Define potential item types
        const itemTypes = [
            { effect: 'restoreHealth', color: '#ff0088', radius: 10, symbol: '+' },
            { effect: 'increaseSpeed', color: '#00ffff', radius: 8, symbol: '⚡' },
            { effect: 'powerUpWeapon', color: '#ff00ff', radius: 12, symbol: '★' }
        ];
        
        // Generate 1-3 items based on difficulty
        const itemCount = 1 + Math.floor(this.generator.getRandom() * Math.min(2, this.difficulty));
        const padding = 60; // Minimum distance from walls
        
        for (let i = 0; i < itemCount; i++) {
            // Select random item type
            const typeIndex = Math.floor(this.generator.getRandom() * itemTypes.length);
            const itemType = itemTypes[typeIndex];
            
            // Find valid position for item (away from obstacles)
            let x, y, valid;
            let attempts = 0;
            
            do {
                valid = true;
                x = padding + this.generator.getRandom() * (this.width - 2 * padding);
                y = padding + this.generator.getRandom() * (this.height - 2 * padding);
                
                // Check distance from obstacles
                for (const obstacle of this.obstacles) {
                    const dx = x - (obstacle.x + obstacle.width / 2);
                    const dy = y - (obstacle.y + obstacle.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < itemType.radius + Math.max(obstacle.width, obstacle.height) / 2 + 20) {
                        valid = false;
                        break;
                    }
                }
                
                // Check distance from other items
                for (const item of this.items) {
                    const dx = x - item.x;
                    const dy = y - item.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < itemType.radius + item.radius + 30) {
                        valid = false;
                        break;
                    }
                }
                
                attempts++;
            } while (!valid && attempts < 20);
            
            if (valid) {
                this.items.push({
                    x,
                    y,
                    radius: itemType.radius,
                    color: itemType.color,
                    effect: itemType.effect,
                    symbol: itemType.symbol,
                    collected: false
                });
            }
        }
    }
    
    /**
     * Spawn enemies in the room
     * @param {number} count - Number of enemies to spawn
     */
    spawnEnemies(count = 5) {
        const padding = 50; // Minimum distance from walls
        
        console.log(`Spawning enemies in room with difficulty ${this.difficulty}`);
        
        // Clear existing enemies
        this.enemies = [];
        
        // Generate room layout with enemies using the procedural generator
        const roomData = this.generator.generateRoom(this.width, this.height, this.difficulty);
        
        if (!roomData.enemies || roomData.enemies.length === 0) {
            console.warn("No enemy data generated by procedural generator!");
            
            // Fallback: create a few enemies manually
            for (let i = 0; i < count; i++) {
                // Create a random position for the enemy, away from walls
                const x = padding + Math.random() * (this.width - 2 * padding);
                const y = padding + Math.random() * (this.height - 2 * padding);
                
                // Randomly select an enemy type
                const type = Math.random() < 0.3 ? 'fast' : Math.random() < 0.6 ? 'strong' : 'normal';
                
                // Determine enemy properties based on type
                let speed, health;
                switch (type) {
                    case 'fast':
                        speed = 75;
                        health = 50;
                        break;
                    case 'strong':
                        speed = 40;
                        health = 150;
                        break;
                    default: // normal
                        speed = 50;
                        health = 100;
                        break;
                }
                
                try {
                    // Create the enemy
                    const enemy = new Enemy(x, y, speed, health, type);
                    enemy.active = true;
                    
                    // Add the enemy to the room
                    this.enemies.push(enemy);
                    console.log(`Created fallback ${type} enemy at ${x},${y}`);
                } catch (error) {
                    console.error("Error creating enemy:", error);
                }
            }
        } else {
            // Use the procedurally generated enemy data
            console.log(`Using ${roomData.enemies.length} procedurally generated enemies`);
            this.spawnEnemiesFromData(roomData.enemies);
        }
        
        // Always add at least one patrol enemy for testing
        try {
            const patrolX = padding + Math.random() * (this.width - 2 * padding);
            const patrolY = padding + Math.random() * (this.height - 2 * padding);
            const patrolEnemy = new Enemy(patrolX, patrolY, 40, 100, 'patrol');
            patrolEnemy.active = true;
            patrolEnemy.fireRate = 1000; // Shoot more frequently for testing (every 1 second)
            patrolEnemy.fireRange = 500; // Larger range for testing
            
            // Add the patrol enemy to the room
            this.enemies.push(patrolEnemy);
            console.log(`Added a test patrol enemy at ${patrolX},${patrolY} with fire rate: ${patrolEnemy.fireRate}ms and range: ${patrolEnemy.fireRange}`);
        } catch (error) {
            console.error("Error creating test patrol enemy:", error);
        }
        
        console.log(`Room now has ${this.enemies.length} enemies`);
    }
    
    /**
     * Apply item effect to player
     * @param {Player} player - The player to apply the effect to
     * @param {Object} item - The item with an effect
     */
    applyItemEffect(player, item) {
        if (!item || item.collected) return;
        
        // Play sound effect
        if (window.audioManager) {
            window.audioManager.playItemCollectSound();
        }
        
        console.log(`Player collected item: ${item.type}`);
        
        // Handle different item types
        switch(item.type) {
            case 'health':
                // Restore full health
                player.health = player.maxHealth;
                console.log(`Health fully restored. Player health: ${player.health}/${player.maxHealth}`);
                break;
                
            case 'speedBoost':
                // Temporarily boost player's speed by 25% for 15 seconds
                player.speedMultiplier = 1.25;
                // Reset speed multiplier after 15 seconds
                setTimeout(() => {
                    player.speedMultiplier = 1.0;
                    console.log('Speed boost ended');
                }, 15000);
                console.log('Speed boost activated for 15 seconds');
                break;
                
            case 'shield':
                // Make player invulnerable for 15 seconds
                if (player.activateShield) {
                    player.activateShield(15000); // 15 seconds duration
                } else {
                    // Fallback for backward compatibility
                    player.invulnerable = true;
                    
                    // Visual indicator for invulnerability
                    if (player.flashInvulnerability) {
                        player.flashInvulnerability();
                    }
                    
                    // Reset invulnerability after 15 seconds
                    setTimeout(() => {
                        player.invulnerable = false;
                        console.log('Invulnerability ended');
                    }, 15000);
                }
                console.log('Invulnerability activated for 15 seconds');
                break;
                
            case 'dashReset':
                // Reset the dash cooldown immediately
                player.dashCooldown = 0;
                console.log('Dash cooldown reset');
                break;
                
            case 'ammo':
                // Increase fire rate by 50% for 15 seconds
                player.fireRateMultiplier = 1.5;
                // Reset fire rate multiplier after 15 seconds
                setTimeout(() => {
                    player.fireRateMultiplier = 1.0;
                    console.log('Fire rate boost ended');
                }, 15000);
                console.log('Fire rate increased by 50% for 15 seconds');
                break;
                
            default:
                console.log(`Unknown item type: ${item.type}`);
        }
    }
    
    /**
     * Updates the room and all entities within it
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} player - The player object
     * @param {Array} projectiles - Array of player projectiles
     * @param {Object} effects - Optional effects manager for particle effects
     */
    update(deltaTime, player, projectiles, effects) {
        // CRITICAL FIX: Keep items away from obstacles during every update
        this.fixItemPlacements();
        
        // Store effects manager for use in other methods
        this.effects = effects;
        
        // Log how many patrol enemies we have for debugging
        let patrolCount = 0;
        for (const enemy of this.enemies) {
            if (enemy.type === 'patrol') {
                patrolCount++;
            }
        }
        if (patrolCount > 0) {
            console.log(`Room has ${patrolCount} patrol enemies that should be firing projectiles`);
        }
        
        // Update enemies
        for (const enemy of this.enemies) {
            if (enemy.active) {
                // Update enemy - pass room as third parameter for AI behaviors
                enemy.update(deltaTime, player, this, effects);
                
                // Handle enemy projectiles
                this.handleEnemyProjectiles(enemy, player, deltaTime);
            }
        }
        
        // Check player collision with obstacles
        if (player) {
            this.handleObstacleCollisions(player);
        }
        
        // Check projectile collision with obstacles
        if (projectiles) {
            for (const projectile of projectiles) {
                if (projectile.active) {
                    if (this.checkBulletObstacleCollision(projectile)) {
                        projectile.active = false;
                        
                        // Add hit effect
                        if (effects) {
                            if (typeof effects.createParticleBurst === 'function') {
                                effects.createParticleBurst(
                                    projectile.x, projectile.y,
                                    5, // Number of particles
                                    {
                                        color: ['#AAAAAA', '#CCCCCC', '#FFFFFF'],
                                        minSpeed: 20,
                                        maxSpeed: 60,
                                        minLifetime: 0.1,
                                        maxLifetime: 0.3
                                    }
                                );
                            }
                        }
                    }
                }
            }
        }
        
        // Check enemy projectile collision with obstacles
        for (const enemy of this.enemies) {
            if (!enemy.active || !enemy.projectiles) continue;
            
            for (const projectile of enemy.projectiles) {
                if (!projectile.active) continue;
                
                // Check collision with obstacles
                if (this.checkBulletObstacleCollision(projectile)) {
                    projectile.active = false;
                    
                    // Add effect if effects manager is available
                    if (this.effects) {
                        try {
                            if (typeof this.effects.createBulletHitEffect === 'function') {
                                this.effects.createBulletHitEffect(
                                    projectile.x, projectile.y,
                                    3,
                                    projectile.color
                                );
                            } else if (typeof this.effects.createParticleBurst === 'function') {
                                this.effects.createParticleBurst(
                                    projectile.x, projectile.y,
                                    3,
                                    { color: projectile.color }
                                );
                            }
                        } catch (e) {
                            // Silently fail if effects methods fail
                            console.log("Projectile hit effect failed:", e);
                        }
                    }
                }
                
                // Check collision with walls
                this.checkEnemyProjectileWallCollision(projectile);
            }
        }
        
        // Check item collection
        if (player) {
            console.log(`Checking ${this.items.length} items for collection`);
            
            for (const item of this.items) {
                if (!item.collected) {
                    const dx = player.x - item.x;
                    const dy = player.y - item.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    // Ensure item radius has a default value if not set
                    if (item.radius === undefined) {
                        item.radius = 10;
                        console.log(`Fixed missing radius for item ${item.type}`);
                    }
                    const collisionRadius = player.radius + item.radius;
                    
                    console.log(`Item collision check: distance=${distance.toFixed(2)}, threshold=${collisionRadius}, player radius=${player.radius}, item radius=${item.radius}`);
                    
                    if (distance <= collisionRadius) {
                        console.log(`COLLISION DETECTED with ${item.type}!`);
                        
                        // Apply item effect
                        this.applyItemEffect(player, item);
                        item.collected = true;
                        
                        // Add collection effect
                        if (effects) {
                            // Create screen flash and particle burst
                            if (typeof effects.createScreenFlash === 'function') {
                                effects.createScreenFlash(item.color, 0.3);
                            }
                            
                            // Create particle burst instead of swirl if the particle method isn't available
                            if (typeof effects.createParticleBurst === 'function') {
                                effects.createParticleBurst(
                                    player.x, player.y,
                                    20, // Number of particles
                                    {
                                        color: item.color,
                                        minSpeed: 20,
                                        maxSpeed: 100,
                                        minLifetime: 0.5,
                                        maxLifetime: 0.8
                                    }
                                );
                            }
                        }
                    }
                }
            }
        }
        
        // Filter out inactive enemies (died and animation finished)
        this.enemies = this.enemies.filter(enemy => enemy.active);
    }
    
    /**
     * Updates room state without applying boundary collisions
     * @param {number} deltaTime - Time since last frame
     * @param {object} player - Player object
     * @param {Object} effects - Optional effects manager for particle effects
     */
    updateWithoutBoundaries(deltaTime, player, effects = null) {
        // Check if room is cleared already
        if (this.cleared) return;
        
        // Update enemies
        for (const enemy of this.enemies) {
            if (enemy.active) {
                enemy.update(deltaTime, player, this, effects);
                // Keep enemies within room boundaries even in this method
                this.handleEnemyBoundaryCollisions(enemy);
            }
        }
        
        // Check if all enemies are defeated
        if (this.checkAllEnemiesDefeated()) {
            this.openDoors(); // Use openDoors() which selectively unlocks doors
        }
        
        // Check for bullet collisions with walls and doors
        this.checkBulletCollisions(player);
    }
    
    unlockDoors() {
        for (const door of this.doors) {
            door.locked = false;
        }
        this.cleared = true;
        this.doorsOpen = true;
        console.log("All doors unlocked!");
    }
    
    openDoors(entryDoorIndex = -1) {
        if (!this.cleared) {
            console.log("Opening doors - room cleared!");
            console.log(`Entry door index: ${entryDoorIndex}`);
            
            // Lock all doors initially (to ensure a clean state)
            for (let i = 0; i < this.doors.length; i++) {
                this.doors[i].locked = true;
            }
            
            // FINE-TUNED WEIGHTS: Determine how many doors to unlock with adjusted probabilities
            // 50% chance for 1 door, 35% chance for 2 doors, 15% chance for 3 doors
            const randomValue = Math.random();
            let doorsToUnlock;
            
            if (randomValue < 0.5) {
                doorsToUnlock = 1; // Most common
            } else if (randomValue < 0.85) {
                doorsToUnlock = 2; // Less common
            } else {
                doorsToUnlock = 3; // Rare
            }
            
            console.log(`Unlocking ${doorsToUnlock} door(s)`);
            
            // Create an array of door indices, excluding the entry door
            const availableDoorIndices = [];
            for (let i = 0; i < this.doors.length; i++) {
                if (i !== entryDoorIndex) {
                    availableDoorIndices.push(i);
                }
            }
            
            // Shuffle the available door indices
            for (let i = availableDoorIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableDoorIndices[i], availableDoorIndices[j]] = [availableDoorIndices[j], availableDoorIndices[i]];
            }
            
            // Unlock the selected number of doors with visual and sound effects
            const doorCount = Math.min(doorsToUnlock, availableDoorIndices.length);
            for (let i = 0; i < doorCount; i++) {
                const doorIndex = availableDoorIndices[i];
                this.doors[doorIndex].locked = false;
                console.log(`Unlocked door ${doorIndex}`);
                
                // Get door position and dimensions for effects
                const door = this.doors[doorIndex];
                const isHorizontal = door.width > door.height;
                
                // Play unlock sound effect with slight delay for each door
                if (window.audioManager) {
                    setTimeout(() => {
                        window.audioManager.playDoorUnlockSound(doorIndex);
                    }, i * 200); // Stagger sounds for multiple doors
                }
                
                // Add visual effect if effects manager is available
                if (this.effects) {
                    setTimeout(() => {
                        this.effects.createDoorUnlockEffect(
                            door.x, door.y, door.width, door.height, isHorizontal
                        );
                    }, i * 200); // Stagger visuals for multiple doors
                }
            }
            
            // Mark room as cleared
            this.cleared = true;
            this.doorsOpen = true;
            
            // Print debug information about door states
            console.log("Door states after opening:");
            this.doors.forEach((door, index) => {
                console.log(`Door ${index}: locked=${door.locked}`);
            });
        }
    }
    
    /**
     * Helper method to determine if a player is at a door
     * @param {Object} player - The player object
     * @param {Object} door - The door object
     * @returns {boolean} Whether the player is at the door
     */
    isPlayerAtDoor(player, door) {
        // For horizontal doors (top and bottom)
        if (door.width > door.height) {
            return (player.x >= door.x - door.width / 2 && 
                    player.x <= door.x + door.width / 2);
        } 
        // For vertical doors (left and right)
        else {
            return (player.y >= door.y - door.height / 2 && 
                    player.y <= door.y + door.height / 2);
        }
    }
    
    // Check if player is touching an unlocked door, returns door index or -1
    checkDoorCollision(player) {
        for (let i = 0; i < this.doors.length; i++) {
            const door = this.doors[i];
            
            // Calculate player center point
            const playerCenterX = player.x;
            const playerCenterY = player.y;
            
            // Calculate door bounds with a small padding for better collision detection
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
                
                if (door.locked) {
                    // Play locked door sound (but not too frequently)
                    if (!this.lastLockedDoorTime || Date.now() - this.lastLockedDoorTime > 500) {
                        this.lastLockedDoorTime = Date.now();
                        
                        // Play locked door sound effect
                        if (window.audioManager) {
                            window.audioManager.playDoorLockedSound();
                        }
                        
                        // Create visual effect at the point of collision
                        if (this.effects) {
                            // Determine the closest point on the door to the player for the effect
                            let effectX = playerCenterX;
                            let effectY = playerCenterY;
                            
                            // Adjust effect position to be on the door
                            if (door.width > door.height) { // Horizontal door
                                effectY = door.y;
                            } else { // Vertical door
                                effectX = door.x;
                            }
                            
                            this.effects.createDoorLockedEffect(effectX, effectY);
                        }
                        
                        console.log(`Player attempted to use locked door ${i}`);
                    }
                    
                    return -1; // Locked door - no passage
                }
                
                console.log(`Player collided with door ${i}, which is unlocked`);
                return i; // Return which door was hit (0=top, 1=right, 2=bottom, 3=left)
            }
        }
        
        return -1; // No door collision
    }
    
    // Check if player is exiting the room and return exit info
    checkExit(player) {
        const doorIndex = this.checkDoorCollision(player);
        
        if (doorIndex !== -1) {
            // Player is touching an unlocked door
            // Map door indices to directions and entry points
            const exits = [
                { direction: 'north', targetRoom: 'random', entryPoint: 'south' },  // Top door (0)
                { direction: 'east', targetRoom: 'random', entryPoint: 'west' },    // Right door (1)
                { direction: 'south', targetRoom: 'random', entryPoint: 'north' },  // Bottom door (2)
                { direction: 'west', targetRoom: 'random', entryPoint: 'east' }     // Left door (3)
            ];
            
            return exits[doorIndex];
        }
        
        return null; // No exit
    }
    
    // Get entry position for a player coming from a specific direction
    getEntryPosition(entryPoint) {
        // Calculate player spawn position based on entry point
        switch (entryPoint) {
            case 'north': // Coming from north (top door)
                return {
                    x: this.width / 2,
                    y: this.wallThickness + 50
                };
            case 'east': // Coming from east (right door)
                return {
                    x: this.width - this.wallThickness - 50,
                    y: this.height / 2
                };
            case 'south': // Coming from south (bottom door)
                return {
                    x: this.width / 2,
                    y: this.height - this.wallThickness - 50
                };
            case 'west': // Coming from west (left door)
                return {
                    x: this.wallThickness + 50,
                    y: this.height / 2
                };
            default:
                // Default to center of room
                return {
                    x: this.width / 2,
                    y: this.height / 2
                };
        }
    }
    
    /**
     * Get the walls of the room for collision detection
     * @returns {Array} Array of wall objects with x, y, width, height properties
     */
    getWalls() {
        // Return the room's walls for collision
        return [
            // Top wall
            {
                x: this.width / 2,
                y: this.wallThickness / 2,
                width: this.width,
                height: this.wallThickness
            },
            // Right wall
            {
                x: this.width - this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.height
            },
            // Bottom wall
            {
                x: this.width / 2,
                y: this.height - this.wallThickness / 2,
                width: this.width,
                height: this.wallThickness
            },
            // Left wall
            {
                x: this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.height
            }
        ];
    }
    
    checkBulletCollisions(player) {
        // Check all projectiles against walls and doors
        for (let i = player.projectiles.length - 1; i >= 0; i--) {
            const projectile = player.projectiles[i];
            if (!projectile.active) continue;
            
            // Create a projectile hitbox for physics-based collision detection
            const projectileHitbox = {
                x: projectile.x,
                y: projectile.y,
                radius: projectile.radius
            };
            
            // Check if projectile hits any wall (not including doors)
            let wallHit = false;
            
            // Define the walls as rectangles
            const walls = [
                // Left wall
                { x: 0, y: 0, width: this.wallThickness, height: this.height },
                // Right wall
                { x: this.width - this.wallThickness, y: 0, width: this.wallThickness, height: this.height },
                // Top wall
                { x: 0, y: 0, width: this.width, height: this.wallThickness },
                // Bottom wall
                { x: 0, y: this.height - this.wallThickness, width: this.width, height: this.wallThickness }
            ];
            
            // Check each door and modify wall rectangles to account for door openings
            for (let j = 0; j < this.doors.length; j++) {
                const door = this.doors[j];
                
                // Skip wall section if it's a door and check door collision separately
                if (!door.locked) continue; // Skip unlocked doors for projectile collision
                
                // Create door rectangle for collision check
                const doorRect = {
                    x: door.x - door.width / 2,
                    y: door.y - door.height / 2,
                    width: door.width,
                    height: door.height
                };
                
                // Check collision
                if (this.physics.checkCircleRectCollision(projectileHitbox, doorRect)) {
                    wallHit = true;
                    break;
                }
            }
            
            // Check walls
            for (const wall of walls) {
                if (this.physics.checkCircleRectCollision(projectileHitbox, wall)) {
                    wallHit = true;
                    break;
                }
            }
            
            // If projectile hit a wall, deactivate it
            if (wallHit) {
                projectile.active = false;
            }
        }
    }
    
    /**
     * Check if a bullet collides with any obstacles
     * @param {Object} bullet - The bullet to check
     * @returns {boolean} - True if collision detected, false otherwise
     */
    checkBulletObstacleCollision(bullet) {
        for (const obstacle of this.obstacles) {
            // Check if bullet is colliding with this obstacle
            if (this.physics.checkCircleRectCollision(
                bullet.x, bullet.y, bullet.radius,
                obstacle.x, obstacle.y, obstacle.width, obstacle.height
            )) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    // Check if all enemies in the room are defeated
    checkAllEnemiesDefeated() {
        const activeEnemies = this.enemies.filter(enemy => enemy.active);
        return activeEnemies.length === 0;
    }
    
    // Check if room has been cleared (all enemies defeated)
    isCleared() {
        return this.cleared || this.checkAllEnemiesDefeated();
    }
    
    handleBoundaryCollisions(player) {
        // Keep player within room boundaries
        const playerHalfWidth = player.width / 2;
        const playerHalfHeight = player.height / 2;
        let collided = false;
        
        // Helper function to log wall collisions for debugging
        const logCollision = (wall, atDoor, locked) => {
            if (atDoor && locked) {
                // Debug logging for locked door collisions
                // console.log(`Player collided with locked ${wall} door`);
            }
        };
        
        // Define walls - recreate them each time to ensure they're up to date
        const walls = [
            // Left wall
            { x: 0, y: 0, width: this.wallThickness, height: this.height, id: 'left' },
            // Right wall
            { x: this.width - this.wallThickness, y: 0, width: this.wallThickness, height: this.height, id: 'right' },
            // Top wall
            { x: 0, y: 0, width: this.width, height: this.wallThickness, id: 'top' },
            // Bottom wall
            { x: 0, y: this.height - this.wallThickness, width: this.width, height: this.wallThickness, id: 'bottom' }
        ];
        
        // Check all four walls for collision
        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            
            // Skip wall section if it's a door and check door collision separately
            let isDoor = false;
            let door = null;
            let isAtDoor = false;
            
            // Check if this wall contains a door
            if (i < this.doors.length) {
                door = this.doors[i];
                isAtDoor = this.isPlayerAtDoor(player, door);
                
                // If player is at door and door is unlocked, no collision
                if (isAtDoor && !door.locked) {
                    continue;
                }
            }
            
            // Create player hitbox for collision detection
            const playerHitbox = {
                x: player.x,
                y: player.y,
                width: player.width,
                height: player.height,
                isCentered: true // Player position is centered
            };
            
            // Check for collision using physics helper
            if (this.physics.checkRectCollision(playerHitbox, wall)) {
                // Handle collision response based on which wall was hit
                switch (wall.id) {
                    case 'left':
                        player.x = this.wallThickness + playerHalfWidth;
                        player.velocityX = Math.max(0, player.velocityX); // Prevent further movement into wall
                        logCollision('Left', isAtDoor, door && door.locked);
                        break;
                    case 'right':
                        player.x = this.width - this.wallThickness - playerHalfWidth;
                        player.velocityX = Math.min(0, player.velocityX); // Prevent further movement into wall
                        logCollision('Right', isAtDoor, door && door.locked);
                        break;
                    case 'top':
                        player.y = this.wallThickness + playerHalfHeight;
                        player.velocityY = Math.max(0, player.velocityY); // Prevent further movement into wall
                        logCollision('Top', isAtDoor, door && door.locked);
                        break;
                    case 'bottom':
                        player.y = this.height - this.wallThickness - playerHalfHeight;
                        player.velocityY = Math.min(0, player.velocityY); // Prevent further movement into wall
                        logCollision('Bottom', isAtDoor, door && door.locked);
                        break;
                }
                collided = true;
            }
        }
        
        // Check for obstacle collisions
        for (const obstacle of this.obstacles) {
            const playerHitbox = {
                x: player.x,
                y: player.y,
                width: player.width,
                height: player.height,
                isCentered: true
            };
            
            const obstacleHitbox = {
                x: obstacle.x + obstacle.width / 2, // Convert to centered coordinates
                y: obstacle.y + obstacle.height / 2,
                width: obstacle.width,
                height: obstacle.height,
                isCentered: true
            };
            
            if (this.physics.checkRectCollision(playerHitbox, obstacleHitbox)) {
                // Create an effect to show collision
                if (player.lastObstacleCollision !== obstacle && player.effects) {
                    if (typeof player.effects.createParticleBurst === 'function') {
                        player.effects.createParticleBurst(
                            player.x, player.y,
                            5,
                            { color: this.obstacleColor }
                        );
                    }
                    player.lastObstacleCollision = obstacle;
                }
                
                // Handle collision response - simple "push back"
                // Calculate the overlap on each axis
                const dx = player.x - obstacleHitbox.x;
                const dy = player.y - obstacleHitbox.y;
                
                // Determine which side of the obstacle was hit
                if (Math.abs(dx) / (obstacleHitbox.width / 2) > Math.abs(dy) / (obstacleHitbox.height / 2)) {
                    // Horizontal collision
                    if (dx > 0) {
                        // Collided with left side of obstacle
                        player.x = obstacleHitbox.x + obstacleHitbox.width / 2 + playerHalfWidth;
                    } else {
                        // Collided with right side of obstacle
                        player.x = obstacleHitbox.x - obstacleHitbox.width / 2 - playerHalfWidth;
                    }
                    player.velocityX = -player.velocityX; // Reverse direction
                } else {
                    // Vertical collision
                    if (dy > 0) {
                        // Collided with top side of obstacle
                        player.y = obstacleHitbox.y + obstacleHitbox.height / 2 + playerHalfHeight;
                    } else {
                        // Collided with bottom side of obstacle
                        player.y = obstacleHitbox.y - obstacleHitbox.height / 2 - playerHalfHeight;
                    }
                    player.velocityY = -player.velocityY; // Reverse direction
                }
                
                collided = true;
            }
        }
        
        // Check for item collection
        for (const item of this.items) {
            if (!item.collected && this.physics.checkCircleCollision(
                player.x, player.y, player.radius,
                item.x, item.y, item.radius
            )) {
                // Collect the item
                item.collected = true;
                
                // Apply item effect
                this.applyItemEffect(player, item);
                
                // Create collection effect if effects manager is available
                if (player.effects) {
                    if (typeof player.effects.createParticleBurst === 'function') {
                        player.effects.createParticleBurst(
                            item.x, item.y,
                            15, // More particles for a more dramatic effect
                            { 
                                color: item.color,
                                minLifetime: 0.3,
                                maxLifetime: 0.8,
                                minSpeed: 50,
                                maxSpeed: 150
                            }
                        );
                    }
                }
                
                console.log(`Player collected an item: ${item.effect}`);
            }
        }
        
        return collided;
    }
    
    /**
     * Get the walls of the room for collision detection
     * @returns {Array} Array of wall objects with x, y, width, height properties
     */
    getWalls() {
        // Return the room's walls for collision
        return [
            // Top wall
            {
                x: this.width / 2,
                y: this.wallThickness / 2,
                width: this.width,
                height: this.wallThickness
            },
            // Right wall
            {
                x: this.width - this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.height
            },
            // Bottom wall
            {
                x: this.width / 2,
                y: this.height - this.wallThickness / 2,
                width: this.width,
                height: this.wallThickness
            },
            // Left wall
            {
                x: this.wallThickness / 2,
                y: this.height / 2,
                width: this.wallThickness,
                height: this.height
            }
        ];
    }
    
    /**
     * Handle collisions between player and obstacles
     * @param {Player} player - The player to check collisions for
     */
    handleObstacleCollisions(player) {
        for (const obstacle of this.obstacles) {
            // Check if player is colliding with this obstacle
            if (this.physics.checkCircleRectCollision(
                { x: player.x, y: player.y, radius: player.radius },
                obstacle
            )) {
                // Create an effect to show collision
                if (player.lastObstacleCollision !== obstacle && player.effects) {
                    if (typeof player.effects.createParticleBurst === 'function') {
                        player.effects.createParticleBurst(
                            player.x, player.y,
                            5,
                            { color: this.obstacleColor }
                        );
                    }
                    player.lastObstacleCollision = obstacle;
                }
                
                // Handle collision response - simple "push back"
                // Calculate the overlap on each axis
                const dx = player.x - obstacle.x;
                const dy = player.y - obstacle.y;
                
                // Determine which side of the obstacle was hit
                if (Math.abs(dx) / (obstacle.width / 2) > Math.abs(dy) / (obstacle.height / 2)) {
                    // Horizontal collision
                    if (dx > 0) {
                        // Collided with left side of obstacle
                        player.x = obstacle.x + obstacle.width / 2 + player.radius;
                    } else {
                        // Collided with right side of obstacle
                        player.x = obstacle.x - obstacle.width / 2 - player.radius;
                    }
                    player.velocityX = -player.velocityX; // Reverse direction
                } else {
                    // Vertical collision
                    if (dy > 0) {
                        // Collided with top side of obstacle
                        player.y = obstacle.y + obstacle.height / 2 + player.radius;
                    } else {
                        // Collided with bottom side of obstacle
                        player.y = obstacle.y - obstacle.height / 2 - player.radius;
                    }
                    player.velocityY = -player.velocityY; // Reverse direction
                }
            } else {
                // Reset lastObstacleCollision if we're not colliding with this obstacle
                if (player.lastObstacleCollision === obstacle) {
                    player.lastObstacleCollision = null;
                }
            }
        }
    }
    
    /**
     * Check for sprite collision with any obstacle in the room
     * @param {Object} sprite - Any object with x, y, width, height properties
     * @returns {boolean} True if colliding with any obstacle
     */
    handleSpriteCollisions(sprite) {
        for (const obstacle of this.obstacles) {
            if (this.physics.checkRectCollision(
                { x: sprite.x - sprite.width/2, y: sprite.y - sprite.height/2, width: sprite.width, height: sprite.height },
                { x: obstacle.x - obstacle.width/2, y: obstacle.y - obstacle.height/2, width: obstacle.width, height: obstacle.height }
            )) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Utility method to check bullet-obstacle collision
     * @param {Object} projectile - The projectile to check
     * @returns {boolean} - True if collision detected
     */
    checkBulletObstacleCollision(projectile) {
        if (!projectile || !projectile.active) return false;
        
        // Create a circle for the projectile
        const projectileCircle = {
            x: projectile.x,
            y: projectile.y, 
            radius: projectile.radius || 5
        };
        
        // Check against each obstacle
        for (const obstacle of this.obstacles) {
            if (this.physics.checkCircleRectCollision(projectileCircle, obstacle)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check collision between an enemy projectile and walls
     * @param {Object} projectile - The projectile to check
     * @returns {boolean} - Whether a collision occurred
     */
    checkEnemyProjectileWallCollision(projectile) {
        if (!projectile.active) return false;
        
        // Create a projectile hitbox for physics-based collision detection
        const projectileHitbox = {
            x: projectile.x,
            y: projectile.y,
            radius: projectile.radius
        };
        
        // Check collision with walls directly
        // Top wall
        const topWall = { x: 0, y: 0, width: this.width, height: this.wallThickness };
        if (this.physics.checkCircleRectCollision(projectileHitbox, topWall)) {
            projectile.active = false;
            return true;
        }
        
        // Bottom wall
        const bottomWall = { x: 0, y: this.height - this.wallThickness, width: this.width, height: this.wallThickness };
        if (this.physics.checkCircleRectCollision(projectileHitbox, bottomWall)) {
            projectile.active = false;
            return true;
        }
        
        // Left wall
        const leftWall = { x: 0, y: 0, width: this.wallThickness, height: this.height };
        if (this.physics.checkCircleRectCollision(projectileHitbox, leftWall)) {
            projectile.active = false;
            return true;
        }
        
        // Right wall
        const rightWall = { x: this.width - this.wallThickness, y: 0, width: this.wallThickness, height: this.height };
        if (this.physics.checkCircleRectCollision(projectileHitbox, rightWall)) {
            projectile.active = false;
            return true;
        }
        
        // Check for obstacles collision
        if (this.obstacles && this.obstacles.length > 0) {
            for (const obstacle of this.obstacles) {
                if (this.physics.checkCircleRectCollision(projectileHitbox, obstacle)) {
                    projectile.active = false;
                    return true;
                }
            }
        }
        
        // Check for locked door collision
        for (let i = 0; i < this.doors.length; i++) {
            const door = this.doors[i];
            if (!door.locked) continue; // Skip unlocked doors
            
            try {
                // We use our previously defined getDoorRectangle method
                const doorRect = this.getDoorRectangle(i);
                if (this.physics.checkCircleRectCollision(projectileHitbox, doorRect)) {
                    projectile.active = false;
                    return true;
                }
            } catch (e) {
                console.error(`Error checking door collision: ${e.message}`);
                // Continue execution without crashing
            }
        }
        
        return false;
    }
    
    /**
     * Get the walls of the room for collision detection
     * @returns {Array} Array of wall objects with x, y, width, height properties
     */
    getWallRectangles() {
        const walls = [
            // Top wall
            { x: 0, y: 0, width: this.width, height: this.wallThickness },
            // Bottom wall
            { x: 0, y: this.height - this.wallThickness, width: this.width, height: this.wallThickness },
            // Left wall
            { x: 0, y: 0, width: this.wallThickness, height: this.height },
            // Right wall
            { x: this.width - this.wallThickness, y: 0, width: this.wallThickness, height: this.height }
        ];
        
        return walls;
    }
    
    /**
     * Handles boundary collisions for enemies
     * @param {Enemy} enemy - The enemy to check for collisions
     * @returns {boolean} Whether a collision was detected and handled
     */
    handleEnemyBoundaryCollisions(enemy) {
        if (!enemy.active || enemy.dying) return false;
        
        const enemyHalfWidth = enemy.width / 2;
        const enemyHalfHeight = enemy.height / 2;
        let collided = false;
        
        // Create enemy hitbox for collision detection
        const enemyHitbox = {
            x: enemy.x - enemyHalfWidth,
            y: enemy.y - enemyHalfHeight,
            width: enemy.width,
            height: enemy.height
        };
        
        // Check collisions with walls
        for (const wall of this.getWallBoundaries()) {
            if (this.physics.checkRectCollision(enemyHitbox, wall)) {
                // Handle wall collision
                if (wall.x <= 0 || wall.x + wall.width >= this.width) {
                    // Horizontal wall collision
                    if (enemy.x < wall.x + wall.width / 2) {
                        enemy.x = wall.x + wall.width + enemyHalfWidth;
                    } else {
                        enemy.x = wall.x - enemyHalfWidth;
                    }
                    enemy.velocityX = -enemy.velocityX * 0.5; // Bounce with dampening
                } else {
                    // Vertical wall collision
                    if (enemy.y < wall.y + wall.height / 2) {
                        enemy.y = wall.y + wall.height + enemyHalfHeight;
                    } else {
                        enemy.y = wall.y - enemyHalfHeight;
                    }
                    enemy.velocityY = -enemy.velocityY * 0.5; // Bounce with dampening
                }
                collided = true;
            }
        }
        
        // Check collisions with obstacles
        for (const obstacle of this.obstacles) {
            const obstacleHitbox = {
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
            };
            
            if (this.physics.checkRectCollision(enemyHitbox, obstacleHitbox)) {
                // Calculate the overlap on each axis
                const dx = enemy.x - obstacleHitbox.x;
                const dy = enemy.y - obstacleHitbox.y;
                
                // Determine which side of the obstacle was hit
                if (Math.abs(dx) / (obstacleHitbox.width / 2) > Math.abs(dy) / (obstacleHitbox.height / 2)) {
                    // Horizontal collision
                    if (dx > 0) {
                        // Collided with left side of obstacle
                        enemy.x = obstacleHitbox.x + obstacleHitbox.width / 2 + enemyHalfWidth;
                        enemy.velocityX = Math.abs(enemy.velocityX); // Force velocity away from obstacle
                    } else {
                        // Collided with right side of obstacle
                        enemy.x = obstacleHitbox.x - obstacleHitbox.width / 2 - enemyHalfWidth;
                        enemy.velocityX = -Math.abs(enemy.velocityX); // Force velocity away from obstacle
                    }
                } else {
                    // Vertical collision
                    if (dy > 0) {
                        // Collided with top side of obstacle
                        enemy.y = obstacleHitbox.y + obstacleHitbox.height / 2 + enemyHalfHeight;
                        enemy.velocityY = Math.abs(enemy.velocityY); // Force velocity away from obstacle
                    } else {
                        // Collided with bottom side of obstacle
                        enemy.y = obstacleHitbox.y - obstacleHitbox.height / 2 - enemyHalfHeight;
                        enemy.velocityY = -Math.abs(enemy.velocityY); // Force velocity away from obstacle
                    }
                }
                
                collided = true;
            }
        }
        
        return collided;
    }
    
    /**
     * Returns an array of wall boundary rectangles for collision detection
     * @returns {Array} Wall boundaries
     */
    getWallBoundaries() {
        return [
            // Left wall
            { x: 0, y: 0, width: this.wallThickness, height: this.height },
            // Right wall
            { x: this.width - this.wallThickness, y: 0, width: this.wallThickness, height: this.height },
            // Top wall
            { x: 0, y: 0, width: this.width, height: this.wallThickness },
            // Bottom wall
            { x: 0, y: this.height - this.wallThickness, width: this.width, height: this.wallThickness }
        ];
    }
    
    render(renderer, deltaTime, game) {
        // ULTIMATE FIX: Force item-obstacle collision check at the very beginning
        // This ensures items are properly placed before any rendering occurs
        this.fixItemPlacements();
        
        // Make it even safer by checking twice
        for (let i = 0; i < 2; i++) {
            if (this.items && this.items.length > 0) {
                for (const item of this.items) {
                    if (item && !item.collected) {
                        // Emergency check - if item is still on obstacle, force to center
                        if (this._isItemCollidingWithAnyObstacle(item)) {
                            console.warn("EMERGENCY: Item at (${Math.round(item.x)}, ${Math.round(item.y)}) still on obstacle - forcing to center");
                            item.x = this.width / 2 + (Math.random() - 0.5) * 100;
                            item.y = this.height / 2 + (Math.random() - 0.5) * 100;
                        }
                    }
                }
            }
        }
        
        // Run the original collision checks if defined
        if (this._checkItemObstacleCollisions) {
            this._checkItemObstacleCollisions();
        }
        
        // Draw room background (floor)
        let ctx;
        if (renderer.ctx) {
            // If renderer is a Renderer object with ctx property
            ctx = renderer.ctx;
        } else {
            // If renderer is already a context
            ctx = renderer;
        }
        
        ctx.fillStyle = '#1a0a2a'; // Dark background color with slight purple tint
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw room walls
        ctx.fillStyle = this.wallColor;
        
        // Top wall
        ctx.fillRect(0, 0, this.width, this.wallThickness);
        
        // Bottom wall
        ctx.fillRect(0, this.height - this.wallThickness, this.width, this.wallThickness);
        
        // Left wall
        ctx.fillRect(0, 0, this.wallThickness, this.height);
        
        // Right wall
        ctx.fillRect(this.width - this.wallThickness, 0, this.wallThickness, this.height);
        
        // Draw obstacles (must be before doors to ensure doors are visible)
        if (this.obstacles && this.obstacles.length > 0) {
            for (const obstacle of this.obstacles) {
                // Save context for glow effects
                ctx.save();
                
                // Add neon glow effect
                ctx.shadowColor = this.obstacleColor;
                ctx.shadowBlur = 15;
                
                // Draw the obstacle base
                ctx.fillStyle = '#220033'; // Dark purple base
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Draw neon border
                ctx.strokeStyle = this.obstacleColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Add a highlight edge for better visibility
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.7;
                ctx.strokeRect(
                    obstacle.x + 2, 
                    obstacle.y + 2, 
                    obstacle.width - 4, 
                    obstacle.height - 4
                );
                
                // Restore context
                ctx.restore();
            }
        }
        
        // Draw doors
        for (const door of this.doors) {
            // Choose door color based on locked state
            const baseColor = door.locked ? this.doorColor : this.unlockedDoorColor;
            ctx.fillStyle = baseColor;
            
            // Save context for glow effects
            ctx.save();
            
            // Add subtle glow effect for both locked and unlocked doors
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 10;
            
            // Doors use centered coordinates, so we need to offset by half width/height
            ctx.fillRect(
                door.x - door.width / 2, 
                door.y - door.height / 2, 
                door.width, 
                door.height
            );
            
            // If door is unlocked, draw a more vibrant glow effect
            if (!door.locked) {
                ctx.restore(); // Restore before creating new effects
                ctx.save();
                
                // Create a subtle glow around the unlocked door
                const gradient = ctx.createRadialGradient(door.x, door.y, 10, door.x, door.y, 50);
                gradient.addColorStop(0, 'rgba(51, 255, 119, 0.4)'); // Match unlockedDoorColor
                gradient.addColorStop(1, 'rgba(51, 255, 119, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(door.x, door.y, 50, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
        
        // IMPORTANT: Directly render all enemy projectiles
        this.renderAllProjectiles(ctx);
        
        // Draw items
        if (this.items && this.items.length > 0) {
            for (const item of this.items) {
                if (!item.collected) {
                    // Save context for effects
                    ctx.save();
                    
                    // Add neon glow effect
                    ctx.shadowColor = item.color || '#ff00ff';
                    ctx.shadowBlur = 15;
                    
                    // Create pulsing effect based on time
                    const time = Date.now();
                    const pulseScale = 0.2 * Math.sin(time / 400) + 1.0;
                    const radius = (item.radius || 8) * pulseScale;
                    
                    // Draw the main item circle
                    ctx.fillStyle = item.color || '#ff00ff';
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add white inner highlight for better visibility
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, radius * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add the symbol in the center
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    let symbol = '+'; // Default to plus sign
                    if (item.symbol) {
                        symbol = item.symbol;
                    } else if (item.effect === 'restoreHealth') symbol = '+';
                    else if (item.effect === 'increaseSpeed') symbol = '⚡';
                    else if (item.effect === 'powerUpWeapon') symbol = '★';
                    
                    ctx.fillText(symbol, item.x, item.y);
                    
                    // Restore context
                    ctx.restore();
                }
            }
        }
        
        // Draw enemies
        for (const enemy of this.enemies) {
            if (enemy && enemy.render && typeof enemy.render === 'function') {
                // Don't call renderProjectiles from enemy - we already rendered them
                enemy.render(ctx);
            }
        }
    }
    
    /**
     * Renders all enemy projectiles directly to ensure visibility
     * @param {CanvasRenderingContext2D} ctx - Canvas context to render on
     */
    renderAllProjectiles(ctx) {
        let totalProjectiles = 0;
        
        // Save the context state
        ctx.save();
        
        // Loop through all enemies
        for (const enemy of this.enemies) {
            if (!enemy.projectiles || !Array.isArray(enemy.projectiles) || enemy.projectiles.length === 0) {
                continue;
            }
            
            // Log how many projectiles we're trying to render
            console.log(`Rendering ${enemy.projectiles.length} projectiles for enemy at (${enemy.x.toFixed(1)},${enemy.y.toFixed(1)})`);
            totalProjectiles += enemy.projectiles.length;
            
            // Render each projectile with enhanced visibility
            for (const projectile of enemy.projectiles) {
                if (!projectile.active) continue;
                
                // Draw the projectile with high visibility
                const x = projectile.x;
                const y = projectile.y;
                const radius = projectile.radius || 8;
                const color = projectile.color || '#00ff88';
                
                // Debug log for first couple of projectiles
                if (totalProjectiles <= 3) {
                    console.log(`Drawing projectile at (${x.toFixed(1)},${y.toFixed(1)}), radius: ${radius}, color: ${color}`);
                }
                
                // Outer glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                
                // Main projectile circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner white core for better visibility
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Add direction trail
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(
                    x - (projectile.dirX || 0) * 5,
                    y - (projectile.dirY || 0) * 5,
                    radius * 0.7,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                // Reset for next projectile
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
                
                // Special handling for debug projectiles
                if (projectile.isDebug) {
                    // Extra visible outline
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Direction indicator
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(
                        x + (projectile.dirX || 0) * 20,
                        y + (projectile.dirY || 0) * 20
                    );
                    ctx.stroke();
                }
            }
        }
        
        // Log total projectiles rendered
        if (totalProjectiles > 0) {
            console.log(`Total projectiles rendered: ${totalProjectiles}`);
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - The keydown event
     * @param {Object} player - The player object
     */
    handleKeyDown(event, player) {
        // Handle specific debug keys
        if (event.key === 'p' || event.key === 'P') {
            this.fireDebugProjectile(player);
        }
        
        // Other key handling logic here...
    }
    
    /**
     * Fires a highly visible test projectile from each patrol enemy
     * @param {Object} player - The player to target
     */
    fireDebugProjectile(player) {
        let count = 0;
        
        // Find patrol enemies and make them fire
        for (const enemy of this.enemies) {
            if (enemy.type === 'patrol' && enemy.active) {
                // Create a special large, bright projectile aimed at player
                const dirX = player.x - enemy.x;
                const dirY = player.y - enemy.y;
                
                // Normalize direction
                const length = Math.sqrt(dirX * dirX + dirY * dirY);
                if (length === 0) continue;
                
                const normalizedDirX = dirX / length;
                const normalizedDirY = dirY / length;
                
                // Create an extra large, bright projectile
                enemy.projectiles.push({
                    x: enemy.x,
                    y: enemy.y,
                    dirX: normalizedDirX,
                    dirY: normalizedDirY,
                    speed: 100, // Slower for visibility
                    radius: 15, // Much larger
                    damage: 20,
                    color: '#ff00ff', // Bright magenta
                    active: true,
                    lifespan: 10000, // 10 seconds
                    age: 0,
                    isDebug: true // Mark as debug projectile
                });
                
                count++;
                console.log(`DEBUG: Fired test projectile from patrol enemy at (${enemy.x.toFixed(1)},${enemy.y.toFixed(1)}) toward player at (${player.x.toFixed(1)},${player.y.toFixed(1)})`);
            }
        }
        
        console.log(`DEBUG: Fired ${count} test projectiles from patrol enemies`);
    }
    
    /**
     * Get rectangle for a specific door
     * @param {number} doorIndex - Index of the door (0=top, 1=right, 2=bottom, 3=left)
     * @returns {Object} Rectangle representing the door
     */
    getDoorRectangle(doorIndex) {
        const doorWidth = 100; // Width of door opening
        const centerOffset = doorWidth / 2;
        
        // Calculate door position based on index
        switch (doorIndex) {
            case 0: // Top door
                return {
                    x: this.width / 2 - centerOffset,
                    y: 0,
                    width: doorWidth,
                    height: this.wallThickness
                };
            case 1: // Right door
                return {
                    x: this.width - this.wallThickness,
                    y: this.height / 2 - centerOffset,
                    width: this.wallThickness,
                    height: doorWidth
                };
            case 2: // Bottom door
                return {
                    x: this.width / 2 - centerOffset,
                    y: this.height - this.wallThickness,
                    width: doorWidth,
                    height: this.wallThickness
                };
            case 3: // Left door
                return {
                    x: 0,
                    y: this.height / 2 - centerOffset,
                    width: this.wallThickness,
                    height: doorWidth
                };
            default:
                console.error(`Invalid door index: ${doorIndex}`);
                return { x: 0, y: 0, width: 0, height: 0 }; // Return empty rectangle for invalid index
        }
    }
    
    /**
     * Check collision between an enemy projectile and walls
     * @param {Object} projectile - The projectile to check
     * @returns {boolean} - Whether a collision occurred
     */
    checkEnemyProjectileWallCollision(projectile) {
        if (!projectile.active) return false;
        
        // Create a projectile hitbox for physics-based collision detection
        const projectileHitbox = {
            x: projectile.x,
            y: projectile.y,
            radius: projectile.radius
        };
        
        // Check collision with walls directly
        // Top wall
        const topWall = { x: 0, y: 0, width: this.width, height: this.wallThickness };
        if (this.physics.checkCircleRectCollision(projectileHitbox, topWall)) {
            projectile.active = false;
            return true;
        }
        
        // Bottom wall
        const bottomWall = { x: 0, y: this.height - this.wallThickness, width: this.width, height: this.wallThickness };
        if (this.physics.checkCircleRectCollision(projectileHitbox, bottomWall)) {
            projectile.active = false;
            return true;
        }
        
        // Left wall
        const leftWall = { x: 0, y: 0, width: this.wallThickness, height: this.height };
        if (this.physics.checkCircleRectCollision(projectileHitbox, leftWall)) {
            projectile.active = false;
            return true;
        }
        
        // Right wall
        const rightWall = { x: this.width - this.wallThickness, y: 0, width: this.wallThickness, height: this.height };
        if (this.physics.checkCircleRectCollision(projectileHitbox, rightWall)) {
            projectile.active = false;
            return true;
        }
        
        // Check for obstacles collision
        if (this.obstacles && this.obstacles.length > 0) {
            for (const obstacle of this.obstacles) {
                if (this.physics.checkCircleRectCollision(projectileHitbox, obstacle)) {
                    projectile.active = false;
                    return true;
                }
            }
        }
        
        // Check for locked door collision
        for (let i = 0; i < this.doors.length; i++) {
            const door = this.doors[i];
            if (!door.locked) continue; // Skip unlocked doors
            
            try {
                // We use our previously defined getDoorRectangle method
                const doorRect = this.getDoorRectangle(i);
                if (this.physics.checkCircleRectCollision(projectileHitbox, doorRect)) {
                    projectile.active = false;
                    return true;
                }
            } catch (e) {
                console.error(`Error checking door collision: ${e.message}`);
                // Continue execution without crashing
            }
        }
        
        return false;
    }
    
    /**
     * Handle enemy projectiles for collision detection and damage
     * @param {Object} enemy - The enemy object
     * @param {Object} player - The player object
     * @param {number} deltaTime - Time since last frame in seconds
     */
    handleEnemyProjectiles(enemy, player, deltaTime) {
        if (!enemy.projectiles || enemy.projectiles.length === 0) return;
        
        // Check each projectile
        for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
            const projectile = enemy.projectiles[i];
            if (!projectile.active) continue;
            
            // Check collision with player
            if (player.active && !player.invulnerable) {
                // Simple circle collision check
                const dx = player.x - projectile.x;
                const dy = player.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check player has radius property, otherwise use a default
                const playerRadius = player.radius || 20;
                
                if (distance < playerRadius + projectile.radius) {
                    // Player hit by projectile
                    try {
                        player.takeDamage(projectile.damage);
                    } catch (e) {
                        console.warn("Error when player takes damage:", e);
                    }
                    projectile.active = false;
                    
                    // Create hit effect if effects manager available
                    if (this.effects) {
                        try {
                            // Try different effect methods that might be available
                            if (typeof this.effects.createPlayerHitEffect === 'function') {
                                this.effects.createPlayerHitEffect(player.x, player.y);
                            } else if (typeof this.effects.createParticleBurst === 'function') {
                                this.effects.createParticleBurst(
                                    player.x, player.y,
                                    10, // particles
                                    { color: projectile.color || '#ff0000' }
                                );
                            }
                        } catch (e) {
                            console.warn("Error creating hit effect:", e);
                        }
                    }
                    
                    continue; // Skip wall collision check
                }
            }
            
            // Check collision with obstacles/walls
            for (const obstacle of this.obstacles) {
                // Rectangle-circle collision
                const closestX = Math.max(obstacle.x, Math.min(projectile.x, obstacle.x + obstacle.width));
                const closestY = Math.max(obstacle.y, Math.min(projectile.y, obstacle.y + obstacle.height));
                
                const distanceX = projectile.x - closestX;
                const distanceY = projectile.y - closestY;
                const distanceSquared = distanceX * distanceX + distanceY * distanceY;
                
                if (distanceSquared < projectile.radius * projectile.radius) {
                    // Projectile hit obstacle
                    projectile.active = false;
                    
                    // Create impact effect if effects manager available
                    if (this.effects) {
                        try {
                            // Try different effect methods that might be available
                            if (typeof this.effects.createImpactEffect === 'function') {
                                this.effects.createImpactEffect(closestX, closestY, projectile.color);
                            } else if (typeof this.effects.createParticleBurst === 'function') {
                                this.effects.createParticleBurst(
                                    closestX, closestY,
                                    5, // particles
                                    { color: projectile.color || '#ffffff' }
                                );
                            } else if (typeof this.effects.createGlowEffect === 'function') {
                                this.effects.createGlowEffect(
                                    closestX, closestY,
                                    8, // radius
                                    projectile.color || '#ffffff',
                                    0.7 // intensity
                                );
                            }
                        } catch (e) {
                            // Silently fail if effects methods fail
                            console.log("Projectile hit effect failed:", e);
                        }
                    }
                    
                    break;
                }
            }
            
            // Check if projectile is out of bounds
            if (
                projectile.x < 0 || 
                projectile.x > this.width || 
                projectile.y < 0 || 
                projectile.y > this.height
            ) {
                projectile.active = false;
            }
        }
    }
    
    /**
     * Fix item placements to prevent overlap with obstacles
     */
    fixItemPlacements() {
        // CRITICAL: Need to handle case where items array might be undefined or empty
        if (!this.items || this.items.length === 0) return;
        
        let fixedItemCount = 0;
        
        for (const item of this.items) {
            if (!item.collected) {
                let itemMoved = false;
                
                // Check if item is colliding with ANY obstacle, and move it if it is
                for (const obs of this.obstacles) {
                    const obsX = obs.x;
                    const obsY = obs.y;
                    const obsWidth = obs.width || 40;
                    const obsHeight = obs.height || 40;
                    
                    // Calculate distance between item and obstacle
                    const distX = Math.abs(item.x - obsX);
                    const distY = Math.abs(item.y - obsY);
                    const radius = item.radius || 10;
                    
                    // INCREASED SAFETY MARGIN: Much larger padding to keep items far from obstacles
                    const safetyMargin = 40; // Extra safety margin on top of radius
                    
                    // If item is overlapping with obstacle OR even close to it
                    if (distX < (obsWidth/2 + radius + safetyMargin) && distY < (obsHeight/2 + radius + safetyMargin)) {
                        console.error(`Found item too close to obstacle! Moving from (${item.x}, ${item.y})`);
                        
                        // Calculate direction away from obstacle
                        let dirX = item.x - obsX;
                        let dirY = item.y - obsY;
                        
                        // If item is at exact same position as obstacle, pick random direction
                        if (dirX === 0 && dirY === 0) {
                            const angle = Math.random() * Math.PI * 2;
                            dirX = Math.cos(angle);
                            dirY = Math.sin(angle);
                        }
                        
                        // Calculate distance for normalization
                        const dist = Math.sqrt(dirX * dirX + dirY * dirY);
                        
                        // Normalize direction and multiply by safe distance
                        // CRITICAL: Much larger safety distance 
                        const safeDistance = Math.max(obsWidth, obsHeight)/2 + radius + 80;
                        
                        // Calculate new position
                        item.x = obsX + (dirX / dist) * safeDistance;
                        item.y = obsY + (dirY / dist) * safeDistance;
                        
                        // Ensure within room bounds
                        const padding = 80;
                        item.x = Math.max(padding, Math.min(this.width - padding, item.x));
                        item.y = Math.max(padding, Math.min(this.height - padding, item.y));
                        
                        console.log(`Moved item to (${item.x}, ${item.y})`);
                        itemMoved = true;
                        fixedItemCount++;
                    }
                }
                
                // CRITICAL: if we couldn't move the item safely, force it to center
                if (itemMoved && this._isItemCollidingWithAnyObstacle(item)) {
                    console.warn("EMERGENCY: Item still colliding after move attempt - forcing to center");
                    item.x = this.width / 2 + (Math.random() - 0.5) * 40;
                    item.y = this.height / 2 + (Math.random() - 0.5) * 40;
                }
            }
        }
        
        if (fixedItemCount > 0) {
            console.log(`Fixed ${fixedItemCount} item positions to prevent obstacle overlap`);
        }
    }
    
    /**
     * Helper method to check if item collides with any obstacle
     * @param {Object} item - The item to check
     * @returns {boolean} - True if colliding with any obstacle
     */
    _isItemCollidingWithAnyObstacle(item) {
        if (!item || !this.obstacles) return false;
        
        const radius = item.radius || 10;
        
        for (const obs of this.obstacles) {
            const obsX = obs.x;
            const obsY = obs.y;
            const obsWidth = obs.width || 40;
            const obsHeight = obs.height || 40;
            
            // Calculate distance between item and obstacle
            const distX = Math.abs(item.x - obsX);
            const distY = Math.abs(item.y - obsY);
            
            // Simple collision check
            if (distX < (obsWidth/2 + radius) && distY < (obsHeight/2 + radius)) {
                return true;
            }
        }
        
        return false;
    }
}
