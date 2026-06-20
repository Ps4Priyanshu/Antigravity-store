/* ============================================================
   FocusFlow — Application Logic
   Full-featured productivity app with localStorage persistence
   ============================================================ */

// ==================== DATA LAYER ====================

const STORAGE_KEYS = {
  TASKS: 'focusflow_tasks',
  HABITS: 'focusflow_habits',
  EVENTS: 'focusflow_events',
  SESSIONS: 'focusflow_sessions',
  ACTIVITY: 'focusflow_activity',
  SETTINGS: 'focusflow_settings',
  EXAMS: 'focusflow_exams',
  TARGETS: 'focusflow_targets',
};

function loadData(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ==================== STATE ====================

const defaultSettings = {
  user: { name: 'Student', initials: 'S' },
  goals: { weeklyStudyHours: 15 },
  timerPreset: { focus: 25, short: 5, long: 15 },
  theme: 'default',
};

const loadedSettings = loadData(STORAGE_KEYS.SETTINGS) || {};
const finalSettings = {
  ...defaultSettings,
  ...loadedSettings,
  user: { ...defaultSettings.user, ...(loadedSettings.user || {}) },
  goals: { ...defaultSettings.goals, ...(loadedSettings.goals || {}) },
  timerPreset: { ...defaultSettings.timerPreset, ...(loadedSettings.timerPreset || {}) }
};

const defaultHabits = [
  { id: 'h-read', name: 'Reading', icon: '📖', color: 'purple', goal: 5, weekChecks: {}, createdAt: Date.now() },
  { id: 'h-exec', name: 'Exercise', icon: '🏃', color: 'green', goal: 5, weekChecks: {}, createdAt: Date.now() },
  { id: 'h-water', name: 'Water Intake', icon: '💧', color: 'blue', goal: 7, weekChecks: {}, createdAt: Date.now() },
  { id: 'h-med', name: 'Meditation', icon: '🧘', color: 'amber', goal: 7, weekChecks: {}, createdAt: Date.now() },
];

let state = {
  tasks: loadData(STORAGE_KEYS.TASKS) || [],
  habits: loadData(STORAGE_KEYS.HABITS) || defaultHabits,
  events: loadData(STORAGE_KEYS.EVENTS) || [],
  sessions: loadData(STORAGE_KEYS.SESSIONS) || [],
  activity: loadData(STORAGE_KEYS.ACTIVITY) || {},
  exams: loadData(STORAGE_KEYS.EXAMS) || [],
  targets: loadData(STORAGE_KEYS.TARGETS) || [],
  settings: finalSettings,
  currentPage: 'dashboard',
  currentFilter: 'all',
  taskSearchQuery: '',
  weekOffset: 0,
  timer: {
    duration: finalSettings.timerPreset.focus * 60,
    remaining: finalSettings.timerPreset.focus * 60,
    isRunning: false,
    interval: null,
    mode: 'focus',
  },
};

function persist() {
  saveData(STORAGE_KEYS.TASKS, state.tasks);
  saveData(STORAGE_KEYS.HABITS, state.habits);
  saveData(STORAGE_KEYS.EVENTS, state.events);
  saveData(STORAGE_KEYS.SESSIONS, state.sessions);
  saveData(STORAGE_KEYS.ACTIVITY, state.activity);
  saveData(STORAGE_KEYS.SETTINGS, state.settings);
  saveData(STORAGE_KEYS.EXAMS, state.exams);
  saveData(STORAGE_KEYS.TARGETS, state.targets);
}

// ==================== NAVIGATION ====================

function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.toggle('active', view.id === `page-${page}`);
  });
  const titles = {
    dashboard: ['Dashboard', 'Welcome back! Here\'s your productivity overview.'],
    tasks: ['Tasks', 'Manage and organize all your tasks.'],
    habits: ['Habits', 'Build consistency with daily habit tracking.'],
    timer: ['Focus Timer', 'Stay focused with Pomodoro sessions.'],
    planner: ['Study Planner', 'Plan and organize your study week.'],
    settings: ['Settings', 'Customize your preferences, goals, and layout.'],
  };
  const [title, subtitle] = titles[page] || ['FocusFlow', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle;
  renderPage(page);
  closeMobileSidebar();
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'tasks': renderTasks(); break;
    case 'habits': renderHabits(); break;
    case 'timer': renderTimerStats(); break;
    case 'planner': renderPlanner(); break;
    case 'settings': renderSettings(); break;
  }
}

// ==================== DASHBOARD ====================

function renderDashboard() {
  applyProfileChanges();
  const hour = new Date().getHours();
  let greeting = 'morning';
  if (hour >= 12 && hour < 17) greeting = 'afternoon';
  else if (hour >= 17) greeting = 'evening';
  document.getElementById('greetingTime').textContent = greeting;
  document.getElementById('greetingUsername').textContent = state.settings.user.name;
  const now = new Date();
  document.getElementById('dashHeroDate').textContent =
    now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const today = getDateString(now);
  const pendingTasks = state.tasks.filter(t => !t.completed);
  const completedTasks = state.tasks.filter(t => t.completed);
  const todaySessions = getTodaySessions();
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  const weekSessions = getWeekSessions();
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
  const todayCompletedTasks = state.tasks.filter(t => t.completed && t.completedDate === today);
  document.getElementById('dashPendingCount').textContent = pendingTasks.length;
  document.getElementById('dashFocusToday').textContent = todaySessions.length;
  const prodScore = calculateProductivityScore();
  document.getElementById('prodScoreValue').textContent = prodScore;
  const circumference = 2 * Math.PI * 60;
  const prodOffset = circumference * (1 - prodScore / 100);
  document.getElementById('prodRingProgress').style.strokeDashoffset = prodOffset;
  const captions = [
    [90, "Outstanding! You're on fire! 🔥"],
    [70, "Great progress — keep it up! 💪"],
    [40, "Good start — stay consistent! 📈"],
    [0,  "Complete tasks & habits to boost your score"]
  ];
  const caption = captions.find(([min]) => prodScore >= min)[1];
  document.getElementById('prodCaption').textContent = caption;
  document.getElementById('statCompletedToday').textContent = todayCompletedTasks.length;
  document.getElementById('statStreak').textContent = getMaxHabitStreak();
  document.getElementById('statStudyHours').textContent = formatHours(todayMinutes);
  const habitRate = calculateHabitRate();
  document.getElementById('statHabitRate').textContent = `${habitRate}%`;
  const miniCirc = 2 * Math.PI * 14;
  const miniOffset = miniCirc * (1 - habitRate / 100);
  document.getElementById('habitMiniProgress').style.strokeDashoffset = miniOffset;
  const streakEl = document.getElementById('streakTrend');
  const streak = getMaxHabitStreak();
  if (streak > 0) {
    streakEl.className = 'metric-trend positive';
    streakEl.innerHTML = '<span>↑</span> Active';
  } else {
    streakEl.className = 'metric-trend neutral';
    streakEl.innerHTML = '<span>–</span> Start today';
  }
  renderSparkline('sparkTasks', getLast7DaysCounts('tasks'));
  renderSparkline('sparkStudy', getLast7DaysCounts('sessions'));
  renderActivityChart();
  document.getElementById('studyHoursBig').textContent = formatHoursLong(weekMinutes);
  document.getElementById('studyToday').textContent = `${todayMinutes}m`;
  document.getElementById('studyWeek').textContent = `${weekMinutes}m`;
  document.getElementById('studySessions').textContent = weekSessions.length;
  document.getElementById('studyHoursGoal').textContent = state.settings.goals.weeklyStudyHours;
  renderHabitCompletionCard();
  const recentEl = document.getElementById('dashRecentTasks');
  const recentTasks = [...state.tasks].reverse().slice(0, 6);
  if (recentTasks.length === 0) {
    recentEl.innerHTML = `<p class="dash-empty-text">No tasks yet. Add your first task!</p>`;
  } else {
    recentEl.innerHTML = recentTasks.map(task => `
      <div class="dash-task-item" onclick="navigateTo('tasks')">
        <span class="task-dot priority-${task.priority}"></span>
        <span class="task-name ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</span>
        <span class="task-tag badge badge-${getCategoryColor(task.category)}">${task.category}</span>
      </div>
    `).join('');
  }
  const scheduleEl = document.getElementById('dashTodaySchedule');
  const todayEvents = state.events.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  if (todayEvents.length === 0) {
    scheduleEl.innerHTML = `<p class="dash-empty-text">No events scheduled for today</p>`;
  } else {
    scheduleEl.innerHTML = todayEvents.map(event => {
      const color = getEventAccentColor(event.type);
      return `
        <div class="dash-schedule-item">
          <span class="dash-schedule-time">${event.time || '--:--'}</span>
          <span class="dash-schedule-dot" style="background: ${color}"></span>
          <span class="dash-schedule-title">${escapeHtml(event.title)}</span>
          <span class="dash-schedule-type badge badge-${getEventBadgeColor(event.type)}">${event.type}</span>
        </div>
      `;
    }).join('');
  }
  updateTasksBadge();
}

function calculateProductivityScore() {
  let score = 0;
  const today = getDateString(new Date());
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  if (total > 0) score += Math.round((completed / total) * 40);
  const habitRate = calculateHabitRate();
  score += Math.round((habitRate / 100) * 30);
  const todaySessions = getTodaySessions();
  score += Math.min(todaySessions.length * 5, 20);
  const streak = getMaxHabitStreak();
  score += Math.min(streak * 2, 10);
  return Math.min(score, 100);
}

function calculateHabitRate() {
  if (state.habits.length === 0) return 0;
  const today = getDateString(new Date());
  const completed = state.habits.filter(h => h.weekChecks && h.weekChecks[today]).length;
  return Math.round((completed / state.habits.length) * 100);
}

function renderActivityChart() {
  const barsEl = document.getElementById('activityBars');
  const labelsEl = document.getElementById('activityLabels');
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const todayStr = getDateString(today);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: getDateString(d),
      name: dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1],
      isToday: getDateString(d) === todayStr,
    });
  }
  const counts = days.map(d => state.activity[d.date] || 0);
  const maxCount = Math.max(...counts, 1);
  barsEl.innerHTML = days.map((day, i) => {
    const height = Math.max((counts[i] / maxCount) * 100, 4);
    return `
      <div class="activity-bar-col">
        <div class="activity-bar ${day.isToday ? 'today' : ''}"
             style="height: ${height}%"
             data-value="${counts[i]}"></div>
      </div>
    `;
  }).join('');
  labelsEl.innerHTML = days.map(day => `
    <span class="activity-label ${day.isToday ? 'today' : ''}">${day.name}</span>
  `).join('');
}

function renderSparkline(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...data, 1);
  el.innerHTML = data.map((val, i) => {
    const h = Math.max((val / max) * 100, 12);
    return `<div class="spark-bar" style="height:${h}%"></div>`;
  }).join('');
}

function getLast7DaysCounts(type) {
  const counts = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateString(d);
    if (type === 'tasks') {
      counts.push(state.tasks.filter(t => t.completed && t.completedDate === dateStr).length);
    } else if (type === 'sessions') {
      counts.push(state.sessions.filter(s => s.date === dateStr && s.mode === 'focus').reduce((sum, s) => sum + s.duration, 0));
    }
  }
  return counts;
}

function renderHabitCompletionCard() {
  const today = getDateString(new Date());
  const totalHabits = state.habits.length;
  const completedHabits = state.habits.filter(h => h.weekChecks && h.weekChecks[today]).length;
  const pct = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
  document.getElementById('habitCompletionPct').textContent = `${pct}%`;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference * (1 - pct / 100);
  document.getElementById('habitRingProgress').style.strokeDashoffset = offset;
  const listEl = document.getElementById('habitCompletionList');
  if (totalHabits === 0) {
    listEl.innerHTML = '<p class="dash-empty-text">No habits tracked yet</p>';
    return;
  }
  listEl.innerHTML = state.habits.slice(0, 5).map(h => {
    const done = h.weekChecks && h.weekChecks[today];
    return `
      <div class="habit-completion-item">
        <span class="habit-completion-icon">${h.icon}</span>
        <span class="habit-completion-name">${escapeHtml(h.name)}</span>
        <span class="habit-completion-status">${done ? '✅' : '⬜'}</span>
      </div>
    `;
  }).join('');
}

function getWeekSessions() {
  const weekDates = getThisWeekDates();
  return state.sessions.filter(s => weekDates.includes(s.date) && s.mode === 'focus');
}

function getEventAccentColor(type) {
  const map = { study: 'var(--accent-primary)', review: 'var(--accent-green)', exam: 'var(--accent-rose)', break: 'var(--accent-amber)' };
  return map[type] || 'var(--accent-primary)';
}

function getEventBadgeColor(type) {
  const map = { study: 'purple', review: 'green', exam: 'rose', break: 'amber' };
  return map[type] || 'purple';
}

function formatHoursLong(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function trackActivity() {
  const today = getDateString(new Date());
  state.activity[today] = (state.activity[today] || 0) + 1;
  persist();
}

// ==================== TASKS ====================

function renderTasks() {
  const list = document.getElementById('taskList');
  let filtered = [...state.tasks];
  switch (state.currentFilter) {
    case 'pending': filtered = filtered.filter(t => !t.completed); break;
    case 'completed': filtered = filtered.filter(t => t.completed); break;
    case 'high': filtered = filtered.filter(t => t.priority === 'high'); break;
  }
  if (state.taskSearchQuery) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(state.taskSearchQuery) || 
      t.category.toLowerCase().includes(state.taskSearchQuery)
    );
  }
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
  if (filtered.length === 0) {
    let emptyMsg = `No ${state.currentFilter} tasks.`;
    if (state.currentFilter === 'all') emptyMsg = 'Create your first task to get started!';
    if (state.taskSearchQuery) emptyMsg = `No tasks matching "${state.taskSearchQuery}".`;
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No tasks found</h3>
        <p>${emptyMsg}</p>
      </div>`;
    return;
  }
  list.innerHTML = filtered.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
      <div class="checkbox-wrapper">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')" />
        <div class="checkbox-custom"></div>
      </div>
      <span class="priority-dot priority-${task.priority}"></span>
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-details">
          <span class="badge badge-${getCategoryColor(task.category)}">${task.category}</span>
          ${task.dueDate ? `<span>Due: ${formatDate(task.dueDate)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit" onclick="openEditTaskModal('${task.id}')" title="Edit">✏️</button>
        <button class="task-action-btn delete" onclick="deleteTask('${task.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
  updateTasksBadge();
}

function toggleAddTaskForm() {
  const form = document.getElementById('addTaskForm');
  form.classList.toggle('visible');
  if (form.classList.contains('visible')) {
    document.getElementById('taskTitleInput').focus();
  }
}

function addTask() {
  const title = document.getElementById('taskTitleInput').value.trim();
  if (!title) { showToast('Please enter a task title.', 'error'); return; }
  const task = {
    id: generateId(), title,
    priority: document.getElementById('taskPriorityInput').value,
    category: document.getElementById('taskCategoryInput').value,
    dueDate: document.getElementById('taskDueInput').value || null,
    completed: false, createdAt: Date.now(),
  };
  state.tasks.push(task);
  persist(); trackActivity();
  document.getElementById('taskTitleInput').value = '';
  document.getElementById('taskPriorityInput').value = 'medium';
  document.getElementById('taskCategoryInput').value = 'general';
  document.getElementById('taskDueInput').value = '';
  toggleAddTaskForm();
  renderTasks();
  showToast('Task added successfully!', 'success');
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    task.completedDate = task.completed ? getDateString(new Date()) : null;
    persist(); trackActivity(); renderTasks();
    if (task.completed) showToast('Task completed! 🎉', 'success');
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  persist(); renderTasks();
  showToast('Task deleted.', 'info');
}

function updateTasksBadge() {
  const count = state.tasks.filter(t => !t.completed).length;
  const badge = document.getElementById('tasks-badge');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function handleTaskSearch() {
  const input = document.getElementById('taskSearchInput');
  if (input) { state.taskSearchQuery = input.value.trim().toLowerCase(); renderTasks(); }
}

function openEditTaskModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('editTaskId').value = task.id;
  document.getElementById('editTaskTitleInput').value = task.title;
  document.getElementById('editTaskPriorityInput').value = task.priority;
  document.getElementById('editTaskCategoryInput').value = task.category;
  document.getElementById('editTaskDueInput').value = task.dueDate || '';
  openModal('editTaskModal');
}

function updateTask() {
  const id = document.getElementById('editTaskId').value;
  const title = document.getElementById('editTaskTitleInput').value.trim();
  const priority = document.getElementById('editTaskPriorityInput').value;
  const category = document.getElementById('editTaskCategoryInput').value;
  const dueDate = document.getElementById('editTaskDueInput').value || null;
  if (!title) { showToast('Task title is required.', 'error'); return; }
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.title = title; task.priority = priority; task.category = category; task.dueDate = dueDate;
    persist(); closeModal('editTaskModal'); renderTasks();
    showToast('Task updated successfully!', 'success');
  }
}

document.getElementById('taskFilters')?.addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('#taskFilters .filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  state.currentFilter = tab.dataset.filter;
  renderTasks();
});

document.getElementById('taskTitleInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

// ==================== HABITS ====================

function renderHabits() {
  const grid = document.getElementById('habitsGrid');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const thisWeekDates = getThisWeekDates();
  const habitCards = state.habits.map(habit => {
    const checkedDays = habit.weekChecks || {};
    const checkedCount = thisWeekDates.filter(d => checkedDays[d]).length;
    const progressPercent = Math.round((checkedCount / habit.goal) * 100);
    const streak = calculateHabitStreak(habit);
    return `
      <div class="habit-card">
        <div class="habit-header">
          <div>
            <div class="habit-name">${escapeHtml(habit.name)}</div>
            <div class="habit-streak">
              <span class="streak-fire">🔥</span> ${streak} day streak
            </div>
          </div>
          <div class="habit-icon" style="background: var(--accent-${habit.color}-soft); color: var(--accent-${habit.color});">
            ${habit.icon}
          </div>
        </div>
        <div class="habit-week">
          ${thisWeekDates.map((date, i) => `
            <div class="habit-day">
              <span class="habit-day-label">${days[i]}</span>
              <div class="habit-day-check ${checkedDays[date] ? 'checked' : ''}"
                   onclick="toggleHabitDay('${habit.id}', '${date}')"
                   style="${checkedDays[date] ? `background: var(--accent-${habit.color}); border-color: var(--accent-${habit.color});` : ''}">
              </div>
            </div>
          `).join('')}
        </div>
        <div class="habit-progress">
          <div class="progress-bar" style="flex:1;">
            <div class="progress-fill" style="width: ${Math.min(progressPercent, 100)}%;
              background: linear-gradient(90deg, var(--accent-${habit.color}), var(--accent-${habit.color === 'purple' ? 'blue' : 'purple'}));"></div>
          </div>
          <span class="habit-progress-text">${checkedCount}/${habit.goal} days</span>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:var(--space-xs);margin-top:var(--space-sm);">
          <button class="task-action-btn edit" onclick="openEditHabitModal('${habit.id}')" title="Edit habit">✏️</button>
          <button class="task-action-btn delete" onclick="deleteHabit('${habit.id}')" title="Delete habit">🗑</button>
        </div>
      </div>
    `;
  }).join('');
  grid.innerHTML = habitCards + `
    <div class="add-habit-card" onclick="openHabitModal()">
      <div class="add-icon">+</div>
      <span style="font-weight:600;">Add New Habit</span>
      <span style="font-size:12px;">Track daily routines & build consistency</span>
    </div>
  `;
}

function openHabitModal() {
  document.getElementById('habitNameInput').value = '';
  document.getElementById('habitIconInput').value = '';
  document.getElementById('habitColorInput').value = 'purple';
  document.getElementById('habitGoalInput').value = '7';
  openModal('habitModal');
}

function addHabit() {
  const name = document.getElementById('habitNameInput').value.trim();
  const icon = document.getElementById('habitIconInput').value.trim() || '⭐';
  const color = document.getElementById('habitColorInput').value;
  const goal = parseInt(document.getElementById('habitGoalInput').value);
  if (!name) { showToast('Please enter a habit name.', 'error'); return; }
  const habit = { id: generateId(), name, icon, color, goal, weekChecks: {}, createdAt: Date.now() };
  state.habits.push(habit);
  persist(); trackActivity(); closeModal('habitModal'); renderHabits();
  showToast('Habit created! Start tracking today.', 'success');
}

function toggleHabitDay(habitId, date) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  if (!habit.weekChecks) habit.weekChecks = {};
  habit.weekChecks[date] = !habit.weekChecks[date];
  persist(); trackActivity(); renderHabits();
}

function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  persist(); renderHabits();
  showToast('Habit removed.', 'info');
}

function openEditHabitModal(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  document.getElementById('editHabitId').value = habit.id;
  document.getElementById('editHabitNameInput').value = habit.name;
  document.getElementById('editHabitIconInput').value = habit.icon;
  document.getElementById('editHabitColorInput').value = habit.color;
  document.getElementById('editHabitGoalInput').value = habit.goal;
  openModal('editHabitModal');
}

function updateHabit() {
  const id = document.getElementById('editHabitId').value;
  const name = document.getElementById('editHabitNameInput').value.trim();
  const icon = document.getElementById('editHabitIconInput').value.trim() || '⭐';
  const color = document.getElementById('editHabitColorInput').value;
  const goal = parseInt(document.getElementById('editHabitGoalInput').value);
  if (!name) { showToast('Habit name is required.', 'error'); return; }
  const habit = state.habits.find(h => h.id === id);
  if (habit) {
    habit.name = name; habit.icon = icon; habit.color = color; habit.goal = goal;
    persist(); closeModal('editHabitModal'); renderHabits();
    showToast('Habit updated successfully!', 'success');
  }
}

function calculateHabitStreak(habit) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateString(d);
    if (habit.weekChecks && habit.weekChecks[dateStr]) { streak++; }
    else if (i > 0) { break; }
  }
  return streak;
}

function getMaxHabitStreak() {
  if (state.habits.length === 0) return 0;
  return Math.max(...state.habits.map(h => calculateHabitStreak(h)), 0);
}

// ==================== FOCUS TIMER ====================

function setTimerMode(el) {
  if (state.timer.isRunning) return;
  document.querySelectorAll('.timer-mode').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  const mode = el.dataset.mode;
  let minutes = 25;
  if (mode === 'focus') minutes = state.settings.timerPreset.focus;
  else if (mode === 'short-break') minutes = state.settings.timerPreset.short;
  else if (mode === 'long-break') minutes = state.settings.timerPreset.long;
  state.timer.duration = minutes * 60;
  state.timer.remaining = minutes * 60;
  state.timer.mode = mode;
  const labels = { 'focus': 'Focus Session', 'short-break': 'Short Break', 'long-break': 'Long Break' };
  document.getElementById('timerModeLabel').textContent = labels[state.timer.mode];
  updateTimerDisplay();
}

function toggleTimer() { if (state.timer.isRunning) { pauseTimer(); } else { startTimer(); } }

function startTimer() {
  state.timer.isRunning = true;
  document.getElementById('timerStartBtn').textContent = '⏸';
  state.timer.interval = setInterval(() => {
    state.timer.remaining--;
    updateTimerDisplay();
    if (state.timer.remaining <= 0) { completeTimer(); }
  }, 1000);
}

function pauseTimer() {
  state.timer.isRunning = false;
  document.getElementById('timerStartBtn').textContent = '▶';
  clearInterval(state.timer.interval);
  updateTimerDisplay();
}

function resetTimer() { pauseTimer(); state.timer.remaining = state.timer.duration; updateTimerDisplay(); }

function skipTimer() {
  if (state.timer.isRunning && state.timer.mode === 'focus') {
    const elapsed = state.timer.duration - state.timer.remaining;
    if (elapsed > 60) { logSession(Math.floor(elapsed / 60)); }
  }
  resetTimer();
}

function completeTimer() {
  pauseTimer();
  if (state.timer.mode === 'focus') {
    const minutes = Math.floor(state.timer.duration / 60);
    logSession(minutes);
    showToast(`Focus session complete! ${minutes} minutes logged. 🎯`, 'success');
  } else {
    showToast('Break is over! Ready for another focus session?', 'info');
  }
  playChime();
  state.timer.remaining = state.timer.duration;
  updateTimerDisplay();
}

function logSession(minutes) {
  const session = {
    id: generateId(), duration: minutes, mode: state.timer.mode,
    date: getDateString(new Date()),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
  };
  state.sessions.push(session);
  persist(); trackActivity(); renderTimerStats();
}

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1); gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.4);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + 0.5);
    }, 150);
  } catch (e) { console.warn("AudioContext chime failed:", e); }
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timer.remaining / 60);
  const secs = state.timer.remaining % 60;
  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');
  const colonClass = (state.timer.isRunning && secs % 2 === 0) ? 'blink' : '';
  document.getElementById('timerDisplay').innerHTML = 
    `${minsStr}<span class="timer-colon ${colonClass}">:</span>${secsStr}`;
  const circumference = 2 * Math.PI * 54;
  const progress = state.timer.remaining / state.timer.duration;
  const offset = circumference * (1 - progress);
  const progressRing = document.getElementById('timerProgress');
  if (progressRing) {
    progressRing.style.strokeDashoffset = offset;
    progressRing.classList.toggle('running', state.timer.isRunning);
  }
  const modeLabel = state.timer.mode === 'focus' ? 'Focus' : 'Break';
  if (state.timer.isRunning) {
    document.title = `⏱️ ${minsStr}:${secsStr} (${modeLabel}) | FocusFlow`;
  } else {
    document.title = `FocusFlow — Smart Productivity Dashboard`;
  }
}

function renderTimerStats() {
  const todaySessions = getTodaySessions();
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  document.getElementById('timerTodaySessions').textContent = todaySessions.length;
  document.getElementById('timerTodayMinutes').textContent = `${todayMinutes}m`;
  document.getElementById('timerTotalSessions').textContent = state.sessions.length;
  const sessionsList = document.getElementById('sessionsList');
  const recent = [...state.sessions].reverse().slice(0, 8);
  if (recent.length === 0) {
    sessionsList.innerHTML = `<div class="empty-state" style="padding: var(--space-lg);"><p style="font-size: 13px;">No sessions yet. Start your first focus session!</p></div>`;
  } else {
    sessionsList.innerHTML = recent.map(s => `
      <div class="session-item">
        <div class="session-icon">${s.mode === 'focus' ? '🎯' : '☕'}</div>
        <div class="session-info">
          <div class="session-title">${s.mode === 'focus' ? 'Focus Session' : 'Break'}</div>
          <div class="session-meta">${s.date} at ${s.time}</div>
        </div>
        <div class="session-duration">${s.duration}m</div>
      </div>
    `).join('');
  }
}

function getTodaySessions() {
  const today = getDateString(new Date());
  return state.sessions.filter(s => s.date === today && s.mode === 'focus');
}

// ==================== STUDY PLANNER ====================

function renderPlanner() {
  const grid = document.getElementById('plannerGrid');
  const weekDates = getWeekDates(state.weekOffset);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = getDateString(new Date());
  document.getElementById('weekLabel').textContent =
    `${formatDateShort(weekDates[0])} — ${formatDateShort(weekDates[6])}`;
  grid.innerHTML = weekDates.map((date, i) => {
    const dayEvents = state.events.filter(e => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const isToday = date === today;
    const dayNum = new Date(date).getDate();
    return `
      <div class="planner-day ${isToday ? 'today' : ''}">
        <div class="planner-day-header">
          <div class="planner-day-name">${dayNames[i]}</div>
          <div class="planner-day-date">${dayNum}</div>
        </div>
        <div class="planner-day-body">
          ${dayEvents.map(event => `
            <div class="planner-event ${event.type}" onclick="deleteEvent('${event.id}')">
              <span>${event.time || ''}</span>
              <span>${escapeHtml(event.title)}</span>
            </div>
          `).join('')}
          <div class="planner-add-event" onclick="openEventModalForDate('${date}')">+</div>
        </div>
      </div>
    `;
  }).join('');
  renderExams(); renderTargets(); renderReminders();
}

function changeWeek(direction) { state.weekOffset += direction; renderPlanner(); }

function openEventModal() {
  document.getElementById('eventTitleInput').value = '';
  document.getElementById('eventDateInput').value = getDateString(new Date());
  document.getElementById('eventTimeInput').value = '';
  document.getElementById('eventTypeInput').value = 'study';
  openModal('eventModal');
}

function openEventModalForDate(date) {
  document.getElementById('eventTitleInput').value = '';
  document.getElementById('eventDateInput').value = date;
  document.getElementById('eventTimeInput').value = '';
  document.getElementById('eventTypeInput').value = 'study';
  openModal('eventModal');
}

function addEvent() {
  const title = document.getElementById('eventTitleInput').value.trim();
  const date = document.getElementById('eventDateInput').value;
  const time = document.getElementById('eventTimeInput').value;
  const type = document.getElementById('eventTypeInput').value;
  if (!title || !date) { showToast('Please enter event title and date.', 'error'); return; }
  const event = { id: generateId(), title, date, time, type, createdAt: Date.now() };
  state.events.push(event);
  persist(); trackActivity(); closeModal('eventModal'); renderPlanner();
  showToast('Event added to planner!', 'success');
}

function deleteEvent(id) {
  if (!confirm('Remove this event?')) return;
  state.events = state.events.filter(e => e.id !== id);
  persist(); renderPlanner();
  showToast('Event removed.', 'info');
}

// ==================== STUDY PLANNER CONTROLLERS ====================

function renderExams() {
  const listEl = document.getElementById('examsList');
  if (!listEl) return;
  if (!state.exams || state.exams.length === 0) {
    listEl.innerHTML = `<p class="dash-empty-text">No exams added yet</p>`;
    return;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  listEl.innerHTML = state.exams.map(exam => {
    const examDate = new Date(exam.date + 'T00:00:00');
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let daysText = '', daysClass = 'upcoming';
    if (diffDays < 0) { daysText = 'Completed'; daysClass = 'upcoming'; }
    else if (diffDays === 0) { daysText = 'Today'; daysClass = 'urgent'; }
    else if (diffDays === 1) { daysText = 'Tomorrow'; daysClass = 'urgent'; }
    else { daysText = `In ${diffDays} days`; if (diffDays <= 3) daysClass = 'urgent'; }
    return `
      <div class="exam-item">
        <div class="exam-header">
          <span class="exam-subject">${escapeHtml(exam.subject)}</span>
          <span class="exam-days ${daysClass}">${daysText}</span>
        </div>
        <div class="exam-title">${escapeHtml(exam.title)}</div>
        <div class="exam-meta">
          <span>Goal: ${exam.goal}h</span>
          <span>${formatDate(exam.date)}</span>
          <button class="task-action-btn delete" onclick="deleteExam('${exam.id}', event)" title="Delete Exam" style="margin-top: -4px;">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function openExamModal() {
  document.getElementById('examSubjectInput').value = '';
  document.getElementById('examTitleInput').value = '';
  document.getElementById('examDateInput').value = getDateString(new Date());
  document.getElementById('examGoalInput').value = '15';
  document.getElementById('examAutoSched').checked = true;
  openModal('examModal');
}

function addExam() {
  const subject = document.getElementById('examSubjectInput').value.trim();
  const title = document.getElementById('examTitleInput').value.trim();
  const date = document.getElementById('examDateInput').value;
  const goal = parseInt(document.getElementById('examGoalInput').value);
  const autoSched = document.getElementById('examAutoSched').checked;
  if (!subject || !title || !date || isNaN(goal) || goal <= 0) {
    showToast('Please fill all fields with valid values.', 'error'); return;
  }
  const exam = { id: generateId(), subject, title, date, goal, autoSched, createdAt: Date.now() };
  if (!state.exams) state.exams = [];
  state.exams.push(exam);
  if (autoSched) autoGenerateStudyPlan(exam);
  persist(); trackActivity(); closeModal('examModal'); renderPlanner();
  showToast('Exam goal created successfully!', 'success');
}

function deleteExam(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('Remove this exam goal? (Note: Calendar events will remain)')) return;
  state.exams = state.exams.filter(e => e.id !== id);
  persist(); renderPlanner();
  showToast('Exam goal removed.', 'info');
}

function autoGenerateStudyPlan(exam) {
  const todayStr = getDateString(new Date());
  const examDate = new Date(exam.date + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  state.events.push({ id: generateId(), title: `${exam.subject} Exam: ${exam.title}`, date: exam.date, time: '09:00', type: 'exam', createdAt: Date.now() });
  if (diffDays <= 0) return;
  for (let i = 0; i < diffDays; i++) {
    const current = new Date(today); current.setDate(today.getDate() + i);
    const dateStr = getDateString(current);
    const isDayBeforeExam = (i === diffDays - 1);
    if (isDayBeforeExam) {
      state.events.push({ id: generateId(), title: `Review: ${exam.subject}`, date: dateStr, time: '15:00', type: 'review', createdAt: Date.now() });
    } else {
      state.events.push({ id: generateId(), title: `Study: ${exam.subject} (${exam.title})`, date: dateStr, time: '16:00', type: 'study', createdAt: Date.now() });
    }
  }
}

function renderTargets() {
  const listEl = document.getElementById('targetsList');
  if (!listEl) return;
  if (!state.targets || state.targets.length === 0) {
    listEl.innerHTML = `<p class="dash-empty-text">No targets tracked yet</p>`;
    return;
  }
  listEl.innerHTML = state.targets.map(target => {
    return `
      <div class="target-item ${target.completed ? 'completed' : ''}">
        <div class="checkbox-wrapper">
          <input type="checkbox" ${target.completed ? 'checked' : ''} onchange="toggleTarget('${target.id}')" />
          <div class="checkbox-custom"></div>
        </div>
        <span class="target-text">${escapeHtml(target.title)}</span>
        <button class="task-action-btn delete" onclick="deleteTarget('${target.id}')" title="Delete Target" style="margin-top:0;">🗑</button>
      </div>
    `;
  }).join('');
}

function openTargetModal() {
  document.getElementById('targetTitleInput').value = '';
  document.getElementById('targetCategoryInput').value = 'general';
  openModal('targetModal');
}

function addTarget() {
  const title = document.getElementById('targetTitleInput').value.trim();
  const category = document.getElementById('targetCategoryInput').value;
  if (!title) { showToast('Please enter a target description.', 'error'); return; }
  const target = { id: generateId(), title, category, completed: false, createdAt: Date.now() };
  if (!state.targets) state.targets = [];
  state.targets.push(target);
  persist(); trackActivity(); closeModal('targetModal'); renderPlanner();
  showToast('Weekly target added!', 'success');
}

function toggleTarget(id) {
  const target = state.targets.find(t => t.id === id);
  if (target) {
    target.completed = !target.completed;
    persist(); trackActivity(); renderPlanner();
    if (target.completed) showToast('Weekly target completed! 🎯', 'success');
  }
}

function deleteTarget(id) {
  state.targets = state.targets.filter(t => t.id !== id);
  persist(); renderPlanner();
  showToast('Weekly target removed.', 'info');
}

function renderReminders() {
  const listEl = document.getElementById('remindersList');
  if (!listEl) return;
  const todayStr = getDateString(new Date());
  const upcomingEvents = state.events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => { if (a.date !== b.date) return a.date.localeCompare(b.date); return (a.time || '').localeCompare(b.time || ''); });
  if (upcomingEvents.length === 0) {
    listEl.innerHTML = `<p class="dash-empty-text">No reminders scheduled</p>`;
    return;
  }
  const icons = { study: '📖', review: '🔁', exam: '📝', break: '☕' };
  listEl.innerHTML = upcomingEvents.slice(0, 8).map(event => {
    const icon = icons[event.type] || '🔔';
    const formattedDate = formatDate(event.date);
    const timeText = event.time ? `${formattedDate} at ${event.time}` : formattedDate;
    return `
      <div class="reminder-item ${event.type}">
        <span class="reminder-icon">${icon}</span>
        <div class="reminder-content">
          <span class="reminder-title">${escapeHtml(event.title)}</span>
          <span class="reminder-time">${timeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

window.openExamModal = openExamModal;
window.addExam = addExam;
window.deleteExam = deleteExam;
window.openTargetModal = openTargetModal;
window.addTarget = addTarget;
window.toggleTarget = toggleTarget;
window.deleteTarget = deleteTarget;

// ==================== MODALS ====================

function openModal(id) { document.getElementById(id).classList.add('visible'); }
function closeModal(id) { document.getElementById(id).classList.remove('visible'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('visible');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.visible').forEach(m => m.classList.remove('visible'));
  }
});

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${escapeHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== MOBILE ====================

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('visible');
}

document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('mobileOverlay').classList.toggle('visible');
});

document.getElementById('mobileOverlay')?.addEventListener('click', closeMobileSidebar);

// ==================== UTILITIES ====================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatHours(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getCategoryColor(category) {
  const map = { general: 'blue', study: 'purple', project: 'cyan', personal: 'amber' };
  return map[category] || 'blue';
}

function getEventColor(type) {
  const map = { study: 'primary', review: 'green', exam: 'rose', break: 'amber' };
  return map[type] || 'primary';
}

function getThisWeekDates() { return getWeekDates(0); }

function getWeekDates(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff + (offset * 7));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getDateString(d));
  }
  return dates;
}

// ==================== SETTINGS PAGE LOGIC ====================

function renderSettings() {
  document.getElementById('settingsUsername').value = state.settings.user.name;
  document.getElementById('settingsInitials').value = state.settings.user.initials;
  document.getElementById('settingsWeeklyGoal').value = state.settings.goals.weeklyStudyHours;
  document.getElementById('settingsFocusTime').value = state.settings.timerPreset.focus;
  document.getElementById('settingsShortBreak').value = state.settings.timerPreset.short;
  document.getElementById('settingsLongBreak').value = state.settings.timerPreset.long;
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === state.settings.theme);
  });
}

function saveProfileSettings() {
  const name = document.getElementById('settingsUsername').value.trim();
  const initials = document.getElementById('settingsInitials').value.trim();
  if (!name) { showToast('Display Name is required.', 'error'); return; }
  state.settings.user.name = name;
  state.settings.user.initials = initials || name.charAt(0).toUpperCase();
  persist(); applyProfileChanges();
  showToast('Profile settings saved!', 'success');
}

function saveGoalSettings() {
  const goalInput = document.getElementById('settingsWeeklyGoal');
  const goalVal = parseInt(goalInput.value);
  if (isNaN(goalVal) || goalVal < 1 || goalVal > 168) {
    showToast('Weekly goal must be between 1 and 168 hours.', 'error'); return;
  }
  state.settings.goals.weeklyStudyHours = goalVal;
  persist();
  showToast('Weekly goal saved!', 'success');
}

function saveTimerSettings() {
  const focusVal = parseInt(document.getElementById('settingsFocusTime').value);
  const shortVal = parseInt(document.getElementById('settingsShortBreak').value);
  const longVal = parseInt(document.getElementById('settingsLongBreak').value);
  if (isNaN(focusVal) || focusVal < 1 || isNaN(shortVal) || shortVal < 1 || isNaN(longVal) || longVal < 1) {
    showToast('Timer durations must be valid positive numbers.', 'error'); return;
  }
  state.settings.timerPreset.focus = focusVal;
  state.settings.timerPreset.short = shortVal;
  state.settings.timerPreset.long = longVal;
  persist();
  if (!state.timer.isRunning) resetTimer();
  showToast('Timer presets saved!', 'success');
}

function selectTheme(themeName) {
  state.settings.theme = themeName;
  persist(); applyTheme();
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === themeName);
  });
  showToast(`${themeName.charAt(0).toUpperCase() + themeName.slice(1)} theme applied!`, 'success');
}

function applyTheme() {
  const root = document.documentElement;
  root.classList.remove('theme-emerald', 'theme-solar');
  if (state.settings.theme === 'emerald') root.classList.add('theme-emerald');
  else if (state.settings.theme === 'solar') root.classList.add('theme-solar');
}

function applyProfileChanges() {
  const avatar = document.getElementById('sidebarAvatar');
  const uname = document.getElementById('sidebarUsername');
  const greetingUname = document.getElementById('greetingUsername');
  if (avatar) avatar.textContent = state.settings.user.initials;
  if (uname) uname.textContent = state.settings.user.name;
  if (greetingUname) greetingUname.textContent = state.settings.user.name;
}

function exportData() {
  const backup = {
    tasks: state.tasks, habits: state.habits, events: state.events,
    sessions: state.sessions, activity: state.activity, settings: state.settings,
    exams: state.exams || [], targets: state.targets || [],
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `focusflow_backup_${getDateString(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click(); downloadAnchor.remove();
  showToast('Data exported successfully!', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      if (!importedState.tasks || !importedState.habits || !importedState.settings) {
        showToast('Invalid backup file structure.', 'error'); return;
      }
      state.tasks = importedState.tasks || [];
      state.habits = importedState.habits || [];
      state.events = importedState.events || [];
      state.sessions = importedState.sessions || [];
      state.activity = importedState.activity || {};
      state.exams = importedState.exams || [];
      state.targets = importedState.targets || [];
      state.settings = {
        user: { name: 'Student', initials: 'S' },
        goals: { weeklyStudyHours: 15 },
        timerPreset: { focus: 25, short: 5, long: 15 },
        theme: 'default',
        ...importedState.settings
      };
      persist(); applyTheme(); applyProfileChanges(); resetTimer();
      renderPage(state.currentPage);
      showToast('Data imported successfully!', 'success');
    } catch (err) { showToast('Failed to parse backup JSON file.', 'error'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetAllData() {
  if (!confirm('Are you sure you want to delete all tasks, habits, study sessions, events, and restore default settings? This cannot be undone.')) return;
  localStorage.clear();
  state.tasks = [];
  state.habits = JSON.parse(JSON.stringify(defaultHabits));
  state.events = []; state.sessions = []; state.activity = {};
  state.exams = []; state.targets = [];
  state.settings = {
    user: { name: 'Student', initials: 'S' },
    goals: { weeklyStudyHours: 15 },
    timerPreset: { focus: 25, short: 5, long: 15 },
    theme: 'default',
  };
  persist(); applyTheme(); applyProfileChanges(); resetTimer();
  navigateTo('dashboard');
  showToast('All app data has been reset to defaults.', 'info');
}

// ==================== INITIALIZATION ====================

function init() {
  applyTheme(); applyProfileChanges();
  const now = new Date();
  document.getElementById('headerDate').textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('taskDueInput').value = getDateString(now);
  document.getElementById('eventDateInput').value = getDateString(now);
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
  renderDashboard(); updateTimerDisplay(); updateTasksBadge();
}

document.addEventListener('DOMContentLoaded', init);
