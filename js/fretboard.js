// ==========================================
// MÓDULO DIAPASÓN VIRTUAL DE GUITARRA
// ==========================================

// Mapeo de nota → semitono; compartido por updateFretboardLabels y updateFretboardMarker
const TONIC_SEMITONE = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5,
    "F#": 6, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11
};

function updateFretboardLabels() {
    const positionEl = document.getElementById('positionSelect');
    const position = positionEl ? positionEl.value : "5";
    const f0 = document.getElementById('f0');
    const f1 = document.getElementById('f1');
    const f2 = document.getElementById('f2');
    const f3 = document.getElementById('f3');
    const f4 = document.getElementById('f4');
    const f5 = document.getElementById('f5');
    
    // Resetear clases de resaltado y trastes metálicos de alpaca nítidos
    const fretBoxes = document.querySelectorAll('[id^="fret-box-"]');
    fretBoxes.forEach((box, idx) => {
        box.style.backgroundColor = '';
        box.style.borderLeft = '';
        box.style.boxShadow = '';
        box.classList.remove('bg-cyan-500/10');
        if (idx < 5) {
            box.style.borderRight = "1px solid #2e3a50";
        } else {
            box.style.borderRight = '';
        }
    });

    if (position === "1") {
        const nutBox = document.getElementById('fret-box-0');
        if (nutBox) {
            nutBox.style.borderRight = "5px solid #94a3b8";
            nutBox.style.boxShadow = "2px 0 4px rgba(0,0,0,0.5)";
        }
        if (f0) { f0.style.flex = "1"; f0.textContent = "Al Aire"; }
        if (f1) f1.textContent = "Traste 1";
        if (f2) f2.textContent = "Traste 2";
        if (f3) f3.textContent = "Traste 3";
        if (f4) f4.textContent = "Traste 4";
        if (f5) f5.textContent = "Traste 5";
    } else if (position === "2") {
        if (f0) { f0.style.flex = "1"; f0.textContent = "Traste 1"; }
        if (f1) f1.textContent = "Traste 2";
        if (f2) f2.textContent = "Traste 3";
        if (f3) f3.textContent = "Traste 4";
        if (f4) f4.textContent = "Traste 5";
        if (f5) f5.textContent = "Traste 6";
    } else if (position === "3") {
        if (f0) { f0.style.flex = "1"; f0.textContent = "Traste 2"; }
        if (f1) f1.textContent = "Traste 3";
        if (f2) f2.textContent = "Traste 4";
        if (f3) f3.textContent = "Traste 5";
        if (f4) f4.textContent = "Traste 6";
        if (f5) f5.textContent = "Traste 7";
    } else if (position === "7") {
        if (f0) { f0.style.flex = "1"; f0.textContent = "Traste 6"; }
        if (f1) f1.textContent = "Traste 7";
        if (f2) f2.textContent = "Traste 8";
        if (f3) f3.textContent = "Traste 9";
        if (f4) f4.textContent = "Traste 10";
        if (f5) f5.textContent = "Traste 11";
    } else if (position === "12") {
        if (f0) { f0.style.flex = "1"; f0.textContent = "Traste 11"; }
        if (f1) f1.textContent = "Traste 12";
        if (f2) f2.textContent = "Traste 13";
        if (f3) f3.textContent = "Traste 14";
        if (f4) f4.textContent = "Traste 15";
        if (f5) f5.textContent = "Traste 16";
    } else {
        if (f0) { f0.style.flex = "1"; f0.textContent = "Traste 4"; }
        if (f1) f1.textContent = "Traste 5";
        if (f2) f2.textContent = "Traste 6";
        if (f3) f3.textContent = "Traste 7";
        if (f4) f4.textContent = "Traste 8";
        if (f5) f5.textContent = "Traste 9";
    }

    // RESALTADO DE LOS TRASTES DE LA POSICIÓN ACTIVA
    // La caja cubre las 6 columnas del pool (columnas 0-5 para 1ª pos., 1-6 para el resto)
    const boxStart = (position === "1") ? 0 : 0; // todas las posiciones usan las 6 columnas del mástil
    const boxEnd = 5;
    for (let i = boxStart; i <= boxEnd; i++) {
        const box = document.getElementById(`fret-box-${i}`);
        if (box) {
            box.style.backgroundColor = "rgba(255,255,255,0.02)";
            box.style.boxShadow = "";
            if (i === boxStart) box.style.borderLeft = "2px solid #334155";
            if (i === boxEnd) box.style.borderRight = "2px solid #334155";
        }
    }

    // Dibujar Inlay Markers
    const inlaysContainer = document.getElementById('fretInlays');
    if (inlaysContainer) {
        inlaysContainer.innerHTML = '';
        let activeCols = [];
        
        if (position === "5") {
            activeCols = [1, 3, 5]; // Trastes 5, 7, 9
        } else if (position === "3") {
            activeCols = [1, 3, 5]; // Trastes 3, 5, 7
        } else if (position === "2") {
            activeCols = [2, 4]; // Trastes 3, 5
        } else if (position === "7") {
            activeCols = [1, 3]; // Trastes 7, 9 (siendo baseFret 6, traste 7 está en col 1 y traste 9 en col 3)
        } else if (position === "12") {
            activeCols = [1, 4]; // Trastes 12, 15
        } else {
            activeCols = [3]; // Traste 3 (Posición 1)
        }
        
        activeCols.forEach(colIdx => {
            const percent = (colIdx + 0.5) * 16.66;
            const dot = document.createElement('div');
            dot.className = 'inlay-dot';
            dot.style.left = `${percent}%`;
            inlaysContainer.appendChild(dot);
        });
    }

    renderScaleMarkers();
}

function renderScaleMarkers() {
    const container = document.getElementById('scaleMarkersContainer');
    if (!container) return;
    container.innerHTML = '';

    const positionEl = document.getElementById('positionSelect');
    const tonicEl = document.getElementById('tonicSelect');
    const position = positionEl ? positionEl.value : "5";
    const tonic = tonicEl ? tonicEl.value : "C";

    const rootPitch = TONIC_SEMITONE[tonic] ?? 0;

    const stringsContainer = document.getElementById('stringsContainer');
    const containerHeight = stringsContainer ? stringsContainer.clientHeight : 120;
    const stringStep = containerHeight / 5;

    // RENDERIZAR GUÍAS VISUALES DE CUERDAS AL AIRE EN LA COLUMNA 0 O A LA IZQUIERDA (Para todas las posiciones)
    const openStringNotes = {
        1: "E",
        2: "B",
        3: "G",
        4: "D",
        5: "A",
        6: "E"
    };
    for (let s = 1; s <= 6; s++) {
        // Verificamos si la escala ya dibuja esta nota de la cuerda al aire (solo relevante en Posición 1)
        // Mostrar nombre de cuerda al aire sólo en 1ª posición (las demás no tienen cuerdas al aire en el pool)
        if (position === "1") {
            const hasScaleMarker = activePool.some(note => note.string === s && note.fret === 0);
            if (!hasScaleMarker) {
                const yPosition = (s - 1) * stringStep;
                const guide = document.createElement('div');
                guide.style.left = `8.33%`; // primera columna, dentro del mástil
                guide.style.top = `${yPosition}px`;
                guide.textContent = openStringNotes[s];
                guide.className = "w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-dashed border-slate-700/50 bg-slate-950/20 text-slate-600 text-[11px] sm:text-[13px] font-bold flex items-center justify-center absolute -translate-x-1/2 -translate-y-1/2 z-10 select-none";
                container.appendChild(guide);
            }
        }
    }

    activePool.forEach(note => {
        if (note.fret === 0 && position !== "1") return; // No dibujar marcadores de escala coloreados para cuerdas al aire fuera de la Posición 1
        let baseFret;
        if (position === "1") baseFret = 0;
        else if (position === "2") baseFret = 1;
        else if (position === "3") baseFret = 2;
        else if (position === "7") baseFret = 6;
        else if (position === "12") baseFret = 11;
        else baseFret = 4;
        const trasteIndex = note.fret - baseFret;

        let porcenHorizontal;
        if (note.fret === 0) {
            porcenHorizontal = 8.33; // siempre en la primera columna
        } else {
            porcenHorizontal = (trasteIndex + 0.5) * 16.66;
        }

        const yPosition = (note.string - 1) * stringStep;
        const isTonic = (note.midi % 12 === rootPitch);
        const noteNameOnly = note.nombre.replace(/\d+$/, ''); 

        const displayText = (window.viewMode === 'intervals') ? (note.interval || '?') : noteNameOnly;
        
        let textClasses = "text-[11px] sm:text-[13px] font-black";
        if (displayText.length > 2) {
            textClasses = "text-[9px] sm:text-[10.5px] font-black tracking-tighter";
        }

        const dot = document.createElement('div');
        dot.style.left = `${porcenHorizontal}%`;
        dot.style.top = `${yPosition}px`;
        dot.textContent = displayText;

        // Si es cuerda al aire (fret 0), usamos una caja rounded-lg y border-dashed
        const isFret0 = (note.fret === 0);
        const shapeClass = isFret0 ? "rounded-lg" : "rounded-full";
        const borderStyle = isFret0 ? "dashed" : "solid";

        // Todo via style inline — sin depender de Tailwind
        dot.className = '';
        dot.style.position = 'absolute';
        dot.style.width = '32px';
        dot.style.height = '32px';
        dot.style.borderRadius = isFret0 ? '6px' : '50%';
        dot.style.display = 'flex';
        dot.style.alignItems = 'center';
        dot.style.justifyContent = 'center';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.zIndex = isTonic ? '25' : '20';
        dot.style.fontSize = displayText.length > 2 ? '9px' : '11px';
        dot.style.fontWeight = '900';
        dot.style.boxSizing = 'border-box';
        dot.style.cursor = 'default';
        dot.style.userSelect = 'none';

        if (isTonic) {
            dot.style.backgroundColor = '#1e3a5f';      // azul profundo — tónica
            dot.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            dot.style.borderWidth = '2.5px';
            dot.style.borderColor = '#ffffff';
            dot.style.color = '#ffffff';
        } else if (note.type === 'chord') {
            dot.style.backgroundColor = '#2d5a8e';      // azul claro — arpegio
            dot.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            dot.style.borderWidth = '2px';
            dot.style.borderColor = '#ffffff';
            dot.style.color = '#fde68a';                // texto amarillo
        } else if (note.type === 'tension') {
            dot.style.backgroundColor = '#1e3356';      // azul oscuro — tensión
            dot.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            dot.style.borderWidth = '1.5px';
            dot.style.borderColor = '#ffffff';
            dot.style.color = '#f1f5f9';
        } else if (note.type === 'avoid') {
            dot.style.backgroundColor = '#1a2a45';      // azul muy oscuro — avoid
            dot.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            dot.style.borderWidth = '1px';
            dot.style.borderColor = '#ffffff';
            dot.style.color = '#cbd5e1';
        } else {
            dot.style.backgroundColor = '#1e3356';      // azul oscuro — escala
            dot.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            dot.style.borderWidth = '1px';
            dot.style.borderColor = '#ffffff';
            dot.style.color = '#f1f5f9';
        }

        container.appendChild(dot);
    });
}

function updateFretboardMarker(note) {
    const marker = document.getElementById('neckMarker');
    const tipText = document.getElementById('tipText');
    const positionEl = document.getElementById('positionSelect');
    const tonicEl = document.getElementById('tonicSelect');
    const position = positionEl ? positionEl.value : "5";
    const tonic = tonicEl ? tonicEl.value : "C";

    const rootPitch = TONIC_SEMITONE[tonic] ?? 0;

    if (!note) {
        if (marker) marker.style.display = 'none';
        const positionNames = {
            "1": "1ª Posición",
            "2": "2ª Posición",
            "3": "3ª Posición",
            "5": "5ª Posición",
            "7": "7ª Posición",
            "12": "12ª Posición"
        };
        const posName = positionNames[position] || `${position}ª Posición`;
        if (tipText) tipText.textContent = `Estudio ${posName} | Estudia la partitura o dale play a la escucha sugerida`;
        return;
    }
    
    if (tipText) tipText.textContent = note.tip;
    
    let baseFret;
    if (position === "1") baseFret = 0;
    else if (position === "2") baseFret = 1;
    else if (position === "3") baseFret = 2;
    else if (position === "7") baseFret = 6;
    else if (position === "12") baseFret = 11;
    else baseFret = 4;
    const trasteIndex = note.fret - baseFret;
    
    let porcenHorizontal;
    if (note.fret === 0) {
        porcenHorizontal = 8.33; // primera columna, siempre dentro del mástil
    } else {
        porcenHorizontal = (trasteIndex + 0.5) * 16.66;
    }
    
    const stringsContainer = document.getElementById('stringsContainer');
    const containerHeight = stringsContainer ? stringsContainer.clientHeight : 120;
    const stringStep = containerHeight / 5;
    const yPosition = (note.string - 1) * stringStep;
    
    if (marker) {
        marker.style.left = `${porcenHorizontal}%`;
        marker.style.top = `${yPosition}px`;
        marker.style.display = 'flex';

        const noteNameOnly = note.nombre.replace(/\d+$/, '');
        const displayText = (window.viewMode === 'intervals') ? (note.interval || '?') : noteNameOnly;
        marker.textContent = displayText;

        const isFret0 = (note.fret === 0);

        // Todo via style inline — sin depender de Tailwind
        marker.className = 'note-marker';
        marker.style.width = '32px';
        marker.style.height = '32px';
        marker.style.borderRadius = isFret0 ? '6px' : '50%';
        marker.style.fontSize = displayText.length > 2 ? '9px' : '11px';
        marker.style.fontWeight = '900';
        marker.style.boxSizing = 'border-box';

        if (note.midi % 12 === rootPitch) {
            marker.style.backgroundColor = '#1e3a5f';
            marker.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            marker.style.borderWidth = '2.5px';
            marker.style.borderColor = '#ffffff';
            marker.style.color = '#ffffff';
        } else if (note.type === 'chord') {
            marker.style.backgroundColor = '#2d5a8e';
            marker.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            marker.style.borderWidth = '2px';
            marker.style.borderColor = '#ffffff';
            marker.style.color = '#fde68a';
        } else if (note.type === 'tension') {
            marker.style.backgroundColor = '#1e3356';
            marker.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            marker.style.borderWidth = '1.5px';
            marker.style.borderColor = '#ffffff';
            marker.style.color = '#f1f5f9';
        } else if (note.type === 'avoid') {
            marker.style.backgroundColor = '#1a2a45';
            marker.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            marker.style.borderWidth = '1px';
            marker.style.borderColor = '#ffffff';
            marker.style.color = '#cbd5e1';
        } else {
            marker.style.backgroundColor = '#1e3356';
            marker.style.borderStyle = isFret0 ? 'dashed' : 'solid';
            marker.style.borderWidth = '1px';
            marker.style.borderColor = '#ffffff';
            marker.style.color = '#f1f5f9';
        }
    }
}
