/**
 * Pomodoro Timer & Focus Dashboard - Modern Pastel Web Application
 */

// Configuration for timer modes (duration in seconds)
const TIMER_MODES = {
  'focus': {
    duration: 25 * 60,
    label: 'Time to focus',
    title: 'Focus'
  },
  'short-break': {
    duration: 5 * 60,
    label: 'Time for a quick break',
    title: 'Short Break'
  },
  'long-break': {
    duration: 15 * 60,
    label: 'Time for a restful break',
    title: 'Long Break'
  }
};

// DOM Elements
const bodyEl = document.body;
const timeDisplayEl = document.getElementById('time-display');
const modeLabelEl = document.getElementById('mode-label');
const toggleBtn = document.getElementById('toggle-btn');
const toggleTextEl = document.getElementById('toggle-text');
const resetBtn = document.getElementById('reset-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const progressRing = document.getElementById('progress-ring');

// State Variables
let currentMode = 'focus';
let totalDuration = TIMER_MODES[currentMode].duration;
let remainingTime = totalDuration;
let timerId = null;
let isRunning = false;

// Progress Ring Geometry (radius = 140)
const RADIUS = 140;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Initialize Progress Ring
progressRing.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
progressRing.style.strokeDashoffset = '0';

/**
 * Format seconds into MM:SS format
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Update the circular SVG progress bar
 */
function updateProgressRing() {
  const progressRatio = (totalDuration - remainingTime) / totalDuration;
  const offset = CIRCUMFERENCE * progressRatio;
  progressRing.style.strokeDashoffset = offset;
}

/**
 * Update the display text, document title, and progress bar
 */
function renderTimer() {
  const formatted = formatTime(remainingTime);
  timeDisplayEl.textContent = formatted;
  document.title = `${formatted} - ${TIMER_MODES[currentMode].title} | Pomodoro`;
  updateProgressRing();
}

/**
 * Play a calm chime using Web Audio API when session completes
 */
function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Notes: gentle ascending pastel triad (F5, A5, C6)
    const notes = [698.46, 880.00, 1046.50];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + index * 0.18;
      const duration = 0.8;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch {
    // Audio context not allowed or unsupported; graceful ignore
  }
}

/**
 * Single tick of the timer (called every second)
 */
function timerTick() {
  if (remainingTime > 0) {
    remainingTime -= 1;
    renderTimer();

    if (remainingTime === 0) {
      pauseTimer();
      playCompletionChime();
      if (currentMode === 'focus') {
        recordCompletedSession();
      }
    }
  }
}

/**
 * Start the timer
 */
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  toggleTextEl.textContent = 'Pause';
  toggleBtn.setAttribute('aria-label', 'Pause timer');
  timerId = setInterval(timerTick, 1000);

  if (currentMode === 'focus' && typeof onFocusTimerStart === 'function') {
    onFocusTimerStart();
  }
}

/**
 * Pause the timer
 */
function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  toggleTextEl.textContent = 'Start';
  toggleBtn.setAttribute('aria-label', 'Start timer');
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  if (typeof onFocusTimerPause === 'function') {
    onFocusTimerPause();
  }
}

/**
 * Toggle between Start and Pause
 */
function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    // If timer completed and user clicks start again, reset to mode duration
    if (remainingTime === 0) {
      remainingTime = totalDuration;
      renderTimer();
    }
    startTimer();
  }
}

/**
 * Reset timer to current mode's initial state
 */
function resetTimer() {
  pauseTimer();
  remainingTime = totalDuration;
  renderTimer();
}

/**
 * Switch timer mode (Focus, Short Break, Long Break)
 * @param {string} mode
 */
function switchMode(mode) {
  if (!TIMER_MODES[mode]) return;

  pauseTimer();
  currentMode = mode;
  totalDuration = TIMER_MODES[mode].duration;
  remainingTime = totalDuration;

  // Update theme & labels
  bodyEl.setAttribute('data-mode', mode);
  modeLabelEl.textContent = TIMER_MODES[mode].label;

  // Update tab buttons
  tabButtons.forEach(btn => {
    const isSelected = btn.dataset.mode === mode;
    btn.classList.toggle('active', isSelected);
    btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  if (mode !== 'focus' && typeof onBreakModeSwitch === 'function') {
    onBreakModeSwitch();
  }

  renderTimer();
}

// Event Listeners for Timer Controls
toggleBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode !== currentMode) {
      switchMode(mode);
    }
  });
});

/* =========================================================
   PRODUCTIVITY ANALYTICS MODULE
   ========================================================= */

const ANALYTICS_STORAGE_KEY = 'pomodoro_daily_analytics';

// Analytics DOM Elements
const dateDisplayEl = document.getElementById('date-display');
const streakCountEl = document.getElementById('streak-count');
const statSessionsEl = document.getElementById('stat-sessions');
const statTimeEl = document.getElementById('stat-time');
const statTasksEl = document.getElementById('stat-tasks');
const goalStatusEl = document.getElementById('goal-status');
const goalBarEl = document.getElementById('goal-bar');
const cycleDotsEl = document.getElementById('cycle-dots');
const resetStatsBtn = document.getElementById('reset-stats-btn');

function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDisplayDate() {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date().toLocaleDateString(undefined, options);
}

function loadAnalytics() {
  const today = getTodayString();
  const defaultAnalytics = {
    date: today,
    sessionsCompleted: 0,
    totalFocusSeconds: 0,
    dailyGoal: 4,
    streak: 1,
    lastActiveDate: today
  };

  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return defaultAnalytics;
    const data = JSON.parse(raw);

    // If day changed, handle daily reset & streak calculation
    if (data.date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let streak = data.streak || 1;
      if (data.lastActiveDate === yesterdayStr && data.sessionsCompleted > 0) {
        streak += 1;
      } else if (data.lastActiveDate !== today && data.lastActiveDate !== yesterdayStr) {
        streak = 1;
      }

      const refreshed = {
        date: today,
        sessionsCompleted: 0,
        totalFocusSeconds: 0,
        dailyGoal: data.dailyGoal || 4,
        streak: streak,
        lastActiveDate: today
      };
      saveAnalytics(refreshed);
      return refreshed;
    }

    return {
      ...defaultAnalytics,
      ...data
    };
  } catch {
    return defaultAnalytics;
  }
}

function saveAnalytics(data) {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

let analytics = loadAnalytics();

function formatFocusTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  if (mins < 60) {
    return `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function renderAnalytics() {
  dateDisplayEl.textContent = formatDisplayDate();
  streakCountEl.textContent = `${analytics.streak} day streak`;

  statSessionsEl.textContent = analytics.sessionsCompleted;
  statTimeEl.textContent = formatFocusTime(analytics.totalFocusSeconds);

  // Sync tasks count from task tracker
  const completedTasks = tasks.filter(t => t.completed).length;
  statTasksEl.textContent = completedTasks;

  // Goal Progress
  const goal = analytics.dailyGoal || 4;
  goalStatusEl.textContent = `${analytics.sessionsCompleted} / ${goal} sessions`;
  const pct = Math.min(100, Math.round((analytics.sessionsCompleted / goal) * 100));
  goalBarEl.style.width = `${pct}%`;

  // Cycle Dots (4 dots per cycle)
  renderCycleDots(analytics.sessionsCompleted);
}

function renderCycleDots(completedSessions) {
  cycleDotsEl.innerHTML = '';
  const totalInCycle = 4;
  const currentInCycle = completedSessions % totalInCycle;
  const isCycleCompleted = completedSessions > 0 && currentInCycle === 0;

  for (let i = 0; i < totalInCycle; i++) {
    const dot = document.createElement('span');
    dot.className = 'cycle-dot';
    if (isCycleCompleted || i < currentInCycle) {
      dot.classList.add('filled');
    }
    cycleDotsEl.appendChild(dot);
  }
}

function recordCompletedSession() {
  analytics.sessionsCompleted += 1;
  analytics.totalFocusSeconds += totalDuration;
  analytics.lastActiveDate = getTodayString();
  saveAnalytics(analytics);
  renderAnalytics();
}

function resetTodayAnalytics() {
  if (confirm("Reset today's focus stats to 0?")) {
    analytics.sessionsCompleted = 0;
    analytics.totalFocusSeconds = 0;
    saveAnalytics(analytics);
    renderAnalytics();
  }
}

resetStatsBtn.addEventListener('click', resetTodayAnalytics);

/* =========================================================
   TASK TRACKER MODULE
   ========================================================= */

const STORAGE_KEY = 'pomodoro_session_tasks';

// Task Tracker DOM Elements
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const tasksCounter = document.getElementById('tasks-counter');
const tasksEmpty = document.getElementById('tasks-empty');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

/**
 * Load tasks from LocalStorage
 * @returns {Array}
 */
function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Persist tasks to LocalStorage
 * @param {Array} tasksList
 */
function saveTasks(tasksList) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksList));
  } catch {
    // Ignore storage quota or permission errors
  }
}

let tasks = loadTasks();

/**
 * Render the task items, progress counter, and empty state
 */
function renderTasks() {
  taskList.innerHTML = '';

  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;

  tasksCounter.textContent = `${completedCount} / ${totalCount}`;
  tasksEmpty.style.display = totalCount === 0 ? 'block' : 'none';
  clearCompletedBtn.style.display = completedCount > 0 ? 'inline-block' : 'none';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    // Checkbox button
    const checkBtn = document.createElement('button');
    checkBtn.className = 'task-checkbox-btn';
    checkBtn.setAttribute('type', 'button');
    checkBtn.setAttribute('aria-label', task.completed ? 'Mark task incomplete' : 'Mark task complete');
    checkBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    checkBtn.addEventListener('click', () => toggleTask(task.id));

    // Task text
    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;
    textSpan.addEventListener('click', () => toggleTask(task.id));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.setAttribute('type', 'button');
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
    deleteBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(checkBtn);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });

  // Keep analytics in sync with completed tasks
  if (typeof renderAnalytics === 'function') {
    renderAnalytics();
  }
}

/**
 * Add a new task
 * @param {string} text
 */
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const newTask = {
    id: Date.now().toString(),
    text: trimmed,
    completed: false,
    createdAt: Date.now()
  };

  tasks.push(newTask);
  saveTasks(tasks);
  renderTasks();
}

/**
 * Toggle task completion status
 * @param {string} id
 */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks(tasks);
  renderTasks();
}

/**
 * Delete a single task
 * @param {string} id
 */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderTasks();
}

/**
 * Clear all completed tasks
 */
function clearCompletedTasks() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks(tasks);
  renderTasks();
}

// Task Tracker Event Listeners
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTask(taskInput.value);
  taskInput.value = '';
});

clearCompletedBtn.addEventListener('click', clearCompletedTasks);

/* =========================================================
   AMBIENT AUDIO GENERATOR MODULE (Web Audio API)
   ========================================================= */

const AMBIENT_STORAGE_KEY = 'pomodoro_ambient_settings';

// DOM Elements
const ambientPlayBtn = document.getElementById('ambient-play-btn');
const ambientPlayIcon = document.getElementById('ambient-play-icon');
const ambientPlayText = document.getElementById('ambient-play-text');
const ambientMuteBtn = document.getElementById('ambient-mute-btn');
const ambientVolumeIcon = document.getElementById('ambient-volume-icon');
const ambientVolumeSlider = document.getElementById('ambient-volume-slider');
const ambientVolumeText = document.getElementById('ambient-volume-text');
const ambientAutoplayToggle = document.getElementById('ambient-autoplay-toggle');

// Audio Context & State
let ambientAudioCtx = null;
let ambientSourceNode = null;
let ambientGainNode = null;
let isAmbientPlaying = false;
let autoStartedByTimer = false;
let isMuted = false;

// Settings from LocalStorage
let ambientSettings = {
  volume: 50,
  autoPlay: false
};

try {
  const savedAmbient = localStorage.getItem(AMBIENT_STORAGE_KEY);
  if (savedAmbient) {
    ambientSettings = { ...ambientSettings, ...JSON.parse(savedAmbient) };
  }
} catch {
  // Ignore storage errors
}

function saveAmbientSettings() {
  try {
    localStorage.setItem(AMBIENT_STORAGE_KEY, JSON.stringify(ambientSettings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Initialize Web Audio Context and Gain Node
 */
function initAmbientAudio() {
  if (ambientAudioCtx) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  ambientAudioCtx = new AudioContext();

  // Create Master Gain Node
  ambientGainNode = ambientAudioCtx.createGain();
  ambientGainNode.gain.setValueAtTime(0, ambientAudioCtx.currentTime);
  ambientGainNode.connect(ambientAudioCtx.destination);
}

/**
 * Generate a 5-second seamless stereo Brown Noise AudioBuffer
 */
function createBrownNoiseBuffer() {
  const sampleRate = ambientAudioCtx.sampleRate;
  const bufferSize = sampleRate * 5;
  const buffer = ambientAudioCtx.createBuffer(2, bufferSize, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 2.8;
    }
  }
  return buffer;
}

/**
 * Get effective target gain (considering volume & mute)
 */
function getTargetGain() {
  if (isMuted) return 0;
  // Scaled curve (0 - 0.28 max gain so noise is never piercing or overdriven)
  return (ambientSettings.volume / 100) * 0.28;
}

/**
 * Start ambient audio with smooth fade-in
 */
function startAmbient(auto = false) {
  initAmbientAudio();
  if (!ambientAudioCtx) return;

  if (ambientAudioCtx.state === 'suspended') {
    ambientAudioCtx.resume();
  }

  autoStartedByTimer = auto;

  if (isAmbientPlaying) {
    ambientGainNode.gain.setTargetAtTime(getTargetGain(), ambientAudioCtx.currentTime, 0.2);
    return;
  }

  // Create and connect noise source
  const noiseBuffer = createBrownNoiseBuffer();
  ambientSourceNode = ambientAudioCtx.createBufferSource();
  ambientSourceNode.buffer = noiseBuffer;
  ambientSourceNode.loop = true;

  // Gentle low-pass filter to make it deeply warm and relaxing (~360Hz)
  const lowpass = ambientAudioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(360, ambientAudioCtx.currentTime);

  ambientSourceNode.connect(lowpass);
  lowpass.connect(ambientGainNode);

  // Smooth fade-in
  ambientGainNode.gain.setValueAtTime(0.0001, ambientAudioCtx.currentTime);
  ambientGainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, getTargetGain()), ambientAudioCtx.currentTime + 0.6);

  ambientSourceNode.start(0);
  isAmbientPlaying = true;
  updateAmbientUI();
}

/**
 * Stop ambient audio with smooth fade-out
 */
function stopAmbient() {
  if (!isAmbientPlaying || !ambientAudioCtx || !ambientSourceNode) return;

  autoStartedByTimer = false;
  ambientGainNode.gain.setValueAtTime(ambientGainNode.gain.value, ambientAudioCtx.currentTime);
  ambientGainNode.gain.linearRampToValueAtTime(0.0001, ambientAudioCtx.currentTime + 0.4);

  const nodeToStop = ambientSourceNode;
  ambientSourceNode = null;
  isAmbientPlaying = false;

  setTimeout(() => {
    try {
      nodeToStop.stop();
      nodeToStop.disconnect();
    } catch {}
  }, 450);

  updateAmbientUI();
}

/**
 * Toggle play/pause
 */
function toggleAmbient() {
  if (isAmbientPlaying) {
    stopAmbient();
  } else {
    startAmbient(false);
  }
}

/**
 * Update UI for play button, slider, and mute icon
 */
function updateAmbientUI() {
  if (isAmbientPlaying) {
    ambientPlayBtn.classList.add('playing');
    ambientPlayText.textContent = 'Pause';
    ambientPlayIcon.innerHTML = `
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    `;
  } else {
    ambientPlayBtn.classList.remove('playing');
    ambientPlayText.textContent = 'Play';
    ambientPlayIcon.innerHTML = `
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    `;
  }

  // Volume slider & text
  ambientVolumeSlider.value = ambientSettings.volume;
  ambientVolumeText.textContent = `${ambientSettings.volume}%`;

  // Mute button icon
  if (isMuted || ambientSettings.volume === 0) {
    ambientVolumeIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    `;
  } else {
    ambientVolumeIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    `;
  }

  ambientAutoplayToggle.checked = ambientSettings.autoPlay;
}

// Volume Slider Event
ambientVolumeSlider.addEventListener('input', (e) => {
  ambientSettings.volume = parseInt(e.target.value, 10);
  if (isMuted && ambientSettings.volume > 0) {
    isMuted = false;
  }
  if (ambientGainNode && ambientAudioCtx) {
    ambientGainNode.gain.setTargetAtTime(getTargetGain(), ambientAudioCtx.currentTime, 0.05);
  }
  saveAmbientSettings();
  updateAmbientUI();
});

// Mute Button Event
ambientMuteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  if (ambientGainNode && ambientAudioCtx) {
    ambientGainNode.gain.setTargetAtTime(getTargetGain(), ambientAudioCtx.currentTime, 0.05);
  }
  updateAmbientUI();
});

// Autoplay Toggle Event
ambientAutoplayToggle.addEventListener('change', (e) => {
  ambientSettings.autoPlay = e.target.checked;
  saveAmbientSettings();
});

// Play Button Event
ambientPlayBtn.addEventListener('click', toggleAmbient);

// Hooks for Timer Events
function onFocusTimerStart() {
  if (ambientSettings.autoPlay && !isAmbientPlaying) {
    startAmbient(true);
  }
}

function onFocusTimerPause() {
  if (ambientSettings.autoPlay && autoStartedByTimer && isAmbientPlaying) {
    stopAmbient();
  }
}

function onBreakModeSwitch() {
  if (ambientSettings.autoPlay && isAmbientPlaying) {
    stopAmbient();
  }
}

// Initial Renders
renderTimer();
renderTasks();
renderAnalytics();
updateAmbientUI();
