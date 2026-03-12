# 🎮 Neon Requiem

**A procedurally generated roguelike dungeon crawler with cyberpunk aesthetics and atmospheric audio design.**

[![Live Game](https://img.shields.io/badge/Play-Live%20Demo-00ffff?style=for-the-badge)](https://neon-requiem.netlify.app)
[![Platform](https://img.shields.io/badge/Platform-Web-ff0066?style=for-the-badge)](https://neon-requiem.netlify.app)

---

## 🌟 Features

- **Procedural Generation** — Every dungeon is unique, built with seedrandom for deterministic level creation
- **Roguelike Mechanics** — Permadeath, room-based exploration, enemy AI with pathfinding
- **Cyberpunk Aesthetic** — Neon-cyan color palette, atmospheric glow effects, retro terminal fonts
- **Dynamic Audio** — Spatial audio system with footsteps, weapon sounds, and ambient music
- **Enemy AI** — Smart pathfinding enemies that chase and engage the player
- **Canvas Rendering** — Custom 2D renderer with camera system and visual effects
- **Pointer Lock Controls** — FPS-style mouse look and WASD movement

## 🎯 Gameplay

- Navigate procedurally generated rooms filled with enemies
- Use WASD to move and mouse to aim
- Click to shoot projectiles at enemies
- Survive as long as possible in true roguelike fashion
- Find Vibe Portals to progress to new rooms

## 🛠️ Tech Stack

- **Vanilla JavaScript** — No frameworks, pure ES6 modules
- **HTML5 Canvas** — 2D rendering with custom camera system
- **Web Audio API** — Spatial audio with dynamic sound effects
- **Seedrandom.js** — Deterministic procedural generation
- **Google Analytics** — Player behavior tracking

## 🚀 Getting Started

### Play Online

Visit **[neon-requiem.netlify.app](https://neon-requiem.netlify.app)** to play instantly in your browser.

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/neon-requiem.git
cd neon-requiem

# Serve with any static server (e.g., Python)
python -m http.server 8000

# Or use Live Server in VS Code
# Open index.html and click "Go Live"
```

Visit `http://localhost:8000` in your browser.

## 📁 Project Structure

```
neon-requiem/
├── index.html              # Main entry point
├── src/
│   ├── main.js            # Game initialization
│   ├── game/
│   │   ├── game.js        # Core game loop
│   │   ├── player.js      # Player entity and controls
│   │   ├── enemy.js       # Enemy entity system
│   │   ├── enemyAI.js     # Pathfinding and behavior
│   │   ├── physics.js     # Collision detection
│   │   ├── room.js        # Room generation
│   │   ├── proceduralGenerator.js  # Dungeon builder
│   │   ├── vibePortal.js  # Room transitions
│   │   └── camera.js      # Viewport system
│   ├── rendering/
│   │   └── renderer.js    # Canvas drawing system
│   ├── input/
│   │   └── inputHandler.js # Keyboard/mouse input
│   ├── audio/
│   │   └── audioManager.js # Sound effects system
│   └── ui/
│       └── pauseMenu.js   # Pause screen UI
└── assets/                # Audio and visual assets
```

## 🎮 Controls

| Action | Key/Mouse |
|--------|-----------|
| Move Forward | `W` |
| Move Left | `A` |
| Move Backward | `S` |
| Move Right | `D` |
| Aim | Mouse Movement |
| Shoot | Left Click |
| Pause | `ESC` |
| Resume | Click Canvas |

## 🧩 Core Systems

### Procedural Generation
- Uses `seedrandom` for deterministic room layouts
- Each room is uniquely generated with walls, enemies, and portals
- Configurable room sizes and enemy counts

### Enemy AI
- Pathfinding algorithm tracks player position
- Dynamic aggro range and chase behavior
- Collision-aware movement system

### Physics
- AABB (Axis-Aligned Bounding Box) collision detection
- Projectile system with velocity and lifespan
- Wall collision for player, enemies, and bullets

### Audio System
- Web Audio API implementation
- Spatial audio with distance attenuation
- Footstep sounds based on movement
- Weapon firing effects
- Ambient background music

## 🎨 Visual Style

- **Color Palette:** Neon cyan (`#0ff`), deep blacks, electric blues
- **Typography:** Courier New monospace for that terminal aesthetic
- **Effects:** CSS glow shadows, border animations, particle-like UI elements
- **Theme:** Cyberpunk/synthwave dungeon crawler

## 🌐 Deployment

The game is hosted on **Netlify** with automatic deployment from the `main` branch.

```bash
# Build is not required (static files only)
# Push to main branch triggers deployment

git add .
git commit -m "Update game features"
git push origin main
```

Custom headers configured in `_headers` for security and caching.

## 📊 Analytics

Google Analytics tracks:
- Session duration
- Death counts and locations
- Room progression
- Browser and device types

## 🐛 Known Issues

- Audio requires user interaction to initialize (browser policy)
- Pointer lock may not work on some mobile browsers
- Performance varies on lower-end devices

## 🔮 Future Enhancements

- [ ] Save/load game state
- [ ] Multiple weapon types
- [ ] Power-ups and collectibles
- [ ] Boss rooms and special encounters
- [ ] Minimap overlay
- [ ] Difficulty scaling
- [ ] Leaderboard integration

## 📝 License

MIT License — Free to use, modify, and distribute.

## 🙏 Credits

Built with vanilla JavaScript as a showcase of procedural generation and game development fundamentals.

**Developer:** AI Alchemist  
**Engine:** Custom HTML5 Canvas Renderer  
**Audio:** Web Audio API

---

🎮 **[Play Now](https://neon-requiem.netlify.app)** | 💬 Report bugs via GitHub Issues
