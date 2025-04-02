/**
 * Pause Menu for Neon Requiem
 * Provides a simple overlay menu when the game is paused
 */
export class PauseMenu {
    constructor(game) {
        this.game = game;
        this.isPaused = false;
        this.selectedOption = 0;
        this.options = ['Resume', 'Quit'];
        this.colors = {
            background: 'rgba(0, 0, 0, 0.7)',
            title: '#FF00FF',
            option: '#FFFFFF',
            selectedOption: '#00FFFF',
            optionHover: '#88FFFF'
        };
        
        // Animation properties
        this.fadeLevel = 0;
        this.fadeSpeed = 0.1;
        this.titlePulse = 0;
        this.pulseDelta = 0.05;
    }
    
    /**
     * Toggle the pause state
     */
    toggle() {
        this.isPaused = !this.isPaused;
        
        // Reset menu state when pausing
        if (this.isPaused) {
            this.selectedOption = 0;
            this.fadeLevel = 0;
            
            // Pause background music if it exists
            if (this.game.audioManager && this.game.audioManager.backgroundMusic) {
                this.game.audioManager.backgroundMusic.pause();
            }
        } else {
            // Resume background music if it exists
            if (this.game.audioManager && this.game.audioManager.backgroundMusic) {
                this.game.audioManager.backgroundMusic.play().catch(e => {
                    console.warn("Could not resume background music:", e);
                });
            }
        }
        
        return this.isPaused;
    }
    
    /**
     * Handle keyboard input for menu navigation
     * @param {Object} inputHandler - Game input handler
     */
    handleInput(inputHandler) {
        if (!this.isPaused) return;
        
        // Menu navigation with arrow keys
        if (inputHandler.keys['ArrowUp'] || inputHandler.keys['w']) {
            this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
            inputHandler.clearKey('ArrowUp');
            inputHandler.clearKey('w');
        }
        
        if (inputHandler.keys['ArrowDown'] || inputHandler.keys['s']) {
            this.selectedOption = (this.selectedOption + 1) % this.options.length;
            inputHandler.clearKey('ArrowDown');
            inputHandler.clearKey('s');
        }
        
        // Select option with Enter or Space
        if (inputHandler.keys['Enter'] || inputHandler.keys[' ']) {
            this.selectOption(this.selectedOption);
            inputHandler.clearKey('Enter');
            inputHandler.clearKey(' ');
        }
    }
    
    /**
     * Execute the selected menu option
     * @param {number} index - Index of the selected option
     */
    selectOption(index) {
        switch(this.options[index]) {
            case 'Resume':
                this.toggle(); // Unpause
                break;
            case 'Quit':
                // Simple implementation - just go back to starting room
                if (this.game.gameState === 'playing') {
                    this.game.gameState = 'starting';
                    this.game.currentRoom = this.game.startingRoom;
                    this.game.currentRoomId = null;
                    this.toggle(); // Unpause before returning to start
                }
                break;
        }
    }
    
    /**
     * Update pause menu animations
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isPaused) return;
        
        // Fade in effect
        if (this.fadeLevel < 1) {
            this.fadeLevel = Math.min(1, this.fadeLevel + this.fadeSpeed);
        }
        
        // Pulse effect for title
        this.titlePulse += this.pulseDelta;
        if (this.titlePulse > 1 || this.titlePulse < 0) {
            this.pulseDelta *= -1;
        }
    }
    
    /**
     * Render the pause menu
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        if (!this.isPaused) return;
        
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Calculate positions
        const menuWidth = width * 0.4;
        const menuHeight = height * 0.5;
        const menuX = (width - menuWidth) / 2;
        const menuY = (height - menuHeight) / 2;
        
        // Apply fade-in effect
        ctx.save();
        
        // Draw semi-transparent background overlay
        ctx.fillStyle = this.colors.background;
        ctx.globalAlpha = this.fadeLevel * 0.7;
        ctx.fillRect(0, 0, width, height);
        
        // Draw menu background
        ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
        ctx.globalAlpha = this.fadeLevel;
        ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
        
        // Draw menu border
        ctx.strokeStyle = this.colors.title;
        ctx.lineWidth = 2;
        ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);
        
        // Draw neon glow effect around the border
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.colors.title;
        ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);
        ctx.shadowBlur = 0;
        
        // Draw title with pulse effect
        ctx.font = '30px "Press Start 2P", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.title;
        
        // Apply pulse to glow intensity
        const pulseIntensity = 5 + 10 * Math.abs(this.titlePulse);
        ctx.shadowBlur = pulseIntensity;
        ctx.shadowColor = this.colors.title;
        
        ctx.fillText('PAUSED', width / 2, menuY + 50);
        ctx.shadowBlur = 0;
        
        // Draw menu options
        ctx.font = '20px "Press Start 2P", "Courier New", monospace';
        
        const optionStartY = menuY + 120;
        const optionSpacing = 40;
        
        this.options.forEach((option, index) => {
            const isSelected = index === this.selectedOption;
            
            // Set appropriate color based on selection
            if (isSelected) {
                ctx.fillStyle = this.colors.selectedOption;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.colors.selectedOption;
            } else {
                ctx.fillStyle = this.colors.option;
                ctx.shadowBlur = 0;
            }
            
            // Add selection indicator
            const optionText = isSelected ? `> ${option} <` : option;
            
            // Draw the option text
            ctx.fillText(optionText, width / 2, optionStartY + index * optionSpacing);
            ctx.shadowBlur = 0;
        });
        
        ctx.restore();
    }
}
