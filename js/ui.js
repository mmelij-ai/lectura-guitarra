// ==========================================
// MÓDULO INTERFAZ DE USUARIO Y CONTROLADORES DE EVENTOS
// ==========================================

window.toggleConfigPanel = function() {
    const panel = document.getElementById('config-panel');
    const chevron = document.getElementById('config-chevron');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        panel.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
        if (isInputTestRunning) stopInputTest();
    }
};

window.toggleTheoryPanel = function() {
    const contentEl = document.getElementById('theoryPanelContent');
    const arrowEl = document.getElementById('theoryPanelArrow');
    if (!contentEl || !arrowEl) return;
    
    const isCollapsed = contentEl.classList.contains('max-h-0');
    if (isCollapsed) {
        contentEl.classList.remove('max-h-0', 'opacity-0', 'pb-0');
        contentEl.classList.add('max-h-[300px]', 'opacity-100', 'pb-4', 'sm:pb-5');
        arrowEl.classList.add('rotate-180');
    } else {
        contentEl.classList.add('max-h-0', 'opacity-0', 'pb-0');
        contentEl.classList.remove('max-h-[300px]', 'opacity-100', 'pb-4', 'sm:pb-5');
        arrowEl.classList.remove('rotate-180');
    }
};

window.setViewMode = function(mode) {
    window.viewMode = mode;
    const viewNotesBtn = document.getElementById('viewNotesBtn');
    const viewIntervalsBtn = document.getElementById('viewIntervalsBtn');
    
    if (viewNotesBtn && viewIntervalsBtn) {
        if (mode === 'notes') {
            viewNotesBtn.className = 'px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] focus:outline-none';
            viewIntervalsBtn.className = 'px-4 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 focus:outline-none';
        } else {
            viewNotesBtn.className = 'px-4 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 focus:outline-none';
            viewIntervalsBtn.className = 'px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] focus:outline-none';
        }
    }
    
    renderScaleMarkers();
};

window.triggerRegenerate = function() {
    if (isPlaying || isPreviewPlaying || isRecordingPlayback) {
        stopPractice();
        stopAudioPreview();
        stopRecordingPlayback();
    }
    // Liberar memoria del audio capturado previamente
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

    generateExerciseSequence();
    renderScoreToOffscreen();
    drawStaff();
    updateFretboardLabels();
    updateFretboardMarker(null);
    updateTheoryPanel();
    document.getElementById('currentNoteText').innerHTML = "Ajustes actualizados. Estudia la partitura antes de empezar";
};

// ==========================================
// CONTROLADORES DE EVENTOS
// ==========================================

const startReadingBtn_game = document.getElementById('startReadingBtn_game');
if (startReadingBtn_game) {
    startReadingBtn_game.addEventListener('click', async () => {
        try {
            await Tone.start();
            audioContext = Tone.context.rawContext || new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        } catch(e) {
            console.error("Fallo al iniciar el motor de Audio Context: ", e);
        }
        startRealPractice();
    });
}

const playPreviewBtn = document.getElementById('playPreviewBtn');
if (playPreviewBtn) {
    playPreviewBtn.addEventListener('click', async () => {
        try {
            await Tone.start();
            audioContext = Tone.context.rawContext || new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        } catch(e) {
            console.error("Fallo al iniciar el motor de Audio Context: ", e);
        }
        startAudioPreview();
    });
}

const stopBtn = document.getElementById('stopBtn');
if (stopBtn) {
    stopBtn.addEventListener('click', stopPractice);
}

const retryBtn = document.getElementById('retryBtn');
if (retryBtn) {
    retryBtn.addEventListener('click', () => {
        const scorecardPanel = document.getElementById('scorecardPanel');
        if (scorecardPanel) scorecardPanel.style.display = 'none';
        startPractice(false); 
    });
}

const nextExerciseBtn = document.getElementById('nextExerciseBtn');
if (nextExerciseBtn) {
    nextExerciseBtn.addEventListener('click', () => {
        const scorecardPanel = document.getElementById('scorecardPanel');
        if (scorecardPanel) scorecardPanel.style.display = 'none';
        startPractice(true); 
    });
}

const playRecordingBtn = document.getElementById('playRecordingBtn');
if (playRecordingBtn) {
    playRecordingBtn.addEventListener('click', async () => {
        try {
            await Tone.start();
            audioContext = Tone.context.rawContext || new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        } catch(e) {
            console.error("Fallo al iniciar el motor de Audio Context: ", e);
        }
        startRecordingPlayback();
    });
}

const playRecordingBtn_game = document.getElementById('playRecordingBtn_game');
if (playRecordingBtn_game) {
    playRecordingBtn_game.addEventListener('click', async () => {
        try {
            await Tone.start();
            audioContext = Tone.context.rawContext || new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        } catch(e) {
            console.error("Fallo al iniciar el motor de Audio Context: ", e);
        }
        startRecordingPlayback();
    });
}

const btnToggleInputTest = document.getElementById('btnToggleInputTest');
if (btnToggleInputTest) {
    btnToggleInputTest.addEventListener('click', () => {
        if (isInputTestRunning) {
            stopInputTest();
        } else {
            startInputTest();
        }
    });
}

window.addEventListener('resize', () => {
    drawStaff();
    updateFretboardLabels();
});

// ==========================================
// PERSISTENCIA DE CONFIGURACIÓN (localStorage)
// ==========================================
const STORAGE_KEY = 'lectura-guitarra-config';

const CONFIG_FIELDS = [
    'tonicSelect', 'scaleSelect', 'positionSelect', 'difficultySelect',
    'rhythmSelect', 'grooveSelect', 'barsSelect', 'calibrationSelect', 'bpmSlider',
    'latencySlider'
];
// Checkboxes se persisten por separado (valor booleano)
const CONFIG_CHECKS = ['startOnTonicCheck', 'practicalSpellingCheck'];

function saveConfig() {
    try {
        const cfg = {};
        CONFIG_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) cfg[id] = el.value;
        });
        CONFIG_CHECKS.forEach(id => {
            const el = document.getElementById(id);
            if (el) cfg[id] = el.checked;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch(e) { /* privado/bloqueado — ignorar */ }
}

function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const cfg = JSON.parse(raw);
        CONFIG_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && cfg[id] !== undefined) {
                el.value = cfg[id];
                if (id === 'bpmSlider') {
                    bpm = parseInt(cfg[id]);
                    const bpmVal = document.getElementById('bpmVal');
                    if (bpmVal) bpmVal.textContent = `${bpm} BPM`;
                }
                if (id === 'calibrationSelect') {
                    calibracionSemitonos = parseInt(cfg[id]);
                }
                if (id === 'latencySlider') {
                    latencyMs = parseInt(cfg[id]);
                    const latencyValEl = document.getElementById('latencyVal');
                    if (latencyValEl) latencyValEl.textContent = `${latencyMs > 0 ? '+' : ''}${latencyMs} ms`;
                }
            }
        });
        CONFIG_CHECKS.forEach(id => {
            const el = document.getElementById(id);
            if (el && cfg[id] !== undefined) el.checked = cfg[id];
        });
    } catch(e) { /* JSON corrupto — ignorar */ }
}

// Guardar al cambiar cualquier campo de configuración
CONFIG_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        const evt = (el.tagName === 'INPUT') ? 'input' : 'change';
        el.addEventListener(evt, saveConfig);
    }
});
CONFIG_CHECKS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', saveConfig);
});

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
function initApp() {
    // Restaurar configuración guardada antes de generar el primer ejercicio
    loadConfig();

    const panel = document.getElementById('config-panel');
    const chevron = document.getElementById('config-chevron');
    if (panel) {
        panel.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    }

    generateExerciseSequence();
    renderScoreToOffscreen();
    drawStaff();
    updateFretboardLabels();
    updateTheoryPanel();
}

// Arrancar la aplicación una vez que todo el script cargue
initApp();
