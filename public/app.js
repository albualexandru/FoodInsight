(function () {
  const COOKIE_PREFIX = 'foodinsight_';
  const COOKIE_MAX_AGE_DAYS = 2; // keep just enough to survive midnight rollover

  const todayEl = document.getElementById('today');
  const totalEl = document.getElementById('total-calories');
  const entriesListEl = document.getElementById('entries-list');
  const photoInput = document.getElementById('photo-input');
  const takePhotoBtn = document.getElementById('take-photo-btn');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('reset-btn');
  const resultEl = document.getElementById('result');
  const resultNameEl = document.getElementById('result-name');
  const resultCaloriesEl = document.getElementById('result-calories');
  const resultNotesEl = document.getElementById('result-notes');

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function cookieName() {
    return `${COOKIE_PREFIX}${todayKey()}`;
  }

  function getCookie(name) {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function loadDay() {
    const raw = getCookie(cookieName());
    if (!raw) return { entries: [] };
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) return parsed;
    } catch (err) {
      // ignore malformed cookie, start fresh
    }
    return { entries: [] };
  }

  function saveDay(day) {
    setCookie(cookieName(), JSON.stringify(day), COOKIE_MAX_AGE_DAYS);
  }

  function render() {
    const day = loadDay();
    const total = day.entries.reduce((sum, e) => sum + e.calories, 0);
    totalEl.textContent = total;

    entriesListEl.innerHTML = '';
    if (day.entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No entries yet today. Take a photo of your food to get started!';
      entriesListEl.appendChild(empty);
      return;
    }

    day.entries
      .slice()
      .reverse()
      .forEach((entry) => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.className = 'entries__name';
        name.textContent = entry.foodName;
        const calories = document.createElement('span');
        calories.className = 'entries__calories';
        calories.textContent = `${entry.calories} kcal`;
        li.appendChild(name);
        li.appendChild(calories);
        entriesListEl.appendChild(li);
      });
  }

  function addEntry(entry) {
    const day = loadDay();
    day.entries.push(entry);
    saveDay(day);
    render();
  }

  function setBusy(busy, message) {
    takePhotoBtn.disabled = busy;
    statusEl.textContent = message || '';
  }

  takePhotoBtn.addEventListener('click', () => {
    photoInput.value = '';
    photoInput.click();
  });

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;

    resultEl.hidden = true;
    setBusy(true, 'Analyzing your food with Gemini…');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/estimate-calories', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      addEntry({
        foodName: data.foodName,
        calories: data.calories,
        notes: data.notes,
      });

      resultNameEl.textContent = data.foodName;
      resultCaloriesEl.textContent = `${data.calories} kcal`;
      resultNotesEl.textContent = data.notes || '';
      resultEl.hidden = false;

      setBusy(false, 'Done! Added to today\'s log.');
    } catch (err) {
      setBusy(false, err.message || 'Failed to estimate calories. Please try again.');
    }
  });

  resetBtn.addEventListener('click', () => {
    saveDay({ entries: [] });
    resultEl.hidden = true;
    render();
  });

  todayEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  render();
})();
