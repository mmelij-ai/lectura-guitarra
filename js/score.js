// ==========================================
// MOTOR DE RENDERIZADO EXCLUSIVO VEXFLOW
// ==========================================

function getNoteValue(vfKey) {
    const parts = vfKey.toLowerCase().split('/');
    if (parts.length < 2) return 0;
    const step = parts[0][0]; 
    const octave = parseInt(parts[1]);
    const stepValues = { 'c': 0, 'd': 1, 'e': 2, 'f': 3, 'g': 4, 'a': 5, 'b': 6 };
    return octave * 7 + (stepValues[step] || 0);
}

function getStemDirection(vfKey) {
    const VF = Vex.Flow;
    const noteValue = getNoteValue(vfKey);
    const thresholdValue = 34; // "b/4" (Si4 en la tercera línea)
    return noteValue >= thresholdValue ? VF.Stem.DOWN : VF.Stem.UP;
}

const STAFF_H = 150;        // alto del lienzo del pentagrama
const STAFF_CLEF_W = 80;    // ancho de la clave + compás (fija a la izquierda)
const STAFF_BAR_MIN = 190;  // ancho mínimo de cada compás
const STAFF_END_PAD = 8;    // margen derecho para que se vea la barra final

function renderScoreToOffscreen() {
    const VF = typeof Vex !== 'undefined' ? Vex.Flow : null;
    if (!VF) {
        console.error("VexFlow no está definido en el ámbito global.");
        return;
    }

    const div = document.getElementById("staffSVG");
    if (!div) return;
    div.innerHTML = ""; 

    // ── Diseño: el pentagrama se dibuja a un tamaño legible y se desplaza ──
    // El compás tiene un ancho mínimo (STAFF_BAR_MIN). Si no caben todos, el pentagrama
    // se desplaza horizontalmente y siempre quedan visibles el compás actual y el siguiente.
    const totalBars = Math.max(1, Math.round(totalBeats / 4));
    const wrapper  = document.getElementById('staffWrapper');
    const scroller = document.getElementById('staffScroller');
    const inner    = document.getElementById('staffInner');
    const viewW    = (scroller && scroller.clientWidth) || (wrapper && wrapper.clientWidth) || 820;
    // En celular horizontal (poca altura) el pentagrama se reduce algo para que quepan los botones
    const shortLandscape = window.matchMedia && window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
    const scaleCap = shortLandscape ? 0.8 : 1;
    const scale    = Math.min(scaleCap, viewW / (STAFF_CLEF_W + 2 * STAFF_BAR_MIN + STAFF_END_PAD)); // al menos 2 compases visibles
    const barW     = Math.max(STAFF_BAR_MIN, Math.floor((viewW / scale - STAFF_CLEF_W - STAFF_END_PAD) / totalBars));
    const fullW    = STAFF_CLEF_W + barW * totalBars + STAFF_END_PAD;
    window.staffLayout = { scale, barW, totalBars, fullW };

    // Mantener el ancho del contenido fijo antes de limpiar, para no perder la posición del scroll
    if (inner) { inner.style.width = `${fullW * scale}px`; }
    if (wrapper) { wrapper.style.height = `${STAFF_H * scale}px`; }
    const savedScroll = window.staffScrollX || 0;
    div.innerHTML = "";

    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(fullW, STAFF_H);
    const context = renderer.getContext();

    const staves = [];
    const staveWidths = [];
    for (let i = 0; i < totalBars; i++) {
        staveWidths.push(barW);
        const stave = new VF.Stave(STAFF_CLEF_W + i * barW, 10, barW);
        if (i === totalBars - 1) {
            stave.setEndBarType(VF.Barline.type.END);   // barra final (fina + gruesa)
        }
        stave.setContext(context).draw();
        staves.push(stave);
    }

    // Clave y compás fijos a la izquierda (no se desplazan con la partitura)
    const clefDiv = document.getElementById('staffClef');
    if (clefDiv) {
        clefDiv.innerHTML = "";
        const clefRenderer = new VF.Renderer(clefDiv, VF.Renderer.Backends.SVG);
        clefRenderer.resize(STAFF_CLEF_W, STAFF_H);
        const clefStave = new VF.Stave(0, 10, STAFF_CLEF_W - 1);
        clefStave.addClef("treble");
        clefStave.addTimeSignature("4/4");
        clefStave.setContext(clefRenderer.getContext()).draw();
        const clefSvg = clefDiv.querySelector('svg');
        if (clefSvg) {
            clefSvg.setAttribute('viewBox', `0 0 ${STAFF_CLEF_W} ${STAFF_H}`);
            clefSvg.style.width = `${STAFF_CLEF_W * scale}px`;
            clefSvg.style.height = `${STAFF_H * scale}px`;
            clefSvg.style.display = 'block';
        }
        clefDiv.style.width = `${STAFF_CLEF_W * scale}px`;
    }

    const durationMap = { 4.0: "w", 1.0: "q", 0.5: "8" };
    const measuresNotes = Array.from({ length: totalBars }, () => []);
    
    generatedExercise.forEach(note => {
        const mIndex = Math.floor(note.startBeat / 4);
        if (mIndex < totalBars) {
            measuresNotes[mIndex].push(note);
        }
    });
    
    for (let m = 0; m < totalBars; m++) {
        const notesInMeasure = measuresNotes[m];
        if (notesInMeasure.length === 0) continue;

        const activeAccidentalForLetter = {}; 
        const stemDirections = new Array(notesInMeasure.length);
        let idx = 0;
        while (idx < notesInMeasure.length) {
            const noteData = notesInMeasure[idx];
            // Los silencios no tienen stem — asignamos dirección neutral y seguimos
            if (noteData.isRest) {
                stemDirections[idx] = VF.Stem.UP;
                idx += 1;
                continue;
            }
            if (noteData.duration === 0.5 && idx + 1 < notesInMeasure.length && !notesInMeasure[idx+1].isRest && notesInMeasure[idx+1].duration === 0.5) {
                const val1 = getNoteValue(noteData.vfKey);
                const val2 = getNoteValue(notesInMeasure[idx+1].vfKey);
                const d1 = Math.abs(val1 - 34);
                const d2 = Math.abs(val2 - 34);
                const furthestVal = d1 >= d2 ? val1 : val2;
                const pairDirection = furthestVal >= 34 ? VF.Stem.DOWN : VF.Stem.UP;

                stemDirections[idx] = pairDirection;
                stemDirections[idx+1] = pairDirection;
                idx += 2;
            } else {
                stemDirections[idx] = getStemDirection(noteData.vfKey);
                idx += 1;
            }
        }
        
        const vfNotes = [];
        notesInMeasure.forEach((note, noteIdx) => {
            const stemDir = stemDirections[noteIdx];

            // ── Silencio ─────────────────────────────────────────────────────
            if (note.isRest) {
                const restDur = durationMap[note.duration] === "q" ? "qr" : "8r";
                const restNote = new VF.StaveNote({
                    keys: ["b/4"],
                    duration: restDur
                });
                restNote.setStyle({ fillStyle: '#1e293b', strokeStyle: '#1e293b' });
                note.staveNoteRef = restNote;
                vfNotes.push(restNote);
                return;
            }

            const staveNote = new VF.StaveNote({
                keys: [note.vfKey],
                duration: durationMap[note.duration] || "q",
                stem_direction: stemDir
            });
            
            if (note.hit) {
                staveNote.setStyle({ fillStyle: '#0e7490', strokeStyle: '#0e7490' }); // cyan-700: 5.12:1 sobre blanco ✓ AA
            } else if (note.miss) {
                staveNote.setStyle({ fillStyle: '#b91c1c', strokeStyle: '#b91c1c' }); // red-700: 6.18:1 sobre blanco ✓ AA
            } else {
                staveNote.setStyle({ fillStyle: '#1e293b', strokeStyle: '#1e293b' }); // slate-900: 13.98:1 ✓
            }
            
            const naturalLetter = note.vfKey[0]; 
            const noteAcc = note.accidental || ""; 
            
            if (activeAccidentalForLetter[naturalLetter] !== undefined && activeAccidentalForLetter[naturalLetter] !== noteAcc) {
                if (noteAcc === "") {
                    staveNote.addModifier(new VF.Accidental("n"), 0);
                } else {
                    staveNote.addModifier(new VF.Accidental(noteAcc), 0);
                }
            } else if (noteAcc !== "") {
                staveNote.addModifier(new VF.Accidental(noteAcc), 0);
            }
            activeAccidentalForLetter[naturalLetter] = noteAcc;

            if (note.interval && window.showStaveIntervals) {
                try {
                    const annotation = new VF.Annotation(note.interval);
                    annotation.setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
                    
                    try {
                        annotation.setFont("sans-serif", 9, "bold");
                    } catch (fontErr) {
                        try {
                            annotation.setFont({ family: 'sans-serif', size: 9, weight: 'bold' });
                        } catch (e2) {}
                    }
                    
                    try {
                        if (note.type === 'chord') {
                            annotation.setStyle({ fillStyle: '#1d4ed8', strokeStyle: '#1d4ed8' }); // blue-700: 6.41:1 ✓ AA
                        } else if (note.type === 'tension') {
                            annotation.setStyle({ fillStyle: '#047857', strokeStyle: '#047857' }); // emerald-700: 5.24:1 ✓ AA
                        } else if (note.type === 'avoid') {
                            annotation.setStyle({ fillStyle: '#b91c1c', strokeStyle: '#b91c1c' }); // red-700: 6.18:1 ✓ AA
                        } else {
                            annotation.setStyle({ fillStyle: '#475569', strokeStyle: '#475569' }); // slate-600: 4.63:1 ✓ AA
                        }
                    } catch (styleErr) {}
                    
                    staveNote.addModifier(annotation, 0);
                } catch (annoErr) {
                    console.error("Error al renderizar la anotación de VexFlow:", annoErr);
                }
            }
            
            note.staveNoteRef = staveNote; 
            vfNotes.push(staveNote);
        });
        
        const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
        voice.setMode(VF.Voice.Mode.SOFT);
        voice.addTickables(vfNotes);

        const beams = [];
        let beamNotes = [];
        vfNotes.forEach((staveNote, idx) => {
            const noteData = notesInMeasure[idx];
            // No hacer beam si alguna de las dos es un silencio
            if (noteData.duration === 0.5 && !noteData.isRest) {
                beamNotes.push(staveNote);
                if (beamNotes.length === 2) {
                    beams.push(new VF.Beam(beamNotes));
                    beamNotes = [];
                }
            } else {
                beamNotes = [];
            }
        });

        const availableWidth = staveWidths[m] - 25;
        try {
            const formatter = new VF.Formatter();
            formatter.joinVoices([voice]).format([voice], availableWidth);
            voice.draw(context, staves[m]);
            beams.forEach(b => b.setContext(context).draw());
        } catch (voiceErr) {
            console.error('score render error (compás', m, '):', voiceErr);
        }
    }
    
    const svgElement = div.querySelector('svg');
    if (svgElement) {
        svgElement.setAttribute('viewBox', `0 0 ${fullW} ${STAFF_H}`);
        svgElement.setAttribute('width', `${fullW * scale}`);
        svgElement.setAttribute('height', `${STAFF_H * scale}`);
        svgElement.style.width = `${fullW * scale}px`;
        svgElement.style.height = `${STAFF_H * scale}px`;
        svgElement.style.display = 'block';
    }
    if (scroller) { scroller.scrollLeft = savedScroll; }
    renderBarProgress();
    
    generatedExercise.forEach(note => {
        if (note.staveNoteRef) {
            note.physicalX = note.staveNoteRef.getAbsoluteX();
        } else {
            note.physicalX = 100 + (note.startBeat / totalBeats) * 600;
        }
    });
    
    for (let i = 0; i < generatedExercise.length; i++) {
        const note = generatedExercise[i];
        if (i < generatedExercise.length - 1) {
            note.nextPhysicalX = generatedExercise[i + 1].physicalX;
        } else {
            const lastStave = staves[totalBars - 1];
            const defaultEnd = lastStave.getX() + lastStave.getWidth() - 20;
            note.nextPhysicalX = typeof lastStave.getNoteEndX === 'function' ? lastStave.getNoteEndX() : defaultEnd;
        }
    }
}

function drawStaff() {
    const playhead = document.getElementById('playhead');
    if (!playhead) return;

    if (isPlaying || isPreviewPlaying || isRecordingPlayback) {
        playhead.style.display = 'block';
        
        const activeNote = generatedExercise.find(n => {
            const start = isSwingActive ? n.swingStartBeat : n.startBeat;
            const end = isSwingActive ? n.swingEndBeat : n.endBeat;
            return currentBeat >= start && currentBeat < end;
        });
        
        let cursorX = 85; 
        
        if (activeNote && activeNote.physicalX !== undefined) {
            const start = isSwingActive ? activeNote.swingStartBeat : activeNote.startBeat;
            const dur = isSwingActive ? activeNote.swingDuration : activeNote.duration;
            const t = (currentBeat - start) / dur;
            cursorX = activeNote.physicalX + t * (activeNote.nextPhysicalX - activeNote.physicalX);
        } else if (currentBeat >= totalBeats) {
            const lastNote = generatedExercise[generatedExercise.length - 1];
            cursorX = lastNote ? lastNote.nextPhysicalX : 780;
        }
        
        const scaleRatio = window.staffLayout ? window.staffLayout.scale : 1;
        playhead.style.left = `${cursorX * scaleRatio}px`;

        // Seguir la reproducción: siempre visibles el compás actual y el siguiente
        const L = window.staffLayout;
        if (L) {
            const bar = Math.max(0, Math.min(L.totalBars - 1, Math.floor(currentBeat / 4)));
            followStaffBar(bar);
        }
    } else {
        playhead.style.display = 'none';
        if (window.staffFollowBar !== -1) {
            window.staffFollowBar = -1;
            renderBarProgress();
        }
    }
}

window.staffFollowBar = -1;
window.staffScrollX = 0;

function animateStaffScroll(target, ms = 350) {
    const sc = document.getElementById('staffScroller');
    if (!sc) return;
    if (window.staffAnim) cancelAnimationFrame(window.staffAnim);
    const from = sc.scrollLeft;
    const t0 = performance.now();
    const step = now => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        sc.scrollLeft = from + (target - from) * e;
        if (k < 1) window.staffAnim = requestAnimationFrame(step);
    };
    window.staffAnim = requestAnimationFrame(step);
}

// Cambio de "página": solo se desplaza cuando el compás actual o el siguiente quedarían fuera de vista
function followStaffBar(bar) {
    const L = window.staffLayout;
    const sc = document.getElementById('staffScroller');
    if (!L || !sc || window.staffFollowBar === bar) return;
    window.staffFollowBar = bar;
    renderBarProgress();

    const s = L.scale;
    const left = (STAFF_CLEF_W + bar * L.barW) * s;
    const lastVisibleBar = Math.min(bar + 1, L.totalBars - 1);
    const right = (STAFF_CLEF_W + (lastVisibleBar + 1) * L.barW) * s;
    const viewL = sc.scrollLeft + STAFF_CLEF_W * s;
    const viewR = sc.scrollLeft + sc.clientWidth;
    if (left >= viewL - 1 && right <= viewR + 1) return;

    const max = Math.max(0, sc.scrollWidth - sc.clientWidth);
    animateStaffScroll(Math.max(0, Math.min(max, bar * L.barW * s)));
}

// Mini-barra de progreso: un segmento por compás; el actual resaltado; se puede tocar para ir a ese compás
function renderBarProgress() {
    const host = document.getElementById('barProgress');
    const L = window.staffLayout;
    if (!host || !L) return;
    host.innerHTML = '';
    for (let i = 0; i < L.totalBars; i++) {
        const seg = document.createElement('div');
        seg.className = 'bar-seg' + (i === window.staffFollowBar ? ' active' : '');
        seg.title = `Compás ${i + 1}`;
        seg.addEventListener('click', () => {
            const sc = document.getElementById('staffScroller');
            if (!sc) return;
            const max = Math.max(0, sc.scrollWidth - sc.clientWidth);
            animateStaffScroll(Math.max(0, Math.min(max, i * L.barW * L.scale)));
        });
        host.appendChild(seg);
    }
}

(function initStaffScroll() {
    const sc = document.getElementById('staffScroller');
    if (sc) {
        sc.addEventListener('scroll', () => {
            window.staffScrollX = sc.scrollLeft;
            const wrapper = document.getElementById('staffWrapper');
            if (wrapper) wrapper.classList.toggle('is-scrolled', sc.scrollLeft > 2);
        }, { passive: true });
    }
    let t = null;
    window.addEventListener('resize', () => {
        clearTimeout(t);
        t = setTimeout(() => { renderScoreToOffscreen(); drawStaff(); }, 150);
    });
})();

window.toggleStaveIntervals = function() {
    window.showStaveIntervals = !window.showStaveIntervals;
    const btn = document.getElementById('toggleStaveIntervalsBtn');
    if (btn) {
        if (window.showStaveIntervals) {
            btn.textContent = "Ocultar Intervalos en Partitura";
            btn.className = "px-3.5 py-1.5 bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl transition-all shadow-sm text-[10px] font-bold uppercase select-none focus:outline-none";
        } else {
            btn.textContent = "Mostrar Intervalos en Partitura";
            btn.className = "px-3.5 py-1.5 bg-cyan-900/60 hover:bg-cyan-900/80 border border-cyan-800 text-cyan-300 hover:text-cyan-100 rounded-xl transition-all shadow-sm text-[10px] font-bold uppercase select-none focus:outline-none";
        }
    }
    renderScoreToOffscreen();
};
