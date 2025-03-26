/**
 * Audio Manager for Neon Requiem
 * Handles all game sound effects using Web Audio API
 * Acts as a separate system that doesn't interfere with game mechanics
 */
export default class AudioManager {
    constructor() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5; // 50% volume by default
            this.masterGain.connect(this.context.destination);
            
            // For background music
            this.backgroundMusic = null;
            this.backgroundGain = this.context.createGain();
            this.backgroundGain.gain.value = 0.8; // 80% volume for background music
            this.backgroundGain.connect(this.masterGain);
            
            // Available background tracks
            this.backgroundTracks = [
                '8-Bit-Chiptune-Arcade.ogg',
                'All-Invaders-Welcome.ogg',
                'Concrete Jungle.ogg',
                'Retro Tank Man.ogg'
            ];
            
            // Track management
            this.currentTrackIndex = -1;
            this.trackDuration = 90000; // 90 seconds default track duration
            this.trackTimer = null;
            this.trackCrossfadeDuration = 2000; // 2 second crossfade
            this.autoChangeEnabled = true; // Enable auto-changing tracks
        } catch(e) {
            console.warn("Web Audio API not supported in this browser. Audio disabled.");
            this.initialized = false;
        }
    }

    /**
     * Creates a quick 'whoosh' sound for dash activation
     */
    playDashSound() {
        if (!this.initialized) return;
        
        try {
            // Create oscillator for the whoosh sound
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillator
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, this.context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.2);
            
            // Configure gain (volume) envelope
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.2);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.2);
            
            // Auto cleanup
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, 300);
        } catch (e) {
            console.warn("Error playing dash sound:", e);
        }
    }
    
    /**
     * Creates a rising pitch beep for trail dot removal
     * @param {number} dotIndex - The index of the dot being removed (0-4)
     */
    playTrailDotRemoveSound(dotIndex) {
        if (!this.initialized) return;
        
        try {
            // Normalize dotIndex to ensure it's between 0-4
            dotIndex = Math.min(4, Math.max(0, dotIndex));
            
            // Create oscillator for the beep
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillator with rising pitch - create a smooth progression
            const baseFreq = 440; // A4
            let freq;
            
            // Map each dot index to a specific frequency for a perfect rising scale
            switch(dotIndex) {
                case 0: // First tone
                    freq = baseFreq; // A4 (440Hz)
                    break;
                case 1: // Second tone
                    freq = baseFreq * 5/4; // C#5 (550Hz)
                    break;
                case 2: // Third tone - now properly positioned
                    freq = baseFreq * 3/2; // E5 (660Hz)
                    break;
                case 3: // Fourth tone
                    freq = baseFreq * 2; // A5 (880Hz)
                    break;
                case 4: // Fifth tone (highest)
                    freq = baseFreq * 8/3; // E6 (1174.7Hz)
                    break;
                default:
                    freq = baseFreq;
            }
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.context.currentTime);
            
            // Configure gain (volume) envelope - short blip
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.1);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.1);
            
            // Auto cleanup
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, 200);
        } catch (e) {
            console.warn("Error playing trail dot remove sound:", e);
        }
    }
    
    /**
     * Creates a ready sound for when dash cooldown completes
     */
    playDashReadySound() {
        if (!this.initialized) return;
        
        try {
            // Create oscillator for the ready sound
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillator - rising pitch
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.context.currentTime);
            oscillator.frequency.linearRampToValueAtTime(880, this.context.currentTime + 0.15);
            
            // Configure gain (volume) envelope
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.25, this.context.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.15);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.15);
            
            // Auto cleanup
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, 250);
        } catch (e) {
            console.warn("Error playing dash ready sound:", e);
        }
    }
    
    /**
     * Creates a sound effect for when a door unlocks
     * @param {number} doorIndex - The index of the door being unlocked (0=top, 1=right, 2=bottom, 3=left)
     */
    playDoorUnlockSound(doorIndex) {
        if (!this.initialized) return;
        
        try {
            // Create oscillators for a rich unlock sound (chord-like)
            const osc1 = this.context.createOscillator();
            const osc2 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Base frequency varies slightly by door position
            const baseFreq = 440 + (doorIndex * 30); // Different tone for each door
            
            // Configure oscillators
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(baseFreq, this.context.currentTime);
            osc1.frequency.linearRampToValueAtTime(baseFreq * 1.1, this.context.currentTime + 0.3);
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(baseFreq * 1.5, this.context.currentTime);
            osc2.frequency.linearRampToValueAtTime(baseFreq * 1.7, this.context.currentTime + 0.3);
            
            // Configure gain (volume) envelope - rising then falling
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.4);
            
            // Connect nodes
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            osc1.start();
            osc2.start();
            osc1.stop(this.context.currentTime + 0.4);
            osc2.stop(this.context.currentTime + 0.4);
            
            // Auto cleanup
            setTimeout(() => {
                osc1.disconnect();
                osc2.disconnect();
                gainNode.disconnect();
            }, 500);
        } catch (e) {
            console.warn("Error playing door unlock sound:", e);
        }
    }
    
    /**
     * Creates a "denied" sound effect for when a player tries to go through a locked door
     */
    playDoorLockedSound() {
        if (!this.initialized) return;
        
        try {
            // Create oscillator for the failed entry sound
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillator - descending pitch for "denied" feeling
            oscillator.type = 'square'; // Harsher square wave for denied sound
            oscillator.frequency.setValueAtTime(330, this.context.currentTime);
            oscillator.frequency.linearRampToValueAtTime(220, this.context.currentTime + 0.2);
            
            // Configure gain (volume) envelope - sharp attack, quick decay
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, this.context.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.2);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.2);
            
            // Auto cleanup
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, 300);
        } catch (e) {
            console.warn("Error playing door locked sound:", e);
        }
    }

    /**
     * Creates an impact sound when dash damages an enemy
     */
    playDashHitSound() {
        if (!this.initialized) {
            console.warn("AudioManager: Not initialized when trying to play dash hit sound");
            return;
        }
        
        console.log("AudioManager: Playing dash hit sound");
        
        try {
            // Create oscillators for a more complex sound
            const oscillator1 = this.context.createOscillator();
            const oscillator2 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure a more aggressive, louder sound for dash hit
            oscillator1.type = 'sawtooth'; // Sharp attack for impact feel
            oscillator1.frequency.setValueAtTime(300, this.context.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(150, this.context.currentTime + 0.15);
            
            oscillator2.type = 'square';
            oscillator2.frequency.setValueAtTime(200, this.context.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.15);
            
            // Configure gain (volume) envelope - louder with quick attack, slower decay
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, this.context.currentTime + 0.02); // Increased volume
            gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.25);
            
            // Connect both oscillators to gain node
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            oscillator1.start(this.context.currentTime);
            oscillator2.start(this.context.currentTime);
            oscillator1.stop(this.context.currentTime + 0.25);
            oscillator2.stop(this.context.currentTime + 0.25);
            
            // Auto cleanup
            setTimeout(() => {
                oscillator1.disconnect();
                oscillator2.disconnect();
                gainNode.disconnect();
            }, 350);
        } catch (e) {
            console.error("Error playing dash hit sound:", e);
        }
    }

    /**
     * Creates a neon laser sound for player shooting
     */
    playShootSound() {
        if (!this.initialized) return;
        
        try {
            // Create oscillators for the laser sound
            const oscillator1 = this.context.createOscillator();
            const oscillator2 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillator for the laser tone
            oscillator1.type = 'sine';
            oscillator1.frequency.setValueAtTime(1200, this.context.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.1);
            
            // Second oscillator for a harmonic
            oscillator2.type = 'sawtooth';
            oscillator2.frequency.setValueAtTime(1200, this.context.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(1400, this.context.currentTime + 0.05);
            
            // Configure gain (volume) envelope
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.15);
            
            // Connect nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(this.context.currentTime + 0.15);
            oscillator2.stop(this.context.currentTime + 0.15);
            
            // Auto cleanup
            setTimeout(() => {
                oscillator1.disconnect();
                oscillator2.disconnect();
                gainNode.disconnect();
            }, 300);
        } catch (e) {
            console.warn("Error playing shoot sound:", e);
        }
    }

    /**
     * Creates a collection sound for when a player picks up an item
     * @param {string} itemType - Optional type of item being collected
     */
    playItemCollectSound(itemType = 'default') {
        if (!this.initialized) return;
        
        try {
            // Create oscillators for a rich pickup sound
            const osc1 = this.context.createOscillator();
            const osc2 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Set different sounds based on item type
            let baseFreq = 660; // Default E5
            let duration = 0.2;
            
            // Customize sound based on item type
            switch(itemType) {
                case 'health':
                    baseFreq = 523.25; // C5
                    duration = 0.25;
                    break;
                case 'ammo':
                    baseFreq = 659.25; // E5
                    duration = 0.2;
                    break;
                case 'speedBoost':
                    baseFreq = 783.99; // G5
                    duration = 0.15;
                    break;
                case 'shield':
                    baseFreq = 440; // A4
                    duration = 0.3;
                    break;
                default:
                    baseFreq = 660;
                    duration = 0.2;
            }
            
            // Configure oscillators for an ascending chime
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(baseFreq, this.context.currentTime);
            osc1.frequency.linearRampToValueAtTime(baseFreq * 1.25, this.context.currentTime + duration);
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(baseFreq * 1.5, this.context.currentTime);
            osc2.frequency.linearRampToValueAtTime(baseFreq * 1.8, this.context.currentTime + duration);
            
            // Configure gain envelope - quickly rising, slow decay
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.25, this.context.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
            
            // Connect nodes
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            osc1.start();
            osc2.start();
            osc1.stop(this.context.currentTime + duration);
            osc2.stop(this.context.currentTime + duration);
            
            // Auto cleanup
            setTimeout(() => {
                osc1.disconnect();
                osc2.disconnect();
                gainNode.disconnect();
            }, duration * 1000 + 100);
        } catch (e) {
            console.warn("Error playing item collect sound:", e);
        }
    }

    /**
     * Creates a sound effect for transitioning through a door
     * @param {string|Object} direction - Direction of the door ('north', 'east', 'south', 'west') or door data object
     */
    playDoorTransitionSound(direction = 'east') {
        if (!this.initialized) return;
        
        try {
            // Handle case where direction is a door data object
            if (typeof direction === 'object') {
                // Extract the direction from door data if possible
                if (direction.direction) {
                    direction = direction.direction;
                } else {
                    // Default to east if no direction is found
                    direction = 'east';
                }
            }
            
            // Create oscillators for a rich transition sound
            const osc1 = this.context.createOscillator();
            const osc2 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Base frequency varies slightly by door direction
            let baseFreq = 440; // Default A4
            
            // Different tone for each door direction
            switch(direction) {
                case 'north':
                    baseFreq = 523.25; // C5
                    break;
                case 'east':
                    baseFreq = 587.33; // D5
                    break;
                case 'south':
                    baseFreq = 659.25; // E5
                    break;
                case 'west':
                    baseFreq = 698.46; // F5
                    break;
                default:
                    baseFreq = 440; // A4
            }
            
            // Configure oscillators for a descending-then-ascending "swoosh"
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(baseFreq, this.context.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, this.context.currentTime + 0.15);
            osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, this.context.currentTime + 0.3);
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(baseFreq * 1.5, this.context.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(baseFreq, this.context.currentTime + 0.15);
            osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, this.context.currentTime + 0.3);
            
            // Configure gain envelope - fade in, then out
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.25, this.context.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
            
            // Connect nodes
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            osc1.start();
            osc2.start();
            osc1.stop(this.context.currentTime + 0.3);
            osc2.stop(this.context.currentTime + 0.3);
            
            // Auto cleanup
            setTimeout(() => {
                osc1.disconnect();
                osc2.disconnect();
                gainNode.disconnect();
            }, 400);
        } catch (e) {
            console.warn("Error playing door transition sound:", e);
        }
    }
    
    /**
     * Creates a sound effect for room transitions
     */
    playRoomTransitionSound() {
        if (!this.initialized) return;
        
        try {
            // Create oscillators for a room transition sound
            const osc1 = this.context.createOscillator();
            const osc2 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillators for a rising "whoosh" sound
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(300, this.context.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(600, this.context.currentTime + 0.4);
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(450, this.context.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(900, this.context.currentTime + 0.4);
            
            // Configure gain envelope
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.4);
            
            // Connect nodes
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            osc1.start();
            osc2.start();
            osc1.stop(this.context.currentTime + 0.4);
            osc2.stop(this.context.currentTime + 0.4);
            
            // Auto cleanup
            setTimeout(() => {
                osc1.disconnect();
                osc2.disconnect();
                gainNode.disconnect();
            }, 500);
        } catch (e) {
            console.warn("Error playing room transition sound:", e);
        }
    }

    /**
     * Creates a sound effect for starting the main game
     */
    playGameStartSound() {
        if (!this.initialized) return;
        
        try {
            // Create oscillators for an impactful game start sound
            const osc1 = this.context.createOscillator();
            const osc2 = this.context.createOscillator();
            const osc3 = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // Configure oscillators for a dramatic rising sound
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(220, this.context.currentTime); // Low A3
            osc1.frequency.exponentialRampToValueAtTime(440, this.context.currentTime + 0.6); // Up to A4
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(330, this.context.currentTime); // E4
            osc2.frequency.exponentialRampToValueAtTime(660, this.context.currentTime + 0.5); // Up to E5
            
            osc3.type = 'square';
            osc3.frequency.setValueAtTime(275, this.context.currentTime); // C#4
            osc3.frequency.exponentialRampToValueAtTime(550, this.context.currentTime + 0.7); // Up to C#5
            
            // Configure gain envelope - dramatic swell
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.context.currentTime + 0.05); // Quick initial rise
            gainNode.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.3); // Continue rising
            gainNode.gain.linearRampToValueAtTime(0.01, this.context.currentTime + 0.7); // Fade out
            
            // Connect nodes
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            osc3.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play and clean up
            osc1.start();
            osc2.start();
            osc3.start();
            osc1.stop(this.context.currentTime + 0.7);
            osc2.stop(this.context.currentTime + 0.7);
            osc3.stop(this.context.currentTime + 0.7);
            
            // Auto cleanup
            setTimeout(() => {
                osc1.disconnect();
                osc2.disconnect();
                osc3.disconnect();
                gainNode.disconnect();
            }, 800);
        } catch (e) {
            console.warn("Error playing game start sound:", e);
        }
    }

    /**
     * Plays a background music track and sets it to loop
     * @param {string} trackName - Name of the track file (e.g., 'level1.ogg')
     */
    playBackground(trackName) {
        if (!this.initialized) {
            console.warn("Audio not initialized, can't play background music");
            return;
        }
        
        try {
            console.log(`Attempting to play background track: ${trackName}`);
            
            // Stop any currently playing background music
            if (this.backgroundMusic) {
                this.backgroundMusic.pause();
                this.backgroundMusic = null;
            }
            
            // Clear any existing track timers
            if (this.trackTimer) {
                clearTimeout(this.trackTimer);
                this.trackTimer = null;
            }
            
            // Ensure the file has .ogg extension
            let trackPath = trackName;
            if (!trackPath.toLowerCase().endsWith('.ogg')) {
                trackPath = trackPath.includes('.') 
                    ? trackPath.substring(0, trackPath.lastIndexOf('.')) + '.ogg'
                    : trackPath + '.ogg';
            }
            
            // Create audio element to load the music
            const audio = new Audio();
            
            // Debug event listeners
            audio.addEventListener('canplaythrough', () => {
                console.log(`Track ${trackPath} loaded and ready to play`);
            });
            
            audio.addEventListener('error', (e) => {
                console.error(`Error loading audio track ${trackPath}:`, e);
            });
            
            // Set audio properties
            audio.src = `./assets/audio/${trackPath}`;
            audio.loop = false; // Set to false so we can handle the track change ourselves
            
            // Handle track ending - play next track with crossfade
            audio.addEventListener('ended', () => {
                console.log(`Track ${trackPath} ended naturally`);
                if (this.autoChangeEnabled) {
                    this.playNextRandomTrack();
                }
            });
            
            // Also set a timer as a fallback mechanism for track changes
            // This ensures we change tracks even if the 'ended' event doesn't fire properly
            this.trackTimer = setTimeout(() => {
                if (this.autoChangeEnabled && this.backgroundMusic === audio) {
                    console.log(`Track timer triggered for ${trackPath}`);
                    this.playNextRandomTrack();
                }
            }, this.trackDuration);
            
            // Try to play the audio
            this.context.resume().then(() => {
                console.log("AudioContext resumed successfully");
                
                // Create media element source
                try {
                    const source = this.context.createMediaElementSource(audio);
                    source.connect(this.backgroundGain);
                    
                    // Store reference to the audio element
                    this.backgroundMusic = audio;
                    
                    // Play the track
                    audio.play()
                        .then(() => {
                            console.log(`Successfully playing background track: ${trackPath}`);
                        })
                        .catch(e => {
                            console.warn("Error playing background music (autoplay restrictions):", e);
                            
                            // Set up a visible UI notification about autoplay
                            const audioNotification = document.createElement('div');
                            audioNotification.style.cssText = `
                                position: fixed;
                                top: 20px;
                                left: 50%;
                                transform: translateX(-50%);
                                background-color: rgba(0, 0, 0, 0.8);
                                color: white;
                                padding: 10px 20px;
                                border-radius: 5px;
                                font-family: Arial, sans-serif;
                                z-index: 1000;
                                cursor: pointer;
                            `;
                            audioNotification.innerHTML = 'Click anywhere to enable music ';
                            document.body.appendChild(audioNotification);
                            
                            // User interaction is required for audio playback
                            const resumeAudio = () => {
                                this.context.resume().then(() => {
                                    audio.play()
                                        .then(() => {
                                            console.log("Audio playing after user interaction");
                                            if (document.body.contains(audioNotification)) {
                                                document.body.removeChild(audioNotification);
                                            }
                                        })
                                        .catch(err => console.warn("Still unable to play audio:", err));
                                });
                                
                                document.removeEventListener('click', resumeAudio);
                                document.removeEventListener('keydown', resumeAudio);
                            };
                            
                            document.addEventListener('click', resumeAudio);
                            document.addEventListener('keydown', resumeAudio);
                        });
                } catch (e) {
                    console.error("Error creating media element source:", e);
                }
            }).catch(e => {
                console.error("Failed to resume AudioContext:", e);
            });
        } catch (e) {
            console.warn("Error setting up background music:", e);
        }
    }
    
    /**
     * Plays the next random track with a smooth crossfade
     */
    playNextRandomTrack() {
        if (!this.initialized || !this.autoChangeEnabled) return;
        
        // Select a new random track that's different from the current one
        let nextTrackIndex;
        do {
            nextTrackIndex = Math.floor(Math.random() * this.backgroundTracks.length);
        } while (nextTrackIndex === this.currentTrackIndex && this.backgroundTracks.length > 1);
        
        this.currentTrackIndex = nextTrackIndex;
        const nextTrack = this.backgroundTracks[nextTrackIndex];
        
        console.log(`Changing to next random track: ${nextTrack}`);
        
        // Fade out current track if it exists
        if (this.backgroundMusic) {
            // Gradually reduce volume
            const startVolume = this.backgroundGain.gain.value;
            const fadeInterval = 50; // 50ms intervals
            const steps = this.trackCrossfadeDuration / fadeInterval;
            const volumeStep = startVolume / steps;
            
            let currentStep = 0;
            
            const fadeOutInterval = setInterval(() => {
                currentStep++;
                const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
                this.backgroundGain.gain.value = newVolume;
                
                if (currentStep >= steps) {
                    clearInterval(fadeOutInterval);
                    this.playBackground(nextTrack);
                    
                    // Fade in the new track
                    setTimeout(() => {
                        let fadeInStep = 0;
                        const fadeInInterval = setInterval(() => {
                            fadeInStep++;
                            const newVolume = Math.min(startVolume, volumeStep * fadeInStep);
                            this.backgroundGain.gain.value = newVolume;
                            
                            if (fadeInStep >= steps) {
                                clearInterval(fadeInInterval);
                            }
                        }, fadeInterval);
                    }, 300); // Small delay before starting fade in
                }
            }, fadeInterval);
        } else {
            // No current track, just play the new one
            this.playBackground(nextTrack);
        }
    }
    
    /**
     * Selects and plays a random background track from available tracks
     * Returns the name of the selected track
     * @returns {string} Name of the selected track
     */
    playRandomBackground() {
        if (!this.backgroundTracks || this.backgroundTracks.length === 0) {
            console.warn("No background tracks available");
            return null;
        }
        
        // Choose a random track
        const randomIndex = Math.floor(Math.random() * this.backgroundTracks.length);
        this.currentTrackIndex = randomIndex;
        const selectedTrack = this.backgroundTracks[randomIndex];
        
        // Play the selected track
        this.playBackground(selectedTrack);
        
        console.log(`Selected random background track: ${selectedTrack}`);
        return selectedTrack;
    }
    
    /**
     * Sets the volume of background music
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setBackgroundVolume(volume) {
        if (!this.initialized) return;
        
        // Clamp volume between 0 and 1
        const clampedVolume = Math.max(0, Math.min(1, volume));
        
        // Set the background gain
        this.backgroundGain.gain.value = clampedVolume;
    }
    
    /**
     * Enable or disable auto-changing of tracks
     * @param {boolean} enabled - Whether to enable auto-changing
     */
    setAutoChangeEnabled(enabled) {
        this.autoChangeEnabled = enabled;
    }
    
    /**
     * Fade out background music over the specified duration
     * @param {number} duration - Fade duration in milliseconds
     */
    fadeOutBackgroundMusic(duration = 2000) {
        if (!this.initialized || !this.backgroundMusic) return;
        
        try {
            const currentTime = this.context.currentTime;
            this.backgroundGain.gain.setValueAtTime(this.backgroundGain.gain.value, currentTime);
            this.backgroundGain.gain.linearRampToValueAtTime(0, currentTime + (duration / 1000));
            
            // Stop the music after fade out
            setTimeout(() => {
                if (this.backgroundMusic) {
                    this.backgroundMusic.pause();
                }
            }, duration);
            
            console.log("AudioManager: Fading out background music");
        } catch(e) {
            console.warn("AudioManager: Error while fading out background music", e);
        }
    }
    
    /**
     * Fade in background music over the specified duration
     * @param {number} duration - Fade duration in milliseconds
     */
    fadeInBackgroundMusic(duration = 2000) {
        if (!this.initialized || !this.backgroundMusic) return;
        
        try {
            // Ensure the music is playing
            if (this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(e => {
                    console.warn("AudioManager: Error playing background music during fade in", e);
                });
            }
            
            const currentTime = this.context.currentTime;
            // Set initial volume to 0
            this.backgroundGain.gain.setValueAtTime(0, currentTime);
            // Ramp up to normal volume
            this.backgroundGain.gain.linearRampToValueAtTime(0.8, currentTime + (duration / 1000));
            
            console.log("AudioManager: Fading in background music");
        } catch(e) {
            console.warn("AudioManager: Error while fading in background music", e);
        }
    }

    /**
     * Play a dramatic death sound effect
     */
    playDeathSound() {
        if (!this.initialized) return;
        
        try {
            // Create multiple oscillators for a rich death sound
            const baseOsc = this.context.createOscillator();
            const highOsc = this.context.createOscillator();
            
            // Create gain nodes for envelope
            const baseGain = this.context.createGain();
            const highGain = this.context.createGain();
            
            // Connect oscillators to gains
            baseOsc.connect(baseGain);
            highOsc.connect(highGain);
            
            // Connect gains to master
            baseGain.connect(this.masterGain);
            highGain.connect(this.masterGain);
            
            // Configure oscillators
            baseOsc.type = 'sine';
            baseOsc.frequency.setValueAtTime(110, this.context.currentTime); // Low A
            baseOsc.frequency.exponentialRampToValueAtTime(55, this.context.currentTime + 1.5); // Drop an octave
            
            highOsc.type = 'sawtooth';
            highOsc.frequency.setValueAtTime(440, this.context.currentTime); // A4
            highOsc.frequency.exponentialRampToValueAtTime(110, this.context.currentTime + 0.8); // Dramatic fall
            
            // Configure gain envelopes
            baseGain.gain.setValueAtTime(0, this.context.currentTime);
            baseGain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.1);
            baseGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 1.5);
            
            highGain.gain.setValueAtTime(0, this.context.currentTime);
            highGain.gain.linearRampToValueAtTime(0.15, this.context.currentTime + 0.05);
            highGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.8);
            
            // Start and stop oscillators
            baseOsc.start();
            highOsc.start();
            baseOsc.stop(this.context.currentTime + 1.5);
            highOsc.stop(this.context.currentTime + 0.8);
            
            console.log("AudioManager: Playing death sound");
        } catch(e) {
            console.warn("AudioManager: Error playing death sound", e);
        }
    }
}
