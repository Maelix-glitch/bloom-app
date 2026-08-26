const HABIT_ICONS = ['⭐', '💧', '🌿', '🚶', '📚', '🧘', '🏃', '🧠', '💤', '📝', '🎯', '🔥'];

const bloomState = {
  habits: [],
  completedToday: new Set(),
  currentProfile: null,
};

let dashboardReady = false;

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showHabitError(message) {
  const errorBox = document.getElementById('habit-form-error');
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideHabitError() {
  const errorBox = document.getElementById('habit-form-error');
  if (!errorBox) return;
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

function showProfileError(message) {
  const errorBox = document.getElementById('dashboard-error');
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideProfileError() {
  const errorBox = document.getElementById('dashboard-error');
  if (!errorBox) return;
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

function resetHabitForm() {
  const form = document.getElementById('habit-form');
  if (!form) return;
  form.reset();
  const defaultIcon = document.querySelector('[data-icon-option="⭐"]');
  if (defaultIcon) {
    document.querySelectorAll('.icon-option').forEach((option) => {
      option.classList.toggle('selected', option.dataset.iconOption === '⭐');
    });
  }
  const defaultPoints = document.getElementById('habit-points');
  if (defaultPoints) {
    defaultPoints.value = 10;
  }
  const frequency = document.getElementById('habit-frequency');
  if (frequency) {
    frequency.value = 'daily';
  }
  hideHabitError();
}

function openHabitModal() {
  if (window.BloomAddHabit) {
    BloomAddHabit.open();
  }
}

function closeHabitModal() {
  if (window.BloomAddHabit) {
    BloomAddHabit.close();
  }
}

function setPointsDisplay(value) {
  const pointsValue = document.getElementById('points-pill-value');
  if (!pointsValue) return;
  pointsValue.textContent = String(value || 0);

  const pointsPill = document.getElementById('points-pill');
  if (pointsPill) {
    pointsPill.classList.remove('pulse');
    void pointsPill.offsetWidth;
    pointsPill.classList.add('pulse');
  }
}

function buildStreakCount(rows, habitId) {
  const dates = new Set(
    (rows || [])
      .filter((row) => row.habit_id === habitId)
      .map((row) => row.completed_at)
      .filter(Boolean)
  );

  const today = new Date();
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - offset);
    const iso = checkDate.toISOString().slice(0, 10);

    if (dates.has(iso)) {
      streak += 1;
    } else if (offset > 0) {
      break;
    } else {
      break;
    }
  }

  return streak;
}

async function ensureCurrentProfileRecord() {
  if (!supabaseClient || !currentUser) {
    return;
  }

  hideProfileError();

  const userProfileKey = selectedProfile && PROFILES[selectedProfile] ? PROFILES[selectedProfile] : 'Bloom User';

  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Profile lookup failed:', profileError);
    showProfileError('Profile lookup failed. Please sign out and back in to recreate your profile row.');
    return;
  }

  if (!profileData) {
    const { error: insertError } = await supabaseClient.from('profiles').insert({
      id: currentUser.id,
      profile_name: userProfileKey,
      total_points: 0,
    });

    if (insertError) {
      console.error('Failed to create profile record:', insertError);
      showProfileError('Could not create your profile row. Please sign out and sign back in.');
      return;
    }
  }

  const { data: refreshedProfile, error: refreshError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (refreshError) {
    console.error('Error loading profile row:', refreshError);
    showProfileError('Your profile row could not be loaded. Please try signing in again.');
    return;
  }

  bloomState.currentProfile = refreshedProfile || {
    id: currentUser.id,
    profile_name: userProfileKey,
    total_points: 0,
  };

  if (bloomState.currentProfile.profile_name) {
    currentProfileDisplay.textContent = bloomState.currentProfile.profile_name;
  }
}

async function refreshPoints() {
  if (!supabaseClient || !currentUser) {
    return;
  }

  const { data: profileData, error } = await supabaseClient
    .from('profiles')
    .select('total_points')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error) {
    console.error('Point fetch failed:', error);
    return;
  }

  const totalPoints = profileData?.total_points ?? 0;
  setPointsDisplay(totalPoints);
  if (bloomState.currentProfile) {
    bloomState.currentProfile.total_points = totalPoints;
  }
}

async function loadHabits() {
  if (!supabaseClient || !currentUser || !bloomState.currentProfile) {
    return;
  }

  const listEl = document.getElementById('habit-list');
  const emptyEl = document.getElementById('habit-empty-state');

  if (!listEl || !emptyEl) return;

  const { data: habits, error: habitsError } = await supabaseClient
    .from('habits')
    .select('*')
    .eq('profile_id', bloomState.currentProfile.id)
    .eq('archived', false)
    .order('created_at', { ascending: true });

  if (habitsError) {
    console.error('Habit fetch failed:', habitsError);
    return;
  }

  const { data: logs, error: logsError } = await supabaseClient
    .from('habit_logs')
    .select('*')
    .eq('profile_id', bloomState.currentProfile.id);

  if (logsError) {
    console.error('Habit log fetch failed:', logsError);
    return;
  }

  const todayISO = getTodayISO();
  const todayCompleteSet = new Set(
    (logs || [])
      .filter((log) => log.completed_at === todayISO)
      .map((log) => log.habit_id)
  );

  bloomState.habits = habits || [];
  bloomState.completedToday = todayCompleteSet;

  if (!bloomState.habits.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'flex';
    return;
  }

  emptyEl.style.display = 'none';

  listEl.innerHTML = bloomState.habits
    .map((habit) => {
      const completed = todayCompleteSet.has(habit.id);
      const streak = buildStreakCount(logs || [], habit.id);
      return `
        <div class="habit reveal ${completed ? 'done' : ''}" data-habit-id="${habit.id}">
          <button type="button" class="check ${completed ? 'done' : ''}" data-habit-id="${habit.id}" aria-label="Toggle ${escapeHtml(habit.name)} complete">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6L5 9L10 3" stroke="#14151F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="habit-body">
            <div class="habit-name"><span class="habit-icon">${escapeHtml(habit.icon || '⭐')}</span> ${escapeHtml(habit.name)}</div>
            <div class="habit-meta">${habit.frequency === 'weekly' ? 'Weekly' : 'Daily'} · ${habit.point_value} pts</div>
          </div>
          <div class="streak">🔥 ${streak}</div>
        </div>
      `;
    })
    .join('');

  document.querySelectorAll('.check').forEach((checkButton) => {
    checkButton.addEventListener('click', async () => {
      const habitId = checkButton.dataset.habitId;
      if (!habitId) return;
      await toggleHabitCompletion(habitId);
    });
  });
}

async function toggleHabitCompletion(habitId) {
  if (!supabaseClient || !bloomState.currentProfile) return;

  const habit = bloomState.habits.find((entry) => entry.id === habitId);
  if (!habit) return;

  const todayISO = getTodayISO();
  const isCompleted = bloomState.completedToday.has(habitId);
  const checkButton = document.querySelector(`.check[data-habit-id="${habitId}"]`);
  if (checkButton) {
    checkButton.disabled = true;
  }

  try {
    if (!isCompleted) {
      const { error: insertError } = await supabaseClient.from('habit_logs').insert({
        habit_id: habitId,
        profile_id: bloomState.currentProfile.id,
        completed_at: todayISO,
        points_earned: Number(habit.point_value),
      });

      if (insertError) {
        console.error('Habit completion insert failed:', insertError);
        return;
      }

      await supabaseClient.rpc('adjust_points', {
        profile_id_input: bloomState.currentProfile.id,
        delta: Number(habit.point_value),
      });
    } else {
      const { error: deleteError } = await supabaseClient
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('profile_id', bloomState.currentProfile.id)
        .eq('completed_at', todayISO);

      if (deleteError) {
        console.error('Habit completion delete failed:', deleteError);
        return;
      }

      await supabaseClient.rpc('adjust_points', {
        profile_id_input: bloomState.currentProfile.id,
        delta: Number(habit.point_value) * -1,
      });
    }

    await refreshPoints();
    await loadHabits();
    window.dispatchEvent(new CustomEvent('bloom:habit-toggled'));
  } catch (error) {
    console.error('Toggle habit failed:', error);
  } finally {
    if (checkButton) {
      checkButton.disabled = false;
    }
  }
}

function getSelectedHabitIcon() {
  const preview = document.getElementById('iconPreview');
  if (!preview) return '⭐';

  if (preview.querySelector('img')) {
    return preview.querySelector('img').src || '⭐';
  }

  return preview.textContent.trim() || '⭐';
}

function getSelectedHabitFrequency() {
  const selectedChip = document.querySelector('.chip[data-freq].selected');
  return selectedChip?.dataset?.freq || 'daily';
}

function getSelectedHabitPriority() {
  const selectedChip = document.querySelector('.chip[data-priority].selected');
  return selectedChip?.dataset?.priority || 'medium';
}

async function handleHabitSubmit(event) {
  event.preventDefault();

  if (!supabaseClient || !currentUser || !bloomState.currentProfile) {
    showHabitError('You must be signed in to add a habit.');
    return;
  }

  const nameInput = document.getElementById('habit-name');
  const pointValueEl = document.getElementById('pointsValue');

  const habitName = (nameInput?.value || '').trim();
  const selectedIcon = getSelectedHabitIcon();
  const selectedFrequency = getSelectedHabitFrequency();
  const pointValue = Number(pointValueEl?.textContent || 10);
  const selectedPriority = getSelectedHabitPriority();
  const reminderEnabled = document.getElementById('reminderSwitch')?.classList.contains('on');
  const reminderTimeInput = document.getElementById('habit-reminder-time');
  const reminderTime = reminderEnabled && reminderTimeInput ? reminderTimeInput.value || '08:00' : null;

  if (!habitName) {
    showHabitError('Please enter a habit name.');
    return;
  }

  if (habitName.length > 60) {
    showHabitError('Habit names must be 60 characters or fewer.');
    return;
  }

  if (!Number.isInteger(pointValue) || pointValue < 1 || pointValue > 500) {
    showHabitError('Points must be a whole number between 1 and 500.');
    return;
  }

  hideHabitError();

  const { data, error } = await supabaseClient
    .from('habits')
    .insert({
      profile_id: bloomState.currentProfile.id,
      name: habitName,
      icon: selectedIcon,
      frequency: selectedFrequency,
      point_value: pointValue,
      priority: selectedPriority,
      reminder_time: reminderTime,
      archived: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Habit insert failed:', error);
    showHabitError(error.message || 'Could not create the habit.');
    return;
  }

  closeHabitModal();
  await loadHabits();
  console.log('Habit created:', data);
}

async function initializeBloomDashboard() {
  if (!supabaseClient || !currentUser || dashboardReady) {
    return;
  }

  dashboardReady = true;

  await ensureCurrentProfileRecord();
  if (!bloomState.currentProfile) {
    dashboardReady = false;
    return;
  }

  await refreshPoints();
  await loadHabits();

  const addRow = document.getElementById('add-habit-row');
  if (addRow) {
    addRow.addEventListener('click', openHabitModal);
  }

  const emptyAddButton = document.getElementById('btn-empty-add-habit');
  if (emptyAddButton) {
    emptyAddButton.addEventListener('click', openHabitModal);
  }

  const closeButton = document.getElementById('btn-close-habit-modal');
  if (closeButton) {
    closeButton.addEventListener('click', closeHabitModal);
  }

  const cancelButton = document.getElementById('btn-cancel-habit');
  if (cancelButton) {
    cancelButton.addEventListener('click', closeHabitModal);
  }

  const modal = document.getElementById('habit-modal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeHabitModal();
      }
    });
  }

  document.querySelectorAll('.icon-option').forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.icon-option').forEach((item) => item.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  const form = document.getElementById('habit-form');
  if (form) {
    form.addEventListener('submit', handleHabitSubmit);
  }

  // Set up BloomAddHabit modal handler
  if (window.BloomAddHabit && supabaseClient) {
    window.BloomAddHabit.onSubmit = async (payload) => {
      try {
        // Transform v3 modal payload to Supabase schema
        const iconValue = payload.icon.type === 'emoji' ? payload.icon.value : JSON.stringify(payload.icon);
        
        const { data, error } = await supabaseClient
          .from('habits')
          .insert({
            profile_id: bloomState.currentProfile.id,
            name: payload.name,
            icon: iconValue,
            color: payload.color || 'amber',
            note: payload.note || '',
            tags: payload.tags || [],
            frequency: payload.frequency,
            days: payload.days || [],
            times_per_week: payload.timesPerWeek || null,
            goal: payload.goal ? JSON.stringify(payload.goal) : null,
            point_value: payload.points || 10,
            priority: payload.priority || 'medium',
            reminder_time: payload.reminder?.enabled ? payload.reminder.time : null,
            start_date: payload.startDate,
            archived: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Habit insert failed:', error);
          throw new Error(error.message || 'Could not create the habit.');
        }

        console.log('Habit created:', data);
        await loadHabits();
        
      } catch (err) {
        console.error('BloomAddHabit submission error:', err);
        showHabitError(err.message || 'Failed to create habit. Please try again.');
        throw err;
      }
    };
  }
}

window.bloomInitDashboard = async function bloomInitDashboard() {
  await initializeBloomDashboard();
};

window.resetBloomDashboard = function resetBloomDashboard() {
  dashboardReady = false;
  bloomState.habits = [];
  bloomState.completedToday = new Set();
  bloomState.currentProfile = null;

  hideProfileError();

  const listEl = document.getElementById('habit-list');
  const emptyState = document.getElementById('habit-empty-state');
  if (listEl) listEl.innerHTML = '';
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  closeHabitModal();
};

window.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('habit-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  const iconPreview = document.getElementById('iconPreview');
  if (iconPreview) {
    iconPreview.textContent = '⭐';
  }

  const defaultPoints = document.getElementById('pointsValue');
  if (defaultPoints) {
    defaultPoints.textContent = '10';
  }

  const presetTabs = document.querySelectorAll('.icon-tab');
  presetTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextTab = tab.dataset.tab;
      document.querySelectorAll('.icon-tab').forEach((item) => item.classList.toggle('active', item.dataset.tab === nextTab));
      document.querySelectorAll('.icon-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${nextTab}`));
    });
  });

  const iconOptions = document.querySelectorAll('.icon-opt');
  iconOptions.forEach((option) => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.icon-opt').forEach((item) => item.classList.remove('selected'));
      option.classList.add('selected');
      const preview = document.getElementById('iconPreview');
      if (preview) {
        preview.innerHTML = option.dataset.icon || '⭐';
      }
    });
  });

  document.querySelectorAll('.chip[data-freq]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-freq]').forEach((item) => item.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  document.querySelectorAll('.chip[data-priority]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-priority]').forEach((item) => item.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  document.querySelectorAll('.step-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const currentValue = Number(document.getElementById('pointsValue')?.textContent || 10);
      const delta = Number(button.dataset.step || 0);
      const nextValue = Math.max(5, Math.min(500, currentValue + delta));
      const pointsValue = document.getElementById('pointsValue');
      if (pointsValue) {
        pointsValue.textContent = String(nextValue);
      }
    });
  });

  const advancedToggle = document.getElementById('advToggle');
  if (advancedToggle) {
    advancedToggle.addEventListener('click', () => {
      const panel = document.getElementById('advPanel');
      advancedToggle.classList.toggle('open');
      panel?.classList.toggle('open');
    });
    advancedToggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advancedToggle.click();
      }
    });
  }

  const reminderSwitch = document.getElementById('reminderSwitch');
  if (reminderSwitch) {
    reminderSwitch.addEventListener('click', () => {
      reminderSwitch.classList.toggle('on');
      const reminderTime = document.getElementById('reminderTime');
      reminderTime?.classList.toggle('open');
    });
    reminderSwitch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        reminderSwitch.click();
      }
    });
  }

  const form = document.getElementById('habit-form');
  if (form) {
    form.addEventListener('submit', handleHabitSubmit);
  }

  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const dropzoneContent = document.getElementById('dropzoneContent');

  if (fileInput && dropzone && dropzoneContent) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const imageUrl = loadEvent.target?.result || '';
        const preview = document.getElementById('iconPreview');
        if (preview) {
          preview.innerHTML = `<img src="${imageUrl}" alt="Custom habit icon" />`;
        }
        dropzoneContent.innerHTML = `
          <div class="dropzone-preview">
            <img src="${imageUrl}" alt="Custom habit icon" />
            <div>
              <div class="dropzone-text">${file.name}</div>
              <button type="button" class="dropzone-remove" id="removeCustomIcon">Remove</button>
            </div>
          </div>
        `;

        const removeButton = document.getElementById('removeCustomIcon');
        removeButton?.addEventListener('click', () => {
          fileInput.value = '';
          dropzoneContent.innerHTML = `
            <div class="dropzone-icon">🖼️</div>
            <div class="dropzone-text">Drop an image or click to upload</div>
            <div class="dropzone-sub">PNG or JPG, up to 2MB — works best square</div>
          `;
          const preview = document.getElementById('iconPreview');
          if (preview) {
            preview.textContent = '⭐';
          }
          document.querySelectorAll('.icon-opt').forEach((item) => item.classList.remove('selected'));
          const defaultIcon = document.querySelector('.icon-opt[data-icon="⭐"]');
          defaultIcon?.classList.add('selected');
        });
      };
      reader.readAsDataURL(file);
    });

    ['dragover', 'dragenter'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        fileInput.files = event.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });
  }
});
