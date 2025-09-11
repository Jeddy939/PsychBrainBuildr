# BrainBuilder Projects

This repository contains two small web games along with a supporting React component.

> **Note**: The "Universal Paperclips" folder is included only as a design reference. Active development focuses on the "Universal Psychology" game.

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

A copy of the classic incremental game where you create paperclips until the universe is transformed. This directory is provided only as a reference and is not under active development. The game is pure HTML/JavaScript and can be run from a simple static server.

**Serve locally**

```bash
cd "Universal Paperclips"
python3 -m http.server
```

Navigate to `index.html` in your browser.


## Development

Run unit tests with:

```bash
npm test
```

Run ESLint with:

```bash
npm run lint
```
