# Studio Paradigm — i-creativ.net Clone

A faithful rebuild of i-creativ.net, demonstrating advanced motion design, page transitions, and interactive components using modern web technologies.

## Stack

- **Vite 6** for build and development
- **TypeScript** for type-safe code
- **GSAP 3.15** for animation and motion effects
- **Barba.js** for smooth page transitions
- **PixiJS 8** for WebGL rendering
- **Lenis** for smooth scroll behavior
- **Inter** and **Bebas Neue** fonts from Fontsource

## Features

- Intro curtain loader with staggered panel retraction
- Hero slideshow with autoplay controls
- Overlay navigation with smooth animations
- Scroll-triggered reveals for content sections
- Project filtering with GSAP Flip animations
- WebGL displacement effects
- Responsive design from 360px to 4K
- Accessibility-first: works with `prefers-reduced-motion`
- No JavaScript required for basic content viewing

## Setup

```bash
cd i-creativ-clone
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
i-creativ-clone/
  ├── src/
  │   ├── main.ts                 # Entry point
  │   ├── styles/                 # CSS including design tokens
  │   ├── motion/                 # Animation modules
  │   ├── lib/                    # Utility functions
  │   └── data/                   # Content and configuration
  ├── *.html                      # Route pages
  └── vite.config.ts
```

## Motion Modules

- **curtain.ts** — Intro loader animation
- **scroll.ts** — Lenis scroll initialization
- **menu.ts** — Overlay navigation
- **slideshow.ts** — Hero controls
- **barba.ts** — Page transitions
- **reveal.ts** — Scroll-triggered reveals
- **marquee.ts** — Infinite text ticker
- **cursor.ts** — Magnetic hover effects
- **flipFilter.ts** — Project category filtering
- **wgl.ts** — WebGL canvas with Pixi

## Accessibility

The entire site is built with accessibility in mind:
- All animations respect `prefers-reduced-motion`
- Focus management in overlay menu
- Semantic HTML structure
- ARIA attributes where needed
- Works without JavaScript

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Performance

- Code-split motion and Pixi bundles
- Lazy-loaded fonts
- Optimized images (placeholder gradients)
- RAF-based animations pause when tab is hidden
- DPR capped at 2 for WebGL

## License

MIT
