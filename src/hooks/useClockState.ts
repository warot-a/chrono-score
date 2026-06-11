'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/lib/engine';

interface ClockState {
  nowDay: number;
  setNowDay: (day: number | ((prev: number) => number)) => void;
  playing: boolean;
  setPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
  nowTs: number;
}

export function useClockState(tour: Tournament, isLive: boolean): ClockState {
  const [nowDay, _setNowDay] = useState(0);

  const [playing, setPlaying] = useState(false);

  const setNowDay = (day: number | ((prev: number) => number)) => {
    _setNowDay((prev) => {
      const next = typeof day === 'function' ? day(prev) : day;
      localStorage.setItem('wc_now', String(next));
      return next;
    });
  };

  // Restore persisted value or default to current time after hydration
  useEffect(() => {
    const init = () => {
      const saved = parseFloat(localStorage.getItem('wc_now') || '');
      setNowDay(!isNaN(saved) ? saved : Math.min(39, Math.max(0, (Date.now() - tour.DAY0) / tour.DAYMS)));
    };
    const id = setTimeout(init, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snap to real time on mount and advance every 30 s while live
  useEffect(() => {
    if (!isLive) {
      return;
    }
    const tick = () => setNowDay(Math.min(39, (Date.now() - tour.DAY0) / tour.DAYMS));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isLive, tour.DAY0, tour.DAYMS]);

  // Animate clock forward when playing
  useEffect(() => {
    if (!playing) {
      return;
    }
    const id = setInterval(() => {
      setNowDay((d) => {
        const nd = d + 0.3;
        if (nd >= 39) {
          setPlaying(false);
          return 39;
        }
        return nd;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing]);

  const nowTs = tour.DAY0 + nowDay * tour.DAYMS;

  return { nowDay, setNowDay, playing, setPlaying, nowTs };
}
