// particleSystem.js - Manages multiple particles for visual effects in Neon Requiem
import { Particle } from './particle.js';

export class ParticleSystem {
    /**
     * Create a new particle system
     * @param {number} maxParticles - Maximum number of particles to manage (for performance)
     */
    constructor(maxParticles = 200) {
        this.particles = [];
        this.maxParticles = maxParticles;
    }
    
    /**
     * Add a single particle to the system
     * @param {Particle} particle - Particle to add
     */
    addParticle(particle) {
        // If we're at maximum capacity, replace the oldest particle
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift(); // Remove the oldest particle
        }
        
        this.particles.push(particle);
    }
    
    /**
     * Create and add a simple particle with given properties
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} velocityX - X velocity
     * @param {number} velocityY - Y velocity
     * @param {number} size - Particle size
     * @param {string} color - Particle color
     * @param {number} lifetime - Particle lifetime in seconds
     * @returns {Particle} - The created particle
     */
    createParticle(x, y, velocityX, velocityY, size, color, lifetime) {
        const particle = new Particle(x, y, velocityX, velocityY, size, color, lifetime);
        this.addParticle(particle);
        return particle;
    }
    
    /**
     * Create a burst of particles at a specific position
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} count - Number of particles to create
     * @param {Object} options - Configuration options
     * @param {number} options.minSpeed - Minimum particle speed
     * @param {number} options.maxSpeed - Maximum particle speed
     * @param {number} options.minSize - Minimum particle size
     * @param {number} options.maxSize - Maximum particle size
     * @param {string|Array<string>} options.color - Particle color or array of colors to choose from
     * @param {number} options.minLifetime - Minimum particle lifetime in seconds
     * @param {number} options.maxLifetime - Maximum particle lifetime in seconds
     */
    createParticleBurst(x, y, count, options = {}) {
        const defaults = {
            minSpeed: 20,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            color: '#00FFFF', // Default to cyan for neon theme
            minLifetime: 0.5,
            maxLifetime: 1.5
        };
        
        // Merge defaults with provided options
        const config = { ...defaults, ...options };
        
        for (let i = 0; i < count; i++) {
            // Random angle for the particle
            const angle = Math.random() * Math.PI * 2;
            
            // Random speed between min and max
            const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            
            // Calculate velocity based on angle and speed
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            // Random size between min and max
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            
            // Handle color options (string or array)
            let color;
            if (Array.isArray(config.color)) {
                // Randomly select a color from the array
                const randomIndex = Math.floor(Math.random() * config.color.length);
                color = config.color[randomIndex];
            } else {
                color = config.color;
            }
            
            // Random lifetime between min and max
            const lifetime = config.minLifetime + 
                Math.random() * (config.maxLifetime - config.minLifetime);
            
            // Create and add the particle
            this.createParticle(x, y, velocityX, velocityY, size, color, lifetime);
        }
    }
    
    /**
     * Create a directional burst of particles (for impacts, dash trails, etc.)
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} directionX - X direction component (normalized)
     * @param {number} directionY - Y direction component (normalized)
     * @param {number} count - Number of particles to create
     * @param {Object} options - Configuration options (same as createParticleBurst with additional options)
     * @param {number} options.spread - Angle spread in radians (0 = straight line, PI = all directions)
     */
    createDirectionalBurst(x, y, directionX, directionY, count, options = {}) {
        const defaults = {
            minSpeed: 20,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            color: '#00FFFF',
            minLifetime: 0.5,
            maxLifetime: 1.5,
            spread: Math.PI / 4 // 45 degrees spread by default
        };
        
        // Merge defaults with provided options
        const config = { ...defaults, ...options };
        
        // Calculate the base angle from direction vector
        const baseAngle = Math.atan2(directionY, directionX);
        
        for (let i = 0; i < count; i++) {
            // Random angle within the spread range
            const angleOffset = (Math.random() - 0.5) * config.spread;
            const angle = baseAngle + angleOffset;
            
            // Random speed between min and max
            const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            
            // Calculate velocity based on angle and speed
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            // Random size between min and max
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            
            // Handle color options (string or array)
            let color;
            if (Array.isArray(config.color)) {
                // Randomly select a color from the array
                const randomIndex = Math.floor(Math.random() * config.color.length);
                color = config.color[randomIndex];
            } else {
                color = config.color;
            }
            
            // Random lifetime between min and max
            const lifetime = config.minLifetime + 
                Math.random() * (config.maxLifetime - config.minLifetime);
            
            // Create and add the particle
            this.createParticle(x, y, velocityX, velocityY, size, color, lifetime);
        }
    }
    
    /**
     * Create a trail effect (for movement, dash, etc.)
     * @param {number} x - Current X position
     * @param {number} y - Current Y position
     * @param {number} prevX - Previous X position
     * @param {number} prevY - Previous Y position
     * @param {number} count - Number of particles to create
     * @param {Object} options - Configuration options
     */
    createTrail(x, y, prevX, prevY, count, options = {}) {
        const defaults = {
            minSpeed: 0,
            maxSpeed: 20,
            minSize: 2,
            maxSize: 4,
            color: '#00FFFF',
            minLifetime: 0.3,
            maxLifetime: 0.8
        };
        
        // Merge defaults with provided options
        const config = { ...defaults, ...options };
        
        // Calculate direction from previous to current position
        const dx = x - prevX;
        const dy = y - prevY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If there's no movement, don't create a trail
        if (distance < 1) return;
        
        // Normalize direction vector
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        for (let i = 0; i < count; i++) {
            // Place particles along the line from previous to current position
            const t = Math.random(); // Random position along the line
            const posX = prevX + dx * t;
            const posY = prevY + dy * t;
            
            // Calculate perpendicular direction for some spread
            const perpX = -dirY;
            const perpY = dirX;
            
            // Random perpendicular offset for some width to the trail
            const perpOffset = (Math.random() - 0.5) * 5;
            const finalX = posX + perpX * perpOffset;
            const finalY = posY + perpY * perpOffset;
            
            // Random speed between min and max
            const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
            
            // Small velocity perpendicular to movement for spread effect
            const spreadFactor = 0.5;
            const velocityX = perpX * spreadFactor * speed;
            const velocityY = perpY * spreadFactor * speed;
            
            // Random size between min and max
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            
            // Handle color options (string or array)
            let color;
            if (Array.isArray(config.color)) {
                const randomIndex = Math.floor(Math.random() * config.color.length);
                color = config.color[randomIndex];
            } else {
                color = config.color;
            }
            
            // Random lifetime between min and max
            const lifetime = config.minLifetime + 
                Math.random() * (config.maxLifetime - config.minLifetime);
            
            // Create and add the particle
            this.createParticle(finalX, finalY, velocityX, velocityY, size, color, lifetime);
        }
    }
    
    /**
     * Create particles for an impact/collision effect
     * @param {number} x - Impact X position
     * @param {number} y - Impact Y position
     * @param {number} normalX - Surface normal X component (normalized)
     * @param {number} normalY - Surface normal Y component (normalized)
     * @param {number} count - Number of particles to create
     * @param {Object} options - Configuration options
     */
    createImpactEffect(x, y, normalX, normalY, count, options = {}) {
        // Set default spread more focused along normal direction
        const defaults = {
            spread: Math.PI / 3, // 60 degrees spread
            minSpeed: 50,
            maxSpeed: 150,
            color: ['#00FFFF', '#FFFFFF', '#0088FF'],
            minLifetime: 0.3,
            maxLifetime: 0.7
        };
        
        // Create a directional burst in the normal direction
        this.createDirectionalBurst(
            x, y, normalX, normalY, count, 
            { ...defaults, ...options }
        );
    }
    
    /**
     * Create a ring-shaped glow effect that expands and fades
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {Object} options - Configuration options
     * @param {number} options.initialRadius - Initial radius of the ring
     * @param {number} options.expandToRadius - Maximum radius the ring will expand to
     * @param {string} options.color - Color of the glow
     * @param {number} options.lifetime - Lifetime of the glow in seconds
     * @param {number} options.initialOpacity - Initial opacity (0-1)
     * @param {number} options.fadeRate - How quickly opacity decreases (higher = faster fade)
     */
    createGlowRing(x, y, options) {
        // Default options
        const settings = {
            initialRadius: options.initialRadius || 5,
            expandToRadius: options.expandToRadius || 100,
            color: options.color || '#FFFFFF',
            lifetime: options.lifetime || 1.0,
            initialOpacity: options.initialOpacity || 0.7,
            fadeRate: options.fadeRate || 1.0
        };
        
        // Calculate expansion rate
        const expansionRate = (settings.expandToRadius - settings.initialRadius) / settings.lifetime;
        
        // Number of particles based on final radius
        const particleCount = Math.ceil(settings.expandToRadius / 2);
        
        // Create particles around the ring
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            
            // Create a specialized particle for the glow ring
            const particle = new Particle(
                x, y,  // Position
                0, 0,  // No velocity initially (will be set during update)
                3 + Math.random() * 3, // Size
                settings.color,
                settings.lifetime
            );
            
            // Add custom properties for ring behavior
            particle.angle = angle;
            particle.currentRadius = settings.initialRadius;
            particle.expansionRate = expansionRate;
            particle.initialOpacity = settings.initialOpacity;
            particle.fadeRate = settings.fadeRate;
            
            // Override the update method for ring particles
            particle.update = function(deltaTime) {
                // Expand the radius
                this.currentRadius += this.expansionRate * deltaTime;
                
                // Update position based on current radius and angle
                this.x = x + Math.cos(this.angle) * this.currentRadius;
                this.y = y + Math.sin(this.angle) * this.currentRadius;
                
                // Fade opacity based on lifetime
                this.opacity = Math.max(0, this.initialOpacity * (1 - this.age / this.lifetime) / this.fadeRate);
                
                // Update age
                this.age += deltaTime;
            };
            
            // Add the particle
            this.addParticle(particle);
        }
    }
    
    /**
     * Update all particles in the system
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            
            // Remove dead particles
            if (!this.particles[i].isAlive()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render all particles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        // Render all particles
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    /**
     * Get the current number of active particles
     * @returns {number} - Number of active particles
     */
    getParticleCount() {
        return this.particles.length;
    }
    
    /**
     * Clear all particles from the system
     */
    clear() {
        this.particles = [];
    }
}
