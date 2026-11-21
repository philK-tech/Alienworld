// Setzt source/template.html, source/style.css und source/src/*.js wieder zu ../index.html zusammen.
//   node build.mjs
// Keine Abhängigkeiten nötig, nur Node.js 18 oder neuer.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Die Reihenfolge ist wichtig: alles läuft in einer gemeinsamen Funktion, spätere Dateien nutzen frühere.
const FILES = ['setup.js', 'math.js', 'geometry.js', 'meshes.js', 'shaders.js', 'world.js', 'renderer.js', 'audio.js', 'main.js'];

const read = (f) => readFileSync(path.join(here, f), 'utf8').replace(/\r\n/g, '\n');
const indent = (s, n) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
// erste Zeile jeder Datei ist nur ihr Kopfkommentar und landet nicht im Ergebnis
const body = (s) => s.replace(/^\/\/[^\n]*\n/, '').replace(/\n+$/, '');

const js = FILES.map((f) => body(read(path.join('src', f)))).join('\n\n');
const css = read('style.css').replace(/\n+$/, '');
const html = read('template.html')
  .replace(/\n+$/, '')
  .replace('/*STYLE*/', () => indent(css, 4))
  .replace('/*SCRIPT*/', () => indent(js, 4));

writeFileSync(path.join(here, '..', 'index.html'), html);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} kB`);
