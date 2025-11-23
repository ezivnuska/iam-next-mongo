// app/poker/lib/hooks/use-poker-sounds.ts

'use client';

import { useCallback, useRef } from 'react';

export type PokerSoundType =
  | 'card-deal'     // Cards being dealt (flop, hole cards - multiple cards)
  | 'single-card'   // Single card dealt (turn, river)
  | 'check'         // Player checks
  | 'call'          // Player calls
  | 'raise'         // Player raises/bets
  | 'fold'          // Player folds
  | 'chips'         // Chips moving to pot
  | 'winner'        // Winner determined
  | 'blind';        // Blind posted

/**
 * Hook for playing poker game sound effects
 *
 * Provides a simple interface to play various poker sounds.
 * Sounds are played using the Web Audio API with volume control.
 */
export function usePokerSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<PokerSoundType, AudioBuffer>>(new Map());
  const enabledRef = useRef(true);
  const volumeRef = useRef(0.5); // Default volume 50%

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Load a sound file
  const loadSound = useCallback(async (type: PokerSoundType, url: string) => {
    try {
      const context = getAudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      audioBuffersRef.current.set(type, audioBuffer);
    } catch (error) {
      console.error(`Failed to load sound: ${type}`, error);
    }
  }, [getAudioContext]);

  // Play a sound
  const playSound = useCallback((type: PokerSoundType) => {

    if (!enabledRef.current) {
      return;
    }

    const buffer = audioBuffersRef.current.get(type);
    if (!buffer) {
      console.warn(`[PokerSounds] Sound not loaded: ${type}`);
      return;
    }

    try {
      const context = getAudioContext();
      const source = context.createBufferSource();
      const gainNode = context.createGain();

      source.buffer = buffer;
      gainNode.gain.value = volumeRef.current;

      source.connect(gainNode);
      gainNode.connect(context.destination);

      source.start(0);
    } catch (error) {
      console.error(`[PokerSounds] Failed to play sound: ${type}`, error);
    }
  }, [getAudioContext]);

  // Set volume (0.0 to 1.0)
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);

  // Enable/disable sounds
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  // Initialize sounds - load all sound files
  const initSounds = useCallback(async () => {
    const soundMap: Record<PokerSoundType, string> = {
      'card-deal': '/sounds/poker/card-deal.mp3',
      'single-card': '/sounds/poker/single-card.mp3',
      'check': '/sounds/poker/check.mp3',
      'call': '/sounds/poker/call.mp3',
      'raise': '/sounds/poker/raise.mp3',
      'fold': '/sounds/poker/fold.mp3',
      'chips': '/sounds/poker/chips.mp3',
      'winner': '/sounds/poker/winner.mp3',
      'blind': '/sounds/poker/blind.mp3',
    };

    // Load all sounds in parallel
    await Promise.all(
      Object.entries(soundMap).map(([type, url]) =>
        loadSound(type as PokerSoundType, url)
      )
    );
  }, [loadSound]);

  return {
    playSound,
    setVolume,
    setEnabled,
    initSounds,
  };
}
