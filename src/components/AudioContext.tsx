import React, { createContext, useContext, useRef, useState } from 'react';

interface AudioContextType {
  quranAudioRef: React.RefObject<HTMLAudioElement>;
  radioAudioRef: React.RefObject<HTMLAudioElement>;
  isPlayingQuran: boolean;
  setIsPlayingQuran: (playing: boolean) => void;
  isPlayingRadio: boolean;
  setIsPlayingRadio: (playing: boolean) => void;
  stopQuran: () => void;
  stopRadio: () => void;
  isRadioUserPaused: React.MutableRefObject<boolean>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const quranAudioRef = useRef<HTMLAudioElement | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingQuran, setIsPlayingQuran] = useState(false);
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const isRadioUserPaused = useRef(false);

  const stopQuran = () => {
    if (quranAudioRef.current) {
      quranAudioRef.current.pause();
      quranAudioRef.current.removeAttribute('src');
      quranAudioRef.current.load();
      setIsPlayingQuran(false);
    }
  };

  const stopRadio = () => {
    if (radioAudioRef.current) {
      isRadioUserPaused.current = true;
      radioAudioRef.current.pause();
      radioAudioRef.current.removeAttribute('src');
      radioAudioRef.current.load();
      setIsPlayingRadio(false);
    }
  };

  return (
    <AudioContext.Provider value={{ quranAudioRef, radioAudioRef, isPlayingQuran, setIsPlayingQuran, isPlayingRadio, setIsPlayingRadio, stopQuran, stopRadio, isRadioUserPaused }}>
      {children}
      <audio
        ref={quranAudioRef}
        onEnded={() => setIsPlayingQuran(false)}
        onPause={() => setIsPlayingQuran(false)}
        onPlay={() => setIsPlayingQuran(true)}
      />
      <audio
        ref={radioAudioRef}
        onEnded={() => setIsPlayingRadio(false)}
        onPause={() => setIsPlayingRadio(false)}
        onPlay={() => setIsPlayingRadio(true)}
      />
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
