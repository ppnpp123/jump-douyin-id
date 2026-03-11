(function() {
    'use strict';

    const config = {
        checkInterval: 300,
        adCheckDelay: 200,
        nextButtonSelector: '[data-e2e="video-switch-next-arrow"]',
        accountSelector: '.account',
        svgNamespace: 'http://www.w3.org/2000/svg'
    };

    let isEnabled = true;
    let lastCheckedUrl = window.location.href;
    let adDetectedCount = 0;
    let isSkipping = false;
    let customKeywords = [];

    function isAdElement(element) {
        const svgElements = element.querySelectorAll('svg[xmlns="' + config.svgNamespace + '"]');
        return svgElements.length > 0;
    }

    function isTimeEmpty(element) {
        const timeElement = element.querySelector('.video-create-time');
        if (!timeElement) return true;
        const text = timeElement.textContent.trim();
        return text === '';
    }

    function isAdAccount(element) {
        const accountText = element.textContent || '';
        return accountText.includes('@火山引擎');
    }

    function hasShoppingElement() {
        const rootElement = document.querySelector('#root');
        if (!rootElement) return false;
        
        const shopElement = rootElement.querySelector('.xgplayer-shop-anchor');
        if (!shopElement) return false;
        
        let parent = shopElement;
        while (parent) {
            const accountElement = parent.querySelector('.account');
            if (accountElement) {
                const allAccounts = rootElement.querySelectorAll('.account');
                for (let i = 0; i < allAccounts.length; i++) {
                    if (allAccounts[i] === accountElement) {
                        if (i === 1) {
                            console.log('[去广告] 检测到购物广告, .account索引: 1');
                            return true;
                        }
                        return false;
                    }
                }
            }
            parent = parent.parentElement;
            if (parent === rootElement) break;
        }
        
        return false;
    }

    function hasCustomKeyword() {
        if (customKeywords.length === 0) {
            return false;
        }
        
        const rootElement = document.querySelector('#root');
        if (!rootElement) {
            return false;
        }
        
        const accounts = rootElement.querySelectorAll('.account');
        if (accounts.length < 2) {
            return false;
        }
        
        const currentAccount = accounts[1];
        const accountText = currentAccount.textContent || '';
        
        for (const keyword of customKeywords) {
            if (accountText.includes(keyword)) {
                console.log('[去广告] 检测到自定义关键词:', keyword, '在元素: .account[1]');
                return true;
            }
        }
        
        return false;
    }

    function findNextButton() {
        const rootElement = document.querySelector('#root');
        if (!rootElement) return null;
        return rootElement.querySelector(config.nextButtonSelector);
    }

    function clickNextButton() {
        if (isSkipping) return false;
        
        const nextButton = findNextButton();
        if (!nextButton) {
            console.log('[去广告] 未找到下一个按钮');
            return false;
        }
        
        if (nextButton) {
            isSkipping = true;
            nextButton.click();
            adDetectedCount++;
            console.log('[去广告] 已跳过广告视频，累计:', adDetectedCount);
            
            setTimeout(() => {
                isSkipping = false;
            }, 3000);
            
            return true;
        }
        return false;
    }

    function checkAndSkipAd() {
        if (!isEnabled) return;

        const rootElement = document.querySelector('#root');
        if (!rootElement) return;

        const accounts = rootElement.querySelectorAll(config.accountSelector);
        
        if (accounts.length < 2) {
            return false;
        }
        
        const currentAccount = accounts[1];
        
        const hasSvg = isAdElement(currentAccount);
        const timeEmpty = isTimeEmpty(currentAccount);
        const hasShopping = hasShoppingElement();
        const hasKeyword = hasCustomKeyword();
        
        if (hasKeyword) {
            console.log('[去广告] 当前页面 .account 数量:', accounts.length);
            console.log('[去广告] 检测到自定义关键词广告, .account索引: 1');
            for (let i = 0; i < accounts.length; i++) {
                console.log('[去广告] .account[' + i + ']:', accounts[i].textContent.substring(0, 80));
            }
            clickNextButton();
            return true;
        }
        
        if (hasShopping) {
            console.log('[去广告] 当前页面 .account 数量:', accounts.length);
            clickNextButton();
            return true;
        }
        
        if (hasSvg && timeEmpty) {
            console.log('[去广告] 当前页面 .account 数量:', accounts.length);
            console.log('[去广告] 检测到广告: SVG=' + hasSvg + ', 时间为空=' + timeEmpty + ', .account索引: 1');
            console.log('[去广告] 账户:', currentAccount.textContent.substring(0, 50));
            
            clickNextButton();
            
            return true;
        }
        
        return false;
    }

    function init() {
        console.log('[去广告] 插件已启动');
        
        checkAndSkipAd();
        
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                    break;
                }
            }
            
            if (shouldCheck && window.location.href !== lastCheckedUrl) {
                lastCheckedUrl = window.location.href;
                setTimeout(checkAndSkipAd, 500);
            } else if (shouldCheck) {
                checkAndSkipAd();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setInterval(() => {
            if (document.visibilityState === 'visible') {
                checkAndSkipAd();
            }
        }, config.checkInterval);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.adBlocker = {
        enable: () => { isEnabled = true; console.log('[去广告] 已启用'); },
        disable: () => { isEnabled = false; console.log('[去广告] 已禁用'); },
        getStatus: () => ({ enabled: isEnabled, count: adDetectedCount }),
        skipNow: () => checkAndSkipAd()
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'enable') {
            isEnabled = true;
            sendResponse({ success: true });
        } else if (message.action === 'disable') {
            isEnabled = false;
            sendResponse({ success: true });
        } else if (message.action === 'skipNow') {
            checkAndSkipAd();
            sendResponse({ success: true });
        } else if (message.action === 'getStats') {
            sendResponse({ count: adDetectedCount });
        } else if (message.action === 'updateKeywords') {
            const keywordsStr = message.keywords || '';
            customKeywords = keywordsStr.split(/[,，]/).map(k => k.trim()).filter(k => k.length > 0);
            console.log('[去广告] 关键词已更新:', customKeywords);
            sendResponse({ success: true, keywords: customKeywords });
        }
        return true;
    });

    function loadKeywordsFromStorage() {
        chrome.storage.sync.get('keywords', function(result) {
            if (result.keywords) {
                customKeywords = result.keywords.split(/[,，]/).map(k => k.trim()).filter(k => k.length > 0);
                console.log('[去广告] 已加载关键词:', customKeywords);
            }
        });
    }

    loadKeywordsFromStorage();
})();
