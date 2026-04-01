# MARS-SWARM 1.0

A modern 3D evolution of the classic Snake game, featuring a smooth-moving worm in a cyberpunk-inspired environment with MARS branding.

![MARS-SWARM Game](screenshot_menu.png)

## 🎮 Play the Game

Open `index.html` in a modern web browser or serve via local server:

```bash
python -m http.server 8080
```

Then navigate to `http://localhost:8080`

## ✨ Features

- **3D Gameplay**: Built with Three.js for smooth 60fps experience
- **Smooth Movement**: Sinusoidal organic motion, not jerky grid-based
- **Cyberpunk Atmosphere**: Neon-lit MARS-branded environment
- **Progressive Difficulty**: Speed increases as your worm grows
- **Save/Load System**: Pause and save your progress anytime
- **High Score Tracking**: Local storage for your best scores
- **Cross-Platform**: Works on desktop (keyboard) and mobile (touch)

## 🎯 Controls

| Input | Action |
|-------|--------|
| WASD / Arrow Keys | Move the worm |
| SPACE / P / ESC | Pause game |
| Touch Buttons | Mobile controls |

## 🛠️ Technical Stack

- **Three.js** - 3D rendering engine
- **WebGL** - Hardware-accelerated graphics
- **ES6 Modules** - Modern JavaScript architecture
- **LocalStorage API** - Game state persistence
- **CSS3** - Modern UI with glassmorphism effects

## 🚀 Deployment

This is a static website that can be deployed to any web hosting service:
- GitHub Pages
- Vercel
- Netlify
- Any static hosting

## 📁 Project Structure

```
swarm/
├── index.html          # Main entry point
├── style.css           # UI styling
├── js/
│   ├── main.js         # Entry point
│   ├── game.js         # Core game logic
│   ├── renderer.js     # Three.js setup
│   ├── worm.js         # Worm entity
│   ├── fruit.js        # Collectible fruits
│   └── particles.js    # VFX system
├── assets/
│   └── logo.png        # MARS branding
└── README.md           # This file
```

## 🎨 Design Philosophy

- **No Pixel Art**: Modern glossy aesthetics
- **Dynamic Lighting**: Real-time shadows and bloom effects
- **MARS Branding**: Green diamond logo integrated into gameplay
- **Clean UI**: Glassmorphism interface with neon accents

## 📄 License

© 2026 MARS - The Compliance Workspace

## 🙏 Credits

Developed as a modern interpretation of the classic Nokia 3310 Snake game.
