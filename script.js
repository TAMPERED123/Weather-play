/* ============================================================
   AETHER WEATHER — Main Application Script
   Fixed & Improved Version
   ============================================================ */

'use strict';

// ============================================================
// CONFIG — unified Open-Meteo only (no OWM API key needed)
// ============================================================
const GEO_BASE   = 'https://geocoding-api.open-meteo.com/v1';
const METEO_BASE = 'https://api.open-meteo.com/v1';

// App State
let state = {
  unit:         'C',
  soundOn:      false,
  soundReady:   false,
  volume:       0.4,
  weather:      null,
  forecast:     null,
  currentCity:  '',
  refreshTimer: null,
  activeSound:  null,
  audioCtx:     null,
  masterGain:   null,   // single master gain node — never recreated
  soundSource:  null,   // looping BufferSource (rain/wind/night background noise)
  lat:          null,
  lon:          null,
  timezone:     'auto',
  retryCount:   0,
  currentTheme: null,
  isNight:      false,
};

// Weather icon SVGs
const WEATHER_ICONS = {
  sunny:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="22" fill="#FFD34D" opacity="0.95"><animate attributeName="r" values="22;24;22" dur="3s" repeatCount="indefinite"/></circle><g stroke="#FFD34D" stroke-width="4" stroke-linecap="round" opacity="0.8"><line x1="50" y1="12" x2="50" y2="22"><animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/></line><line x1="50" y1="78" x2="50" y2="88"/><line x1="12" y1="50" x2="22" y2="50"/><line x1="78" y1="50" x2="88" y2="50"/><line x1="23" y1="23" x2="30" y2="30"/><line x1="70" y1="70" x2="77" y2="77"/><line x1="77" y1="23" x2="70" y2="30"/><line x1="23" y1="77" x2="30" y2="70"/></g><circle cx="50" cy="50" r="22" fill="none" stroke="#FFD34D" stroke-width="1.5" opacity="0.4"><animate attributeName="r" values="22;32;22" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/></circle></svg>`,
  cloudy:  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="48" cy="62" rx="36" ry="22" fill="#C9D6E3"><animateTransform attributeName="transform" type="translate" values="0 0;2 -2;0 0" dur="4s" repeatCount="indefinite"/></ellipse><ellipse cx="34" cy="52" rx="22" ry="16" fill="#DCE3EA"><animateTransform attributeName="transform" type="translate" values="0 0;-1 -1;0 0" dur="3s" repeatCount="indefinite"/></ellipse><ellipse cx="58" cy="50" rx="20" ry="15" fill="#e8eef4"><animateTransform attributeName="transform" type="translate" values="0 0;1 -2;0 0" dur="5s" repeatCount="indefinite"/></ellipse></svg>`,
  rainy:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="38" rx="32" ry="22" fill="#718096"/><ellipse cx="34" cy="32" rx="20" ry="15" fill="#4a5568"/><ellipse cx="66" cy="34" rx="18" ry="14" fill="#4a5568"/><line x1="36" y1="60" x2="30" y2="78" stroke="#4FA3FF" stroke-width="3" stroke-linecap="round"><animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" begin="0s"/></line><line x1="50" y1="62" x2="44" y2="80" stroke="#4FA3FF" stroke-width="3" stroke-linecap="round"><animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" begin="0.25s"/></line><line x1="64" y1="60" x2="58" y2="78" stroke="#4FA3FF" stroke-width="3" stroke-linecap="round"><animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" begin="0.5s"/></line></svg>`,
  stormy:  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="35" rx="35" ry="24" fill="#1a202c"/><ellipse cx="34" cy="28" rx="22" ry="17" fill="#2d3748"/><path d="M55 45 L42 62 L50 62 L37 82 L58 62 L50 62 L63 45Z" fill="#FFD34D"><animate attributeName="opacity" values="1;0.1;1" dur="1.5s" repeatCount="indefinite"/></path></svg>`,
  windy:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M15 42 Q35 32 55 42 Q75 52 90 42" stroke="#C9D6E3" stroke-width="4" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;5 0;0 0" dur="1.5s" repeatCount="indefinite"/></path><path d="M10 54 Q30 44 50 54 Q70 64 85 54" stroke="#a0b8cc" stroke-width="3" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;-5 0;0 0" dur="2s" repeatCount="indefinite"/></path><path d="M20 66 Q40 56 60 66 Q75 72 88 66" stroke="#718096" stroke-width="2.5" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;4 0;0 0" dur="1.2s" repeatCount="indefinite"/></path><circle cx="72" cy="28" r="15" fill="#FFD34D" opacity="0.7"/></svg>`,
  night:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M62 20 A28 28 0 1 0 62 74 A20 20 0 1 1 62 20Z" fill="#C9D6E3"><animate attributeName="opacity" values="0.9;1;0.9" dur="4s" repeatCount="indefinite"/></path><circle cx="78" cy="22" r="2.5" fill="white" opacity="0.9"/><circle cx="85" cy="35" r="1.5" fill="white" opacity="0.7"/><circle cx="72" cy="40" r="2" fill="white" opacity="0.8"/><circle cx="20" cy="18" r="2" fill="white"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle><circle cx="30" cy="30" r="1.5" fill="white"><animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" begin="0.5s"/></circle><circle cx="15" cy="45" r="2.5" fill="white"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" begin="1s"/></circle></svg>`,
  snowy:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="38" rx="30" ry="20" fill="#c4d5e3"/><ellipse cx="36" cy="32" rx="20" ry="15" fill="#e0ebf4"/><circle cx="38" cy="68" r="5" fill="white" opacity="0.9"><animate attributeName="cy" values="68;80;100" dur="2s" repeatCount="indefinite" begin="0s"/></circle><circle cx="50" cy="62" r="4" fill="white" opacity="0.85"><animate attributeName="cy" values="62;76;100" dur="2.5s" repeatCount="indefinite" begin="0.4s"/></circle><circle cx="62" cy="70" r="5" fill="white" opacity="0.9"><animate attributeName="cy" values="70;82;100" dur="1.8s" repeatCount="indefinite" begin="0.8s"/></circle></svg>`,
  fog:     `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="36" width="80" height="8" rx="4" fill="#a0b8cc" opacity="0.7"><animate attributeName="x" values="10;15;10" dur="4s" repeatCount="indefinite"/></rect><rect x="5" y="50" width="90" height="8" rx="4" fill="#8090a0" opacity="0.6"><animate attributeName="x" values="5;-5;5" dur="5s" repeatCount="indefinite"/></rect><rect x="12" y="64" width="76" height="8" rx="4" fill="#a0b8cc" opacity="0.5"><animate attributeName="x" values="12;18;12" dur="3.5s" repeatCount="indefinite"/></rect></svg>`,
};

// ============================================================
// AUDIO ENGINE
// ============================================================
function initAudio() {
  if (state.audioCtx) return;
  try {
    state.audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    state.masterGain = state.audioCtx.createGain();
    state.masterGain.gain.value = 0;
    state.masterGain.connect(state.audioCtx.destination);
    state.soundReady = true;
  } catch(e) {
    console.warn('Web Audio not available:', e);
  }
}

// ─── White noise buffer ───────────────────────────────────────
function createWhiteNoiseBuffer(ctx, seconds = 4) {
  const len    = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// ─── Stop whatever is currently playing ──────────────────────
// immediate=true  → cut instantly
// immediate=false → 2 s fade-out then stop
function stopSound(immediate = false) {
  // Nullify activeSound so looping callbacks (chirp / cricket) stop scheduling
  state.activeSound = null;

  const ctx      = state.audioCtx;
  const gain     = state.masterGain;
  const source   = state.soundSource;
  state.soundSource = null;

  if (gain && ctx) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    if (immediate) {
      gain.gain.setValueAtTime(0, now);
    } else {
      gain.gain.setTargetAtTime(0, now, 0.6);
    }
  }

  if (source) {
    if (immediate) {
      try { source.stop(); } catch(e) {}
    } else {
      setTimeout(() => { try { source.stop(); } catch(e) {} }, 2200);
    }
  }
}

// ─── Fade master gain up to target volume ────────────────────
function fadeIn(targetVol, rampSecs = 2) {
  if (!state.audioCtx || !state.masterGain) return;
  const now = state.audioCtx.currentTime;
  state.masterGain.gain.cancelScheduledValues(now);
  state.masterGain.gain.setValueAtTime(0, now);
  state.masterGain.gain.linearRampToValueAtTime(targetVol, now + rampSecs);
}

// ─── Connect a looping source through a chain and store it ───
function startLoopingSource(source) {
  source.loop = true;
  source.start();
  state.soundSource = source;
}

// ============================================================
// DISTINCT SOUND GENERATORS
// ============================================================

/* RAIN — bandpass-filtered white noise tuned for droplet patter
   Frequency centre ~2400 Hz (water droplets), narrow Q, plus a
   low rumble layer so it feels "wet" and clearly different from wind */
function playRainSound() {
  if (!state.audioCtx || !state.soundOn) return;
  stopSound(true);

  const ctx = state.audioCtx;
  const noiseBuffer = createWhiteNoiseBuffer(ctx, 6);

  // Layer 1: bright drop patter
  const src1 = ctx.createBufferSource();
  src1.buffer = noiseBuffer;
  src1.loop   = true;

  const bp1 = ctx.createBiquadFilter();
  bp1.type            = 'bandpass';
  bp1.frequency.value = 2400;
  bp1.Q.value         = 1.2;  // relatively narrow = crisp drops

  const hp = ctx.createBiquadFilter();
  hp.type            = 'highpass';
  hp.frequency.value = 1800;

  const dropGain = ctx.createGain();
  dropGain.gain.value = 0.65;

  src1.connect(hp);
  hp.connect(bp1);
  bp1.connect(dropGain);
  dropGain.connect(state.masterGain);

  // Layer 2: low rumble (rain on ground)
  const src2 = ctx.createBufferSource();
  src2.buffer = createWhiteNoiseBuffer(ctx, 4);
  src2.loop   = true;

  const lp2 = ctx.createBiquadFilter();
  lp2.type            = 'lowpass';
  lp2.frequency.value = 320;

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.25;

  src2.connect(lp2);
  lp2.connect(rumbleGain);
  rumbleGain.connect(state.masterGain);

  // Slow LFO to modulate drop density feel
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  lfo.type = 'sine';
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain);
  lfoGain.connect(bp1.frequency);
  lfo.start();

  src1.start();
  src2.start();
  // Store src1 as the "main" source; src2 will be garbage-collected naturally
  state.soundSource = src1;

  fadeIn(state.volume * 0.85, 2);
}

/* WIND — broad low-frequency whoosh:
   Low-pass at 400 Hz + slow tremolo LFO on gain gives the
   characteristic "whooshing" feel, clearly lower-pitched than rain */
function playWindSound() {
  if (!state.audioCtx || !state.soundOn) return;
  stopSound(true);

  const ctx = state.audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = createWhiteNoiseBuffer(ctx, 8);
  src.loop   = true;

  // Shape: keep only low & mid-low frequencies (wind feel)
  const lp = ctx.createBiquadFilter();
  lp.type            = 'lowpass';
  lp.frequency.value = 380;
  lp.Q.value         = 0.8;

  const hp = ctx.createBiquadFilter();
  hp.type            = 'highpass';
  hp.frequency.value = 60;   // remove DC / sub-bass rumble

  // Tremolo (amplitude LFO) — slow whoosh rhythm
  const tremoloOsc  = ctx.createOscillator();
  tremoloOsc.frequency.value = 0.18;
  tremoloOsc.type = 'sine';
  const tremoloGain = ctx.createGain();
  tremoloGain.gain.value = 0.35;   // depth of wobble

  const carrierGain = ctx.createGain();
  carrierGain.gain.value = 0.65;

  tremoloOsc.connect(tremoloGain);
  tremoloGain.connect(carrierGain.gain); // modulate amplitude
  tremoloOsc.start();

  src.connect(hp);
  hp.connect(lp);
  lp.connect(carrierGain);
  carrierGain.connect(state.masterGain);

  src.start();
  state.soundSource = src;

  fadeIn(state.volume * 0.75, 3);
}

/* BIRDS — gentle high-frequency ambience layer + randomised
   chirp oscillators to create morning bird feel */
function playBirdsSound() {
  if (!state.audioCtx || !state.soundOn) return;

  // Explicitly kill any residual source (wind / rain / night) before starting.
  // stopSound(true) already ran in applyTheme, but guard again here for safety.
  if (state.soundSource) {
    try { state.soundSource.stop(); } catch(e) {}
    state.soundSource = null;
  }
  // Hard-zero the master gain so wind/rain cannot bleed into the birds ramp.
  if (state.masterGain && state.audioCtx) {
    state.masterGain.gain.cancelScheduledValues(state.audioCtx.currentTime);
    state.masterGain.gain.setValueAtTime(0, state.audioCtx.currentTime);
  }

  const ctx = state.audioCtx;

  // Very soft high-pass filtered noise as "ambient breeze" under the birds
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = createWhiteNoiseBuffer(ctx, 6);
  noiseSrc.loop   = true;

  const hp = ctx.createBiquadFilter();
  hp.type            = 'highpass';
  hp.frequency.value = 3000;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.06; // very quiet — just texture

  noiseSrc.connect(hp);
  hp.connect(noiseGain);
  noiseGain.connect(state.masterGain);
  noiseSrc.start();
  state.soundSource = noiseSrc;

  // Chirp scheduler — runs only while activeSound === 'birds'
  function chirp() {
    if (!state.soundOn || state.activeSound !== 'birds') return;
    const now      = ctx.currentTime;
    const baseFreq = 1600 + Math.random() * 1200; // 1600–2800 Hz
    const dur      = 0.08 + Math.random() * 0.1;
    const numNotes = 2 + Math.floor(Math.random() * 4); // 2-5 notes per call

    for (let n = 0; n < numNotes; n++) {
      const osc  = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.type = 'sine';
      const t = now + n * (dur + 0.02);
      osc.frequency.setValueAtTime(baseFreq,          t);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.25, t + dur * 0.5);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.85, t + dur);

      oGain.gain.setValueAtTime(0,     t);
      oGain.gain.linearRampToValueAtTime(0.09, t + 0.015);
      oGain.gain.linearRampToValueAtTime(0,     t + dur);

      osc.connect(oGain);
      oGain.connect(state.masterGain);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    }

    // Random gap between bird calls: 0.6–4 s
    const nextDelay = 600 + Math.random() * 3400;
    setTimeout(chirp, nextDelay);
  }

  fadeIn(state.volume * 0.55, 2);
  setTimeout(chirp, 300);
  setTimeout(chirp, 1800);
  setTimeout(chirp, 3200);
}

/* NIGHT — cricket pulse + deep sub-bass ambience */
function playNightSound() {
  if (!state.audioCtx || !state.soundOn) return;
  stopSound(true);

  const ctx = state.audioCtx;

  // Deep night ambience: very low-pass filtered noise
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = createWhiteNoiseBuffer(ctx, 6);
  noiseSrc.loop   = true;

  const lp = ctx.createBiquadFilter();
  lp.type            = 'lowpass';
  lp.frequency.value = 200;

  const ambGain = ctx.createGain();
  ambGain.gain.value = 0.12;

  noiseSrc.connect(lp);
  lp.connect(ambGain);
  ambGain.connect(state.masterGain);
  noiseSrc.start();
  state.soundSource = noiseSrc;

  // Cricket pulse scheduler
  function cricket() {
    if (!state.soundOn || state.activeSound !== 'night') return;
    const now   = ctx.currentTime;
    const freq  = 3600 + Math.random() * 600; // 3600–4200 Hz
    const pulses = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < pulses; i++) {
      const osc  = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.type            = 'square';
      osc.frequency.value = freq;
      const t = now + i * 0.055;
      oGain.gain.setValueAtTime(0,     t);
      oGain.gain.linearRampToValueAtTime(0.04, t + 0.008);
      oGain.gain.linearRampToValueAtTime(0,     t + 0.045);
      osc.connect(oGain);
      oGain.connect(state.masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }

    const nextDelay = 400 + Math.random() * 1800;
    setTimeout(cricket, nextDelay);
  }

  fadeIn(state.volume * 0.45, 2);
  setTimeout(cricket, 200);
  setTimeout(cricket, 900);
  setTimeout(cricket, 2100);
}

// ============================================================
// WEATHER CODE → THEME (Open-Meteo WMO codes)
// ============================================================
function getThemeFromWMO(code, isNight) {
  if (code >= 95)                           return 'stormy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
  if (code >= 71 && code <= 77)             return 'snowy';
  if (code >= 45 && code <= 48)             return 'fog';
  if (code === 0)                            return isNight ? 'night' : 'sunny';
  if (code >= 1  && code <= 3)              return isNight ? 'night' : 'cloudy';
  return isNight ? 'night' : 'sunny';
}

function getIconFromWMO(code, isNight) {
  if (isNight)                              return '🌙';
  if (code === 0)                           return '☀️';
  if (code === 1 || code === 2)             return '⛅';
  if (code === 3)                           return '☁️';
  if (code >= 45 && code <= 48)             return '🌫️';
  if (code >= 51 && code <= 67)             return '🌧️';
  if (code >= 71 && code <= 77)             return '❄️';
  if (code >= 80 && code <= 99)             return '⛈️';
  return '☀️';
}

/* Sound mapping
   stormy/rainy → rain drops ambience
   night        → cricket ambience (unless stormy/rainy)
   cloudy/snowy/fog → wind breeze
   sunny        → birds + light ambience
*/
function getSoundForTheme(theme, isNight) {
  if (theme === 'stormy' || theme === 'rainy') return 'rain';
  if (isNight)                                  return 'night';
  switch (theme) {
    case 'cloudy':
    case 'snowy':
    case 'fog':   return 'wind';
    case 'sunny':
    default:      return 'birds';
  }
}

function getIconForTheme(theme) {
  switch(theme) {
    case 'rainy':  return WEATHER_ICONS.rainy;
    case 'stormy': return WEATHER_ICONS.stormy;
    case 'windy':  return WEATHER_ICONS.windy;
    case 'night':  return WEATHER_ICONS.night;
    case 'cloudy': return WEATHER_ICONS.cloudy;
    case 'snowy':  return WEATHER_ICONS.snowy;
    case 'fog':    return WEATHER_ICONS.fog;
    default:       return WEATHER_ICONS.sunny;
  }
}

// ============================================================
// APPLY WEATHER THEME
// ============================================================
function applyTheme(theme, isNight) {
  const body = document.getElementById('app-body');
  if (body) body.className = `weather-${theme}`;

  // Rain particles — only for rainy / stormy
  const rainLayer = document.getElementById('rain-layer');
  if (theme === 'rainy') {
    initRain('normal');
  } else if (theme === 'stormy') {
    initRain('heavy');
  } else {
    if (rainLayer) rainLayer.innerHTML = '';
  }

  // Animated weather icon
  const iconEl = document.getElementById('weather-icon-animated');
  if (iconEl) {
    iconEl.style.opacity = '0';
    setTimeout(() => {
      iconEl.innerHTML  = getIconForTheme(theme);
      iconEl.style.transition = 'opacity 0.6s';
      iconEl.style.opacity = '1';
    }, 300);
  }

  // ── Sound switch ──────────────────────────────────────────
  const newSound = getSoundForTheme(theme, isNight);

  if (newSound !== state.activeSound) {
    // Sound type has changed: hard-stop the previous sound immediately so it
    // cannot bleed into the new one, then start the correct sound.
    stopSound(true);           // zeroes gain, clears state.soundSource & activeSound
    state.activeSound = newSound;
    if (state.soundOn && state.soundReady) {
      playSoundForTheme(newSound);
    }
  }
  // If newSound === state.activeSound the current sound is already correct;
  // leave it running undisturbed (no restart click, no gap).

  state.currentTheme = theme;
  state.isNight      = isNight;
}

function playSoundForTheme(sound) {
  switch(sound) {
    case 'rain':  playRainSound();  break;
    case 'wind':  playWindSound();  break;
    case 'night': playNightSound(); break;
    case 'birds': playBirdsSound(); break;
    default:      playBirdsSound(); break;   // safe fallback
  }
}

// ============================================================
// FETCH WITH RETRY
// ============================================================
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
}


// ============================================================
// REVERSE GEOCODING — Nominatim (village-level accuracy)
// ============================================================
async function getCityName(lat, lon) {
  try {
    // zoom=10 gives locality / village level resolution.
    // Accept-Language header ensures English place names.
    const url  = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = await res.json();
    const addr = data.address || {};

    // Priority: city → town → village → county → fallback
    const name =
      addr.city    ||
      addr.town    ||
      addr.village ||
      addr.county  ||
      'Unknown';

    const country = (addr.country_code || '').toUpperCase();
    return { name, country };
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
    return { name: 'Unknown', country: '' };
  }
}

// ============================================================
// WEATHER DATA — Open-Meteo only
// ============================================================
async function fetchWeatherByCoords(lat, lon) {
  showLoading();
  state.lat = lat;
  state.lon = lon;
  state.retryCount = 0;

  try {
    const url = [
      `${METEO_BASE}/forecast`,
      `?latitude=${lat}&longitude=${lon}`,
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m`,
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m`,
      `&daily=weather_code,temperature_2m_min,temperature_2m_max,sunrise,sunset,precipitation_probability_max`,
      `&timezone=auto`,
      `&forecast_days=7`,
    ].join('');

    const data = await fetchWithRetry(url, {}, 3, 1000);

    const cur    = data.current;
    const hourly = data.hourly;
    const daily  = data.daily;

    // Find nearest hourly index to current time
    const nowMs = new Date(cur.time).getTime();
    let idx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (Math.abs(new Date(hourly.time[i]).getTime() - nowMs) <
          Math.abs(new Date(hourly.time[idx]).getTime() - nowMs)) idx = i;
    }

    // Today sunrise / sunset as unix seconds
    const todaySunrise = new Date(daily.sunrise[0]).getTime() / 1000;
    const todaySunset  = new Date(daily.sunset[0]).getTime()  / 1000;
    const nowSec       = nowMs / 1000;
    const isNight      = nowSec < todaySunrise || nowSec > todaySunset;

    const weather = {
      name:     state.currentCity || '',
      country:  '',
      temp:     cur.temperature_2m,
      feelsLike:cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      windSpeed:cur.wind_speed_10m,
      code:     cur.weather_code,
      sunrise:  todaySunrise,
      sunset:   todaySunset,
      dt:       nowSec,
      isNight,
    };

    // Reverse-geocode using Nominatim (if city not already set)
    if (!weather.name) {
      const rgResult  = await getCityName(lat, lon);
      weather.name    = rgResult.name;
      weather.country = rgResult.country;
    }

    // Build hourly forecast items (next 8 hours)
    const hourlyItems = [];
    for (let i = idx; i < Math.min(idx + 8, hourly.time.length); i++) {
      hourlyItems.push({
        dt:   new Date(hourly.time[i]).getTime() / 1000,
        temp: hourly.temperature_2m[i],
        code: hourly.weather_code[i],
        precProb: hourly.precipitation_probability[i],
      });
    }

    // Build daily forecast
    const dailyItems = [];
    for (let i = 0; i < daily.time.length; i++) {
      dailyItems.push({
        dt:   new Date(daily.time[i]).getTime() / 1000,
        high: daily.temperature_2m_max[i],
        low:  daily.temperature_2m_min[i],
        code: daily.weather_code[i],
      });
    }

    state.weather     = weather;
    state.forecast    = { hourly: hourlyItems, daily: dailyItems };
    // Store full raw hourly arrays so renderWeather can always resolve
    // the exact current-hour weather code (not just the API "current" snapshot).
    state.hourlyRaw   = hourly;
    state.currentCity = weather.name;

    renderWeather();
    scheduleRefresh();
  } catch (e) {
    console.error('Weather fetch error:', e);
    showError('Failed to load weather data. Please try again.');
  }
}

async function fetchWeatherByCity(city) {
  showLoading();
  try {
    // Use Open-Meteo geocoding API
    const geoUrl  = `${GEO_BASE}/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoData = await fetchWithRetry(geoUrl, {}, 3, 1000);

    if (!geoData.results || !geoData.results.length) throw new Error('City not found');

    const r = geoData.results[0];
    state.currentCity = r.name + (r.country_code ? `, ${r.country_code}` : '');
    await fetchWeatherByCoords(r.latitude, r.longitude);
    // Override the reverse-geocoded name with the cleaner search result name
    if (state.weather) {
      state.weather.name    = r.name;
      state.weather.country = r.country_code || '';
      const cityNameEl = document.getElementById('city-name');
      if (cityNameEl) cityNameEl.textContent = `${r.name}${r.country_code ? ', ' + r.country_code : ''}`;
    }
  } catch (e) {
    showError(e.message || 'City not found');
  }
}

// ============================================================
// RENDER WEATHER
// ============================================================
function renderWeather() {
  const d = state.weather;
  if (!d) return;

  const isC   = state.unit === 'C';
  const temp  = isC ? Math.round(d.temp)     : Math.round(d.temp     * 9/5 + 32);
  const feels = isC ? Math.round(d.feelsLike): Math.round(d.feelsLike* 9/5 + 32);
  const unit  = isC ? '°C' : '°F';

  // ── Resolve current-hour weather code from hourly data ─────────────────────
  // IMPORTANT: Open-Meteo returns hourly times in the location's LOCAL timezone
  // (because we request timezone=auto).  Using .toISOString() would convert to
  // UTC first and give the wrong hour for non-UTC zones (e.g. IST = UTC+5:30).
  // Solution: compare JS Date .getHours() values on both sides — no UTC involved.
  let activeCode = d.code;   // safe fallback: API current observation
  if (state.hourlyRaw && state.hourlyRaw.time && state.hourlyRaw.weather_code) {
    const currentHour = new Date().getHours();   // local clock hour (0-23)
    // findIndex scans forward; the first entry whose parsed local hour matches
    // the current local hour is the correct bucket for today's active weather.
    const matchIdx = state.hourlyRaw.time.findIndex(
      t => new Date(t).getHours() === currentHour
    );
    if (matchIdx !== -1) {
      activeCode = state.hourlyRaw.weather_code[matchIdx];
    }
  }

  applyTheme(getThemeFromWMO(activeCode, d.isNight), d.isNight);

  const cityNameEl = document.getElementById('city-name');
  if (cityNameEl) cityNameEl.textContent = d.country ? `${d.name}, ${d.country}` : d.name;

  updateDateTime();
  animateNumber('temp-value', temp);

  const tempUnitDisplay = document.getElementById('temp-unit-display');
  if (tempUnitDisplay) tempUnitDisplay.textContent = unit;

  // Condition description — use the same hourly-resolved code as the theme
  let desc = '';
  const code = activeCode;
  if      (code === 0)                       desc = d.isNight ? 'Clear Night' : 'Clear Sky';
  else if (code === 1 || code === 2)         desc = 'Partly Cloudy';
  else if (code === 3)                       desc = 'Overcast';
  else if (code >= 45 && code <= 48)         desc = 'Foggy';
  else if (code >= 51 && code <= 55)         desc = 'Drizzle';
  else if (code >= 56 && code <= 57)         desc = 'Freezing Drizzle';
  else if (code >= 61 && code <= 67)         desc = 'Rain';
  else if (code >= 71 && code <= 77)         desc = 'Snow';
  else if (code >= 80 && code <= 82)         desc = 'Rain Showers';
  else if (code >= 95 && code <= 99)         desc = 'Thunderstorm';
  else                                       desc = 'Unknown';

  const conditionText = document.getElementById('condition-text');
  if (conditionText) conditionText.textContent = desc;

  const feelsLikeEl = document.getElementById('feels-like');
  if (feelsLikeEl) feelsLikeEl.textContent = `Feels like ${feels}${unit}`;

  const humidityEl = document.getElementById('detail-humidity');
  if (humidityEl) humidityEl.textContent = `${d.humidity}%`;

  const windEl = document.getElementById('detail-wind');
  if (windEl) windEl.textContent = `${Math.round(d.windSpeed)} km/h`;

  const sunriseEl = document.getElementById('detail-sunrise');
  if (sunriseEl) sunriseEl.textContent = formatTime(d.sunrise);

  const sunsetEl = document.getElementById('detail-sunset');
  if (sunsetEl) sunsetEl.textContent = formatTime(d.sunset);

  renderHourlyForecast();
  renderWeeklyForecast();
  showContent();
}

// ============================================================
// HOURLY FORECAST
// ============================================================
function renderHourlyForecast() {
  if (!state.forecast || !state.forecast.hourly) return;
  const container = document.getElementById('hourly-scroll');
  if (!container) return;
  const isC = state.unit === 'C';

  container.innerHTML = state.forecast.hourly.map(item => {
    const t     = isC ? Math.round(item.temp) : Math.round(item.temp * 9/5 + 32);
    const label = new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const icon  = getIconFromWMO(item.code, false);
    return `
      <div class="forecast-card glass-card">
        <div class="forecast-time">${label}</div>
        <div class="forecast-icon">${icon}</div>
        <div class="forecast-temp">${t}°</div>
      </div>`;
  }).join('');
}

// ============================================================
// WEEKLY FORECAST
// ============================================================
function renderWeeklyForecast() {
  if (!state.forecast || !state.forecast.daily) return;
  const container = document.getElementById('weekly-scroll');
  if (!container) return;
  const isC  = state.unit === 'C';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  container.innerHTML = state.forecast.daily.map((item, idx) => {
    let high = item.high;
    let low  = item.low;
    if (!isC) { high = high * 9/5 + 32; low = low * 9/5 + 32; }
    const icon = getIconFromWMO(item.code, false);
    const day  = idx === 0 ? 'Today' : days[new Date(item.dt * 1000).getDay()];
    return `
      <div class="weekly-card glass-card">
        <div class="weekly-day">${day}</div>
        <div class="weekly-icon">${icon}</div>
        <div class="weekly-range">
          <span class="weekly-high">${Math.round(high)}°</span>
          <span class="weekly-low">${Math.round(low)}°</span>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// HELPERS
// ============================================================
function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start  = parseInt(el.textContent) || 0;
  const diff = target - start;
  const dur  = 600;
  const s    = performance.now();
  function step(now) {
    const p    = Math.min((now - s) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + diff * ease);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function formatTime(unix) {
  const date = new Date(unix * 1000);
  return date.toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
}

function updateDateTime() {
  const now    = new Date();
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateEl = document.getElementById('current-date');
  const timeEl = document.getElementById('current-time');
  if (dateEl) dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  if (timeEl) timeEl.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

// ============================================================
// UI STATE HELPERS
// ============================================================
function showLoading() {
  const skeleton = document.getElementById('loading-skeleton');
  const content  = document.getElementById('weather-content');
  const error    = document.getElementById('error-state');
  if (skeleton) skeleton.style.display = 'flex';
  if (content)  content.style.display  = 'none';
  if (error)    error.style.display    = 'none';
}

function showContent() {
  const skeleton = document.getElementById('loading-skeleton');
  const content  = document.getElementById('weather-content');
  const error    = document.getElementById('error-state');
  if (skeleton) skeleton.style.display = 'none';
  if (content)  content.style.display  = 'block';
  if (error)    error.style.display    = 'none';
}

function showError(msg) {
  const skeleton = document.getElementById('loading-skeleton');
  const content  = document.getElementById('weather-content');
  const error    = document.getElementById('error-state');
  const errorMsg = document.getElementById('error-msg');
  if (skeleton) skeleton.style.display = 'none';
  if (content)  content.style.display  = 'none';
  if (error)    error.style.display    = 'block';
  if (errorMsg) errorMsg.textContent   = msg;
}

function retryFetch() {
  if (state.lat && state.lon) fetchWeatherByCoords(state.lat, state.lon);
  else detectLocation();
}

// ============================================================
// SOUND CONTROLS
// ============================================================
function toggleSound() {
  initAudio();
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  state.soundOn = !state.soundOn;
  const soundOnIcon  = document.getElementById('sound-icon-on');
  const soundOffIcon = document.getElementById('sound-icon-off');
  if (soundOnIcon)  soundOnIcon.style.display  = state.soundOn ? 'block' : 'none';
  if (soundOffIcon) soundOffIcon.style.display = state.soundOn ? 'none'  : 'block';

  if (state.soundOn) {
    // Re-determine correct sound for current theme and play it
    const theme   = state.currentTheme || 'sunny';
    const isNight = state.isNight;
    const sound   = getSoundForTheme(theme, isNight);
    stopSound(true);           // ensure clean state
    state.activeSound = sound;
    playSoundForTheme(sound);
  } else {
    stopSound(false);          // gentle fade-out
  }
}

function setVolume(val) {
  state.volume = val / 100;
  if (state.masterGain && state.audioCtx && state.soundOn) {
    const now = state.audioCtx.currentTime;
    state.masterGain.gain.cancelScheduledValues(now);
    state.masterGain.gain.setTargetAtTime(state.volume, now, 0.1);
  }
}

// ============================================================
// UNIT TOGGLE
// ============================================================
function setUnit(unit) {
  state.unit = unit;
  const btnC = document.getElementById('btn-celsius');
  const btnF = document.getElementById('btn-fahrenheit');
  if (btnC) btnC.classList.toggle('active', unit === 'C');
  if (btnF) btnF.classList.toggle('active', unit === 'F');
  if (state.weather) renderWeather();
}

// ============================================================
// LOCATION DETECTION
// ============================================================
function detectLocation() {
  if (!navigator.geolocation) {
    fetchWeatherByCity('Delhi');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.currentCity = '';
      fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      console.warn('Geolocation error:', err);
      fetchWeatherByCity('Delhi');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ============================================================
// SEARCH (Open-Meteo geocoding)
// ============================================================
let searchDebounce = null;

function handleSearch(val) {
  clearTimeout(searchDebounce);
  if (!val.trim()) { hideDropdown(); return; }
  searchDebounce = setTimeout(() => suggestCities(val), 400);
}

async function suggestCities(query) {
  try {
    const url  = `${GEO_BASE}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const data = await fetch(url).then(r => r.json());
    renderDropdown(data.results || []);
  } catch(e) {
    hideDropdown();
  }
}

function renderDropdown(cities) {
  const dd = document.getElementById('autocomplete-dropdown');
  if (!dd) return;
  if (!cities.length) { hideDropdown(); return; }
  dd.innerHTML = cities.map(c => {
    const label = [c.name, c.admin1, c.country_code].filter(Boolean).join(', ');
    const safe  = label.replace(/'/g, "&#39;");
    return `
      <div class="autocomplete-item" onclick="selectCity('${safe}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        ${label}
      </div>`;
  }).join('');
  dd.classList.add('visible');
}

function selectCity(city) {
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = city;
  hideDropdown();
  state.currentCity = city.split(',')[0].trim();
  fetchWeatherByCity(state.currentCity);
}

function hideDropdown() {
  const dd = document.getElementById('autocomplete-dropdown');
  if (dd) dd.classList.remove('visible');
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) { hideDropdown(); fetchWeatherByCity(val); }
  }
  if (e.key === 'Escape') hideDropdown();
}

// ============================================================
// AUTO REFRESH
// ============================================================
function scheduleRefresh() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    if (state.lat && state.lon) fetchWeatherByCoords(state.lat, state.lon);
  }, 10 * 60 * 1000);
}

// ============================================================
// PARTICLE SYSTEMS
// ============================================================
function initStars() {
  const layer = document.getElementById('stars-layer');
  if (!layer || layer.children.length > 0) return;
  for (let i = 0; i < 90; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.8;
    star.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random()*100}%;top:${Math.random()*65}%;
      --twinkle-dur:${2+Math.random()*4}s;
      --twinkle-del:${Math.random()*4}s;
    `;
    layer.appendChild(star);
  }
}

function initFireflies() {
  const layer = document.getElementById('fireflies-layer');
  if (!layer || layer.children.length > 0) return;
  for (let i = 0; i < 18; i++) {
    const ff = document.createElement('div');
    ff.className = 'firefly';
    ff.style.cssText = `
      left:${10+Math.random()*80}%;top:${50+Math.random()*35}%;
      --ff-dur:${4+Math.random()*6}s;--ff-del:${Math.random()*6}s;
      --ff-x:${(Math.random()-0.5)*100}px;--ff-y:${-20-Math.random()*60}px;
    `;
    layer.appendChild(ff);
  }
}

function initRain(intensity = 'normal') {
  const layer = document.getElementById('rain-layer');
  if (!layer) return;
  layer.innerHTML = '';
  let count = 120;
  if (intensity === 'light') count = 50;
  if (intensity === 'heavy') count = 220;
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'raindrop';
    const h = 10 + Math.random() * 20;
    drop.style.cssText = `
      left:${Math.random()*100}%;height:${h}px;
      --rd-dur:${0.4+Math.random()*0.6}s;
      --rd-del:${-Math.random()*2}s;
      --rd-drift:${Math.random()*30+10}px;
      opacity:${0.4+Math.random()*0.5};
    `;
    layer.appendChild(drop);
  }
}

function initWindParticles() {
  const layer = document.getElementById('wind-particles');
  if (!layer || layer.children.length > 0) return;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'wind-particle';
    const w = 3 + Math.random() * 8;
    const h = 1.5 + Math.random() * 3;
    p.style.cssText = `
      width:${w}px;height:${h}px;
      left:-60px;top:${Math.random()*85}%;
      --wp-dur:${1.5+Math.random()*3}s;
      --wp-del:${-Math.random()*4}s;
      --wp-y:${(Math.random()-0.5)*80}px;
    `;
    layer.appendChild(p);
  }
}

function triggerLightning() {
  const l = document.getElementById('lightning');
  if (!l) return;
  function flash() {
    const body = document.getElementById('app-body');
    if (!body) return;
    if (!body.className.includes('rainy') && !body.className.includes('stormy')) {
      setTimeout(flash, 8000 + Math.random() * 20000); return;
    }
    l.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.7);pointer-events:none;opacity:1;transition:opacity 0.08s';
    setTimeout(() => {
      l.style.opacity = '0';
      setTimeout(() => {
        l.style.opacity = '0.4';
        setTimeout(() => { l.style.opacity = '0'; }, 80);
      }, 80);
    }, 80);
    setTimeout(flash, 8000 + Math.random() * 20000);
  }
  setTimeout(flash, 5000 + Math.random() * 15000);
}

function startClock() {
  setInterval(updateDateTime, 30000);
}

// ============================================================
// ABOUT MODAL
// ============================================================
function openAbout() {
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.classList.add('visible');
}

function closeAbout() {
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function closeAboutOutside(event) {
  const modal = document.getElementById('about-modal');
  if (modal && !modal.contains(event.target)) closeAbout();
}

// ============================================================
// INIT
// ============================================================
function init() {
  initStars();
  initFireflies();
  initWindParticles();
  triggerLightning();
  startClock();
  updateDateTime();

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-section')) hideDropdown();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAbout();
  });

  detectLocation();
}

document.addEventListener('DOMContentLoaded', init);
