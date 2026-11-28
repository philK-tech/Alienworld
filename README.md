# Alienworld

Eine Bootsfahrt in WebGL2 durch drei Landschaften: Nebelwald mit Schloss, Pilzwald und offene Ebene mit Schwebefelsen, dazu Tiere und kleine Szenen am Ufer. Landschaft, Tiere und Ton werden per Code erzeugt; von außen kommen nur Bootsmodell und Bootstextur. Das Ergebnis ist eine einzelne HTML-Datei ohne Abhängigkeiten.

## Ausprobieren

`index.html` im Browser öffnen. Man sitzt im Boot, die Kamera sieht sich von selbst um und dreht sich zu Tieren und Wasserfällen.
Mit gedrückter Maus oder dem Finger kann man selbst schauen, nach kurzer Zeit übernimmt wieder der automatische Blick.
Leertaste hält die Fahrt an, `M` schaltet den Ton ein oder aus.

## Ablauf der Fahrt

Rund zwei Minuten, drei Zonen mit kurzen Übergängen, danach beginnt die Runde von vorn. Bei jedem Ereignis wird das Boot langsamer, die Kamera richtet sich auf das Geschehen und zoomt leicht heran.

| Zone | Stimmung und Landschaft | Ereignis 1 | Ereignis 2 |
|---|---|---|---|
| Finsterer Nebelwald | kaltes Mondlicht, dichter Nebel, dichter Wald aus Nadelbäumen und Totholz, etwas Farn, zwei Laternen, ein Wasserfall | Ein Wolf tritt auf eine Lichtung, fixiert das Boot, heult und verschwindet wieder | Ein gotisches Schloss taucht aus dem Nebel auf, ein Fledermausschwarm stürzt von den Zinnen auf das Boot zu |
| Pilzwald | Nacht mit Gasriese, dichte Riesenpilze am Ufer, manche als Baldachin über dem Fluss, Torbögen aus Pilzstämmen mit Leuchtranken, Türkis und Violett | Ein Leuchtfisch springt vor dem Bug über die Fahrspur | Tentakel schießen links und rechts aus dem Wasser, peitschen und tauchen ab |
| Offene Ebene | heller Tag, wogendes Grasland, sonst leer bis auf drei Schwebefelsen: links einer mit Wasserfall, rechts einer mit Schloss und einer mit Ruine | Eine Herde zieht in der Ferne über die Ebene | Schwarze, mantaartige Wesen gleiten mit Wellenschlägen an den Felsen vorbei |

Zonen und Übergänge stehen in `zoneWeights` (`source/src/math.js`), die Belegung jeder Zone und die Szenen (`SCENES`) in `source/src/world.js`, der Ablauf jeder Szene in `source/src/creatures.js`.
Zum Testen: `index.html#t=10.3&s=5` springt 10,3 Sekunden in die Fahrt und 5 Sekunden in die dort beginnende Szene.

## Grafik

Die Kamera fährt fest auf einer Strecke. Statt einer frei begehbaren Welt steckt die Rechenleistung deshalb in der Bildqualität:

- HDR-Rendering mit 4-facher Kantenglättung (MSAA) und mehrstufigem Bloom
- der Fluss spiegelt die Szene in einem eigenen Renderdurchgang
- Biolumineszenz als Punktmuster auf Moos, Rinde und Blättern, die aufleuchtet, wenn das Boot vorbeifährt
- Höhennebel mit treibenden Schwaden, Sternenhimmel mit Gasriese und zwei Monden
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
| `source/src/sdfmesh.js` | Organische Formen aus weich verschmolzenen Grundkörpern (SDF, Surface Nets), etwa für Tiere |
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

## Lizenz

MIT, siehe `LICENSE`. Das gilt für den Quellcode. Bootsmodell und Textur in `source/assets/` sind ausgenommen; für sie gelten die Bedingungen ihrer Quelle.
