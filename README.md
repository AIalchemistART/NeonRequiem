# 🎮 Neon Requiem

**A procedurally generated roguelike dungeon crawler with cyberpunk aesthetics and synthesized audio.**

[![Live Game](https://img.shields.io/badge/Play-Live%20Demo-00ffff?style=for-the-badge)](https://neon-requiem.netlify.app)
[![Platform](https://img.shields.io/badge/Platform-Web-ff0066?style=for-the-badge)](https://neon-requiem.netlify.app)

---

## 🌟 Features

- **Procedural Generation** — Dungeon layouts are built with seedrandom so a seed reproduces the same rooms
- **Roguelike Mechanics** — Death restarts the run; exploration is room by room
- **Cyberpunk Aesthetic** — Neon-cyan palette, glow effects, and a monospace terminal font
- **Synthesized Audio** — Web Audio API effects for shooting, dashing, doors, items, and death
- **Enemy AI** — Chase, patrol, and flank behaviors; patrol enemies also fire at the player
- **Canvas Rendering** — Custom 2D renderer with a follow camera and particle effects
- **Pointer Lock Controls** — Mouse aiming, with WASD or arrow-key movement

## 🎯 Gameplay

- Start in the opening room, then move through connected dungeon rooms
- Use WASD or the arrow keys to move, and the mouse to aim
- Left-click to shoot; right-click to dash through enemies
- Clear a room's enemies to unlock its doors and continue
- Pick up health, speed, shield, and fire-rate items
- Dying ends the run and restarts the game
- Vibe Portals in the starting room link out to Vibeverse and Vibe Jam (press Enter while nearby)

## 🛠️ Tech Stack

- **Vanilla JavaScript** — No frameworks, pure ES6 modules
- **HTML5 Canvas** — 2D rendering with a custom camera
- **Web Audio API** — Synthesized sound effects
- **Seedrandom.js** — Deterministic procedural generation (loaded from CDN)
- **Google Analytics** — Default GA4 page-view tag in `index.html`

## 🚀 Getting Started

### Play Online

Visit **[neon-requiem.netlify.app](https://neon-requiem.netlify.app)** to play instantly in your browser.

### Local Development

```bash
# Clone the repository
git clone https://github.com/AIalchemistART/NeonRequiem.git
cd NeonRequiem

# Serve with any static server (e.g., Python)
python -m http.server 8000

# Or use Live Server in VS Code
# Open index.html and click "Go Live"
```

Visit `http://localhost:8000` in your browser. Audio starts after the on-screen materialization prompt, which satisfies the browser's user-gesture requirement.

## 📁 Project Structure

```
NeonRequiem/
├── index.html                      # Page, styles, analytics, and audio prompt
├── _headers                        # Netlify cache headers
├── src/
│   ├── main.js                     # Game initialization
│   ├── game/
│   │   ├── game.js                 # Core game loop and room transitions
│   │   ├── player.js               # Player movement, shooting, and dash
│   │   ├── enemy.js                # Enemy entity system
│   │   ├── enemyAI.js              # Chase, patrol, and flank behaviors
│   │   ├── physics.js              # Collision detection
│   │   ├── room.js                 # Room layout, doors, and items
│   │   ├── startingRoom.js         # Opening room and external portals
│   │   ├── proceduralGenerator.js  # Seeded dungeon builder
│   │   ├── vibePortal.js           # Vibeverse / Vibe Jam portals
│   │   └── camera.js               # Viewport system
│   ├── rendering/
│   │   ├── renderer.js             # Canvas drawing system
│   │   └── effects/                # Particles and visual effects
│   ├── input/
│   │   └── inputHandler.js         # Keyboard, mouse, and pointer lock
│   ├── audio/
│   │   └── audioManager.js         # Synthesized sound effects
│   └── ui/
│       └── pauseMenu.js            # Pause screen UI
└── assets/icons/                   # Favicon
```

## 🎮 Controls

| Action | Key/Mouse |
|--------|-----------|
| Move | `W` `A` `S` `D` or arrow keys |
| Aim | Mouse |
| Shoot | Left click |
| Dash | Right click |
| Pause / resume toggle | `P` |
| Confirm pause-menu option | `Enter` or `Space` |
| Use a Vibe Portal | `Enter` |

Click the canvas to capture the pointer. Pause-menu options are Resume and Quit.

## 🧩 Core Systems

### Procedural Generation
- Uses `seedrandom` for deterministic room layouts
- Builds a connected dungeon, including a boss room on larger runs
- Room difficulty rises with rooms cleared and play time, with a small bump while health stays high
- Rooms can contain walls, enemies, and items

### Enemy AI
- Direct chase, waypoint patrol, and flanking — there is no grid pathfinder
- Spawned types include normal, fast, strong, chaser, patrol, and flank
- Patrol enemies fire projectiles when the player is in range

### Physics
- Rectangle, circle, and polygon collision checks
- Projectiles move with velocity and are removed when they leave the room
- Walls block the player, enemies, and bullets

### Items
- Health restores the player
- Speed boost and shield are temporary
- The ammo pickup raises fire rate for a short time

### Audio System
- Effects are synthesized with the Web Audio API (no spatial panner, no footstep samples)
- Covers shooting, dash, door transitions, item pickups, and death
- `playBackground()` looks for `.ogg` files under `assets/audio/`; that folder is not in the repository

## 🎨 Visual Style

- **Color Palette:** Neon cyan (`#0ff`), deep blacks, electric blues
- **Typography:** Courier New monospace for that terminal aesthetic
- **Effects:** CSS glow shadows, border animations, and canvas particles
- **Theme:** Cyberpunk dungeon crawler

## 🌐 Deployment

The live site is hosted on **Netlify**. There is no build step. `_headers` only sets a no-cache policy:

```
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
```

## 📊 Analytics

`index.html` loads a GA4 tag (`G-8GQD5XEY9B`) with the default page-view config. The game code does not send custom events for deaths, death locations, or room progression.

## 🐛 Known Issues

- Audio requires a user gesture before the browser will start it
- Pointer lock may not work on some mobile browsers
- Performance varies on lower-end devices
- The starting-room hint lists Shift and Space for dash; the input handler dashes on right click

## 🔮 Future Enhancements

- [ ] Save/load game state
- [ ] Multiple weapon types
- [ ] Minimap overlay
- [ ] Leaderboard integration

## 📝 License

MIT License — Free to use, modify, and distribute. This repository does not include a separate `LICENSE` file.

## 🙏 Credits

Built with vanilla JavaScript as a showcase of procedural generation and game development fundamentals.

**Developer:** AI Alchemist  
**Engine:** Custom HTML5 Canvas Renderer  
**Audio:** Web Audio API

---

🎮 **[Play Now](https://neon-requiem.netlify.app)** | 💬 Report bugs via GitHub Issues
