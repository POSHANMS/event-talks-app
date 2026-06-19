/**
 * BigQuery Release Pulse - Client-side Application
 * Handles API calls, dynamic rendering, live search/filtering, and the Tweet composer.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let state = {
        releases: [],
        activeCategory: 'all',
        searchQuery: '',
        lastUpdated: null,
        selectedUpdate: null
    };

    // DOM Elements
    const feedContainer = document.getElementById('releases-feed');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const charProgressRing = document.getElementById('char-progress-ring');

    // Progress Ring configurations
    const RING_RADIUS = 10;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    charProgressRing.style.strokeDasharray = RING_CIRCUMFERENCE;

    // Category style mapping matching CSS variables
    const CATEGORY_STYLES = {
        feature: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Feature' },
        changed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'Changed' },
        deprecated: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Deprecated' },
        issue: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', label: 'Known Issue' },
        announcement: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', label: 'Announcement' },
        default: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)', label: 'Update' }
    };

    function getCategoryStyle(type) {
        const lower = type.toLowerCase();
        if (lower.includes('feature')) return CATEGORY_STYLES.feature;
        if (lower.includes('change')) return CATEGORY_STYLES.changed;
        if (lower.includes('deprecat')) return CATEGORY_STYLES.deprecated;
        if (lower.includes('issue')) return CATEGORY_STYLES.issue;
        if (lower.includes('announc')) return CATEGORY_STYLES.announcement;
        return CATEGORY_STYLES.default;
    }

    // Initialize application
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.activeCategory = chip.dataset.category;
            renderFeed();
        });
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });

    // Textarea character count tracker
    tweetTextarea.addEventListener('input', updateCharCount);

    // Open X / Twitter share intent
    submitTweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        hideTweetModal();
    });

    // Fetch Release Notes from API
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                state.releases = data.releases;
                state.lastUpdated = new Date(data.last_updated * 1000);
                updateTimestampDisplay(state.lastUpdated, data.is_cached);
                renderFeed();
            } else {
                showErrorState(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState('Network error occurred while fetching updates.');
        } finally {
            setLoadingState(false);
        }
    }

    // Loading indicator toggling
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('icon-spin');
            refreshBtn.disabled = true;
            if (state.releases.length === 0) {
                feedContainer.innerHTML = `
                    <div class="skeleton-loader">
                        <div class="skeleton-card"><div class="skeleton-line title"></div><div class="skeleton-line text"></div><div class="skeleton-line text short"></div></div>
                        <div class="skeleton-card"><div class="skeleton-line title"></div><div class="skeleton-line text"></div><div class="skeleton-line text"></div><div class="skeleton-line text short"></div></div>
                        <div class="skeleton-card"><div class="skeleton-line title"></div><div class="skeleton-line text"></div><div class="skeleton-line text short"></div></div>
                    </div>
                `;
            }
        } else {
            refreshIcon.classList.remove('icon-spin');
            refreshBtn.disabled = false;
        }
    }

    // Update the timestamp badge
    function updateTimestampDisplay(date, isCached) {
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const cacheLabel = isCached ? '(Cached)' : '(Live)';
        lastUpdatedText.textContent = `Updated: ${timeStr} ${cacheLabel}`;
    }

    // Error rendering
    function showErrorState(message) {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-circle" class="empty-icon" style="color: var(--cat-deprecated)"></i>
                <h3>Failed to Load Feed</h3>
                <p>${message}</p>
                <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 1rem;">
                    <i data-lucide="refresh-cw"></i> Retry
                </button>
            </div>
        `;
        lucide.createIcons();
    }

    // Render the chronological feed
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        let hasVisibleUpdates = false;

        state.releases.forEach(day => {
            const visibleSections = day.sections.filter(sec => {
                const categoryStyle = getCategoryStyle(sec.type);
                const categoryLabel = categoryStyle.label.toLowerCase();
                
                // 1. Filter by category
                const matchesCategory = state.activeCategory === 'all' || categoryLabel.includes(state.activeCategory);
                
                // 2. Filter by search query
                const matchesSearch = !state.searchQuery || 
                    sec.text.toLowerCase().includes(state.searchQuery) ||
                    sec.type.toLowerCase().includes(state.searchQuery) ||
                    day.date.toLowerCase().includes(state.searchQuery);
                    
                return matchesCategory && matchesSearch;
            });

            if (visibleSections.length > 0) {
                hasVisibleUpdates = true;
                
                // Create Day Group
                const dayGroup = document.createElement('div');
                dayGroup.className = 'day-group';
                
                // Day Header
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                
                const dot = document.createElement('div');
                dot.className = 'day-dot';
                
                const title = document.createElement('h2');
                title.className = 'day-title';
                title.textContent = day.date;
                
                dayHeader.appendChild(dot);
                dayHeader.appendChild(title);
                dayGroup.appendChild(dayHeader);
                
                // Day Updates list
                const updatesContainer = document.createElement('div');
                updatesContainer.className = 'day-updates';
                
                visibleSections.forEach(sec => {
                    const card = createUpdateCard(sec, day.date);
                    updatesContainer.appendChild(card);
                });
                
                dayGroup.appendChild(updatesContainer);
                feedContainer.appendChild(dayGroup);
            }
        });

        // Re-initialize dynamic Lucide icons
        lucide.createIcons();

        if (!hasVisibleUpdates) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox" class="empty-icon"></i>
                    <h3>No Matching Release Notes</h3>
                    <p>Try adjusting your filters or search keywords.</p>
                </div>
            `;
            lucide.createIcons();
        }
    }

    // Card Builder
    function createUpdateCard(section, dateStr) {
        const style = getCategoryStyle(section.type);
        
        const card = document.createElement('article');
        card.className = 'update-card';
        card.style.setProperty('--cat-color', style.color);
        card.style.setProperty('--cat-bg', style.bg);
        card.id = `card-${section.id}`;
        
        card.innerHTML = `
            <div class="update-card-header">
                <div class="badge-group">
                    <span class="category-badge">${style.label}</span>
                    <span class="update-date-label">${dateStr}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-card-action tweet-btn-hover" title="Draft Tweet" data-id="${section.id}">
                        <i data-lucide="twitter"></i>
                    </button>
                </div>
            </div>
            <div class="update-card-body">
                ${section.html}
            </div>
            <div class="update-card-footer">
                <a href="${section.link}" target="_blank" rel="noopener" class="source-link">
                    <i data-lucide="external-link"></i>
                    <span>Official Release Notes</span>
                </a>
                <button class="btn-tweet-action" data-id="${section.id}">
                    <i data-lucide="twitter"></i>
                    <span>Tweet This</span>
                </button>
            </div>
        `;
        
        // Add event listeners for tweet buttons inside the card
        const tweetButtons = card.querySelectorAll('[data-id]');
        tweetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTweetComposer(section, dateStr);
            });
        });
        
        return card;
    }

    // Modal Operations
    function openTweetComposer(section, dateStr) {
        state.selectedUpdate = { section, dateStr };
        
        // Construct the draft tweet text
        const style = getCategoryStyle(section.type);
        const prefix = `📢 BigQuery [${style.label}] (${dateStr}):\n`;
        const url = `\n\nRead more: ${section.link}`;
        
        // Max characters for main text to prevent overall overflow
        // Twitter allows 280, URL is always counted as 23 characters.
        // Formula: 280 - prefix.length - 23 (url space) - 4 (\n\n + space)
        const allowedBodyLength = 280 - prefix.length - 23 - 4;
        
        let bodyText = section.text;
        if (bodyText.length > allowedBodyLength) {
            bodyText = bodyText.substring(0, allowedBodyLength - 3) + '...';
        }
        
        const fullTweet = `${prefix}${bodyText}${url}`;
        
        // Load into textarea
        tweetTextarea.value = fullTweet;
        
        // Display modal
        tweetModal.classList.remove('hidden');
        tweetModal.setAttribute('aria-hidden', 'false');
        
        // Trigger initial count calculations
        updateCharCount();
        
        // Auto focus textarea
        setTimeout(() => tweetTextarea.focus(), 50);
    }

    function hideTweetModal() {
        tweetModal.classList.add('hidden');
        tweetModal.setAttribute('aria-hidden', 'true');
        state.selectedUpdate = null;
    }

    // Character Counter & Progress Circle logic
    function updateCharCount() {
        const text = tweetTextarea.value;
        const link = state.selectedUpdate ? state.selectedUpdate.section.link : '';
        
        // In X/Twitter, a link counts as exactly 23 characters
        let length = text.length;
        if (link && text.includes(link)) {
            // Replace link with 23 characters for counting purposes
            const textWithoutLink = text.replace(link, '');
            length = textWithoutLink.length + 23;
        }

        const remaining = 280 - length;
        charCounter.textContent = remaining;
        
        // Color classes based on limit
        if (remaining < 0) {
            charCounter.style.color = '#ef4444'; // Red
            submitTweetBtn.disabled = true;
            submitTweetBtn.style.opacity = 0.5;
            submitTweetBtn.style.pointerEvents = 'none';
        } else {
            charCounter.style.color = remaining <= 20 ? '#fbbf24' : 'var(--text-secondary)'; // Yellow close to limit
            submitTweetBtn.disabled = false;
            submitTweetBtn.style.opacity = 1;
            submitTweetBtn.style.pointerEvents = 'auto';
        }

        // Circular progress indicator calculation
        const percent = Math.min(100, (length / 280) * 100);
        const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
        charProgressRing.style.strokeDashoffset = offset;
        
        // Indicator color
        if (percent >= 100) {
            charProgressRing.style.stroke = '#ef4444'; // Red
        } else if (percent >= 90) {
            charProgressRing.style.stroke = '#fbbf24'; // Yellow
        } else {
            charProgressRing.style.stroke = '#1d9bf0'; // Twitter Blue
        }
    }
});
