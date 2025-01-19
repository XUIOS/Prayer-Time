document.addEventListener('DOMContentLoaded', () => {
  window.IPINFO_TOKEN = atob('MTYxNGYwNDc5NjM2M2I=');

  const loadingScreen = document.getElementById('loadingScreen');
  const container = document.querySelector('.container');
  const cityElement = document.getElementById('city');
  const countdownElement = document.getElementById('countdown');
  const nextPrayerNameElement = document.getElementById('next-prayer-name');

  const prayerElements = {
    الفجر: document.getElementById('fajr-prayer'),
    الشروق: document.getElementById('sunrise-prayer'),
    الظهر: document.getElementById('dhuhr-prayer'),
    العصر: document.getElementById('asr-prayer'),
    المغرب: document.getElementById('maghrib-prayer'),
    العشاء: document.getElementById('isha-prayer'),
  };

  const showLoadingScreen = () => {
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
      loadingScreen.style.opacity = '1';
    }
  };

  const hideLoadingScreen = () => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
  };

  const showContent = () => {
    if (container) {
      container.style.opacity = '1';
      container.classList.add('visible');
    }
  };

  const toArabicNumbers = (number) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return number.toString().split('')
      .map(char => char === ':' ? ':' : arabicNumbers[parseInt(char)] || char)
      .join('');
  };

  const convertTo12Hour = (time24h) => {
    if (!time24h) return null;
    const [hours, minutes] = time24h.split(':');
    let period = 'ص';
    let hours12 = parseInt(hours, 10);
    if (hours12 >= 12) period = 'م';
    if (hours12 > 12) hours12 -= 12;
    if (hours12 === 0) hours12 = 12;
    return `${hours12}:${minutes} ${period}`;
  };

  const convertTo24Hour = (time12h) => {
    if (!time12h) return null;
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (modifier === 'ص' && hours === '12') hours = '00';
    if (modifier === 'م' && hours !== '12') hours = parseInt(hours, 10) + 12;
    return `${hours}:${minutes}`;
  };

  const getCountryNameInArabic = async (countryCode) => {
    try {
      const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
      const data = await response.json();
      return data[0]?.translations?.ara?.common || '--';
    } catch (error) {
      return '--';
    }
  };

  const fetchPrayerTimes = async (city, country) => {
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=4`
      );
      if (!response.ok) throw new Error('Failed to fetch prayer times');
      const data = await response.json();
      return { 
        timings: data?.data?.timings,
        date: data?.data?.date
      };
    } catch (error) {
      throw new Error('Failed to fetch prayer times');
    }
  };

  const displayPrayerTimes = (timings, date) => {
    const times = {
      الفجر: timings.Fajr,
      الشروق: timings.Sunrise,
      الظهر: timings.Dhuhr,
      العصر: timings.Asr,
      المغرب: timings.Maghrib,
      العشاء: timings.Isha,
    };

    Object.entries(times).forEach(([prayer, time]) => {
      const element = prayerElements[prayer];
      if (element) {
        const timeSpan = element.querySelector('span');
        if (timeSpan) {
          timeSpan.textContent = toArabicNumbers(convertTo12Hour(time));
        }
      }
    });

    const hijriDate = document.getElementById('hijri-date');
    if (hijriDate && date?.hijri) {
      const { day, month, year } = date.hijri;
      hijriDate.textContent = `${toArabicNumbers(day)} ${month.ar} ${toArabicNumbers(year)}`;
    }

    return times;
  };

  const updateCountdown = (targetDate) => {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) return true;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    countdownElement.textContent = `${toArabicNumbers(String(hours).padStart(2, '0'))}:${toArabicNumbers(String(minutes).padStart(2, '0'))}:${toArabicNumbers(String(seconds).padStart(2, '0'))}`;
    return false;
  };

  const setNextPrayer = (times) => {
    const prayers = ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
    const now = new Date();
    let nextPrayer = null;
    let smallestDiff = Infinity;

    Object.values(prayerElements).forEach(el => el?.classList.remove('next-prayer'));

    prayers.forEach((prayer) => {
      const time = times[prayer];
      if (time) {
        const prayerDate = new Date();
        const [prayerHours, prayerMinutes] = time.split(':');
        prayerDate.setHours(parseInt(prayerHours), parseInt(prayerMinutes), 0);

        if (prayerDate < now) {
          prayerDate.setDate(prayerDate.getDate() + 1);
        }

        const diff = prayerDate - now;
        if (diff < smallestDiff) {
          smallestDiff = diff;
          nextPrayer = { name: prayer, date: prayerDate };
        }
      }
    });

    if (nextPrayer) {
      const element = prayerElements[nextPrayer.name];
      if (element) {
        element.classList.add('next-prayer');
        nextPrayerNameElement.innerHTML = `<span class="next-prayer-label">الصلاة القادمة: </span><span id="next-prayer">${nextPrayer.name}</span>`;
        setInterval(() => updateCountdown(nextPrayer.date), 1000);
      }
    }
  };

  const startApp = async () => {
    showLoadingScreen();
    try {
        if (!window.IPINFO_TOKEN) {
            throw new Error('IPINFO_TOKEN is not configured');
        }
        const response = await fetch(`https://ipinfo.io/json?token=${window.IPINFO_TOKEN}`);
        if (!response.ok) throw new Error('Failed to fetch location');
        
        const data = await response.json();
        if (!data.country) throw new Error('Location not found');

        const countryName = await getCountryNameInArabic(data.country);
        document.getElementById('country').textContent = countryName;

        const { timings, date } = await fetchPrayerTimes(data.city, data.country);
        if (timings) {
            const times = displayPrayerTimes(timings, date);
            setNextPrayer(times);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        hideLoadingScreen();
        showContent();
    }
};

  startApp();
});

function showLoadingScreen() {
  document.querySelector('.loading-screen').classList.remove('hidden');
}

function hideLoadingScreen() {
  document.querySelector('.loading-screen').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
  showLoadingScreen();
  setTimeout(hideLoadingScreen, 1500);
});

window.onload = async () => {
  try {
    await particlesJS.load('particles-js', 'particles.json');
  } catch (error) {
    console.error('Failed to load particles.js:', error);
  }
};

function showLoader() {
  document.querySelector('.loading-screen').classList.remove('hidden');
}

function hideLoader() {
  document.querySelector('.loading-screen').classList.add('hidden');
}