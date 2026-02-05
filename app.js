// ===== Constants & State =====
const STORAGE_KEYS = {
  OLLAMA_URL: 'localai_ollama_url',
  CHATS: 'localai_chats',
  CURRENT_CHAT: 'localai_current_chat',
  SELECTED_MODEL: 'localai_selected_model',
  SETUP_COMPLETE: 'localai_setup_complete'
};

// Curated list of recommended models
const AVAILABLE_MODELS = [
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 (3B)',
    size: '2.0 GB',
    description: 'Fast and efficient. Great for everyday tasks.',
    category: 'recommended'
  },
  {
    name: 'llama3.2:1b',
    displayName: 'Llama 3.2 (1B)',
    size: '1.3 GB',
    description: 'Lightweight and quick. Perfect for basic conversations.',
    category: 'recommended'
  },
  {
    name: 'gemma2:2b',
    displayName: 'Gemma 2 (2B)',
    size: '1.6 GB',
    description: "Google's efficient model. Quick responses.",
    category: 'recommended'
  },
  {
    name: 'llama3.1:8b',
    displayName: 'Llama 3.1 (8B)',
    size: '4.7 GB',
    description: 'Balanced performance. Good for most use cases.',
    category: 'popular'
  },
  {
    name: 'mistral:7b',
    displayName: 'Mistral (7B)',
    size: '4.1 GB',
    description: 'Excellent reasoning and coding abilities.',
    category: 'popular'
  },
  {
    name: 'phi3:mini',
    displayName: 'Phi-3 Mini',
    size: '2.3 GB',
    description: "Microsoft's compact powerhouse.",
    category: 'popular'
  },
  {
    name: 'qwen2.5:3b',
    displayName: 'Qwen 2.5 (3B)',
    size: '1.9 GB',
    description: 'Great multilingual support.',
    category: 'popular'
  },
  {
    name: 'codellama:7b',
    displayName: 'Code Llama (7B)',
    size: '3.8 GB',
    description: 'Specialized for coding tasks.',
    category: 'coding'
  },
  {
    name: 'deepseek-coder:6.7b',
    displayName: 'DeepSeek Coder (6.7B)',
    size: '3.8 GB',
    description: 'Excellent code generation and explanation.',
    category: 'coding'
  },
  {
    name: 'qwen2.5-coder:3b',
    displayName: 'Qwen 2.5 Coder (3B)',
    size: '1.9 GB',
    description: 'Fast coding assistant.',
    category: 'coding'
  }
];

let state = {
  ollamaUrl: localStorage.getItem(STORAGE_KEYS.OLLAMA_URL) || 'http://localhost:11434',
  chats: JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS) || '[]'),
  currentChatId: localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT) || null,
  selectedModel: localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || null,
  models: [],
  isStreaming: false,
  isDownloading: false,
  abortController: null
};

// ===== DOM Helpers =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  // Setup
  setupScreen: $('#setupScreen'),
  ollamaUrlInput: $('#ollamaUrlInput'),
  connectionTest: $('#connectionTest'),
  corsHelp: $('#corsHelp'),
  modelsList: $('#modelsList'),
  noModelsHint: $('#noModelsHint'),
  installedTab: $('#installedTab'),
  downloadTab: $('#downloadTab'),
  availableModels: $('#availableModels'),
  downloadProgressCard: $('#downloadProgressCard'),
  startChatting: $('#startChatting'),
  
  // Main App
  mainApp: $('#mainApp'),
  sidebar: $('#sidebar'),
  chatList: $('#chatList'),
  chatTitle: $('#chatTitle'),
  modelSelect: $('#modelSelect'),
  messages: $('#messages'),
  welcome: $('#welcome'),
  messageInput: $('#messageInput'),
  sendBtn: $('#sendBtn'),
  chatForm: $('#chatForm'),
  connectionBadge: $('#connectionBadge'),
  currentModelBadge: $('#currentModelBadge'),
  
  // Model Manager Modal
  modelModal: $('#modelModal'),
  installedModelsList: $('#installedModelsList'),
  availableModelsManager: $('#availableModelsManager'),
  managerDownloadProgress: $('#managerDownloadProgress'),
  
  // Settings Modal
  settingsModal: $('#settingsModal'),
  settingsOllamaUrl: $('#settingsOllamaUrl'),
  settingsConnectionStatus: $('#settingsConnectionStatus'),
  
  // Toast
  toastContainer: $('#toastContainer')
};

// ===== Utilities =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return d.toLocaleDateString();
}

function formatModelSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.OLLAMA_URL, state.ollamaUrl);
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(state.chats));
  localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, state.currentChatId || '');
  localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, state.selectedModel || '');
}

function showToast(message, type = 'info') {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;
  
  els.toastContainer.appendChild(toast);
  
  const close = () => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  };
  
  toast.querySelector('.toast-close').onclick = close;
  setTimeout(close, 5000);
}

window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  });
};

// ===== Ollama API =====
async function testOllamaConnection(url) {
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Failed to connect');
    
    const data = await response.json();
    return { ok: true, models: data.models || [] };
  } catch (err) {
    console.error('Connection test failed:', err);
    return { ok: false, error: err.message };
  }
}

async function fetchModels() {
  try {
    const response = await fetch(`${state.ollamaUrl}/api/tags`);
    const data = await response.json();
    state.models = data.models || [];
    return state.models;
  } catch (err) {
    console.error('Failed to fetch models:', err);
    return [];
  }
}

async function pullModel(modelName, onProgress, onComplete, onError) {
  state.isDownloading = true;
  
  try {
    const response = await fetch(`${state.ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          if (data.total && data.completed) {
            const percent = Math.round((data.completed / data.total) * 100);
            onProgress(percent, data.status || 'Downloading...');
          } else if (data.status) {
            onProgress(null, data.status);
          }
          
          if (data.status === 'success') {
            state.isDownloading = false;
            onComplete();
            return;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
    
    state.isDownloading = false;
    onComplete();
    
  } catch (err) {
    state.isDownloading = false;
    onError(err.message);
  }
}

async function deleteModel(modelName) {
  try {
    const response = await fetch(`${state.ollamaUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function streamChat(messages, model, onChunk, onDone, onError) {
  state.abortController = new AbortController();
  
  try {
    const response = await fetch(`${state.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      }),
      signal: state.abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let stats = {};
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          if (data.message && data.message.content) {
            fullResponse += data.message.content;
            onChunk(data.message.content, fullResponse);
          }
          
          if (data.done) {
            stats = {
              total_duration: data.total_duration || 0,
              eval_count: data.eval_count || 0,
              eval_duration: data.eval_duration || 0
            };
          }
        } catch (e) {}
      }
    }
    
    const evalDurationSec = stats.eval_duration / 1e9;
    const tokensPerSec = evalDurationSec > 0 ? stats.eval_count / evalDurationSec : 0;
    const totalDurationSec = stats.total_duration / 1e9;
    
    onDone(fullResponse, {
      tokens: stats.eval_count,
      tokens_per_sec: tokensPerSec.toFixed(1),
      duration: totalDurationSec.toFixed(2)
    });
    
  } catch (err) {
    if (err.name === 'AbortError') {
      onDone('', null);
    } else {
      onError(err.message);
    }
  } finally {
    state.abortController = null;
  }
}

// ===== Setup Wizard =====
function updateConnectionStatus(status, text) {
  const testEl = els.connectionTest.querySelector('.test-status');
  testEl.className = `test-status ${status}`;
  testEl.querySelector('.status-text').textContent = text;
}

async function handleTestConnection() {
  const url = els.ollamaUrlInput.value.trim().replace(/\/$/, '');
  
  if (!url) {
    showToast('Please enter a URL', 'error');
    return;
  }
  
  updateConnectionStatus('loading', 'Testing connection...');
  els.corsHelp.style.display = 'none';
  
  const result = await testOllamaConnection(url);
  
  if (result.ok) {
    state.ollamaUrl = url;
    state.models = result.models;
    saveState();
    
    updateConnectionStatus('success', 'Connected successfully!');
    
    setTimeout(() => {
      showSetupStep(2);
      renderSetupModels();
      renderAvailableModels('recommended', els.availableModels);
    }, 500);
  } else {
    updateConnectionStatus('error', 'Connection failed');
    els.corsHelp.style.display = 'block';
  }
}

function showSetupStep(step) {
  $$('.setup-step').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.step) === step);
  });
}

function renderSetupModels() {
  const installedNames = state.models.map(m => m.name);
  
  if (state.models.length === 0) {
    els.modelsList.innerHTML = '';
    els.modelsList.style.display = 'none';
    els.noModelsHint.style.display = 'block';
    updateStartChattingButton();
    return;
  }
  
  els.modelsList.style.display = 'block';
  els.noModelsHint.style.display = 'none';
  
  els.modelsList.innerHTML = state.models.map(model => `
    <div class="model-option" data-model="${escapeHtml(model.name)}">
      <div class="model-radio"></div>
      <span class="model-name">${escapeHtml(model.name)}</span>
      <span class="model-size">${formatModelSize(model.size)}</span>
    </div>
  `).join('');
  
  els.modelsList.querySelectorAll('.model-option').forEach(el => {
    el.onclick = () => {
      els.modelsList.querySelectorAll('.model-option').forEach(opt => opt.classList.remove('selected'));
      el.classList.add('selected');
      state.selectedModel = el.dataset.model;
      updateStartChattingButton();
    };
  });
  
  // Auto-select first or previously selected
  if (state.models.length > 0) {
    const toSelect = state.selectedModel && installedNames.includes(state.selectedModel)
      ? state.selectedModel
      : state.models[0].name;
    
    const el = els.modelsList.querySelector(`[data-model="${toSelect}"]`);
    if (el) el.click();
  }
}

function updateStartChattingButton() {
  if (state.selectedModel) {
    els.startChatting.disabled = false;
    els.startChatting.textContent = 'Start Chatting';
  } else {
    els.startChatting.disabled = true;
    els.startChatting.textContent = 'Select a model to continue';
  }
}

function renderAvailableModels(category, container) {
  const filtered = AVAILABLE_MODELS.filter(m => m.category === category);
  const installedNames = state.models.map(m => m.name.split(':')[0]);
  
  container.innerHTML = filtered.map(model => {
    const baseName = model.name.split(':')[0];
    const isInstalled = installedNames.includes(baseName) || 
                        state.models.some(m => m.name === model.name);
    
    return `
      <div class="available-model-card ${isInstalled ? 'installed' : ''}" data-model="${escapeHtml(model.name)}">
        <div class="available-model-info">
          <div class="available-model-name">
            ${escapeHtml(model.displayName)}
            ${isInstalled ? '<span class="badge">Installed</span>' : ''}
          </div>
          <div class="available-model-desc">${escapeHtml(model.description)}</div>
        </div>
        <div class="available-model-meta">
          <span class="available-model-size">${model.size}</span>
          ${isInstalled ? '' : `<button class="btn-download" data-model="${escapeHtml(model.name)}">Download</button>`}
        </div>
      </div>
    `;
  }).join('');
  
  // Add download handlers
  container.querySelectorAll('.btn-download').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const modelName = btn.dataset.model;
      startDownload(modelName, container === els.availableModels ? 'setup' : 'manager');
    };
  });
}

function startDownload(modelName, context) {
  const progressCard = context === 'setup' ? els.downloadProgressCard : els.managerDownloadProgress;
  const model = AVAILABLE_MODELS.find(m => m.name === modelName);
  
  progressCard.style.display = 'block';
  progressCard.querySelector('.download-model-name').textContent = model?.displayName || modelName;
  progressCard.querySelector('.download-percent').textContent = '0%';
  progressCard.querySelector('.download-fill').style.width = '0%';
  progressCard.querySelector('.download-status').textContent = 'Starting download...';
  
  // Disable all download buttons
  $$('.btn-download').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.model === modelName) {
      btn.textContent = 'Downloading...';
      btn.classList.add('downloading');
    }
  });
  
  pullModel(
    modelName,
    // onProgress
    (percent, status) => {
      if (percent !== null) {
        progressCard.querySelector('.download-percent').textContent = `${percent}%`;
        progressCard.querySelector('.download-fill').style.width = `${percent}%`;
      }
      progressCard.querySelector('.download-status').textContent = status;
    },
    // onComplete
    async () => {
      showToast(`${model?.displayName || modelName} downloaded successfully!`, 'success');
      progressCard.style.display = 'none';
      
      // Refresh models
      await fetchModels();
      
      // Re-render UI
      if (context === 'setup') {
        renderSetupModels();
        renderAvailableModels(getCurrentCategory(els.downloadTab), els.availableModels);
        
        // Auto-select newly downloaded model
        state.selectedModel = modelName;
        const el = els.modelsList.querySelector(`[data-model="${modelName}"]`);
        if (el) el.click();
      } else {
        renderInstalledModels();
        renderAvailableModels(getCurrentCategory($('#mmDownloadTab')), els.availableModelsManager);
        loadModels();
      }
      
      // Re-enable buttons
      $$('.btn-download').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('downloading');
        if (btn.dataset.model === modelName) {
          btn.textContent = 'Download';
        }
      });
    },
    // onError
    (error) => {
      showToast(`Download failed: ${error}`, 'error');
      progressCard.style.display = 'none';
      
      // Re-enable buttons
      $$('.btn-download').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('downloading');
        if (btn.dataset.model === modelName) {
          btn.textContent = 'Download';
        }
      });
    }
  );
}

function getCurrentCategory(tabContent) {
  const activeBtn = tabContent.querySelector('.category-btn.active');
  return activeBtn ? activeBtn.dataset.category : 'recommended';
}

function completeSetup() {
  if (!state.selectedModel) {
    showToast('Please select a model first', 'error');
    return;
  }
  
  localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, 'true');
  saveState();
  
  els.setupScreen.style.display = 'none';
  els.mainApp.style.display = 'flex';
  
  initMainApp();
}

// ===== Setup Tab Switching =====
function initSetupTabs() {
  // Setup step 2 tabs
  const setupTabs = $$('#setupSteps .model-tab');
  setupTabs.forEach(tab => {
    tab.onclick = () => {
      setupTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      els.installedTab.classList.toggle('active', tabName === 'installed');
      els.downloadTab.classList.toggle('active', tabName === 'download');
    };
  });
  
  // Category buttons in setup
  els.downloadTab.querySelectorAll('.category-btn').forEach(btn => {
    btn.onclick = () => {
      els.downloadTab.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAvailableModels(btn.dataset.category, els.availableModels);
    };
  });
}

// ===== Model Manager Modal =====
function openModelManager() {
  els.modelModal.classList.add('open');
  renderInstalledModels();
  renderAvailableModels('recommended', els.availableModelsManager);
  
  // Reset to installed tab
  $$('#modelModal .model-tab').forEach(t => t.classList.remove('active'));
  $('#modelModal .model-tab[data-tab="mm-installed"]').classList.add('active');
  $('#mmInstalledTab').classList.add('active');
  $('#mmDownloadTab').classList.remove('active');
}

function closeModelManager() {
  els.modelModal.classList.remove('open');
}

function renderInstalledModels() {
  if (state.models.length === 0) {
    els.installedModelsList.innerHTML = `
      <div class="no-installed-models">
        <p>No models installed yet.</p>
        <p>Switch to "Download New" to get started!</p>
      </div>
    `;
    return;
  }
  
  els.installedModelsList.innerHTML = state.models.map(model => `
    <div class="installed-model-item" data-model="${escapeHtml(model.name)}">
      <div class="installed-model-icon">🤖</div>
      <div class="installed-model-details">
        <div class="installed-model-name">${escapeHtml(model.name)}</div>
        <div class="installed-model-meta">${formatModelSize(model.size)}</div>
      </div>
      <button class="btn-delete-model" data-model="${escapeHtml(model.name)}" title="Delete model">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Add delete handlers
  els.installedModelsList.querySelectorAll('.btn-delete-model').forEach(btn => {
    btn.onclick = async () => {
      const modelName = btn.dataset.model;
      if (!confirm(`Delete model "${modelName}"? This cannot be undone.`)) return;
      
      btn.disabled = true;
      const result = await deleteModel(modelName);
      
      if (result.ok) {
        showToast('Model deleted', 'success');
        await fetchModels();
        renderInstalledModels();
        renderAvailableModels(getCurrentCategory($('#mmDownloadTab')), els.availableModelsManager);
        loadModels();
      } else {
        showToast(`Failed to delete: ${result.error}`, 'error');
        btn.disabled = false;
      }
    };
  });
}

function initModelManagerTabs() {
  const tabs = $$('#modelModal .model-tab');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      $('#mmInstalledTab').classList.toggle('active', tabName === 'mm-installed');
      $('#mmDownloadTab').classList.toggle('active', tabName === 'mm-download');
    };
  });
  
  // Category buttons
  $('#mmDownloadTab').querySelectorAll('.category-btn').forEach(btn => {
    btn.onclick = () => {
      $('#mmDownloadTab').querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAvailableModels(btn.dataset.category, els.availableModelsManager);
    };
  });
}

// ===== Main App =====
function initMainApp() {
  loadModels();
  renderChatList();
  updateConnectionBadge();
  
  if (state.currentChatId) {
    loadChat(state.currentChatId);
  }
  
  if (state.selectedModel) {
    els.currentModelBadge.textContent = state.selectedModel;
  }
  
  setInterval(updateConnectionBadge, 30000);
}

async function loadModels() {
  const models = await fetchModels();
  
  if (models.length === 0) {
    els.modelSelect.innerHTML = '<option value="">No models — click Manage</option>';
    return;
  }
  
  els.modelSelect.innerHTML = models.map(m => 
    `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`
  ).join('');
  
  if (state.selectedModel && models.some(m => m.name === state.selectedModel)) {
    els.modelSelect.value = state.selectedModel;
  } else if (models.length > 0) {
    state.selectedModel = models[0].name;
    els.modelSelect.value = state.selectedModel;
  }
  
  els.currentModelBadge.textContent = state.selectedModel || '';
}

async function updateConnectionBadge() {
  const result = await testOllamaConnection(state.ollamaUrl);
  
  els.connectionBadge.classList.toggle('disconnected', !result.ok);
  els.connectionBadge.querySelector('.text').textContent = result.ok ? 'Connected' : 'Disconnected';
}

// ===== Chat Management =====
function createNewChat() {
  const chat = {
    id: generateId(),
    title: 'New Chat',
    model: state.selectedModel,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  state.chats.unshift(chat);
  state.currentChatId = chat.id;
  saveState();
  
  renderChatList();
  loadChat(chat.id);
}

function loadChat(chatId) {
  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return;
  
  state.currentChatId = chatId;
  saveState();
  
  els.chatTitle.textContent = chat.title;
  
  if (chat.model && state.models.some(m => m.name === chat.model)) {
    els.modelSelect.value = chat.model;
    state.selectedModel = chat.model;
    els.currentModelBadge.textContent = chat.model;
  }
  
  renderMessages(chat.messages);
  renderChatList();
  closeSidebar();
}

function deleteCurrentChat() {
  if (!state.currentChatId) return;
  if (!confirm('Delete this chat?')) return;
  
  state.chats = state.chats.filter(c => c.id !== state.currentChatId);
  state.currentChatId = null;
  saveState();
  
  els.chatTitle.textContent = 'New Chat';
  renderMessages([]);
  renderChatList();
  
  showToast('Chat deleted', 'success');
}

function exportCurrentChat() {
  const chat = state.chats.find(c => c.id === state.currentChatId);
  if (!chat) return;
  
  let md = `# ${chat.title}\n\n`;
  md += `*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
  
  chat.messages.forEach(msg => {
    const role = msg.role === 'user' ? '**You**' : '**Assistant**';
    md += `${role}\n\n${msg.content}\n\n---\n\n`;
  });
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chat.title.slice(0, 30)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('Chat exported', 'success');
}

function renderChatList() {
  if (state.chats.length === 0) {
    els.chatList.innerHTML = '<div class="no-chats">No chats yet. Start a new one!</div>';
    return;
  }
  
  els.chatList.innerHTML = state.chats.map(chat => `
    <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" data-id="${chat.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <span class="title">${escapeHtml(chat.title)}</span>
      <span class="date">${formatDate(chat.updatedAt)}</span>
    </div>
  `).join('');
  
  els.chatList.querySelectorAll('.chat-item').forEach(el => {
    el.onclick = () => loadChat(el.dataset.id);
  });
}

// ===== Messages =====
function renderMessages(messages) {
  if (!messages || messages.length === 0) {
    els.messages.innerHTML = '';
    els.messages.appendChild(els.welcome);
    els.welcome.style.display = '';
    return;
  }
  
  els.welcome.style.display = 'none';
  els.messages.innerHTML = messages.map((msg, i) => createMessageHtml(msg, i)).join('');
  els.messages.scrollTop = els.messages.scrollHeight;
}

function createMessageHtml(msg, index) {
  const avatar = msg.role === 'user' ? 'You' : 'AI';
  const label = msg.role === 'user' ? 'You' : 'Assistant';
  
  let statsHtml = '';
  if (msg.stats && msg.role === 'assistant') {
    statsHtml = `
      <div class="message-stats">
        <div class="stat-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>${msg.stats.tokens_per_sec}</span>
          <span class="stat-label">tok/s</span>
        </div>
        <div class="stat-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span>${msg.stats.duration}</span>
          <span class="stat-label">sec</span>
        </div>
        <div class="stat-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>${msg.stats.tokens}</span>
          <span class="stat-label">tokens</span>
        </div>
      </div>
    `;
  }
  
  const hasStats = msg.stats && msg.role === 'assistant';
  
  return `
    <div class="message ${msg.role}" data-index="${index}">
      <div class="message-header">
        <div class="message-avatar">${avatar}</div>
        <span class="message-role">${label}</span>
      </div>
      <div class="message-content">${formatContent(msg.content)}</div>
      <div class="message-footer ${hasStats ? 'has-stats' : ''}">
        ${statsHtml}
        <div class="message-actions">
          <button class="msg-action-btn" onclick="copyMessageContent(this)" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function formatContent(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });
  
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

window.copyMessageContent = function(btn) {
  const message = btn.closest('.message');
  const content = message.querySelector('.message-content').innerText;
  
  navigator.clipboard.writeText(content).then(() => {
    showToast('Copied to clipboard!', 'success');
  });
};

// ===== Send Message =====
async function sendMessage() {
  const message = els.messageInput.value.trim();
  const model = els.modelSelect.value;
  
  if (!message || !model || state.isStreaming) return;
  
  if (!state.currentChatId) {
    createNewChat();
  }
  
  const chat = state.chats.find(c => c.id === state.currentChatId);
  if (!chat) return;
  
  els.messageInput.value = '';
  els.sendBtn.disabled = true;
  autoResize(els.messageInput);
  
  chat.messages.push({ role: 'user', content: message });
  chat.updatedAt = new Date().toISOString();
  
  if (chat.messages.length === 1) {
    chat.title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
    els.chatTitle.textContent = chat.title;
    renderChatList();
  }
  
  saveState();
  
  els.welcome.style.display = 'none';
  els.messages.innerHTML += createMessageHtml({ role: 'user', content: message }, chat.messages.length - 1);
  
  const assistantDiv = document.createElement('div');
  assistantDiv.className = 'message assistant';
  assistantDiv.innerHTML = `
    <div class="message-header">
      <div class="message-avatar">AI</div>
      <span class="message-role">Assistant</span>
    </div>
    <div class="message-content"><span class="streaming-cursor"></span></div>
    <div class="message-footer">
      <div class="message-stats"></div>
      <div class="message-actions">
        <button class="msg-action-btn" onclick="copyMessageContent(this)" title="Copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  els.messages.appendChild(assistantDiv);
  els.messages.scrollTop = els.messages.scrollHeight;
  
  state.isStreaming = true;
  
  const apiMessages = chat.messages.map(m => ({
    role: m.role,
    content: m.content
  }));
  
  const contentEl = assistantDiv.querySelector('.message-content');
  const statsEl = assistantDiv.querySelector('.message-stats');
  
  await streamChat(
    apiMessages,
    model,
    (chunk, fullText) => {
      contentEl.innerHTML = formatContent(fullText) + '<span class="streaming-cursor"></span>';
      els.messages.scrollTop = els.messages.scrollHeight;
    },
    (fullResponse, stats) => {
      if (fullResponse) {
        chat.messages.push({
          role: 'assistant',
          content: fullResponse,
          stats: stats
        });
        chat.updatedAt = new Date().toISOString();
        saveState();
        
        contentEl.innerHTML = formatContent(fullResponse);
        
        if (stats) {
          statsEl.innerHTML = `
            <div class="stat-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span>${stats.tokens_per_sec}</span>
              <span class="stat-label">tok/s</span>
            </div>
            <div class="stat-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>${stats.duration}</span>
              <span class="stat-label">sec</span>
            </div>
            <div class="stat-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span>${stats.tokens}</span>
              <span class="stat-label">tokens</span>
            </div>
          `;
          // Add has-stats class to show footer
          statsEl.closest('.message-footer').classList.add('has-stats');
        }
        
        renderChatList();
      }
      
      state.isStreaming = false;
      updateSendButton();
    },
    (error) => {
      contentEl.innerHTML = `<p style="color: var(--danger);">Error: ${escapeHtml(error)}</p>`;
      state.isStreaming = false;
      updateSendButton();
      showToast('Failed to get response', 'error');
    }
  );
}

function updateSendButton() {
  const hasMessage = els.messageInput.value.trim().length > 0;
  const hasModel = els.modelSelect.value !== '';
  els.sendBtn.disabled = !hasMessage || !hasModel || state.isStreaming;
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

// ===== Search =====
function searchChats(query) {
  if (!query || query.length < 2) {
    renderChatList();
    return;
  }
  
  const q = query.toLowerCase();
  const results = state.chats.filter(chat => {
    if (chat.title.toLowerCase().includes(q)) return true;
    return chat.messages.some(m => m.content.toLowerCase().includes(q));
  });
  
  if (results.length === 0) {
    els.chatList.innerHTML = '<div class="no-chats">No results found</div>';
    return;
  }
  
  els.chatList.innerHTML = results.map(chat => `
    <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" data-id="${chat.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <span class="title">${escapeHtml(chat.title)}</span>
      <span class="date">${formatDate(chat.updatedAt)}</span>
    </div>
  `).join('');
  
  els.chatList.querySelectorAll('.chat-item').forEach(el => {
    el.onclick = () => loadChat(el.dataset.id);
  });
}

// ===== Settings =====
function openSettings() {
  els.settingsModal.classList.add('open');
  els.settingsOllamaUrl.value = state.ollamaUrl;
  updateSettingsConnectionStatus();
}

function closeSettings() {
  els.settingsModal.classList.remove('open');
}

async function updateSettingsConnectionStatus() {
  const result = await testOllamaConnection(state.ollamaUrl);
  els.settingsConnectionStatus.className = `setting-status ${result.ok ? 'connected' : 'disconnected'}`;
  els.settingsConnectionStatus.querySelector('.text').textContent = result.ok ? 'Connected' : 'Not connected';
}

async function saveSettings() {
  const newUrl = els.settingsOllamaUrl.value.trim().replace(/\/$/, '');
  
  if (newUrl !== state.ollamaUrl) {
    state.ollamaUrl = newUrl;
    saveState();
    await loadModels();
    await updateConnectionBadge();
  }
  
  closeSettings();
  showToast('Settings saved', 'success');
}

function clearAllData() {
  if (!confirm('Delete all your chat history? This cannot be undone.')) return;
  
  state.chats = [];
  state.currentChatId = null;
  saveState();
  
  els.chatTitle.textContent = 'New Chat';
  renderMessages([]);
  renderChatList();
  closeSettings();
  
  showToast('All chats deleted', 'success');
}

// ===== Mobile =====
function closeSidebar() {
  els.sidebar.classList.remove('open');
}

function toggleSidebar() {
  els.sidebar.classList.toggle('open');
}

// ===== Event Listeners =====
// Setup
$('#testConnection').onclick = handleTestConnection;
$('#backToStep1').onclick = () => showSetupStep(1);
$('#startChatting').onclick = completeSetup;

// Quick prompts
$$('.quick-prompt').forEach(btn => {
  btn.onclick = () => {
    els.messageInput.value = btn.dataset.prompt;
    els.messageInput.focus();
    autoResize(els.messageInput);
    updateSendButton();
  };
});

// Chat form
els.chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

els.messageInput.addEventListener('input', () => {
  updateSendButton();
  autoResize(els.messageInput);
});

els.messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Model select
els.modelSelect.addEventListener('change', () => {
  state.selectedModel = els.modelSelect.value;
  els.currentModelBadge.textContent = state.selectedModel;
  saveState();
  updateSendButton();
});

// Sidebar
$('#newChat').onclick = createNewChat;
$('#menuToggle').onclick = toggleSidebar;

// Search
let searchTimeout;
$('#searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchChats(e.target.value), 300);
});

// Header actions
$('#exportChat').onclick = exportCurrentChat;
$('#deleteChat').onclick = deleteCurrentChat;
$('#manageModels').onclick = openModelManager;

// Model manager
$('#closeModelModal').onclick = closeModelManager;

// Settings
$('#openSettings').onclick = openSettings;
$('#closeSettings').onclick = closeSettings;
$('#cancelSettings').onclick = closeSettings;
$('#saveSettings').onclick = saveSettings;
$('#clearAllData').onclick = clearAllData;

// Modal overlays
$$('.modal-overlay').forEach(overlay => {
  overlay.onclick = () => {
    overlay.closest('.modal').classList.remove('open');
  };
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $$('.modal.open').forEach(m => m.classList.remove('open'));
    closeSidebar();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    createNewChat();
  }
});

// ===== Initialize =====
(async function init() {
  // Initialize tabs
  initSetupTabs();
  initModelManagerTabs();
  
  const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE);
  
  if (setupComplete === 'true') {
    const result = await testOllamaConnection(state.ollamaUrl);
    
    if (result.ok) {
      state.models = result.models;
      els.setupScreen.style.display = 'none';
      els.mainApp.style.display = 'flex';
      initMainApp();
    } else {
      localStorage.removeItem(STORAGE_KEYS.SETUP_COMPLETE);
      updateConnectionStatus('error', 'Cannot connect to Ollama');
      els.corsHelp.style.display = 'block';
    }
  }
})();
