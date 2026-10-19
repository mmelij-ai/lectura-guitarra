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

function renderScoreToOffscreen() {
    const VF = typeof Vex !== 'undefined' ? Vex.Flow : null;
    if (!VF) {
        console.error("VexFlow no está definido en el ámbito global.");
        return;
    }

    const div = document.getElementById("staffSVG");
    if (!div) return;
    div.innerHTML = ""; 

    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(820, 150);
    const context = renderer.getContext();
    
    const totalBarsEl = document.getElementById('barsSelect');
    const totalBars = totalBarsEl ? parseInt(totalBarsEl.value) : 4;
    
    const staves = [];
    const staveWidths = [];
    // Calcular anchos dinámicamente desde el ancho total del canvas (820)
    // dejando margen izquierdo fijo de 20px y dividiendo el espacio restante.
    // El primer compás necesita más espacio por clave + compás (≈90px extra).
    const CANVAS_W   = 820;
    const MARGIN_L   = 20;
    const CLEF_EXTRA = 65; // espacio adicional del primer compás (clave + 4/4)
    const usableW = CANVAS_W - MARGIN_L - CLEF_EXTRA;
    const firstW  = Math.floor(usableW / totalBars) + CLEF_EXTRA;
    const restW   = Math.floor((usableW - firstW + CLEF_EXTRA) / (totalBars - 1 || 1));
    staveWidths.push(firstW);
    for (let i = 1; i < totalBars; i++) staveWidths.push(restW);

    let currentX = MARGIN_L;
    for (let i = 0; i < totalBars; i++) {
        const stave = new VF.Stave(currentX, 10, staveWidths[i]);
        if (i === 0) {
            stave.addClef("treble");
            stave.addTimeSignature("4/4");
        }
        if (i === totalBars - 1) {
            stave.setEndBarType(VF.Barline.type.DOUBLE);
        }
        
        stave.setContext(context).draw();
        staves.push(stave);
        currentX += staveWidths[i];
    }
    
    const durationMap = { 1.0: "q", 0.5: "8" };
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
        
        const availableWidth = m === 0 ? (staveWidths[0] - CLEF_EXTRA - 25) : (staveWidths[m] - 25);
        const formatter = new VF.Formatter();
        formatter.joinVoices([voice]).format([voice], availableWidth);
        
        voice.draw(context, staves[m]);
        beams.forEach(b => b.setContext(context).draw());
    }
    
    const svgElement = div.querySelector('svg');
    if (svgElement) {
        svgElement.setAttribute('viewBox', '0 0 820 150');
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.style.width = '100%';
        svgElement.style.height = 'auto';
    }
    
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
        
        const staffSVG = document.getElementById('staffSVG');
        const svgWidth = staffSVG ? staffSVG.clientWidth : 820;
        const scaleRatio = svgWidth / 820;
        
        playhead.style.left = `${cursorX * scaleRatio}px`;
    } else {
        playhead.style.display = 'none';
    }
}

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
