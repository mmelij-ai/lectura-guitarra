// ==========================================
// PARÁMETROS Y ESTADOS GLOBALES DE JUEGO
// ==========================================
let activePool = [];
let generatedExercise = [];
let currentBeat = 0;
let totalBeats = 16;
let bpm = 80;
let calibracionSemitonos = 0; // Por defecto 0 para afinación estándar Mi/E directa
let latencyMs = 0;            // Compensación de latencia de micrófono en milisegundos
let hits = 0;
let misses = 0;

// Variables acumuladoras para cálculo rítmico
let perfectCount = 0;
let goodCount = 0;
let earlyLateCount = 0;

// Variables globales de onset para evitar el bug de resonancia/late-detection
let isAudioActive = false;
let lastOnsetBeat = 0;
let lastRms = 0;

// Variables de grabación y automonitoreo de audio
let mediaRecorder = null;
let recordedChunks = [];
let recordedAudioURL = null;
let isRecordingPlayback = false;
let playerSource = null;
let countdownTimers = [];
let playbackAnimationId = null;
let lastPlaybackClickBeat = -1;
let scheduledPlaybackBeats = [];

// Estado del Game Loop y Audio
let audioContext = null;
let analyser = null;
let dataArray = null;
let isPlaying = false;
let isPreviewPlaying = false;
let sourceStream = null;
let lastTickBeat = -1;
let animationId = null;
let startTime = 0;
let aciertosConsecutivos = 0;

// Indicador rítmico de Swing activo
let isSwingActive = false;

// Referencias de Nodos de Audio persistentes para evitar Garbage Collection agresivo de iOS/Safari
let globalAudioSource = null;
let globalHighpassFilter = null;
let globalLowpassFilter = null;
let globalInputGain = null;
let globalSilentGain = null;

// Elementos UI básicos
const bpmSlider = document.getElementById('bpmSlider');
const bpmVal = document.getElementById('bpmVal');

if (bpmSlider) {
    bpmSlider.addEventListener('input', (e) => {
        bpm = parseInt(e.target.value);
        if (bpmVal) bpmVal.textContent = `${bpm} BPM`;
    });
}

const calSelect = document.getElementById('calibrationSelect');
if (calSelect) {
    calSelect.addEventListener('change', (e) => {
        calibracionSemitonos = parseInt(e.target.value);
    });
}

const latencySlider = document.getElementById('latencySlider');
const latencyValEl = document.getElementById('latencyVal');
if (latencySlider) {
    latencySlider.addEventListener('input', (e) => {
        latencyMs = parseInt(e.target.value);
        if (latencyValEl) latencyValEl.textContent = `${latencyMs > 0 ? '+' : ''}${latencyMs} ms`;
    });
}

// Variables de Prueba de Entrada de Audio
let isInputTestRunning = false;
let inputTestStream = null;
let inputTestAnalyser = null;
let inputTestDataArray = null;
let inputTestAnimationId = null;

// Modos de vista e intervalos
window.viewMode = 'notes'; // 'notes' o 'intervals'
window.showStaveIntervals = true;
