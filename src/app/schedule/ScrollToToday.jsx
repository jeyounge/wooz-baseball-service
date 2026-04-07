"use client";

import { useEffect } from 'react';

export default function ScrollToToday({ todayKey }) {
  useEffect(() => {
    if (typeof document !== 'undefined' && todayKey) {
      setTimeout(() => {
        const el = document.getElementById(`date-${todayKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight it temporarily
          el.classList.add('ring-2', 'ring-blue-500', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-blue-500');
          }, 3000);
        }
      }, 300); // slight delay to ensure rendering
    }
  }, [todayKey]);

  return null;
}
