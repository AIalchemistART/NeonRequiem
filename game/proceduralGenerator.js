// proceduralGenerator.js - Procedural generation system for Neon Requiem
// Import seedrandom from CDN in index.html

export class ProceduralGenerator {
    constructor(seed) {
        this.seed = seed || Math.random().toString(36).substring(2, 15);
        this.random = new Math.seedrandom(this.seed);
        
        // Room templates with predefined obstacle patterns
        this.roomTemplates = [
            'empty',       // No obstacles
            'corners',     // Obstacles in corners
            'cross',       // Cross-shaped obstacle pattern
            'pillars',     // Several pillar obstacles
            'asymmetric',  // Asymmetric obstacle layout
            'maze'         // Complex maze-like pattern
        ];
        
        // Item type definitions
        this.itemTypes = {
            health: { weight: 5, color: '#ff0000', radius: 10, effect: 'restoreHealth' },
            speedBoost: { weight: 3, color: '#00ffff', radius: 8, effect: 'increaseSpeed' },
            shield: { weight: 2, color: '#ffff00', radius: 12, effect: 'addShield' },
            ammo: { weight: 4, color: '#00ff00', radius: 8, effect: 'addAmmo' }
        };
        
        // Direction mappings for room connections
        this.directions = {
            0: { name: 'north', opposite: 2 },
            1: { name: 'east', opposite: 3 },
            2: { name: 'south', opposite: 0 },
            3: { name: 'west', opposite: 1 }
        };
    }

    // Random number generator method (0 to 1)
    getRandom() {
        return this.random();
    }

    /**
     * Generate a dungeon-like structure with connected rooms
     * @param {number} numRooms - Number of rooms to generate
     * @param {Object} options - Optional settings for dungeon generation
     * @param {Object} playerStats - Optional player statistics to influence item generation
     * @returns {Object} Dungeon configuration with connected rooms
     */
    generateDungeon(numRooms, options = {}, playerStats = null) {
        console.log(`Generating dungeon with ${numRooms} rooms`);
        
        // Set default options
        const defaultOptions = {
            width: 800,
            height: 600,
            minDifficulty: 1,
            maxDifficulty: 10,
            startRoomDifficulty: 1,
            bossRoomDifficulty: 8,
            includeBossRoom: numRooms >= 5, // Only include boss room if dungeon has enough rooms
            gridColumns: 5,
            gridRows: 5
        };
        
        const config = { ...defaultOptions, ...options };
        
        // Initialize the dungeon structure
        const dungeon = {
            rooms: [],
            connections: {}, // Maps roomId -> { direction: connectedRoomId }
            currentRoomId: 0,
            startRoomId: 0,
            bossRoomId: config.includeBossRoom ? numRooms - 1 : -1,
            grid: {}
        };
        
        // Create a grid-based layout for room placement (x, y coordinates in a virtual grid)
        // This helps prevent overlapping rooms in the conceptual space
        const grid = [];
        for (let y = 0; y < config.gridRows; y++) {
            grid[y] = [];
            for (let x = 0; x < config.gridColumns; x++) {
                grid[y][x] = null; // No room placed here initially
            }
        }
        
        // Place the starting room in the center of the grid
        const centerX = Math.floor(config.gridColumns / 2);
        const centerY = Math.floor(config.gridRows / 2);
        grid[centerY][centerX] = 0; // Room ID 0 for the starting room
        
        // Starting room
        const startRoom = this.generateRoom(
            config.width, 
            config.height, 
            config.startRoomDifficulty,
            config.width / 2,
            config.height / 2
        );
        
        // For the starting room, we want to ensure some basic supplies
        // regardless of player stats (since this is the first room)
        if (startRoom.items.length === 0) {
            // Generate some balanced starting items
            this.generateItems(startRoom, config.startRoomDifficulty, playerStats || {
                health: 100,
                maxHealth: 100,
                ammo: 30,
                maxAmmo: 30
            });
            
            // Ensure at least one health item in the starting room
            let hasHealthItem = false;
            for (const item of startRoom.items) {
                if (item.type === 'health') {
                    hasHealthItem = true;
                    break;
                }
            }
            
            if (!hasHealthItem) {
                const healthInfo = this.itemTypes.health;
                // Place a health item in a safe spot
                const x = config.width / 2 + (this.getRandom() * 100 - 50);
                const y = config.height / 2 + (this.getRandom() * 100 - 50);
                
                startRoom.items.push({
                    x, y,
                    type: 'health',
                    color: healthInfo.color,
                    radius: healthInfo.radius,
                    effect: healthInfo.effect
                });
                
                console.log(`Added guaranteed health item to starting room at (${Math.round(x)}, ${Math.round(y)})`);
            }
        }
        
        startRoom.id = 0;
        startRoom.gridX = centerX;
        startRoom.gridY = centerY;
        startRoom.isStartRoom = true;
        startRoom.difficulty = config.startRoomDifficulty;
        dungeon.rooms.push(startRoom);
        dungeon.connections[0] = {}; // Initialize connections for starting room
        
        // Queue of rooms to process (start with room 0)
        const roomQueue = [{ id: 0, gridX: centerX, gridY: centerY }];
        const placedRooms = 1; // We've already placed the starting room
        
        // Place remaining rooms using a breadth-first approach
        while (roomQueue.length > 0 && dungeon.rooms.length < numRooms) {
            const currentRoom = roomQueue.shift();
            
            // Try to place rooms in each direction
            const directions = [0, 1, 2, 3]; // north, east, south, west
            
            // Shuffle directions for more organic layouts
            this.shuffleArray(directions);
            
            for (const dir of directions) {
                // Skip if we've already reached the max number of rooms
                if (dungeon.rooms.length >= numRooms) break;
                
                // Calculate new grid position
                let newX = currentRoom.gridX;
                let newY = currentRoom.gridY;
                
                switch (dir) {
                    case 0: newY--; break; // North
                    case 1: newX++; break; // East
                    case 2: newY++; break; // South
                    case 3: newX--; break; // West
                }
                
                // Check if the position is within grid bounds
                if (newX < 0 || newX >= config.gridColumns || newY < 0 || newY >= config.gridRows) {
                    continue;
                }
                
                // Check if there's already a room at this grid position
                if (grid[newY][newX] !== null) {
                    continue;
                }
                
                // Calculate room difficulty based on distance from start (with some randomness)
                const distanceFromStart = Math.abs(newX - centerX) + Math.abs(newY - centerY);
                let roomDifficulty = Math.min(
                    config.maxDifficulty,
                    config.minDifficulty + distanceFromStart + Math.floor(this.getRandom() * 2)
                );
                
                // Create a new room
                const newRoomId = dungeon.rooms.length;
                const newRoom = this.generateRoom(
                    config.width, 
                    config.height, 
                    roomDifficulty,
                    config.width / 2,
                    config.height / 2
                );
                
                // Set the room's properties
                newRoom.id = newRoomId;
                newRoom.gridX = newX;
                newRoom.gridY = newY;
                newRoom.difficulty = roomDifficulty;
                
                // Special handling for a boss room
                if (config.includeBossRoom && newRoomId === numRooms - 1) {
                    newRoom.isBossRoom = true;
                    newRoom.difficulty = config.bossRoomDifficulty;
                    
                    // Enhanced boss room (more difficult enemies, special visuals, etc.)
                    // Could be expanded for custom boss room generation
                    newRoom.enemies = newRoom.enemies.map(enemy => {
                        // Make some enemies stronger for the boss room
                        if (this.getRandom() < 0.5) {
                            enemy.health = (enemy.health || 100) * 1.5;
                            enemy.type = 'strong';
                        }
                        return enemy;
                    });
                    
                    // Add a "boss" enemy
                    newRoom.enemies.push({
                        x: config.width / 2,
                        y: config.height / 2,
                        type: 'boss',
                        health: 300,
                        active: true
                    });
                    
                    // Set boss room ID
                    dungeon.bossRoomId = newRoomId;
                }
                
                // Add the room to the dungeon
                dungeon.rooms.push(newRoom);
                grid[newY][newX] = newRoomId;
                
                // Connect rooms in both directions
                // Current room connects to new room via dir
                if (!dungeon.connections[currentRoom.id]) {
                    dungeon.connections[currentRoom.id] = {};
                }
                dungeon.connections[currentRoom.id][dir] = newRoomId;
                
                // New room connects to current room via opposite direction
                if (!dungeon.connections[newRoomId]) {
                    dungeon.connections[newRoomId] = {};
                }
                const oppositeDir = this.directions[dir].opposite;
                dungeon.connections[newRoomId][oppositeDir] = currentRoom.id;
                
                // Add the new room to the processing queue
                roomQueue.push({ id: newRoomId, gridX: newX, gridY: newY });
            }
        }
        
        // Store grid information for debugging/visualization
        dungeon.gridInfo = {
            grid,
            columns: config.gridColumns,
            rows: config.gridRows
        };
        
        // Ensure all rooms are connected and accessible from the start room
        this.ensureConnectivity(dungeon);
        
        // For each room (except the first which we've already handled),
        // adjust the item generation based on distance from start
        for (let i = 1; i < dungeon.rooms.length; i++) {
            const room = dungeon.rooms[i];
            
            // Regenerate items with balanced distribution 
            // The farther from start, simulate lower health/ammo
            if (playerStats) {
                // Clone player stats so we don't modify the original
                const adjustedStats = { ...playerStats };
                
                // Calculate distance from start room
                const distFromStart = Math.abs(room.gridX - centerX) + Math.abs(room.gridY - centerY);
                const difficultyFactor = distFromStart / (config.gridColumns + config.gridRows) * 2;
                
                // Simulate lower health/ammo in rooms farther from start to compensate difficulty
                // This helps place more recovery items in harder rooms
                if (adjustedStats.health !== undefined && adjustedStats.maxHealth !== undefined) {
                    adjustedStats.health = Math.max(
                        adjustedStats.maxHealth * 0.3, 
                        adjustedStats.health * (1 - difficultyFactor * 0.3)
                    );
                }
                
                if (adjustedStats.ammo !== undefined && adjustedStats.maxAmmo !== undefined) {
                    adjustedStats.ammo = Math.max(
                        adjustedStats.maxAmmo * 0.2,
                        adjustedStats.ammo * (1 - difficultyFactor * 0.4)
                    );
                }
                
                // Clear existing items
                room.items = [];
                
                // Generate items with adjusted stats
                this.generateItems(room, room.difficulty, adjustedStats);
                
                console.log(`Rebalanced items in room ${i} (distance ${distFromStart}) with adjusted health: ${
                    Math.round(adjustedStats.health)}, ammo: ${Math.round(adjustedStats.ammo)}`);
            }
        }
        
        console.log(`Generated dungeon with ${dungeon.rooms.length} rooms`);
        
        // Log connections for debugging
        console.log('Room connections:');
        for (const [roomId, connections] of Object.entries(dungeon.connections)) {
            const connectionsString = Object.entries(connections)
                .map(([dir, targetId]) => `${this.directions[dir].name} -> Room ${targetId}`)
                .join(', ');
            console.log(`Room ${roomId}: ${connectionsString}`);
        }
        
        return dungeon;
    }
    
    /**
     * Ensure all rooms in the dungeon are connected and accessible from the start room
     * @param {Object} dungeon - The dungeon to check/modify
     */
    ensureConnectivity(dungeon) {
        // Use a breadth-first search to find all accessible rooms from the start
        const visited = new Set();
        const queue = [dungeon.startRoomId];
        visited.add(dungeon.startRoomId);
        
        while (queue.length > 0) {
            const roomId = queue.shift();
            const connections = dungeon.connections[roomId] || {};
            
            for (const [_, connectedRoomId] of Object.entries(connections)) {
                if (!visited.has(connectedRoomId)) {
                    visited.add(connectedRoomId);
                    queue.push(connectedRoomId);
                }
            }
        }
        
        // Check if all rooms are accessible
        const allRoomsAccessible = visited.size === dungeon.rooms.length;
        
        if (!allRoomsAccessible) {
            console.warn('Not all rooms are accessible! Adding additional connections...');
            
            // Find inaccessible rooms
            const inaccessibleRooms = dungeon.rooms
                .filter(room => !visited.has(room.id))
                .map(room => room.id);
                
            // For each inaccessible room, connect it to an accessible room
            for (const inaccessibleId of inaccessibleRooms) {
                const inaccessibleRoom = dungeon.rooms[inaccessibleId];
                
                // Find the closest accessible room (using grid coordinates)
                let closestAccessibleId = null;
                let shortestDistance = Infinity;
                
                for (const accessibleId of visited) {
                    const accessibleRoom = dungeon.rooms[accessibleId];
                    const distance = 
                        Math.abs(inaccessibleRoom.gridX - accessibleRoom.gridX) + 
                        Math.abs(inaccessibleRoom.gridY - accessibleRoom.gridY);
                        
                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        closestAccessibleId = accessibleId;
                    }
                }
                
                if (closestAccessibleId !== null) {
                    // Determine the best direction to connect
                    const inaccessibleX = inaccessibleRoom.gridX;
                    const inaccessibleY = inaccessibleRoom.gridY;
                    const accessibleX = dungeon.rooms[closestAccessibleId].gridX;
                    const accessibleY = dungeon.rooms[closestAccessibleId].gridY;
                    
                    let connectDir;
                    if (Math.abs(inaccessibleX - accessibleX) > Math.abs(inaccessibleY - accessibleY)) {
                        // Connect horizontally
                        connectDir = inaccessibleX < accessibleX ? 1 : 3; // East or West
                    } else {
                        // Connect vertically
                        connectDir = inaccessibleY < accessibleY ? 2 : 0; // South or North
                    }
                    
                    // Create the connections in both directions
                    if (!dungeon.connections[closestAccessibleId]) {
                        dungeon.connections[closestAccessibleId] = {};
                    }
                    
                    if (!dungeon.connections[inaccessibleId]) {
                        dungeon.connections[inaccessibleId] = {};
                    }
                    
                    dungeon.connections[closestAccessibleId][connectDir] = inaccessibleId;
                    dungeon.connections[inaccessibleId][this.directions[connectDir].opposite] = closestAccessibleId;
                    
                    console.log(`Connected inaccessible room ${inaccessibleId} to accessible room ${closestAccessibleId}`);
                    
                    // Mark as visited
                    visited.add(inaccessibleId);
                }
            }
        }
    }
    
    /**
     * Helper method to shuffle an array in-place
     * @param {Array} array - Array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.getRandom() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Generate a room with procedural content
     * @param {number} width - Room width
     * @param {number} height - Room height
     * @param {number} difficulty - Current game difficulty level
     * @param {number} playerStartX - Player's starting X position
     * @param {number} playerStartY - Player's starting Y position
     * @returns {Object} Room configuration with enemies, items, and obstacles
     */
    generateRoom(width, height, difficulty, playerStartX = width / 2, playerStartY = height / 2) {
        // Basic room structure
        const room = { 
            width, 
            height, 
            enemies: [], 
            items: [],
            obstacles: [],
            template: this.selectRoomTemplate(),
            playerStartX,
            playerStartY
        };
        
        // Generate room layout based on template
        this.generateRoomLayout(room);
        
        // Generate enemies based on difficulty
        this.generateEnemies(room, difficulty);
        
        // Generate items based on difficulty
        this.generateItems(room, difficulty);
        
        return room;
    }
    
    /**
     * Select a room template based on weighted random selection
     * @returns {string} Selected room template
     */
    selectRoomTemplate() {
        // Simple random selection for now, can be enhanced with weights
        const templateIndex = Math.floor(this.getRandom() * this.roomTemplates.length);
        return this.roomTemplates[templateIndex];
    }
    
    /**
     * Generate room layout based on selected template
     * @param {Object} room - Room object to modify
     */
    generateRoomLayout(room) {
        const { width, height, template } = room;
        const padding = 50; // Minimum distance from walls
        
        switch (template) {
            case 'corners':
                // Add obstacles in corners
                const cornerSize = Math.min(width, height) * 0.15;
                room.obstacles.push(
                    { x: padding, y: padding, width: cornerSize, height: cornerSize },
                    { x: width - padding - cornerSize, y: padding, width: cornerSize, height: cornerSize },
                    { x: padding, y: height - padding - cornerSize, width: cornerSize, height: cornerSize },
                    { x: width - padding - cornerSize, y: height - padding - cornerSize, width: cornerSize, height: cornerSize }
                );
                break;
                
            case 'cross':
                // Add cross-shaped obstacle in center
                const crossWidth = width * 0.1;
                const crossHeight = height * 0.6;
                const crossX = (width - crossWidth) / 2;
                const crossY = (height - crossHeight) / 2;
                
                room.obstacles.push(
                    { x: crossX, y: crossY, width: crossWidth, height: crossHeight }, // Vertical part
                    { x: width * 0.2, y: (height - crossWidth) / 2, width: width * 0.6, height: crossWidth } // Horizontal part
                );
                break;
                
            case 'pillars':
                // Add several pillars
                const pillarCount = 4 + Math.floor(this.getRandom() * 3); // 4-6 pillars
                const pillarSize = Math.min(width, height) * 0.08;
                
                for (let i = 0; i < pillarCount; i++) {
                    // Ensure pillars are at least minPillarDistance apart
                    let x, y, valid;
                    const minPillarDistance = pillarSize * 3;
                    let attempts = 0;
                    
                    do {
                        valid = true;
                        x = padding + this.getRandom() * (width - 2 * padding - pillarSize);
                        y = padding + this.getRandom() * (height - 2 * padding - pillarSize);
                        
                        // Check distance from existing pillars
                        for (const obstacle of room.obstacles) {
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
                        room.obstacles.push({ x, y, width: pillarSize, height: pillarSize });
                    }
                }
                break;
                
            case 'asymmetric':
                // Add asymmetric layout
                const barrierWidth = width * 0.05;
                const barrierHeight = height * 0.7;
                const barrierX = width * (0.3 + this.getRandom() * 0.4); // Barrier in middle third
                const barrierY = (height - barrierHeight) / 2;
                
                room.obstacles.push(
                    { x: barrierX, y: barrierY, width: barrierWidth, height: barrierHeight }
                );
                
                // Add some random smaller obstacles
                for (let i = 0; i < 3; i++) {
                    const obstacleSize = Math.min(width, height) * (0.05 + this.getRandom() * 0.05);
                    const x = padding + this.getRandom() * (width - 2 * padding - obstacleSize);
                    const y = padding + this.getRandom() * (height - 2 * padding - obstacleSize);
                    
                    room.obstacles.push({ x, y, width: obstacleSize, height: obstacleSize });
                }
                break;
                
            case 'maze':
                // Create a simple maze-like pattern
                const cellSize = Math.min(width, height) * 0.1;
                const horizontalCells = Math.floor((width - 2 * padding) / cellSize);
                const verticalCells = Math.floor((height - 2 * padding) / cellSize);
                
                // Randomly place walls in a grid pattern
                for (let i = 0; i < horizontalCells; i++) {
                    for (let j = 0; j < verticalCells; j++) {
                        // Skip central area for player movement
                        const isCentral = (i >= horizontalCells / 3 && i <= 2 * horizontalCells / 3) && 
                                         (j >= verticalCells / 3 && j <= 2 * verticalCells / 3);
                                         
                        if (!isCentral && this.getRandom() < 0.3) { // 30% chance for a wall
                            const x = padding + i * cellSize;
                            const y = padding + j * cellSize;
                            const width = this.getRandom() < 0.5 ? cellSize : cellSize * 0.5;
                            const height = this.getRandom() < 0.5 ? cellSize * 0.5 : cellSize;
                            
                            room.obstacles.push({ x, y, width, height });
                        }
                    }
                }
                break;
                
            case 'empty':
            default:
                // No obstacles
                break;
        }
    }
    
    /**
     * Generate enemies based on difficulty level
     * @param {Object} room - Room object to modify
     * @param {number} difficulty - Current game difficulty level
     */
    generateEnemies(room, difficulty) {
        const { width, height, obstacles, playerStartX = width / 2, playerStartY = height / 2 } = room;
        const padding = 50; // Minimum distance from walls
        const minDistanceFromPlayer = 180; // Increased from 100 to give player more breathing room
        
        // Calculate number of enemies based on difficulty
        const baseEnemies = 2; // Minimum enemies
        const difficultyFactor = Math.sqrt(difficulty); // Square root scaling to avoid overwhelming numbers
        const enemyCount = Math.floor(baseEnemies + (difficultyFactor * 3) + (this.getRandom() * 2));
        
        console.log(`Generating ${enemyCount} enemies for difficulty ${difficulty}`);
        console.log(`Player start position: (${playerStartX}, ${playerStartY}), safe radius: ${minDistanceFromPlayer}`);
        
        for (let i = 0; i < enemyCount; i++) {
            // Determine enemy type based on difficulty
            let type;
            const typeRoll = this.getRandom();
            
            // Use the new AI-based enemy types with increasing likelihood at higher difficulties
            if (difficulty >= 5 && typeRoll < 0.15 * difficultyFactor) {
                // Special advanced AI types at high difficulties
                const advancedRoll = this.getRandom();
                if (advancedRoll < 0.25) {
                    type = 'ambush'; // Ambush enemies wait and then charge
                } else if (advancedRoll < 0.5) {
                    type = 'flank';  // Flanking enemies try to circle the player
                } else if (advancedRoll < 0.75) {
                    type = 'patrol'; // Patrol enemies follow set paths
                } else {
                    type = 'chaser'; // Chaser enemies aggressively pursue
                }
            } else if (difficulty >= 3 && typeRoll < 0.2 * difficultyFactor) {
                // Mix of advanced and basic types for medium difficulties
                const mediumRoll = this.getRandom();
                if (mediumRoll < 0.3) {
                    type = 'chaser';  // More aggressive pursuit
                } else if (mediumRoll < 0.6) {
                    type = 'patrol';  // More predictable movement
                } else if (mediumRoll < 0.8) {
                    type = 'fast';    // Legacy fast type
                } else {
                    type = 'strong';  // Legacy strong type
                }
            } else {
                // Basic enemy types for lower difficulties
                if (typeRoll < 0.3) {
                    type = 'fast';
                } else if (typeRoll < 0.6) {
                    type = 'strong';
                } else {
                    type = 'normal';
                }
            }
            
            // Generate position avoiding obstacles and player start position
            let x, y, valid;
            let attempts = 0;
            
            do {
                valid = true;
                x = padding + this.getRandom() * (width - 2 * padding);
                y = padding + this.getRandom() * (height - 2 * padding);
                
                // Check distance from player start position
                const distToPlayer = Math.sqrt((x - playerStartX) ** 2 + (y - playerStartY) ** 2);
                if (distToPlayer < minDistanceFromPlayer) {
                    valid = false;
                    continue;
                }
                
                // Check distance from obstacles
                for (const obstacle of obstacles) {
                    // Adjust calculation to be consistent with obstacle coordinates
                    const obstacleX = obstacle.x;
                    const obstacleY = obstacle.y;
                    const obstacleWidth = obstacle.width || 40;
                    const obstacleHeight = obstacle.height || 40;
                    
                    if (
                        x >= obstacleX - obstacleWidth/2 - 20 && 
                        x <= obstacleX + obstacleWidth/2 + 20 && 
                        y >= obstacleY - obstacleHeight/2 - 20 && 
                        y <= obstacleY + obstacleHeight/2 + 20
                    ) {
                        valid = false;
                        break;
                    }
                }
                
                attempts++;
            } while (!valid && attempts < 20);
            
            if (valid) {
                // Add additional properties to make enemy creation more robust
                room.enemies.push({ 
                    x, 
                    y, 
                    type,
                    active: true
                });
                console.log(`Generated ${type} enemy at ${x},${y} for new room`);
            }
        }
    }
    
    /**
     * Generate items based on difficulty level and player stats
     * @param {Object} room - Room object to modify
     * @param {number} difficulty - Current game difficulty level
     * @param {Object} playerStats - Optional player statistics to influence item generation
     * @param {number} playerStats.health - Current player health
     * @param {number} playerStats.maxHealth - Maximum player health
     * @param {number} playerStats.ammo - Current player ammo
     * @param {number} playerStats.maxAmmo - Maximum player ammo
     */
    generateItems(room, difficulty, playerStats = null) {
        const { width, height, obstacles } = room;
        
        // Better distribution approach: Define multiple safe zones across the room
        // These zones are strategically positioned away from common obstacle placements
        
        // Empty the existing items array
        room.items = [];
        
        // Define safe zones in different parts of the room
        const safeZones = [
            // Center zone
            { x: width / 2, y: height / 2, radius: 100 },
            // Quadrant zones - positioned to avoid common obstacle placements
            { x: width * 0.25, y: height * 0.25, radius: 80 },
            { x: width * 0.75, y: height * 0.25, radius: 80 },
            { x: width * 0.25, y: height * 0.75, radius: 80 },
            { x: width * 0.75, y: height * 0.75, radius: 80 },
            // Side zones
            { x: width * 0.5, y: height * 0.25, radius: 70 },
            { x: width * 0.5, y: height * 0.75, radius: 70 },
            { x: width * 0.25, y: height * 0.5, radius: 70 },
            { x: width * 0.75, y: height * 0.5, radius: 70 }
        ];
        
        // Shuffle safe zones to randomize distribution
        this.shuffleArray(safeZones);
        
        // Calculate number of items to spawn (1-3 based on difficulty)
        const numItems = Math.max(1, Math.min(3, Math.ceil(3 - difficulty / 4)));
        
        // Choose random item types with bias toward health and ammo
        const itemTypes = ['health', 'health', 'speedBoost', 'ammo', 'ammo', 'shield'];
        
        // Place items across different safe zones
        for (let i = 0; i < numItems; i++) {
            // Select a random item type
            const itemType = itemTypes[Math.floor(this.getRandom() * itemTypes.length)];
            const itemInfo = this.itemTypes[itemType];
            
            // Select a safe zone (cycle through them)
            const safeZone = safeZones[i % safeZones.length];
            
            // Create the item with position inside the selected safe zone
            // Use angle-based positioning to spread items within a zone
            const angle = this.getRandom() * Math.PI * 2;
            const distance = this.getRandom() * safeZone.radius * 0.7; // Stay within 70% of radius for extra safety
            
            const item = {
                x: safeZone.x + Math.cos(angle) * distance,
                y: safeZone.y + Math.sin(angle) * distance,
                type: itemType,
                color: itemInfo.color,
                radius: itemInfo.radius,
                effect: itemInfo.effect
            };
            
            // Add item to room
            room.items.push(item);
            
            console.log(`Placed ${itemType} item at (${Math.round(item.x)}, ${Math.round(item.y)})`);
        }
        
        // Log final result
        console.log(`Successfully placed ${room.items.length} items across safe zones in the room`);
    }
    
    /**
     * Ensures an item is placed safely away from obstacles
     * @param {Object} item - The item to check and adjust
     * @param {Array} obstacles - Array of obstacles
     * @param {number} maxIterations - Maximum number of adjustment iterations
     * @private
     */
    ensureItemSafety(item, obstacles, maxIterations = 50) {
        const minSafeDistance = item.radius + 30; // Minimum safe distance from obstacles
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let isOverlapping = false;
            let pushX = 0;
            let pushY = 0;
            
            // Check against each obstacle
            for (const obstacle of obstacles) {
                const obstacleX = obstacle.x;
                const obstacleY = obstacle.y;
                const obstacleWidth = obstacle.width || 40;
                const obstacleHeight = obstacle.height || 40;
                
                // Find closest point on the obstacle to the item
                const halfWidth = obstacleWidth / 2;
                const halfHeight = obstacleHeight / 2;
                const closestX = Math.max(obstacleX - halfWidth, Math.min(item.x, obstacleX + halfWidth));
                const closestY = Math.max(obstacleY - halfHeight, Math.min(item.y, obstacleY + halfHeight));
                
                // Calculate distance from the closest point to the item
                const distanceX = item.x - closestX;
                const distanceY = item.y - closestY;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                // If too close to obstacle, calculate push vector
                if (distance < minSafeDistance) {
                    isOverlapping = true;
                    
                    // Calculate normalized direction to push the item
                    if (distance > 0) {
                        // Push away from the obstacle with force inversely proportional to distance
                        const forceMagnitude = (minSafeDistance - distance) / minSafeDistance;
                        pushX += (distanceX / distance) * forceMagnitude * 10;
                        pushY += (distanceY / distance) * forceMagnitude * 10;
                    } else {
                        // If exactly at the same position (extremely unlikely), push in random direction
                        const randomAngle = Math.random() * Math.PI * 2;
                        pushX += Math.cos(randomAngle) * 10;
                        pushY += Math.sin(randomAngle) * 10;
                    }
                }
            }
            
            // If no overlaps, item is safe
            if (!isOverlapping) {
                if (iteration > 0) {
                    console.log(`Item pushed to safe position after ${iteration} iterations`);
                }
                return;
            }
            
            // Apply the push forces
            item.x += pushX;
            item.y += pushY;
            
            // Ensure item stays within room
            const roomPadding = 50;
            if (item.x < roomPadding) item.x = roomPadding;
            if (item.y < roomPadding) item.y = roomPadding;
            if (item.x > 800 - roomPadding) item.x = 800 - roomPadding;
            if (item.y > 600 - roomPadding) item.y = 600 - roomPadding;
        }
        
        console.warn(`WARNING: Could not find safe position for item after ${maxIterations} iterations!`);
    }
    
    /**
     * Verify that all items are placed safely
     * @param {Array} items - The items to verify
     * @param {Array} obstacles - Array of obstacles
     * @private
     */
    verifyItemPlacements(items, obstacles) {
        console.log("--- FINAL ITEM PLACEMENT VERIFICATION ---");
        let allSafe = true;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let isSafe = true;
            
            // Check against each obstacle
            for (const obstacle of obstacles) {
                const obstacleX = obstacle.x;
                const obstacleY = obstacle.y;
                const obstacleWidth = obstacle.width || 40;
                const obstacleHeight = obstacle.height || 40;
                
                // Find closest point on the obstacle to the item
                const halfWidth = obstacleWidth / 2;
                const halfHeight = obstacleHeight / 2;
                const closestX = Math.max(obstacleX - halfWidth, Math.min(item.x, obstacleX + halfWidth));
                const closestY = Math.max(obstacleY - halfHeight, Math.min(item.y, obstacleY + halfHeight));
                
                // Calculate distance from the closest point to the item
                const distanceX = item.x - closestX;
                const distanceY = item.y - closestY;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                // Safety distance for verification
                const safeDistance = item.radius + 20;
                
                if (distance < safeDistance) {
                    console.warn(`UNSAFE: Item ${i} (${item.type}) at (${Math.round(item.x)},${Math.round(item.y)}) is ${Math.round(distance)}px from obstacle (minimum ${safeDistance}px required)`);
                    isSafe = false;
                    allSafe = false;
                    break;
                }
            }
            
            if (isSafe) {
                console.log(`SAFE: Item ${i} (${item.type}) at (${Math.round(item.x)},${Math.round(item.y)})`);
            }
        }
        
        console.log(`Final verification: ${allSafe ? 'ALL ITEMS SAFE' : 'SOME ITEMS ARE NOT SAFE'}`);
    }
    
    addItemCollisionCheckToRoom(Room) {
        // Only add the method if it doesn't already exist
        if (!Room.prototype._checkItemObstacleCollisions) {
            Room.prototype._checkItemObstacleCollisions = function() {
                if (!this.items || !this.obstacles) return;
                
                // Check each item against each obstacle
                for (let i = this.items.length - 1; i >= 0; i--) {
                    const item = this.items[i];
                    let isColliding = false;
                    
                    for (const obs of this.obstacles) {
                        const obsX = obs.x;
                        const obsY = obs.y;
                        const obsWidth = obs.width || 40;
                        const obsHeight = obs.height || 40;
                        
                        // Rectangular collision check
                        if (Math.abs(item.x - obsX) < (obsWidth/2 + item.radius + 10) &&
                            Math.abs(item.y - obsY) < (obsHeight/2 + item.radius + 10)) {
                            isColliding = true;
                            console.error(`RUNTIME COLLISION! Item at (${item.x.toFixed(1)}, ${item.y.toFixed(1)}) collides with obstacle at (${obsX.toFixed(1)}, ${obsY.toFixed(1)})`);
                            
                            // Try to move the item away from the obstacle
                            const dirX = item.x - obsX;
                            const dirY = item.y - obsY;
                            const dist = Math.sqrt(dirX*dirX + dirY*dirY);
                            const newDist = obsWidth/2 + item.radius + 50; // Safe distance
                            
                            if (dist > 0) {
                                item.x = obsX + (dirX / dist) * newDist;
                                item.y = obsY + (dirY / dist) * newDist;
                                console.log(`Moved colliding item to (${item.x.toFixed(1)}, ${item.y.toFixed(1)})`);
                            } else {
                                // If items are exactly on top, move in a random direction
                                const randomAngle = Math.random() * Math.PI * 2;
                                item.x = obsX + Math.cos(randomAngle) * newDist;
                                item.y = obsY + Math.sin(randomAngle) * newDist;
                                console.log(`Moved colliding item to random position (${item.x.toFixed(1)}, ${item.y.toFixed(1)})`);
                            }
                            
                            // Check if the new position is inside the room bounds
                            const padding = 40;
                            item.x = Math.max(padding, Math.min(this.width - padding, item.x));
                            item.y = Math.max(padding, Math.min(this.height - padding, item.y));
                            
                            // Item has been moved, break out of the obstacle loop
                            break;
                        }
                    }
                    
                    // If we detect a collision, mark it for debug visualization
                    if (isColliding) {
                        item._collidesWithObstacle = true;
                    }
                }
            };
            
            console.log("Added item-obstacle collision check to Room prototype");
        }
    }
}
