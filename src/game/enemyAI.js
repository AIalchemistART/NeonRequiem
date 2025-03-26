// enemyAI.js - Advanced Enemy AI behaviors for Neon Requiem
export default class EnemyAI {
    /**
     * Chase behavior - enemy moves directly toward the player
     * @param {Object} player - The player object with x, y coordinates
     * @param {Object} enemy - The enemy object to move
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} aggressionFactor - How aggressively the enemy chases (1.0 = normal)
     */
    static chase(player, enemy, deltaTime, aggressionFactor = 1.0) {
        // Calculate direction vector to player
        const dirX = player.x - enemy.x;
        const dirY = player.y - enemy.y;
        
        // Normalize direction
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length === 0) return; // Avoid division by zero
        
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        
        // Move toward player with aggression factor
        const moveDistance = enemy.speed * aggressionFactor * (deltaTime / 1000);
        enemy.x += normalizedDirX * moveDistance;
        enemy.y += normalizedDirY * moveDistance;
    }
    
    /**
     * Patrol behavior - enemy moves along predefined patrol points or a random path
     * @param {Object} enemy - The enemy object to move
     * @param {Object} room - The room object containing boundaries
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Array} patrolPoints - Optional array of {x, y} patrol points
     */
    static patrol(enemy, room, deltaTime, patrolPoints = null) {
        // Initialize patrol data if not already set
        if (!enemy.patrolData) {
            enemy.patrolData = {
                currentPoint: 0,
                waitTime: 0,
                patrolPoints: patrolPoints || EnemyAI.generatePatrolPoints(enemy, room)
            };
        }
        
        // If we're waiting at a point, count down the wait time
        if (enemy.patrolData.waitTime > 0) {
            enemy.patrolData.waitTime -= deltaTime * 1000; // Convert to milliseconds
            return;
        }
        
        // Get the current target point
        const currentPoint = enemy.patrolData.patrolPoints[enemy.patrolData.currentPoint];
        
        // Calculate direction to the target point
        const dirX = currentPoint.x - enemy.x;
        const dirY = currentPoint.y - enemy.y;
        
        // Calculate distance to the target
        const distanceToTarget = Math.sqrt(dirX * dirX + dirY * dirY);
        
        // If we're close enough to the target, move to the next patrol point
        if (distanceToTarget < 20) {
            // Move to next patrol point
            enemy.patrolData.currentPoint = (enemy.patrolData.currentPoint + 1) % enemy.patrolData.patrolPoints.length;
            
            // Add a small wait time at each point
            enemy.patrolData.waitTime = 500 + Math.random() * 1000; // 0.5 to 1.5 seconds
            return;
        }
        
        // Normalize direction
        const normalizedDirX = dirX / distanceToTarget;
        const normalizedDirY = dirY / distanceToTarget;
        
        // Move toward the patrol point
        const patrolSpeed = enemy.speed * 0.6; // Patrol slower than chase
        const moveDistance = patrolSpeed * (deltaTime / 1000);
        enemy.x += normalizedDirX * moveDistance;
        enemy.y += normalizedDirY * moveDistance;
    }
    
    /**
     * Flanking behavior - enemy tries to move to the side of the player
     * @param {Object} player - The player object
     * @param {Object} enemy - The enemy object
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} flankDistance - How far to the side the enemy should move
     */
    static flank(player, enemy, deltaTime, flankDistance = 150) {
        // Calculate vector from player to enemy
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        
        // Normalize the vector
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return; // Avoid division by zero
        
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        
        // Calculate perpendicular vector (rotated 90 degrees)
        // If enemy has a preferred side use it, otherwise randomly pick a side
        if (!enemy.preferredSide) {
            enemy.preferredSide = Math.random() < 0.5 ? 1 : -1;
        }
        
        const perpX = -normalizedDy * enemy.preferredSide;
        const perpY = normalizedDx * enemy.preferredSide;
        
        // Set target position that is both toward the player and to the side
        const targetDistance = Math.max(length * 0.7, 100); // Keep some distance from player
        const targetX = player.x + normalizedDx * targetDistance + perpX * flankDistance;
        const targetY = player.y + normalizedDy * targetDistance + perpY * flankDistance;
        
        // Move toward the flanking position
        const dirX = targetX - enemy.x;
        const dirY = targetY - enemy.y;
        
        // Normalize direction
        const moveDir = Math.sqrt(dirX * dirX + dirY * dirY);
        if (moveDir === 0) return; // Avoid division by zero
        
        const normalizedMoveX = dirX / moveDir;
        const normalizedMoveY = dirY / moveDir;
        
        // Move toward the flanking position
        const moveDistance = enemy.speed * (deltaTime / 1000);
        enemy.x += normalizedMoveX * moveDistance;
        enemy.y += normalizedMoveY * moveDistance;
    }
    
    /**
     * Generate random patrol points within the room
     * @param {Object} enemy - The enemy object
     * @param {Object} room - The room object containing boundaries
     * @returns {Array} Array of {x, y} patrol points
     */
    static generatePatrolPoints(enemy, room) {
        const points = [];
        const wallThickness = 40; // Estimate of wall thickness to avoid
        const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 points
        
        const roomWidth = room.width || 800;
        const roomHeight = room.height || 600;
        
        // Generate random points, keeping away from walls
        for (let i = 0; i < numPoints; i++) {
            points.push({
                x: wallThickness + Math.random() * (roomWidth - wallThickness * 2),
                y: wallThickness + Math.random() * (roomHeight - wallThickness * 2)
            });
        }
        
        return points;
    }
    
    /**
     * Ambush behavior - enemy waits until player is close, then charges
     * @param {Object} player - The player object
     * @param {Object} enemy - The enemy object
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} triggerDistance - Distance at which to trigger the charge
     * @param {number} chargeDuration - How long the charge lasts in milliseconds
     */
    static ambush(player, enemy, deltaTime, triggerDistance = 300, chargeDuration = 1500) {
        // Initialize ambush data if not set
        if (!enemy.ambushData) {
            enemy.ambushData = {
                triggered: false,
                chargeTimer: 0,
                originalSpeed: enemy.speed,
                failsafeTimer: 5000, // Failsafe to prevent enemies from being stuck forever
                patrolPoints: null,
                currentPatrolPoint: 0,
                waitTime: 0
            };
        }
        
        // Calculate distance to player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If not triggered yet, check if player is close enough
        if (!enemy.ambushData.triggered) {
            // Reduce the failsafe timer (will eventually trigger movement even if player doesn't get close)
            enemy.ambushData.failsafeTimer -= deltaTime * 1000;
            
            // Trigger if player is close enough OR if the failsafe timer expires
            if (distance < triggerDistance || enemy.ambushData.failsafeTimer <= 0) {
                // Trigger the ambush!
                console.log(`Ambush enemy triggered! Distance: ${distance.toFixed(1)}, FailsafeTimer: ${enemy.ambushData.failsafeTimer.toFixed(1)}`);
                enemy.ambushData.triggered = true;
                enemy.ambushData.chargeTimer = chargeDuration;
                enemy.speed = enemy.ambushData.originalSpeed * 2.5; // Charge at 2.5x speed
                enemy.ambushData.failsafeTimer = 5000; // Reset failsafe timer
            } else {
                // When waiting, use slow patrol movement to prevent being stuck in one place
                if (!enemy.ambushData.patrolPoints) {
                    // Initialize patrol points if needed
                    const room = { width: 800, height: 600 }; // Fallback room dimensions
                    enemy.ambushData.patrolPoints = EnemyAI.generatePatrolPoints(enemy, room);
                }
                
                // If we're waiting at a point, count down the wait time
                if (enemy.ambushData.waitTime > 0) {
                    enemy.ambushData.waitTime -= deltaTime * 1000; // Convert to milliseconds
                    return;
                }
                
                // Slow patrol movement while waiting for player
                const currentPoint = enemy.ambushData.patrolPoints[enemy.ambushData.currentPatrolPoint];
                
                // Calculate direction to the target point
                const dirX = currentPoint.x - enemy.x;
                const dirY = currentPoint.y - enemy.y;
                
                // Calculate distance to the target
                const distanceToTarget = Math.sqrt(dirX * dirX + dirY * dirY);
                
                // If we're close enough to the target, move to the next patrol point
                if (distanceToTarget < 20) {
                    // Move to next patrol point
                    enemy.ambushData.currentPatrolPoint = 
                        (enemy.ambushData.currentPatrolPoint + 1) % enemy.ambushData.patrolPoints.length;
                    
                    // Add a small wait time at each point
                    enemy.ambushData.waitTime = 1000 + Math.random() * 1000; // 1 to 2 seconds
                    return;
                }
                
                // Normalize direction
                const normalizedDirX = dirX / distanceToTarget;
                const normalizedDirY = dirY / distanceToTarget;
                
                // Move toward the patrol point (very slowly)
                const patrolSpeed = enemy.ambushData.originalSpeed * 0.3; // Very slow patrol
                const moveDistance = patrolSpeed * (deltaTime / 1000);
                enemy.x += normalizedDirX * moveDistance;
                enemy.y += normalizedDirY * moveDistance;
                
                return;
            }
        }
        
        // If currently charging
        if (enemy.ambushData.triggered) {
            // Update charge timer
            enemy.ambushData.chargeTimer -= deltaTime * 1000;
            
            // If charge is over, reset to normal behavior
            if (enemy.ambushData.chargeTimer <= 0) {
                enemy.ambushData.triggered = false;
                enemy.speed = enemy.ambushData.originalSpeed;
                // Reset failsafe timer for next ambush
                enemy.ambushData.failsafeTimer = 5000;
                return;
            }
            
            // During charge, use chase behavior with high aggression
            EnemyAI.chase(player, enemy, deltaTime, 1.5);
        }
    }
}
