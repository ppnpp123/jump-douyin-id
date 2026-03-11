document.addEventListener('DOMContentLoaded', function() {
    const enableToggle = document.getElementById('enableToggle');
    const skipNowBtn = document.getElementById('skipNow');
    const refreshStatsBtn = document.getElementById('refreshStats');
    const skipCountDisplay = document.getElementById('skipCount');
    const keywordsInput = document.getElementById('keywordsInput');
    const saveKeywordsBtn = document.getElementById('saveKeywords');

    function loadSettings() {
        chrome.storage.sync.get(['enabled', 'keywords'], function(result) {
            if (result.enabled !== undefined) {
                enableToggle.checked = result.enabled;
            }
            if (result.keywords !== undefined && result.keywords !== '') {
                keywordsInput.value = result.keywords;
            } else {
                const defaultKeywords = '旗舰店';
                keywordsInput.value = defaultKeywords;
                chrome.storage.sync.set({ keywords: defaultKeywords });
            }
        });
    }

    function saveKeywords() {
        const keywords = keywordsInput.value.trim();
        chrome.storage.sync.set({ keywords: keywords }, function() {
            console.log('关键词已保存:', keywords);
            
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateKeywords',
                        keywords: keywords
                    }, function(response) {
                        const keywordsArray = keywords.split(/[,，]/).map(k => k.trim()).filter(k => k.length > 0);
                        console.log('关键词已更新到content script:', keywordsArray);
                    });
                }
            });
            
            saveKeywordsBtn.textContent = '已保存!';
            setTimeout(function() {
                saveKeywordsBtn.textContent = '保存关键词';
            }, 1500);
        });
    }

    loadSettings();

    enableToggle.addEventListener('change', function() {
        const enabled = this.checked;
        chrome.storage.sync.set({ enabled: enabled });
        
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: enabled ? 'enable' : 'disable'
                }, function(response) {
                    console.log('Plugin status:', enabled ? 'enabled' : 'disabled');
                });
            }
        });
    });

    saveKeywordsBtn.addEventListener('click', saveKeywords);

    skipNowBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'skipNow'
                }, function(response) {
                    console.log('Skip ad triggered');
                });
            }
        });
    });

    refreshStatsBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getStats'
                }, function(response) {
                    if (response && response.count !== undefined) {
                        skipCountDisplay.textContent = response.count;
                    }
                });
            }
        });
    });

    setInterval(function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getStats'
                }, function(response) {
                    if (response && response.count !== undefined) {
                        skipCountDisplay.textContent = response.count;
                    }
                });
            }
        });
    }, 2000);
});
