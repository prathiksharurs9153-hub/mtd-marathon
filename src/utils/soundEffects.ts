// Subtle, high-performance Web Audio API sound synthesis
// Requires zero external sound assets or network calls, works completely offline.

class SoundEffectsManager {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quiz_sound_enabled");
      this.enabled = stored !== null ? stored === "true" : true;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("quiz_sound_enabled", String(enabled));
    }
  }

  public toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    if (next) {
      // Give a tiny audio feedback confirming sound is unmuted
      this.playTick(5);
    }
    return next;
  }

  /**
   * Countdown tick sound during the last five seconds of a question.
   * Subtle, crisp wooden/clock acoustic tick with escalating pitch for 5, 4, 3, 2, 1s.
   */
  public playCountdownTick(secondsRemaining: number) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Frequency rises subtly as urgency increases: 5s=580Hz -> 1s=920Hz
      const pitchMap: Record<number, number> = {
        5: 580,
        4: 640,
        3: 710,
        2: 800,
        1: 920,
      };
      const freq = pitchMap[secondsRemaining] || 650;
      const isFinalSecond = secondsRemaining === 1;

      // Primary oscillator: clean sine
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Add a subtle snappy pitch drop to sound like a physical clock escapement
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.035);

      // Volume envelope: soft, subtle attack and fast decay (35ms duration)
      const initialVol = isFinalSecond ? 0.09 : 0.06;
      gain.gain.setValueAtTime(initialVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isFinalSecond ? 0.05 : 0.035));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Silently catch audio policy blocks
    }
  }

  /**
   * Subtle audio feedback for a correct answer:
   * Elegant, soft double chime (harmonious major interval: E5 -> A5 with gentle shimmer).
   */
  public playCorrectSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // First bell note: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.07, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second bell note: A5 (880 Hz) - slightly delayed by 75ms
      const note2Start = now + 0.075;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, note2Start);
      gain2.gain.setValueAtTime(0.08, note2Start);
      gain2.gain.exponentialRampToValueAtTime(0.0001, note2Start + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(note2Start);
      osc2.stop(note2Start + 0.38);

      // Subtle high shimmer harmonic: C#6 (1108.73 Hz) - delayed by 140ms
      const note3Start = now + 0.14;
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1108.73, note3Start);
      gain3.gain.setValueAtTime(0.04, note3Start);
      gain3.gain.exponentialRampToValueAtTime(0.0001, note3Start + 0.32);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(note3Start);
      osc3.stop(note3Start + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Subtle audio feedback for an incorrect answer:
   * Gentle, soft low two-tone cue (descending minor step: 340Hz -> 250Hz).
   * Not harsh or abrasive, completely calm and informative.
   */
  public playIncorrectSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Tone 1: 340 Hz (soft triangle wave for warm, rounded body)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(340, now);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Tone 2: 250 Hz - slightly lower, delayed by 90ms
      const tone2Start = now + 0.09;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(250, tone2Start);
      gain2.gain.setValueAtTime(0.065, tone2Start);
      gain2.gain.exponentialRampToValueAtTime(0.0001, tone2Start + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(tone2Start);
      osc2.stop(tone2Start + 0.25);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Subtle mechanical lock click sound when student commits an answer
   */
  public playLockSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  /**
   * Subtle alert when time expires
   */
  public playTimeExpiredSound() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playTick(pitchMultiplier: number = 1) {
    this.playCountdownTick(pitchMultiplier);
  }
}

export const soundEffects = new SoundEffectsManager();
