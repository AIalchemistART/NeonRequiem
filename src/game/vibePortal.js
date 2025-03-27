// vibePortal.js - Portal system for connecting to the Vibeverse
export class VibePortal {
    constructor(x, y, size = 40, color = '#ff00ff', options = {}) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.innerSize = size * 0.85;
        this.ringWidth = (size - this.innerSize) / 2;
        this.color = color;
        this.active = true;
        this.label = options.label || 'VIBEVERSE PORTAL';
        this.particles = [];
        this.animationTime = 0;
        this.particleCount = options.particleCount || 100;
        this.rotationSpeed = options.rotationSpeed || 0.5;
        this.pulseSpeed = options.pulseSpeed || 1;
        this.destinationUrl = options.destinationUrl || 'https://portal.pieter.com';
        this.interactable = false; // When true, player is close enough to interact
        this.showInteractionHint = options.showInteractionHint !== undefined ? options.showInteractionHint : true;
        this.interactionHint = 'Press ENTER to use portal';
        
        // Create initial particles
        this.initParticles();
    }
    
    /**
     * Initialize portal particles
     */
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            // Create particles in a ring around the portal
            const angle = Math.random() * Math.PI * 2;
            const radiusVariation = (Math.random() - 0.5) * 8;
            const radius = this.size + radiusVariation;
            
            this.particles.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.02 + 0.01,
                angle: angle,
                distanceOffset: Math.random() * 5,
                opacity: 0.7 + Math.random() * 0.3
            });
        }
    }
    
    /**
     * Update portal animation
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime) {
        if (!this.active) return;
        
        // Update animation time
        this.animationTime += deltaTime / 1000;
        
        // Animate particles
        for (const particle of this.particles) {
            // Rotate particle around the center
            particle.angle += particle.speed * this.rotationSpeed;
            
            // Calculate new position
            const radius = this.size + Math.sin(this.animationTime * this.pulseSpeed + particle.distanceOffset) * 5;
            particle.x = Math.cos(particle.angle) * radius;
            particle.y = Math.sin(particle.angle) * radius;
        }
    }
    
    /**
     * Check if player is colliding with the portal
     * @param {Object} player - Player object with x, y, and width/height or radius
     * @returns {boolean} - True if player is colliding with portal
     */
    checkCollision(player) {
        if (!this.active) return false;
        
        const playerRadius = player.radius || Math.max(player.width, player.height) / 2;
        const portalRadius = this.size;
        
        // Calculate distance between player and portal centers
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Return true if player is close enough to interact
        this.interactable = distance < (playerRadius + portalRadius * 1.5);
        return this.interactable;
    }
    
    /**
     * Portal activation - navigates to destination URL
     */
    activate() {
        if (!this.active) return;
        
        // Get current URL parameters
        const currentParams = new URLSearchParams(window.location.search);
        const newParams = new URLSearchParams();
        
        // Add portal parameter to indicate we're coming from a portal
        newParams.append('portal', true);
        
        // Add reference to our game so other games can create return portals back to us
        // This is what enables two-way portal navigation between games
        if (window.location.href) {
            const currentUrl = window.location.href.split('?')[0]; // Base URL without parameters
            newParams.append('ref', currentUrl);
        }
        
        // Add any other parameters from current URL (except ref which we're setting)
        for (const [key, value] of currentParams) {
            if (key !== 'ref' && key !== 'portal') {
                newParams.append(key, value);
            }
        }
        
        // Build the destination URL
        const paramString = newParams.toString();
        const destinationUrl = this.destinationUrl + (paramString ? '?' + paramString : '');
        
        // Navigate to the destination
        window.location.href = destinationUrl;
    }
    
    /**
     * Render the portal
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        // Draw portal outer ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.lineWidth = this.ringWidth * 2;
        ctx.strokeStyle = this.color;
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        // Draw inner circle with pulsing opacity
        const innerOpacity = 0.3 + Math.sin(this.animationTime * 2) * 0.2;
        ctx.fillStyle = `${this.color}${Math.floor(innerOpacity * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.innerSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw particles
        for (const particle of this.particles) {
            ctx.fillStyle = `${this.color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(this.x + particle.x, this.y + particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw portal label
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5; // Less blur for text
        ctx.fillText(this.label, this.x, this.y - this.size - 10);
        
        // Draw interaction hint if player is close enough and showInteractionHint is true
        if (this.interactable && this.showInteractionHint) {
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowBlur = 3;
            ctx.fillText(this.interactionHint, this.x, this.y + this.size + 20);
            
            // Add a pulsing effect to the hint
            const hintPulse = Math.sin(this.animationTime * 4) * 0.3 + 0.7;
            ctx.globalAlpha = hintPulse;
            ctx.fillText(this.interactionHint, this.x, this.y + this.size + 20);
            ctx.globalAlpha = 1.0;
        }
        
        ctx.restore();
    }
}

// Factory function to create different types of portals
export function createVibePortal(type, x, y, options = {}) {
    switch (type) {
        case 'exit': // Green exit portal
            return new VibePortal(x, y, options.size || 40, '#00ff00', {
                label: 'VIBEVERSE PORTAL',
                ...options
            });
            
        case 'entry': // Red entry portal for incoming connections
            return new VibePortal(x, y, options.size || 40, '#ff0000', {
                label: 'RETURN PORTAL',
                ...options
            });
            
        case 'vibejam': // Blue Vibe Jam portal with different animation pattern
            return new VibePortal(x, y, options.size || 45, '#00a2ff', {
                label: 'VIBE JAM 2025',
                particleCount: 120,
                rotationSpeed: 0.7,
                pulseSpeed: 1.5,
                ...options
            });
            
        default: // Default purple portal
            return new VibePortal(x, y, options.size || 40, '#ff00ff', options);
    }
}
