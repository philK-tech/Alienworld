# EYWA // Pandora Night Ride

Eine nächtliche Fahrt durch eine leuchtende Schlucht mit Wasserfällen, Riesenpilzen und Quallen. Alles wird per Code erzeugt (WebGL2), ohne Bilder, Modelle oder Sounddateien.

## Ausprobieren

`index.html` im Browser öffnen. Leertaste hält die Fahrt an, `M` schaltet den Ton ein oder aus.

## Quellcode

`index.html` wird aus dem Ordner `source` gebaut. Nach einer Änderung dort:

```bash
cd source
npm run build
```

Dafür reicht Node.js 18 oder neuer, Pakete müssen nicht installiert werden.

| Datei | Inhalt |
|---|---|
| `source/template.html` | Seitengerüst mit HUD und Buttons |
| `source/style.css` | Styles der Seite |
| `source/src/setup.js` | DOM-Elemente, Fehleranzeige, WebGL2-Kontext |
| `source/src/math.js` | Hilfsfunktionen, Noise, Flussverlauf, Mat4 |
| `source/src/geometry.js` | Geometrie-Builder und Upload auf die GPU |
| `source/src/meshes.js` | Prozedurale Meshes: Terrain, Felsen, Wasserfälle, Bäume, Pilze, Quallen |
| `source/src/shaders.js` | GLSL-Shader und Programmerstellung |
| `source/src/world.js` | Platzierung aller Objekte entlang der Strecke |
| `source/src/renderer.js` | Fullscreen-Quad, Render-Targets, Canvas-Größe |
| `source/src/audio.js` | Klangkulisse mit Web Audio |
| `source/src/main.js` | Zustand, Steuerung und Render-Loop |

Die Dateien in `src` werden in der Reihenfolge aus `build.mjs` aneinandergehängt und laufen in einer gemeinsamen Funktion. Variablen aus früheren Dateien sind in späteren direkt verfügbar.
