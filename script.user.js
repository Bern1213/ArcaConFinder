// ==UserScript==
// @name         아카콘 검색기
// @description  아카라이브 아카콘 이름 검색 기능
// @namespace    http://tampermonkey.net/
// @version      1.0.9
// @match        https://arca.live/b/*
// @grant        GM_addStyle
// @author       Bernadetta
// ==/UserScript==

(function () {
    'use strict';

    const Config = {
        selectors: {
            emoticonPanel: '.arcaconPicker .content',
            packageWrap: '.package-wrap',
            packageTitle: '.package-title'
        }
    };

    class UIManager {
        constructor() {
            GM_addStyle(`
                .arcacon-search-wrapper {
                    position: sticky;
                    top: 0;
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    background: var(--color-bg, #fff);
                    border-bottom: 1px solid var(--color-border, #ddd);
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: 4px 4px 0 0;
                }
                .arcacon-search-input {
                    flex: 1;
                    padding: 6px 10px;
                    border: 1px solid var(--color-border, #ccc);
                    border-radius: 4px;
                    background: var(--color-bg-sub, #f8f9fa);
                    color: var(--color-text, #333);
                    outline: none;
                    min-width: 0; 
                }
                .arcacon-search-input:focus {
                    border-color: #00a8ff;
                }
                .arcacon-search-status {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: var(--color-text-muted, #888);
                    font-size: 13px;
                    white-space: nowrap;
                }
                .arcacon-search-nav {
                    background: transparent;
                    border: none;
                    color: var(--color-text-muted, #888);
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                }
                .arcacon-search-nav:hover {
                    background: var(--color-bg-dark, #eee);
                    color: var(--color-text, #333);
                }
                .arcacon-help-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background-color: var(--color-border, #ccc);
                    color: var(--color-bg, #fff);
                    font-size: 12px;
                    font-weight: bold;
                    cursor: help;
                    position: relative;
                    flex-shrink: 0;
                    margin-left: 6px;
                }
                .arcacon-help-icon:hover::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    background: rgba(0, 0, 0, 0.75);
                    color: #fff;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 100;
                    pointer-events: none;
                }
            `);
        }

        injectSearchBar(contentPanel) {
            if (contentPanel.querySelector('.arcacon-search-wrapper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'arcacon-search-wrapper';

            wrapper.innerHTML = `
                <input class="arcacon-search-input" type="text" placeholder="아카콘 이름 검색...">
                <div class="arcacon-search-status">
                    <span class="arcacon-search-count">0/0</span>
                    <button type="button" class="arcacon-search-nav prev" title="이전 (Shift+Enter)">▲</button>
                    <button type="button" class="arcacon-search-nav next" title="다음 (Enter)">▼</button>
                    <div class="arcacon-help-icon" data-tooltip="엔터(Enter)를 누르면 검색된 아카콘으로 이동합니다.">?</div>
                </div>
            `;

            contentPanel.prepend(wrapper);
            this.bindSearchLogic(wrapper, contentPanel);
        }

        bindSearchLogic(wrapper, contentPanel) {
            const input = wrapper.querySelector('.arcacon-search-input');
            const countEl = wrapper.querySelector('.arcacon-search-count');
            const btnPrev = wrapper.querySelector('.prev');
            const btnNext = wrapper.querySelector('.next');

            let matches = [];
            let currentIndex = -1;

            const updateMatches = () => {
                const keyword = input.value.trim().toLowerCase();
                const packages = Array.from(contentPanel.querySelectorAll(Config.selectors.packageWrap));

                if (!keyword) {
                    matches = [];
                    currentIndex = -1;
                    countEl.textContent = '0/0';
                    return;
                }

                matches = packages.filter(pkg => {
                    const titleEl = pkg.querySelector(Config.selectors.packageTitle);
                    return titleEl && titleEl.innerText.toLowerCase().includes(keyword);
                });

                currentIndex = -1;
                countEl.textContent = `0/${matches.length}`;
            };

            const focusMatch = () => {
                if (currentIndex === -1 || matches.length === 0) return;

                const targetPkg = matches[currentIndex];
                const containerRect = contentPanel.getBoundingClientRect();

                const targetRect = targetPkg.getBoundingClientRect();
                const searchHeight = wrapper.offsetHeight || 35;

                const targetScrollTop = contentPanel.scrollTop + (targetRect.top - containerRect.top) - searchHeight - 2;

                if (Math.abs(contentPanel.scrollTop - targetScrollTop) > 2) {
                    contentPanel.scrollTop = targetScrollTop;
                }

                countEl.textContent = `${currentIndex + 1}/${matches.length}`;
            };

            const nextMatch = () => {
                if (matches.length === 0) return;
                if (currentIndex === -1) {
                    currentIndex = 0;
                } else {
                    currentIndex = (currentIndex + 1) % matches.length;
                }
                focusMatch();
            };

            const prevMatch = () => {
                if (matches.length === 0) return;
                if (currentIndex === -1) {
                    currentIndex = matches.length - 1;
                } else {
                    currentIndex = (currentIndex - 1 + matches.length) % matches.length;
                }
                focusMatch();
            };

            input.addEventListener('input', updateMatches);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) prevMatch();
                    else nextMatch();
                }
            });

            btnNext.addEventListener('click', nextMatch);
            btnPrev.addEventListener('click', prevMatch);
        }
    }

    class CoreApp {
        constructor() {
            this.ui = new UIManager();
        }

        init() {
            this.startObserving();
        }

        startObserving() {
            const observer = new MutationObserver(() => {
                const contentPanels = document.querySelectorAll(Config.selectors.emoticonPanel);

                contentPanels.forEach(panel => {
                    if (panel.querySelector(Config.selectors.packageWrap)) {
                        this.ui.injectSearchBar(panel);
                    }
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    const app = new CoreApp();
    app.init();

})();