// FLRTS OpenProject Extension - Content Script

console.log('🚀 FLRTS Extension loaded for OpenProject');

// Configuration
const FLRTS_API_URL = 'http://localhost:3000/api/v1';

// Wait for page to load
window.addEventListener('load', () => {
  injectFLRTSInterface();
  replaceLogo();
  setupKeyboardShortcuts();
});

/**
 * Inject FLRTS quick input interface
 */
function injectFLRTSInterface() {
  // Check if we're on a valid OpenProject page
  const toolbar = document.querySelector('.toolbar-container') || 
                  document.querySelector('#toolbar') ||
                  document.querySelector('.op-app-header');
  
  if (!toolbar) {
    console.log('FLRTS: Toolbar not found, retrying...');
    setTimeout(injectFLRTSInterface, 1000);
    return;
  }

  // Don't inject if already present
  if (document.getElementById('flrts-container')) return;

  // Create FLRTS container
  const flrtsContainer = document.createElement('div');
  flrtsContainer.id = 'flrts-container';
  flrtsContainer.className = 'flrts-quick-input';
  flrtsContainer.innerHTML = `
    <div class="flrts-input-wrapper">
      <input 
        type="text" 
        id="flrts-nlp-input"
        placeholder="Create task naturally: 'Task for @Taylor to check pumps by 3pm'"
        autocomplete="off"
      />
      <button id="flrts-voice-btn" class="flrts-voice-btn" title="Voice input">
        🎤
      </button>
      <button id="flrts-submit-btn" class="flrts-submit-btn">
        Create Task
      </button>
    </div>
    <div id="flrts-preview" class="flrts-preview" style="display: none;"></div>
  `;

  // Insert at the top of the page
  document.body.insertBefore(flrtsContainer, document.body.firstChild);

  // Attach event listeners
  setupEventListeners();
}

/**
 * Replace OpenProject logo with FLRTS branding
 */
function replaceLogo() {
  const logos = document.querySelectorAll('.op-logo, .logo, .header-logo');
  logos.forEach(logo => {
    logo.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><text x="10" y="35" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="%234A90E2">FLRTS</text></svg>')`;
    logo.style.backgroundSize = 'contain';
    logo.style.backgroundRepeat = 'no-repeat';
    logo.title = 'FLRTS - Fast Low-friction Repeatable Task System';
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to focus FLRTS input
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const input = document.getElementById('flrts-nlp-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
    
    // Escape to close preview
    if (e.key === 'Escape') {
      const preview = document.getElementById('flrts-preview');
      if (preview) {
        preview.style.display = 'none';
      }
    }
  });
}

/**
 * Setup event listeners for FLRTS interface
 */
function setupEventListeners() {
  const input = document.getElementById('flrts-nlp-input');
  const submitBtn = document.getElementById('flrts-submit-btn');
  const voiceBtn = document.getElementById('flrts-voice-btn');

  // Submit on Enter
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  });

  // Submit button click
  submitBtn?.addEventListener('click', handleSubmit);

  // Voice input
  voiceBtn?.addEventListener('click', handleVoiceInput);

  // Auto-preview on typing (debounced)
  let typingTimer;
  input?.addEventListener('input', (e) => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      if (e.target.value.length > 5) {
        previewParse(e.target.value);
      }
    }, 500);
  });
}

/**
 * Handle task submission
 */
async function handleSubmit() {
  const input = document.getElementById('flrts-nlp-input');
  const submitBtn = document.getElementById('flrts-submit-btn');
  
  if (!input || !input.value.trim()) return;

  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Processing...';
  submitBtn.disabled = true;

  try {
    // Parse with FLRTS API
    const parsed = await parseFLRTS(input.value);
    
    // Show confirmation dialog
    const confirmed = await showConfirmation(parsed);
    
    if (confirmed) {
      // Create work package in OpenProject
      const workPackage = await createWorkPackage(parsed);
      
      // Show success message
      showNotification('✅ Task created successfully!', 'success');
      
      // Clear input
      input.value = '';
      
      // Redirect to the new work package
      if (workPackage.id) {
        window.location.href = `/work_packages/${workPackage.id}`;
      }
    }
  } catch (error) {
    console.error('FLRTS Error:', error);
    showNotification('❌ Failed to create task: ' + error.message, 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

/**
 * Parse natural language with FLRTS API
 */
async function parseFLRTS(input) {
  const response = await fetch(`${FLRTS_API_URL}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Version': '1.0.0'
    },
    body: JSON.stringify({ 
      input,
      context: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userId: getCurrentUserId()
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to parse input');
  }

  return response.json();
}

/**
 * Preview parse result without creating
 */
async function previewParse(input) {
  try {
    const parsed = await parseFLRTS(input);
    const preview = document.getElementById('flrts-preview');
    
    if (preview) {
      preview.innerHTML = `
        <div class="flrts-preview-content">
          <strong>Preview:</strong>
          <div>Subject: ${parsed.workPackage.subject}</div>
          <div>Assignee: ${parsed.workPackage.assignee}</div>
          <div>Due: ${new Date(parsed.workPackage.dueDate).toLocaleString()}</div>
        </div>
      `;
      preview.style.display = 'block';
    }
  } catch (error) {
    // Silent fail for preview
  }
}

/**
 * Create work package in OpenProject
 */
async function createWorkPackage(parsed) {
  // Get OpenProject API token from storage
  const apiKey = await getOpenProjectAPIKey();
  
  const response = await fetch('/api/v3/work_packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa('apikey:' + apiKey)}`
    },
    body: JSON.stringify({
      subject: parsed.workPackage.subject,
      description: {
        format: 'markdown',
        raw: parsed.workPackage.description || ''
      },
      _links: {
        type: { href: `/api/v3/types/${parsed.workPackage.typeId || 2}` },
        assignee: { href: `/api/v3/users/${parsed.workPackage.assigneeId}` },
        project: { href: `/api/v3/projects/${parsed.workPackage.projectId || 1}` }
      },
      dueDate: parsed.workPackage.dueDate
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create work package');
  }

  return response.json();
}

/**
 * Handle voice input
 */
function handleVoiceInput() {
  const voiceBtn = document.getElementById('flrts-voice-btn');
  const input = document.getElementById('flrts-nlp-input');

  if (!('webkitSpeechRecognition' in window)) {
    showNotification('Voice input not supported in this browser', 'error');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    voiceBtn.classList.add('flrts-voice-active');
    voiceBtn.textContent = '🔴';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    previewParse(transcript);
  };

  recognition.onerror = (event) => {
    showNotification('Voice recognition error: ' + event.error, 'error');
  };

  recognition.onend = () => {
    voiceBtn.classList.remove('flrts-voice-active');
    voiceBtn.textContent = '🎤';
  };

  recognition.start();
}

/**
 * Show confirmation dialog
 */
async function showConfirmation(parsed) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'flrts-modal';
    modal.innerHTML = `
      <div class="flrts-modal-content">
        <h3>Confirm Task Creation</h3>
        <div class="flrts-confirm-details">
          <div><strong>Subject:</strong> ${parsed.workPackage.subject}</div>
          <div><strong>Assignee:</strong> ${parsed.workPackage.assignee}</div>
          <div><strong>Due Date:</strong> ${new Date(parsed.workPackage.dueDate).toLocaleString()}</div>
          <div><strong>Type:</strong> ${parsed.workPackage.type || 'Task'}</div>
          <div><strong>Priority:</strong> ${parsed.workPackage.priority || 'Normal'}</div>
        </div>
        <div class="flrts-modal-actions">
          <button id="flrts-confirm-yes">Create Task</button>
          <button id="flrts-confirm-no">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('flrts-confirm-yes').onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };

    document.getElementById('flrts-confirm-no').onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };
  });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `flrts-notification flrts-notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('flrts-notification-show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('flrts-notification-show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

/**
 * Get current user ID from OpenProject
 */
function getCurrentUserId() {
  // Try to extract from page data or localStorage
  return localStorage.getItem('flrts-user-id') || 'me';
}

/**
 * Get OpenProject API key
 */
async function getOpenProjectAPIKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openproject_api_key'], (result) => {
      resolve(result.openproject_api_key || '');
    });
  });
}

// Initialize
console.log('FLRTS Extension initialized successfully');