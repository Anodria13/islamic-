import React, { useState, useEffect, useRef } from 'react';
import { Radio as RadioIcon, Play, Pause, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from './AudioContext';

interface RadioStation {
  id: number;
  name: string;
  url: string;
  img: string;
}

interface RadioProps {
  isRtl: boolean;
}

export default function Radio({ isRtl }: RadioProps) {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [radioType, setRadioType] = useState<'reciter' | 'general'>('reciter');
  const { stopQuran, radioAudioRef: audioRef, isPlayingRadio: isPlaying, setIsPlayingRadio: setIsPlaying, isRadioUserPaused: userPausedRef } = useAudio();
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const activeStationRef = useRef<RadioStation | null>(null);
  const MAX_RETRIES = 5;

  useEffect(() => {
    const fetchRadios = async () => {
      try {
        const res = await fetch('https://data-rosy.vercel.app/radio.json');
        const data = await res.json();
        
        // Fix broken URLs and names for general radios
        const fixedRadios = data.radios.map((radio: RadioStation) => {
          if (radio.id === 19) {
            return { ...radio, url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' };
          }
          if (radio.id === 20) {
            return { 
              ...radio, 
              name: 'إذاعة القرآن الكريم (السعودية)', 
              url: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
              img: 'https://i.pinimg.com/564x/55/16/ab/5516abd3744c3d0b0a7b28bedd5474c0.jpg'
            };
          }
          return radio;
        });
        
        setStations(fixedRadios);
      } catch (error) {
        console.error('Error fetching Radio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRadios();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (stallTimeoutRef.current) {
        clearTimeout(stallTimeoutRef.current);
      }
    };
  }, []);

  const attemptReconnect = async () => {
    const currentStation = activeStationRef.current;
    if (!audioRef.current || !currentStation || isReconnectingRef.current) return;

    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);

    if (retryCountRef.current < MAX_RETRIES) {
      isReconnectingRef.current = true;
      retryCountRef.current += 1;
      console.log(`Attempting to reconnect... (Attempt ${retryCountRef.current}/${MAX_RETRIES})`);
      setIsBuffering(true);
      
      // Force reload by appending a timestamp to bypass cache if needed, 
      // but for streams, just calling load() again usually works.
      // We re-assign src to force the browser to drop the old connection.
      const currentUrl = currentStation.url;
      const currentStationId = currentStation.id;
      audioRef.current.src = '';
      audioRef.current.load();
      
      setTimeout(async () => {
        // If user switched stations during the timeout, abort reconnect
        if (!audioRef.current || activeStationRef.current?.id !== currentStationId) {
          isReconnectingRef.current = false;
          return;
        }
        if (currentUrl) {
          audioRef.current.src = currentUrl;
          console.log('Setting radio src:', currentUrl);
          audioRef.current.load();
        } else {
          console.error('Invalid radio URL');
        }
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setIsBuffering(false);
          isReconnectingRef.current = false;
          // Don't reset retry count here, reset it on successful playing for a while
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Reconnect failed:', err);
            isReconnectingRef.current = false;
            // Schedule another retry
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(attemptReconnect, 3000);
          }
        }
      }, 500);
    } else {
      console.error('Max retries reached. Stream might be offline.');
      setIsPlaying(false);
      setIsBuffering(false);
      retryCountRef.current = 0; // Reset for manual play attempts
      isReconnectingRef.current = false;
    }
  };

  const handlePlay = async (station: RadioStation) => {
    stopQuran();
    if (!audioRef.current) return;

    // Clear any pending retries and stalls
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
    }
    retryCountRef.current = 0;
    isReconnectingRef.current = false;

    if (activeStation?.id === station.id) {
      if (isPlaying) {
        userPausedRef.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        userPausedRef.current = false;
        setIsBuffering(true);
        
        // If it was stopped/errored, we should reload the stream
        userPausedRef.current = false;
        if (station.url) {
          audioRef.current.src = station.url;
          audioRef.current.load();
        } else {
          console.error('Invalid radio URL');
        }
        
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Playback failed:', err);
            attemptReconnect();
          }
        } finally {
          setIsBuffering(false);
        }
      }
    } else {
      userPausedRef.current = false;
      setActiveStation(station);
      activeStationRef.current = station;
      setIsBuffering(true);
      setIsPlaying(false);
      
      if (station.url) {
        audioRef.current.src = station.url;
        audioRef.current.load();
      } else {
        console.error('Invalid radio URL');
      }
      
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Playback failed:', err);
          attemptReconnect();
        }
      } finally {
        setIsBuffering(false);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 bg-emerald-800 dark:bg-emerald-950 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden transition-colors">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-emerald-700/50 dark:bg-emerald-800/50 p-4 rounded-2xl backdrop-blur-sm border border-emerald-600/50 dark:border-emerald-700/50 transition-colors">
            <RadioIcon className="h-8 w-8 text-emerald-300 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">{isRtl ? 'إذاعة القرآن الكريم' : 'Quran Radio'}</h2>
            <p className="text-emerald-200 dark:text-emerald-300">{isRtl ? 'استمع إلى تلاوات خاشعة لأشهر القراء' : 'Listen to beautiful recitations by famous reciters'}</p>
          </div>
        </div>

        {activeStation && (
          <div className="relative z-10 bg-emerald-900/50 dark:bg-emerald-900/80 backdrop-blur-md border border-emerald-700/50 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center gap-6 shadow-inner w-full md:w-auto transition-colors">
            <div className="flex items-center gap-4">
              <img 
                src={activeStation.img || 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=100&q=80'} 
                alt={activeStation.name} 
                className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/30 dark:border-emerald-600/30"
              />
              <div>
                <div className="text-sm text-emerald-300 dark:text-emerald-400 mb-1">{isRtl ? 'يتم التشغيل الآن' : 'Now Playing'}</div>
                <div className="font-bold">{activeStation.name}</div>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
              <button 
                onClick={toggleMute}
                className="p-3 rounded-full hover:bg-emerald-700/50 dark:hover:bg-emerald-800/50 transition-colors text-emerald-200 dark:text-emerald-300 hover:text-white"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                onClick={() => handlePlay(activeStation)}
                className="bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-400 dark:hover:bg-emerald-500 text-emerald-950 dark:text-emerald-50 p-4 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center w-14 h-14"
                disabled={isBuffering}
              >
                {isBuffering ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className={`h-6 w-6 ${isRtl ? 'mr-1' : 'ml-1'}`} />
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Navigation Bar */}
        <div className="relative z-10 flex bg-emerald-900/50 dark:bg-emerald-900/80 rounded-2xl p-1">
          <button
            onClick={() => setRadioType('reciter')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${radioType === 'reciter' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-200 hover:text-white'}`}
          >
            {isRtl ? 'إذاعات القراء' : 'Reciters Radios'}
          </button>
          <button
            onClick={() => setRadioType('general')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${radioType === 'general' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-200 hover:text-white'}`}
          >
            {isRtl ? 'الإذاعات العامة' : 'General Radios'}
          </button>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        preload="none"
        onEnded={() => {
          if (!userPausedRef.current) {
            console.log('Stream ended unexpectedly, attempting to reconnect...');
            attemptReconnect();
          } else {
            setIsPlaying(false);
          }
        }}
        onPause={() => {
          if (userPausedRef.current) {
            setIsPlaying(false);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onWaiting={() => {
          setIsBuffering(true);
          if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
          stallTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !userPausedRef.current) {
              console.log('Stream stalled for too long, attempting to reconnect...');
              attemptReconnect();
            }
          }, 10000); // 10 seconds timeout for buffering
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          retryCountRef.current = 0; // Reset retries on successful play
          if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
        }}
        onStalled={() => {
          if (isPlaying && !userPausedRef.current) {
            if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
            stallTimeoutRef.current = setTimeout(() => {
              console.log('Stream stalled, attempting to reconnect...');
              attemptReconnect();
            }, 10000);
          }
        }}
        onError={(e) => {
          const target = e.target as HTMLAudioElement;
          console.error('Audio error occurred. Code:', target.error?.code, 'Message:', target.error?.message);
          if (!userPausedRef.current) {
            attemptReconnect();
          } else {
            setIsPlaying(false);
            setIsBuffering(false);
          }
        }}
      />

      <div className="space-y-12">
        <section>
          <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-6 flex items-center gap-2">
            <RadioIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            {isRtl ? 'الإذاعات العامة' : 'General Radios'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stations.filter(s => radioType === 'general' ? s.id >= 19 : s.id < 19).map((station) => {
              const isActive = activeStation?.id === station.id;
              
              return (
                <div
                  key={station.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border transition-all group hover:shadow-md ${
                    isActive ? 'border-emerald-500 dark:border-emerald-400 shadow-sm ring-1 ring-emerald-500 dark:ring-emerald-400' : 'border-emerald-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-500'
                  }`}
                >
                  <div className="h-40 overflow-hidden relative cursor-pointer" onClick={() => handlePlay(station)}>
                    <img
                      src={station.img || 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=400&q=80'}
                      alt={station.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-50 text-lg mb-1 line-clamp-1" title={station.name}>
                        {station.name}
                      </h3>
                      <p className="text-emerald-500 dark:text-emerald-400 text-sm flex items-center gap-1">
                        <RadioIcon className="h-3 w-3" /> {isRtl ? 'بث مباشر' : 'Live'}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handlePlay(station)}
                      disabled={isActive && isBuffering}
                      className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isActive && (isPlaying || isBuffering)
                          ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
                          : 'bg-emerald-50 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-gray-600 hover:scale-105'
                      }`}
                    >
                      {isActive && isBuffering ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isActive && isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className={`h-5 w-5 ${isRtl ? 'mr-1' : 'ml-1'}`} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
