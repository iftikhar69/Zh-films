"use client";

import { useCallback, useRef } from "react";
import { useCinemaStore } from "@/stores/cinema-store";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctx();
}

export function useSoundscape() {
  const soundEnabled = useCinemaStore((s) => s.soundEnabled);
  const ctxRef = useRef<AudioContext | null>(null);
  const humRef = useRef<{ stop: () => void } | null>(null);

  const ensureCtx = useCallback(() => {
    if (!soundEnabled) return null;
    if (!ctxRef.current) ctxRef.current = getCtx();
    void ctxRef.current?.resume();
    return ctxRef.current;
  }, [soundEnabled]);

  const shutter = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.09);
  }, [ensureCtx]);

  const filmWind = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    noise.buffer = buffer;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.4);
    g.gain.linearRampToValueAtTime(0, t + 2.2);
    noise.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 2.3);
  }, [ensureCtx]);

  const pianoSwell = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const freqs = [261.63, 329.63, 392.0];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.12, t + 1.2);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    master.connect(ctx.destination);
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.25 - i * 0.05;
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 3.3);
    });
  }, [ensureCtx]);

  const projectorHumOn = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    if (humRef.current) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(57, t);
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.22, t);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(3.5, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.6);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    lfo.start(t);
    humRef.current = {
      stop: () => {
        try {
          const now = ctx.currentTime;
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
          osc.stop(now + 0.28);
          lfo.stop(now + 0.28);
        } catch {}
        humRef.current = null;
      }
    };
  }, [ensureCtx]);

  const projectorHumOff = useCallback(() => {
    humRef.current?.stop();
    humRef.current = null;
  }, []);

  const applause = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.18, t + 0.08);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    master.connect(ctx.destination);

    for (let i = 0; i < 8; i++) {
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200 + i * 180;
      bp.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0.12;
      noise.connect(bp);
      bp.connect(g);
      g.connect(master);
      const start = t + i * 0.05;
      noise.start(start);
      noise.stop(start + 0.06);
    }
  }, [ensureCtx]);

  return { shutter, filmWind, pianoSwell, projectorHumOn, projectorHumOff, applause };
}
