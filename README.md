# BrainBuilder Projects

This repository contains two small web games along with a supporting React component.

## Universal Psychology

An incremental browser game focused on building a virtual mind.  Players add neurons, purchase upgrades and watch their consciousness grow.  The project is written in vanilla HTML/JavaScript and can be served as static files.

**Serve locally**

```bash
cd "Universal Psychology"
# Any static server will work; this uses Python for convenience
python3 -m http.server
```

Open your browser at <http://localhost:8000> and load `index.html`.

## Universal Paperclips

A copy of the classic incremental game where you create paperclips until the universe is transformed.  The game is also pure HTML/JavaScript and can be run from a simple static server.

**Serve locally**

```bash
cd "Universal Paperclips"
python3 -m http.server
```

Navigate to `index2.html` (or `index (1).html`) in your browser.

## Pokies React Demo

`pokies-react` is a small React + Three.js demo of a 3D slot machine used inside *Universal Psychology*.

**Development**

```bash
cd pokies-react
npm install
npm run dev
```

A Vite dev server will start.

**Building**

```bash
npm run build
```
The build command automatically runs a `postbuild` script that copies the contents
of `pokies-react/dist/` into `Universal Psychology/pokies-react/` using Node's
filesystem API. This ensures the latest assets are available to the main game.

