// camera.js - Camera system to follow the player and handle room boundaries
export class Camera {
    constructor(canvasWidth, canvasHeight, roomWidth, roomHeight) {
        this.x = 0;
        this.y = 0;
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.roomWidth = roomWidth;
        this.roomHeight = roomHeight;
        
        // Smoothing values for camera movement
        this.smoothSpeed = 0.1; // Lower = smoother camera
        this.targetX = 0;
        this.targetY = 0;
        
        // Screen shake properties
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        
        // Zoom properties
        this.zoomLevel = 1.0; // Default zoom level (1.0 = no zoom)
        this.targetZoom = 1.0; // Target zoom level for smooth zooming
        this.zoomSpeed = 0.03; // Speed of zoom transitions (reduced from 0.05 for smoother transitions)
        this.zoomOriginX = 0; // X center of zoom
        this.zoomOriginY = 0; // Y center of zoom
        
        // Performance monitoring
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateInterval = 500; // Update FPS every 500ms
        this.fpsTimer = 0;
    }
    
    // Update room dimensions when transitioning to a new room
    updateRoomDimensions(roomWidth, roomHeight) {
        this.roomWidth = roomWidth;
        this.roomHeight = roomHeight;
    }
    
    // Follow a target (typically the player) with smooth movement
    follow(targetX, targetY, deltaTime) {
        // Performance monitoring
        this.updatePerformanceMetrics(deltaTime);
        
        // Set the target position
        this.targetX = targetX - this.width / 2;
        this.targetY = targetY - this.height / 2;
        
        // Set zoom origin to target position for centering zoom effect
        this.zoomOriginX = targetX;
        this.zoomOriginY = targetY;
        
        // Smooth camera movement
        this.x += (this.targetX - this.x) * this.smoothSpeed * (deltaTime / 16); // Normalize for 60fps
        this.y += (this.targetY - this.y) * this.smoothSpeed * (deltaTime / 16);
        
        // Optimized zoom transition using exponential smoothing for more natural easing
        this.updateZoom(deltaTime);
        
        // Clamp to room boundaries
        this.x = Math.max(0, Math.min(this.x, this.roomWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.roomHeight - this.height));
    }
    
    /**
     * Optimized zoom update method for smoother transitions and better performance.
     * Uses exponential smoothing for more natural easing that adapts to frame rate.
     * This approach prevents jerky zoom transitions even with many entities on screen.
     * 
     * @param {number} deltaTime - Time in milliseconds since the last frame.
     */
    updateZoom(deltaTime) {
        // Use exponential smoothing for more natural easing
        // Adjusted for better performance with many entities
        const zoomSpeed = 1.5; // Optimized value after testing
        this.zoomLevel += (this.targetZoom - this.zoomLevel) * (1 - Math.exp(-zoomSpeed * (deltaTime / 1000)));
    }
    
    // Update performance metrics
    updatePerformanceMetrics(deltaTime) {
        // Count frames and update FPS
        this.frameCount++;
        this.fpsTimer += deltaTime;
        
        if (this.fpsTimer >= this.fpsUpdateInterval) {
            // Calculate FPS
            const now = performance.now();
            const elapsed = now - this.lastFrameTime;
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            
            // Log FPS during zoom transitions for performance monitoring
            if (Math.abs(this.zoomLevel - this.targetZoom) > 0.01) {
                console.log(`Camera zoom transition FPS: ${this.fps} (${this.frameCount} frames in ${elapsed.toFixed(1)}ms)`);
            }
            
            // Reset counters
            this.lastFrameTime = now;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }
    }
    
    // Set target zoom level
    zoomTo(level, instant = false) {
        this.targetZoom = Math.max(0.5, Math.min(level, 2.0)); // Clamp zoom between 0.5x and 2.0x
        
        if (instant) {
            this.zoomLevel = this.targetZoom;
        }
    }
    
    // Create a zoom pulse effect (zoom in then out)
    pulseZoom(amount = 0.2, duration = 500) {
        // Store current zoom as base
        const baseZoom = this.targetZoom;
        
        // Zoom in
        this.zoomTo(baseZoom + amount);
        
        // Schedule zoom out
        setTimeout(() => {
            this.zoomTo(baseZoom);
        }, duration);
    }
    
    // Add screen shake effect
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = 0;
    }
    
    // Update screen shake effect
    updateShake(deltaTime) {
        if (this.shakeDuration > 0) {
            this.shakeTimer += deltaTime;
            
            if (this.shakeTimer >= this.shakeDuration) {
                // Reset shake
                this.shakeIntensity = 0;
                this.shakeDuration = 0;
                this.shakeTimer = 0;
            }
        }
    }
    
    // Get the current view position (including screen shake)
    getViewPosition() {
        let shakeX = 0;
        let shakeY = 0;
        
        // Calculate screen shake offset
        if (this.shakeDuration > 0) {
            const shakeProgress = this.shakeTimer / this.shakeDuration;
            const shakeAmount = this.shakeIntensity * (1 - shakeProgress); // Decrease intensity over time
            
            shakeX = (Math.random() * 2 - 1) * shakeAmount;
            shakeY = (Math.random() * 2 - 1) * shakeAmount;
        }
        
        return {
            x: this.x + shakeX,
            y: this.y + shakeY,
            zoom: this.zoomLevel,
            zoomOriginX: this.zoomOriginX,
            zoomOriginY: this.zoomOriginY
        };
    }
    
    /**
     * Immediately jump the camera to a specific position without smoothing
     * @param {number} x - Target X position
     * @param {number} y - Target Y position 
     */
    jumpTo(x, y) {
        // Set target position
        this.targetX = x - this.width / 2;
        this.targetY = y - this.height / 2;
        
        // Immediately update camera position without smoothing
        this.x = this.targetX;
        this.y = this.targetY;
        
        // Update zoom origin
        this.zoomOriginX = x;
        this.zoomOriginY = y;
        
        // Clamp to room boundaries
        this.x = Math.max(0, Math.min(this.x, this.roomWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.roomHeight - this.height));
    }
}
