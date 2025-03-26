// renderer.js - Handles all game rendering
export default class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.camera = null; // Will be set by the game
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    clear() {
        // Clear the entire canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    
    // Begin rendering with camera transformation applied
    beginRender() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        
        // Save current transformation
        this.ctx.save();
        
        // Apply camera transformation
        const viewPos = this.camera.getViewPosition();
        
        // First translate to center of zoom
        this.ctx.translate(viewPos.zoomOriginX, viewPos.zoomOriginY);
        
        // Apply zoom
        this.ctx.scale(viewPos.zoom, viewPos.zoom);
        
        // Translate back and apply camera offset
        this.ctx.translate(-viewPos.zoomOriginX - viewPos.x, -viewPos.zoomOriginY - viewPos.y);
    }
    
    // End rendering and restore original transformation
    endRender() {
        this.ctx.restore();
    }
    
    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }
    
    drawCircle(x, y, radius, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawText(text, x, y, color, fontSize = '16px', font = 'Arial') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize} ${font}`;
        this.ctx.fillText(text, x, y);
    }
    
    // Draw text in screen coordinates (not affected by camera)
    drawScreenText(text, x, y, color, fontSize = '16px', font = 'Arial') {
        // Save current transformation
        this.ctx.save();
        
        // Reset transformation to draw in screen coordinates
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize} ${font}`;
        this.ctx.fillText(text, x, y);
        
        // Restore transformation
        this.ctx.restore();
    }
    
    // Draw rect in screen coordinates (not affected by camera)
    drawScreenRect(x, y, width, height, color) {
        // Save current transformation
        this.ctx.save();
        
        // Reset transformation to draw in screen coordinates
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        
        // Restore transformation
        this.ctx.restore();
    }
    
    // Add glow effect for neon aesthetics
    drawNeonEffect(x, y, width, height, color, intensity = 15) {
        this.ctx.save();
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = intensity;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.restore();
    }
    
    // Add circular glow effect for neon aesthetics (used for shield)
    drawNeonCircle(x, y, radius, color, intensity = 15) {
        this.ctx.save();
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = intensity;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    renderEnemies(enemies) {
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            
            if (enemy.dying) {
                // Flash between colors during death animation
                const flashOn = Math.floor(enemy.deathTimer / enemy.flashInterval) % 2 === 0;
                const deathColor = flashOn ? '#ffffff' : '#ff00ff'; // Flash between white and magenta
                
                // Draw explosion-like effect
                const progress = enemy.deathTimer / enemy.deathDuration;
                const size = enemy.width * (1 + (1 - progress));
                
                // Draw the dying enemy with flash effect
                this.drawNeonEffect(
                    enemy.x - size / 2,
                    enemy.y - size / 2,
                    size,
                    size,
                    deathColor,
                    15
                );
            } else {
                // Draw normal enemy with type-specific color and size
                this.drawRect(
                    enemy.x - enemy.width / 2, 
                    enemy.y - enemy.height / 2, 
                    enemy.width, 
                    enemy.height, 
                    enemy.color
                );
                
                // Add a small indicator of enemy type for visual clarity
                const indicatorSize = 5;
                this.ctx.fillStyle = '#ffffff';
                
                if (enemy.type === 'fast') {
                    // Draw a lightning bolt-like symbol for fast enemies
                    this.ctx.fillRect(enemy.x - 2, enemy.y - 5, 1, 10);
                    this.ctx.fillRect(enemy.x, enemy.y - 5, 1, 10);
                    this.ctx.fillRect(enemy.x + 2, enemy.y - 5, 1, 10);
                } else if (enemy.type === 'strong') {
                    // Draw a cross for strong enemies
                    this.ctx.fillRect(enemy.x - 5, enemy.y - 1, 10, 2);
                    this.ctx.fillRect(enemy.x - 1, enemy.y - 5, 2, 10);
                }
            }
        }
    }
    
    // Method to draw the neon grid background
    drawGrid(cellSize = 50, lineWidth = 1, color = 'rgba(0, 255, 255, 0.2)') {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        
        // Draw vertical lines
        for (let x = 0; x <= width; x += cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= height; y += cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    renderRoomFloor(room) {
        // Draw the floor
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, room.width, room.height);
    }
    
    renderRoomEntities(room) {
        // Handle room rendering directly in the renderer instead of relying on room.render
        
        // Draw the room walls
        // Top wall
        this.drawRect(0, 0, room.width, room.wallThickness, room.wallColor);
        // Bottom wall
        this.drawRect(0, room.height - room.wallThickness, room.width, room.wallThickness, room.wallColor);
        // Left wall
        this.drawRect(0, 0, room.wallThickness, room.height, room.wallColor);
        // Right wall
        this.drawRect(room.width - room.wallThickness, 0, room.wallThickness, room.height, room.wallColor);
        
        // NOTE: Door rendering should be COMPLETELY handled by Room.render()
        // This prevents double rendering issues
        
        // Draw enemies
        for (const enemy of room.enemies) {
            if (enemy.render) {
                enemy.render(this);
            }
        }
    }
}
