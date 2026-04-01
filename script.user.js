// ==UserScript==
// @name         아카콘 검색기
// @description  아카라이브 아카콘 이름 검색 기능
// @namespace    http://tampermonkey.net/
// @version      1.0.1
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
                    min-width: 0; /* flex 버그 방지 */
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

            // 크롬 스타일 UI 렌더링
            wrapper.innerHTML = `
                <input class="arcacon-search-input" type="text" placeholder="아카콘 이름 검색...">
                <div class="arcacon-search-status">
                    <span class="arcacon-search-count">0/0</span>
                    <button class="arcacon-search-nav prev" title="이전 (Shift+Enter)">ᐱ</button>
                    <button class="arcacon-search-nav next" title="다음 (Enter)">ᐯ</button>
                    <button class="arcacon-search-nav clear" title="지우기">✕</button>
                </div>
            `;

            contentPanel.prepend(wrapper);

            // 로직 연결
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

            // 매치되는 아카콘 찾기 및 포커스
            const updateMatches = () => {
                const keyword = input.value.trim().toLowerCase();
                const packages = Array.from(contentPanel.querySelectorAll(Config.selectors.packageWrap));

                // 기존 강조 효과 초기화
                packages.forEach(pkg => pkg.classList.remove('arcacon-match-active'));

                if (!keyword) {
                    matches = [];
                    currentIndex = -1;
                    countEl.textContent = '0/0';
                    return;
                }

                // 검색어 포함 여부 확인 (숨기지 않고 리스트만 수집)
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

            // 선택된 아카콘 강조 및 스크롤 이동
            const focusMatch = () => {
                matches.forEach((pkg, idx) => {
                    if (idx === currentIndex) {
                        pkg.classList.add('arcacon-match-active');
                        // 화면 중앙에 오도록 부드럽게 스크롤
                        pkg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        pkg.classList.remove('arcacon-match-active');
                    }
                });
                countEl.textContent = `${currentIndex + 1}/${matches.length}`;
            };

            // 이동 로직
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

            // 이벤트 리스너 등록
            input.addEventListener('input', updateMatches);

            // 엔터키 지원 (Enter: 다음, Shift+Enter: 이전)
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) prevMatch();
                    else nextMatch();
                }
            });

            btnNext.addEventListener('click', nextMatch);
            btnPrev.addEventListener('click', prevMatch);

            // X 버튼 누르면 초기화
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