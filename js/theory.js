// ==========================================
// NUEVO ALGORITMO INTEGRADO DE GENERACIÓN TEÓRICA DE ESCALAS MODALES (SIN CENTRO TONAL)
// ==========================================
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONE_VALUES = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };

const INTERVAL_SPELLING = {
  '1':    { semitones: 0,  degree: 0 },
  'Sb2':  { semitones: 1,  degree: 1 },
  'Tb9':  { semitones: 1,  degree: 1 },
  'T9':   { semitones: 2,  degree: 1 },
  'T#9':  { semitones: 3,  degree: 1 }, 
  'b3':   { semitones: 3,  degree: 2 },
  '3':    { semitones: 4,  degree: 2 },
  'S3':   { semitones: 4,  degree: 2 },
  '4':    { semitones: 5,  degree: 3 },
  'S4':   { semitones: 5,  degree: 3 },
  'Sb4':  { semitones: 4,  degree: 3 },
  'T11':  { semitones: 5,  degree: 3 },
  'b5':   { semitones: 6,  degree: 4 }, 
  'T#11': { semitones: 6,  degree: 3 }, 
  '5':    { semitones: 7,  degree: 4 },
  '#5':   { semitones: 8,  degree: 4 },
  'T#5':  { semitones: 8,  degree: 4 },
  'Sb6':  { semitones: 8,  degree: 5 }, 
  'Tb13': { semitones: 8,  degree: 5 },
  '6':    { semitones: 9,  degree: 5 },
  'S6':   { semitones: 9,  degree: 5 },
  'T13':  { semitones: 9,  degree: 5 },
  '°7':   { semitones: 9,  degree: 6 },
  'b7':   { semitones: 10, degree: 6 },
  'Sb7':  { semitones: 10, degree: 6 },
  '7':    { semitones: 11, degree: 6 },
  '8':    { semitones: 12, degree: 0 } 
};

const getAccidentalValue = (accStr) => {
  if (!accStr) return 0;
  if (accStr === 'b') return -1;
  if (accStr === '#') return 1;
  if (accStr === 'bb') return -2;
  if (accStr === 'x' || accStr === '##') return 2;
  return 0;
};

const getNoteSemitone = (noteName) => {
  if (!noteName || noteName === '?') return -1;
  const letter = noteName.charAt(0);
  const acc = noteName.slice(1);
  if (SEMITONE_VALUES[letter] === undefined) return -1;
  let val = SEMITONE_VALUES[letter] + getAccidentalValue(acc);
  return (val + 120) % 12;
};

const getSpelledNote = (rootName, intervalSymbol) => {
  const intervalData = INTERVAL_SPELLING[intervalSymbol];
  if (!intervalData) return "?";
  const rootLetter = rootName.charAt(0);
  const rootAccidental = rootName.slice(1);
  const rootValue = SEMITONE_VALUES[rootLetter] + getAccidentalValue(rootAccidental);
  const rootLetterIndex = NOTE_LETTERS.indexOf(rootLetter);
  const targetLetterIndex = (rootLetterIndex + intervalData.degree) % 7;
  const targetLetter = NOTE_LETTERS[targetLetterIndex];
  let targetTotalSemitones = rootValue + intervalData.semitones;
  const targetNaturalValue = SEMITONE_VALUES[targetLetter];
  let delta = (targetTotalSemitones - targetNaturalValue) % 12;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  let accidentalStr = "";
  if (delta === 0) accidentalStr = "";
  else if (delta === 1) accidentalStr = "#";
  else if (delta === 2) accidentalStr = "##";
  else if (delta === -1) accidentalStr = "b";
  else if (delta === -2) accidentalStr = "bb";
  else accidentalStr = "?";
  return targetLetter + accidentalStr;
};

const getNoteType = (symbol) => {
  if (symbol.startsWith('S')) return 'avoid';
  if (symbol.startsWith('T')) return 'tension';
  return 'chord';
};

const scaleFormulas = {
    mayor:          ["1", "T9", "3", "S4", "5", "T13", "7"], // Jónico
    dorico:         ["1", "T9", "b3", "T11", "5", "S6", "b7"],
    frigio:         ["1", "Sb2", "b3", "T11", "5", "Sb6", "b7"],
    lidio:          ["1", "T9", "3", "T#11", "5", "T13", "7"],
    mixolidio:      ["1", "T9", "3", "S4", "5", "T13", "b7"],
    menor_natural:  ["1", "T9", "b3", "T11", "5", "Sb6", "b7"], // Eólico
    locrio:         ["1", "Sb2", "b3", "T11", "b5", "Sb6", "b7"],
    menor_armonica: ["1", "T9", "b3", "T11", "5", "Sb6", "7"],
    menor_melodica: ["1", "T9", "b3", "T11", "5", "T13", "7"],
    armonica_disminuida: ["1", "Sb2", "b3", "Sb4", "b5", "Tb13", "°7"],
    lidia_b7:       ["1", "T9", "3", "T#11", "5", "T13", "b7"],
    mixolidia_b13:  ["1", "T9", "3", "S4", "5", "Tb13", "b7"],
    mixolidia_b9_b13: ["1", "Tb9", "3", "S4", "5", "Tb13", "b7"],
    mixolidia_b9:   ["1", "Tb9", "3", "S4", "5", "T13", "b7"],
    mixolidia_alt:  ["1", "Tb9", "T#9", "3", "S4", "5", "Tb13", "b7"], // Mixolidia (b9, #9, b13)
    alterada:       ["1", "Tb9", "T#9", "3", "b5", "Tb13", "b7"],
    hexafona:       ["1", "T9", "3", "T#11", "T#5", "b7"], // Hexáfona (6 notas)
    dominante_8:    ["1", "Tb9", "T#9", "3", "T#11", "5", "T13", "b7"] // Dominante de 8 notas
};

function buildDynamicNotePool() {
    const positionEl = document.getElementById('positionSelect');
    const tonicEl = document.getElementById('tonicSelect');
    const scaleSelectEl = document.getElementById('scaleSelect');
    
    const position = positionEl ? positionEl.value : "5";
    const tonic = tonicEl ? tonicEl.value : "C";
    const scaleType = scaleSelectEl ? scaleSelectEl.value : "mayor";
    
    const formula = scaleFormulas[scaleType] || scaleFormulas.mayor;
    const scaleNotes = []; // Guardará { pitchClass, letterChar, accidental, spelledName, interval, type }
    
    formula.forEach(symbol => {
        const spelledName = getSpelledNote(tonic, symbol);
        const letter = spelledName.charAt(0).toLowerCase();
        const accidental = spelledName.slice(1);
        const pitchClass = getNoteSemitone(spelledName);
        
        scaleNotes.push({
            pitchClass: pitchClass,
            letter: letter,
            accidental: accidental,
            spelledName: spelledName,
            interval: symbol,
            type: getNoteType(symbol)
        });
    });
    
    // Frecuencias del Mástil (Sonido Real de la Guitarra en afinación estándar)
    const stringBases = {
        1: 64, // E4 (High E)
        2: 59, // B3
        3: 55, // G3
        4: 50, // D3
        5: 45, // A2
        6: 40  // E2 (Low E)
    };
    
    // Rango de Trastes de la posición seleccionada
    let frets;
    if (position === "1") {
        frets = [0, 1, 2, 3, 4, 5];
    } else if (position === "2") {
        frets = [1, 2, 3, 4, 5, 6];
    } else if (position === "3") {
        frets = [2, 3, 4, 5, 6, 7];
    } else if (position === "7") {
        frets = [6, 7, 8, 9, 10, 11];
    } else if (position === "12") {
        frets = [11, 12, 13, 14, 15, 16];
    } else {
        frets = [4, 5, 6, 7, 8, 9];
    }
    const pool = [];
    
    for (let s = 1; s <= 6; s++) {
        const baseMidi = stringBases[s];
        for (const f of frets) {
            const midi = baseMidi + f;
            const pc = midi % 12;
            
            // Verificamos si este casillero de la guitarra pertenece a nuestra escala diatónica deletreada
            const scaleNote = scaleNotes.find(n => n.pitchClass === pc);
            if (scaleNote) {
                // Cálculo de transposición (La guitarra se escribe una octava arriba en el pentagrama)
                let accidentalOffset = 0;
                if (scaleNote.accidental === "#") accidentalOffset = 1;
                else if (scaleNote.accidental === "##") accidentalOffset = 2;
                else if (scaleNote.accidental === "b") accidentalOffset = -1;
                else if (scaleNote.accidental === "bb") accidentalOffset = -2;
                
                const writtenMidi = midi + 12;
                const naturalWrittenMidi = writtenMidi - accidentalOffset;
                const octave = Math.floor(naturalWrittenMidi / 12) - 1;
                
                const vfKey = `${scaleNote.letter}/${octave}`;
                const tip = `Cuerda ${s}, ` + (f === 0 ? "Al aire" : `Traste ${f}`);
                
                pool.push({
                    nombre: scaleNote.spelledName + (octave - 1),
                    midi: midi,
                    vfKey: vfKey,
                    string: s,
                    fret: f,
                    tip: tip,
                    accidental: scaleNote.accidental,
                    interval: scaleNote.interval,
                    type: scaleNote.type
                });
            }
        }
    }
    
    // Ordenamos el pool de notas estrictamente por altura MIDI
    pool.sort((a, b) => a.midi - b.midi);
    return pool;
}

// ==========================================
// DICCIONARIOS Y LÓGICA DE RELACIÓN ESCALA ACORDE (PROJAZZ)
// ==========================================
const scaleDetails = {
    mayor: {
        name: "Jónico",
        chord: "Maj7",
        details: "Grado I de la tonalidad mayor. Evitar el 4º grado (S4) porque choca con la 3ra."
    },
    dorico: {
        name: "Dórico",
        chord: "m7",
        details: "Grado II de la tonalidad mayor. Evitar el 6º grado (S6) porque crea tritono con la 3ra menor."
    },
    frigio: {
        name: "Frigio",
        chord: "m7",
        details: "Grado III de la tonalidad mayor. Sb2 y Sb6 son notas a evitar."
    },
    lidio: {
        name: "Lidio",
        chord: "Maj7",
        details: "Grado IV de la tonalidad mayor. No tiene notas a evitar. Característico #11 (T#11)."
    },
    mixolidio: {
        name: "Mixolidio",
        chord: "7",
        details: "Grado V de la tonalidad mayor. El 4º grado es la nota a evitar (S4)."
    },
    menor_natural: {
        name: "Eólico (Menor Natural)",
        chord: "m7",
        details: "Grado VI de la tonalidad mayor (menor natural). La Sb6 es la nota a evitar."
    },
    locrio: {
        name: "Locrio",
        chord: "m7b5",
        details: "Grado VII de la tonalidad mayor. Se evita Sb2 y Sb6. Típico acorde semidisminuido."
    },
    menor_armonica: {
        name: "Menor Armónica",
        chord: "mMaj7",
        details: "Escala menor con 7ma mayor. La Sb6 es nota a evitar. Contiene una 2da aumentada (entre Sb6 y 7)."
    },
    menor_melodica: {
        name: "Menor Melódica",
        chord: "mMaj7",
        details: "Escala menor con 6ta y 7ma mayores. No contiene notas a evitar."
    },
    armonica_disminuida: {
        name: "Armónica Disminuida",
        chord: "°7",
        details: "Grado VII de la menor armónica. Escala simétrica de acordes disminuidos. Se evita Sb2 y Sb4."
    },
    lidia_b7: {
        name: "Lidia b7",
        chord: "7",
        details: "Escala mixolidia con #11 (o lidia con b7). Típica de dominantes sustitutos (subV7). Sin notas a evitar."
    },
    mixolidia_b13: {
        name: "Mixolidia b13",
        chord: "7",
        details: "Dominante secundario V7/II. Contiene b13 (Tb13) como tensión. El 4º grado es a evitar (S4)."
    },
    mixolidia_b9_b13: {
        name: "Mixolidia b9 b13",
        chord: "7",
        details: "Dominante secundario de grados menores (V7/III o V7/VI). Tensiones Tb9 y Tb13. El 4º grado es a evitar (S4)."
    },
    mixolidia_b9: {
        name: "Mixolidia (b9)",
        chord: "7(b9)",
        details: "Opción para V7. Contiene Tb9 y T13. El 4º grado es la nota a evitar (S4)."
    },
    mixolidia_alt: {
        name: "Mixolidia (b9, #9, b13)",
        chord: "7(alt)",
        details: "Opción con más tensión. Combina tensiones alteradas Tb9, T#9, Tb13 con el 4º grado (S4) a evitar."
    },
    alterada: {
        name: "Escala Alterada",
        chord: "7alt",
        details: "Escala Superlocria (7º modo de menor melódica). Contiene b9, #9, b5 (#11) y b13. Sin notas a evitar."
    },
    hexafona: {
        name: "Hexáfona (Tonos Enteros)",
        chord: "+7",
        details: "Escala simétrica de 6 notas a distancia de tono entero. Para acordes aumentados (+7). Sin notas a evitar."
    },
    dominante_8: {
        name: "Dominante de 8 Notas",
        chord: "7(dim)",
        details: "Escala disminuida semitono-tono (octáfona). Mezcla tensiones naturales y alteradas. Sin notas a evitar."
    }
};

function updateTheoryPanel() {
    const scaleSelectEl = document.getElementById('scaleSelect');
    const tonicEl = document.getElementById('tonicSelect');
    
    const scaleType = scaleSelectEl ? scaleSelectEl.value : "mayor";
    const tonic = tonicEl ? tonicEl.value : "C";
    
    const spec = scaleDetails[scaleType] || scaleDetails.mayor;
    
    // Actualizar Títulos
    const chordSymbolEl = document.getElementById('theoryChordSymbol');
    const scaleNameEl = document.getElementById('theoryScaleName');
    const detailsEl = document.getElementById('theoryDetails');
    
    if (chordSymbolEl) chordSymbolEl.textContent = tonic + " " + spec.chord;
    if (scaleNameEl) scaleNameEl.textContent = `(${spec.name})`;
    if (detailsEl) detailsEl.textContent = spec.details;
    
    // Obtener las notas de la escala con getSpelledNote para mostrarlas como insignias
    const formula = scaleFormulas[scaleType] || scaleFormulas.mayor;
    const notesContainer = document.getElementById('theoryNotesContainer');
    if (notesContainer) {
        notesContainer.innerHTML = '';
        
        formula.forEach(symbol => {
            const spelledNote = getSpelledNote(tonic, symbol);
            const type = getNoteType(symbol);
            
            let colorClasses = "";
            if (type === 'chord') {
                colorClasses = "bg-blue-950/60 text-blue-300 border-blue-800/40 shadow-[0_2px_4px_rgba(59,130,246,0.1)]";
            } else if (type === 'tension') {
                colorClasses = "bg-emerald-950/60 text-emerald-300 border-emerald-800/40 shadow-[0_2px_4px_rgba(16,185,129,0.1)]";
            } else if (type === 'avoid') {
                colorClasses = "bg-red-950/60 text-red-300 border-red-800/40 shadow-[0_2px_4px_rgba(239,68,68,0.1)]";
            }
            
            const badge = document.createElement('div');
            badge.className = `flex flex-col items-center px-2 py-1 rounded-xl border min-w-[56px] text-center transition-all hover:scale-105 ${colorClasses}`;
            badge.innerHTML = `
                <span class="text-[9px] font-bold opacity-75">${symbol}</span>
                <span class="text-xs font-extrabold">${spelledNote}</span>
            `;
            notesContainer.appendChild(badge);
        });
    }
}
