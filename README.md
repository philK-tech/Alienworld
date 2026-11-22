# Alienworld

Eine nächtliche Fahrt durch eine leuchtende Schlucht mit Wasserfällen, Riesenpilzen und Quallen. Alles wird per Code erzeugt (WebGL2), ohne Bilder, Modelle oder Sounddateien.

## Ausprobieren

`index.html` im Browser öffnen. Man sitzt im Boot, die Kamera sieht sich von selbst um und dreht sich zu Tieren und Wasserfällen.
Mit gedrückter Maus oder dem Finger kann man selbst schauen, nach kurzer Zeit übernimmt wieder der automatische Blick.
Leertaste hält die Fahrt an, `M` schaltet den Ton ein oder aus.

## Drei Zonen

Die Fahrt führt durch drei Zonen mit eigenem Licht, eigenem gemaltem Himmel und eigener Tierart. Zwischen ihnen gibt es kurze Übergänge.

| Zone | Stimmung | Landschaft | Szene |
|---|---|---|---|
| Tal der Nebelfälle | Dämmerung in Lila und Rosa, Dunst | dichter Nadelwald, Steinsäulen, Wasserfälle, eine Burgruine auf einem Felsen mit Wasserfall, Laternen, Raben | Ein Wolf tritt aus dem Wald, steigt auf einen Felsen am Ufer und heult |
| Pilzwald im Sternenlicht | Nacht mit Gasriese und Sternen, starke Biolumineszenz | Riesenpilze, Tentakel am Ufer, Glaskugeln, Ruinenbögen, hoch schwebende Quallen | Ein großer Leuchtfisch springt zweimal über den Fluss |
| Die Himmelsinseln | heller Tag mit Wolken und Schlieren | schwebende Inseln mit Bäumen und Wasserfällen, ein Kuppeltempel, eine Kathedrale, ein schlanker Turm, weiße Vögel | Ein Gleiterschwarm stürzt herab, segelt über den Fluss und steigt wieder auf |

Bei jeder Szene wird das Boot langsamer, die Kamera richtet sich fest auf das Geschehen und zoomt heran. Danach geht die Fahrt weiter.
Die Szenen stehen in `SCENES` (`source/src/world.js`), ihr Ablauf in `source/src/creatures.js`.
Zum Testen: `index.html#t=18.5&s=10` springt 18,5 Sekunden in die Fahrt und 10 Sekunden in die dort beginnende Szene.

Welche Zone wo liegt, steht in `zoneWeights` (`source/src/math.js`). Was in welcher Zone wächst, steht in `source/src/world.js`.

## Grafik

Die Kamera fährt fest auf einer Strecke. Statt einer frei begehbaren Welt steckt die Rechenleistung deshalb in der Bildqualität:

- HDR-Rendering mit 4-facher Kantenglättung (MSAA) und mehrstufigem Bloom
- der Fluss spiegelt die Szene in einem eigenen Renderdurchgang
- Biolumineszenz als Punktmuster auf Moos, Rinde und Blättern, die aufleuchtet, wenn das Boot vorbeifährt
- Höhennebel mit treibenden Schwaden, Sternenhimmel mit Gasriese und zwei Monden
- Tiere tauchen an festen Stellen der Strecke auf: Gleiterschwärme, Springfische und Langhälse am Ufer
- die Strecke ist eine nahtlose Schleife von gut 100 Sekunden; gezeichnet wird nur der Abschnitt in Sichtweite

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
| `source/src/shaders.js` | GLSL-Shader: Materialien, Himmel, Nebel, Wasser, Bloom und Tonemapping |
| `source/src/world.js` | Platzierung aller Objekte entlang der Strecke |
| `source/src/renderer.js` | Render-Targets: HDR mit MSAA, Spiegelbild, Bloom-Kette |
| `source/src/boat.js` | Das Boot: entpacken, Textur laden, auf dem Wasser schaukeln lassen |
| `source/src/creatures.js` | Tiere: Formen, Bewegung und wann sie auftauchen |
| `source/assets/boat.glb` | Bootsmodell, beim Build komprimiert eingebettet |
| `source/assets/boat-texture.jpg` | verkleinerte Textur des Boots (1024 px), wird statt der Textur aus der GLB-Datei verwendet |
| `source/src/audio.js` | Klangkulisse mit Web Audio |
| `source/src/main.js` | Zustand, Steuerung, Kamerafahrt und Render-Loop |

Die Dateien in `src` werden in der Reihenfolge aus `build.mjs` aneinandergehängt und laufen in einer gemeinsamen Funktion. Variablen aus früheren Dateien sind in späteren direkt verfügbar.
