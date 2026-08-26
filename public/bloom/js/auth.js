/**
 * Bloom — Authentication & Profile Management
 * Handles Supabase connection, magic link auth, and profile selection
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// TODO: Replace these with your actual Supabase project credentials
// You can find these at: https://app.supabase.com/project/[project-id]/settings/api
const SUPABASE_URL = 'https://zsqsfxmjphctknnumgsi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tZoeD9y0_faPskrhd2aNmQ_tLqHuNtJ';

// Profile names (customize these as needed)
const PROFILES = {
  profile1: 'Alex',
  profile2: 'Jordan',
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let supabaseClient = null;
let currentUser = null;
let selectedProfile = null;
let currentProfile = null;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const btnAuthSubmit = document.getElementById('btn-auth');
const btnLogout = document.getElementById('btn-logout');
const authEmailInput = document.getElementById('auth-email');
const authLoading = document.getElementById('auth-loading');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const authSuccess = document.getElementById('auth-success');
const currentProfileDisplay = document.getElementById('current-profile');

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeApp() { 
    // TEMPORARY local visual-preview mode.
  // Open the app with ?preview=1 to skip the login screen UI.
  if (new URLSearchParams(window.location.search).has('preview')) {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');

    if (authScreen) authScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';

    console.warn('Bloom preview mode: login UI skipped. Supabase data remains protected.');
    return;
  }
  // Initialize Supabase client
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✓ Supabase client initialized');
  } catch (error) {
    console.error('✗ Failed to initialize Supabase:', error);
    showAuthError(
      'Connection failed. Check your Supabase credentials in js/auth.js'
    );
    return;
  }

  // Check for existing session
  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error('✗ Error checking session:', sessionError);
  }

  if (session && session.user) {
    currentUser = session.user;
    console.log('✓ Existing session found:', currentUser.email);

    try {
      await ensureProfileRowForCurrentUser();
    } catch (error) {
      console.error('Failed to ensure profile row for existing session:', error);
      showAuthError('Your profile could not be set up. Please sign out and sign back in.');
      return;
    }

    // Try to restore saved profile
    const savedProfile = localStorage.getItem('bloom_selected_profile');
    if (savedProfile && PROFILES[savedProfile]) {
      selectedProfile = savedProfile;
      console.log('✓ Profile restored from localStorage:', PROFILES[selectedProfile]);
      showAppScreen();
    } else {
      // If no profile saved, show selection
      showAuthScreen();
    }
  } else {
    // No session, show auth screen
    console.log('No active session');
    showAuthScreen();
  }

  // Listen for auth state changes (e.g., magic link callback)
  const {
    data: { subscription },
  } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);

    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      console.log('✓ User signed in:', currentUser.email);

      try {
        await ensureProfileRowForCurrentUser();
      } catch (error) {
        console.error('Failed to create profile row after sign-in:', error);
        showAuthError('Your profile could not be created. Please restart the sign-in flow.');
        return;
      }

      // If we have a selected profile, show app screen
      if (selectedProfile && PROFILES[selectedProfile]) {
        showAppScreen();
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      selectedProfile = null;
      localStorage.removeItem('bloom_selected_profile');
      showAuthScreen();
    }
  });

  return subscription;
}

// ============================================================================
// UI SCREEN MANAGEMENT
// ============================================================================

function showAuthScreen() {
  authScreen.style.display = 'block';
  appScreen.style.display = 'none';
  clearAuthForm();
  if (window.resetBloomDashboard) {
    window.resetBloomDashboard();
  }
}

function showAppScreen() {
  authScreen.style.display = 'none';
  appScreen.style.display = 'block';
  if (selectedProfile && PROFILES[selectedProfile]) {
    currentProfileDisplay.textContent = PROFILES[selectedProfile];
  }
  if (window.bloomInitDashboard) {
    window.bloomInitDashboard();
  }
}

function clearAuthForm() {
  authEmailInput.value = '';
  authLoading.style.display = 'none';
  authError.style.display = 'none';
  authSuccess.style.display = 'none';
}

function showAuthError(message) {
  authError.style.display = 'block';
  authErrorText.textContent = message;
  authLoading.style.display = 'none';
  authSuccess.style.display = 'none';
}

async function ensureProfileRowForCurrentUser() {
  if (!supabaseClient || !currentUser) {
    return null;
  }

  const profileName = selectedProfile && PROFILES[selectedProfile]
    ? PROFILES[selectedProfile]
    : 'Bloom User';

  const { data: existingProfile, error: lookupError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    console.error('Profile lookup failed:', lookupError);
    throw lookupError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: createdProfile, error: insertError } = await supabaseClient
    .from('profiles')
    .insert({
      id: currentUser.id,
      profile_name: profileName,
      total_points: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create profile record:', insertError);
    throw insertError;
  }

  return createdProfile;
}

function showAuthSuccess() {
  authSuccess.style.display = 'block';
  authError.style.display = 'none';
  authLoading.style.display = 'none';
}

function showAuthLoading() {
  authLoading.style.display = 'block';
  authError.style.display = 'none';
  authSuccess.style.display = 'none';
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function handleProfileSelect(profileKey) {
  // Validate profile exists
  if (!PROFILES[profileKey]) {
    showAuthError('Invalid profile selected');
    return;
  }

  selectedProfile = profileKey;
  localStorage.setItem('bloom_selected_profile', profileKey);
  console.log('Profile selected:', PROFILES[profileKey]);

  // Email is required to proceed
  const email = authEmailInput.value.trim();
  if (!email) {
    showAuthError('Please enter your email address');
    return;
  }

  await sendMagicLink(email);
}

async function sendMagicLink(email) {
  if (!supabaseClient) {
    showAuthError('Supabase not initialized. Check your configuration.');
    return;
  }

  if (!email || !email.includes('@')) {
    showAuthError('Please enter a valid email address');
    return;
  }

  showAuthLoading();

  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      showAuthError(error.message || 'Failed to send magic link');
      return;
    }

    console.log('✓ Magic link sent to:', email);
    showAuthSuccess();
  } catch (error) {
    console.error('Unexpected error sending magic link:', error);
    showAuthError('Something went wrong. Please try again.');
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Profile selection buttons
document.querySelectorAll('.btn-profile').forEach((button) => {
  button.addEventListener('click', (e) => {
    const profileKey = e.currentTarget.dataset.profile;

    // Update button states (visual feedback)
    document.querySelectorAll('.btn-profile').forEach((btn) => {
      btn.classList.toggle(
        'btn-primary',
        btn.dataset.profile === profileKey
      );
      btn.classList.toggle('btn-secondary', btn.dataset.profile !== profileKey);
    });

    handleProfileSelect(profileKey);
  });
});

// Auth submit button (send magic link)
if (btnAuthSubmit) {
  btnAuthSubmit.addEventListener('click', async () => {
    if (!selectedProfile) {
      showAuthError('Please select a profile first');
      return;
    }
    await sendMagicLink(authEmailInput.value.trim());
  });
}

// Allow pressing Enter in email field
if (authEmailInput) {
  authEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnAuthSubmit?.click();
    }
  });
}

// Logout button
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (!supabaseClient) return;

    try {
      await supabaseClient.auth.signOut();
      console.log('✓ User signed out');
      showAuthScreen();
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
}

// ============================================================================
// START APP
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});
