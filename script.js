const API_BASE = 'https://phi-lab-server.vercel.app/api/v1/lab';
const DEMO_USER = { username: 'admin', password: 'admin123' };

const state = {
  allIssues: [],
  currentIssues: [],
  currentFilter: 'all',
  currentQuery: ''
};

const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const issuesContainer = document.getElementById('issuesContainer');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');
const issueCount = document.getElementById('issueCount');
const panelText = document.getElementById('panelText');
const openCount = document.getElementById('openCount');
const closedCount = document.getElementById('closedCount');
const tabButtons = document.querySelectorAll('.tab-btn');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const issueModal = document.getElementById('issueModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

function isLoggedIn() {
  return localStorage.getItem('issueTrackerAuth') === 'true';
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function setLoading(show) {
  loader.classList.toggle('hidden', !show);
  if (show) {
    issuesContainer.innerHTML = '';
    emptyState.classList.add('hidden');
  }
}

function updateAuthView() {
  const loggedIn = isLoggedIn();
  loginPage.classList.toggle('hidden', loggedIn);
  dashboardPage.classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    loadIssues();
  }
}

function updateStats(sourceList = state.allIssues, visibleList = state.currentIssues) {
  const openIssues = sourceList.filter(issue => issue.status === 'open').length;
  const closedIssues = sourceList.filter(issue => issue.status === 'closed').length;
  openCount.textContent = openIssues;
  closedCount.textContent = closedIssues;
  issueCount.textContent = visibleList.length;

  if (state.currentQuery.trim()) {
    panelText.textContent = `Search results for "${state.currentQuery.trim()}"`;
    return;
  }

  if (state.currentFilter === 'all') {
    panelText.textContent = 'Showing all available issues';
  } else {
    panelText.textContent = `Showing ${state.currentFilter} issues only`;
  }
}

function createIssueCard(issue) {
  const labels = issue.labels?.length
    ? `<div class="label-badges">${issue.labels.map(label => `<span class="badge">${label}</span>`).join('')}</div>`
    : '<span class="meta-value">No label</span>';

  return `
    <article class="issue-card ${issue.status}" data-id="${issue.id}">
      <h4>${issue.title}</h4>
      <p>${issue.description}</p>
      <div class="meta-list">
        <div class="meta-row">
          <span class="meta-label">Status</span>
          <span class="meta-value">${issue.status}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Author</span>
          <span class="meta-value">${issue.author || 'Unknown'}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Priority</span>
          <span class="meta-value">${issue.priority || 'N/A'}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Label</span>
          ${labels}
        </div>
        <div class="meta-row">
          <span class="meta-label">Created</span>
          <span class="meta-value">${formatDate(issue.createdAt)}</span>
        </div>
      </div>
    </article>
  `;
}
function renderIssues(issues) {
  state.currentIssues = issues;
  updateStats(state.allIssues, issues);

  if (!issues.length) {
    issuesContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  issuesContainer.innerHTML = issues.map(createIssueCard).join('');
}

function getFilteredIssues(issues, filter) {
  if (filter === 'all') return issues;
  return issues.filter(issue => issue.status === filter);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load data');
  }
  return response.json();
}

async function loadIssues() {
  try {
    setLoading(true);
    const result = await fetchJson(`${API_BASE}/issues`);
    state.allIssues = result.data || [];
    const filtered = getFilteredIssues(state.allIssues, state.currentFilter);
    renderIssues(filtered);
  } catch (error) {
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `<h3>Something went wrong</h3><p>${error.message}</p>`;
  } finally {
    setLoading(false);
  }
}

async function searchIssues(query) {
  try {
    setLoading(true);
    state.currentQuery = query;
    const result = await fetchJson(`${API_BASE}/issues/search?q=${encodeURIComponent(query)}`);
    const searchedIssues = result.data || [];
    const filtered = getFilteredIssues(searchedIssues, state.currentFilter);
    renderIssues(filtered);
  } catch (error) {
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `<h3>Search failed</h3><p>${error.message}</p>`;
  } finally {
    setLoading(false);
  }
}

async function showIssueModal(id) {
  try {
    const result = await fetchJson(`${API_BASE}/issue/${id}`);
    const issue = result.data;

    modalContent.innerHTML = `
      <h3 class="modal-title">${issue.title}</h3>
      <p class="modal-description">${issue.description}</p>
      <div class="modal-grid">
        <div class="modal-item">
          <h5>ID</h5>
          <p>${issue.id}</p>
        </div>
        <div class="modal-item">
          <h5>Status</h5>
          <p>${issue.status}</p>
        </div>
        <div class="modal-item">
          <h5>Author</h5>
          <p>${issue.author || 'Unknown'}</p>
        </div>
        <div class="modal-item">
          <h5>Assignee</h5>
          <p>${issue.assignee || 'Not assigned'}</p>
        </div>
        <div class="modal-item">
          <h5>Priority</h5>
          <p>${issue.priority || 'N/A'}</p>
        </div>
        <div class="modal-item">
          <h5>Labels</h5>
          <div>${issue.labels?.length ? issue.labels.map(label => `<span class="badge">${label}</span>`).join(' ') : 'No labels'}</div>
        </div>
        <div class="modal-item">
          <h5>Created At</h5>
          <p>${formatDate(issue.createdAt)}</p>
        </div>
        <div class="modal-item">
          <h5>Updated At</h5>
          <p>${formatDate(issue.updatedAt)}</p>
        </div>
      </div>
    `;

    issueModal.classList.remove('hidden');
  } catch (error) {
    alert('Unable to load this issue right now.');
  }
}
