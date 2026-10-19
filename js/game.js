// ==========================================
// MÓDULO JUEGO PRINCIPAL Y CONTROLES DE PRÁCTICA
// ==========================================

function stopAudioPreview() {
    if (!isPreviewPlaying) return;
    isPreviewPlaying = false;
    currentBeat = 0;
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) {
        previewBtn.textContent = "▷ Escuchar";
        previewBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500', 'border-rose-500', 'text-white');
        previewBtn.classList.add('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700', 'text-slate-300');
    }
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) {
        startPracticeBtn.removeAttribute('disabled');
    }
    
    const playRecBtnGame = document.getElementById('playRecordingBtn_game');
    if (playRecBtnGame && recordedAudioURL) {
        playRecBtnGame.removeAttribute('disabled');
    }

    updateFretboardMarker(null);
    drawStaff();
}

async function startAudioPreview() {
    if (isPreviewPlaying) {
        stopAudioPreview();
        return;
    }
    
    if (isInputTestRunning) stopInputTest();
    if (isPlaying) stopPractice();
    if (isRecordingPlayback) stopRecordingPlayback();
    
    // Desbloqueo estricto de audio para iOS/Safari
    if (Tone.context.state !== 'running') {
        await Tone.start();
        await Tone.context.resume();
    }
    
    audioContext = Tone.context.rawContext;
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    isPreviewPlaying = true;
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) {
        previewBtn.textContent = "◼ Detener";
        previewBtn.classList.remove('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700', 'text-slate-300');
        previewBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'border-rose-500', 'text-white');
    }
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) {
        startPracticeBtn.setAttribute('disabled', 'true');
    }
    
    const playRecBtnGame = document.getElementById('playRecordingBtn_game');
    if (playRecBtnGame) {
        playRecBtnGame.setAttribute('disabled', 'true');
    }

    const bps = bpm / 60;
    const beatDuration = 1 / bps;
    // 4 beats de conteo previo + el ejercicio
    const COUNT_BEATS = 4;
    startTime = audioContext.currentTime + COUNT_BEATS * beatDuration;
    lastTickBeat = -1;

    generatedExercise.forEach(note => note.previewPlayed = false);

    const panel = document.getElementById('config-panel');
    if (panel && !panel.classList.contains('hidden')) {
        window.toggleConfigPanel();
    }

    // Programar claqueta de conteo (4 beats antes del inicio)
    const overlay = document.getElementById('countdownOverlay');
    const countLabels = ['4', '3', '2', '1'];
    countLabels.forEach((label, i) => {
        const clickTime = audioContext.currentTime + i * beatDuration;
        playMetronomeClick(i === 0 ? 1000 : 700, 0.07, clickTime);
        countdownTimers.push(setTimeout(() => {
            if (!isPreviewPlaying) return;
            if (overlay) { overlay.textContent = label; overlay.style.display = 'flex'; }
            document.getElementById('currentNoteText').textContent = `Conteo: ${label}`;
        }, i * beatDuration * 1000));
    });
    countdownTimers.push(setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
    }, COUNT_BEATS * beatDuration * 1000));

    function previewLoop() {
        if (!isPreviewPlaying) return;

        const elapsed = audioContext.currentTime - startTime;
        currentBeat = elapsed * bps;

        const currentBeatInt = Math.floor(currentBeat);
        if (currentBeatInt >= 0 && currentBeatInt > lastTickBeat && currentBeatInt < totalBeats) {
            const isFirstBeatOfBar = (currentBeatInt % 4 === 0);
            const clickTime = startTime + (currentBeatInt / bps);
            playMetronomeClick(isFirstBeatOfBar ? 1000 : 600, 0.05, clickTime);
            lastTickBeat = currentBeatInt;
        }

        generatedExercise.forEach(note => {
            const targetStart = isSwingActive ? note.swingStartBeat : note.startBeat;
            if (currentBeat >= targetStart && !note.previewPlayed) {
                note.previewPlayed = true;
                const noteTime = startTime + (targetStart / bps);
                const targetDur = isSwingActive ? note.swingDuration : note.duration;
                playSynthNote(note.hz, targetDur * beatDuration, noteTime);
                updateFretboardMarker(note);
                document.getElementById('currentNoteText').innerHTML = `Escuchando: <span style='font-size: 18px;'>${note.nombre}</span>`;
            }
        });

        drawStaff();

        if (currentBeat < totalBeats) {
            requestAnimationFrame(previewLoop);
        } else {
            stopAudioPreview();
            document.getElementById('currentNoteText').innerHTML = "Escucha finalizada. ¿Listo para intentar?";
        }
    }

    // Arrancar el loop desde ya (currentBeat será negativo durante el conteo)
    requestAnimationFrame(previewLoop);
}

function stopRecordingPlayback() {
    if (!isRecordingPlayback) return;
    isRecordingPlayback = false;
    
    if (playbackAnimationId) {
        cancelAnimationFrame(playbackAnimationId);
        playbackAnimationId = null;
    }
    
    const overlay = document.getElementById('countdownOverlay');
    if (overlay) overlay.style.display = 'none';
    
    currentBeat = 0;
    drawStaff(); 

    const player = document.getElementById('recordedPlayer');
    if (player) {
        player.pause();
        player.currentTime = 0;
    }
    
    const reviewBar = document.getElementById('recordingPlaybackBar');
    if (reviewBar) reviewBar.style.display = 'none';
    
    const scorecardPanel = document.getElementById('scorecardPanel');
    if (scorecardPanel) scorecardPanel.style.display = 'flex';
    
    const actionBtnsContainer = document.querySelector('.action-btns');
    if (actionBtnsContainer) {
        actionBtnsContainer.style.display = 'flex';
    }
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) previewBtn.removeAttribute('disabled');
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) startPracticeBtn.removeAttribute('disabled');
}

async function startRecordingPlayback() {
    if (isRecordingPlayback) {
        stopRecordingPlayback();
        return;
    }
    
    if (isInputTestRunning) stopInputTest();
    if (isPlaying) stopPractice();
    if (isPreviewPlaying) stopAudioPreview();
    
    const player = document.getElementById('recordedPlayer');
    if (!player || !recordedAudioURL) {
        console.error("No hay reproductor de audio o grabación disponible.");
        return;
    }
    
    isRecordingPlayback = true;
    scheduledPlaybackBeats = [];
    
    const actionBtnsContainer = document.querySelector('.action-btns');
    if (actionBtnsContainer) {
        actionBtnsContainer.style.display = 'none';
    }
    
    if (!playerSource && audioContext) {
        try {
            playerSource = audioContext.createMediaElementSource(player);
            
            const playbackGain = audioContext.createGain();
            playbackGain.channelCount = 1;
            playbackGain.channelCountMode = "explicit";
            playbackGain.gain.setValueAtTime(2.0, audioContext.currentTime);
            
            playerSource.connect(playbackGain);
            playbackGain.connect(audioContext.destination);
        } catch (e) {
            console.error("Error al conectar el reproductor de audio al AudioContext:", e);
        }
    }
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) previewBtn.setAttribute('disabled', 'true');
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) startPracticeBtn.setAttribute('disabled', 'true');
    
    player.src = recordedAudioURL;
    player.play().then(() => {
        const reviewBar = document.getElementById('recordingPlaybackBar');
        if (reviewBar) reviewBar.style.display = 'flex';
        
        const scorecardPanel = document.getElementById('scorecardPanel');
        if (scorecardPanel) scorecardPanel.style.display = 'none';
        
        playbackLoop();
    }).catch(err => {
        console.error("Error al reproducir grabación:", err);
        stopRecordingPlayback();
    });
    
    player.onended = () => {
        stopRecordingPlayback();
    };
}

function playbackLoop() {
    if (!isRecordingPlayback) return;
    
    const player = document.getElementById('recordedPlayer');
    if (!player) return;
    
    const elapsed = player.currentTime; 
    const beatDuration = 60 / bpm;
    
    currentBeat = (elapsed - 0.1) * (bpm / 60);
    drawStaff();
    
    const lookahead = 0.150; 
    const playbackStartTime = audioContext.currentTime - elapsed;
    
    for (let N = 0; N < totalBeats; N++) {
        const beatFileTime = (N * beatDuration) + 0.1;
        if (beatFileTime >= elapsed && beatFileTime < elapsed + lookahead) {
            if (!scheduledPlaybackBeats.includes(N)) {
                const isFirstBeatOfBar = (N % 4 === 0);
                const clickTime = playbackStartTime + beatFileTime;
                playMetronomeClick(isFirstBeatOfBar ? 1200 : 800, 0.04, clickTime);
                scheduledPlaybackBeats.push(N);
            }
        }
    }
    
    const beatText = document.getElementById('reviewBeatText');
    if (beatText) {
        beatText.textContent = Math.max(0, currentBeat).toFixed(1);
    }
    
    playbackAnimationId = requestAnimationFrame(playbackLoop);
}

async function startRealPractice() {
    if (isInputTestRunning) stopInputTest();
    if (isPreviewPlaying) stopAudioPreview();
    if (isRecordingPlayback) stopRecordingPlayback();
    
    try {
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
        audioContext = Tone.context.rawContext || new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    } catch(initErr) {
        console.error("Fallo al iniciar el hardware de audio: ", initErr);
    }
    
    isPlaying = true;
    currentBeat = 0;
    lastTickBeat = -1;
    hits = 0;
    misses = 0;
    aciertosConsecutivos = 0;
    
    perfectCount = 0;
    goodCount = 0;
    earlyLateCount = 0;
    
    generatedExercise.forEach(note => {
        note.hit = false;
        note.miss = false;
    });
    renderScoreToOffscreen();
    
    const panel = document.getElementById('config-panel');
    if (panel && !panel.classList.contains('hidden')) {
        window.toggleConfigPanel();
    }

    document.getElementById('currentNoteText').textContent = "Prepara tu guitarra...";
    document.getElementById('currentNoteText').style.backgroundColor = "rgba(34,211,238,0.15)";
    document.getElementById('currentNoteText').style.color = "var(--primary)";
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) startPracticeBtn.style.display = 'none';
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) previewBtn.style.display = 'none';
    
    const playRecBtnGame = document.getElementById('playRecordingBtn_game');
    if (playRecBtnGame) playRecBtnGame.style.display = 'none';

    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    
    document.getElementById('tunerBar').style.opacity = '1';
    
    try {
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
                video: false
            });
        } catch (errConstraints) {
            console.warn("Fallo con restricciones estrictas de audio, intentando fallback de baja latencia:", errConstraints);
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
        }
        
        sourceStream = stream;

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; 
        
        globalAudioSource = audioContext.createMediaStreamSource(stream);
        
        globalHighpassFilter = audioContext.createBiquadFilter();
        globalHighpassFilter.type = "highpass";
        globalHighpassFilter.frequency.setValueAtTime(75, audioContext.currentTime); 
        
        globalLowpassFilter = audioContext.createBiquadFilter();
        globalLowpassFilter.type = "lowpass";
        globalLowpassFilter.frequency.setValueAtTime(1000, audioContext.currentTime); 
        
        globalInputGain = audioContext.createGain();
        globalInputGain.gain.setValueAtTime(5.0, audioContext.currentTime); 
        
        globalAudioSource.connect(globalHighpassFilter);
        globalHighpassFilter.connect(globalLowpassFilter);
        globalLowpassFilter.connect(globalInputGain);
        globalInputGain.connect(analyser);
        
        globalSilentGain = audioContext.createGain();
        globalSilentGain.gain.setValueAtTime(0, audioContext.currentTime);
        analyser.connect(globalSilentGain);
        globalSilentGain.connect(audioContext.destination);

        dataArray = new Float32Array(analyser.fftSize);
        
        mediaRecorder = null;
        recordedChunks = [];
        
        if (typeof MediaRecorder !== 'undefined') {
            const mimeTypesToTry = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4;codecs=mp4a.40.2',
                'audio/mp4',
                'audio/aac',
                'audio/ogg;codecs=opus'
            ];
            
            let selectedMimeType = '';
            for (const mime of mimeTypesToTry) {
                if (MediaRecorder.isTypeSupported(mime)) {
                    selectedMimeType = mime;
                    break;
                }
            }
            
            try {
                if (selectedMimeType) {
                    mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
                } else {
                    mediaRecorder = new MediaRecorder(stream);
                }
            } catch(recErr) {
                console.error("Fallo al inicializar MediaRecorder con opciones. Probando por defecto:", recErr);
                try {
                    mediaRecorder = new MediaRecorder(stream);
                } catch(defaultErr) {
                    console.error("Fallo definitivo en MediaRecorder:", defaultErr);
                    mediaRecorder = null;
                }
            }
        }
        
        if (mediaRecorder) {
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };
            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(recordedChunks, { type: mimeType });
                if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
                recordedAudioURL = URL.createObjectURL(blob);
                
                const recBtnScore = document.getElementById('playRecordingBtn');
                if (recBtnScore) recBtnScore.classList.remove('hidden');
                
                const recBtnGame = document.getElementById('playRecordingBtn_game');
                if (recBtnGame) {
                    recBtnGame.classList.remove('hidden');
                    recBtnGame.style.display = 'inline-flex';
                }
            };
        }

        // --- INICIO DE GRABADOR RETRASADO (Tiempo Uno) ---
        document.getElementById('debug').textContent = "Calibrando capturador de audio...";
        
        countdownTimers = [];
        countdownTimers.push(setTimeout(() => {
            const overlay = document.getElementById('countdownOverlay');
            overlay.style.display = 'flex';
            overlay.textContent = "4";
            
            const now = audioContext.currentTime;
            const beatDuration = 60 / bpm;
            
            playMetronomeClick(1200, 0.05, now); 
            playMetronomeClick(800, 0.05, now + 1 * beatDuration); 
            playMetronomeClick(800, 0.05, now + 2 * beatDuration); 
            playMetronomeClick(800, 0.05, now + 3 * beatDuration); 
            playMetronomeClick(1200, 0.04, now + 4 * beatDuration); 
            
            countdownTimers.push(setTimeout(() => { overlay.textContent = "3"; }, 1 * beatDuration * 1000));
            countdownTimers.push(setTimeout(() => { overlay.textContent = "2"; }, 2 * beatDuration * 1000));
            countdownTimers.push(setTimeout(() => { overlay.textContent = "1"; }, 3 * beatDuration * 1000));
            
            const startRecordingTimeMs = Math.max(0, (4 * beatDuration * 1000) - 100);
            countdownTimers.push(setTimeout(() => {
                try {
                    if (mediaRecorder && mediaRecorder.state === "inactive") {
                        mediaRecorder.start();
                    }
                } catch (startErr) {
                    console.error("No se pudo iniciar la grabación en el tiempo uno:", startErr);
                }
            }, startRecordingTimeMs));

            countdownTimers.push(setTimeout(() => {
                overlay.style.display = 'none';
                startTime = now + 4 * beatDuration;
                lastTickBeat = 0; 
                gameLoop();
            }, 4 * beatDuration * 1000));
        }, 800));
        
    } catch (err) {
        document.getElementById('debug').textContent = "Micrófono no disponible o denegado: " + err.message;
        stopPractice();
    }
}

// ─── Control de saltos ───────────────────────────────────────────────────────
// Máximo intervalo permitido por dificultad (en semitonos).
// Un salto mayor se permite con probabilidad LEAP_CHANCE (excepción expresiva).
// ─── Control de saltos ───────────────────────────────────────────────────────
// Máximo intervalo permitido por dificultad (en semitonos).
const MAX_LEAP = { basic: 5, normal: 9, intermediate: 9, advanced: 14 };
// En avanzado se permite ocasionalmente un salto algo mayor (+4st sobre el límite).
// En básico y normal el límite es estricto — sin excepciones.
const LEAP_EXTRA   = 4;   // semitonos adicionales en la excepción expresiva
const LEAP_CHANCE  = 0.04; // probabilidad de excepción (solo dificultad advanced)

/**
 * Selecciona la siguiente nota aplicando:
 *   1. Control de salto máximo según dificultad (punto 2)
 *   2. Peso de contorno melódico — el caller pasa contourBias ∈ [-1, 1]
 *      donde +1 favorece notas más agudas y -1 notas más graves (punto 1)
 */
function selectNextNoteWithDifficulty(difficulty, activePool, lastNote, contourBias = 0) {
    if (!lastNote) {
        return activePool[Math.floor(Math.random() * activePool.length)];
    }

    const lastMidi = lastNote.midi;
    const maxLeap  = MAX_LEAP[difficulty] ?? MAX_LEAP.normal;

    // Candidatos dentro del rango de salto aceptable (excluyendo la nota actual)
    let candidates = activePool.filter(n =>
        n.midi !== lastMidi &&
        Math.abs(n.midi - lastMidi) <= maxLeap
    );

    // Fallback si el pool filtrado queda vacío (escala muy pequeña)
    if (candidates.length === 0) {
        candidates = activePool.filter(n => n.midi !== lastMidi);
    }

    // Excepción expresiva solo en avanzado: ampliar el rango un poco,
    // nunca abrir al pool completo para evitar saltos de >2 octavas.
    if (difficulty === 'advanced' && candidates.length > 0 && Math.random() < LEAP_CHANCE) {
        const wider = activePool.filter(n =>
            n.midi !== lastMidi &&
            Math.abs(n.midi - lastMidi) <= maxLeap + LEAP_EXTRA
        );
        if (wider.length > 0) candidates = wider;
    }

    // Fallback final: usar todo el pool
    if (candidates.length === 0) candidates = activePool;

    // ── Contorno melódico: asignar pesos según posición MIDI relativa ──────
    // bias > 0 → notas más agudas pesan más; bias < 0 → notas más graves pesan más.
    // Fórmula: weight = 1 + |bias| * directedPos
    //   donde directedPos = normalizedPos si bias > 0, (1 - normalizedPos) si bias < 0.
    // Así el peso SIEMPRE crece para las notas en la dirección deseada.
    if (Math.abs(contourBias) > 0.05) {
        const midiValues = candidates.map(n => n.midi);
        const midiMin = Math.min(...midiValues);
        const midiMax = Math.max(...midiValues);
        const midiRange = midiMax - midiMin || 1;

        const weighted = candidates.map(n => {
            const normalizedPos = (n.midi - midiMin) / midiRange; // [0,1]
            const directedPos   = contourBias > 0 ? normalizedPos : (1 - normalizedPos);
            const weight        = 1 + Math.abs(contourBias) * directedPos;
            return { note: n, weight };
        });

        // Selección ponderada
        const totalWeight = weighted.reduce((s, c) => s + c.weight, 0);
        let r = Math.random() * totalWeight;
        for (const c of weighted) {
            r -= c.weight;
            if (r <= 0) return c.note;
        }
        return weighted[weighted.length - 1].note;
    }

    // Sin sesgo: uniforme
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function generateExerciseSequence() {
    const scaleEl = document.getElementById('scaleSelect');
    const rhythmTypeEl = document.getElementById('rhythmSelect');
    const difficultyEl = document.getElementById('difficultySelect');
    const barsSelectEl = document.getElementById('barsSelect');
    const grooveSelect = document.getElementById('grooveSelect');
    
    const scale = scaleEl ? scaleEl.value : "mayor";
    const rhythmType = rhythmTypeEl ? rhythmTypeEl.value : "mezcladas";
    const difficulty = difficultyEl ? difficultyEl.value : "basic";
    const totalBars = barsSelectEl ? parseInt(barsSelectEl.value) : 4;
    
    isSwingActive = grooveSelect && grooveSelect.value === 'swing';
    
    activePool = buildDynamicNotePool();
    generatedExercise = [];
    totalBeats = totalBars * 4;
    let currentPos = 0;
    
    for (let bar = 0; bar < totalBars; bar++) {
        let barBeats = 0;
        while (barBeats < 4) {
            let notesToGen = [];

            if (rhythmType === "corcheas") {
                notesToGen = [0.5, 0.5];
            } else if (rhythmType === "negras") {
                notesToGen = [1.0];
            } else if (rhythmType === "mezcladas") {
                if (Math.random() < 0.35) {
                    notesToGen = [0.5, 0.5];
                } else {
                    notesToGen = [1.0];
                }
            }
            
            notesToGen.forEach(noteDuration => {
                const lastNote = generatedExercise[generatedExercise.length - 1] || null;
                let randomNote = null;
                
                if (generatedExercise.length === 0) {
                    const startOnTonic = document.getElementById('startOnTonicCheck');
                    if (!startOnTonic || startOnTonic.checked) {
                        const roots = activePool.filter(n => n.interval === "1");
                        if (roots.length > 0) {
                            randomNote = roots[Math.floor(Math.random() * roots.length)];
                        }
                    }
                }
                
                if (!randomNote) {
                    // ── Contorno melódico (punto 1) ────────────────────────────
                    // Dividimos el ejercicio en 4 fases (por beat relativo al total):
                    //   0–25 %  → ascenso   bias +0.5
                    //  25–50 %  → clímax    bias +0.2  (sostener altura)
                    //  50–75 %  → descenso  bias -0.5
                    //  75–100 % → cadencia  bias -0.3  (acercarse a la tónica)
                    const progress = totalBeats > 0 ? currentPos / totalBeats : 0;
                    let contourBias = 0;
                    if      (progress < 0.25) contourBias =  0.5;
                    else if (progress < 0.50) contourBias =  0.2;
                    else if (progress < 0.75) contourBias = -0.5;
                    else                      contourBias = -0.3;

                    let attempts = 0;
                    while (attempts < 50) {
                        randomNote = selectNextNoteWithDifficulty(difficulty, activePool, lastNote, contourBias);

                        if (randomNote.type === 'avoid') {
                            if (noteDuration === 1.0) {
                                if (barBeats === 0.0 || barBeats === 2.0) {
                                    attempts++;
                                    randomNote = null;
                                    continue;
                                }
                            } else if (noteDuration === 0.5) {
                                if (Math.abs((barBeats % 1.0) - 0.0) < 0.01) {
                                    attempts++;
                                    randomNote = null;
                                    continue;
                                }
                            }
                        }
                        break;
                    }

                    if (!randomNote) {
                        randomNote = selectNextNoteWithDifficulty(difficulty, activePool, lastNote, contourBias);
                    }
                }
                
                const idealHz = 440 * Math.pow(2, (randomNote.midi - 69) / 12);

                generatedExercise.push({
                    ...randomNote,
                    hz: idealHz, 
                    startBeat: currentPos,
                    endBeat: currentPos + noteDuration,
                    duration: noteDuration,
                    hit: false,
                    miss: false
                });
                
                currentPos += noteDuration;
                barBeats += noteDuration;
            });
        }
    }
    
    generatedExercise.forEach(note => {
        note.swingStartBeat = note.startBeat;
        note.swingEndBeat = note.endBeat;
        note.swingDuration = note.duration;
        
        if (isSwingActive) {
            if (note.startBeat % 1 === 0.5) {
                note.swingStartBeat = Math.floor(note.startBeat) + (2 / 3);
            }
            if (note.endBeat % 1 === 0.5) {
                note.swingEndBeat = Math.floor(note.endBeat) + (2 / 3);
            }
            note.swingDuration = note.swingEndBeat - note.swingStartBeat;
        }
    });
}

function gameLoop() {
    if (!isPlaying) return;
    
    const bps = bpm / 60;
    const elapsedSeconds = audioContext.currentTime - startTime;
    currentBeat = elapsedSeconds * bps;
    
    const currentBeatInt = Math.floor(currentBeat);
    if (currentBeatInt > lastTickBeat && currentBeatInt < totalBeats) {
        const isFirstBeatOfBar = (currentBeatInt % 4 === 0);
        const clickTime = startTime + (currentBeatInt / bps);
        playMetronomeClick(isFirstBeatOfBar ? 1200 : 800, 0.04, clickTime);
        lastTickBeat = currentBeatInt;
    }
    
    processGuitarInput();
    drawStaff();
    
    if (currentBeat < totalBeats) {
        animationId = requestAnimationFrame(gameLoop);
    } else {
        finishReading();
    }
}

function showRhythmFeedback(rating, color) {
    const el = document.getElementById('rhythmFeedback');
    if (!el) return;
    
    el.textContent = rating;
    el.style.color = color;
    el.style.borderColor = color + "60"; 
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -12px) scale(1.15)';
    
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -24px) scale(1)';
    }, 650);
}

function processGuitarInput() {
    if (!analyser) return;
    
    if (analyser.getFloatTimeDomainData) {
        analyser.getFloatTimeDomainData(dataArray);
    } else if (analyser.getByteTimeDomainData) {
        const byteArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(byteArray);
        for (let i = 0; i < byteArray.length; i++) {
            dataArray[i] = (byteArray[i] - 128) / 128;
        }
    }
    
    let rms = 0;
    for (let i = 0; i < dataArray.length; i++) rms += dataArray[i] * dataArray[i];
    rms = Math.sqrt(rms / dataArray.length);
    
    if (rms > 0.010) {
        if (!isAudioActive || (rms > lastRms * 1.4 && lastRms > 0.005)) {
            isAudioActive = true;
            // Compensar latencia: latencyMs positivo = mic tarda → restar para adelantar el onset
            const latencyBeats = (latencyMs / 1000) * (bpm / 60);
            lastOnsetBeat = currentBeat - latencyBeats;
        }
    } else {
        isAudioActive = false;
    }
    lastRms = rms;
    
    let activeNote = generatedExercise.find(n => {
        const start = isSwingActive ? n.swingStartBeat : n.startBeat;
        const end = isSwingActive ? n.swingEndBeat : n.endBeat;
        return currentBeat >= start && currentBeat < end;
    });

    // Ventana anticipada: si no hay nota activa, buscar la próxima nota no tocada
    // cuyo beat de inicio esté dentro de 0.4 beats y cuyo onset fue reciente
    if (!activeNote && isAudioActive) {
        const anticipationWindow = 0.40;
        activeNote = generatedExercise.find(n => {
            if (n.hit || n.miss) return false;
            const start = isSwingActive ? n.swingStartBeat : n.startBeat;
            const ahead = start - currentBeat;
            const sinceOnset = currentBeat - lastOnsetBeat;
            // Nota que viene pronto Y el onset fue en los últimos 0.4 beats
            return ahead > 0 && ahead <= anticipationWindow && sinceOnset <= anticipationWindow;
        });
    }
    
    if (activeNote) {
        document.getElementById('currentNoteText').innerHTML = `Toca ahora: <span style="font-size: 20px; text-decoration: underline;">${activeNote.nombre}</span>`;
        updateFretboardMarker(activeNote);
    } else {
        document.getElementById('currentNoteText').textContent = "---";
        updateFretboardMarker(null);
    }
    
    let hz = -1;
    let deviationCents = 0;
    
    if (rms > 0.010) {
        hz = getYinPitch(dataArray, audioContext.sampleRate);
        if (hz > 70 && hz < 1000 && activeNote) {
            const hzCalibrado = hz * Math.pow(2, -calibracionSemitonos / 12);
            deviationCents = 1200 * Math.log2(hzCalibrado / activeNote.hz);

            const cappedDeviation = Math.max(-100, Math.min(100, deviationCents));
            // Escala de ±50 cents → aguja de 0-100% (centro en 50%)
            const needlePos = 50 + cappedDeviation;
            const needle = document.getElementById('tunerNeedle');
            const inTune = Math.abs(deviationCents) < 15;
            const close   = Math.abs(deviationCents) < 35;
            if (needle) {
                needle.style.left = `${needlePos}%`;
                needle.style.backgroundColor = inTune ? '#22d3ee' : close ? '#f59e0b' : '#ef4444';
            }
            // Actualizar indicadores del afinador
            const tunerWidget = document.getElementById('tunerWidget');
            const tunerNoteName = document.getElementById('tunerNoteName');
            const tunerCentsLabel = document.getElementById('tunerCentsLabel');
            if (tunerWidget) tunerWidget.style.opacity = '1';
            if (tunerNoteName) tunerNoteName.textContent = activeNote.nombre;
            if (tunerCentsLabel) {
                const centsRounded = Math.round(deviationCents);
                tunerCentsLabel.textContent = `${centsRounded > 0 ? '+' : ''}${centsRounded} c`;
                tunerCentsLabel.style.color = inTune ? '#22d3ee' : close ? '#f59e0b' : '#ef4444';
            }
            
            if (Math.abs(deviationCents) < 75) {
                aciertosConsecutivos = Math.min(6, aciertosConsecutivos + 1);
                
                const targetBeat = isSwingActive ? activeNote.swingStartBeat : activeNote.startBeat;
                const beatsSinceOnset = Math.abs(lastOnsetBeat - targetBeat);

                if (aciertosConsecutivos >= 3 && !activeNote.hit && beatsSinceOnset <= 0.40) { 
                    activeNote.hit = true;
                    hits++;
                    aciertosConsecutivos = 0;
                    
                    const hitBeat = lastOnsetBeat; 
                    const diffBeats = hitBeat - targetBeat;
                    const diffSeconds = diffBeats * (60 / bpm);
                    const diffMs = Math.round(diffSeconds * 1000);
                    
                    let ratingLabel = "BIEN";
                    let ratingColor = "#10b981"; 
                    
                    const absDiff = Math.abs(diffMs);
                    const isOffbeat = (activeNote.startBeat % 1 === 0.5);
                    let playedStraightInSwing = false;
                    let playedSwingInStraight = false;

                    if (isOffbeat) {
                        const beatStart = Math.floor(activeNote.startBeat);
                        const hitOffset = hitBeat - beatStart;
                        
                        if (isSwingActive) {
                            if (hitOffset < 0.58) playedStraightInSwing = true;
                        } else {
                            if (hitOffset > 0.58) playedSwingInStraight = true;
                        }
                    }

                    if (playedStraightInSwing) {
                        ratingLabel = "¡MÁS SWING! (RECTO)";
                        ratingColor = "#f59e0b"; 
                        earlyLateCount++;
                    } else if (playedSwingInStraight) {
                        ratingLabel = "¡SÍNCOPA! (MUY ATRASADO)";
                        ratingColor = "#f59e0b"; 
                        earlyLateCount++;
                    } else {
                        if (absDiff < 110) {          
                            ratingLabel = "¡PERFECTO!";
                            ratingColor = "#22d3ee"; 
                            perfectCount++;
                        } else if (absDiff < 200) {   
                            ratingLabel = "BIEN";
                            ratingColor = "#10b981"; 
                            goodCount++;
                        } else if (absDiff < 300) {   
                            ratingLabel = diffMs < 0 ? "ADELANTADO" : "ATRASADO";
                            ratingColor = "#f59e0b"; 
                            earlyLateCount++;
                        } else {
                            ratingLabel = "FUERA DE TEMPO";
                            ratingColor = "#ef4444"; 
                        }
                    }
                    
                    showRhythmFeedback(ratingLabel, ratingColor);
                    renderScoreToOffscreen();
                }
            } else {
                aciertosConsecutivos = Math.max(0, aciertosConsecutivos - 1);
            }
        }
    } else {
        const needle = document.getElementById('tunerNeedle');
        if (needle) needle.style.left = "50%";
        // Silencio: apagar indicadores del afinador
        const tunerWidget = document.getElementById('tunerWidget');
        const tunerNoteName = document.getElementById('tunerNoteName');
        const tunerCentsLabel = document.getElementById('tunerCentsLabel');
        if (tunerWidget) tunerWidget.style.opacity = '0.35';
        if (tunerNoteName) tunerNoteName.textContent = '—';
        if (tunerCentsLabel) { tunerCentsLabel.textContent = '— c'; tunerCentsLabel.style.color = ''; }
        aciertosConsecutivos = Math.max(0, aciertosConsecutivos - 1);
    }
    
    // Panel de diagnóstico (sólo visible si #debug no tiene class="hidden")
    const dbgEl = document.getElementById('debug');
    if (dbgEl && !dbgEl.classList.contains('hidden')) {
        const volPercent = (rms * 1000).toFixed(0);
        if (rms > 0.010) {
            if (activeNote) {
                const targetBeat = isSwingActive ? activeNote.swingStartBeat : activeNote.startBeat;
                const onsetOffsetBeats = lastOnsetBeat - targetBeat;
                const onsetOffsetMs = Math.round(onsetOffsetBeats * (60 / bpm) * 1000);
                dbgEl.innerHTML = `🎤 Vol <strong>${volPercent}</strong> | Obj: <strong>${activeNote.nombre} (${activeNote.hz.toFixed(1)} Hz)</strong> | Frec: <strong>${hz > 0 ? hz.toFixed(1) + ' Hz' : '…'}</strong> | Onset: ${onsetOffsetMs > 0 ? '+' : ''}${onsetOffsetMs}ms | Dev: ${hz > 0 ? deviationCents.toFixed(0) + ' c' : 'N/A'} | Match: ${aciertosConsecutivos}/3`;
            } else {
                dbgEl.innerHTML = `🎤 Vol <strong>${volPercent}</strong> | Pitch: ${hz > 0 ? hz.toFixed(1) + ' Hz' : '…'} | sin nota activa`;
            }
        } else {
            dbgEl.textContent = `🎤 Mic activo: Vol ${volPercent} (bajo umbral)`;
        }
    }

    // Marcar notas expiradas como fallo — UN solo render al final si hubo cambios
    let needsRender = false;
    generatedExercise.forEach(note => {
        const end = isSwingActive ? note.swingEndBeat : note.endBeat;
        if (currentBeat > end && !note.hit && !note.miss) {
            note.miss = true;
            misses++;
            needsRender = true;
        }
    });
    if (needsRender) {
        renderScoreToOffscreen();
    }
}

function finishReading() {
    isPlaying = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (sourceStream) sourceStream.getTracks().forEach(track => track.stop());
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

    const totalNotes = generatedExercise.length;
    generatedExercise.forEach(n => {
        if (!n.hit && !n.miss) { n.miss = true; misses++; }
    });
    
    renderScoreToOffscreen();
    drawStaff();
    
    const accuracy = totalNotes > 0 ? Math.round((hits / totalNotes) * 100) : 0;
    // Dividir por totalNotes: notas perdidas cuentan 0, no se ignoran
    const rhythmScore = totalNotes > 0 ? Math.round(((perfectCount * 1.0 + goodCount * 0.8 + earlyLateCount * 0.5) / totalNotes) * 100) : 0;

    document.getElementById('totalNotesScore').textContent = totalNotes;
    document.getElementById('hitsScore').textContent = hits;
    document.getElementById('missesScore').textContent = misses;
    document.getElementById('scoreCircle').textContent = `${accuracy}%`;
    
    const rhythmScoreValEl = document.getElementById('rhythmScoreVal');
    if (rhythmScoreValEl) {
        rhythmScoreValEl.textContent = `${rhythmScore}%`;
    }
    
    let rating = "¡Sigue practicando!";
    if (accuracy >= 90) rating = "¡Lectura excelente! ¡Dominio total!";
    else if (accuracy >= 75) rating = "¡Buenísimo! Tienes un oído excelente";
    else if (accuracy >= 50) rating = "¡Muy bien! Sigue dándole con fuerza";
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) startPracticeBtn.style.display = 'inline-flex';
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.style.display = 'none';
    
    const tunerBar = document.getElementById('tunerBar');
    if (tunerBar) tunerBar.style.opacity = '0.3';

    document.getElementById('scoreRating').textContent = rating;
    document.getElementById('scorecardPanel').style.display = 'flex';
}

function stopPractice() {
    isPlaying = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (sourceStream) sourceStream.getTracks().forEach(track => track.stop());
    
    countdownTimers.forEach(timer => clearTimeout(timer));
    countdownTimers = [];
    
    const overlay = document.getElementById('countdownOverlay');
    if (overlay) overlay.style.display = 'none';
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

    if (globalAudioSource) { globalAudioSource.disconnect(); globalAudioSource = null; }
    if (globalHighpassFilter) { globalHighpassFilter.disconnect(); globalHighpassFilter = null; }
    if (globalLowpassFilter) { globalLowpassFilter.disconnect(); globalLowpassFilter = null; }
    if (globalInputGain) { globalInputGain.disconnect(); globalInputGain = null; }
    if (globalSilentGain) { globalSilentGain.disconnect(); globalSilentGain = null; }

    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) startPracticeBtn.style.display = 'inline-flex';
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.style.display = 'none';
    
    const tunerBar = document.getElementById('tunerBar');
    if (tunerBar) tunerBar.style.opacity = '0.3';
    
    currentBeat = 0;
    
    generatedExercise.forEach(note => {
        note.hit = false;
        note.miss = false;
    });
    renderScoreToOffscreen();
    drawStaff();
}

function startPractice(regenerate = true) {
    if (regenerate) {
        generateExerciseSequence();
        if (recordedAudioURL) {
            URL.revokeObjectURL(recordedAudioURL);
            recordedAudioURL = null;
        }
        const playRecBtn = document.getElementById('playRecordingBtn');
        const playRecBtnGame = document.getElementById('playRecordingBtn_game');
        if (playRecBtn) playRecBtn.classList.add('hidden');
        if (playRecBtnGame) {
            playRecBtnGame.classList.add('hidden');
            playRecBtnGame.style.display = 'none';
        }
    } else {
        generatedExercise.forEach(note => {
            note.hit = false;
            note.miss = false;
        });
    }
    
    renderScoreToOffscreen();
    currentBeat = 0;
    drawStaff();
    updateFretboardMarker(null);
    
    const startPracticeBtn = document.getElementById('startReadingBtn_game');
    if (startPracticeBtn) startPracticeBtn.style.display = 'inline-flex';
    
    const previewBtn = document.getElementById('playPreviewBtn');
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.style.display = 'none';
    
    const tunerBar = document.getElementById('tunerBar');
    if (tunerBar) tunerBar.style.opacity = '0.3';
}

// Exponer funciones en window para compatibilidad con manejadores inline
window.startRecordingPlayback = startRecordingPlayback;
window.stopRecordingPlayback = stopRecordingPlayback;
