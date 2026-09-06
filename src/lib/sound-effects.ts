/**
 * Sistema de Efeitos Sonoros Profissional para o DUTCH (Powered by Howler.js)
 * - Amostras reais de estúdio de alta fidelidade (Foley de cartas, feltro de cassino e mesa de madeira)
 * - Múltiplas variações orgânicas por ação (evita efeito monótono repetitivo)
 * - Micro-variações de pitch/rate dinâmicas a cada toque
 * - Baixíssima latência via Web Audio pooling da Howler.js
 * - Suporte universal a navegadores (fallback duplo MP3 + OGG)
 */

import { Howl, Howler } from "howler";

// ── Configurações de Volume e Mudo ──

export function getSfxVolume(): number {
  if (typeof window === "undefined") return 0.8;
  const v = localStorage.getItem("dutch_sfx_volume");
  return v !== null ? parseFloat(v) : 0.8;
}

export function setSfxVolume(vol: number): void {
  if (typeof window === "undefined") return;
  const clamped = Math.max(0, Math.min(1, vol));
  localStorage.setItem("dutch_sfx_volume", clamped.toString());
  Howler.volume(clamped);
}

export function isSfxMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("dutch_sfx_muted") === "true";
}

export function setSfxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dutch_sfx_muted", muted ? "true" : "false");
  Howler.mute(muted);
}

export function toggleSfxMuted(): boolean {
  const next = !isSfxMuted();
  setSfxMuted(next);
  return next;
}

// Inicialização segura no cliente
if (typeof window !== "undefined") {
  try {
    Howler.volume(getSfxVolume());
    Howler.mute(isSfxMuted());
  } catch (err) {
    console.warn("Howler init warning:", err);
  }
}

// ── Cache de Instâncias Howl (Lazy Loaded para SSR Seguro) ──

function createHowl(baseName: string, defaultVol = 1.0): Howl | null {
  if (typeof window === "undefined") return null;
  return new Howl({
    src: [`/sounds/${baseName}.mp3`, `/sounds/${baseName}.ogg`],
    volume: defaultVol,
    preload: true,
    html5: false, // usa Web Audio API para disparos instantâneos e simultâneos
  });
}

// Conjuntos de variações orgânicas
let cardSlideSounds: Howl[] | null = null;
let cardPlaceSounds: Howl[] | null = null;
let cardFlipSound: Howl | null = null;
let snapSuccessSound: Howl | null = null;
let snapFailSound: Howl | null = null;
let tableSlamSound: Howl | null = null;
let dutchBellSound: Howl | null = null;
let yourTurnSound: Howl | null = null;
let timerTickSound: Howl | null = null;
let specialPowerSound: Howl | null = null;
let roundWinSound: Howl | null = null;

function getCardSlideSounds(): Howl[] {
  if (!cardSlideSounds) {
    cardSlideSounds = [
      createHowl("card-slide-1", 0.95),
      createHowl("card-slide-2", 0.95),
      createHowl("card-slide-3", 0.95),
    ].filter(Boolean) as Howl[];
  }
  return cardSlideSounds;
}

function getCardPlaceSounds(): Howl[] {
  if (!cardPlaceSounds) {
    cardPlaceSounds = [
      createHowl("card-place-1", 0.9),
      createHowl("card-place-2", 0.9),
      createHowl("card-place-3", 0.9),
    ].filter(Boolean) as Howl[];
  }
  return cardPlaceSounds;
}

// ── Efeitos Sonoros Principais ──

/**
 * 1. Puxar carta do monte (Card Draw)
 * Som autêntico de fricção de papel e feltro, com variação sutil de timbre.
 */
export function playCardDraw(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  const list = getCardSlideSounds();
  if (!list.length) return;
  const sound = list[Math.floor(Math.random() * list.length)];
  const id = sound.play();
  sound.rate(0.95 + Math.random() * 0.1, id);
}

/**
 * 2. Colocar carta na mesa / trocar carta (Card Place)
 */
export function playCardPlace(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  const list = getCardPlaceSounds();
  if (!list.length) return;
  const sound = list[Math.floor(Math.random() * list.length)];
  const id = sound.play();
  sound.rate(0.96 + Math.random() * 0.08, id);
}

/**
 * 3. Virar carta / espiar (Card Flip / Peek)
 */
export function playCardFlip(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!cardFlipSound) cardFlipSound = createHowl("card-flip", 0.85);
  if (cardFlipSound) {
    const id = cardFlipSound.play();
    cardFlipSound.rate(0.95 + Math.random() * 0.1, id);
  }
}

/**
 * 4. Descarte comum (Card Discard)
 */
export function playCardDiscard(): void {
  playCardPlace();
}

/**
 * 5. Acerto no Descarte Igual (Snap!)
 * Estalo rápido, brilhante e gratificante.
 */
export function playMatchSuccess(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!snapSuccessSound) snapSuccessSound = createHowl("snap-success", 1.0);
  if (snapSuccessSound) {
    const id = snapSuccessSound.play();
    snapSuccessSound.rate(1.0 + Math.random() * 0.08, id);
  }
}

/**
 * 6. Erro no Descarte Igual (Snap Fail)
 * Impacto opaco / abafado de erro de penalidade.
 */
export function playMatchFail(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!snapFailSound) snapFailSound = createHowl("snap-fail", 0.9);
  if (snapFailSound) {
    snapFailSound.play();
  }
}

/**
 * 7. Bater na Mesa / Chamar DUTCH (Dutch Call!)
 * Pancada pesada na madeira da mesa acompanhada pelo sino de alerta de cassino.
 */
export function playDutchCall(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!tableSlamSound) tableSlamSound = createHowl("table-slam", 1.0);
  if (!dutchBellSound) dutchBellSound = createHowl("dutch-bell", 0.85);

  if (tableSlamSound) tableSlamSound.play();
  setTimeout(() => {
    if (dutchBellSound) dutchBellSound.play();
  }, 70);
}

/**
 * 8. Notificação de "Sua Vez!"
 * Sinal sonoro discreto e agradável de cassino para alertar a vez do jogador.
 */
export function playYourTurn(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!yourTurnSound) yourTurnSound = createHowl("your-turn", 0.8);
  if (yourTurnSound) {
    yourTurnSound.play();
  }
}

/**
 * 9. Cronômetro correndo (Timer Tick)
 * Clique tátil de ficha de poker nos segundos finais.
 */
export function playTimerTick(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!timerTickSound) timerTickSound = createHowl("timer-tick", 0.4);
  if (timerTickSound) {
    const id = timerTickSound.play();
    timerTickSound.rate(0.98 + Math.random() * 0.04, id);
  }
}

/**
 * 10. Efeito Especial da Dama ou Valete (Special Ability)
 * Efeito elegante de leque de cartas / flourish comemorativo.
 */
export function playSpecialPower(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!specialPowerSound) specialPowerSound = createHowl("special-power", 0.9);
  if (specialPowerSound) {
    specialPowerSound.play();
  }
}

/**
 * 11. Fanfarra de Vitória da Rodada (Round Win Fanfare)
 * Jingle acústico triunfante e festivo.
 */
export function playRoundWin(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!roundWinSound) roundWinSound = createHowl("round-win", 0.9);
  if (roundWinSound) {
    roundWinSound.play();
  }
}

/**
 * 12. Toque de Botão (Button Tap)
 */
export function playButtonTap(): void {
  if (typeof window === "undefined" || isSfxMuted()) return;
  if (!yourTurnSound) yourTurnSound = createHowl("your-turn", 0.4);
  if (yourTurnSound) {
    const id = yourTurnSound.play();
    yourTurnSound.rate(1.3, id);
  }
}
