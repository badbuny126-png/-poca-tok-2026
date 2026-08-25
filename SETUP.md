# Where these files go in `-poca-tok-2026`

Copy each file into your local clone of the repo at the matching path,
overwriting where it already exists:

```
-poca-tok-2026/
├── index.html              ← overwrite (adds the HUD/loading/endscreen markup)
├── package.json            ← overwrite (fixes "three": "^r163" → "^0.163.0")
├── src/
│   ├── main.js              ← new
│   ├── court.js              ← new
│   ├── characters.js         ← new
│   ├── ball.js                ← new
│   ├── input.js                ← new
│   └── styles/
│       └── main.css            ← new
└── public/
    └── models/
        └── player.glb            ← new (your uploaded character)
```

`public/` is Vite's static-asset folder — anything in it is served from
the site root, so `public/models/player.glb` is fetched by the game at
`/models/player.glb` (already wired up in `main.js`).

## Steps

1. `git clone` your repo locally if you haven't already, and `cd` into it.
2. Copy in the files above, preserving the folder structure.
3. Install dependencies and run it:
   ```
   npm install
   npm run dev
   ```
4. Open the local URL Vite prints (usually `http://localhost:5173`).
5. Once you're happy, commit and push:
   ```
   git add .
   git commit -m "Add playable 3D prototype: court, ring scoring, AI opponent"
   git push
   ```

## What's in each file

- **`src/court.js`** — builds the stone ballcourt, sloped side walls, and the scoring ring.
- **`src/characters.js`** — loads `player.glb` once, spawns your controlled player plus a red-tinted AI clone, and drives a simple procedural run/swing animation off the skeleton (the model has no baked-in animations).
- **`src/ball.js`** — ball physics: gravity, bounce, and ring-scoring detection.
- **`src/input.js`** — keyboard movement, mouse-aim, click/space/tap to hit.
- **`src/main.js`** — wires it all together: scene setup, game loop, scoring, win/restart.

## Known rough edges to iterate on next

- Scoring currently attributes a goal to whichever character is nearer the ball when it passes through the ring — good enough for now, but you may want to track "who last touched the ball" for accuracy.
- The character has no animation clips, so movement is a procedural bob rather than a real run cycle. If you get an animated/rigged version (with a walk + swing clip) later, swap in `AnimationMixer` instead of the manual bone code in `characters.js`.
- No mobile on-screen joystick yet — touch currently only supports tap-to-aim-and-hit.
