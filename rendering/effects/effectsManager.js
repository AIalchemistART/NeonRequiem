// effectsManager.js - Manages and standardizes visual effects for Neon Requiem
import { ParticleSystem } from './particleSystem.js';

export class EffectsManager {
    /**
     * Create a new effects manager
     * @param {number} maxParticles - Maximum number of particles to manage
     */
    constructor(maxParticles = 300) {
        this.particleSystem = new ParticleSystem(maxParticles);
        
        // Colors for different effect types
        this.colorSchemes = {
            player: ['#00FFFF', '#0088FF', '#FFFFFF'], // Cyan/blue for player
            enemy: ['#FF00FF', '#FF0088', '#FFFFFF'],  // Magenta/purple for enemies
            neutral: ['#FFFFFF', '#AAAAAA', '#DDDDDD'], // White/gray for neutral effects
            heal: ['#00FF88', '#00FFAA', '#FFFFFF'],    // Green for healing
            damage: ['#FF0000', '#FF8800', '#FFFF00'],  // Red/orange for damage
            electricity: ['#FFFF00', '#88FFFF', '#FFFFFF'], // Yellow/cyan for electric
            ice: ['#00CCFF', '#AADDFF', '#FFFFFF'],      // Light blue for ice
            fire: ['#FF4400', '#FFAA00', '#FFFF00'],     // Orange/red for fire
            wall: ['#888888', '#AAAAAA', '#FFFFFF']      // Gray for environment
        };
    }
    
    /**
     * Get particle count for debugging or optimization
     * @returns {number} Current particle count
     */
    getParticleCount() {
        return this.particleSystem.getParticleCount();
    }
    
    /**
     * Update all active particle effects
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        this.particleSystem.update(deltaTime);
    }
    
    /**
     * Render all active particle effects
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        this.particleSystem.render(ctx);
        this.renderScreenEffects(ctx);
    }
    
    /**
     * Clear all active particles
     */
    clear() {
        this.particleSystem.clear();
    }
    
    // ======== GENERAL EFFECTS ========
    
    /**
     * Create a particle burst effect at the specified position
     * @param {number} x - Center X position of the burst
     * @param {number} y - Center Y position of the burst
     * @param {number} count - Number of particles to create
     * @param {Object} options - Configuration options
     */
    createParticleBurst(x, y, count, options = {}) {
        // Forward the call to the particle system
        this.particleSystem.createParticleBurst(x, y, count, options);
    }
    
    // ======== PLAYER EFFECTS ========
    
    /**
     * Create player movement trail effect
     * @param {number} x - Current X position
     * @param {number} y - Current Y position
     * @param {number} prevX - Previous X position
     * @param {number} prevY - Previous Y position
     * @param {boolean} isDashing - Whether player is dashing
     */
    createPlayerMovementTrail(x, y, prevX, prevY, isDashing = false) {
        // Calculate movement distance
        const dx = x - prevX;
        const dy = y - prevY;
        const movementSpeed = Math.sqrt(dx * dx + dy * dy);
        
        // Only create trail if moving fast enough
        if (movementSpeed < 2 && !isDashing) return;
        
        // Create more intense effect when dashing
        if (isDashing) {
            this.particleSystem.createTrail(
                x, y, prevX, prevY, 5, {
                    color: this.colorSchemes.player,
                    minLifetime: 0.5,
                    maxLifetime: 1.0,
                    minSize: 3,
                    maxSize: 6
                }
            );
            
            // Add occasional pulse effect during dash
            if (Math.random() < 0.2) {
                this.createPlayerDashPulse(x, y);
            }
        } else {
            this.particleSystem.createTrail(
                x, y, prevX, prevY, 2, {
                    color: this.colorSchemes.player,
                    minLifetime: 0.2,
                    maxLifetime: 0.5,
                    minSize: 1.5,
                    maxSize: 3
                }
            );
        }
    }
    
    /**
     * Create pulse effect when player dashes
     * @param {number} x - Player X position
     * @param {number} y - Player Y position 
     */
    createPlayerDashPulse(x, y) {
        this.particleSystem.createParticleBurst(x, y, 15, {
            color: this.colorSchemes.player,
            minSpeed: 30,
            maxSpeed: 120,
            minSize: 2,
            maxSize: 4,
            minLifetime: 0.3,
            maxLifetime: 0.6
        });
    }
    
    /**
     * Create effect when player takes damage
     * @param {number} x - Player X position
     * @param {number} y - Player Y position
     * @param {number} damage - Amount of damage taken
     */
    createPlayerDamageEffect(x, y, damage) {
        // Scale particle count with damage 
        const particleCount = Math.min(10 + Math.floor(damage / 5), 25);
        
        this.particleSystem.createParticleBurst(x, y, particleCount, {
            color: this.colorSchemes.damage,
            minSpeed: 50,
            maxSpeed: 150,
            minSize: 3,
            maxSize: 6,
            minLifetime: 0.5,
            maxLifetime: 0.8
        });
    }
    
    /**
     * Create effect when player heals
     * @param {number} x - Player X position
     * @param {number} y - Player Y position
     * @param {number} amount - Amount of healing
     */
    createPlayerHealEffect(x, y, amount) {
        // Scale particle count with healing amount
        const particleCount = Math.min(5 + Math.floor(amount / 5), 20);
        
        this.particleSystem.createParticleBurst(x, y, particleCount, {
            color: this.colorSchemes.heal,
            minSpeed: 20,
            maxSpeed: 70,
            minSize: 2,
            maxSize: 5,
            minLifetime: 0.7,
            maxLifetime: 1.2
        });
    }
    
    // ======== ENEMY EFFECTS ========
    
    /**
     * Create effect when enemy is hit
     * @param {number} x - Enemy X position
     * @param {number} y - Enemy Y position
     * @param {number} hitX - Hit X position
     * @param {number} hitY - Hit Y position
     * @param {number} damage - Damage amount
     * @param {boolean} isCritical - Whether hit was critical
     */
    createEnemyHitEffect(x, y, hitX, hitY, damage, isCritical = false) {
        // Calculate hit direction (normal)
        const dx = x - hitX;
        const dy = y - hitY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalX = distance > 0 ? dx / distance : 0;
        const normalY = distance > 0 ? dy / distance : -1;
        
        // Position at the edge of enemy
        const impactX = x - normalX * 15; // Adjust for enemy radius
        const impactY = y - normalY * 15;
        
        // Scale particle count with damage
        const particleCount = isCritical ? 
            Math.min(15 + Math.floor(damage / 3), 30) : 
            Math.min(5 + Math.floor(damage / 5), 20);
        
        // Create impact effect
        this.particleSystem.createImpactEffect(
            impactX, impactY, normalX, normalY, particleCount, {
                color: isCritical ? ['#FFFFFF', '#FFFF00', '#FF00FF'] : this.colorSchemes.enemy,
                minSpeed: isCritical ? 70 : 50,
                maxSpeed: isCritical ? 200 : 150,
                minSize: isCritical ? 3 : 2,
                maxSize: isCritical ? 7 : 5,
                minLifetime: 0.3,
                maxLifetime: 0.8,
                spread: isCritical ? Math.PI / 2 : Math.PI / 3 // Spread to cover the impact area
            }
        );
    }
    
    /**
     * Create effect when enemy dies
     * @param {number} x - Enemy X position
     * @param {number} y - Enemy Y position
     * @param {string} enemyType - Type of enemy (affects particles)
     */
    createEnemyDeathEffect(x, y, enemyType = 'basic') {
        // Base particle count
        let particleCount = 30;
        let colors = this.colorSchemes.enemy;
        let size = { min: 2, max: 6 };
        let lifetime = { min: 0.5, max: 1.5 };
        
        // Customize based on enemy type
        switch (enemyType) {
            case 'boss':
                particleCount = 60;
                colors = ['#FF00FF', '#FFFF00', '#FF0000', '#FFFFFF'];
                size = { min: 3, max: 8 };
                lifetime = { min: 0.8, max: 2.0 };
                break;
            case 'elite':
                particleCount = 45;
                colors = ['#FF00FF', '#8800FF', '#FFFFFF'];
                size = { min: 2.5, max: 7 };
                break;
        }
        
        // Create explosion effect
        this.particleSystem.createParticleBurst(x, y, particleCount, {
            color: colors,
            minSpeed: 50,
            maxSpeed: 200,
            minSize: size.min,
            maxSize: size.max,
            minLifetime: lifetime.min,
            maxLifetime: lifetime.max
        });
        
        // Add secondary glow effect
        this.createGlowEffect(x, y, 15, colors[0], 1.5);
    }
    
    // ======== PROJECTILE EFFECTS ========
    
    /**
     * Create effect when projectile hits a wall
     * @param {number} x - Impact X position
     * @param {number} y - Impact Y position
     * @param {number} normalX - Surface normal X component
     * @param {number} normalY - Surface normal Y component
     * @param {string} projectileType - Type of projectile (affects particles)
     */
    createProjectileWallHitEffect(x, y, normalX, normalY, projectileType = 'basic') {
        // Default colors based on projectile type
        let colors;
        let particleCount = 8;
        
        switch (projectileType) {
            case 'player':
                colors = this.colorSchemes.player;
                break;
            case 'enemy':
                colors = this.colorSchemes.enemy;
                break;
            case 'fire':
                colors = this.colorSchemes.fire;
                break;
            case 'ice':
                colors = this.colorSchemes.ice;
                break;
            default:
                colors = this.colorSchemes.wall;
        }
        
        this.particleSystem.createImpactEffect(x, y, normalX, normalY, particleCount, {
            color: colors,
            minSpeed: 30,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 4,
            minLifetime: 0.3,
            maxLifetime: 0.6,
            spread: Math.PI / 3 // Spread to cover the impact area
        });
    }
    
    /**
     * Create trail effect for projectiles
     * @param {number} x - Current X position
     * @param {number} y - Current Y position
     * @param {number} prevX - Previous X position
     * @param {number} prevY - Previous Y position
     * @param {string} projectileType - Type of projectile
     */
    createProjectileTrail(x, y, prevX, prevY, projectileType = 'player') {
        // Default colors based on projectile type
        let colors;
        let count = 2;
        
        switch (projectileType) {
            case 'player':
                colors = this.colorSchemes.player;
                break;
            case 'enemy':
                colors = this.colorSchemes.enemy;
                break;
            case 'fire':
                colors = this.colorSchemes.fire;
                count = 3;
                break;
            case 'ice':
                colors = this.colorSchemes.ice;
                break;
            default:
                colors = ['#AAAAAA', '#FFFFFF'];
        }
        
        this.particleSystem.createTrail(x, y, prevX, prevY, count, {
            color: colors,
            minLifetime: 0.2,
            maxLifetime: 0.4,
            minSize: 2,
            maxSize: 3
        });
    }
    
    // ======== ENVIRONMENT EFFECTS ========
    
    /**
     * Create effect when door opens or closes
     * @param {number} x - Door center X position
     * @param {number} y - Door center Y position
     * @param {number} width - Door width
     * @param {number} height - Door height
     * @param {boolean} isOpening - Whether door is opening (true) or closing (false)
     */
    createDoorEffect(x, y, width, height, isOpening = true) {
        // Generate particles along the door edges
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const color = isOpening ? this.colorSchemes.player : this.colorSchemes.enemy;
        
        // Number of particles per edge
        const edgeParticleCount = Math.ceil(Math.max(width, height) / 20);
        
        // Create particles on each edge
        for (let i = 0; i < edgeParticleCount; i++) {
            // Top edge
            this.particleSystem.createParticle(
                x - halfWidth + width * (i / edgeParticleCount),
                y - halfHeight,
                0, isOpening ? -30 - Math.random() * 50 : 30 + Math.random() * 50,
                2 + Math.random() * 3,
                color[Math.floor(Math.random() * color.length)],
                0.5 + Math.random() * 0.5
            );
            
            // Bottom edge
            this.particleSystem.createParticle(
                x - halfWidth + width * (i / edgeParticleCount),
                y + halfHeight,
                0, isOpening ? 30 + Math.random() * 50 : -30 - Math.random() * 50,
                2 + Math.random() * 3,
                color[Math.floor(Math.random() * color.length)],
                0.5 + Math.random() * 0.5
            );
            
            // Left edge
            this.particleSystem.createParticle(
                x - halfWidth,
                y - halfHeight + height * (i / edgeParticleCount),
                isOpening ? -30 - Math.random() * 50 : 30 + Math.random() * 50, 0,
                2 + Math.random() * 3,
                color[Math.floor(Math.random() * color.length)],
                0.5 + Math.random() * 0.5
            );
            
            // Right edge
            this.particleSystem.createParticle(
                x + halfWidth,
                y - halfHeight + height * (i / edgeParticleCount),
                isOpening ? 30 + Math.random() * 50 : -30 - Math.random() * 50, 0,
                2 + Math.random() * 3,
                color[Math.floor(Math.random() * color.length)],
                0.5 + Math.random() * 0.5
            );
        }
    }
    
    /**
     * Create a temporary glow effect at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} count - Number of particles
     * @param {string} color - Primary color
     * @param {number} duration - Effect duration in seconds
     */
    createGlowEffect(x, y, count, color, duration = 1.0) {
        this.particleSystem.createParticleBurst(x, y, count, {
            color: [color, '#FFFFFF'],
            minSpeed: 10,
            maxSpeed: 30,
            minSize: 3,
            maxSize: 8,
            minLifetime: duration * 0.5,
            maxLifetime: duration
        });
    }
    
    /**
     * Create a room transition effect
     * @param {number} width - Room width
     * @param {number} height - Room height
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     */
    createRoomTransitionEffect(width, height, playerX, playerY) {
        // Create a burst of particles from each corner of the room
        const corners = [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: 0, y: height },
            { x: width, y: height }
        ];
        
        corners.forEach(corner => {
            // Calculate direction from corner to player
            const dx = playerX - corner.x;
            const dy = playerY - corner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Create directional burst
            this.particleSystem.createDirectionalBurst(
                corner.x, corner.y, dirX, dirY, 15, {
                    color: this.colorSchemes.player,
                    minSpeed: 100,
                    maxSpeed: 200,
                    minSize: 2,
                    maxSize: 5,
                    minLifetime: 0.5,
                    maxLifetime: 1.5,
                    spread: Math.PI / 6 // Narrow spread for focused effect
                }
            );
        });
        
        // Add central burst at player position
        this.particleSystem.createParticleBurst(playerX, playerY, 30, {
            color: this.colorSchemes.player,
            minSpeed: 20,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            minLifetime: 0.5,
            maxLifetime: 1.0
        });
    }
    
    /**
     * Create effect when a door is unlocked
     * @param {number} x - Door center X position
     * @param {number} y - Door center Y position
     * @param {number} width - Door width
     * @param {number} height - Door height
     * @param {boolean} isHorizontal - Whether door is horizontal or vertical
     */
    createDoorUnlockEffect(x, y, width, height, isHorizontal) {
        // Define colors for door unlock effect - green neon
        const colors = ['#00FF88', '#88FFAA', '#FFFFFF'];
        
        // Number of particles based on door size
        const doorSize = isHorizontal ? width : height;
        const particleCount = Math.min(Math.max(15, Math.floor(doorSize / 10)), 40);
        
        // Create particles along the door
        if (isHorizontal) {
            // For horizontal doors (top/bottom), distribute particles along the width
            for (let i = 0; i < particleCount; i++) {
                const particleX = x - width / 2 + (width * i / particleCount) + (width / particleCount / 2);
                this.particleSystem.createParticleBurst(
                    particleX, y, 
                    5, // particles per point
                    {
                        color: colors,
                        minSpeed: 30,
                        maxSpeed: 100,
                        minSize: 2,
                        maxSize: 5,
                        minLifetime: 0.5,
                        maxLifetime: 1.2,
                        // Direction based on door position
                        directionX: 0,
                        directionY: Math.random() < 0.5 ? -1 : 1,
                        spreadX: 1,
                        spreadY: 0.5
                    }
                );
            }
        } else {
            // For vertical doors (left/right), distribute particles along the height
            for (let i = 0; i < particleCount; i++) {
                const particleY = y - height / 2 + (height * i / particleCount) + (height / particleCount / 2);
                this.particleSystem.createParticleBurst(
                    x, particleY, 
                    5, // particles per point
                    {
                        color: colors,
                        minSpeed: 30,
                        maxSpeed: 100,
                        minSize: 2,
                        maxSize: 5,
                        minLifetime: 0.5,
                        maxLifetime: 1.2,
                        // Direction based on door position
                        directionX: Math.random() < 0.5 ? -1 : 1,
                        directionY: 0,
                        spreadX: 0.5,
                        spreadY: 1
                    }
                );
            }
        }
        
        // Add glow pulse effect
        this.createDoorGlowPulse(x, y, width, height, isHorizontal);
    }
    
    /**
     * Create a glow pulse effect when door unlocks
     * @param {number} x - Door center X position
     * @param {number} y - Door center Y position
     * @param {number} width - Door width
     * @param {number} height - Door height
     * @param {boolean} isHorizontal - Whether door is horizontal or vertical
     */
    createDoorGlowPulse(x, y, width, height, isHorizontal) {
        // Define the size of the glow based on door dimensions
        const glowSize = isHorizontal ? width : height;
        const glowColor = '#00FF88'; // Green glow for unlocked door
        
        // Create the glow effect - multiple pulses
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.particleSystem.createGlowRing(
                    x, y, 
                    {
                        initialRadius: 5,
                        expandToRadius: glowSize / 2,
                        color: glowColor,
                        lifetime: 0.6 + (i * 0.1),
                        initialOpacity: 0.7,
                        fadeRate: 1.5
                    }
                );
            }, i * 200); // Stagger the pulses
        }
    }
    
    /**
     * Create an effect when player tries to use a locked door
     * @param {number} x - Impact X position
     * @param {number} y - Impact Y position 
     */
    createDoorLockedEffect(x, y) {
        // Red particles showing denial
        this.particleSystem.createParticleBurst(x, y, 15, {
            color: ['#FF0000', '#FF4400', '#FF8800'],
            minSpeed: 20,
            maxSpeed: 80,
            minSize: 2,
            maxSize: 4,
            minLifetime: 0.3,
            maxLifetime: 0.6
        });
        
        // Add small red glow
        this.particleSystem.createGlowRing(
            x, y, 
            {
                initialRadius: 5,
                expandToRadius: 30,
                color: '#FF0000',
                lifetime: 0.3,
                initialOpacity: 0.5,
                fadeRate: 2.0
            }
        );
    }
    
    /**
     * Create a damage screen overlay effect when player takes damage
     * @param {number} damage - Amount of damage taken (affects intensity)
     * @param {number} duration - Duration of the effect in seconds (default: 0.5)
     */
    createDamageScreen(damage = 10, duration = 0.5) {
        // Store the effect data to be rendered in the render method
        if (!this.screenEffects) {
            this.screenEffects = [];
        }
        
        // Calculate intensity based on damage amount (0.0 to 1.0)
        const intensity = Math.min(0.3 + (damage / 100) * 0.5, 0.8);
        
        // Create a new damage screen effect
        this.screenEffects.push({
            type: 'damage',
            startTime: Date.now(),
            duration: duration * 1000, // Convert to milliseconds
            intensity: intensity,
            color: 'rgba(255, 0, 0, ' + intensity + ')'
        });
    }
    
    /**
     * Create a generic screen flash effect
     * @param {string} color - Color of the flash (default white)
     * @param {number} intensity - Intensity of the flash (0-1, default 0.7)
     * @param {number} duration - Duration of the effect in seconds (default: 0.3)
     */
    createScreenFlash(color = '#ffffff', intensity = 0.7, duration = 0.3) {
        // Initialize screen effects array if needed
        if (!this.screenEffects) {
            this.screenEffects = [];
        }
        
        // Create a new screen flash effect
        this.screenEffects.push({
            type: 'screenFlash',
            startTime: Date.now(),
            duration: duration * 1000, // Convert to milliseconds
            intensity: intensity,
            color: color
        });
    }
    
    /**
     * Render screen overlay effects (called from render method)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderScreenEffects(ctx) {
        // Skip if no screen effects
        if (!this.screenEffects || this.screenEffects.length === 0) {
            return;
        }
        
        // Get canvas dimensions
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Process each screen effect
        for (let i = this.screenEffects.length - 1; i >= 0; i--) {
            const effect = this.screenEffects[i];
            const currentTime = Date.now();
            const elapsed = currentTime - effect.startTime;
            
            // Remove expired effects
            if (elapsed >= effect.duration) {
                this.screenEffects.splice(i, 1);
                continue;
            }
            
            // Calculate remaining effect strength (ease out)
            const progress = elapsed / effect.duration;
            const strength = effect.intensity * (1 - Math.pow(progress, 2));
            
            // Apply the effect based on type
            if (effect.type === 'damage') {
                // Draw red overlay for damage effect
                ctx.save();
                ctx.globalAlpha = strength;
                ctx.fillStyle = 'rgba(255, 0, 0, ' + strength + ')';
                
                // Create a vignette-like effect (darker at edges)
                const gradient = ctx.createRadialGradient(
                    width / 2, height / 2, 0,
                    width / 2, height / 2, Math.max(width, height) / 1.5
                );
                
                gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, ' + strength + ')');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add an additional outer border of pure red
                ctx.globalAlpha = strength * 0.7;
                ctx.strokeStyle = 'rgba(255, 0, 0, ' + strength + ')';
                ctx.lineWidth = 30 * strength;
                ctx.strokeRect(0, 0, width, height);
                
                ctx.restore();
            } else if (effect.type === 'doorTransition') {
                // Draw door transition flash effect
                ctx.save();
                ctx.globalAlpha = strength;
                
                // Use the effect's color or default to cyan (neon door color)
                const color = effect.color || 'rgba(0, 255, 255, ' + strength + ')';
                
                // Create a flash effect that starts bright and fades out
                const gradient = ctx.createRadialGradient(
                    width / 2, height / 2, 0,
                    width / 2, height / 2, Math.max(width, height)
                );
                
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.5, color.replace(strength, strength * 0.6));
                gradient.addColorStop(1, color.replace(strength, 0));
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                
                ctx.restore();
            } else if (effect.type === 'screenFlash') {
                // Draw screen flash effect
                ctx.save();
                ctx.globalAlpha = strength;
                ctx.fillStyle = effect.color;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }
        }
    }
    
    /**
     * Create a flash effect when player transitions through a door
     * @param {string} direction - Direction of the door transition ('north', 'east', 'south', 'west')
     * @param {string} color - Optional color of the flash (defaults to cyan)
     * @param {number} duration - Duration of the effect in seconds (default: 0.4)
     */
    createDoorTransitionFlash(direction = 'east', color = null, duration = 0.4) {
        // Initialize screen effects array if needed
        if (!this.screenEffects) {
            this.screenEffects = [];
        }
        
        // Determine flash color based on direction if not specified
        let flashColor;
        if (color) {
            flashColor = color;
        } else {
            // Different colors for different directions
            switch (direction) {
                case 'north':
                    flashColor = 'rgba(0, 255, 255, 0.6)'; // Cyan
                    break;
                case 'east':
                    flashColor = 'rgba(51, 255, 119, 0.6)'; // Green
                    break;
                case 'south':
                    flashColor = 'rgba(255, 51, 153, 0.6)'; // Pink
                    break;
                case 'west':
                    flashColor = 'rgba(255, 153, 51, 0.6)'; // Orange
                    break;
                default:
                    flashColor = 'rgba(0, 255, 255, 0.6)'; // Default cyan
            }
        }
        
        // Create a new door transition flash effect
        this.screenEffects.push({
            type: 'doorTransition',
            startTime: Date.now(),
            duration: duration * 1000, // Convert to milliseconds
            intensity: 0.7, // Flash intensity
            color: flashColor
        });
        
        // Also create some particle effects for additional visual feedback
        // Safely get canvas dimensions - use any canvas we can find or reasonable defaults
        let canvasWidth = 800;
        let canvasHeight = 600;
        
        // Try to get canvas from document if available
        const canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
        if (canvas) {
            canvasWidth = canvas.width;
            canvasHeight = canvas.height;
        }
        
        // Add particles based on which direction the player is moving
        let particleX, particleY;
        switch (direction) {
            case 'north':
                particleX = canvasWidth / 2;
                particleY = canvasHeight * 0.2;
                break;
            case 'east':
                particleX = canvasWidth * 0.8;
                particleY = canvasHeight / 2;
                break;
            case 'south':
                particleX = canvasWidth / 2;
                particleY = canvasHeight * 0.8;
                break;
            case 'west':
                particleX = canvasWidth * 0.2;
                particleY = canvasHeight / 2;
                break;
            default:
                particleX = canvasWidth / 2;
                particleY = canvasHeight / 2;
        }
        
        // Create a burst of particles at the door location
        const colorWithoutAlpha = flashColor.replace(/rgba?\(([^)]+)\)/, 'rgb($1)').replace(/,\s*[\d\.]+\s*\)/, ')');
        this.particleSystem.createParticleBurst(particleX, particleY, 20, {
            color: [colorWithoutAlpha, '#FFFFFF', '#88FFFF'],
            minSpeed: 50,
            maxSpeed: 150,
            minSize: 2,
            maxSize: 5,
            minLifetime: 0.3,
            maxLifetime: 0.7
        });
        
        // Add a final glow at the destination
        this.particleSystem.createGlowRing(
            particleX, particleY, 
            {
                initialRadius: 5,
                expandToRadius: 30,
                color: colorWithoutAlpha,
                lifetime: 0.5,
                initialOpacity: 0.7,
                fadeRate: 1.2
            }
        );
    }
    
    /**
     * Create a path effect when transitioning between rooms
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {number} endX - Ending X position
     * @param {number} endY - Ending Y position
     * @param {string} color - Color of the path (default neon cyan)
     * @param {number} duration - Duration of the effect in seconds (default: 0.8)
     */
    createNewPath(startX, startY, endX, endY, color = '#00ffff', duration = 0.8) {
        // Create particles along the path
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const particleCount = Math.max(10, Math.floor(distance / 20)); // One particle every ~20px
        
        // Direction vector
        const dirX = (endX - startX) / distance;
        const dirY = (endY - startY) / distance;
        
        // Create particles along the path
        for (let i = 0; i < particleCount; i++) {
            const t = i / (particleCount - 1); // 0 to 1
            const x = startX + t * (endX - startX);
            const y = startY + t * (endY - startY);
            
            // Create a particle at this position with delayed fade-in based on position
            const delayMs = t * 300; // Stagger effect, particles appear in sequence
            
            setTimeout(() => {
                // Create glow dot at position
                this.particleSystem.createGlowRing(
                    x, y, 
                    {
                        initialRadius: 3,
                        expandToRadius: 8,
                        color: color,
                        lifetime: duration,
                        initialOpacity: 0.9,
                        fadeRate: 0.7
                    }
                );
                
                // Add some random small particles around the dot
                this.particleSystem.createParticleBurst(x, y, 3, {
                    color: [color, '#ffffff'],
                    minSpeed: 10,
                    maxSpeed: 30,
                    minSize: 1,
                    maxSize: 2,
                    minLifetime: 0.2,
                    maxLifetime: 0.5
                });
            }, delayMs);
        }
        
        // Create a particle burst at the end position (destination) after full path appears
        setTimeout(() => {
            this.particleSystem.createParticleBurst(endX, endY, 20, {
                color: [color, '#ffffff', '#88ffff'],
                minSpeed: 40,
                maxSpeed: 120,
                minSize: 2,
                maxSize: 5,
                minLifetime: 0.3,
                maxLifetime: 0.7
            });
            
            // Add a final glow at the destination
            this.particleSystem.createGlowRing(
                endX, endY, 
                {
                    initialRadius: 5,
                    expandToRadius: 30,
                    color: color,
                    lifetime: 0.5,
                    initialOpacity: 0.7,
                    fadeRate: 1.2
                }
            );
        }, particleCount * 30); // Delay until path is complete
    }
}
