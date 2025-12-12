let isCollecting = false;
let collectedCount = 0;
let userStats = {};

const PRESET_USERS = [
  'user1',
  'user2, 
  'user3'
];

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded');
  
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const exportBtn = document.getElementById('exportBtn');
  const quickExportBtn = document.getElementById('quickExportBtn');
  const statusDiv = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const messageCount = document.getElementById('messageCount');
  const userBreakdown = document.getElementById('userBreakdown');

  // Загрузка сохраненного состояния
  chrome.storage.local.get(['isCollecting', 'collectedCount', 'userStats'], function(result) {
    console.log('Loaded state:', result);
    if (result.isCollecting) {
      updateStatus('Сбор продолжается...', 'info');
      isCollecting = true;
    }
    userStats = result.userStats || {};
    updateProgress(result.collectedCount || 0);
    updateUserStats();
  });

  startBtn.addEventListener('click', function() {
    console.log('Start button clicked');
    const additionalUsers = document.getElementById('additionalUsers').value
      .split('\n')
      .map(user => user.trim())
      .filter(user => user.length > 0);
    
    const allTargetUsers = [...PRESET_USERS, ...additionalUsers];
    const messageLimit = parseInt(document.getElementById('messageLimit').value);

    console.log('Target users:', allTargetUsers);
    console.log('Message limit:', messageLimit);

    if (allTargetUsers.length === 0) {
      updateStatus('Укажите хотя бы одного пользователя', 'error');
      return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) {
        updateStatus('Нет активной вкладки', 'error');
        return;
      }
      
      console.log('Sending message to tab:', tabs[0].id);
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startCollection',
        targetUsers: allTargetUsers,
        messageLimit: messageLimit,
        presetUsers: PRESET_USERS
      }, function(response) {
        console.log('Response from content script:', response);
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          updateStatus('Ошибка: ' + chrome.runtime.lastError.message, 'error');
          return;
        }
        
        if (response && response.success) {
          updateStatus(`Сбор начат для ${allTargetUsers.length} пользователей`, 'success');
          isCollecting = true;
        } else {
          updateStatus('Не удалось начать сбор', 'error');
        }
      });
    });
  });

  pauseBtn.addEventListener('click', function() {
    console.log('Pause button clicked');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'togglePause'
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Pause error:', chrome.runtime.lastError);
        }
      });
    });
  });

  stopBtn.addEventListener('click', function() {
    console.log('Stop button clicked');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stopCollection'
      }, function(response) {
        console.log('Stop response:', response);
        if (chrome.runtime.lastError) {
          console.error('Stop error:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.success) {
          updateStatus('Сбор остановлен', 'info');
          isCollecting = false;
        }
      });
    });
  });

  exportBtn.addEventListener('click', function() {
    console.log('Export button clicked');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'exportData'
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Export error:', chrome.runtime.lastError);
        }
      });
    });
  });

  quickExportBtn.addEventListener('click', function() {
    console.log('Quick export button clicked');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'quickExport'
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Quick export error:', chrome.runtime.lastError);
        }
      });
    });
  });

  // Слушатель обновлений статуса
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received in popup:', request);
    
    switch (request.action) {
      case 'updateStatus':
        updateStatus(request.message, request.type);
        break;
      case 'updateProgress':
        updateProgress(request.count);
        if (request.userStats) {
          userStats = request.userStats;
          updateUserStats();
        }
        break;
      case 'collectionStopped':
        isCollecting = false;
        updateStatus('Сбор завершен', 'success');
        break;
    }
    return true;
  });

  function updateStatus(message, type) {
    console.log('Status update:', message, type);
    statusDiv.textContent = message;
    statusDiv.style.background = 
      type === 'error' ? '#f8d7da' : 
      type === 'success' ? '#d4edda' : 
      type === 'info' ? '#d1ecf1' : '#f0f0f0';
    statusDiv.style.color = 
      type === 'error' ? '#721c24' : 
      type === 'success' ? '#155724' : 
      type === 'info' ? '#0c5460' : '#333';
  }

  function updateProgress(count) {
    collectedCount = count;
    messageCount.textContent = count;
    const limit = parseInt(document.getElementById('messageLimit').value);
    const percentage = Math.min((count / limit) * 100, 100);
    progressBar.style.width = percentage + '%';
    console.log('Progress updated:', count, percentage + '%');
  }

  function updateUserStats() {
    if (Object.keys(userStats).length === 0) {
      userBreakdown.innerHTML = '';
      return;
    }

    let statsHTML = '';
    for (const [username, count] of Object.entries(userStats)) {
      const isPreset = PRESET_USERS.includes(username);
      const highlight = isPreset ? 'style="color: #e91e63; font-weight: bold;"' : '';
      statsHTML += `<span ${highlight}>${username}: ${count}</span> | `;
    }
    
    statsHTML = statsHTML.slice(0, -3);
    userBreakdown.innerHTML = statsHTML;
  }
});