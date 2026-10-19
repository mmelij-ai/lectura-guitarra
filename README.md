# Lectura Guitarra

Entrenador de lectura a primera vista para guitarra. SPA vanilla JS que genera ejercicios melódicos sobre cualquier escala y posición del mástil, los reproduce sintetizados y evalúa la entonación y el ritmo del estudiante en tiempo real.

## Tecnologías

- **VexFlow 4.2.2** — renderizado de partitura SVG
- **Tone.js 14.8.49** — síntesis y motor de audio (Web Audio API)
- **Tailwind CSS** — estilos (vendorizado, sin dependencias de build)

## Estructura

```
index.html          — SPA principal
css/style.css       — estilos complementarios a Tailwind
js/
  globals.js        — variables y estado global
  theory.js         — generación de escalas e intervalos
  game.js           — lógica de juego, detección de pitch/onset, scoring
  score.js          — renderizado VexFlow (partitura)
  fretboard.js      — diapasón virtual
  ui.js             — controladores de eventos, persistencia, initApp
vendor/
  vexflow.js        — VexFlow 4.2.2
  tone.js           — Tone.js 14.8.49
  tailwind.min.js   — Tailwind CSS 3.x
```

## Uso

Abrir `index.html` directamente en un navegador moderno (Chrome/Firefox/Safari). No requiere servidor ni proceso de build.

- Seleccionar tónica, escala, posición en el mástil, dificultad rítmica y número de compases.
- **Escuchar** reproduce el ejercicio con metrónomo y 4 beats de conteo previo.
- **Empezar** activa el micrófono y evalúa cada nota en tiempo real.
- El scorecard final muestra precisión de afinación y puntuación rítmica.

## Ajustes

| Control | Descripción |
|---|---|
| BPM | Velocidad de 40 a 160 |
| Latencia | Compensación de latencia del micrófono (±200 ms) |
| Calibración | Transposición en semitonos para guitarras no estándar |
| Inicio en tónica | La primera nota siempre es la tónica de la escala |
| Grafía práctica | Reescribe dobles alteraciones (Cbb→Bb, C##→D, etc.) |

## Licencia

MIT
