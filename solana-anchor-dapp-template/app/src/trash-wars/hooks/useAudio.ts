'use client';

import { useRef, useCallback } from 'react';

export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSweep = useCallback((startFreq: number, endFreq: number, type: OscillatorType, duration: number, volume: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playNoise = useCallback((duration: number, volume: number) => {
     if (!audioCtxRef.current) return;
     const ctx = audioCtxRef.current;
     const bufferSize = ctx.sampleRate * duration;
     const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
     }

     const noise = ctx.createBufferSource();
     noise.buffer = buffer;
     const gain = ctx.createGain();
     gain.gain.setValueAtTime(volume, ctx.currentTime);
     gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
     noise.connect(gain).connect(ctx.destination);
     noise.start();
  }, []);

  return {
    initAudio,
    playEat: () => playSweep(600 + Math.random() * 200, 800, 'sine', 0.1, 0.05),
    playSplit: () => playSweep(800, 200, 'sawtooth', 0.15, 0.1),
    playEject: () => playSweep(300, 100, 'square', 0.1, 0.03),
    playVirus: () => playNoise(0.4, 0.15),
    playCashOut: () => {
      playSweep(400, 1200, 'triangle', 0.5, 0.1);
      setTimeout(() => playSweep(600, 1500, 'sine', 0.5, 0.1), 100);
      setTimeout(() => playSweep(800, 2000, 'sine', 0.8, 0.05), 200);
    },
    playHover: () => playSweep(200, 300, 'sine', 0.05, 0.02),
    playClick: () => playSweep(400, 100, 'square', 0.05, 0.05)
  };
};
