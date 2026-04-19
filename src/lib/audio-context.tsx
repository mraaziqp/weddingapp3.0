'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface AudioContextValue {
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextValue>({
  isMuted: false,
  setMuted: () => {},
  toggleMute: () => {},
});

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wedu_audio_muted') === 'true';
    }
    return false;
  });

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wedu_audio_muted', String(muted));
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  return (
    <AudioContext.Provider value={{ isMuted, setMuted, toggleMute }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
