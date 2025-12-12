console.log('Background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Discord Message Collector installed');
});

// Обработка обновлений вкладок
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('discord.com')) {
    console.log('Discord page loaded, tab:', tabId);
  }
});

// Обработка сообщений от content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request, 'from:', sender.tab?.id);
  return false;
});