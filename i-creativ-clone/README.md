# Studio site template

A front-end rebuild of the structure and motion system of an award-style agency
site: WebGL background, GSAP-driven curtain, Barba page transitions, Lenis
smooth scroll, an overlay menu, a hero slideshow and a Flip-animated project
filter.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve the production build
npm run typecheck
```

---

## What this is, and what it is not

The reference for this build is a real studio's website. What has been rebuilt
is the **engineering**: the grid, the fluid type scale, the layout rhythm, the
transition choreography and the interaction behaviour.

Everything you can read is **original placeholder content** for an invented
studio ("Meridian"). The copy, the project list, the founder bios and the award
citations are written for this template — none of it is lifted from the
reference site, whose text and branding belong to the business that owns it.
Images are excluded by design; the media slots are gradient stand-ins.

Two licensed typefaces from the reference were substituted with free
equivalents: **Bebas Neue** for display and **Inter Variable** for text.

Use this as a starting point for your own site. Do not ship it as-is with the
placeholder identity.

---

## Editing the content

**Almost everything you will want to change lives in
[`src/data/site.ts`](src/data/site.ts)** — studio name, navigation, hero
slides, services, principles, awards, founders and the full project list, all
typed and commented.

The project list is the one place where that file is load-bearing at build
time: [`src/build/partials.ts`](src/build/partials.ts) generates the filter bar
and every project row from the same array the runtime filters, so the category
counts can never disagree with the rows they count.

To rebrand: edit `src/data/site.ts`, then `npm run build`.

> The page bodies themselves still carry their prose inline in the `.html`
> files. `site.ts` is the single source for the shell, the nav and the project
> list; wiring the remaining sections through it is the natural next step if
> you want a true one-file rebrand.

---

## How it is put together

### Seven real documents

Barba fetches a target page and swaps only the `[data-barba="container"]`
node, so each route has to exist as its own HTML file — `vite.config.ts`
declares all seven as build inputs. The shell (head, menu, header, curtain,
canvas, footer) is identical everywhere, so rather than maintaining seven
copies each page carries placeholder comments (`<!--@SHELL-->`,
`<!--@FOOTER-->`, `<!--@PROJECT_LIST-->`) that a Vite plugin substitutes at
build time.

The upshot: the transition layer is an enhancement. With JavaScript disabled
these are seven ordinary, fully readable pages.

### The motion system

Each module in `src/motion/` owns one behaviour and returns a handle so Barba
can unmount it on navigation — a listener leaked here compounds with every page
change.

| Module | Behaviour |
| --- | --- |
| `curtain.ts` | Intro loader; also supplies the cover used between pages. Runs once per session. |
| `barba.ts` | Page transitions, and the mount/unmount lifecycle for everything below. |
| `scroll.ts` | Lenis, and the single `--scrollY` custom property everything scroll-reactive reads. |
| `menu.ts` | Overlay menu **state** — scroll lock, focus trap, Escape. The animation is CSS. |
| `slideshow.ts` | Hero autoplay, pause control, counter. |
| `wgl.ts` | Pixi 8 field on one shared canvas. Entirely decorative and allowed to fail. |
| `reveal.ts` | Scroll reveals via one `IntersectionObserver` that unobserves as it goes. |
| `marquee.ts` | Clones the ticker track to cover the viewport; the animation itself is CSS. |
| `flipFilter.ts` | GSAP Flip for the projects filter, so rows visibly reflow. |
| `cursor.ts` | Magnetic hover, bound only where a pointer can actually hover. |

### Three things worth knowing before you edit the CSS

**The grid must not have a column gap.** `.css-grid-wrapper` is a 100-column
grid so a class name states a percentage directly (`grid-50` is half). A `gap`
applies between every *track*, not between the items you see — 99 gutters at
36px is 3.5k pixels of overflow before any content is placed. Horizontal
gutters come from `padding-inline-end` on the items instead. The tracks are
also `minmax(0, 1fr)`, not `1fr`, so display-sized text cannot force a track
wider than its share.

**`--vh` / `--vw` are written by JS.** Mobile browsers change the viewport
height when the address bar collapses, so anything sized in raw `vh` jumps
mid-scroll. `src/lib/viewport.ts` writes the measured values to custom
properties on a debounced resize instead.

**The menu reveal is CSS, not GSAP.** The panel unfold and the staggered link
reveal are both transitions keyed off `body.menu-open`, with the stagger coming
from a `--i` index the shell writes onto each link. Keeping them in the same
mechanism is what stops them drifting out of step.

### Accessibility

`prefers-reduced-motion` is honoured throughout: Lenis is not started at all
(an eased scroll is the exact sensation the preference exists to avoid), the
curtain resolves immediately, reveals render in their final state, the WebGL
field paints one frame and stops, and the slideshow starts paused. The menu
traps focus and restores it on close; the slideshow counter is a live region;
the filter announces its result count.

---

## Deploying

Root-relative by default, which suits any plain static host. For a GitHub Pages
*project* site served from a subpath, set `BASE_PATH`:

```
BASE_PATH=/repo-name/studio/ npm run build
```

Vite rewrites asset and public-file URLs to that base; internal page links are
relative, so they work at any depth without configuration.
