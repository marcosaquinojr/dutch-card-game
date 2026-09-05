/**
 * Sistema de Efeitos Sonoros para o DUTCH (Web Audio API)
 * Totalmente sintetizado via Web Audio API:
 * - 0 arquivos externos ou downloads pesados
 * - Baixíssima latência (instantâneo)
 * - Funciona em qualquer navegador moderno (desktop e mobile)
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ── Configurações de Volume e Mudo ──

export function getSfxVolume(): number {
  if (typeof window === 'undefined') return 0.8;
  const v = localStorage.getItem('dutch_sfx_volume');
  return v !== null ? parseFloat(v) : 0.8;
}

export function setSfxVolume(vol: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dutch_sfx_volume', Math.max(0, Math.min(1, vol)).toString());
}

export function isSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dutch_sfx_muted') === 'true';
}

export function setSfxMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dutch_sfx_muted', muted ? 'true' : 'false');
}

export function toggleSfxMuted(): boolean {
  const next = !isSfxMuted();
  setSfxMuted(next);
  return next;
}

function createMasterGain(ctx: AudioContext): GainNode | null {
  if (isSfxMuted()) return null;
  const vol = getSfxVolume();
  if (vol <= 0.01) return null;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol * 0.7, ctx.currentTime);
  gain.connect(ctx.destination);
  return gain;
}

// ── Geradores de Ruído e Formas de Onda ──

function createNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ── Sons Procedurais do Jogo ──

/**
 * 1. Puxar carta do monte (Card Draw)
 * Som de atrito de papel deslizando suavemente.
 */
export function playCardDraw(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;
  const dur = 0.12;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, dur);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(3200, now + dur);
  filter.Q.setValueAtTime(2.5, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.6, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  noise.start(now);
  noise.stop(now + dur);
}

/**
 * 2. Espiar / Revelar Carta (Card Flip / Peek)
 * Som sutil de carta sendo levantada e virada.
 */
export function playCardFlip(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.3, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(oscGain);
  oscGain.connect(master);

  osc.start(now);
  osc.stop(now + 0.08);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2500, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.25, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  noise.start(now);
  noise.stop(now + 0.06);
}

/**
 * 3. Colocar / Trocar Carta na Mesa (Card Place / Swap)
 * Som de toque amortecido do feltro da mesa ("thup").
 */
export function playCardPlace(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.09);

  const tap = ctx.createBufferSource();
  tap.buffer = createNoiseBuffer(ctx, 0.02);
  const tapFilter = ctx.createBiquadFilter();
  tapFilter.type = 'bandpass';
  tapFilter.frequency.setValueAtTime(2200, now);

  const tapGain = ctx.createGain();
  tapGain.gain.setValueAtTime(0.4, now);
  tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

  tap.connect(tapFilter);
  tapFilter.connect(tapGain);
  tapGain.connect(master);

  tap.start(now);
  tap.stop(now + 0.02);
}

/**
 * 4. Descarte no Monte (Card Discard)
 * Som nítido de carta batendo no monte de descarte.
 */
export function playCardDiscard(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.1);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(1000, now + 0.1);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);

  noise.start(now);
  noise.stop(now + 0.1);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(oscGain);
  oscGain.connect(master);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * 5. Acerto no Descarte Igual (⚡ Match Snap Success)
 * Acorde brilhante em arpeggio ascendente (E5 -> G#5 -> B5 -> E6).
 */
export function playMatchSuccess(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;
  const notes = [659.25, 830.61, 987.77, 1318.51];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.05);

    const gain = ctx.createGain();
    const startTime = now + idx * 0.05;
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

    osc.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + 0.25);
  });
}

/**
 * 6. Erro no Descarte Igual (❌ Match Snap Penalty)
 * Tom grave de alerta / penalidade.
 */
export function playMatchFail(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(110, now + 0.22);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.22);
}

/**
 * 7. Bater na Mesa / Chamar DUTCH (🚩 Dutch Call!)
 * Batida dupla firme de punho na mesa de madeira + ressonância épica.
 */
export function playDutchCall(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;

  [0, 0.09].forEach((offset) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now + offset);
    osc.frequency.exponentialRampToValueAtTime(38, now + offset + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now + offset);
    osc.stop(now + offset + 0.12);
  });

  const gong = ctx.createOscillator();
  gong.type = 'sine';
  gong.frequency.setValueAtTime(440, now + 0.12);

  const gongGain = ctx.createGain();
  gongGain.gain.setValueAtTime(0.5, now + 0.12);
  gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

  gong.connect(gongGain);
  gongGain.connect(master);

  gong.start(now + 0.12);
  gong.stop(now + 1.4);
}

/**
 * 8. Notificação de Sua Vez (Your Turn Ping)
 * Duplo sino suave avisando que é sua vez de jogar.
 */
export function playYourTurn(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;
  const notes = [698.46, 880.0];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    const gain = ctx.createGain();
    const t = now + idx * 0.1;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.35);
  });
}

/**
 * 9. Contagem Regressiva do Turno (Timer Tick)
 * Tique-taque discreto de relógio nos últimos 5 segundos.
 */
export function playTimerTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1050, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.025);
}

/**
 * 10. Efeito Especial da Dama ou Valete (Special Ability)
 * Som místico brilhante de magia/habilidade.
 */
export function playSpecialPower(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5];

  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + idx * 0.04);
    osc.frequency.linearRampToValueAtTime(f * 1.2, now + idx * 0.04 + 0.2);

    const gain = ctx.createGain();
    const t = now + idx * 0.04;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.35);
  });
}

/**
 * 11. Fanfarra de Vitória da Rodada (Round Win Fanfare)
 * Acordes comemorativos triunfantes ao vencer.
 */
export function playRoundWin(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;
  const fanfare = [
    { f: 523.25, t: 0.0, d: 0.15 },
    { f: 659.25, t: 0.14, d: 0.15 },
    { f: 783.99, t: 0.28, d: 0.18 },
    { f: 1046.5, t: 0.44, d: 0.6 },
  ];

  fanfare.forEach((n) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, now + n.t);

    const gain = ctx.createGain();
    const st = now + n.t;
    gain.gain.setValueAtTime(0.001, st);
    gain.gain.linearRampToValueAtTime(0.45, st + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, st + n.d);

    osc.connect(gain);
    gain.connect(master);

    osc.start(st);
    osc.stop(st + n.d);
  });
}

/**
 * 12. Toque de Botão (Button Tap)
 */
export function playButtonTap(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const master = createMasterGain(ctx);
  if (!master) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.02);
}
