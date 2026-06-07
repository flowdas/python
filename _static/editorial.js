(function() {
    'use strict';

    class EditorialUI {
        constructor() {
            const metaApi = document.querySelector('meta[name="editorial-api-url"]');
            const configApiUrl = metaApi ? metaApi.getAttribute('content') : '';
            if (configApiUrl) {
                this.apiUrl = configApiUrl;
            } else {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    this.apiUrl = '/api';
                } else {
                    this.apiUrl = 'https://editorial-api.flowdas.org/api';
                }
            }
            this.msgidMap = new Map();
            this.catalogPath = this.inferCatalogPath();
            this.catalogId = null;
            this.catalogPromise = null;
            this.user = this.checkAuthFromCookie();
            this.footnotes = []; 
            this.interactionData = {};
            this.loadingStates = {};
            this.sortModes = {}; // Default is 'popular'
            this.guideContent = null;
            this.aboutContent = null;
            this.progressHistory = null;
            this.activeNoteEdits = {}; // To store original HTML for cancellations
            this.highlighterEnabled = localStorage.getItem('editorial-highlighter-enabled') === 'true';
            this.highlighterThreshold = parseInt(localStorage.getItem('editorial-highlighter-threshold') || '70', 10);
            this.init();
        }

        checkAuthFromCookie() {
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) {
                    const rawVal = parts.pop().split(';').shift();
                    return rawVal ? decodeURIComponent(rawVal).replace(/^["']|["']$/g, '') : null;
                }
                return null;
            };
            const userId = getCookie('editorial_user');
            const username = getCookie('editorial_name');
            if (userId) {
                return { user_id: userId, username: username || 'user' };
            }
            return null;
        }

        inferCatalogPath() {
            let path = window.location.pathname;
            if (path.endsWith('/')) path += 'index.html';
            let relPath = path;
            if (relPath.startsWith('/')) {
                relPath = relPath.slice(1);
            }
            if (relPath.endsWith('.html')) {
                relPath = relPath.slice(0, -5) + '.po';
            } else if (!relPath.includes('.')) {
                relPath = relPath + '.po';
            }
            return relPath;
        }

        init() {
            const run = async () => {
                console.log('Editorial UI: Start processing page...');
                try {
                    await this.processPage();
                } catch (err) {
                    console.error('Editorial critical failure:', err);
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', run);
            } else {
                run();
            }
        }

        async processPage() {
            const staticUrl = document.querySelector('link[rel="stylesheet"][href*="_static/"]').href.split('_static/')[0] + '_static/';
            this.fetchGuide(staticUrl); // Fetch static guide.json
            this.fetchAbout(staticUrl); // Fetch static about.json
            this.fetchProgressHistory(staticUrl); // Fetch static progress_history.json
            
            this.catalogPromise = fetch(`${staticUrl}catalogs.json`)
                .then(res => res.json())
                .then(data => {
                    this.catalogId = data[this.catalogPath] || 0;
                    return this.catalogId;
                }).catch(err => {
                    this.catalogId = 0;
                    return 0;
                });

            // Initialize sidebar panel and trigger button unconditionally
            this.renderFootnoteSection();
            this.setupMobileSidebar();
            this.setupDesktopSidebar();

            const els = document.querySelectorAll('[data-msgid]');
            if (els.length === 0) return;

            const hashes = [];
            for (const el of els) {
                const hash = el.getAttribute('data-msgid');
                el.setAttribute('data-hash', hash);
                if (!this.msgidMap.has(hash)) {
                    this.msgidMap.set(hash, { elements: [] });
                    hashes.push(hash);
                }
                this.msgidMap.get(hash).elements.push(el);
            }

            let footnoteCount = 0;
            hashes.forEach(hash => {
                footnoteCount++;
                const entry = this.msgidMap.get(hash);
                this.addFootnoteMarker(hash, entry.elements, footnoteCount);
                this.footnotes.push({ hash, number: footnoteCount });
            });

            if (this.footnotes.length > 0) {
                this.flashMarkers();
            }
            this.applyHighlighter();
            this.applySinceHighlighter();
        }

        async fetchGuide(staticUrl) {
            try {
                const res = await fetch(`${staticUrl}guide.json`);
                if (res.ok) {
                    const data = await res.json();
                    this.guideContent = data.content;
                    document.body.classList.add('has-editorial-guide');
                    // Add guide button to any already rendered editors
                    document.querySelectorAll('.guide-btn-container').forEach(c => c.style.display = 'block');
                }
            } catch (err) { console.warn('Static guide.json not found:', err); }
        }

        async fetchAbout(staticUrl) {
            try {
                const res = await fetch(`${staticUrl}about.json`);
                if (res.ok) {
                    const data = await res.json();
                    this.aboutContent = data.content;
                }
            } catch (err) { console.warn('Static about.json not found:', err); }
        }

        async fetchProgressHistory(staticUrl) {
            try {
                const res = await fetch(`${staticUrl}progress_history.json`);
                if (res.ok) {
                    const data = await res.json();
                    this.progressHistory = data.history;
                }
            } catch (err) { console.warn('Static progress_history.json not found:', err); }
        }

        flashMarkers() {
            const markers = document.querySelectorAll('.editorial-marker');
            markers.forEach(m => m.classList.add('flash'));
            setTimeout(() => {
                markers.forEach(m => m.classList.remove('flash'));
            }, 2500);
        }

        addFootnoteMarker(hash, elements, number) {
            elements.forEach(el => {
                if (el.querySelector('.editorial-marker')) return;
                el.classList.add('has-footnote');
                const marker = document.createElement('span');
                marker.className = 'editorial-marker';
                marker.textContent = number;
                marker.onclick = (e) => {
                    e.stopPropagation();
                    this.openSidebarPanel(hash, number);
                };
                el.appendChild(marker);
            });
        }

        setupDesktopSidebar() {
            const sidebar = document.getElementById('editorial-sidebar');
            const container = document.getElementById('editorial-container');
            const collapseBtn = document.getElementById('editorial-sidebar-collapse-btn');
            const expandBtn = document.getElementById('editorial-sidebar-expand-btn');

            if (!sidebar || !container) return;

            // Load initial state from localStorage
            const isCollapsed = localStorage.getItem('editorial-sidebar-collapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                container.classList.add('editorial-sidebar-collapsed-state');
            }

            // Bind click for collapse button
            if (collapseBtn) {
                collapseBtn.addEventListener('click', () => {
                    sidebar.classList.add('collapsed');
                    container.classList.add('editorial-sidebar-collapsed-state');
                    localStorage.setItem('editorial-sidebar-collapsed', 'true');
                });
            }

            // Bind click for expand button
            if (expandBtn) {
                expandBtn.addEventListener('click', () => {
                    sidebar.classList.remove('collapsed');
                    container.classList.remove('editorial-sidebar-collapsed-state');
                    localStorage.setItem('editorial-sidebar-collapsed', 'false');
                });
            }
        }

        setupMobileSidebar() {
            // Create a backdrop overlay element for mobile sidebar
            let backdrop = document.getElementById('editorial-sidebar-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'editorial-sidebar-backdrop';
                document.body.appendChild(backdrop);
                backdrop.addEventListener('click', () => {
                    this.closeMobileSidebar();
                });
            }

            // Bind click to mobile toggle menu button
            const toggleBtn = document.getElementById('editorial-sidebar-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.openMobileSidebar();
                });
            }

            // Bind click to mobile close button
            const closeBtn = document.getElementById('editorial-sidebar-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeMobileSidebar();
                });
            }

            // Automatically close sidebar when any link inside sidebar is clicked
            const sidebar = document.getElementById('editorial-sidebar');
            if (sidebar) {
                sidebar.querySelectorAll('a').forEach(link => {
                    link.addEventListener('click', () => {
                        this.closeMobileSidebar();
                    });
                });
            }
        }

        openMobileSidebar() {
            const sidebar = document.getElementById('editorial-sidebar');
            const backdrop = document.getElementById('editorial-sidebar-backdrop');
            if (sidebar) sidebar.classList.add('open');
            if (backdrop) backdrop.classList.add('visible');
        }

        closeMobileSidebar() {
            const sidebar = document.getElementById('editorial-sidebar');
            const backdrop = document.getElementById('editorial-sidebar-backdrop');
            if (sidebar) sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('visible');
        }

        renderFootnoteSection() {
            this.renderSidebarPanel();
        }

        renderSidebarPanel() {
            let panel = document.getElementById('editorial-sidebar-panel');
            if (!panel) {
                // Overlay
                const overlay = document.createElement('div');
                overlay.id = 'editorial-sidebar-overlay';
                overlay.onclick = () => this.closeSidebarPanel();
                document.body.appendChild(overlay);

                // Panel
                panel = document.createElement('div');
                panel.id = 'editorial-sidebar-panel';
                
                // Restore saved width from localStorage if present
                const savedWidth = localStorage.getItem('editorial-sidebar-width');
                if (savedWidth) {
                    panel.style.width = savedWidth;
                }

                panel.innerHTML = `
                    <div class="sidebar-resizer"></div>
                    <div class="sidebar-panel-header">
                        <div class="panel-tabs">
                            <button id="tab-btn-dashboard" class="panel-tab-btn active" onclick="window.editorial.switchTab('dashboard')">
                                대시보드
                            </button>
                            <button id="tab-btn-edit" class="panel-tab-btn" onclick="window.editorial.switchTab('edit')">
                                번역 편집 <span class="panel-marker-badge" style="display: none;"></span>
                            </button>
                            <button id="tab-btn-guide" class="panel-tab-btn" onclick="window.editorial.switchTab('guide')">
                                번역 가이드
                            </button>
                            <button id="tab-btn-about" class="panel-tab-btn" onclick="window.editorial.switchTab('about')">
                                Editorial
                            </button>
                        </div>
                        <button class="panel-close-btn" onclick="window.editorial.closeSidebarPanel()">×</button>
                    </div>
                    <div class="sidebar-panel-body">
                        <div id="tab-content-dashboard" class="tab-pane active">
                            <!-- Dynamic Dashboard Content -->
                        </div>
                        <div id="tab-content-edit" class="tab-pane">
                            <div id="editorial-active-editor-root">
                                <!-- Dynamic Editor Content -->
                            </div>
                        </div>
                        <div id="tab-content-guide" class="tab-pane">
                            <p class="loading" style="padding: 2rem; text-align: center; color: var(--text-muted);">번역 가이드를 불러오는 중...</p>
                        </div>
                        <div id="tab-content-about" class="tab-pane">
                            <p class="loading" style="padding: 2rem; text-align: center; color: var(--text-muted);">Editorial 정보를 불러오는 중...</p>
                        </div>
                    </div>
                `;
                document.body.appendChild(panel);

                // Initialize Sidebar Resizer Dragging
                const resizer = panel.querySelector('.sidebar-resizer');
                let isDragging = false;

                resizer.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    isDragging = true;
                    panel.classList.add('resizing');
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    const containerWidth = window.innerWidth;
                    let newWidth = containerWidth - e.clientX;

                    // Bounds checking: minimum 400px, maximum 95vw of the window
                    const minWidth = 400;
                    const maxWidth = containerWidth * 0.95;

                    if (newWidth < minWidth) newWidth = minWidth;
                    if (newWidth > maxWidth) newWidth = maxWidth;

                    panel.style.width = `${newWidth}px`;
                });

                document.addEventListener('mouseup', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    panel.classList.remove('resizing');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';

                    // Save custom width setting in localStorage
                    localStorage.setItem('editorial-sidebar-width', panel.style.width);
                });

                // Floating Trigger Button
                const trigger = document.createElement('button');
                trigger.id = 'editorial-floating-trigger';
                trigger.innerHTML = '번역 편집';
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    this.openSidebarPanel(null, null);
                };
                document.body.appendChild(trigger);
            }
        }

        switchTab(tabId) {
            // Remove active classes
            document.querySelectorAll('.panel-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            // Add active classes to selected tab
            const btn = document.getElementById(`tab-btn-${tabId}`);
            const pane = document.getElementById(`tab-content-${tabId}`);
            if (btn) btn.classList.add('active');
            if (pane) pane.classList.add('active');

            // Lazily render translation guide if switching to guide
            if (tabId === 'guide') {
                const guideRoot = document.getElementById('tab-content-guide');
                if (guideRoot && this.guideContent && !guideRoot.querySelector('.guide-tab-wrapper')) {
                    guideRoot.innerHTML = `
                        <div class="guide-tab-wrapper markdown-content">
                            ${this.renderMarkdown(this.guideContent)}
                        </div>
                    `;
                } else if (guideRoot && !this.guideContent) {
                    guideRoot.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--text-muted);">등록된 번역 가이드가 없습니다.</p>`;
                }
            }

            // Lazily render about content if switching to about
            if (tabId === 'about') {
                const aboutRoot = document.getElementById('tab-content-about');
                if (aboutRoot && this.aboutContent && !aboutRoot.querySelector('.about-tab-wrapper')) {
                    aboutRoot.innerHTML = `
                        <div class="about-tab-wrapper markdown-content">
                            ${this.renderMarkdown(this.aboutContent)}
                        </div>
                    `;
                } else if (aboutRoot && !this.aboutContent) {
                    aboutRoot.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--text-muted);">등록된 Editorial 정보가 없습니다.</p>`;
                }
            }

            // Lazily render dashboard if switching to dashboard
            if (tabId === 'dashboard') {
                const dashboardRoot = document.getElementById('tab-content-dashboard');
                if (dashboardRoot) {
                    this.renderDashboard(dashboardRoot);
                }
            }
        }

        openSidebarPanel(hash, number) {
            this.renderSidebarPanel(); // Ensure panel is created
            
            const overlay = document.getElementById('editorial-sidebar-overlay');
            const panel = document.getElementById('editorial-sidebar-panel');
            
            // Auto switch/focus to proper tab: 'edit' if msgid clicked, 'dashboard' if opened generically
            if (hash && number) {
                this.switchTab('edit');
            } else {
                this.switchTab('dashboard');
            }

            // Set circular header badge inside the tab label
            const badge = panel.querySelector('.panel-marker-badge');
            
            if (hash && number) {
                if (badge) {
                    badge.textContent = number;
                    badge.style.display = 'inline-flex';
                    badge.onclick = (e) => {
                        e.stopPropagation();
                        this.scrollToElement(hash);
                    };
                }
                
                // Render the active editor form for this hash into the panel body
                const root = document.getElementById('editorial-active-editor-root');
                if (root) {
                    const isAuth = !!this.user;
                    const msgstrPlaceholder = isAuth ? "번역을 입력하세요..." : "로그인하고 번역 제안하기";
                    const notePlaceholder = isAuth ? "간단한 설명을 남기실 수 있습니다..." : "로그인이 필요합니다";
                    const disabledAttr = isAuth ? "" : "disabled";
                    const copyRefBtnHtml = isAuth 
                        ? `<button class="btn-copy-ref" onclick="window.editorial.copyOriginalToEditor('${hash}')" title="원문을 번역란에 복사합니다."><span>📋</span> 원문 복사</button>`
                        : '';
                    const actionButtonHtml = isAuth 
                        ? `<button class="btn-submit" onclick="window.editorial.submitSuggestion('${hash}')">새 번역 제안</button>`
                        : `<a href="${this.apiUrl}/auth/github?next=${encodeURIComponent(window.location.pathname + window.location.search)}" class="github-login-btn">GitHub으로 로그인</a>`;

                    root.innerHTML = `
                        <div class="unified-editor" id="editor-${hash}">
                            <div class="msgid-ref">
                                <div class="msgid-ref-header">
                                    <div class="ref-label">원문</div>
                                    ${copyRefBtnHtml}
                                </div>
                                <div class="msgid-lines-container">
                                    <div style="padding: 0.5rem 1rem; color: var(--text-muted); font-size: 0.85rem;">로딩 중...</div>
                                </div>
                            </div>
                            <div class="unified-input-group" style="margin-top: 1rem;">
                                <div class="live-editor">
                                    <div class="editor-container ${!isAuth ? 'disabled' : ''}">
                                        <pre id="highlight-${hash}" class="highlight-layer language-rest" aria-hidden="true"><code class="language-rest"></code></pre>
                                        <textarea id="input-msgstr-${hash}" class="msgstr-textarea" 
                                            placeholder="${msgstrPlaceholder}" 
                                            ${disabledAttr}
                                            oninput="window.editorial.handleLiveInput('${hash}', this.value)"
                                            onscroll="window.editorial.syncScroll('${hash}')"></textarea>
                                    </div>
                                </div>
                                <div class="note-container">
                                    <textarea id="input-note-${hash}" class="note-textarea" 
                                        placeholder="${notePlaceholder}" 
                                        ${disabledAttr}
                                        oninput="window.editorial.autoResize(this)"></textarea>
                                </div>
                            </div>
                            <div class="form-actions">
                                ${actionButtonHtml}
                            </div>
                        </div>
                        <div class="interaction-header">
                            <span class="section-title">등록된 제안</span>
                            <div class="sort-controls">
                                <button class="sort-btn" id="sort-popular-${hash}" onclick="window.editorial.setSortMode('${hash}', 'popular')">인기순</button>
                                <button class="sort-btn" id="sort-newest-${hash}" onclick="window.editorial.setSortMode('${hash}', 'newest')">최신순</button>
                            </div>
                        </div>
                        <div class="interaction-content" id="content-${hash}">
                            <p class="loading">로딩 중...</p>
                        </div>
                    `;

                    // Highlight/configure the newly generated form elements
                    const textarea = document.getElementById(`input-msgstr-${hash}`);
                    if (textarea) {
                        this.handleLiveInput(hash, textarea.value);
                    }
                    const noteTextarea = document.getElementById(`input-note-${hash}`);
                    if (noteTextarea) this.autoResize(noteTextarea);
                    
                    this.applyHighlighting(root);
                }
                
                // Load the interaction data (suggestions/comments) for this hash
                this.loadInteractionData(hash);
            } else {
                // No selected footnote mode
                if (badge) badge.style.display = 'none';
                
                const root = document.getElementById('editorial-active-editor-root');
                if (root) {
                    root.innerHTML = `
                        <div class="sidebar-no-selection-container">
                            <h4>선택된 문장이 없습니다</h4>
                            <p>번역을 편집하려면 본문에서 문장 옆의 <strong>번호(원 모양 마커)</strong>를 클릭하세요.</p>
                        </div>
                    `;
                }
            }
            
            // Show the sidebar panel and overlay
            if (overlay) overlay.classList.add('visible');
            if (panel) panel.classList.add('visible');
            
            // Disable body scroll when sidebar is open
            document.body.style.overflow = 'hidden';
        }

        closeSidebarPanel() {
            const overlay = document.getElementById('editorial-sidebar-overlay');
            const panel = document.getElementById('editorial-sidebar-panel');
            
            if (overlay) overlay.classList.remove('visible');
            if (panel) panel.classList.remove('visible');
            
            // Re-enable body scroll
            document.body.style.overflow = '';
        }

        highlightLine(text, lang) {
            if (!text) return ' ';
            if (window.Prism && window.Prism.languages[lang]) {
                return window.Prism.highlight(text, window.Prism.languages[lang], lang);
            }
            return this.escapeHtml(text);
        }

        handleLiveInput(hash, value) {
            const textarea = document.getElementById(`input-msgstr-${hash}`);
            const highlight = document.querySelector(`#highlight-${hash} code`);
            this.autoResize(textarea);
            
            if (highlight) {
                const lines = value.split('\n');
                const linesHtml = lines.map((line, i) => {
                    const highlighted = this.highlightLine(line, 'rest');
                    return `<div class="highlight-line" data-line="${i + 1}">${highlighted}</div>`;
                }).join('');
                highlight.innerHTML = linesHtml;
            }
            
            this.syncScroll(hash);
        }

        syncScroll(hash) {
            const textarea = document.getElementById(`input-msgstr-${hash}`);
            const highlight = document.getElementById(`highlight-${hash}`);
            if (textarea && highlight) {
                highlight.scrollTop = textarea.scrollTop;
                highlight.scrollLeft = textarea.scrollLeft;
            }
        }

        async toggleFootnote(hash) {
            const item = document.getElementById(`fn-${hash}`);
            if (!item) return;
            const isOpening = item.classList.contains('collapsed');
            item.classList.toggle('collapsed');
            const icon = item.querySelector('.toggle-icon');
            if (icon) icon.textContent = item.classList.contains('collapsed') ? '▼' : '▲';
            if (isOpening && !this.interactionData[hash]) {
                await this.loadInteractionData(hash);
            }
        }

        async loadInteractionData(hash) {
            if (this.loadingStates[hash]) return;
            this.loadingStates[hash] = true;
            try {
                if (this.catalogId === null && this.catalogPromise) await this.catalogPromise;
                // NO user_id in param. Server reads cookie.
                const response = await fetch(`${this.apiUrl}/suggestions/${this.catalogId}/${hash}`, {
                    credentials: 'include'
                });
                const data = await response.json();
                this.interactionData[hash] = {
                    msgid: data.msgid, 
                    suggestions: data.suggestions.map(s => ({ ...s, type: 'suggestion', time: new Date(s.created_at || Date.now()) }))
                };
                this.renderInteractionContent(hash);
                const msgidContainer = document.querySelector(`#editor-${hash} .msgid-lines-container`);
                if (msgidContainer && data.msgid) {
                    const lines = data.msgid.split('\n');
                    msgidContainer.innerHTML = lines.map((lineText, i) => {
                        return `
                            <div class="msgid-line">
                                <span class="msgid-line-num" aria-hidden="true">${i + 1}</span>
                                <pre class="msgid-line-code language-rest"><code class="language-rest">${this.escapeHtml(lineText || ' ')}</code></pre>
                            </div>
                        `;
                    }).join('');
                    this.applyHighlighting(msgidContainer);
                }
            } catch (err) {
                console.error('Error loading interaction data:', err);
                const container = document.getElementById(`content-${hash}`);
                if (container) container.innerHTML = '<p>데이터를 불러오지 못했습니다.</p>';
            } finally {
                delete this.loadingStates[hash];
            }
        }

        renderInteractionContent(hash) {
            const data = this.interactionData[hash];
            const container = document.getElementById(`content-${hash}`);
            if (!container || !data) return;

            // Update Sort UI for this specific hash
            const mode = this.sortModes[hash] || 'popular';
            const itemEl = document.getElementById('editorial-sidebar-panel');
            if (itemEl) {
                itemEl.querySelectorAll(`.sort-controls button`).forEach(b => b.classList.remove('active'));
                const pBtn = document.getElementById(`sort-popular-${hash}`);
                const nBtn = document.getElementById(`sort-newest-${hash}`);
                if (pBtn && nBtn) {
                    if (mode === 'popular') pBtn.classList.add('active');
                    else nBtn.classList.add('active');
                }
            }

            if (data.suggestions.length === 0) {
                container.innerHTML = '<p class="empty-msg">아직 등록된 번역 제안이 없습니다.</p>';
                return;
            }

            // Sort suggestions locally
            const sorted = [...data.suggestions].sort((a, b) => {
                if (mode === 'popular') {
                    if (b.votes !== a.votes) return b.votes - a.votes;
                    return b.time - a.time;
                } else {
                    return b.time - a.time;
                }
            });

            container.innerHTML = sorted.map(item => {
                const isAuth = !!this.user;
                let statusHtml = '';
                if (item.buildable === true || item.buildable === 1) {
                    statusHtml = '<span class="status-badge success">Success</span>';
                } else if (item.buildable === false || item.buildable === 0 || item.buildable === -1) {
                    statusHtml = '<span class="status-badge error">Error</span>';
                } else {
                    statusHtml = '<span class="status-badge pending">Pending</span>';
                }

                const publishedHtml = item.published ? '<span class="status-badge success font-weight-bold" style="background-color: #2e7d32; border-color: #2e7d32; color: #ffffff; font-weight: 600; margin-left: 0.35rem;">✓ 현재 출판됨</span>' : '';

                const aiBadge = item.is_machine ? '<span class="ai-badge">AI</span>' : '';
                
                const safeMsgstr = this.escapeHtml(item.msgstr);
                const contentHtml = `<div class="item-text"><pre class="code-block language-rest"><code class="language-rest">${safeMsgstr}</code></pre></div>`;
                let noteHtml = '';
                const isAuthor = this.user && String(this.user.user_id) === String(item.author_id);
                console.log(`[Suggestion Note Debug] msgstr: "${item.msgstr.substring(0, 15)}...", this.user:`, this.user, `item.author_id:`, item.author_id, `isAuthor:`, isAuthor);
                const hasNote = item.note && item.note.trim();
                
                if (hasNote || isAuthor) {
                    if (isAuthor && !hasNote) {
                        noteHtml = `
                            <div id="note-container-${item.msgstr_hash}" class="item-note-caption empty-note-author">
                                <span class="note-text-content"></span>
                                <span class="note-actions always-visible">
                                    <button class="note-action-btn edit-note-btn" title="노트 추가" onclick="window.editorial.editNote('${hash}', '${item.msgstr_hash}')">✏️ 노트 추가</button>
                                </span>
                            </div>
                        `;
                    } else {
                        const safeNote = hasNote ? this.escapeHtml(item.note) : '';
                        const displayStyle = hasNote ? '' : 'display: none;';
                        const editBtnHtml = isAuthor ? `
                            <span class="note-actions">
                                <button class="note-action-btn edit-note-btn" title="노트 수정" onclick="window.editorial.editNote('${hash}', '${item.msgstr_hash}')">✏️</button>
                                <button class="note-action-btn delete-note-btn" title="노트 삭제" onclick="window.editorial.deleteNote('${hash}', '${item.msgstr_hash}')" style="${displayStyle}">🗑️</button>
                            </span>
                        ` : '';
                        
                        noteHtml = `
                            <div id="note-container-${item.msgstr_hash}" class="item-note-caption" style="${displayStyle}">
                                <span class="note-text-content">${safeNote}</span>
                                ${editBtnHtml}
                            </div>
                        `;
                    }
                }
                
                let errorHtml = '';
                if (item.error_log) {
                    const safeError = this.escapeHtml(item.error_log);
                    errorHtml = `
                        <div class="error-log-container">
                            <details class="error-details">
                                <summary class="error-summary">⚠️ 빌드 에러 원인 보기</summary>
                                <pre class="error-pre">${safeError}</pre>
                            </details>
                        </div>
                    `;
                }
                
                const canDeleteMsgStr = isAuthor && item.votes <= 0;
                const deleteMsgStrBtnHtml = canDeleteMsgStr 
                    ? `<button class="action-icon-btn delete-suggestion-btn" title="번역 제안 삭제" onclick="window.editorial.deleteSuggestion('${hash}', '${item.msgstr_hash}')">🗑️ 삭제</button>` 
                    : '';
                
                const voteBtnClass = (item.voted ? 'voted' : '') + (!this.user ? ' disabled' : '');
                const voteOnClick = this.user ? `onclick="window.editorial.vote('${hash}', '${item.msgstr_hash}')"` : 'onclick="alert(\'로그인이 필요합니다.\')"';
                
                const avatarHtml = item.author_avatar 
                    ? `<img src="${item.author_avatar}" class="author-avatar" alt="${item.author_name}">`
                    : `<div class="author-avatar placeholder">${item.author_name[0].toUpperCase()}</div>`;
 
                let reviewHtml = '';
                if (item.review) {
                    const safeReview = this.escapeHtml(item.review);
                    const scoreLabel = (item.review_score !== null && item.review_score !== undefined) ? ` (품질 점수: ${Math.round(item.review_score * 100)})` : '';
                    
                    let reviewStatusHtml = '';
                    if (item.review_buildable === true || item.review_buildable === 1) {
                        reviewStatusHtml = '<span class="status-badge success">Success</span>';
                    } else if (item.review_buildable === false || item.review_buildable === 0 || item.review_buildable === -1) {
                        reviewStatusHtml = '<span class="status-badge error">Error</span>';
                    } else {
                        reviewStatusHtml = '<span class="status-badge pending">Pending</span>';
                    }
 
                    let reviewErrorHtml = '';
                    if (item.review_error_log) {
                        // strip ANSI escape sequences
                        let cleanError = item.review_error_log.replace(/\x1b\[[0-9;]*m/g, '');
                        // strip filename:line_number:
                        cleanError = cleanError.replace(/[^:\n\s]+?:\d+:\s*/g, '');
                        
                        reviewErrorHtml = `
                            <div class="error-log-container" style="margin-top: 0.5rem;">
                                <details class="error-details">
                                    <summary class="error-summary">⚠️ AI 교정 빌드 에러 원인 보기</summary>
                                    <pre class="error-pre">${this.escapeHtml(cleanError)}</pre>
                                </details>
                            </div>
                        `;
                    }
 
                    const reviewCopyBtnHtml = isAuth 
                        ? `<button class="review-copy-btn" onclick="window.editorial.copyReviewToEditor('${hash}', '${item.msgstr_hash}')">📋 이 리뷰 적용</button>`
                        : '';

                    reviewHtml = `
                        <div class="review-comment-container">
                            <div class="review-header">
                                <div class="review-title-group">
                                    <span class="review-label">✨ AI 교정 의견${scoreLabel}</span>
                                    ${reviewStatusHtml}
                                </div>
                                ${reviewCopyBtnHtml}
                            </div>
                            <div class="review-text"><pre class="code-block language-rest"><code class="language-rest">${safeReview}</code></pre></div>
                            ${reviewErrorHtml}
                        </div>
                    `;
                }
 
                const copyBtnHtml = isAuth 
                    ? `<button class="action-icon-btn" title="에디터로 복사" onclick="window.editorial.copyToEditorByHash('${hash}', '${item.msgstr_hash}')">📋 복사</button>`
                    : '';

                return `
                    <div class="item-entry suggestion ${item.is_machine ? 'is-ai' : ''} ${item.published ? 'is-published' : ''}">
                        <div class="item-header-compact">
                            <div class="item-meta">
                                ${avatarHtml}
                                <div class="meta-info">
                                    <div class="meta-top">
                                        <span class="author-name">${this.escapeHtml(item.author_name)} ${aiBadge}</span>
                                        ${statusHtml}${publishedHtml}
                                    </div>
                                    <span class="meta-details">${item.time.toLocaleString()}</span>
                                </div>
                            </div>
                            <div class="item-actions-compact">
                                <button class="vote-btn-compact ${voteBtnClass}" ${voteOnClick}>👍 ${item.votes}</button>
                                ${copyBtnHtml}
                                ${deleteMsgStrBtnHtml}
                            </div>
                        </div>
                        <div class="item-body-compact">
                            ${contentHtml}
                            ${noteHtml}
                            ${errorHtml}
                            ${reviewHtml}
                        </div>
                    </div>
                `;
            }).join('');
            this.applyHighlighting(container);
        }

        applyHighlighting(container) {
            if (window.Prism) {
                container.querySelectorAll('pre code').forEach(code => {
                    const pre = code.parentElement;
                    if (pre.className && !code.className) code.className = pre.className;
                });
                setTimeout(() => Prism.highlightAllUnder(container), 50);
            }
        }

        async submitSuggestion(hash) {
            if (!this.user) { alert('로그인이 필요합니다.'); return; }
            const msgstrEl = document.getElementById('input-msgstr-' + hash);
            const noteEl = document.getElementById('input-note-' + hash);
            const msgstr = msgstrEl.value.trim();
            const note = noteEl.value.trim();
            if (!msgstr) { alert('번역 내용을 입력해 주세요.'); return; }
            const existing = this.interactionData[hash]?.suggestions || [];
            if (existing.some(s => s.msgstr.trim() === msgstr)) { alert('이미 동일한 번역 제안이 존재합니다.'); return; }

            try {
                // NO user_id in body. Server reads cookie.
                const response = await fetch(`${this.apiUrl}/suggestions/${this.catalogId}/${hash}`, {
                    method: 'POST',
                    body: JSON.stringify({ msgstr, note: note }),
                    credentials: 'include'
                });
                if (!response.ok) { alert('등록 실패: 권한이 없습니다.'); return; }
                // Success: Clear inputs only now
                msgstrEl.value = ''; 
                noteEl.value = '';
                this.handleLiveInput(hash, '');
                
                // Show updating status
                const container = document.getElementById(`content-${hash}`);
                if (container) container.innerHTML = '<p class="loading">목록 업데이트 중...</p>';
                
                // Slight delay to ensure DB consistency before re-fetch
                setTimeout(() => this.loadInteractionData(hash), 300);
            } catch (err) { alert('네트워크 오류가 발생했습니다.'); }
        }

        async vote(msgid_hash, msgstr_hash) {
            if (!this.user) { alert('로그인이 필요합니다.'); return; }
            try {
                // NO user_id in body. Server reads cookie.
                const response = await fetch(`${this.apiUrl}/votes`, {
                    method: 'POST',
                    body: JSON.stringify({ catalog_id: this.catalogId, msgid_hash, msgstr_hash }),
                    credentials: 'include'
                });
                if (response.ok) this.loadInteractionData(msgid_hash);
            } catch (err) { console.error('Error voting:', err); }
        }

        editNote(msgid_hash, msgstr_hash) {
            if (!this.user) { alert('로그인이 필요합니다.'); return; }
            const container = document.getElementById(`note-container-${msgstr_hash}`);
            if (!container) return;

            // If already editing, don't duplicate
            if (container.querySelector('.inline-note-editor')) return;

            const textSpan = container.querySelector('.note-text-content');
            const currentNote = textSpan ? textSpan.textContent.trim() : '';
            const inlinePlaceholder = currentNote 
                ? "간단한 설명을 남기실 수 있습니다... (비우면 삭제)" 
                : "간단한 설명을 남기실 수 있습니다...";

            // Backup original HTML
            this.activeNoteEdits[msgstr_hash] = container.innerHTML;

            // Switch to inline editor HTML
            container.classList.add('editing');
            container.classList.remove('empty-note-author'); 
            
            container.innerHTML = `
                <div class="inline-note-editor">
                    <textarea id="inline-textarea-${msgstr_hash}" class="inline-note-textarea" placeholder="${inlinePlaceholder}">${currentNote}</textarea>
                    <div class="inline-note-buttons">
                        <button class="inline-btn inline-save-btn" onclick="window.editorial.saveInlineNote('${msgid_hash}', '${msgstr_hash}')">저장</button>
                        <button class="inline-btn inline-cancel-btn" onclick="window.editorial.cancelInlineNote('${msgstr_hash}')">취소</button>
                    </div>
                </div>
            `;
            
            // Focus the textarea and position cursor at the end
            const textarea = document.getElementById(`inline-textarea-${msgstr_hash}`);
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                this.autoResize(textarea);
                textarea.oninput = () => this.autoResize(textarea);
            }
        }

        async saveInlineNote(msgid_hash, msgstr_hash) {
            const textarea = document.getElementById(`inline-textarea-${msgstr_hash}`);
            if (!textarea) return;
            const newNote = textarea.value.trim();

            try {
                const response = await fetch(`${this.apiUrl}/suggestions/${this.catalogId}/${msgid_hash}/${msgstr_hash}/note`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note: newNote }),
                    credentials: 'include'
                });
                if (!response.ok) { alert('수정에 실패했습니다. 권한이 없거나 오류가 발생했습니다.'); return; }
                
                // Remove backup
                delete this.activeNoteEdits[msgstr_hash];
                
                // Re-load interaction data to update UI
                this.loadInteractionData(msgid_hash);
            } catch (err) {
                alert('네트워크 오류가 발생했습니다.');
            }
        }

        cancelInlineNote(msgstr_hash) {
            const container = document.getElementById(`note-container-${msgstr_hash}`);
            const originalHtml = this.activeNoteEdits[msgstr_hash];
            if (container && originalHtml !== undefined) {
                container.classList.remove('editing');
                if (originalHtml.includes('empty-note-author') || originalHtml.includes('노트 추가')) {
                    container.classList.add('empty-note-author');
                }
                container.innerHTML = originalHtml;
                delete this.activeNoteEdits[msgstr_hash];
            }
        }

        async deleteNote(msgid_hash, msgstr_hash) {
            if (!this.user) { alert('로그인이 필요합니다.'); return; }
            if (!confirm('정말로 이 노트를 삭제하시겠습니까?')) return;

            try {
                const response = await fetch(`${this.apiUrl}/suggestions/${this.catalogId}/${msgid_hash}/${msgstr_hash}/note`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (!response.ok) { alert('삭제에 실패했습니다. 권한이 없거나 오류가 발생했습니다.'); return; }
                
                // Success: re-load interaction data to update UI
                this.loadInteractionData(msgid_hash);
            } catch (err) {
                alert('네트워크 오류가 발생했습니다.');
            }
        }

        async deleteSuggestion(msgid_hash, msgstr_hash) {
            if (!this.user) { alert('로그인이 필요합니다.'); return; }
            if (!confirm('정말로 이 번역 제안을 삭제하시겠습니까?')) return;

            try {
                const response = await fetch(`${this.apiUrl}/suggestions/${this.catalogId}/${msgid_hash}/${msgstr_hash}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (response.ok) {
                    this.loadInteractionData(msgid_hash);
                } else {
                    const data = await response.json().catch(() => ({}));
                    alert(data.error || '삭제에 실패했습니다. 투표 수가 0이고 본인의 제안이어야 합니다.');
                }
            } catch (err) {
                alert('네트워크 오류가 발생했습니다.');
            }
        }

        setSortMode(hash, mode) {
            this.sortModes[hash] = mode;
            this.renderInteractionContent(hash);
        }



        copyToEditor(hash, text) {
            const textarea = document.getElementById(`input-msgstr-${hash}`);
            if (textarea && !textarea.disabled) {
                textarea.value = text;
                this.handleLiveInput(hash, text);
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
            }
        }

        copyOriginalToEditor(hash) {
            const data = this.interactionData[hash];
            if (data && data.msgid) {
                this.copyToEditor(hash, data.msgid);
            }
        }

        copyToEditorByHash(hash, msgstr_hash) {
            const data = this.interactionData[hash];
            if (!data) return;
            const suggestion = data.suggestions.find(s => s.msgstr_hash === msgstr_hash);
            if (suggestion) {
                this.copyToEditor(hash, suggestion.msgstr);
            }
        }

        copyReviewToEditor(hash, msgstr_hash) {
            const data = this.interactionData[hash];
            if (!data) return;
            const suggestion = data.suggestions.find(s => s.msgstr_hash === msgstr_hash);
            if (suggestion && suggestion.review) {
                this.copyToEditor(hash, suggestion.review);
            }
        }

        renderMarkdown(text) {
            if (!text) return '';
            const escape = (str) => { const p = document.createElement('p'); p.textContent = str; return p.innerHTML; };
            let html = escape(text);
            const placeholders = [];
            
            // 1. Triple backticks (Code Blocks) - Highest priority
            html = html.replace(/\x60\x60\x60(\w+)?\n([\s\S]*?)\n\x60\x60\x60/g, (match, lang, code) => {
                const id = `__PB_${placeholders.length}__`;
                let prismLang = (lang || 'none').toLowerCase();
                placeholders.push(`<pre class="code-block language-${prismLang}"><code class="language-${prismLang}">${code}</code></pre>`);
                return id;
            });
            
            // 2. Double backticks (Code Spans with backticks inside)
            html = html.replace(/\x60\x60\s*([\s\S]*?)\s*\x60\x60/g, (match, code) => {
                const id = `__PB_${placeholders.length}__`;
                placeholders.push(`<code>${code}</code>`);
                return id;
            });
            
            // 3. Single backticks
            html = html.replace(/\x60([^\x60]+)\x60/g, (match, code) => {
                const id = `__PB_${placeholders.length}__`;
                placeholders.push(`<code>${code}</code>`);
                return id;
            });

            // 4. Other Markdown rules
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            // 4. Lists (Support nested with 2 to 4 spaces of indentation)
            html = html.replace(/^( {2,4})\- (.*$)/gm, '<li class="sub-item">$2</li>');
            html = html.replace(/^\- (.*$)/gm, '<li class="top-item">$1</li>');
            
            // Wrap consecutive sub-items in a nested <ul>
            html = html.replace(/((?:<li class="sub-item">[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');
            
            // Wrap consecutive top-items and their children nested <ul> in a top-level <ul>
            // A top-level list block can contain top-items and nested uls
            html = html.replace(/((?:<li class="top-item">[\s\S]*?<\/li>\s*|<ul>[\s\S]*?<\/ul>\s*)+)/g, (match) => {
                return `<ul>${match.replace(/top-item/g, 'li')}</ul>`;
            });
            
            html = html.replace(/li class="sub-item"/g, 'li'); // clean up
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
            // 4.1. Double newlines -> paragraph break (simulate with vertical spacing)
            html = html.replace(/\n\n+/g, '<br/><br/>');
            // 4.2. Two or more spaces at end of line -> single line break (<br/>)
            html = html.replace(/ {2,}\n/g, '<br/>');
            // 4.3. Single newline -> space (standard Markdown inline wrap behavior)
            html = html.replace(/\n/g, ' ');
            
            // Clean up unwanted <br/> tags around block elements
            html = html.replace(/<br\/>\s*(<\/?[ul|li|h1|h2|h3|pre|code])/gi, '$1');
            html = html.replace(/(<\/?[ul|li|h1|h2|h3|pre|code])\s*<br\/>/gi, '$1');
            
            // 5. Restore placeholders in order
            placeholders.forEach((content, i) => {
                html = html.replace(`__PB_${i}__`, content);
            });
            
            return html;
        }

        autoResize(textarea) {
            textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px';
            const hLayer = textarea.parentElement.querySelector('.highlight-layer');
            if (hLayer) hLayer.style.height = textarea.style.height;
        }


        scrollToElement(hash) {
            const el = document.querySelector(`[data-hash="${hash}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('editorial-highlight');
                setTimeout(() => el.classList.remove('editorial-highlight'), 2000);
            }
        }

        applyHighlighter() {
            // Remove previous highlighting from all elements first
            document.querySelectorAll('[data-msgid]').forEach(el => {
                el.classList.remove('editorial-highlighted');
            });

            if (!this.highlighterEnabled) {
                return;
            }

            // Find elements with data-score and highlight them if they meet the condition
            document.querySelectorAll('[data-msgid]').forEach(el => {
                const scoreAttr = el.getAttribute('data-score');
                if (scoreAttr === null || scoreAttr === undefined) {
                    return; // No score available, don't highlight
                }
                const score = parseInt(scoreAttr, 10);
                if (isNaN(score)) {
                    return;
                }

                const T = this.highlighterThreshold;
                let shouldHighlight = false;

                if (T === 100) {
                    // "100 으로 설정할 때만틈은 100 보다 작을 때만 하일라이팅해"
                    shouldHighlight = score < 100;
                } else {
                    // "data-score 가 threshold 와 같거나 작은 메시지들을 눈에 띄게 표시해주는 기능이야"
                    shouldHighlight = score <= T;
                }

                if (shouldHighlight) {
                    el.classList.add('editorial-highlighted');
                }
            });
        }

        applySinceHighlighter() {
            document.querySelectorAll('[data-msgid]').forEach(el => {
                const sinceStr = el.getAttribute('data-since');
                if (!sinceStr) return;

                // Parse YYMMDD format
                if (sinceStr.length !== 6) return;
                const yy = parseInt(sinceStr.substring(0, 2), 10) + 2000;
                const mm = parseInt(sinceStr.substring(2, 4), 10) - 1;
                const dd = parseInt(sinceStr.substring(4, 6), 10);
                const sinceDate = new Date(yy, mm, dd);
                const now = new Date();
                
                // Ensure timezone-naive comparison is accurate
                sinceDate.setHours(0, 0, 0, 0);
                
                const diffTime = now - sinceDate;
                if (diffTime < 0) return; // Future date
                
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 28) {
                    let opacity = 0.85;
                    if (diffDays <= 7) {
                        opacity = 0.85;
                    } else if (diffDays <= 14) {
                        opacity = 0.60;
                    } else if (diffDays <= 21) {
                        opacity = 0.35;
                    } else {
                        opacity = 0.15;
                    }
                    el.classList.add('editorial-since-highlight');
                    el.style.setProperty('--since-opacity', opacity);
                    
                    // User friendly relative time string
                    let timeAgoText = '';
                    if (diffDays === 0) {
                        timeAgoText = '오늘 번역됨';
                    } else if (diffDays === 1) {
                        timeAgoText = '어제 번역됨';
                    } else if (diffDays <= 7) {
                        timeAgoText = `${diffDays}일 전 번역됨`;
                    } else {
                        const weeksAgo = Math.floor(diffDays / 7);
                        timeAgoText = `${weeksAgo}주 전 번역됨`;
                    }
                    el.setAttribute('title', `✨ 최근 번역 업데이트 (${timeAgoText})`);
                }
            });
            this.alignSinceHighlighters();
        }

        alignSinceHighlighters() {
            const docEl = document.querySelector('article.document');
            if (!docEl) return;
            const docLeft = docEl.getBoundingClientRect().left;
            
            document.querySelectorAll('[data-msgid].editorial-since-highlight').forEach(el => {
                const elLeft = el.getBoundingClientRect().left;
                const relativeLeft = elLeft - docLeft;
                // Place the bar exactly 30px to the left of article.document's left boundary
                const barLeft = -relativeLeft - 30;
                el.style.setProperty('--since-left', `${barLeft}px`);
            });
        }

        renderDashboard(container) {
            container.innerHTML = `
                <div class="dashboard-wrapper">
                    <!-- Burn-up Chart Card -->
                    <div class="dashboard-card">
                        <div class="card-header">
                            <span class="card-title">📈 번역 진척도 추이 (Burn-up)</span>
                        </div>
                        <p class="card-description">전체 텍스트 대비 품질 지수로 보정된 번역 진척도를 보여줍니다.</p>
                        <div class="chart-container" style="padding: 1rem 0; height: 220px; position: relative;">
                            <canvas id="editorial-burnup-chart" style="width: 100%; height: 100%;"></canvas>
                        </div>
                    </div>

                    <!-- Highlighter Control Card -->
                    <div class="dashboard-card">
                        <div class="card-header">
                            <span class="card-title">🔍 번역 품질 하이라이터</span>
                            <label class="switch">
                                <input type="checkbox" id="highlighter-toggle" ${this.highlighterEnabled ? 'checked' : ''} onchange="window.editorial.toggleHighlighter(this.checked)">
                                <span class="switch-slider round"></span>
                            </label>
                        </div>
                        <p class="card-description">AI 품질 평가 점수가 임계값 이하인 번역문들을 문서 내에서 빨갛게 강조하여 시각적으로 검토할 수 있습니다.</p>
                        
                        <div class="slider-control-group" id="highlighter-slider-group">
                            <div class="slider-container-relative">
                                <span id="slider-value-bubble" class="slider-bubble" style="left: calc(${this.highlighterThreshold}% + (${8 - this.highlighterThreshold * 0.16}px));">${this.highlighterThreshold}</span>
                                <input type="range" id="highlighter-threshold" min="0" max="100" step="10" value="${this.highlighterThreshold}" oninput="window.editorial.updateThreshold(this.value)">
                                <div class="slider-ticks">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quality Report Chart Card -->
                    <div class="dashboard-card quality-report-card">
                        <div class="card-header">
                            <span class="card-title">📊 번역 품질 보고서</span>
                        </div>
                        <p class="card-description">AI 품질 평가가 낮은 메시지들이 많은 페이지를 보여줍니다. 하이라이터 임계값에 따라 바뀝니다. 막대나 라벨을 클릭하면 해당 문서 페이지로 이동합니다.</p>
                        
                        <div class="chart-container" id="quality-report-chart">
                            <div style="text-align: center; padding: 2rem; color: #666;">데이터를 불러오는 중...</div>
                        </div>
                    </div>

                    <!-- Translation Activity Report Chart Card -->
                    <div class="dashboard-card activity-report-card">
                        <div class="card-header">
                            <span class="card-title">📈 번역 활동 보고서</span>
                        </div>
                        <p class="card-description">최근 4주 동안 많이 바뀐 페이지를 보여줍니다. 막대나 라벨을 클릭하면 해당 문서 페이지로 이동합니다.</p>
                        
                        <div class="chart-container" id="activity-report-chart">
                            <div style="text-align: center; padding: 2rem; color: #666;">데이터를 불러오는 중...</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Fetch and render the chart data
            this.fetchAndRenderChart();
        }

        fetchAndRenderChart() {
            const qualityContainer = document.getElementById('quality-report-chart');
            const activityContainer = document.getElementById('activity-report-chart');
            if (!qualityContainer && !activityContainer) return;

            const staticUrl = document.querySelector('link[rel="stylesheet"][href*="_static/"]').href.split('_static/')[0] + '_static/';
            const baseUrl = document.querySelector('link[rel="stylesheet"][href*="_static/"]').href.split('_static/')[0];

            // Fetch static quality_report.json generated during build
            fetch(`${staticUrl}quality_report.json`)
                .then(res => {
                    if (!res.ok) throw new Error("보고서 데이터 파일(quality_report.json)이 존재하지 않습니다. 빌드를 수행해 주세요.");
                    return res.json();
                })
                .then(data => {
                    this.qualityReportData = data.report;
                    if (qualityContainer) {
                        this.renderChartData(qualityContainer, data.report, baseUrl);
                    }
                    if (activityContainer) {
                        this.renderActivityChartData(activityContainer, data.report, baseUrl);
                    }
                })
                .catch(err => {
                    if (qualityContainer) {
                        qualityContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: #d93025; font-weight: 600;">데이터 로드 실패: ${err.message}</div>`;
                    }
                    if (activityContainer) {
                        activityContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: #d93025; font-weight: 600;">데이터 로드 실패: ${err.message}</div>`;
                    }
                });

            const burnupCanvas = document.getElementById('editorial-burnup-chart');
            if (burnupCanvas) {
                this.renderBurnUpChart(burnupCanvas);
            }
        }

        renderBurnUpChart(canvas) {
            if (!this.progressHistory || this.progressHistory.length === 0) {
                canvas.parentElement.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">진척도 이력 데이터가 없습니다. 정기 빌드가 수행되어야 기록이 쌓입니다.</div>`;
                return;
            }

            const firstTime = this.progressHistory[0][0] * 1000;
            const lastTime = this.progressHistory[this.progressHistory.length - 1][0] * 1000;

            const progressData = this.progressHistory.map(item => ({
                x: item[0] * 1000,
                y: item[2]
            }));
            const remainingData = this.progressHistory.map(item => ({
                x: item[0] * 1000,
                y: Math.max(0, item[1] - item[2])
            }));

            const ctx = canvas.getContext('2d');
            if (typeof Chart === 'undefined') {
                canvas.parentElement.innerHTML = `<div style="text-align: center; padding: 2rem; color: #d93025;">Chart.js 라이브러리를 로드할 수 없습니다.</div>`;
                return;
            }

            const history = this.progressHistory;
            const lastItem = history[history.length - 1];

            new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'Progress (번역 완료)',
                            data: progressData,
                            backgroundColor: 'rgba(0, 74, 198, 0.65)',
                            borderColor: 'rgba(0, 74, 198, 1)',
                            borderWidth: 1.5,
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        },
                        {
                            label: 'Remaining (미완료)',
                            data: remainingData,
                            backgroundColor: 'rgba(200, 220, 255, 0.35)',
                            borderColor: 'rgba(200, 220, 255, 0.8)',
                            borderWidth: 1.5,
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        }
                    ]
                },
                plugins: [{
                    id: 'percentagePlugin',
                    afterDraw: (chart) => {
                        const meta = chart.getDatasetMeta(0);
                        if (meta && meta.data && meta.data.length > 0) {
                            const lastPoint = meta.data[meta.data.length - 1];
                            if (lastPoint && lastItem) {
                                const percentage = lastItem[1] > 0 
                                    ? ((lastItem[2] / lastItem[1]) * 100).toFixed(1) + '%' 
                                    : '0.0%';
                                const ctx = chart.ctx;
                                ctx.save();
                                ctx.font = 'bold 14px monospace';
                                ctx.fillStyle = 'rgba(0, 74, 198, 1)';
                                ctx.textAlign = 'right';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(percentage, lastPoint.x, lastPoint.y - 6);
                                ctx.restore();
                            }
                        }
                    }
                }],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    if (context[0] && context[0].raw && context[0].raw.x) {
                                        const date = new Date(context[0].raw.x);
                                        return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                                    }
                                    return '';
                                },
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed.y !== null) {
                                        label += Math.round(context.parsed.y).toLocaleString() + ' bytes';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            stacked: true,
                            grid: { display: false },
                            border: { display: false },
                            ticks: {
                                display: true,
                                align: 'inner',
                                tickLength: 0,
                                font: {
                                    size: 10
                                },
                                color: '#666',
                                callback: function(value) {
                                    const kstDate = new Date(value + 9 * 60 * 60 * 1000);
                                    const yyyy = kstDate.getUTCFullYear();
                                    const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
                                    const dd = String(kstDate.getUTCDate()).padStart(2, '0');
                                    return `${yyyy}-${mm}-${dd}`;
                                }
                            },
                            afterBuildTicks: function(axis) {
                                axis.ticks = [
                                    { value: firstTime },
                                    { value: lastTime }
                                ];
                            },
                            min: firstTime,
                            max: lastTime
                        },
                        y: {
                            stacked: true,
                            grid: { display: false },
                            border: { display: false },
                            ticks: { display: false }
                        }
                    }
                }
            });
        }

        renderChartData(container, report, baseUrl) {
            if (!report || report.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #666;">표시할 품질 데이터가 없습니다.</div>`;
                return;
            }

            // No legend container update needed

            const T = this.highlighterThreshold;
            const k = Math.floor(T / 10); // 0 to 10

            // Process data based on threshold T (exclude gray/values[0])
            let processed = report.map(item => {
                const values = item.values; // Array of length 12
                
                let red = 0;
                for (let i = 1; i <= k + 1; i++) {
                    red += (values[i] || 0);
                }
                
                const catalogTotalBytes = values.reduce((sum, v) => sum + v, 0);
                
                return {
                    path: item.path,
                    red: red,
                    total: red, // total represents only reviewed warning bytes
                    catalogTotalBytes: catalogTotalBytes,
                    rawValues: values
                };
            });

            // Filter out catalogs that are empty or have red === 0
            processed = processed.filter(item => item.catalogTotalBytes > 0 && item.red > 0);

            if (processed.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: #2e7d32; font-weight: 600; background: rgba(46, 125, 50, 0.05); border-radius: 8px; border: 1px dashed rgba(46, 125, 50, 0.2);">✨ 현재 임계값 이하의 품질 경고 대상 카탈로그가 존재하지 않습니다. 모든 문서의 품질이 매우 우수합니다!</div>`;
                return;
            }

            // Sort descending primarily by red (total), then alphabetically by path ascending
            processed.sort((a, b) => {
                if (b.total !== a.total) {
                    return b.total - a.total;
                }
                return a.path.localeCompare(b.path);
            });

            // Find the maximum total among all catalogs to establish a uniform horizontal scale
            let maxTotal = 0;
            processed.forEach(item => {
                if (item.total > maxTotal) maxTotal = item.total;
            });

            container.innerHTML = processed.map(item => {
                if (item.catalogTotalBytes === 0) return ''; // Skip empty catalogs

                const barWidthPct = maxTotal > 0 ? ((item.total / maxTotal) * 70).toFixed(1) : 0;

                const segments = [];
                if (item.red > 0) {
                    // Takes up 100% of the bar width
                    segments.push({ key: 'red', val: item.red, pct: 100, title: `${item.red.toLocaleString()}` });
                }

                const barHtml = segments
                    .map(s => `<div class="bar-segment ${s.key}" style="width: ${s.pct}%;" title="${s.title}"></div>`)
                    .join('');

                // Convert PO path to HTML path (e.g. library/functions -> library/functions.html)
                let htmlPath = item.path;
                let displayPath = item.path;
                if (htmlPath.endsWith('.po')) {
                    htmlPath = htmlPath.slice(0, -3) + '.html';
                    displayPath = displayPath.slice(0, -3);
                } else {
                    htmlPath = htmlPath + '.html';
                }
                const targetUrl = baseUrl + htmlPath;

                return `
                    <div class="chart-row" onclick="window.location.href='${targetUrl}'" title="클릭 시 이 문서 페이지로 이동">
                        <div class="chart-stacked-bar" style="width: ${barWidthPct}%; min-width: 4px;">
                            ${barHtml}
                        </div>
                        <span class="chart-row-label">${this.escapeHtml(displayPath)}</span>
                    </div>
                `;
            }).join('');
        }

        renderActivityChartData(container, report, baseUrl) {
            if (!report || report.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #666;">표시할 활동 데이터가 없습니다.</div>`;
                return;
            }

            // Process and sum activity metrics for each catalog
            let processed = report.map(item => {
                const activity = item.activity || [0, 0, 0, 0];
                const total = activity.reduce((sum, v) => sum + v, 0);
                
                return {
                    path: item.path,
                    activity: activity,
                    total: total
                };
            });

            // Filter out catalogs that have zero total activity
            processed = processed.filter(item => item.total > 0);

            if (processed.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: #666; font-weight: 600; background: rgba(0, 0, 0, 0.02); border-radius: 8px; border: 1px dashed rgba(0, 0, 0, 0.1);">✨ 최근 4주 동안 번역 활동(수정/추가) 내역이 존재하지 않습니다.</div>`;
                return;
            }

            // Sort descending by total activity, then alphabetically by path ascending
            processed.sort((a, b) => {
                if (b.total !== a.total) {
                    return b.total - a.total;
                }
                return a.path.localeCompare(b.path);
            });

            // Find the maximum total to establish uniform horizontal scale
            let maxTotal = 0;
            processed.forEach(item => {
                if (item.total > maxTotal) maxTotal = item.total;
            });

            container.innerHTML = processed.map(item => {
                const barWidthPct = maxTotal > 0 ? ((item.total / maxTotal) * 70).toFixed(1) : 0;

                const activity = item.activity;
                const segments = [];
                const labels = ["1주", "2주", "3주", "4주"];
                const classes = ["fresh-1", "fresh-2", "fresh-3", "fresh-4"];
                
                activity.forEach((val, idx) => {
                    if (val > 0) {
                        const pct = (val / item.total) * 100;
                        segments.push({
                            key: classes[idx],
                            pct: pct,
                            title: `${labels[idx]}: ${val.toLocaleString()}`
                        });
                    }
                });

                const barHtml = segments
                    .map(s => `<div class="bar-segment ${s.key}" style="width: ${s.pct}%;" title="${s.title}"></div>`)
                    .join('');

                let htmlPath = item.path;
                let displayPath = item.path;
                if (htmlPath.endsWith('.po')) {
                    htmlPath = htmlPath.slice(0, -3) + '.html';
                    displayPath = displayPath.slice(0, -3);
                } else {
                    htmlPath = htmlPath + '.html';
                }
                const targetUrl = baseUrl + htmlPath;

                return `
                    <div class="chart-row" onclick="window.location.href='${targetUrl}'" title="클릭 시 이 문서 페이지로 이동">
                        <div class="chart-stacked-bar" style="width: ${barWidthPct}%; min-width: 4px;">
                            ${barHtml}
                        </div>
                        <span class="chart-row-label">${this.escapeHtml(displayPath)}</span>
                    </div>
                `;
            }).join('');
        }

        refreshQualityChart() {
            const chartContainer = document.getElementById('quality-report-chart');
            if (chartContainer && this.qualityReportData) {
                const baseUrl = document.querySelector('link[rel="stylesheet"][href*="_static/"]').href.split('_static/')[0];
                this.renderChartData(chartContainer, this.qualityReportData, baseUrl);
            }
        }

        toggleHighlighter(enabled) {
            this.highlighterEnabled = enabled;
            localStorage.setItem('editorial-highlighter-enabled', enabled ? 'true' : 'false');
            
            this.applyHighlighter();
        }

        updateThreshold(val) {
            const threshold = parseInt(val, 10);
            this.highlighterThreshold = threshold;
            localStorage.setItem('editorial-highlighter-threshold', threshold.toString());
            
            const bubble = document.getElementById('slider-value-bubble');
            if (bubble) {
                bubble.textContent = threshold.toString();
                bubble.style.left = `calc(${threshold}% + (${8 - threshold * 0.16}px))`;
            }
            
            this.applyHighlighter();
            this.refreshQualityChart();
        }

        escapeHtml(str) {
            const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
        }
    }

    window.editorial = new EditorialUI();
})();
