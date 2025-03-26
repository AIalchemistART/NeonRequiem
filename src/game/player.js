// player.js - Player character class
export default class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.radius = 15; // Add radius property based on half the width
        this.speed = 200; // pixels per second
        this.color = '#00ffff'; // Neon cyan
        this.projectiles = [];
        this.projectileSpeed = 400; // pixels per second
        this.baseFireRate = 250; // ms between shots
        this.fireRate = this.baseFireRate; // Current fire rate
        this.fireRateMultiplier = 1.0; // Multiplier for fire rate (higher = faster fire rate)
        this.fireRateCooldown = 0;
        this.canvasWidth = 800; // Match the actual canvas size
        this.canvasHeight = 600; // Match the actual canvas size
        this.velocityX = 0;
        this.velocityY = 0;
        this.mouseX = undefined;
        this.mouseY = undefined;
        this.prevX = undefined;
        this.prevY = undefined;
        this.dashLastX = undefined;
        this.dashLastY = undefined;
        
        // Movement physics properties
        this.acceleration = 1000; // Acceleration rate (pixels per second squared)
        this.deceleration = 800; // Deceleration rate (pixels per second squared)
        this.maxSpeed = 200; // Maximum speed (pixels per second)
        
        // Weapon properties
        this.canShoot = true;
        this.baseShootCooldown = 500; // Base cooldown between shots in ms
        this.shootCooldown = this.baseShootCooldown; // Current cooldown between shots
        this.shootCooldownTimer = 0;
        this.projectileDamageMultiplier = 1.0; // Multiplier for projectile damage
        
        // Dash properties
        this.dashSpeed = 900; // Dash speed multiplier
        this.dashDuration = 250; // How long the dash lasts in ms
        this.dashCooldown = 10000; // Time between dashes in ms
        this.dashTimer = 0; // Current dash time
        this.dashCooldownTimer = 0; // Current cooldown time
        this.isDashing = false; // Whether player is currently dashing
        this.dashDirection = { x: 0, y: 0 }; // Direction of the dash
        this.dashDamage = 70; // Damage dealt to enemies when dashing through them (doubled for more impact)
        this.hasDealtDashDamage = new Set(); // Track enemies hit during current dash to prevent multiple hits
        
        // Invulnerability properties
        this.isInvulnerable = false; // Whether player is currently invulnerable
        this.invulnerabilityDuration = 1000; // How long invulnerability lasts in ms (extends beyond dash)
        this.invulnerabilityTimer = 0; // Current invulnerability time
        this.invulnerabilityFlashInterval = 100; // Flash interval for invulnerability effect
        
        // Shield properties
        this.shieldActive = false; // Whether the shield is active from power-up
        this.shieldDuration = 0; // Duration of the shield in ms (for power-up shield)
        this.dashShieldActive = false; // Whether the shield is active from dash
        
        // Trail effect for dash
        this.trailPositions = [];
        this.trailMaxLength = 5;
        this.trailDotsToRemove = 3; // Number of trail dots to remove during cooldown
        this.trailRemovalStartTime = 5000; // Start removing trail at 5 seconds into cooldown
        this.trailRemovalPoints = []; // Array to hold removal timing points
        this.trailAnimationTimer = 0; // Timer for trail removal animation
        this.trailDotRemovalIndex = 0; // Index to keep track of which tone to play
        
        // Player stats
        this.health = 250; // Increased from 100 for more generous health pool
        this.maxHealth = 250; // Increased to match
        this.isDead = false; // New flag to track if player is dead
        this.deathAnimationTimer = 0; // Timer for death animation
        this.deathAnimationDuration = 2000; // 2 seconds for death animation
        
        // Effects
        this.effects = null; // Will be set by the game
        this.lastObstacleCollision = null; // For tracking obstacle collisions
    }
    
    /**
     * Updates player state based on input
     * @param {number} deltaTime - Time since last frame in milliseconds
     * @param {object} inputState - Processed input state from InputHandler
     * @param {object} effects - Optional effects manager for visual effects
     */
    update(deltaTime, inputState, effects = null) {
        // Store effects manager for creating visual effects
        this.effects = effects;
        
        // If player is dead, update death animation timer
        if (this.isDead) {
            this.deathAnimationTimer -= deltaTime;
            return; // Skip regular updates if player is dead
        }
        
        // Store previous position for effects
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update velocity based on input
        this.handleMovement(deltaTime, inputState);
        
        // Update position based on velocity (unless we used continuous collision detection)
        if (this.isDashing && this.dashLastX !== undefined && this.dashLastY !== undefined) {
            // Use the position set by continuous collision detection
            this.x = this.dashLastX;
            this.y = this.dashLastY;
            
            // Clear the saved positions
            this.dashLastX = undefined;
            this.dashLastY = undefined;
        } else {
            // Regular position update
            this.x += this.velocityX * (deltaTime / 1000);
            this.y += this.velocityY * (deltaTime / 1000);
        }
        
        // Store mouse position for direction indicator
        this.mouseX = inputState.mouseX;
        this.mouseY = inputState.mouseY;
        
        // Handle shooting
        if (inputState.shoot && this.canShoot) {
            this.shoot(inputState.mouseX, inputState.mouseY);
            this.canShoot = false;
            this.shootCooldownTimer = this.shootCooldown;
        }
        
        // Process dash input
        if (inputState.dash && !this.isDashing && this.dashCooldownTimer <= 0) {
            this.startDash(inputState);
        }
        
        // Update shoot cooldown - apply fire rate multiplier
        if (!this.canShoot) {
            // Apply fire rate multiplier (higher multiplier = faster cooldown reduction)
            this.shootCooldownTimer -= deltaTime * this.fireRateMultiplier;
            if (this.shootCooldownTimer <= 0) {
                this.canShoot = true;
            }
        }
        
        // Update dash state
        this.updateDash(deltaTime);
        
        // Update dash cooldown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }
        
        // If player is invulnerable, update the timer
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime;
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Store previous position for trail effect
            if (projectile.active) {
                projectile.prevX = projectile.x;
                projectile.prevY = projectile.y;
                
                // Update projectile position
                projectile.update(deltaTime);
                
                // Create projectile trail if effects manager is available
                if (this.effects && projectile.prevX !== undefined) {
                    try {
                        // Try using createProjectileTrail if it exists
                        if (typeof this.effects.createProjectileTrail === 'function') {
                            this.effects.createProjectileTrail(
                                projectile.x, projectile.y,
                                projectile.prevX, projectile.prevY,
                                'player'
                            );
                        } 
                        // Fallback to createParticleBurst if available
                        else if (typeof this.effects.createParticleBurst === 'function') {
                            this.effects.createParticleBurst(
                                projectile.x, projectile.y,
                                2, // Number of particles
                                { color: ['#00FFFF', '#0088FF', '#FFFFFF'] } // Cyan/blue for player
                            );
                        }
                    } catch (e) {
                        // Silently fail if effect creation fails
                        console.log("Projectile trail effect failed:", e);
                    }
                }
            }
            
            // Remove projectiles that go off-screen
            if (projectile.x < 0 || projectile.x > this.canvasWidth ||
                projectile.y < 0 || projectile.y > this.canvasHeight) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Handles movement logic based on input
     * @param {number} deltaTime - Time since last frame in milliseconds
     * @param {object} inputState - Processed input state
     */
    handleMovement(deltaTime, inputState) {
        if (this.isDashing) {
            this.velocityX = this.dashDirection.x * this.dashSpeed;
            this.velocityY = this.dashDirection.y * this.dashSpeed;
            
            // Store position for trail effect
            if (this.trailPositions.length >= this.trailMaxLength) {
                this.trailPositions.shift(); // Remove oldest position
            }
            this.trailPositions.push({ x: this.x, y: this.y });
            
            return; // Skip normal movement while dashing
        }
        
        // Convert deltaTime to seconds for physics calculations
        const dt = deltaTime / 1000;
        
        // Apply acceleration based on input
        if (inputState.up) {
            this.velocityY -= this.acceleration * dt;
        } else if (inputState.down) {
            this.velocityY += this.acceleration * dt;
        } else {
            // Apply deceleration when no input is pressed
            if (this.velocityY !== 0) {
                const decelY = this.deceleration * dt * Math.sign(this.velocityY);
                // Check if deceleration would reverse velocity direction
                if (Math.abs(decelY) > Math.abs(this.velocityY)) {
                    this.velocityY = 0; // Prevent overshooting zero
                } else {
                    this.velocityY -= decelY;
                }
            }
        }
        
        if (inputState.left) {
            this.velocityX -= this.acceleration * dt;
        } else if (inputState.right) {
            this.velocityX += this.acceleration * dt;
        } else {
            // Apply deceleration when no input is pressed
            if (this.velocityX !== 0) {
                const decelX = this.deceleration * dt * Math.sign(this.velocityX);
                // Check if deceleration would reverse velocity direction
                if (Math.abs(decelX) > Math.abs(this.velocityX)) {
                    this.velocityX = 0; // Prevent overshooting zero
                } else {
                    this.velocityX -= decelX;
                }
            }
        }
        
        // Clamp velocity to max speed
        this.velocityX = Math.max(-this.maxSpeed, Math.min(this.velocityX, this.maxSpeed));
        this.velocityY = Math.max(-this.maxSpeed, Math.min(this.velocityY, this.maxSpeed));
    }
    
    startDash(inputState) {
        // Start a dash in the current movement direction
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        
        // Start invulnerability that lasts beyond the dash
        this.activateDashShield();
        
        // Determine dash direction from input keys rather than current velocity
        let dirX = 0;
        let dirY = 0;
        
        // Check which direction keys are pressed
        if (inputState.up) dirY = -1;
        if (inputState.down) dirY = 1;
        if (inputState.left) dirX = -1;
        if (inputState.right) dirX = 1;
        
        // If no direction keys are pressed, use last non-zero velocity direction
        if (dirX === 0 && dirY === 0) {
            if (this.velocityX !== 0 || this.velocityY !== 0) {
                // Normalize the velocity direction
                const magnitude = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                dirX = this.velocityX / magnitude;
                dirY = this.velocityY / magnitude;
            } else {
                // Default to dashing right if no movement and no keys pressed
                dirX = 1;
                dirY = 0;
            }
        } else if (dirX !== 0 && dirY !== 0) {
            // Normalize diagonal input
            const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
            dirX = dirX / magnitude;
            dirY = dirY / magnitude;
        }
        
        // Set the dash direction
        this.dashDirection = {
            x: dirX,
            y: dirY
        };
        
        // Clear trail positions
        this.trailPositions = [];
        this.trailDotRemovalIndex = 0; // Reset tone index when starting a new dash
        
        // Reset dash damage tracking
        this.hasDealtDashDamage.clear();
        
        // Play dash sound effect
        this.playDashSound();
        
        console.log("Dash executed with direction:", this.dashDirection);
    }
    
    /**
     * Updates dash state, handling activation, cooldown and trail effects.
     * Controls the dash lifecycle including trail dot removal animation timing.
     * 
     * @param {number} deltaTime - Time in milliseconds since the last frame.
     */
    updateDash(deltaTime) {
        // Update dash timer
        if (this.isDashing) {
            this.dashTimer -= deltaTime;
            
            if (this.dashTimer <= 0) {
                // End dash
                this.isDashing = false;
                this.dashCooldownTimer = this.dashCooldown;
                
                // Reset dash damage tracking when dash ends
                this.hasDealtDashDamage.clear();
                
                // Distribute removal points more evenly across the cooldown
                const cooldownForRemoval = this.dashCooldown - this.trailRemovalStartTime;
                const removalInterval = cooldownForRemoval / this.trailDotsToRemove;
                this.trailRemovalPoints = [];
                
                // Create evenly spaced removal points
                for (let i = 0; i < this.trailDotsToRemove; i++) {
                    // Distribute the dots evenly through the removal period
                    this.trailRemovalPoints.push(this.dashCooldown - this.trailRemovalStartTime - i * removalInterval);
                }
            }
        }
        
        // Update cooldown timer
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
            
            // Handle trail removal based on cooldown progress
            if (this.dashCooldownTimer <= this.dashCooldown - this.trailRemovalStartTime) {
                // Find which removal point we're at
                for (let i = 0; i < this.trailRemovalPoints.length; i++) {
                    const point = this.trailRemovalPoints[i];
                    
                    // Check if we've crossed this removal point
                    if (this.dashCooldownTimer <= point && 
                        this.dashCooldownTimer > (i + 1 < this.trailRemovalPoints.length ? this.trailRemovalPoints[i + 1] : 0)) {
                        
                        // Calculate how many trail dots to keep based on current stage
                        const maxDotsToKeep = this.trailMaxLength - (i + 1);
                        
                        // If we have more dots than we should at this stage, remove one with animation
                        if (this.trailPositions.length > maxDotsToKeep && this.trailAnimationTimer <= 0) {
                            // Start animation for oldest dot
                            this.trailAnimationTimer = 300; // 300ms animation
                            
                            // Play sound near the end of the animation, not at the start
                            if (window.audioManager) {
                                // Delay the sound to match when the dot actually disappears
                                setTimeout(() => {
                                    // We want to ensure we get the proper sequence of tones (0, 1, 2, 3, 4)
                                    // where tone #2 (index 2) is properly placed between tones #1 and #3
                                    window.audioManager.playTrailDotRemoveSound(this.trailDotRemovalIndex);
                                    this.trailDotRemovalIndex++; // Increment for next tone
                                }, 250); // Play 50ms before the animation completes
                            }
                        }
                    }
                }
            }
            
            // When cooldown is complete, clear all remaining trail dots
            if (this.dashCooldownTimer <= 0 && this.trailPositions.length > 0) {
                this.trailAnimationTimer = 300; // Start animation for remaining dots
                
                // Play final dot removal sound right when the animation is about to end
                if (window.audioManager && this.trailPositions.length > 0) {
                    // For the final removal, use a higher pitch based on sequence
                    setTimeout(() => {
                        // Play the next tone in sequence, making sure we don't go past our 5 tones
                        const toneIndex = Math.min(this.trailDotRemovalIndex, 4);
                        window.audioManager.playTrailDotRemoveSound(toneIndex);
                        
                        // Now play dash ready sound AFTER the final trail dot sound with a slight delay
                        setTimeout(() => {
                            this.playDashReadySound(); // This is tone #5 (the pop)
                        }, 150); // Add delay between the final dot sound and ready sound
                    }, 250);  // Time it so it plays just before the dots disappear
                }
                
                setTimeout(() => {
                    this.trailPositions = []; // Clear all remaining dots
                }, 300);
            }
        }
        
        // Update trail removal animation
        if (this.trailAnimationTimer > 0) {
            this.trailAnimationTimer -= deltaTime;
            
            // When animation completes, remove the dot
            if (this.trailAnimationTimer <= 0 && this.trailPositions.length > 0) {
                this.trailPositions.shift(); // Remove oldest dot
            }
        }
        
        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            
            // End invulnerability if timer expires and not shield active
            if (this.invulnerabilityTimer <= 0 && !this.shieldActive) {
                this.isInvulnerable = false;
                this.dashShieldActive = false;
            }
        }
        
        // Update shield duration for power-up shield
        if (this.shieldActive) {
            this.shieldDuration -= deltaTime;
            
            // End shield if duration expires
            if (this.shieldDuration <= 0) {
                this.shieldActive = false;
                this.isInvulnerable = false;
            }
        }
    }

    /**
     * Start the shield effect (used by power-ups)
     * @param {number} duration - Duration of the shield in milliseconds
     */
    activateShield(duration) {
        this.shieldActive = true;
        this.shieldDuration = duration;
        this.isInvulnerable = true;
    }

    /**
     * Activate dash shield that lasts for 1 second after dash
     */
    activateDashShield() {
        this.dashShieldActive = true;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
    }
    
    // Check if player can be damaged
    canBeDamaged() {
        return !this.isInvulnerable;
    }
    
    // Handle player taking damage
    takeDamage(amount) {
        if (this.canBeDamaged()) {
            this.health -= amount;
            this.health = Math.max(0, this.health); // Don't go below 0
            
            // Make player briefly invulnerable after taking damage
            this.isInvulnerable = true;
            this.invulnerabilityTimer = this.invulnerabilityDuration / 2; // Half duration for damage invulnerability
            
            // Create damage particles
            if (this.effects) {
                this.effects.createParticleBurst(
                    this.x, 
                    this.y,
                    10, // Number of particles
                    {
                        color: ['#ff3333', '#ff6666', '#ff9999'], // Red color variants
                        minSpeed: 50,
                        maxSpeed: 150,
                        minLifetime: 0.3,
                        maxLifetime: 0.8
                    }
                );
            }
            
            // Check if player has died
            if (this.health <= 0 && !this.isDead) {
                this.die();
            }
            
            return true; // Damage was dealt
        }
        
        return false; // No damage was dealt
    }
    
    /**
     * Handles player death
     */
    die() {
        if (this.isDead) return; // Prevent multiple death calls
        
        this.isDead = true;
        this.deathAnimationTimer = this.deathAnimationDuration;
        
        console.log("Player died");
        
        // Create death particles
        if (this.effects) {
            // First burst - small particles
            this.effects.createParticleBurst(
                this.x, 
                this.y,
                40, // More particles for dramatic effect
                {
                    color: ['#00ffff', '#33ffff', '#66ffff', '#99ffff'], // Cyan color variants
                    minSpeed: 100,
                    maxSpeed: 300,
                    minLifetime: 0.5,
                    maxLifetime: 1.5,
                    minSize: 2,
                    maxSize: 5
                }
            );
            
            // Second burst - larger particles
            setTimeout(() => {
                if (this.effects) {
                    this.effects.createParticleBurst(
                        this.x, 
                        this.y,
                        20, // Fewer but larger particles
                        {
                            color: ['#ff3333', '#ff6666', '#ff9999', '#ffffff'], // Red to white
                            minSpeed: 50,
                            maxSpeed: 200,
                            minLifetime: 0.8,
                            maxLifetime: 2.0,
                            minSize: 4,
                            maxSize: 8
                        }
                    );
                }
            }, 200); // Slight delay for second burst
        }
        
        // Play death sound if audio manager exists
        if (window.audioManager) {
            // TODO: Add death sound to audio manager
            // window.audioManager.playPlayerDeathSound();
        }
    }
    
    /**
     * Check if player death animation is complete
     * @returns {boolean} True if death animation is complete
     */
    isDeathComplete() {
        return this.isDead && this.deathAnimationTimer <= 0;
    }
    
    /**
     * Updates the player's shooting cooldown based on current fire rate multiplier
     */
    updateShootCooldown() {
        // Lower cooldown = faster firing
        this.shootCooldown = this.baseShootCooldown / this.fireRateMultiplier;
    }

    /**
     * Fires a projectile at the specified target coordinates
     * @param {number} targetX - X-coordinate of the target
     * @param {number} targetY - Y-coordinate of the target
     */
    shoot(targetX, targetY) {
        // Update the shoot cooldown based on current multiplier
        this.updateShootCooldown();
        
        // No need to check cooldown here - that's handled in the update method
        console.log("Shooting at", targetX, targetY);
        
        // Look for inactive projectiles to reuse first
        let projectile = this.projectiles.find(p => !p.active);
        
        if (!projectile) {
            // Create a new projectile if no inactive ones are available
            projectile = {
                x: this.x,
                y: this.y,
                prevX: this.x, // Store previous position for trail effect
                prevY: this.y,
                velocityX: 0,
                velocityY: 0,
                radius: 5,
                active: true,
                damage: 25,
                color: '#ff00ff', // Neon magenta
                update: function(deltaTime) {
                    // Store previous position
                    this.prevX = this.x;
                    this.prevY = this.y;
                    
                    // Update position
                    this.x += this.velocityX * (deltaTime / 1000);
                    this.y += this.velocityY * (deltaTime / 1000);
                }
            };
            
            // Only add if we're under the limit
            if (this.projectiles.length < 50) {
                this.projectiles.push(projectile);
            } else {
                // Otherwise, recycle the oldest projectile
                projectile = this.projectiles.shift();
                projectile.active = true;
                projectile.x = this.x;
                projectile.y = this.y;
                this.projectiles.push(projectile);
            }
        } else {
            // Reset position for reused projectile
            projectile.x = this.x;
            projectile.y = this.y;
            projectile.active = true;
        }
        
        // Calculate direction
        const dirX = targetX - this.x;
        const dirY = targetY - this.y;
        
        // Normalize direction
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        
        // Set velocity
        projectile.velocityX = normalizedDirX * this.projectileSpeed;
        projectile.velocityY = normalizedDirY * this.projectileSpeed;
        
        // Play shooting sound if available
        if (window.audioManager) {
            window.audioManager.playShootSound();
        }
    }
    
    render(renderer) {
        // If player is dead, render death animation instead
        if (this.isDead) {
            const deathProgress = 1 - (this.deathAnimationTimer / this.deathAnimationDuration);
            
            // Player fades out during death animation
            const alpha = 1 - deathProgress;
            const size = this.width * (1 + deathProgress); // Expand slightly
            
            // Draw fading player with expanding size
            renderer.setGlobalAlpha(alpha);
            renderer.fillCircle(this.x, this.y, size / 2, this.color);
            renderer.strokeCircle(this.x, this.y, size / 2, '#ffffff');
            renderer.setGlobalAlpha(1.0);
            
            return;
        }
        
        const dashAvailable = this.dashCooldownTimer <= 0;
        
        // Add a pulse effect when dash is available
        let pulseEffect = 0;
        
        if (dashAvailable) {
            // Create a pulsing effect using sine wave based on current timestamp
            pulseEffect = 0.3 * Math.sin(Date.now() / 200);
        }
        
        // FIRST render the glow effect if dash is available
        // This ensures it appears behind the player
        if (dashAvailable && !this.isInvulnerable) {
            // Calculate size of the glow (slightly larger than player)
            const glowSize = Math.max(this.width, this.height) + 10; // Slightly outside player
            
            // Pulsing glow effect for dash readiness
            const glowOpacity = 0.2 + Math.abs(pulseEffect) * 0.3;
            const glowColor = `rgba(0, 255, 255, ${glowOpacity})`;
            
            // Draw a larger glow effect BEHIND the player
            renderer.drawNeonEffect(
                this.x - glowSize / 2,
                this.y - glowSize / 2,
                glowSize,
                glowSize,
                glowColor,
                8 + Math.abs(pulseEffect) * 6
            );
        }
        
        // Render shield bubble if active (either from power-up or dash)
        if (this.isInvulnerable) {
            // Determine shield color and effect based on source
            let shieldColor, shieldGlowSize, pulsingEffect;
            
            if (this.shieldActive) {
                // Shield from power-up (yellow shield)
                shieldColor = 'rgba(255, 255, 0, 0.3)';
                shieldGlowSize = 12;
                // Pulsing effect for shield
                pulsingEffect = 0.2 * Math.sin(Date.now() / 150);
            } else if (this.dashShieldActive) {
                // Shield from dash (cyan shield)
                shieldColor = 'rgba(0, 255, 255, 0.3)';
                shieldGlowSize = 10;
                // Faster pulsing for dash shield
                pulsingEffect = 0.15 * Math.sin(Date.now() / 100);
            } else {
                // Default invulnerability
                shieldColor = 'rgba(255, 255, 255, 0.2)';
                shieldGlowSize = 8;
                pulsingEffect = 0.1 * Math.sin(Date.now() / 120);
            }
            
            // Calculate shield size with pulsing effect
            const shieldSize = Math.max(this.width, this.height) * 1.8 + pulsingEffect * 10;
            
            // Draw shield bubble
            renderer.ctx.beginPath();
            renderer.ctx.arc(this.x, this.y, shieldSize / 2, 0, Math.PI * 2);
            renderer.ctx.fillStyle = shieldColor;
            renderer.ctx.fill();
            
            // Add neon glow to shield bubble
            renderer.drawNeonCircle(
                this.x,
                this.y,
                shieldSize / 2,
                shieldColor.replace('0.3', '0.7'),
                shieldGlowSize + Math.abs(pulsingEffect) * 5
            );
        }
        
        // Render player with invulnerability flash if applicable
        if (this.isInvulnerable) {
            // Flash between colors during invulnerability
            const flashOn = Math.floor(Date.now() / this.invulnerabilityFlashInterval) % 2 === 0;
            const playerColor = flashOn ? this.color : '#ffffff'; // Flash between cyan and white
            
            renderer.drawRect(
                this.x - this.width / 2, 
                this.y - this.height / 2, 
                this.width, 
                this.height, 
                playerColor
            );
        } else {
            // Normal player rendering with potential dash available effect
            if (dashAvailable) {
                // Apply a slight color tint to show dash readiness
                const dashReadyColor = this.adjustColorBrightness(this.color, 1.1 + pulseEffect/3);
                
                // Draw the player with enhanced color
                renderer.drawRect(
                    this.x - this.width / 2, 
                    this.y - this.height / 2, 
                    this.width, 
                    this.height, 
                    dashReadyColor
                );
            } else {
                // Normal color when dash is not ready
                renderer.drawRect(
                    this.x - this.width / 2, 
                    this.y - this.height / 2, 
                    this.width, 
                    this.height, 
                    this.color
                );
            }
        }
        
        // Draw direction indicator if we have mouse position
        if (this.mouseX !== undefined && this.mouseY !== undefined) {
            // Calculate direction to mouse
            const dirX = this.mouseX - this.x;
            const dirY = this.mouseY - this.y;
            
            // Normalize the direction vector
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            if (length > 0) { // Avoid division by zero
                const normalizedDirX = dirX / length;
                const normalizedDirY = dirY / length;
                
                // Calculate position for the indicator (on the player's edge)
                const indicatorRadius = Math.max(this.width, this.height) / 2 + 5; // Slightly outside player
                
                // Draw the magenta indicator
                renderer.drawCircle(
                    this.x + normalizedDirX * indicatorRadius,
                    this.y + normalizedDirY * indicatorRadius,
                    4, // Size of indicator
                    '#ff00ff' // Magenta color
                );
                
                // Add neon glow to the indicator
                renderer.drawNeonEffect(
                    this.x + normalizedDirX * (indicatorRadius - 4),
                    this.y + normalizedDirY * (indicatorRadius - 4),
                    8,
                    8,
                    '#ff00ff33',
                    3
                );
            }
        }
        
        // Render projectiles
        for (const projectile of this.projectiles) {
            if (projectile.active) {
                renderer.drawCircle(
                    projectile.x, 
                    projectile.y, 
                    projectile.radius, 
                    projectile.color
                );
                
                // Add glow effect
                renderer.drawNeonEffect(
                    projectile.x - projectile.radius, 
                    projectile.y - projectile.radius,
                    projectile.radius * 2, 
                    projectile.radius * 2,
                    projectile.color + '33',
                    3
                );
            }
        }
    }
    
    // New method for rendering dash trail separately (to be rendered below entities)
    renderDashTrail(renderer) {
        // Render the dash trail
        for (let i = 0; i < this.trailPositions.length; i++) {
            const trailPosition = this.trailPositions[i];
            
            // If this is the oldest position and we're animating, apply fade effect
            if (i === 0 && this.trailAnimationTimer > 0) {
                const alpha = this.trailAnimationTimer / 300; // Fade based on animation progress
                const fadeColor = `rgba(0, 255, 255, ${alpha.toFixed(2)})`; // Cyan with alpha
                renderer.drawCircle(trailPosition.x, trailPosition.y, 2 + (1 - alpha) * 3, fadeColor); // Grow slightly as it fades
            } else {
                renderer.drawCircle(trailPosition.x, trailPosition.y, 2, '#00ffff'); // Neon cyan
            }
        }
    }
    
    // Sound effect methods using the AudioManager
    playDashSound() {
        console.log("Dash activated");
        if (window.audioManager) {
            window.audioManager.playDashSound();
        }
    }
    
    playDashReadySound() {
        console.log("Dash ready");
        if (window.audioManager) {
            window.audioManager.playDashReadySound();
        }
    }
    
    // Helper method to adjust color brightness for dash ready effect
    adjustColorBrightness(color, factor) {
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
}
