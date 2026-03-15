import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Play, Pause, Search, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useAudio } from './AudioContext';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  id: string;
  sura: string;
  aya: string;
  arabic_text: string;
  translation: string;
}

interface Reciter {
  id: number;
  name: string;
  nameEn: string;
  server: string;
}

const RECITERS: Reciter[] = [
  { id: 1, name: 'عبد الباسط عبد الصمد (مجود)', nameEn: 'AbdulBaset AbdulSamad (Mujawwad)', server: 'https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad/' },
  { id: 2, name: 'عبد الباسط عبد الصمد (مرتل)', nameEn: 'AbdulBaset AbdulSamad (Murattal)', server: 'https://server7.mp3quran.net/basit/' },
  { id: 3, name: 'عبد الرحمن السديس', nameEn: 'Abdur-Rahman as-Sudais', server: 'https://server11.mp3quran.net/sds/' },
  { id: 4, name: 'أبو بكر الشاطري', nameEn: 'Abu Bakr al-Shatri', server: 'https://server11.mp3quran.net/shatri/' },
  { id: 5, name: 'هاني الرفاعي', nameEn: 'Hani ar-Rifai', server: 'https://server8.mp3quran.net/hani/' },
  { id: 6, name: 'محمود خليل الحصري', nameEn: 'Mahmoud Khalil Al-Husary', server: 'https://server13.mp3quran.net/husr/' },
  { id: 7, name: 'مشاري راشد العفاسي', nameEn: 'Mishari Rashid al-`Afasy', server: 'https://server8.mp3quran.net/afs/' },
  { id: 8, name: 'محمد صديق المنشاوي (مجود)', nameEn: 'Mohamed Siddiq al-Minshawi (Mujawwad)', server: 'https://server10.mp3quran.net/minsh/Almusshaf-Al-Mojawwad/' },
  { id: 9, name: 'محمد صديق المنشاوي (مرتل)', nameEn: 'Mohamed Siddiq al-Minshawi (Murattal)', server: 'https://server10.mp3quran.net/minsh/' },
  { id: 10, name: 'سعود الشريم', nameEn: 'Sa`ud ash-Shuraym', server: 'https://server7.mp3quran.net/shur/' },
  { id: 11, name: 'ياسر الدوسري', nameEn: 'Yasser Al-Dosari', server: 'https://server11.mp3quran.net/yasser/' },
  { id: 12, name: 'محمود علي البنا', nameEn: 'Mahmoud Ali Al-Banna', server: 'https://server8.mp3quran.net/bna/' },
];

interface QuranProps {
  isRtl: boolean;
}

export default function Quran({ isRtl }: QuranProps) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  
  const [selectedReciter, setSelectedReciter] = useState<number>(7); // Default to Mishary
  const { quranAudioRef, isPlayingQuran, setIsPlayingQuran, stopRadio, stopQuran } = useAudio();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (quranAudioRef.current && currentAudioUrl) {
      quranAudioRef.current.src = currentAudioUrl;
      quranAudioRef.current.load();
    }
  }, [currentAudioUrl, quranAudioRef]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const surahsRes = await fetch('https://api.alquran.cloud/v1/surah');
        const surahsData = await surahsRes.json();
        setSurahs(surahsData.data);
      } catch (error) {
        console.error('Error fetching Quran data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleReciterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newReciterId = parseInt(e.target.value, 10);
    setSelectedReciter(newReciterId);
    stopQuran();
  };

  const handleSurahClick = async (surah: Surah) => {
    setSelectedSurah(surah);
    setLoadingAyahs(true);
    stopQuran();
    
    try {
      const res = await fetch(`https://quranenc.com/api/v1/translation/sura/arabic_moyassar/${surah.number}`);
      const data = await res.json();
      setAyahs(data.result);
    } catch (error) {
      console.error('Error fetching ayahs:', error);
    } finally {
      setLoadingAyahs(false);
    }
  };

  const toggleAudio = async () => {
    if (!quranAudioRef.current) return;
    
    if (isPlayingQuran) {
      quranAudioRef.current.pause();
    } else {
      stopRadio(); // Stop radio when playing Quran
      try {
        await quranAudioRef.current.play();
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error("Error playing audio:", e.message || "Unknown error");
        }
      }
    }
  };

  const filteredSurahs = surahs.filter(
    (s) => s.name.includes(searchQuery) || s.englishName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentReciterObj = RECITERS.find(r => r.id === selectedReciter);
  useEffect(() => {
    if (selectedSurah && currentReciterObj) {
      const url = `${currentReciterObj.server}${selectedSurah.number.toString().padStart(3, '0')}.mp3`;
      setCurrentAudioUrl(url);
    }
  }, [selectedSurah, currentReciterObj, setCurrentAudioUrl]);

  useEffect(() => {
    if (scrollContainerRef.current && !selectedSurah) {
      // Trigger a scroll event to initialize the card scales
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.dispatchEvent(new Event('scroll'));
        }
      });
    }
  }, [filteredSurahs, selectedSurah]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {!selectedSurah ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 sticky top-16 z-40 bg-emerald-50 dark:bg-gray-900 py-4 transition-colors">
            <div className="relative flex-1">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                <Search className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`block w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 border-2 border-emerald-100 dark:border-gray-700 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm text-lg transition-colors`}
                placeholder={isRtl ? 'ابحث عن سورة...' : 'Search for a Surah...'}
              />
            </div>
            <div className="md:w-64 shrink-0">
              <select
                value={selectedReciter}
                onChange={handleReciterChange}
                className={`block w-full px-4 py-4 border-2 border-emerald-100 dark:border-gray-700 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm text-lg appearance-none cursor-pointer transition-colors ${isRtl ? 'bg-[length:1.5em_1.5em] bg-[position:left_1rem_center]' : 'bg-[length:1.5em_1.5em] bg-[position:right_1rem_center]'}`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2310b981' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat' }}
              >
                {RECITERS.map((reciter) => (
                  <option key={reciter.id} value={reciter.id}>
                    {isRtl ? reciter.name : reciter.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="h-[60vh] overflow-y-auto snap-y snap-mandatory scroll-smooth hide-scrollbar relative px-4"
            onScroll={(e) => {
              const container = e.currentTarget;
              const center = container.scrollTop + container.clientHeight / 2;
              const cards = container.getElementsByClassName('surah-card');
              
              Array.from(cards).forEach((card) => {
                const htmlCard = card as HTMLElement;
                const cardCenter = htmlCard.offsetTop + htmlCard.clientHeight / 2;
                const distance = Math.abs(center - cardCenter);
                const maxDistance = container.clientHeight / 2;
                
                // Calculate scale: 1 at center, smaller as it gets further away
                let scale = 1 - (distance / maxDistance) * 0.2;
                scale = Math.max(0.8, Math.min(1, scale)); // Clamp between 0.8 and 1
                
                // Calculate opacity
                let opacity = 1 - (distance / maxDistance) * 0.5;
                opacity = Math.max(0.4, Math.min(1, opacity));
                
                htmlCard.style.transform = `scale(${scale})`;
                htmlCard.style.opacity = opacity.toString();
              });
            }}
          >
            <div className="py-4 space-y-4">
              {filteredSurahs.map((surah) => (
                <button
                  key={surah.number}
                  onClick={() => handleSurahClick(surah)}
                  className={`surah-card snap-center w-full max-w-2xl mx-auto flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-3xl border border-emerald-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-500 shadow-sm transition-all duration-200 group ${isRtl ? 'text-right' : 'text-left'}`}
                  style={{ transform: 'scale(0.8)', opacity: 0.4 }} // Initial state
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-gray-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl border border-emerald-100 dark:border-gray-600 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      {surah.number}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-1">{isRtl ? surah.name : surah.englishName}</h3>
                      <p className="text-emerald-500 dark:text-emerald-400 font-medium">
                        {surah.revelationType === 'Meccan' ? (isRtl ? 'مكية' : 'Meccan') : (isRtl ? 'مدنية' : 'Medinan')} • {surah.numberOfAyahs} {isRtl ? 'آية' : 'Ayahs'}
                      </p>
                    </div>
                  </div>
                  {isRtl ? (
                    <ChevronLeft className="h-6 w-6 text-emerald-300 dark:text-emerald-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  ) : (
                    <ChevronRight className="h-6 w-6 text-emerald-300 dark:text-emerald-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-emerald-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-16 z-40 transition-colors">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedSurah(null);
                  stopQuran();
                }}
                className="p-2 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors text-emerald-600 dark:text-emerald-400"
              >
                {isRtl ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">{isRtl ? selectedSurah.name : selectedSurah.englishName}</h2>
                <p className="text-emerald-500 dark:text-emerald-400 text-sm">{isRtl ? 'التفسير الميسر' : 'Al-Muyassar Translation'}</p>
              </div>
            </div>
            
            {currentAudioUrl && (
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAudio}
                  className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-2.5 rounded-full hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  {isPlayingQuran ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span className="font-medium">{isPlayingQuran ? (isRtl ? 'إيقاف' : 'Pause') : (isRtl ? 'استماع' : 'Listen')}</span>
                </button>
              </div>
            )}
          </div>

          {loadingAyahs ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {ayahs.map((ayah) => (
                <div key={ayah.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-gray-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-gray-600 shrink-0">
                      {ayah.aya}
                    </span>
                    <p className={`text-2xl md:text-3xl leading-loose font-quran text-emerald-900 dark:text-emerald-50 text-right flex-1 ${isRtl ? 'mr-6' : 'ml-6'}`} style={{ lineHeight: '2.5' }} dir="rtl">
                      {ayah.arabic_text}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-emerald-50 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">{isRtl ? 'التفسير:' : 'Translation:'}</h4>
                    <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed text-lg">
                      {ayah.translation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
