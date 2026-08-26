const TRACKER_PROFILES = {
  profile1: 'Alex',
  profile2: 'Jordan',
};

const TRACKER_STATE = {
  supabaseClient: null,
  currentUser: null,
  currentProfile: null,
};

const TRACKER_INSIGHT_TYPES = ['sleep_mood', 'habit_energy', 'study_window'];

function getTrackerTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getTrackerDateISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getTrackerLocalDateLabel(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function getTrackerStoredProfileKey() {
  return localStorage.getItem('bloom_selected_profile') || 'profile1';
}

function renderInsightCard(insightType, insightText) {
  const item = document.querySelector(`.insight-item[data-insight-type="${insightType}"]`);
  if (!item) return;

  if (!insightText) {
    item.hidden = true;
    return;
  }

  item.hidden = false;
  const textNode = item.querySelector('.insight-text');
  if (textNode) {
    textNode.innerHTML = insightText;
  }
}

async function initTrackerAuth() {
  const { createClient } = window.supabase;
  if (!createClient) {
    console.error('Supabase client not available on trackers page.');
    return;
  }

  const supabaseClient = createClient(
    'https://zsqsfxmjphctknnumgsi.supabase.co',
    'sb_publishable_tZoeD9y0_faPskrhd2aNmQ_tLqHuNtJ'
  );

  TRACKER_STATE.supabaseClient = supabaseClient;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) {
    const trackersShell = document.querySelector('.trackers-shell');
    if (trackersShell) {
      trackersShell.classList.add('logged-out');
    }
    const trackerAuthMessage = document.getElementById('tracker-auth-message');
    if (trackerAuthMessage) {
      trackerAuthMessage.hidden = false;
    }
    return;
  }

  TRACKER_STATE.currentUser = session.user;
  await ensureTrackerProfile();
  await loadTrackerOverview();
}

async function ensureTrackerProfile() {
  if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentUser) return;

  const profileName = TRACKER_PROFILES[getTrackerStoredProfileKey()] || 'Bloom User';

  const { data: existingProfile, error: lookupError } = await TRACKER_STATE.supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', TRACKER_STATE.currentUser.id)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    throw lookupError;
  }

  if (!existingProfile) {
    const { data: createdProfile, error: insertError } = await TRACKER_STATE.supabaseClient
      .from('profiles')
      .insert({
        id: TRACKER_STATE.currentUser.id,
        profile_name: profileName,
        total_points: 0,
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    TRACKER_STATE.currentProfile = createdProfile;
  } else {
    TRACKER_STATE.currentProfile = existingProfile;
  }

  const currentProfileNode = document.getElementById('tracker-current-profile');
  if (currentProfileNode) {
    currentProfileNode.textContent = TRACKER_STATE.currentProfile.profile_name || profileName;
  }
}

function formatSleepHours(hours) {
  const h = Math.floor(Number(hours) || 0);
  const m = Math.round((Number(hours) - h) * 60);
  return `${h}h ${m}m`;
}

function approxValueForColor(value, minValue, maxValue) {
  const safeMin = Number(minValue) || 0;
  const safeMax = Number(maxValue) || 1;
  const clamped = Math.min(Math.max(value, safeMin), safeMax);
  return ((clamped - safeMin) / (safeMax - safeMin || 1)) * 100;
}

function renderOverviewCards(sleepRows, studyRows, waterRows) {
  const overview = document.getElementById('overview-grid');
  if (!overview) return;

  const sleepLast7 = sleepRows.slice(-7);
  const studyLast7 = studyRows.slice(-7);
  const waterToday = (waterRows || []).filter((row) => row.logged_at && row.logged_at.slice(0, 10) === getTrackerTodayISO());

  const totalWaterMl = waterToday.reduce((sum, row) => sum + Number(row.ml || 0), 0);
  const currentSleep = sleepLast7[sleepLast7.length - 1];
  const studyToday = studyLast7.reduce((sum, row) => sum + Number(row.minutes || 0), 0);
  const studyValue = studyToday >= 60 ? `${Math.floor(studyToday / 60)}h ${studyToday % 60}m` : `${studyToday}m`;

  const sleepPrevious = sleepLast7.length > 1 ? Number(sleepLast7[sleepLast7.length - 2]?.hours || 0) : Number(currentSleep?.hours || 0);
  const sleepTrend = currentSleep ? (((Number(currentSleep.hours) - sleepPrevious) / Math.max(sleepPrevious, 1)) * 100) : 0;
  const studyTrend = 12;
  const waterTrend = 3;

  const sleepTrendMarkup = `<span class="ov-trend" style="color:${sleepTrend >= 0 ? 'var(--sage)' : 'var(--rose)'}">${sleepTrend >= 0 ? '+' : ''}${Math.round(sleepTrend)}%</span>`;
  const studyTrendMarkup = '<span class="ov-trend" style="color:var(--sage)">+14%</span>';
  const waterTrendMarkup = '<span class="ov-trend" style="color:var(--sage)">+3%</span>';

  overview.innerHTML = `
    <div class="ov-card">
      <div class="ov-top"><div class="ov-icon" style="background:var(--sky-dim); color:var(--sky);">💤</div>${sleepTrendMarkup}</div>
      <div class="ov-name">Sleep (last night)</div>
      <div class="ov-value">${currentSleep ? formatSleepHours(currentSleep.hours) : '—'}</div>
      <div class="ov-spark">${renderSparkBars(sleepLast7.map((row) => Number(row.hours || 0)), 10, 'var(--sky-dim)')}</div>
      <button type="button" class="ov-card-action" data-open-modal="sleep-log-modal" data-card="sleep">+ Log</button>
    </div>
    <div class="ov-card">
      <div class="ov-top"><div class="ov-icon" style="background:var(--sage-dim); color:var(--sage);">📚</div>${studyTrendMarkup}</div>
      <div class="ov-name">Study today</div>
      <div class="ov-value">${studyValue}</div>
      <div class="ov-spark">${renderSparkBars(studyLast7.map((row) => Number(row.minutes || 0)), 120, 'var(--sage)')}</div>
      <button type="button" class="ov-card-action" data-open-modal="study-log-modal" data-card="study">+ Log</button>
    </div>
    <div class="ov-card">
      <div class="ov-top"><div class="ov-icon" style="background:var(--sky-dim); color:var(--sky);">💧</div>${waterTrendMarkup}</div>
      <div class="ov-name">Water today</div>
      <div class="ov-value">${(totalWaterMl / 1000).toFixed(1)}L</div>
      <div class="ov-spark">${renderSparkBars(waterRows.slice(-7).map((row) => Number(row.ml || 0)), 2000, 'var(--sky)')}</div>
    </div>
    <div class="ov-card">
      <div class="ov-top"><div class="ov-icon" style="background:var(--amber-dim); color:var(--amber);">⚡</div><span class="ov-trend" style="color:var(--sage)">+9%</span></div>
      <div class="ov-name">Energy</div>
      <div class="ov-value">${currentSleep && Number(currentSleep.hours) < 6 ? 'Low' : 'Good'}</div>
      <div class="ov-spark">${renderSparkBars(sleepLast7.map((row) => Number(row.hours || 0)), 10, 'var(--amber)')}</div>
    </div>
  `;
}

function renderSparkBars(values, maxValue, color) {
  if (!values.length) return '<span style="height:10%;background:rgba(255,255,255,0.12)"></span>'.repeat(7);

  const normalized = values.map((value) => {
    const ratio = Math.max(0, Math.min(1, Number(value) / (maxValue || 1)));
    return Math.round(ratio * 100);
  });

  const padded = normalized.length >= 7 ? normalized.slice(-7) : [...Array(7 - normalized.length).fill(0), ...normalized];
  return padded.map((value) => `<span style="height:${Math.max(14, value)}%;background:${color}"></span>`).join('');
}

function renderSleepChart(sleepRows) {
  const chart = document.getElementById('sleep-chart');
  if (!chart) return;

  const last7 = sleepRows.slice(-7);
  const minHours = 4;
  const maxHours = 10;

  chart.innerHTML = last7.map((row) => {
    const heightPercent = Math.max(18, Math.min(100, ((Number(row.hours || 0) - minHours) / (maxHours - minHours)) * 100));
    const lowClass = Number(row.hours || 0) < 6 ? ' low' : '';
    return `
      <div class="sleep-bar-wrap">
        <div class="sleep-bar${lowClass}" style="height:${heightPercent}%"></div>
        <span class="sleep-dow">${getTrackerLocalDateLabel(row.date)}</span>
      </div>
    `;
  }).join('');

  const sleepDebt = sleepRows.slice(-7).reduce((sum, row) => sum + Math.max(0, 8 - Number(row.hours || 0)), 0);
  const debtValueEl = document.getElementById('sleep-debt-value');
  if (debtValueEl) {
    debtValueEl.textContent = `${sleepDebt.toFixed(1)}h`;
  }
}

function renderStudyHeatmap(studyRows) {
  const heatmap = document.getElementById('heatmap');
  if (!heatmap) return;

  const rowsByDate = new Map();
  for (const row of studyRows) {
    const iso = row.date || row.started_at?.slice(0, 10);
    if (!iso) continue;
    rowsByDate.set(iso, (rowsByDate.get(iso) || 0) + Number(row.minutes || 0));
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 62);

  const cells = [];
  for (let i = 62; i >= 0; i -= 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const iso = getTrackerDateISO(current);
    const minutes = rowsByDate.get(iso) || 0;
    const opacity = minutes === 0 ? 0.08 : Math.min(1, 0.18 + (minutes / 120) * 0.82);
    cells.push(`<div class="heat-cell" style="background:rgba(127,168,143,${opacity.toFixed(2)})" title="${iso}: ${minutes} minutes"></div>`);
  }

  heatmap.innerHTML = cells.join('');
}

function renderWaterRing(waterRows) {
  const totalWater = waterRows
    .filter((row) => row.logged_at?.slice(0, 10) === getTrackerTodayISO())
    .reduce((sum, row) => sum + Number(row.ml || 0), 0);

  const goalMl = 2200;
  const percent = Math.min(100, (totalWater / goalMl) * 100);
  const ring = document.querySelector('.water-ring-bg');
  if (ring) {
    ring.style.background = `conic-gradient(var(--sky) ${percent}%, var(--border) 0)`;
  }

  const ringValue = document.querySelector('.water-ring-num');
  if (ringValue) {
    ringValue.textContent = `${(totalWater / 1000).toFixed(1)}L`;
  }

  const ringSub = document.querySelector('.water-ring-sub');
  if (ringSub) {
    ringSub.textContent = `of ${(goalMl / 1000).toFixed(1)}L`;
  }
}

async function loadTrackerInsights() {
  if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentProfile) {
    return;
  }

  const { data, error } = await TRACKER_STATE.supabaseClient
    .from('insights')
    .select('*')
    .eq('profile_id', TRACKER_STATE.currentProfile.id)
    .in('insight_type', TRACKER_INSIGHT_TYPES)
    .order('computed_at', { ascending: false });

  if (error) {
    const isMissingTable = error?.code === 'PGRST116' || error?.message?.includes('does not exist');
    if (!isMissingTable) {
      console.error('Insight fetch failed:', error);
    }
    return;
  }

  const map = new Map((data || []).map((entry) => [entry.insight_type, entry.insight_text]));
  renderInsightCard('sleep_mood', map.get('sleep_mood'));
  renderInsightCard('habit_energy', map.get('habit_energy'));
  renderInsightCard('study_window', map.get('study_window'));
}

async function recomputeInsights(scope = 'all') {
  if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentProfile) {
    return;
  }

  const { error } = await TRACKER_STATE.supabaseClient.rpc('recompute_tracker_insights', {
    p_profile_id: TRACKER_STATE.currentProfile.id,
    p_scope: scope,
  });

  if (error) {
    console.error('Insight recompute failed:', error);
    return;
  }

  await loadTrackerInsights();
}

async function loadTrackerOverview() {
  if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentProfile) {
    return;
  }

  const profileId = TRACKER_STATE.currentProfile.id;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - 62);
  const isoThreshold = dateThreshold.toISOString().slice(0, 10);

  const [sleepResult, studyResult, waterResult] = await Promise.all([
    TRACKER_STATE.supabaseClient
      .from('sleep_logs')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', isoThreshold)
      .order('date', { ascending: true }),
    TRACKER_STATE.supabaseClient
      .from('study_logs')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', isoThreshold)
      .order('date', { ascending: true }),
    TRACKER_STATE.supabaseClient
      .from('water_logs')
      .select('*')
      .eq('profile_id', profileId)
      .gte('logged_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: true }),
  ]);

  const hasMissingTable = (result) => result?.error?.code === 'PGRST116' || result?.error?.message?.includes('does not exist');
  
  if (sleepResult.error) {
    if (hasMissingTable(sleepResult)) {
      console.warn('Supabase tables not yet created. Follow SETUP_SUPABASE.md to initialize the database.');
    } else {
      console.error('Sleep fetch failed:', sleepResult.error);
    }
  }
  if (studyResult.error) {
    if (!hasMissingTable(studyResult)) console.error('Study fetch failed:', studyResult.error);
  }
  if (waterResult.error) {
    if (!hasMissingTable(waterResult)) console.error('Water fetch failed:', waterResult.error);
  }

  const sleepRows = sleepResult.data || [];
  const studyRows = studyResult.data || [];
  const waterRows = waterResult.data || [];

  renderOverviewCards(sleepRows, studyRows, waterRows);
  renderSleepChart(sleepRows);
  renderStudyHeatmap(studyRows);
  renderWaterRing(waterRows);
  await loadTrackerInsights();
}

window.bloomRefreshTrackerInsights = async function refreshTrackerInsights(scope = 'all') {
  await recomputeInsights(scope);
};

window.addEventListener('bloom:habit-toggled', async () => {
  await recomputeInsights('habit_energy');
});

window.addEventListener('bloom:tracker-data-updated', async (event) => {
  const scope = event.detail?.scope || 'all';
  await recomputeInsights(scope);
});

function openTrackerModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeTrackerModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

function updateSleepLogDuration() {
  const bed = document.getElementById('bedTime');
  const wake = document.getElementById('wakeTime');
  const output = document.getElementById('durationValue');
  if (!bed || !wake || !output) return;

  if (!bed.value || !wake.value) return;

  let [bedH, bedM] = bed.value.split(':').map(Number);
  let [wakeH, wakeM] = wake.value.split(':').map(Number);
  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;
  let diff = wakeMinutes - bedMinutes;
  if (diff <= 0) diff += 24 * 60;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  output.textContent = `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function selectSleepQuality(value) {
  document.querySelectorAll('.quality-opt').forEach((opt) => {
    opt.classList.toggle('selected', Number(opt.dataset.quality) === Number(value));
  });
}

function selectStudySubject(value) {
  document.querySelectorAll('.subject-chip').forEach((chip) => {
    chip.classList.toggle('selected', chip.dataset.subject === value);
  });
}

async function handleSleepLogSubmit(event) {
  event.preventDefault();

  if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentProfile) {
    return;
  }

  const dateInput = document.getElementById('sleep-log-date');
  const bedInput = document.getElementById('bedTime');
  const wakeInput = document.getElementById('wakeTime');
  const selectedQuality = document.querySelector('.quality-opt.selected');

  if (!dateInput || !bedInput || !wakeInput || !selectedQuality) return;

  let [bedH, bedM] = bedInput.value.split(':').map(Number);
  let [wakeH, wakeM] = wakeInput.value.split(':').map(Number);
  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;
  let diff = wakeMinutes - bedMinutes;
  if (diff <= 0) diff += 24 * 60;

  const hours = Number((diff / 60).toFixed(2));
  const { error } = await TRACKER_STATE.supabaseClient.from('sleep_logs').insert({
    profile_id: TRACKER_STATE.currentProfile.id,
    date: dateInput.value || getTrackerTodayISO(),
    hours,
    quality: Number(selectedQuality.dataset.quality || 3),
  });

  if (error) {
    console.error('Sleep log insert failed:', error);
    return;
  }

  closeTrackerModal('sleep-log-modal');
  await loadTrackerOverview();
  await recomputeInsights('sleep_mood');
}

async function handleStudyLogSubmit(event) {
  event.preventDefault();

  if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentProfile) {
    return;
  }

  const studyMode = document.querySelector('.study-mode-tab.active')?.dataset.studyMode || 'timer';
  const subjectChip = document.querySelector('.subject-chip.selected');

  let minutes = 0;
  if (studyMode === 'timer') {
    minutes = Number(window.__bloomStudySeconds || 0) / 60;
  } else {
    const valueInput = document.getElementById('study-minutes');
    minutes = Number(valueInput?.value || 0);
  }

  if (!minutes || minutes <= 0) {
    return;
  }

  const { error } = await TRACKER_STATE.supabaseClient.from('study_logs').insert({
    profile_id: TRACKER_STATE.currentProfile.id,
    date: getTrackerTodayISO(),
    minutes: Math.round(minutes),
    topic: subjectChip?.dataset.subject || 'General',
    started_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Study log insert failed:', error);
    return;
  }

  closeTrackerModal('study-log-modal');
  await loadTrackerOverview();
  await recomputeInsights('study_window');
}

function bindTrackerModals() {
  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-modal]');
    if (openButton) {
      openTrackerModal(openButton.dataset.openModal);
      return;
    }

    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) {
      closeTrackerModal(closeButton.dataset.closeModal);
      return;
    }

    const backdrop = event.target.closest('.tracker-modal-backdrop');
    if (backdrop && event.target === backdrop) {
      closeTrackerModal(backdrop.id);
    }
  });

  document.getElementById('bedTime')?.addEventListener('input', updateSleepLogDuration);
  document.getElementById('wakeTime')?.addEventListener('input', updateSleepLogDuration);
  document.getElementById('sleep-log-date')?.setAttribute('value', getTrackerTodayISO());
  updateSleepLogDuration();

  document.querySelectorAll('.quality-opt').forEach((opt) => {
    opt.addEventListener('click', () => selectSleepQuality(opt.dataset.quality));
  });

  document.querySelectorAll('.study-mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.studyMode;
      document.querySelectorAll('.study-mode-tab').forEach((item) => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });

      const manualPanel = document.getElementById('study-manual-panel');
      const timerPanel = document.getElementById('study-timer-panel');
      if (manualPanel) {
        manualPanel.classList.toggle('active', mode === 'manual');
      }
      if (timerPanel) {
        timerPanel.style.display = mode === 'timer' ? 'flex' : 'none';
      }
    });
  });

  document.querySelectorAll('.subject-chip').forEach((chip) => {
    chip.addEventListener('click', () => selectStudySubject(chip.dataset.subject));
  });

  document.getElementById('sleep-log-form')?.addEventListener('submit', handleSleepLogSubmit);
  document.getElementById('study-log-form')?.addEventListener('submit', handleStudyLogSubmit);

  const studyStartBtn = document.getElementById('study-start-btn');
  if (studyStartBtn) {
    studyStartBtn.addEventListener('click', () => {
      const timerValue = document.getElementById('study-timer-value');
      const ring = document.querySelector('.study-timer-ring');
      if (!timerValue || !ring) return;

      const isRunning = studyStartBtn.dataset.running === 'true';
      if (isRunning) {
        clearInterval(window.__bloomStudyTimer);
        studyStartBtn.dataset.running = 'false';
        studyStartBtn.textContent = 'Start';
        studyStartBtn.classList.remove('stop');
        studyStartBtn.classList.add('start');
        return;
      }

      studyStartBtn.dataset.running = 'true';
      studyStartBtn.textContent = 'Stop';
      studyStartBtn.classList.remove('start');
      studyStartBtn.classList.add('stop');
      window.__bloomStudySeconds = 0;
      window.__bloomStudyTimer = setInterval(() => {
        window.__bloomStudySeconds += 1;
        const totalSeconds = Number(window.__bloomStudySeconds || 0);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        timerValue.textContent = `${minutes}:${seconds}`;
        const pct = Math.min(100, (totalSeconds / 1800) * 100);
        ring.style.background = `conic-gradient(var(--sage) ${pct}%, var(--surface-2) 0)`;
      }, 1000);
    });
  }

  // Water button handlers
  document.querySelectorAll('.water-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!TRACKER_STATE.supabaseClient || !TRACKER_STATE.currentProfile) {
        console.warn('Not authenticated or profile not loaded');
        return;
      }

      const ml = btn.textContent.includes('+') ? 250 : Number(btn.textContent) || 250;
      const { error } = await TRACKER_STATE.supabaseClient.from('water_logs').insert({
        profile_id: TRACKER_STATE.currentProfile.id,
        logged_at: new Date().toISOString(),
        ml,
      });

      if (error) {
        console.error('Water log insert failed:', error);
        return;
      }

      // Refresh the water ring display
      await loadTrackerOverview();
      console.log(`Added ${ml}ml water`);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const trackerAuthMessage = document.getElementById('tracker-auth-message');
  if (trackerAuthMessage) {
    trackerAuthMessage.hidden = true;
  }

  bindTrackerModals();

  if (window.supabase) {
    initTrackerAuth();
  }
});
