/**
 * 100 Famous Quotes - Frontend Application
 * Plain Vanilla JavaScript
 */

(function () {
  'use strict';

  const PAGE_SIZE = 24;

  // Application State
  const state = {
    currentFeaturedQuote: null,
    fetchedQuotes: [],
    displayedQuotes: [],
    visibleCount: PAGE_SIZE,
    activeCategory: '',
    activeAuthor: '',
    searchQuery: '',
    onlyFavorites: false,
    favoriteIds: new Set(),
    debounceTimer: null,
    allQuotesCount: 100
  };

  // DOM Elements
  const DOM = {
    // Theme Toggle Elements
    themeToggle: document.getElementById('themeToggle'),
    themeToggleLabel: document.getElementById('themeToggleLabel'),

    // Featured Hero Elements
    featuredCard: document.getElementById('featuredCard'),
    featuredQuoteText: document.getElementById('featuredQuoteText'),
    featuredAuthor: document.getElementById('featuredAuthor'),
    featuredCategory: document.getElementById('featuredCategory'),
    featuredQuoteId: document.getElementById('featuredQuoteId'),
    btnNewRandomQuote: document.getElementById('btnNewRandomQuote'),
    btnCopyQuote: document.getElementById('btnCopyQuote'),
    btnFavoriteFeatured: document.getElementById('btnFavoriteFeatured'),
    featuredFavoriteLabel: document.getElementById('featuredFavoriteLabel'),
    btnTweetQuote: document.getElementById('btnTweetQuote'),

    // Controls Elements
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    authorSelect: document.getElementById('authorSelect'),
    btnToggleFavorites: document.getElementById('btnToggleFavorites'),
    favoritesCount: document.getElementById('favoritesCount'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    btnExportCsv: document.getElementById('btnExportCsv'),
    categoryPills: document.getElementById('categoryPills'),
    activeFiltersBar: document.getElementById('activeFiltersBar'),
    activeFilterChips: document.getElementById('activeFilterChips'),
    resultsCount: document.getElementById('resultsCount'),

    // Grid, Pagination, Empty & Error States
    quotesGrid: document.getElementById('quotesGrid'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    btnLoadMore: document.getElementById('btnLoadMore'),
    emptyState: document.getElementById('emptyState'),
    emptyStateTitle: document.getElementById('emptyStateTitle'),
    emptyStateMessage: document.getElementById('emptyStateMessage'),
    btnEmptyReset: document.getElementById('btnEmptyReset'),
    errorState: document.getElementById('errorState'),
    errorStateMessage: document.getElementById('errorStateMessage'),
    btnRetryFetch: document.getElementById('btnRetryFetch'),

    // Back to Top & Toast Notification
    btnBackToTop: document.getElementById('btnBackToTop'),
    toast: document.getElementById('toast')
  };

  /**
   * API Client
   */
  const API = {
    async getRandomQuote(params = {}) {
      const query = new URLSearchParams();
      if (params.category) query.append('category', params.category);
      if (params.author) query.append('author', params.author);
      if (params.q) query.append('q', params.q);

      const qs = query.toString();
      const url = `/api/quotes/random${qs ? '?' + qs : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = new Error(`Failed to fetch random quote (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    async getQuotes(params = {}) {
      const query = new URLSearchParams();
      if (params.category) query.append('category', params.category);
      if (params.author) query.append('author', params.author);
      if (params.q) query.append('q', params.q);

      const qs = query.toString();
      const url = `/api/quotes${qs ? '?' + qs : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch quotes (${res.status})`);
      }
      return res.json();
    },

    async getCategories() {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },

    async getAuthors() {
      const res = await fetch('/api/authors');
      if (!res.ok) throw new Error('Failed to fetch authors');
      return res.json();
    }
  };

  /**
   * Toast Notification
   */
  let toastTimeout = null;
  function showToast(message = 'Copied to clipboard!') {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      DOM.toast.classList.remove('show');
    }, 2600);
  }

  /**
   * Copy Text to Clipboard
   */
  async function copyText(text, triggerBtn = null) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('Copied to clipboard!');

      if (triggerBtn) {
        const labelEl = triggerBtn.querySelector('span');
        const originalText = labelEl ? labelEl.textContent : '';
        triggerBtn.classList.add('copied');
        if (labelEl) labelEl.textContent = 'Copied!';
        setTimeout(() => {
          triggerBtn.classList.remove('copied');
          if (labelEl) labelEl.textContent = originalText;
        }, 1500);
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showToast('Could not copy to clipboard');
    }
  }

  /**
   * Export Displayed Quotes to CSV
   */
  function exportQuotesToCSV() {
    const quotes = state.displayedQuotes || [];
    if (quotes.length === 0) {
      showToast('No quotes available to export');
      return;
    }

    const escapeCsvField = (value) => {
      const str = value == null ? '' : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['ID', 'Quote', 'Author', 'Category'];
    const rows = quotes.map(q => [
      escapeCsvField(q.id),
      escapeCsvField(q.quote),
      escapeCsvField(q.author),
      escapeCsvField(q.category)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'famous_quotes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${quotes.length} quote${quotes.length === 1 ? '' : 's'} to CSV!`);
  }

  /**
   * Escape HTML & Highlight Search Matches
   */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightMatch(text, query) {
    const escapedText = escapeHTML(text);
    if (!query || !query.trim()) return escapedText;

    const escapedQuery = escapeHTML(query.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedQuery) return escapedText;

    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  /**
   * Favorites / Bookmarks Management (localStorage)
   */
  function initFavorites() {
    try {
      const raw = localStorage.getItem('favoriteQuoteIds');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          state.favoriteIds = new Set(parsed);
        }
      }
    } catch (e) {
      state.favoriteIds = new Set();
    }
    updateFavoritesUI();
  }

  function saveFavorites() {
    try {
      localStorage.setItem('favoriteQuoteIds', JSON.stringify(Array.from(state.favoriteIds)));
    } catch (e) {
      // Ignore storage errors
    }
  }

  function updateFavoritesUI() {
    if (DOM.favoritesCount) {
      DOM.favoritesCount.textContent = String(state.favoriteIds.size);
    }
    if (DOM.btnToggleFavorites) {
      DOM.btnToggleFavorites.classList.toggle('active', state.onlyFavorites);
      DOM.btnToggleFavorites.setAttribute('aria-pressed', String(state.onlyFavorites));
    }
    updateFeaturedFavoriteButton();
  }

  function updateFeaturedFavoriteButton() {
    if (!DOM.btnFavoriteFeatured || !state.currentFeaturedQuote) return;
    const isFav = state.favoriteIds.has(state.currentFeaturedQuote.id);
    const heartEl = DOM.btnFavoriteFeatured.querySelector('.heart-icon');
    DOM.btnFavoriteFeatured.classList.toggle('favorited', isFav);
    DOM.btnFavoriteFeatured.setAttribute('aria-pressed', String(isFav));
    if (heartEl) heartEl.textContent = isFav ? '♥' : '♡';
    if (DOM.featuredFavoriteLabel) {
      DOM.featuredFavoriteLabel.textContent = isFav ? 'Saved' : 'Save';
    }
  }

  function toggleFavorite(quoteId) {
    const isFav = state.favoriteIds.has(quoteId);
    if (isFav) {
      state.favoriteIds.delete(quoteId);
      showToast('Removed from saved quotes');
    } else {
      state.favoriteIds.add(quoteId);
      showToast('Saved to favorites!');
    }
    saveFavorites();
    updateFavoritesUI();

    if (state.onlyFavorites) {
      applyClientFiltersAndRender();
    }
  }

  /**
   * Render Featured / Random Quote
   */
  function renderFeaturedQuote(quote) {
    if (!quote) return;
    state.currentFeaturedQuote = quote;

    DOM.featuredQuoteText.style.opacity = '0';

    setTimeout(() => {
      DOM.featuredQuoteText.textContent = `“${quote.quote}”`;
      DOM.featuredAuthor.textContent = `— ${quote.author}`;
      DOM.featuredAuthor.dataset.author = quote.author;
      DOM.featuredCategory.textContent = quote.category;
      DOM.featuredCategory.setAttribute('data-cat', quote.category);
      DOM.featuredQuoteId.textContent = `Quote #${quote.id}`;

      const tweetText = encodeURIComponent(`"${quote.quote}" — ${quote.author}`);
      DOM.btnTweetQuote.href = `https://twitter.com/intent/tweet?text=${tweetText}`;

      updateFeaturedFavoriteButton();
      DOM.featuredQuoteText.style.opacity = '1';
    }, 150);
  }

  /**
   * Populate Categories Filter Pills with ARIA radio attributes
   */
  function renderCategoryPills(categories) {
    DOM.categoryPills.innerHTML = '';

    const isAllActive = state.activeCategory === '';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `pill-btn ${isAllActive ? 'active' : ''}`;
    allBtn.setAttribute('role', 'radio');
    allBtn.setAttribute('aria-checked', String(isAllActive));
    allBtn.dataset.category = '';
    allBtn.textContent = 'All';
    DOM.categoryPills.appendChild(allBtn);

    categories.forEach(cat => {
      const isActive = state.activeCategory.toLowerCase() === cat.name.toLowerCase();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pill-btn ${isActive ? 'active' : ''}`;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(isActive));
      btn.dataset.category = cat.name;
      btn.innerHTML = `${escapeHTML(cat.name)} <span class="pill-count">(${cat.count})</span>`;
      DOM.categoryPills.appendChild(btn);
    });
  }

  function syncCategoryPillsUI() {
    const pills = DOM.categoryPills.querySelectorAll('.pill-btn');
    pills.forEach(p => {
      const pillCat = (p.dataset.category || '').toLowerCase();
      const isActive = pillCat === state.activeCategory.toLowerCase();
      p.classList.toggle('active', isActive);
      p.setAttribute('aria-checked', String(isActive));
    });
  }

  /**
   * Populate Authors Dropdown Select
   */
  function renderAuthorsDropdown(authors) {
    DOM.authorSelect.innerHTML = '<option value="">All Authors</option>';
    authors.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = `${item.name} (${item.count})`;
      DOM.authorSelect.appendChild(opt);
    });
  }

  /**
   * Render Active Filter Summary Chips
   */
  function renderActiveFilterChips() {
    if (!DOM.activeFiltersBar || !DOM.activeFilterChips) return;
    DOM.activeFilterChips.innerHTML = '';

    const chips = [];

    if (state.activeCategory) {
      chips.push({
        label: `Category: ${state.activeCategory}`,
        onRemove: () => setCategoryFilter('')
      });
    }

    if (state.activeAuthor) {
      chips.push({
        label: `Author: ${state.activeAuthor}`,
        onRemove: () => setAuthorFilter('')
      });
    }

    if (state.searchQuery) {
      chips.push({
        label: `Search: “${state.searchQuery}”`,
        onRemove: () => {
          DOM.searchInput.value = '';
          state.searchQuery = '';
          DOM.btnClearSearch.hidden = true;
          state.visibleCount = PAGE_SIZE;
          refreshQuotes();
        }
      });
    }

    if (state.onlyFavorites) {
      chips.push({
        label: 'Saved Favorites Only',
        onRemove: () => {
          state.onlyFavorites = false;
          state.visibleCount = PAGE_SIZE;
          updateFavoritesUI();
          applyClientFiltersAndRender();
        }
      });
    }

    if (chips.length === 0) {
      DOM.activeFiltersBar.hidden = true;
      return;
    }

    DOM.activeFiltersBar.hidden = false;
    chips.forEach(chipData => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip';
      btn.title = `Remove filter: ${chipData.label}`;
      btn.innerHTML = `<span>${escapeHTML(chipData.label)}</span> <span class="chip-close" aria-hidden="true">&times;</span>`;
      btn.addEventListener('click', chipData.onRemove);
      DOM.activeFilterChips.appendChild(btn);
    });
  }

  /**
   * Build Contextual Empty State Message
   */
  function updateContextualEmptyState() {
    if (!DOM.emptyStateMessage || !DOM.emptyStateTitle) return;

    if (state.onlyFavorites && state.favoriteIds.size === 0) {
      DOM.emptyStateTitle.textContent = 'No saved quotes yet';
      DOM.emptyStateMessage.textContent = 'Click the heart (♡) button on any quote card to bookmark your favorite quotes here.';
      return;
    }

    DOM.emptyStateTitle.textContent = 'No quotes found';
    const parts = [];
    if (state.searchQuery) parts.push(`matching “${state.searchQuery}”`);
    if (state.activeAuthor) parts.push(`by ${state.activeAuthor}`);
    if (state.activeCategory) parts.push(`in category “${state.activeCategory}”`);
    if (state.onlyFavorites) parts.push('within your saved favorites');

    if (parts.length > 0) {
      DOM.emptyStateMessage.textContent = `No quotes found ${parts.join(' ')}. Try removing one of the active filters above.`;
    } else {
      DOM.emptyStateMessage.textContent = "We couldn't find any quotes matching your current filters.";
    }
  }

  /**
   * Render Loading Skeletons
   */
  function renderLoadingSkeletons() {
    if (!DOM.quotesGrid) return;
    DOM.quotesGrid.setAttribute('aria-busy', 'true');
    DOM.emptyState.hidden = true;
    if (DOM.errorState) DOM.errorState.hidden = true;
    if (DOM.loadMoreContainer) DOM.loadMoreContainer.hidden = true;
    DOM.quotesGrid.hidden = false;
    DOM.resultsCount.textContent = 'Loading quotes...';

    DOM.quotesGrid.innerHTML = Array.from({ length: 6 })
      .map(() => `
        <div class="quote-card skeleton-card" aria-hidden="true">
          <div class="skeleton-line skeleton-badge"></div>
          <div class="skeleton-line skeleton-text-lg"></div>
          <div class="skeleton-line skeleton-text-md"></div>
          <div class="skeleton-line skeleton-footer"></div>
        </div>
      `)
      .join('');
  }

  /**
   * Render Quotes Grid (with Pagination, Highlighting, Favorites & Clickable Tags)
   */
  function renderQuotesGrid(quotes) {
    DOM.quotesGrid.innerHTML = '';
    DOM.quotesGrid.setAttribute('aria-busy', 'false');
    if (DOM.errorState) DOM.errorState.hidden = true;
    state.displayedQuotes = quotes || [];

    renderActiveFilterChips();

    if (!quotes || quotes.length === 0) {
      DOM.emptyState.hidden = false;
      DOM.quotesGrid.hidden = true;
      if (DOM.loadMoreContainer) DOM.loadMoreContainer.hidden = true;
      DOM.resultsCount.textContent = '0 quotes found';
      updateContextualEmptyState();
      return;
    }

    DOM.emptyState.hidden = true;
    DOM.quotesGrid.hidden = false;

    const visibleQuotes = quotes.slice(0, state.visibleCount);
    const remainingCount = Math.max(0, quotes.length - visibleQuotes.length);

    if (quotes.length === state.allQuotesCount && visibleQuotes.length === quotes.length) {
      DOM.resultsCount.textContent = `Showing all ${quotes.length} quotes`;
    } else if (visibleQuotes.length < quotes.length) {
      DOM.resultsCount.textContent = `Showing ${visibleQuotes.length} of ${quotes.length} matching quotes`;
    } else {
      DOM.resultsCount.textContent = `Showing ${quotes.length} of ${state.allQuotesCount} quotes`;
    }

    if (DOM.loadMoreContainer && DOM.btnLoadMore) {
      if (remainingCount > 0) {
        DOM.loadMoreContainer.hidden = false;
        DOM.btnLoadMore.textContent = `Load More Quotes (${remainingCount} remaining)`;
      } else {
        DOM.loadMoreContainer.hidden = true;
      }
    }

    const fragment = document.createDocumentFragment();

    visibleQuotes.forEach(q => {
      const card = document.createElement('article');
      card.className = 'quote-card';
      const isFav = state.favoriteIds.has(q.id);

      card.innerHTML = `
        <div class="quote-card-header">
          <button type="button" class="badge badge-clickable" data-cat="${escapeHTML(q.category)}" title="Filter by ${escapeHTML(q.category)}">${escapeHTML(q.category)}</button>
          <span class="card-num">#${q.id}</span>
        </div>
        <div class="quote-card-body">
          <blockquote>“${highlightMatch(q.quote, state.searchQuery)}”</blockquote>
        </div>
        <div class="quote-card-footer">
          <cite class="quote-card-author">
            <button type="button" class="author-link" title="Filter by ${escapeHTML(q.author)}">— ${highlightMatch(q.author, state.searchQuery)}</button>
          </cite>
          <div class="quote-card-actions">
            <button type="button" class="btn-card-action btn-fav-card ${isFav ? 'favorited' : ''}" aria-pressed="${isFav}" title="${isFav ? 'Remove from saved' : 'Save quote'}" aria-label="Save quote to favorites">
              <span class="heart-icon" aria-hidden="true">${isFav ? '♥' : '♡'}</span>
            </button>
            <button type="button" class="btn-card-action btn-copy-card" title="Copy to Clipboard" aria-label="Copy quote to clipboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy to Clipboard</span>
            </button>
          </div>
        </div>
      `;

      // Clickable category badge
      const badgeBtn = card.querySelector('.badge-clickable');
      badgeBtn.addEventListener('click', () => {
        setCategoryFilter(q.category);
        showToast(`Filtered by category: ${q.category}`);
      });

      // Clickable author
      const authorBtn = card.querySelector('.author-link');
      authorBtn.addEventListener('click', () => {
        setAuthorFilter(q.author);
        showToast(`Filtered by author: ${q.author}`);
      });

      // Favorite toggle handler for card
      const btnFav = card.querySelector('.btn-fav-card');
      btnFav.addEventListener('click', () => {
        toggleFavorite(q.id);
        const nowFav = state.favoriteIds.has(q.id);
        btnFav.classList.toggle('favorited', nowFav);
        btnFav.setAttribute('aria-pressed', String(nowFav));
        btnFav.title = nowFav ? 'Remove from saved' : 'Save quote';
        const heart = btnFav.querySelector('.heart-icon');
        if (heart) heart.textContent = nowFav ? '♥' : '♡';
      });

      // Copy handler for card
      const btnCopy = card.querySelector('.btn-copy-card');
      btnCopy.addEventListener('click', () => {
        copyText(`"${q.quote}" — ${q.author}`, btnCopy);
      });

      fragment.appendChild(card);
    });

    DOM.quotesGrid.appendChild(fragment);
  }

  /**
   * Apply Client-Side Filters (e.g. Favorites Only) and Render
   */
  function applyClientFiltersAndRender() {
    let list = state.fetchedQuotes || [];
    if (state.onlyFavorites) {
      list = list.filter(q => state.favoriteIds.has(q.id));
    }
    renderQuotesGrid(list);
  }

  /**
   * Filter Setters
   */
  function setCategoryFilter(categoryName) {
    state.activeCategory = categoryName || '';
    state.visibleCount = PAGE_SIZE;
    syncCategoryPillsUI();
    refreshQuotes();
  }

  function setAuthorFilter(authorName) {
    state.activeAuthor = authorName || '';
    state.visibleCount = PAGE_SIZE;
    if (DOM.authorSelect) {
      DOM.authorSelect.value = state.activeAuthor;
    }
    refreshQuotes();
  }

  /**
   * Load and Refresh Filtered Quotes
   */
  async function refreshQuotes() {
    renderLoadingSkeletons();
    try {
      const data = await API.getQuotes({
        category: state.activeCategory,
        author: state.activeAuthor,
        q: state.searchQuery
      });
      state.fetchedQuotes = data.quotes || [];
      applyClientFiltersAndRender();
    } catch (err) {
      console.error('Error fetching filtered quotes:', err);
      DOM.quotesGrid.innerHTML = '';
      DOM.quotesGrid.hidden = true;
      DOM.quotesGrid.setAttribute('aria-busy', 'false');
      DOM.emptyState.hidden = true;
      if (DOM.loadMoreContainer) DOM.loadMoreContainer.hidden = true;
      if (DOM.errorState) {
        DOM.errorState.hidden = false;
      }
      DOM.resultsCount.textContent = 'Unable to load quotes';
    }
  }

  /**
   * Fetch a New Random Quote
   */
  async function loadRandomQuote(isUserInitiated = false) {
    const hasActiveFilters = Boolean(state.activeCategory || state.activeAuthor || state.searchQuery);
    try {
      const quote = await API.getRandomQuote({
        category: state.activeCategory,
        author: state.activeAuthor,
        q: state.searchQuery
      });
      renderFeaturedQuote(quote);
    } catch (err) {
      // If no quote matched active filters, fall back to global random and notify user
      try {
        const fallback = await API.getRandomQuote();
        renderFeaturedQuote(fallback);
        if (isUserInitiated && hasActiveFilters) {
          showToast('No quotes matched active filters — showing a random quote from all categories');
        }
      } catch (e) {
        console.error('Error fetching random quote:', e);
        if (isUserInitiated) {
          showToast('Could not load a new random quote');
        }
      }
    }
  }

  /**
   * Reset All Search & Filter Controls
   */
  function resetFilters() {
    state.activeCategory = '';
    state.activeAuthor = '';
    state.searchQuery = '';
    state.onlyFavorites = false;
    state.visibleCount = PAGE_SIZE;

    DOM.searchInput.value = '';
    DOM.btnClearSearch.hidden = true;
    DOM.authorSelect.value = '';

    updateFavoritesUI();
    syncCategoryPillsUI();
    refreshQuotes();
  }

  /**
   * Theme Management (Dark / Light Mode)
   */
  function setTheme(theme) {
    const isLight = theme === 'light';
    if (isLight) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('light-mode');
    }

    if (DOM.themeToggle) {
      DOM.themeToggle.setAttribute('aria-checked', String(isLight));
    }
    if (DOM.themeToggleLabel) {
      DOM.themeToggleLabel.textContent = isLight ? 'Dark Mode' : 'Light Mode';
    }

    try {
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    } catch (e) {
      // Ignore storage errors
    }
  }

  function initTheme() {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (e) {
      savedTheme = 'dark';
    }
    setTheme(savedTheme);
  }

  /**
   * Attach Event Listeners
   */
  function initEventListeners() {
    // Theme Toggle Switch
    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
        setTheme(isCurrentlyLight ? 'dark' : 'light');
      });
    }

    // New Random Quote Button
    DOM.btnNewRandomQuote.addEventListener('click', () => {
      loadRandomQuote(true);
    });

    // Copy Featured Quote
    DOM.btnCopyQuote.addEventListener('click', () => {
      if (state.currentFeaturedQuote) {
        copyText(`"${state.currentFeaturedQuote.quote}" — ${state.currentFeaturedQuote.author}`, DOM.btnCopyQuote);
      }
    });

    // Save/Favorite Featured Quote
    if (DOM.btnFavoriteFeatured) {
      DOM.btnFavoriteFeatured.addEventListener('click', () => {
        if (state.currentFeaturedQuote) {
          toggleFavorite(state.currentFeaturedQuote.id);
          renderQuotesGrid(state.displayedQuotes);
        }
      });
    }

    // Clickable Featured Category & Author
    if (DOM.featuredCategory) {
      DOM.featuredCategory.addEventListener('click', () => {
        if (state.currentFeaturedQuote) {
          setCategoryFilter(state.currentFeaturedQuote.category);
          showToast(`Filtered by category: ${state.currentFeaturedQuote.category}`);
        }
      });
    }

    if (DOM.featuredAuthor) {
      DOM.featuredAuthor.addEventListener('click', () => {
        if (state.currentFeaturedQuote) {
          setAuthorFilter(state.currentFeaturedQuote.author);
          showToast(`Filtered by author: ${state.currentFeaturedQuote.author}`);
        }
      });
    }

    // Toggle Saved Favorites Filter
    if (DOM.btnToggleFavorites) {
      DOM.btnToggleFavorites.addEventListener('click', () => {
        state.onlyFavorites = !state.onlyFavorites;
        state.visibleCount = PAGE_SIZE;
        updateFavoritesUI();
        applyClientFiltersAndRender();
      });
    }

    // Export to CSV Button
    if (DOM.btnExportCsv) {
      DOM.btnExportCsv.addEventListener('click', exportQuotesToCSV);
    }

    // Search Input with Debounce
    DOM.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.searchQuery = val;
      state.visibleCount = PAGE_SIZE;
      DOM.btnClearSearch.hidden = val.length === 0;

      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        refreshQuotes();
      }, 220);
    });

    // Clear Search Input Button
    DOM.btnClearSearch.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.searchQuery = '';
      state.visibleCount = PAGE_SIZE;
      DOM.btnClearSearch.hidden = true;
      DOM.searchInput.focus();
      refreshQuotes();
    });

    // Author Select Change
    DOM.authorSelect.addEventListener('change', (e) => {
      state.activeAuthor = e.target.value;
      state.visibleCount = PAGE_SIZE;
      refreshQuotes();
    });

    // Category Pills Click Delegation
    DOM.categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill-btn');
      if (!pill) return;

      const category = pill.dataset.category || '';
      setCategoryFilter(category);
    });

    // Load More Quotes Pagination Button
    if (DOM.btnLoadMore) {
      DOM.btnLoadMore.addEventListener('click', () => {
        state.visibleCount += PAGE_SIZE;
        renderQuotesGrid(state.displayedQuotes);
      });
    }

    // Reset Filters & Retry Buttons
    DOM.btnResetFilters.addEventListener('click', resetFilters);
    DOM.btnEmptyReset.addEventListener('click', resetFilters);
    if (DOM.btnRetryFetch) {
      DOM.btnRetryFetch.addEventListener('click', refreshQuotes);
    }

    // Back to Top Scroll Button
    if (DOM.btnBackToTop) {
      window.addEventListener('scroll', () => {
        DOM.btnBackToTop.hidden = window.scrollY < 400;
      }, { passive: true });

      DOM.btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Global Keyboard Shortcuts ('/' to search, 'Esc' to clear search, 'R' for random quote)
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === '/' && !isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        DOM.searchInput.focus();
        DOM.searchInput.select();
      } else if (e.key === 'Escape' && document.activeElement === DOM.searchInput) {
        if (DOM.searchInput.value) {
          DOM.searchInput.value = '';
          state.searchQuery = '';
          state.visibleCount = PAGE_SIZE;
          DOM.btnClearSearch.hidden = true;
          refreshQuotes();
        }
        DOM.searchInput.blur();
      } else if ((e.key === 'r' || e.key === 'R') && !isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        loadRandomQuote(true);
      }
    });
  }

  /**
   * Application Initialization
   */
  async function init() {
    initTheme();
    initFavorites();
    initEventListeners();

    try {
      // 1. Fetch categories & authors in parallel
      const [categoriesData, authorsData] = await Promise.all([
        API.getCategories(),
        API.getAuthors()
      ]);

      renderCategoryPills(categoriesData.categories);
      renderAuthorsDropdown(authorsData.authors);

      // 2. Fetch initial random quote and initial full quotes list
      await Promise.all([
        loadRandomQuote(false),
        refreshQuotes()
      ]);
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
