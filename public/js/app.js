document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        currentDrama: null,
        episodesList: [],
        activeSection: 'home',
        caches: {
            home: null,
            vip: null,
            dub: null
        }
    };

    // --- Elements ---
    const elements = {
        loader: document.getElementById('loader'),
        header: document.getElementById('main-header'),
        hero: {
            bg: document.getElementById('hero-bg'),
            title: document.getElementById('hero-title'),
            desc: document.getElementById('hero-desc'),
            playBtn: document.getElementById('hero-play-btn')
        },
        grids: {
            trending: document.getElementById('trending-grid'),
            latest: document.getElementById('latest-grid'),
            recommended: document.getElementById('recommended-grid'),
            vip: document.getElementById('vip-grid'),
            dub: document.getElementById('dub-grid')
        },
        views: {
            home: document.getElementById('home-view'),
            vip: document.getElementById('vip-view'),
            dub: document.getElementById('dub-view')
        },
        searchInput: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        modals: {
            detail: document.getElementById('detail-modal'),
            player: document.getElementById('player-modal')
        }
    };

    // --- API Calls (Using Local Backend) ---
    const API = {
        async request(endpoint, params = {}) {
            try {
                const url = new URL(`${window.location.origin}${endpoint}`);
                Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return await res.json();
            } catch (err) {
                console.error(`API Error (${endpoint}):`, err);
                return null;
            }
        },
        getTrending: () => API.request('/api/trending'),
        getLatest: () => API.request('/api/latest'),
        getRecommended: () => API.request('/api/for-you'),
        getVIP: () => API.request('/api/vip'),
        getDub: () => API.request('/api/dubbed', { classify: 'terpopuler', page: 1 }),
        getSearch: (query) => API.request('/api/search', { query }),
        getDetail: (bookId) => API.request('/api/detail', { bookId }).then(d => d?.data),
        getEpisodes: (bookId) => API.request('/api/episodes', { bookId })
    };

    // --- UI Utils ---
    const showLoader = () => {
        if (!elements.loader) return;
        elements.loader.style.display = 'flex';
        // Force reflow for transition
        void elements.loader.offsetWidth;
        elements.loader.style.opacity = '1';
    };

    const hideLoader = () => {
        if (!elements.loader) return;
        elements.loader.style.opacity = '0';

        const cleanup = () => {
            elements.loader.style.display = 'none';
            elements.loader.removeEventListener('transitionend', cleanup);
            elements.loader.removeEventListener('webkitTransitionEnd', cleanup);
        };

        elements.loader.addEventListener('transitionend', cleanup);
        elements.loader.addEventListener('webkitTransitionEnd', cleanup);

        // Safety fallback if transition fails or is too slow
        setTimeout(cleanup, 500);
    };

    const renderDramaCard = (drama) => {
        const div = document.createElement('div');
        div.className = 'drama-card';
        // Handle different property names from different endpoints
        const cover = drama.cover || drama.coverWap || drama.bookCover || 'https://via.placeholder.com/200x300';
        const title = drama.bookName || 'Unknown';
        const eps = drama.chapterCount || drama.totalChapter || '?';
        const tag = drama.score || drama.hotCode || 'HD';

        div.innerHTML = `
            <div class="card-tag">${tag}</div>
            <img src="${cover}" class="card-img" alt="${title}" loading="lazy">
            <div class="card-content">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${eps} Episod</span>
                    <span>${drama.protagonist || ''}</span>
                </div>
            </div>
        `;
        div.addEventListener('click', () => {
            const id = drama.bookId || drama.id;
            console.log('Drama card clicked:', drama.bookName, 'ID:', id);
            if (!id) console.error('Error: No ID found for drama:', drama);
            openDetail(id);
        });
        return div;
    };

    // --- Core Logic ---
    const updateHero = (drama) => {
        if (!drama) return;
        elements.hero.bg.style.opacity = '0';
        setTimeout(() => {
            elements.hero.bg.src = drama.cover || drama.coverWap || drama.bookCover;
            elements.hero.bg.style.opacity = '1';
        }, 300);

        elements.hero.title.textContent = drama.bookName;
        elements.hero.desc.textContent = drama.introduction || drama.bookIntroduction || "Tonton drama terbaik secara percuma di DramaBox.";
        elements.hero.playBtn.onclick = () => openDetail(drama.bookId || drama.id);
    };

    const switchView = async (section) => {
        state.activeSection = section;

        // Update Nav UI
        document.querySelectorAll('nav li').forEach(li => {
            li.classList.toggle('active', li.dataset.section === section);
        });

        // Toggle visibility
        Object.keys(elements.views).forEach(key => {
            elements.views[key].style.display = key === section.replace('-indo', '') ? 'block' : 'none';
        });

        // Load data if needed
        if (section === 'home') {
            if (!state.caches.home) await loadHomeData();
        } else if (section === 'vip') {
            if (!state.caches.vip) await loadVIPData();
        } else if (section === 'dub-indo') {
            if (!state.caches.dub) await loadDubData();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const loadHomeData = async () => {
        showLoader();
        const [trending, latest, recommended] = await Promise.all([
            API.getTrending(),
            API.getLatest(),
            API.getRecommended()
        ]);

        if (trending && trending.length > 0) updateHero(trending[0]);

        elements.grids.trending.innerHTML = '';
        trending?.slice(0, 10).forEach(d => elements.grids.trending.appendChild(renderDramaCard(d)));

        elements.grids.latest.innerHTML = '';
        latest?.slice(0, 10).forEach(d => elements.grids.latest.appendChild(renderDramaCard(d)));

        elements.grids.recommended.innerHTML = '';
        recommended?.slice(0, 15).forEach(d => elements.grids.recommended.appendChild(renderDramaCard(d)));

        state.caches.home = true;
        hideLoader();
    };

    const loadVIPData = async () => {
        showLoader();
        const data = await API.getVIP();
        elements.grids.vip.innerHTML = '';

        // VIP API might return theater records or direct list
        const list = data?.records || data?.theaterList || data || [];
        list.slice(0, 20).forEach(d => elements.grids.vip.appendChild(renderDramaCard(d)));

        state.caches.vip = true;
        hideLoader();
    };

    const loadDubData = async () => {
        showLoader();
        const data = await API.getDub();
        elements.grids.dub.innerHTML = '';

        const list = data || [];
        list.slice(0, 20).forEach(d => elements.grids.dub.appendChild(renderDramaCard(d)));

        state.caches.dub = true;
        hideLoader();
    };

    const openDetail = async (bookId) => {
        if (!bookId) return;
        showLoader();
        try {
            const [detailRes, episodes] = await Promise.all([
                API.getDetail(bookId),
                API.getEpisodes(bookId)
            ]);

            const drama = detailRes;
            if (!drama) {
                console.error("Detail Data Received:", detailRes);
                throw new Error("Drama detail not found");
            }

            state.currentDrama = drama;
            state.episodesList = episodes || [];

            const modal = elements.modals.detail;
            const content = modal.querySelector('.modal-content');

            const cover = drama.cover || drama.bookCover || drama.coverWap || 'https://via.placeholder.com/200x300';
            const title = drama.bookName || 'Unknown Drama';
            const intro = drama.introduction || 'Tiada huraian tersedia.';
            const chapters = drama.chapterCount || state.episodesList.length || '?';

            content.innerHTML = `
                <span class="close-modal">&times;</span>
                <div class="detail-hero">
                    <img src="${cover}" alt="${title}" class="detail-img">
                    <div class="detail-info">
                        <h2>${title}</h2>
                        <div class="tags">
                            ${drama.tags ? drama.tags.map(t => `<span class="tag">${t.tagName || t}</span>`).join('') : ''}
                            <span class="tag">${chapters} Episod</span>
                            <span class="tag">${drama.score || '9.5'} ⭐</span>
                        </div>
                        <p>${intro}</p>
                        <div class="hero-btns">
                            <button class="btn btn-primary" id="modal-watch-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                Nonton Sekarang
                            </button>
                        </div>
                    </div>
                </div>
                <div class="ep-list">
                    <h3>Senarai Episod</h3>
                    <div class="ep-grid">
                        ${state.episodesList.map(ep => `
                            <button class="ep-btn" data-url="${ep.playUrl || ep.playUrlV3 || ''}" data-index="${ep.chapterIndex}">
                                ${ep.chapterIndex}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Events
            content.querySelector('.close-modal').onclick = () => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            };

            content.querySelector('#modal-watch-btn').onclick = () => {
                if (state.episodesList.length > 0) {
                    const first = state.episodesList[0];
                    playVideo(first.playUrl || first.playUrlV3, first.chapterIndex);
                }
            };

            content.querySelectorAll('.ep-btn').forEach(btn => {
                btn.onclick = () => playVideo(btn.dataset.url, btn.dataset.index);
            });

        } catch (err) {
            console.error("Detail Load Error:", err);
            alert("Maaf, gagal memuatkan butiran drama.");
        } finally {
            hideLoader();
        }
    };

    const playVideo = (url, index) => {
        if (!url || url === 'undefined') {
            alert("Maaf, video untuk episod ini tidak tersedia.");
            return;
        }

        const modal = elements.modals.player;
        const content = modal.querySelector('.modal-content');

        content.innerHTML = `
            <span class="close-modal">&times;</span>
            <div class="video-container">
                <iframe src="${url}" allowfullscreen allow="autoplay; encrypted-media"></iframe>
            </div>
            <div class="player-info">
                <h3>${state.currentDrama.bookName} - Episod ${index}</h3>
            </div>
        `;

        modal.style.display = 'flex';
        content.querySelector('.close-modal').onclick = () => {
            modal.style.display = 'none';
            content.innerHTML = '';
        };
    };

    // --- Search Handler ---
    const handleSearch = async () => {
        const query = elements.searchInput.value.trim();
        if (!query) return;

        showLoader();
        const results = await API.getSearch(query);

        // Reuse Recommended grid for results in home view
        switchView('home');
        const sectionTitle = document.querySelector('#recommended-section h2');
        sectionTitle.textContent = `Hasil Carian: "${query}"`;

        elements.grids.recommended.innerHTML = '';
        if (results?.length > 0) {
            results.forEach(d => elements.grids.recommended.appendChild(renderDramaCard(d)));
            window.scrollTo({ top: elements.grids.recommended.offsetTop - 150, behavior: 'smooth' });
        } else {
            elements.grids.recommended.innerHTML = '<p style="padding: 20px; color: var(--text-dim);">Drama tidak ditemui.</p>';
        }
        hideLoader();
    };

    // --- Interaction Listeners ---
    elements.searchBtn.onclick = handleSearch;
    elements.searchInput.onkeypress = (e) => e.key === 'Enter' && handleSearch();

    document.querySelectorAll('nav li').forEach(li => {
        li.onclick = () => switchView(li.dataset.section);
    });

    window.onscroll = () => {
        elements.header.classList.toggle('scrolled', window.scrollY > 50);
    };

    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
            if (e.target.id === 'player-modal') e.target.querySelector('.modal-content').innerHTML = '';
        }
    };

    // --- Launch ---
    loadHomeData();
});
