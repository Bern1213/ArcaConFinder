// ==UserScript==
// @name         아카콘 검색기
// @description  아카라이브 아카콘 이름 검색 기능
// @namespace    http://tampermonkey.net/
// @version      1.0.3
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
                /* 강조 표시 효과 */
                .arcacon-match-active {
                    outline: 2px solid #00a8ff;
                    background-color: rgba(0, 168, 255, 0.05);
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
            `);
        }

        injectSearchBar(contentPanel) {
            if (contentPanel.querySelector('.arcacon-search-wrapper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'arcacon-search-wrapper';

            // 크롬 스타일 UI 렌더링 (화살표 아이콘 변경)
            wrapper.innerHTML = `
                <input class="arcacon-search-input" type="text" placeholder="아카콘 이름 검색...">
                <div class="arcacon-search-status">
                    <span class="arcacon-search-count">0/0</span>
                    <button class="arcacon-search-nav prev" title="이전 (Shift+Enter)">▲</button>
                    <button class="arcacon-search-nav next" title="다음 (Enter)">▼</button>
                    <button class="arcacon-search-nav clear" title="지우기">✕</button>
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
            const btnClear = wrapper.querySelector('.clear');

            let matches = [];
            let currentIndex = -1;

            const updateMatches = () => {
                const keyword = input.value.trim().toLowerCase();
                const packages = Array.from(contentPanel.querySelectorAll(Config.selectors.packageWrap));

                packages.forEach(pkg => pkg.classList.remove('arcacon-match-active'));

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

                if (matches.length > 0) {
                    currentIndex = 0;
                    focusMatch();
                } else {
                    currentIndex = -1;
                    countEl.textContent = '0/0';
                }
            };

            const focusMatch = () => {
                matches.forEach((pkg, idx) => {
                    if (idx === currentIndex) {
                        pkg.classList.add('arcacon-match-active');

                        // 스크롤 타겟을 패키지 전체가 아닌 '제목(.package-title)'으로 변경
                        const titleEl = pkg.querySelector(Config.selectors.packageTitle);
                        if (titleEl) {
                            titleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            pkg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        pkg.classList.remove('arcacon-match-active');
                    }
                });
                countEl.textContent = `${currentIndex + 1}/${matches.length}`;
            };

            const nextMatch = () => {
                if (matches.length === 0) return;
                currentIndex = (currentIndex + 1) % matches.length;
                focusMatch();
            };

            const prevMatch = () => {
                if (matches.length === 0) return;
                currentIndex = (currentIndex - 1 + matches.length) % matches.length;
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

            btnClear.addEventListener('click', () => {
                input.value = '';
                updateMatches();
                input.focus();
            });
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