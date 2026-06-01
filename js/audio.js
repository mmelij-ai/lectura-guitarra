// ==========================================
// AUDIO SINTETIZADOR DE APOYO (METRÓNOMO Y PREVIO)
// ==========================================
function playMetronomeClick(frequency, duration = 0.04, time) {
    if (!audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const scheduleTime = (time !== undefined) ? time : audioContext.currentTime;
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, scheduleTime);
        gainNode.gain.setValueAtTime(0.15, scheduleTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, scheduleTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        osc.start(scheduleTime);
        osc.stop(scheduleTime + duration);
    } catch (e) {
        console.error("Audio error: ", e);
    }
}

// Sintetizador Rhodes premium simulado por síntesis de modulación de frecuencia (FM)
const synth = new Tone.FMSynth({
    harmonicity: 3.01,
    modulationIndex: 12,
    oscillator: {
        type: "sine"
    },
    envelope: {
        attack: 0.001,
        decay: 0.8,
        sustain: 0.1,
        release: 1.2
    },
    modulation: {
        type: "triangle"
    },
    modulationEnvelope: {
        attack: 0.001,
        decay: 0.08, // Decaimiento súper veloz para recrear el golpe físico del martillo
        sustain: 0.02,
        release: 0.8
    }
}).toDestination();

// Muestreador (Sampler) con sonidos de guitarra española real (nylon)
// Nota: Cambiar a ruta local "audio/guitar-nylon/" cuando se empaquete en la app de escritorio (offline)
const GUITAR_SAMPLES_BASE_URL = "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-nylon/";

const guitarSampler = new Tone.Sampler({
    urls: {
        "A2": "A2.mp3",
        "A3": "A3.mp3",
        "A4": "A4.mp3",
        "A5": "A5.mp3",
        "A#5": "As5.mp3",
        "B1": "B1.mp3",
        "B2": "B2.mp3",
        "B3": "B3.mp3",
        "B4": "B4.mp3",
        "C#3": "Cs3.mp3",
        "C#4": "Cs4.mp3",
        "C#5": "Cs5.mp3",
        "D2": "D2.mp3",
        "D3": "D3.mp3",
        "D5": "D5.mp3",
        "D#4": "Ds4.mp3",
        "E2": "E2.mp3",
        "E3": "E3.mp3",
        "E4": "E4.mp3",
        "E5": "E5.mp3",
        "F#2": "Fs2.mp3",
        "F#3": "Fs3.mp3",
        "F#4": "Fs4.mp3",
        "F#5": "Fs5.mp3",
        "G3": "G3.mp3",
        "G5": "G5.mp3",
        "G#2": "Gs2.mp3",
        "G#4": "Gs4.mp3",
        "G#5": "Gs5.mp3"
    },
    baseUrl: GUITAR_SAMPLES_BASE_URL,
    onload: () => {
        console.log("Muestras de guitarra de nylon cargadas exitosamente.");
    }
}).toDestination();

function playSynthNote(frequency, duration, time) {
    try {
        // Si el sampler ya descargó y cargó en memoria, usamos la guitarra real.
        // Si no, caemos suavemente en la síntesis Rhodes FM.
        if (guitarSampler && guitarSampler.loaded) {
            guitarSampler.triggerAttackRelease(frequency, duration, time);
        } else {
            synth.triggerAttackRelease(frequency, duration, time);
        }
    } catch (e) {
        console.error("Tone.js play error: ", e);
    }
}

// NUEVO ALGORITMO YIN-LITE OPTIMIZADO PARA CPU MÓVIL (Súper veloz en iPad/Safari)
function getYinPitch(buffer, sampleRate) {
    const minFreq = 70;
    const maxFreq = 1000;
    const maxPeriod = Math.ceil(sampleRate / minFreq); 
    const minPeriod = Math.floor(sampleRate / maxFreq); 
    
    const len = buffer.length;
    const d = new Float32Array(maxPeriod + 1);
    
    const windowSize = Math.min(1024, len - maxPeriod);
    if (windowSize <= 0) return -1;
    
    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
        let sum = 0;
        for (let i = 0; i < windowSize; i++) {
            const delta = buffer[i] - buffer[i + tau];
            sum += delta * delta;
        }
        d[tau] = sum;
    }
    
    const cmnd = new Float32Array(maxPeriod + 1);
    cmnd[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= maxPeriod; tau++) {
        runningSum += d[tau];
        cmnd[tau] = d[tau] / ((1 / tau) * runningSum || 1);
    }
    
    const threshold = 0.15;
    let choiceTau = -1;
    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
        if (cmnd[tau] < threshold) {
            choiceTau = tau;
            break;
        }
    }
    
    if (choiceTau === -1) {
        let minVal = Infinity;
        for (let tau = minPeriod; tau <= maxPeriod; tau++) {
            if (cmnd[tau] < minVal) {
                minVal = cmnd[tau];
                choiceTau = tau;
            }
        }
    }
    
    if (choiceTau > 0) {
        let refinedTau = choiceTau;
        if (choiceTau > 1 && choiceTau < maxPeriod) {
            const alpha = cmnd[choiceTau - 1];
            const beta = cmnd[choiceTau];
            const gamma = cmnd[choiceTau + 1];
            const denominator = 2.0 * (alpha - 2.0 * beta + gamma);
            if (Math.abs(denominator) > 0.0001) {
                refinedTau = choiceTau + (alpha - gamma) / denominator;
            }
        }
        return sampleRate / refinedTau;
    }
    return -1;
}

// ==========================================
// MÓDULO PRUEBA DE ENTRADA DE AUDIO
// ==========================================
function stopInputTest() {
    if (!isInputTestRunning) return;
    isInputTestRunning = false;
    
    if (inputTestAnimationId) {
        cancelAnimationFrame(inputTestAnimationId);
        inputTestAnimationId = null;
    }
    
    if (inputTestStream) {
        inputTestStream.getTracks().forEach(track => track.stop());
        inputTestStream = null;
    }
    
    inputTestAnalyser = null;
    inputTestDataArray = null;
    
    // Restaurar UI
    const btn = document.getElementById('btnToggleInputTest');
    if (btn) {
        btn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            Iniciar Prueba
        `;
        btn.className = "px-4 py-2.5 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white font-bold rounded-xl transition-all shadow-md text-xs whitespace-nowrap self-stretch md:self-auto flex justify-center items-center gap-2 select-none focus:outline-none";
    }
    
    const volBar = document.getElementById('inputTestVolumeBar');
    if (volBar) {
        volBar.style.width = "0%";
        volBar.className = "h-full bg-cyan-500 transition-all duration-75";
    }
    
    const volValText = document.getElementById('inputTestVolumeVal');
    if (volValText) volValText.textContent = "0%";
    
    const statusGainEl = document.getElementById('inputTestGainStatus');
    if (statusGainEl) {
        statusGainEl.textContent = "Prueba desactivada";
        statusGainEl.className = "font-black uppercase tracking-wider text-rose-400";
    }
    
    const pitchStatusEl = document.getElementById('inputTestPitchStatus');
    if (pitchStatusEl) {
        pitchStatusEl.textContent = "Nota: -- | Frec: -- Hz";
        pitchStatusEl.className = "font-mono text-slate-500 font-bold";
    }
}

async function startInputTest() {
    if (isPlaying) stopPractice();
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
        console.error("Fallo al iniciar el hardware de audio en test: ", initErr);
    }
    
    isInputTestRunning = true;
    
    const btn = document.getElementById('btnToggleInputTest');
    if (btn) {
        btn.innerHTML = `
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2"></rect>
            </svg>
            Detener Prueba
        `;
        btn.className = "px-4 py-2.5 bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white font-bold rounded-xl transition-all shadow-md text-xs whitespace-nowrap self-stretch md:self-auto flex justify-center items-center gap-2 select-none focus:outline-none";
    }
    
    const statusGainEl = document.getElementById('inputTestGainStatus');
    if (statusGainEl) {
        statusGainEl.textContent = "Iniciando micrófono...";
        statusGainEl.className = "font-black uppercase tracking-wider text-cyan-400";
    }
    
    try {
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
                video: false
            });
        } catch (errConstraints) {
            console.warn("Fallo con restricciones estrictas en test, intentando fallback:", errConstraints);
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
        }
        
        inputTestStream = stream;
        
        inputTestAnalyser = audioContext.createAnalyser();
        inputTestAnalyser.fftSize = 2048;
        
        const source = audioContext.createMediaStreamSource(stream);
        
        const hp = audioContext.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(75, audioContext.currentTime);
        
        const lp = audioContext.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(1000, audioContext.currentTime);
        
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(5.0, audioContext.currentTime);
        
        source.connect(hp);
        hp.connect(lp);
        lp.connect(gain);
        gain.connect(inputTestAnalyser);
        
        // Conexión silenciosa
        const silent = audioContext.createGain();
        silent.gain.setValueAtTime(0, audioContext.currentTime);
        inputTestAnalyser.connect(silent);
        silent.connect(audioContext.destination);
        
        inputTestDataArray = new Float32Array(inputTestAnalyser.fftSize);
        
        if (statusGainEl) {
            statusGainEl.textContent = "Escuchando... Toca una nota";
            statusGainEl.className = "font-black uppercase tracking-wider text-cyan-400";
        }
        
        inputTestLoop();
        
    } catch(err) {
        console.error("Error al iniciar micrófono en test:", err);
        if (statusGainEl) {
            statusGainEl.textContent = "Acceso a micrófono denegado/error";
            statusGainEl.className = "font-black uppercase tracking-wider text-rose-500";
        }
        stopInputTest();
    }
}

function inputTestLoop() {
    if (!isInputTestRunning || !inputTestAnalyser) return;
    
    if (inputTestAnalyser.getFloatTimeDomainData) {
        inputTestAnalyser.getFloatTimeDomainData(inputTestDataArray);
    } else if (inputTestAnalyser.getByteTimeDomainData) {
        const byteArray = new Uint8Array(inputTestAnalyser.fftSize);
        inputTestAnalyser.getByteTimeDomainData(byteArray);
        for (let i = 0; i < byteArray.length; i++) {
            inputTestDataArray[i] = (byteArray[i] - 128) / 128;
        }
    }
    
    let rms = 0;
    for (let i = 0; i < inputTestDataArray.length; i++) rms += inputTestDataArray[i] * inputTestDataArray[i];
    rms = Math.sqrt(rms / inputTestDataArray.length);
    
    const volVal = rms * 1000;
    const volPercent = Math.min(100, Math.round(volVal));
    
    const volBar = document.getElementById('inputTestVolumeBar');
    const volValText = document.getElementById('inputTestVolumeVal');
    if (volBar) {
        volBar.style.width = `${volPercent}%`;
        if (volVal < 10) {
            volBar.className = "h-full bg-amber-500 transition-all duration-75";
        } else if (volVal <= 80) {
            volBar.className = "h-full bg-emerald-500 transition-all duration-75";
        } else {
            volBar.className = "h-full bg-rose-600 transition-all duration-75";
        }
    }
    if (volValText) {
        volValText.textContent = `${volPercent}%`;
    }
    
    const statusGainEl = document.getElementById('inputTestGainStatus');
    if (statusGainEl) {
        if (volVal < 10) {
            statusGainEl.textContent = "Volumen insuficiente (Mín: 10)";
            statusGainEl.className = "font-black uppercase tracking-wider text-amber-500 text-[10px]";
        } else if (volVal <= 80) {
            statusGainEl.textContent = "Volumen Óptimo (Lectura Correcta)";
            statusGainEl.className = "font-black uppercase tracking-wider text-emerald-400 text-[10px] animate-pulse";
        } else {
            statusGainEl.textContent = "Volumen muy alto (Riesgo de Saturación)";
            statusGainEl.className = "font-black uppercase tracking-wider text-rose-500 text-[10px]";
        }
    }
    
    const pitchStatusEl = document.getElementById('inputTestPitchStatus');
    if (volVal >= 10) {
        const hz = getYinPitch(inputTestDataArray, audioContext.sampleRate);
        if (hz > 70 && hz < 1000) {
            const hzCalibrado = hz * Math.pow(2, -calibracionSemitonos / 12);
            const midi = Math.round(12 * Math.log2(hzCalibrado / 440) + 69);
            const expectedHz = 440 * Math.pow(2, (midi - 69) / 12);
            const deviationCents = 1200 * Math.log2(hzCalibrado / expectedHz);
            
            const noteNames = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
            const pc = (midi % 12 + 12) % 12;
            const noteName = noteNames[pc];
            const octave = Math.floor(midi / 12) - 1;
            
            if (pitchStatusEl) {
                const centsSign = deviationCents >= 0 ? "+" : "";
                pitchStatusEl.textContent = `Nota: ${noteName}${octave} | Frec: ${hzCalibrado.toFixed(1)} Hz | Desv: ${centsSign}${deviationCents.toFixed(0)} cents`;
                pitchStatusEl.className = Math.abs(deviationCents) < 25 ? "font-mono text-emerald-400 font-bold" : "font-mono text-amber-400 font-bold";
            }
        } else {
            if (pitchStatusEl) {
                pitchStatusEl.textContent = "Nota: -- | Frec: -- Hz (Buscando...)";
                pitchStatusEl.className = "font-mono text-slate-500 font-bold";
            }
        }
    } else {
        if (pitchStatusEl) {
            pitchStatusEl.textContent = "Nota: -- | Frec: -- Hz";
            pitchStatusEl.className = "font-mono text-slate-500 font-bold";
        }
    }
    
    inputTestAnimationId = requestAnimationFrame(inputTestLoop);
}
