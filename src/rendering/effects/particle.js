// particle.js - Basic particle implementation for Neon Requiem
export class Particle {
    /**
     * Create a new particle
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {number} velocityX - Horizontal velocity in pixels per second
     * @param {number} velocityY - Vertical velocity in pixels per second
     * @param {number} size - Particle size in pixels
     * @param {string} color - CSS color string
     * @param {number} lifetime - Particle lifetime in seconds
     */
    constructor(x, y, velocityX, velocityY, size, color, lifetime) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.size = size;
        this.color = color;
        this.lifetime = lifetime;
        
        // Optional additional properties for more complex effects
        this.initialSize = size; // For size transitions
        this.initialLifetime = lifetime; // For calculating percentage of life remaining
        this.alpha = 1.0; // For transparency effects
        this.rotation = 0; // For rotating particles
        this.fadeOut = true; // Whether particle should fade out over time
    }
    
    /**
     * Update particle position and lifetime
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        // Convert deltaTime to seconds for velocity calculations
        const dt = deltaTime / 1000;
        
        // Update position based on velocity
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
        
        // Decrease lifetime
        this.lifetime -= dt;
        
        // Update alpha if fading out
        if (this.fadeOut) {
            this.alpha = Math.max(0, this.lifetime / this.initialLifetime);
        }
    }
    
    /**
     * Render particle on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        // Save the current context state
        ctx.save();
        
        // Set transparency
        ctx.globalAlpha = this.alpha;
        
        // Set fill color
        ctx.fillStyle = this.color;
        
        // Draw the particle as a circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Optional: Add a glow effect for neon aesthetic
        if (this.size > 1) {
            ctx.shadowBlur = this.size * 2;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Restore the context to its original state
        ctx.restore();
    }
    
    /**
     * Check if particle is still alive
     * @returns {boolean} True if particle is still alive
     */
    isAlive() {
        return this.lifetime > 0;
    }
}
