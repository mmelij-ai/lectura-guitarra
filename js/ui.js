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
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
function initApp() {
    const VF = typeof Vex !== 'undefined' ? Vex.Flow : null;
    if (VF) {
        document.getElementById('debug').textContent = "VexFlow loaded. ¡Entrenamiento profesional de guitarra activo!";
    } else {
        document.getElementById('debug').textContent = "VexFlow no se pudo detectar en la carga inicial.";
    }
    
    const panel = document.getElementById('config-panel');
    const chevron = document.getElementById('config-chevron');
    if (panel) {
        panel.classList.add('hidden');
        if (chevron) {
            chevron.classList.remove('rotate-180');
        }
    }

    generateExerciseSequence();
    renderScoreToOffscreen();
    drawStaff();
    updateFretboardLabels();
    updateTheoryPanel();
}

// Arrancar la aplicación una vez que todo el script cargue
initApp();
