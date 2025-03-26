// enemy.js - Enemy class
import EnemyAI from './enemyAI.js';

export default class Enemy {
    constructor(x, y, speed = 100, health = 100, type = 'normal') {
        this.x = x;
        this.y = y;
        // CRITICAL FIX: Convert 'ambush' type to 'normal' to ensure enemies always move
        this.type = type === 'ambush' ? 'normal' : type; // Prevent ambush behavior completely
        this.width = type === 'fast' ? 20 : (type === 'strong' ? 40 : 25);
        this.height = this.width;
        this.speed = speed; // pixels per second
        this.color = this.getColorForType(type);
        this.health = health;
        this.maxHealth = health; // Store max health for effect scaling
        this.active = true;
        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 300; // milliseconds
        this.flashInterval = 50; // milliseconds
        
        // Knockback properties
        this.knockbackActive = false;
        this.knockbackDuration = 200; // milliseconds
        this.knockbackTimer = 0;
        this.knockbackDirection = { x: 0, y: 0 };
        this.knockbackSpeed = 300; // pixels per second
        
        // Trail effect properties
        this.prevX = x;
        this.prevY = y;
        this.trailCounter = 0;
        this.trailInterval = type === 'fast' ? 1 : 3; // Fast enemies leave more frequent trails
        
        // Projectile properties (for patrol type enemies)
        this.projectiles = [];
        this.projectileSpeed = 200; // pixels per second
        this.projectileDamage = 10; 
        this.projectileRadius = 8; 
        this.projectileColor = type === 'patrol' ? '#00ff88' : this.color; // Greenish projectiles for patrol enemies
        this.fireRate = 2000; // milliseconds between shots
        this.fireTimer = 1000 + Math.random() * 1000; // Randomize initial fire time
        this.fireRange = 350; // Only fire if player is within this range
        
        // Custom patrol data for gold enemies
        this.patrolData = null;
        
        // Initialize ambush data for ambush type
        if (type === 'ambush') {
            this.ambushData = {
                triggered: false,
                chargeTimer: 0,
                originalSpeed: speed,
                failsafeTimer: 3000 + Math.random() * 2000, // 3-5s initial failsafe timer
                patrolPoints: null,
                currentPatrolPoint: 0,
                waitTime: 0
            };
        }
    }
    
    /**
     * Get color based on enemy type
     * @param {string} type - Enemy type
     * @returns {string} - Color hex code
     */
    getColorForType(type) {
        switch(type) {
            case 'fast': return '#00ffff'; // Cyan
            case 'strong': return '#ff0000'; // Red
            case 'chaser': return '#ff00ff'; // Magenta
            case 'patrol': return '#00ff00'; // Green
            case 'flank': return '#ffaa00'; // Orange
            case 'ambush': return '#ffff00'; // Yellow
            case 'gold': return '#ffd700'; // Gold
            default: return '#ff00ff'; // Default magenta
        }
    }
    
    /**
     * Fire a projectile at the target
     * @param {Object} target - Target object with x, y coordinates
     */
    fireProjectile(target) {
        if (!target) return;
        
        // Calculate direction to target
        const dirX = target.x - this.x;
        const dirY = target.y - this.y;
        
        // Normalize direction
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length === 0) return;
        
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        
        // Create projectile
        this.projectiles.push({
            x: this.x,
            y: this.y,
            dirX: normalizedDirX,
            dirY: normalizedDirY,
            speed: this.projectileSpeed,
            radius: this.projectileRadius,
            damage: this.projectileDamage,
            color: this.projectileColor,
            active: true,
            lifespan: 3000, // 3 seconds maximum lifespan
            age: 0
        });
        
        console.log(`Enemy fired projectile: pos(${this.x.toFixed(1)},${this.y.toFixed(1)}), dir(${normalizedDirX.toFixed(2)},${normalizedDirY.toFixed(2)}), projectiles: ${this.projectiles.length}`);
        
        // Reset fire timer
        this.fireTimer = this.fireRate;
    }
    
    /**
     * Update projectiles
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateProjectiles(deltaTime) {
        // Debug counter for how many projectiles we're updating
        let activeCount = 0;
        
        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (projectile.active) {
                activeCount++;
                
                // Store previous position for logging movement
                const prevX = projectile.x;
                const prevY = projectile.y;
                
                // Update position - ensure we're using proper time scaling
                const moveDist = projectile.speed * (deltaTime / 1000);
                projectile.x += projectile.dirX * moveDist;
                projectile.y += projectile.dirY * moveDist;
                
                // Log significant movement for debugging
                if (i === 0 && this.projectiles.length > 0) { // Only log first projectile to avoid spam
                    const dx = projectile.x - prevX;
                    const dy = projectile.y - prevY;
                    console.log(`Projectile moved: (${prevX.toFixed(1)},${prevY.toFixed(1)}) -> (${projectile.x.toFixed(1)},${projectile.y.toFixed(1)}), delta: (${dx.toFixed(2)},${dy.toFixed(2)}), speed: ${projectile.speed}, time: ${deltaTime.toFixed(3)}s`);
                }
                
                // Update age
                projectile.age += deltaTime * 1000;
                
                // Check if projectile has reached its maximum lifespan
                if (projectile.age >= projectile.lifespan) {
                    console.log(`Projectile expired after ${projectile.age.toFixed(0)}ms`);
                    projectile.active = false;
                }
            } else {
                // Remove inactive projectiles
                this.projectiles.splice(i, 1);
            }
        }
        
        if (activeCount > 0) {
            console.log(`Updated ${activeCount} active projectiles out of ${this.projectiles.length} total`);
        }
    }
    
    /**
     * Render the enemy's projectiles
     * @param {CanvasRenderingContext2D} ctx - Canvas context to render on
     */
    renderProjectiles(ctx) {
        // Save the current context state
        ctx.save();
        
        console.log(`Rendering ${this.projectiles.length} projectiles for enemy at (${this.x.toFixed(1)},${this.y.toFixed(1)})`);
        
        for (const projectile of this.projectiles) {
            if (!projectile.active) continue;
            
            console.log(`  Drawing projectile at (${projectile.x.toFixed(1)},${projectile.y.toFixed(1)}), color: ${projectile.color}, radius: ${projectile.radius}`);
            
            // Draw projectile base
            ctx.fillStyle = projectile.color;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add an inner glow
            ctx.fillStyle = '#ffffff'; // White center for better visibility
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add outer glow effect
            ctx.shadowBlur = 15; // Increased from 10 to 15
            ctx.shadowColor = projectile.color;
            ctx.strokeStyle = projectile.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius + 1, 0, Math.PI * 2);
            ctx.stroke();
            
            // Optional: Add a directional trail effect
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(
                projectile.x - projectile.dirX * 5, 
                projectile.y - projectile.dirY * 5, 
                projectile.radius * 0.7, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Reset shadow and alpha for next projectile
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }
        
        // Restore the context state
        ctx.restore();
    }
    
    /**
     * Update enemy position and states
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} player - The player object
     * @param {Object} room - The current room
     * @param {Object} effects - Optional effects manager for visual effects
     */
    update(deltaTime, player, room, effects = null) {
        if (!this.active) return;
        
        // Extract player position
        const playerX = player.x;
        const playerY = player.y;
        
        // Store previous position for trail effect
        this.prevX = this.x;
        this.prevY = this.y;
        
        if (this.dying) {
            // Update death animation
            this.deathTimer -= deltaTime;
            if (this.deathTimer <= 0) {
                // Create death effect if effects manager available
                if (effects) {
                    effects.createEnemyDeathEffect(this.x, this.y, this.type === 'strong' ? 'elite' : 'basic');
                }
                this.active = false;
            }
            return;
        }
        
        // Handle knockback if active
        if (this.knockbackActive) {
            this.knockbackTimer -= deltaTime;
            
            if (this.knockbackTimer <= 0) {
                this.knockbackActive = false;
            } else {
                // Apply knockback movement
                const knockbackDistance = this.knockbackSpeed * (deltaTime / 1000);
                this.x += this.knockbackDirection.x * knockbackDistance;
                this.y += this.knockbackDirection.y * knockbackDistance;
                
                // Add some particles during knockback if effects manager available
                if (effects && Math.random() < 0.3) { // 30% chance per frame
                    effects.createGlowEffect(
                        this.x, this.y, 
                        5, 
                        this.color,
                        0.3
                    );
                }
                
                return; // Skip normal movement during knockback
            }
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update fire timer for patrol type enemies
        if (this.type === 'patrol') {
            this.fireTimer -= deltaTime * 1000;
            
            // Check if it's time to fire and player is within range
            if (this.fireTimer <= 0) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
                
                console.log(`Patrol enemy at (${this.x.toFixed(1)},${this.y.toFixed(1)}): fire check - distance to player: ${distanceToPlayer.toFixed(1)}, range: ${this.fireRange}`);
                
                if (distanceToPlayer <= this.fireRange) {
                    this.fireProjectile(player);
                    
                    // Add visual effects for firing
                    if (effects) {
                        try {
                            // Use whichever effect method is available
                            if (typeof effects.createGlowEffect === 'function') {
                                effects.createGlowEffect(
                                    this.x, this.y, 
                                    8, 
                                    this.projectileColor,
                                    0.8
                                );
                            } else if (typeof effects.createParticleBurst === 'function') {
                                effects.createParticleBurst(
                                    this.x, this.y,
                                    5,
                                    { color: this.projectileColor }
                                );
                            }
                        } catch (e) {
                            // Silently fail if effects methods fail
                            console.log("Enemy firing effect failed:", e);
                        }
                    }
                } else {
                    // Reset timer if player not in range
                    this.fireTimer = this.fireRate / 2;
                }
            }
        }
        
        // Apply different AI behaviors based on enemy type
        switch(this.type) {
            case 'chaser':
                // Aggressive chase with higher speed factor
                EnemyAI.chase(player, this, deltaTime, 1.2);
                break;
                
            case 'patrol':
                // Patrol behavior
                EnemyAI.patrol(this, room, deltaTime);
                break;
                
            case 'flank':
                // Flanking behavior
                EnemyAI.flank(player, this, deltaTime);
                break;
                
            case 'ambush':
                // COMPLETELY CHANGED: Ambush enemies just chase the player directly
                // This ensures they always move and don't get stuck
                console.log(`Ambush enemy at (${this.x.toFixed(1)},${this.y.toFixed(1)}) chasing player at (${player.x.toFixed(1)},${player.y.toFixed(1)})`);
                
                // Always chase aggressively - no waiting or complex behavior
                EnemyAI.chase(player, this, deltaTime, 1.0);
                break;
                
            case 'gold':
                // Gold enemies use an enhanced patrol behavior with wider movement range
                // Initialize with custom patrol points if needed
                if (!this.patrolData || !this.patrolData.patrolPoints) {
                    const customPatrolPoints = this.generateGoldEnemyPatrolPoints(room);
                    this.patrolData = {
                        currentPoint: 0,
                        waitTime: 0,
                        patrolPoints: customPatrolPoints
                    };
                }
                
                // Patrol behavior with wider movement range
                EnemyAI.patrol(this, room, deltaTime, this.patrolData.patrolPoints);
                break;
                
            case 'fast':
                // Fast enemies use chase with higher speed
                EnemyAI.chase(player, this, deltaTime, 1.3);
                break;
                
            case 'strong':
                // Strong enemies use slower but more aggressive chase
                EnemyAI.chase(player, this, deltaTime, 0.8);
                break;
                
            default:
                // Normal enemies use basic chase
                EnemyAI.chase(player, this, deltaTime, 1.0);
                break;
        }
        
        // Create trail effect for fast enemies or occasionally for others
        if (effects) {
            this.trailCounter++;
            const shouldCreateTrail = this.type === 'fast' ? 
                this.trailCounter % 2 === 0 : // Every 2nd frame for fast enemies
                this.trailCounter % 5 === 0;  // Every 5th frame for others
            
            if (shouldCreateTrail) {
                // Simple glow effect that works with any effects manager
                try {
                    // Use any of these methods that might be available
                    if (typeof effects.createGlowEffect === 'function') {
                        effects.createGlowEffect(
                            this.x, this.y,
                            3, 
                            this.color,
                            0.5
                        );
                    } else if (typeof effects.createParticleBurst === 'function') {
                        effects.createParticleBurst(
                            this.x, this.y,
                            2,
                            { color: this.color }
                        );
                    }
                } catch (e) {
                    // Silently fail if effects methods fail
                    console.log("Enemy trail effect failed:", e);
                }
            }
        }
    }
    
    /**
     * Check bullet collisions
     * @param {Array} bullets - Array of bullet objects
     * @returns {boolean} - True if a collision occurred
     */
    checkBulletCollisions(bullets) {
        if (!this.active || this.dying) return false;
        
        for (const bullet of bullets) {
            if (!bullet.active) continue;
            
            // Simple circle-rectangle collision
            const closestX = Math.max(this.x - this.width / 2, Math.min(bullet.x, this.x + this.width / 2));
            const closestY = Math.max(this.y - this.height / 2, Math.min(bullet.y, this.y + this.height / 2));
            
            const distanceX = bullet.x - closestX;
            const distanceY = bullet.y - closestY;
            
            const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
            
            if (distanceSquared < (bullet.radius * bullet.radius)) {
                // Collision detected
                bullet.active = false;
                this.takeDamage(25);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Take damage from a source
     * @param {number} amount - Damage amount
     * @param {Object} effects - Optional effects manager for visual effects
     * @param {Object} gameRef - Optional game reference for stats tracking
     */
    takeDamage(amount, effects = null, gameRef = null) {
        this.health -= amount;
        
        // Create damage effect if effects manager available
        if (effects) {
            // Calculate normal vector from enemy to the damage source
            // Since we don't have the source position, we'll use a random direction
            const angle = Math.random() * Math.PI * 2;
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            
            // Check if it's a critical hit (for visual effect only)
            const isCritical = amount > 35;
            
            effects.createEnemyHitEffect(
                this.x, this.y,
                this.x - normalX * 20, this.y - normalY * 20, // Estimated hit position
                amount,
                isCritical
            );
        }
        
        if (this.health <= 0 && !this.dying) {
            this.dying = true;
            this.deathTimer = this.deathDuration;
            
            // Track kill in game stats if game reference is provided
            if (gameRef && gameRef.player && gameRef.player.stats) {
                gameRef.player.stats.totalKills = (gameRef.player.stats.totalKills || 0) + 1;
                
                // Add score based on enemy type
                const scoreValue = this.type === 'fast' ? 150 : 
                                  (this.type === 'strong' ? 250 : 100);
                gameRef.player.stats.score = (gameRef.player.stats.score || 0) + scoreValue;
                
                // Update the game's main score counter
                if (gameRef.score !== undefined) {
                    gameRef.score += scoreValue;
                }
                
                console.log(`Enemy defeated! Total kills: ${gameRef.player.stats.totalKills}, Score: ${gameRef.player.stats.score}`);
            }
        }
    }
    
    /**
     * Apply knockback to the enemy
     * @param {Object} direction - Direction of knockback (x, y)
     * @param {number} multiplier - Knockback speed multiplier
     */
    applyKnockback(direction, multiplier = 1.0) {
        this.knockbackActive = true;
        this.knockbackDirection = { ...direction };
        this.knockbackTimer = this.knockbackDuration;
        this.knockbackSpeed = 300 * multiplier; // Adjust base knockback with multiplier
    }
    
    /**
     * Render the enemy
     * @param {CanvasRenderingContext2D|Object} renderer - Canvas context or renderer object
     */
    render(renderer) {
        if (!this.active) return;
        
        // Extract context from renderer if needed
        let ctx;
        if (renderer.ctx) {
            ctx = renderer.ctx;
        } else {
            ctx = renderer;
        }
        
        // Render projectiles first (so they appear under the enemy)
        this.renderProjectiles(ctx);
        
        // Early return if not visible (dying enemies will still show their death effect)
        if (this.dying) {
            // Apply death animation effect
            const fadePercentage = this.deathTimer / this.deathDuration;
            ctx.globalAlpha = fadePercentage;
            
            // Flash effect during death
            const flashRate = Math.floor(this.deathTimer / this.flashInterval);
            if (flashRate % 2 === 0) {
                ctx.fillStyle = '#FFFFFF'; // White flash
            } else {
                ctx.fillStyle = this.color;
            }
            
            // Draw the enemy
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
            return;
        }
        
        // Flash effect while taking damage
        const isFlashing = this.knockbackActive && (Math.floor(this.knockbackTimer / this.flashInterval) % 2 === 0);
        
        // Fill color
        ctx.fillStyle = isFlashing ? '#ffffff' : this.color;
        
        // Draw the enemy with a glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw inner circle for extra detail
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Add directional indicator for ranged enemies
        if (this.type === 'patrol') {
            // Draw a small line indicating the enemy's orientation
            const angle = Math.atan2(this.prevY - this.y, this.prevX - this.x);
            const indicatorLength = this.width * 0.8;
            
            ctx.strokeStyle = '#00ff88'; // Bright green indicator
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(angle) * indicatorLength,
                this.y + Math.sin(angle) * indicatorLength
            );
            ctx.stroke();
        }
        
        // Draw a health bar if not dying
        if (!this.dying) {
            const barWidth = this.width * 1.2;
            const barHeight = 3;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.height / 2 - 10;
            
            // Background of health bar
            ctx.fillStyle = '#222222';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Fill based on health percentage
            const healthPercentage = this.health / this.maxHealth;
            const healthColor = this.getHealthBarColor(healthPercentage);
            ctx.fillStyle = healthColor;
            ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        }
    }
    
    /**
     * Get the color for the health bar based on the health percentage
     * @param {number} healthPercentage - Health percentage (0 to 1)
     * @returns {string} - Color hex code
     */
    getHealthBarColor(healthPercentage) {
        if (healthPercentage > 0.6) {
            return '#00FF00'; // Green for high health
        } else if (healthPercentage > 0.3) {
            return '#FFFF00'; // Yellow for medium health
        } else {
            return '#FF0000'; // Red for low health
        }
    }
    
    /**
     * Generate custom patrol points for gold enemies that avoid obstacles
     * @param {Object} room - The current room object
     * @returns {Array} - Array of patrol point objects with x,y coordinates
     */
    generateGoldEnemyPatrolPoints(room) {
        const points = [];
        const numPoints = 5 + Math.floor(Math.random() * 3); // 5-7 points for wider coverage
        const safePadding = 60; // Keep away from walls
        
        // Get the valid areas of the room that don't have obstacles
        const validPositions = [];
        const gridSize = 60; // Size of grid for checking positions
        
        // Create a grid of potential patrol points
        for (let x = safePadding; x < room.width - safePadding; x += gridSize) {
            for (let y = safePadding; y < room.height - safePadding; y += gridSize) {
                let isValid = true;
                
                // Check if this position is far enough from all obstacles
                for (const obstacle of room.obstacles) {
                    const obstacleX = obstacle.x;
                    const obstacleY = obstacle.y;
                    const obstacleWidth = obstacle.width || 40;
                    const obstacleHeight = obstacle.height || 40;
                    
                    // Extra large safety margin to ensure enemies don't get stuck
                    const safetyMargin = 50;
                    
                    // Find the closest point on the rectangle to the potential position
                    const halfWidth = obstacleWidth / 2;
                    const halfHeight = obstacleHeight / 2;
                    const closestX = Math.max(obstacleX - halfWidth, Math.min(x, obstacleX + halfWidth));
                    const closestY = Math.max(obstacleY - halfHeight, Math.min(y, obstacleY + halfHeight));
                    
                    // Calculate distance from the closest point to the potential position
                    const distanceX = x - closestX;
                    const distanceY = y - closestY;
                    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                    
                    // If too close to obstacle, mark as invalid
                    if (distance < safetyMargin) {
                        isValid = false;
                        break;
                    }
                }
                
                if (isValid) {
                    // Add some randomness within the grid cell
                    const jitterX = (Math.random() - 0.5) * gridSize * 0.5;
                    const jitterY = (Math.random() - 0.5) * gridSize * 0.5;
                    validPositions.push({
                        x: x + jitterX,
                        y: y + jitterY
                    });
                }
            }
        }
        
        // If we have enough valid positions, use them to create a patrol path
        if (validPositions.length >= numPoints) {
            // Shuffle the array to get random positions
            const shuffled = [...validPositions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Select the first N points
            for (let i = 0; i < numPoints; i++) {
                points.push(shuffled[i]);
            }
            
            // Sort points to create a more natural patrol path
            // This ensures enemies don't zigzag wildly across the room
            this.optimizePatrolPath(points);
        } else {
            // Fallback: create a simple circular patrol pattern
            const centerX = room.width / 2;
            const centerY = room.height / 2;
            const radius = Math.min(room.width, room.height) / 3;
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * 2 * Math.PI;
                points.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
        }
        
        return points;
    }
    
    /**
     * Optimize a patrol path to make movement more natural
     * @param {Array} points - Array of patrol points to optimize
     */
    optimizePatrolPath(points) {
        if (points.length <= 3) return points; // Not enough points to optimize
        
        // Use a simple nearest-neighbor algorithm to create a more efficient path
        const result = [points[0]]; // Start with the first point
        const remaining = [...points.slice(1)];
        
        while (remaining.length > 0) {
            const current = result[result.length - 1];
            let bestIndex = 0;
            let bestDistance = Infinity;
            
            // Find the closest point
            for (let i = 0; i < remaining.length; i++) {
                const dx = current.x - remaining[i].x;
                const dy = current.y - remaining[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = i;
                }
            }
            
            // Add closest point to result and remove from remaining
            result.push(remaining[bestIndex]);
            remaining.splice(bestIndex, 1);
        }
        
        // Copy optimized path back to original array
        for (let i = 0; i < points.length; i++) {
            points[i] = result[i];
        }
    }
}
