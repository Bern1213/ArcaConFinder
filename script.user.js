// ==UserScript==
// @name         아카콘 검색기
// @description  아카라이브 아카콘 이름 검색 기능
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @match        https://arca.live/b/*
// @grant        GM_addStyle
// @author       Bernadetta
// ==/UserScript==

// TEST
(function () {
    'use strict';

    const Config = {
        selectors: {
            emoticonPanel: '.arcaconPicker .content', // 더 정확하게 타겟팅
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
                    padding: 8px 5px;
                    margin-bottom: 10px;
                    background: var(--color-bg, #fff); /* 스크롤 시 배경 겹침 방지 */
                    border-bottom: 1px solid var(--color-border, #ddd);
                    z-index: 10;
                }
                .arcacon-search-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid var(--color-border, #ccc);
                    border-radius: 4px;
                    background: var(--color-bg-sub, #f8f9fa);
                    color: var(--color-text, #333);
                    box-sizing: border-box;
                    outline: none;
                }
                .arcacon-search-input:focus {
                    border-color: #00a8ff;
                }
            `);
        }

        injectSearchBar(contentPanel, onSearch) {
            // 이미 검색창이 있다면 중복 생성 방지
            if (contentPanel.querySelector('.arcacon-search-wrapper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'arcacon-search-wrapper';

            const input = document.createElement('input');
            input.className = 'arcacon-search-input';
            input.type = 'text';
            input.placeholder = '아카콘 이름 검색...';

            input.addEventListener('input', (e) => onSearch(e.target.value, contentPanel));

            wrapper.appendChild(input);

            // prepend: contentPanel 내부의 가장 첫 번째 자식으로 삽입 (에러 발생 확률 0%)
            contentPanel.prepend(wrapper);
        }
    }

    class CoreApp {
        constructor() {
            this.ui = new UIManager();
        }

        init() {
            this.startObserving();
        }

        handleSearch(keyword, contentPanel) {
            const lowerKeyword = keyword.toLowerCase();
            // 전체 문서가 아닌, 현재 검색창이 있는 패널 안의 아카콘만 필터링
            const packages = contentPanel.querySelectorAll(Config.selectors.packageWrap);

            packages.forEach(pkg => {
                const titleEl = pkg.querySelector(Config.selectors.packageTitle);
                if (!titleEl) return;

                const titleText = titleEl.innerText.toLowerCase();
                pkg.style.display = titleText.includes(lowerKeyword) ? '' : 'none';
            });
        }

        startObserving() {
            const observer = new MutationObserver(() => {
                // .arcaconPicker 안에 있는 .content 요소들을 찾음
                const contentPanels = document.querySelectorAll(Config.selectors.emoticonPanel);

                contentPanels.forEach(panel => {
                    // 아카콘 내용물이 렌더링되었을 때만 검색창 삽입
                    if (panel.querySelector(Config.selectors.packageWrap)) {
                        this.ui.injectSearchBar(panel, this.handleSearch.bind(this));
                    }
                });
            });

            // 화면 전체 감시
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    const app = new CoreApp();
    app.init();

})();