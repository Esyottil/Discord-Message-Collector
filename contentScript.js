console.log('Discord Message Collector content script loaded');

class DiscordMessageCollector {
    constructor() {
        console.log('Initializing DiscordMessageCollector');
        this.isCollecting = false;
        this.isPaused = false;
        this.collectedMessages = [];
        this.targetUsers = [];
        this.presetUsers = [];
        this.messageLimit = 2000;
        this.processedMessages = new Set();
        this.scrollInterval = null;
        this.observer = null;
        this.sessionId = Date.now().toString();
        this.userStats = {};
        
        this.SELECTORS = {
            messages: [
                '[class*="message"]',
                '[data-list-item-id*="messages"]',
                '[role="article"]',
                '[class*="messageGroup"]'
            ],
            username: [
                '[class*="username"]',
                '[id*="user-"]',
                '[class*="author"]',
                '[data-author-id]'
            ],
            content: [
                '[class*="messageContent"]',
                '[class*="contents"]',
                '[class*="markup"]'
            ],
            timestamp: [
                '[class*="timestamp"]',
                'time'
            ],
            scrollContainer: [
                '[class*="scroller"]',
                '[class*="messagesWrapper"]',
                '[class*="content"]'
            ]
        };

        this.init();
    }

    init() {
        console.log('Initializing collector...');
        this.loadState();
        this.setupMutationObserver();
        this.setupMessageListener();
        this.createStatusIndicator();
        this.injectStyles();
        
        console.log('Discord Message Collector ready');
        this.updateStatus('Расширение загружено', 'info');
    }

    setupMessageListener() {
        console.log('Setting up message listeners');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received in content script:', request);
            
            try {
                switch (request.action) {
                    case 'startCollection':
                        this.startCollection(request.targetUsers, request.messageLimit, request.presetUsers);
                        sendResponse({success: true, message: 'Collection started'});
                        break;
                    case 'togglePause':
                        this.togglePause();
                        sendResponse({success: true});
                        break;
                    case 'stopCollection':
                        this.stopCollection();
                        sendResponse({success: true});
                        break;
                    case 'exportData':
                        this.exportData();
                        sendResponse({success: true});
                        break;
                    case 'quickExport':
                        this.quickExport();
                        sendResponse({success: true});
                        break;
                    default:
                        console.warn('Unknown action:', request.action);
                        sendResponse({success: false, error: 'Unknown action'});
                }
            } catch (error) {
                console.error('Error handling message:', error);
                sendResponse({success: false, error: error.message});
            }
            
            return true;
        });
        
        console.log('Message listeners setup complete');
    }

    async startCollection(targetUsers, messageLimit, presetUsers = []) {
        console.log('Starting collection with:', {targetUsers, messageLimit, presetUsers});
        
        if (this.isCollecting) {
            this.updateStatus('Сбор уже запущен', 'warning');
            return;
        }
        
        this.targetUsers = targetUsers.map(user => user.toLowerCase());
        this.presetUsers = presetUsers.map(user => user.toLowerCase());
        this.messageLimit = messageLimit;
        this.isCollecting = true;
        this.isPaused = false;
        this.collectedMessages = [];
        this.processedMessages.clear();
        this.userStats = {};
        
        this.updateStatus(`Начало сбора для ${targetUsers.length} пользователей`, 'info');
        this.updateStatusIndicator('Сбор активен', '#4CAF50');
        this.saveState();
        
        await this.randomDelay(1000, 2000);
        await this.scrollToTop();
        await this.startContinuousCollection();
        
        console.log('Collection started successfully');
    }

    async scrollToTop() {
        console.log('Scrolling to top...');
        const scrollContainer = this.findScrollContainer();
        if (!scrollContainer) {
            this.updateStatus('Не найден контейнер прокрутки', 'error');
            return;
        }

        return new Promise((resolve) => {
            let scrollAttempts = 0;
            const maxAttempts = 50;

            const scrollStep = () => {
                if (scrollAttempts >= maxAttempts || scrollContainer.scrollTop === 0) {
                    console.log('Reached top of chat');
                    this.updateStatus('Достигнуто начало истории', 'info');
                    resolve();
                    return;
                }

                scrollContainer.scrollTop = 0;
                scrollAttempts++;
                
                setTimeout(() => {
                    requestAnimationFrame(scrollStep);
                }, this.getRandomDelay(500, 1000));
            };

            scrollStep();
        });
    }

    async startContinuousCollection() {
        console.log('Starting continuous collection');
        
        this.scrollInterval = setInterval(() => {
            if (this.isPaused || !this.isCollecting) return;
            this.scrollAndCollect();
        }, this.getRandomDelay(2000, 4000));

        this.setupMessageObserver();
        this.processVisibleMessages();
    }

    setupMutationObserver() {
        console.log('Setting up mutation observer');
        
        try {
            this.observer = new MutationObserver((mutations) => {
                if (this.isCollecting && !this.isPaused) {
                    this.processNewMessages();
                }
            });

            const scrollContainer = this.findScrollContainer();
            if (scrollContainer) {
                this.observer.observe(scrollContainer, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    characterData: false
                });
                console.log('Mutation observer started');
            } else {
                console.warn('Scroll container not found for mutation observer');
            }
        } catch (error) {
            console.error('Error setting up mutation observer:', error);
        }
    }

    setupMessageObserver() {
        console.log('Setting up message observer');
        
        try {
            const messageObserver = new MutationObserver((mutations) => {
                if (this.isCollecting && !this.isPaused) {
                    this.processNewMessages();
                }
            });

            const mainContainer = document.querySelector('[class*="chatContent"]') || document.body;
            if (mainContainer) {
                messageObserver.observe(mainContainer, {
                    childList: true,
                    subtree: true
                });
                console.log('Message observer started');
            }
        } catch (error) {
            console.error('Error setting up message observer:', error);
        }
    }

    async scrollAndCollect() {
        if (this.collectedMessages.length >= this.messageLimit) {
            this.stopCollection();
            this.updateStatus(`Достигнут лимит в ${this.messageLimit} сообщений`, 'success');
            return;
        }

        const scrollContainer = this.findScrollContainer();
        if (!scrollContainer) {
            console.warn('Scroll container not found');
            return;
        }

        const scrollStep = 300 + Math.random() * 200;
        scrollContainer.scrollBy(0, scrollStep);

        await this.randomDelay(1000, 2000);
        this.processVisibleMessages();

        if (this.collectedMessages.length % 50 === 0 && this.collectedMessages.length > 0) {
            console.log(`Pausing after ${this.collectedMessages.length} messages`);
            await this.randomDelay(5000, 10000);
        }
    }

    processNewMessages() {
        requestAnimationFrame(() => {
            this.processVisibleMessages();
        });
    }

    processVisibleMessages() {
        try {
            const messageElements = this.findAllMessageElements();
            console.log(`Found ${messageElements.length} message elements`);
            
            let newMessages = 0;
            
            for (const element of messageElements) {
                if (this.processedMessages.has(element) || this.collectedMessages.length >= this.messageLimit) {
                    continue;
                }

                const messageData = this.extractMessageData(element);
                if (messageData && this.isTargetUser(messageData.username)) {
                    this.collectedMessages.push(messageData);
                    this.processedMessages.add(element);
                    
                    this.updateUserStats(messageData.username);
                    this.highlightMessage(element, this.isPresetUser(messageData.username));
                    
                    newMessages++;
                    
                    if (this.collectedMessages.length % 10 === 0) {
                        this.updateProgress(this.collectedMessages.length);
                    }
                }
            }

            if (newMessages > 0) {
                this.saveState();
                console.log(`Processed ${newMessages} new messages`);
            }

            if (this.collectedMessages.length % 500 === 0) {
                this.cleanupMemory();
            }
        } catch (error) {
            console.error('Error processing messages:', error);
        }
    }

    extractMessageData(element) {
        try {
            const username = this.findUsername(element);
            const content = this.findContent(element);
            const timestamp = this.findTimestamp(element);
            const messageId = this.getMessageId(element);

            if (!username || !content) {
                return null;
            }

            return {
                id: messageId,
                username: username,
                content: content.trim(),
                timestamp: timestamp || new Date().toISOString(),
                collectedAt: new Date().toISOString(),
                sessionId: this.sessionId
            };
        } catch (error) {
            console.error('Error extracting message data:', error);
            return null;
        }
    }

    findUsername(element) {
        for (const selector of this.SELECTORS.username) {
            const usernameElement = element.querySelector(selector);
            if (usernameElement) {
                const username = usernameElement.textContent.trim();
                if (username && username.length > 0) {
                    return username;
                }
            }
        }
        return null;
    }

    findContent(element) {
        for (const selector of this.SELECTORS.content) {
            const contentElement = element.querySelector(selector);
            if (contentElement) {
                return contentElement.textContent;
            }
        }
        return element.textContent || '';
    }

    findTimestamp(element) {
        for (const selector of this.SELECTORS.timestamp) {
            const timeElement = element.querySelector(selector);
            if (timeElement) {
                return timeElement.getAttribute('datetime') || timeElement.textContent.trim();
            }
        }
        return null;
    }

    getMessageId(element) {
        return element.getAttribute('data-list-item-id') || 
               element.getAttribute('id') || 
               `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    findAllMessageElements() {
        const elements = [];
        for (const selector of this.SELECTORS.messages) {
            try {
                const found = document.querySelectorAll(selector);
                elements.push(...Array.from(found));
            } catch (error) {
                console.warn('Selector failed:', selector, error);
            }
        }
        return [...new Set(elements)];
    }

    findScrollContainer() {
        for (const selector of this.SELECTORS.scrollContainer) {
            const container = document.querySelector(selector);
            if (container && container.scrollHeight > container.clientHeight) {
                return container;
            }
        }
        return document.documentElement;
    }

    isTargetUser(username) {
        if (!username) return false;
        return this.targetUsers.some(target => 
            username.toLowerCase().includes(target.toLowerCase())
        );
    }

    isPresetUser(username) {
        return this.presetUsers.some(preset => 
            username.toLowerCase().includes(preset.toLowerCase())
        );
    }

    highlightMessage(element, isPreset = false) {
        const highlightClass = isPreset ? 'discord-collector-highlight-preset' : 'discord-collector-highlight';
        element.classList.add(highlightClass);
        
        setTimeout(() => {
            if (element.classList.contains(highlightClass)) {
                element.classList.remove(highlightClass);
            }
        }, 5000);
    }

    updateUserStats(username) {
        if (!this.userStats[username]) {
            this.userStats[username] = 0;
        }
        this.userStats[username]++;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const status = this.isPaused ? 'приостановлен' : 'продолжается';
        const color = this.isPaused ? '#ff9800' : '#4CAF50';
        
        this.updateStatus(`Сбор ${status}`, 'info');
        this.updateStatusIndicator(`Сбор ${status}`, color);
        this.saveState();
        
        console.log(`Collection ${this.isPaused ? 'paused' : 'resumed'}`);
    }

    stopCollection() {
        console.log('Stopping collection');
        
        this.isCollecting = false;
        this.isPaused = false;
        
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
        
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.updateStatus(`Сбор остановлен. Собрано ${this.collectedMessages.length} сообщений`, 'info');
        this.updateStatusIndicator('Сбор остановлен', '#f44336');
        this.updateProgress(this.collectedMessages.length);
        this.saveState();
        
        chrome.runtime.sendMessage({
            action: 'collectionStopped'
        });
        
        console.log('Collection stopped');
    }

    exportData() {
        console.log('Exporting data');
        
        if (this.collectedMessages.length === 0) {
            this.updateStatus('Нет данных для экспорта', 'error');
            return;
        }

        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalMessages: this.collectedMessages.length,
                targetUsers: this.targetUsers,
                presetUsers: this.presetUsers,
                userStatistics: this.userStats,
                sessionId: this.sessionId,
                presetUserIds: {
                    'Curret': '0'
                }
            },
            messages: this.collectedMessages
        };

        this.downloadJSON(exportData, `discord_messages_${this.sessionId}.json`);
        this.updateStatus(`Экспортировано ${this.collectedMessages.length} сообщений`, 'success');
    }

    quickExport() {
        console.log('Quick exporting data');
        
        const presetMessages = this.collectedMessages.filter(msg => 
            this.isPresetUser(msg.username)
        );

        if (presetMessages.length === 0) {
            this.updateStatus('Не найдено сообщений для экспорта', 'warning');
            return;
        }

        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalMessages: presetMessages.length,
                presetUsers: this.presetUsers,
                userStatistics: Object.fromEntries(
                    Object.entries(this.userStats).filter(([user]) => 
                        this.isPresetUser(user)
                    )
                ),
                sessionId: this.sessionId + '_quick',
                note: 'Быстрый экспорт только сообщений'
            },
            messages: presetMessages
        };

        this.downloadJSON(exportData, `messages_${Date.now()}.json`);
        this.updateStatus(`Быстрый экспорт: ${presetMessages.length} сообщений`, 'success');
    }

    downloadJSON(data, filename) {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            this.updateStatus('Ошибка при экспорте: ' + error.message, 'error');
        }
    }

    cleanupMemory() {
        const maxProcessed = 10000;
        if (this.processedMessages.size > maxProcessed) {
            const array = Array.from(this.processedMessages);
            this.processedMessages = new Set(array.slice(-5000));
        }
    }

    createStatusIndicator() {
        if (document.getElementById('discord-collector-status')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'discord-collector-status';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            pointer-events: none;
        `;
        indicator.innerHTML = `
            <div>Discord Collector: <span id="collector-status-text">Неактивен</span></div>
            <div>Сообщений: <span id="collector-count">0</span></div>
        `;
        document.body.appendChild(indicator);
        
        console.log('Status indicator created');
    }

    updateStatusIndicator(text, color = '#666') {
        const statusText = document.getElementById('collector-status-text');
        const countElement = document.getElementById('collector-count');
        
        if (statusText) {
            statusText.textContent = text;
            statusText.style.color = color;
        }
        if (countElement) {
            countElement.textContent = this.collectedMessages.length;
        }
    }

    updateStatus(message, type) {
        console.log(`[Collector] ${message}`);
        chrome.runtime.sendMessage({
            action: 'updateStatus',
            message: message,
            type: type
        }).catch(error => {
            console.error('Error sending status update:', error);
        });
    }

    updateProgress(count) {
        chrome.runtime.sendMessage({
            action: 'updateProgress',
            count: count,
            userStats: this.userStats
        }).catch(error => {
            console.error('Error sending progress update:', error);
        });
        
        this.updateStatusIndicator(this.isPaused ? 'На паузе' : 'Активен', this.isPaused ? '#ff9800' : '#4CAF50');
    }

    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async randomDelay(min, max) {
        const delay = this.getRandomDelay(min, max);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    injectStyles() {
        if (document.getElementById('discord-collector-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'discord-collector-styles';
        style.textContent = `
            .discord-collector-highlight {
                background-color: #e8f5e8 !important;
                border-left: 3px solid #4CAF50 !important;
                transition: background-color 0.3s ease !important;
            }
            
            .discord-collector-highlight-preset {
                background-color: #ffebee !important;
                border-left: 3px solid #e91e63 !important;
                transition: background-color 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
    }

    saveState() {
        const state = {
            isCollecting: this.isCollecting,
            isPaused: this.isPaused,
            collectedMessages: this.collectedMessages,
            targetUsers: this.targetUsers,
            presetUsers: this.presetUsers,
            messageLimit: this.messageLimit,
            collectedCount: this.collectedMessages.length,
            sessionId: this.sessionId,
            userStats: this.userStats
        };
        
        chrome.storage.local.set(state).catch(error => {
            console.error('Error saving state:', error);
        });
    }

    async loadState() {
        try {
            const result = await chrome.storage.local.get([
                'isCollecting', 'isPaused', 'collectedMessages', 'targetUsers', 
                'presetUsers', 'messageLimit', 'collectedCount', 'sessionId', 'userStats'
            ]);

            console.log('Loaded state from storage:', result);

            if (result.isCollecting) {
                this.isCollecting = result.isCollecting;
                this.isPaused = result.isPaused || false;
                this.collectedMessages = result.collectedMessages || [];
                this.targetUsers = result.targetUsers || [];
                this.presetUsers = result.presetUsers || [];
                this.messageLimit = result.messageLimit || 2000;
                this.sessionId = result.sessionId || this.sessionId;
                this.userStats = result.userStats || {};
                
                this.updateProgress(this.collectedMessages.length);
                
                if (this.isCollecting && !this.isPaused) {
                    this.updateStatus('Возобновление сбора...', 'info');
                    this.updateStatusIndicator('Активен', '#4CAF50');
                    this.startContinuousCollection();
                } else if (this.isPaused) {
                    this.updateStatusIndicator('На паузе', '#ff9800');
                }
                
                console.log('State loaded successfully');
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }
}

// Глобальная инициализация
let collector;

function initializeCollector() {
    try {
        console.log('Initializing Discord Message Collector...');
        collector = new DiscordMessageCollector();
        window.discordCollector = collector; // Для отладки в консоли
        console.log('Discord Message Collector initialized successfully');
    } catch (error) {
        console.error('Failed to initialize collector:', error);
    }
}

// Запускаем инициализацию когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCollector);
} else {
    initializeCollector();
}

// Для отладки - глобальный доступ
window.getCollector = () => collector;