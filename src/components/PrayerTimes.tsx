import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Loader2 } from 'lucide-react';

interface PrayerData {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
    Imsak: string;
    Midnight: string;
  };
  date: {
    readable: string;
    hijri: {
      date: string;
      month: { ar: string; en: string };
      year: string;
      weekday: { ar: string; en: string };
    };
  };
}

interface PrayerTimesProps {
  isRtl: boolean;
}

export default function PrayerTimes({ isRtl }: PrayerTimesProps) {
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('cairo');
  const [country, setCountry] = useState('egypt');

  const fetchPrayerTimes = async (c: string, co: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${c}&country=${co}&method=8`);
      if (!response.ok) throw new Error(isRtl ? 'فشل في جلب مواقيت الصلاة' : 'Failed to fetch prayer times');
      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayerTimes(city, country);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrayerTimes(city, country);
  };

  const prayerNamesAr: Record<string, string> = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
    Imsak: 'الإمساك',
    Midnight: 'منتصف الليل',
  };

  const prayerNamesEn: Record<string, string> = {
    Fajr: 'Fajr',
    Sunrise: 'Sunrise',
    Dhuhr: 'Dhuhr',
    Asr: 'Asr',
    Maghrib: 'Maghrib',
    Isha: 'Isha',
    Imsak: 'Imsak',
    Midnight: 'Midnight',
  };

  const prayerNames = isRtl ? prayerNamesAr : prayerNamesEn;

  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [time] = time24.split(' ');
    const [hoursStr, minutes] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? (isRtl ? 'م' : 'PM') : (isRtl ? 'ص' : 'AM');
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8 border border-emerald-100 dark:border-gray-700 transition-colors duration-300">
        <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-6 flex items-center gap-2">
          <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          {isRtl ? 'مواقيت الصلاة' : 'Prayer Times'}
        </h2>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <MapPin className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
            </div>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`block w-full ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-emerald-200 dark:border-gray-600 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50 dark:bg-gray-700 dark:text-white transition-colors`}
              placeholder={isRtl ? 'المدينة (مثال: cairo)' : 'City (e.g. cairo)'}
              dir="ltr"
            />
          </div>
          <div className="flex-1 relative">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <MapPin className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
            </div>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`block w-full ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-emerald-200 dark:border-gray-600 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50 dark:bg-gray-700 dark:text-white transition-colors`}
              placeholder={isRtl ? 'الدولة (مثال: egypt)' : 'Country (e.g. egypt)'}
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors font-medium shadow-sm"
          >
            {isRtl ? 'بحث' : 'Search'}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 dark:text-red-400 text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">{error}</div>
        ) : data ? (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-50 dark:bg-gray-700/50 p-6 rounded-xl border border-emerald-100 dark:border-gray-600 transition-colors">
              <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-100 mb-4 sm:mb-0">
                <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <span className="text-lg font-medium">{data.date.readable}</span>
              </div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-50">
                {isRtl ? data.date.hijri.weekday.ar : data.date.hijri.weekday.en}، {data.date.hijri.date} {isRtl ? data.date.hijri.month.ar : data.date.hijri.month.en} {data.date.hijri.year}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(data.timings).map(([key, time]) => {
                if (!prayerNames[key]) return null;
                const isMainPrayer = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(key);
                
                return (
                  <div
                    key={key}
                    className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
                      isMainPrayer
                        ? 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-500 dark:border-emerald-600 shadow-sm transform hover:-translate-y-1'
                        : 'bg-white dark:bg-gray-800 text-emerald-900 dark:text-emerald-100 border-emerald-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-500'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isMainPrayer ? 'text-emerald-100 dark:text-emerald-200' : 'text-emerald-500 dark:text-emerald-400'}`}>
                      {prayerNames[key]}
                    </div>
                    <div className="text-3xl font-bold tracking-tight" dir="ltr">
                      {formatTime12Hour(time as string)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
