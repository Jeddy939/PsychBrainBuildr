# Pokies React Demo

This directory contains a small React + Three.js implementation of a 3D slot machine inspired by the [Cherry Charm](https://github.com/michaelkolesidis/cherry-charm) project.

## Development

```bash
npm install
npm run dev
```

The app will start with Vite and render a simple slot machine that can be spun using the provided button.

## Build & Deploy

Running a production build will output the compiled files to `dist/` and then
copy them into the main project under `../Universal Psychology/pokies-react/`.

```bash
npm run build
```

The above command automatically triggers the `postbuild` script which performs
the copy. If you prefer an explicit command you can run:

```bash
npm run build:deploy
```

This does the build and copy in one step.
