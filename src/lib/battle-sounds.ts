/**
 * Lightweight synth SFX for battle replay (no external assets).
 * Safe to call from client components only.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export async function ensureBattleAudio(): Promise<void> {
  const c = getCtx();
  if (c?.state === "suspended") {
    await c.resume().catch(() => {});
  }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
  freqEnd?: number,
) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peakGain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.04);
}

export async function playMatchIntro(): Promise<void> {
  await ensureBattleAudio();
  tone(330, 0.07, "square", 0.035, 520);
}

export type BattleHitSound = "normal" | "crit" | "super" | "ko";

export async function playBattleHit(kind: BattleHitSound): Promise<void> {
  await ensureBattleAudio();
  if (kind === "ko") {
    tone(200, 0.32, "sawtooth", 0.065, 45);
    return;
  }
  if (kind === "crit") {
    tone(880, 0.05, "square", 0.05);
    window.setTimeout(() => tone(1200, 0.07, "square", 0.04), 70);
    return;
  }
  if (kind === "super") {
    tone(480, 0.11, "triangle", 0.055, 720);
    return;
  }
  tone(360, 0.08, "triangle", 0.045, 200);
}

export async function playBattleFinish(result: "win" | "lose" | "draw"): Promise<void> {
  await ensureBattleAudio();
  if (result === "win") {
    tone(523, 0.11, "square", 0.055);
    window.setTimeout(() => tone(659, 0.11, "square", 0.055), 95);
    window.setTimeout(() => tone(784, 0.22, "square", 0.06), 190);
  } else if (result === "lose") {
    tone(220, 0.28, "sawtooth", 0.055, 70);
  } else {
    tone(392, 0.14, "triangle", 0.045);
    window.setTimeout(() => tone(330, 0.16, "triangle", 0.04), 150);
  }
}
