/**
 * 100 Famous Quotes - Frontend Application
 * Plain Vanilla JavaScript
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentFeaturedQuote: null,
    activeCategory: '',
    activeAuthor: '',
    searchQuery: '',
    debounceTimer: null,
    allQuotesCount: 100
  };

  // DOM Elements
  const DOM = {
    // Featured Hero Elements
    featuredCard: document.getElementById('featuredCard'),
    featuredQuoteText: document.getElementById('featuredQuoteText'),
    featuredAuthor: document.getElementById('featuredAuthor'),
    featuredCategory: document.getElementById('featuredCategory'),
    featuredQuoteId: document.getElementById('featuredQuoteId'),
    btnNewRandomQuote: document.getElementById('btnNewRandomQuote'),
    btnCopyQuote: document.getElementById('btnCopyQuote'),
    btnTweetQuote: document.getElementById('btnTweetQuote'),

    // Controls Elements
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    authorSelect: document.getElementById('authorSelect'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    categoryPills: document.getElementById('categoryPills'),
    resultsCount: document.getElementById('resultsCount'),

    // Grid & Empty State
    quotesGrid: document.getElementById('quotesGrid'),
    emptyState: document.getElementById('emptyState'),
    btnEmptyReset: document.getElementById('btnEmptyReset'),

    // Toast Notification
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
        throw new Error(`Failed to fetch random quote (${res.status})`);
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
    }, 2400);
  }

  /**
   * Copy Text to Clipboard
   */
  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
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
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showToast('Could not copy to clipboard');
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Render Featured / Random Quote
   */
  function renderFeaturedQuote(quote) {
    if (!quote) return;
    state.currentFeaturedQuote = quote;

    // Smooth transition
    DOM.featuredQuoteText.style.opacity = '0';

    setTimeout(() => {
      DOM.featuredQuoteText.textContent = `“${quote.quote}”`;
      DOM.featuredAuthor.textContent = `— ${quote.author}`;
      DOM.featuredCategory.textContent = quote.category;
      DOM.featuredCategory.setAttribute('data-cat', quote.category);
      DOM.featuredQuoteId.textContent = `Quote #${quote.id}`;

      // Update Twitter/X share intent
      const tweetText = encodeURIComponent(`"${quote.quote}" — ${quote.author}`);
      DOM.btnTweetQuote.href = `https://twitter.com/intent/tweet?text=${tweetText}`;

      DOM.featuredQuoteText.style.opacity = '1';
    }, 150);
  }

  /**
   * Populate Categories Filter Pills
   */
  function renderCategoryPills(categories) {
    // Keep the "All" pill and append category pills
    DOM.categoryPills.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `pill-btn ${state.activeCategory === '' ? 'active' : ''}`;
    allBtn.dataset.category = '';
    allBtn.textContent = 'All';
    DOM.categoryPills.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pill-btn ${state.activeCategory.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''}`;
      btn.dataset.category = cat.name;
      btn.innerHTML = `${escapeHTML(cat.name)} <span style="opacity:0.6;font-size:0.75rem;">(${cat.count})</span>`;
      DOM.categoryPills.appendChild(btn);
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
   * Render Quotes Grid
   */
  function renderQuotesGrid(quotes) {
    DOM.quotesGrid.innerHTML = '';

    if (!quotes || quotes.length === 0) {
      DOM.emptyState.hidden = false;
      DOM.quotesGrid.hidden = true;
      DOM.resultsCount.textContent = 'No quotes found';
      return;
    }

    DOM.emptyState.hidden = true;
    DOM.quotesGrid.hidden = false;
    DOM.resultsCount.textContent = `Showing ${quotes.length} of ${state.allQuotesCount} quotes`;

    const fragment = document.createDocumentFragment();

    quotes.forEach(q => {
      const card = document.createElement('article');
      card.className = 'quote-card';

      card.innerHTML = `
        <div class="quote-card-header">
          <span class="badge" data-cat="${escapeHTML(q.category)}">${escapeHTML(q.category)}</span>
          <span class="card-num">#${q.id}</span>
        </div>
        <div class="quote-card-body">
          <blockquote>“${escapeHTML(q.quote)}”</blockquote>
        </div>
        <div class="quote-card-footer">
          <cite class="quote-card-author">— ${escapeHTML(q.author)}</cite>
          <div class="quote-card-actions">
            <button type="button" class="btn-card-action btn-copy-card" title="Copy quote" aria-label="Copy quote">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
      `;

      // Copy handler for card
      const btnCopy = card.querySelector('.btn-copy-card');
      btnCopy.addEventListener('click', () => {
        copyText(`"${q.quote}" — ${q.author}`);
      });

      fragment.appendChild(card);
    });

    DOM.quotesGrid.appendChild(fragment);
  }

  /**
   * Load and Refresh Filtered Quotes
   */
  async function refreshQuotes() {
    try {
      const data = await API.getQuotes({
        category: state.activeCategory,
        author: state.activeAuthor,
        q: state.searchQuery
      });
      renderQuotesGrid(data.quotes);
    } catch (err) {
      console.error('Error fetching filtered quotes:', err);
      renderQuotesGrid([]);
    }
  }

  /**
   * Fetch a New Random Quote
   */
  async function loadRandomQuote() {
    try {
      const quote = await API.getRandomQuote({
        category: state.activeCategory,
        author: state.activeAuthor,
        q: state.searchQuery
      });
      renderFeaturedQuote(quote);
    } catch (err) {
      // If no quote matched active filters, fall back to global random
      try {
        const fallback = await API.getRandomQuote();
        renderFeaturedQuote(fallback);
      } catch (e) {
        console.error('Error fetching random quote:', e);
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

    DOM.searchInput.value = '';
    DOM.btnClearSearch.hidden = true;
    DOM.authorSelect.value = '';

    // Update category pills
    const pills = DOM.categoryPills.querySelectorAll('.pill-btn');
    pills.forEach(p => {
      p.classList.toggle('active', p.dataset.category === '');
    });

    refreshQuotes();
  }

  /**
   * Attach Event Listeners
   */
  function initEventListeners() {
    // New Random Quote Button
    DOM.btnNewRandomQuote.addEventListener('click', () => {
      loadRandomQuote();
    });

    // Copy Featured Quote
    DOM.btnCopyQuote.addEventListener('click', () => {
      if (state.currentFeaturedQuote) {
        copyText(`"${state.currentFeaturedQuote.quote}" — ${state.currentFeaturedQuote.author}`);
      }
    });

    // Search Input with Debounce
    DOM.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.searchQuery = val;
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
      DOM.btnClearSearch.hidden = true;
      DOM.searchInput.focus();
      refreshQuotes();
    });

    // Author Select Change
    DOM.authorSelect.addEventListener('change', (e) => {
      state.activeAuthor = e.target.value;
      refreshQuotes();
    });

    // Category Pills Click Delegation
    DOM.categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill-btn');
      if (!pill) return;

      const category = pill.dataset.category || '';
      state.activeCategory = category;

      // Update active pill UI
      const pills = DOM.categoryPills.querySelectorAll('.pill-btn');
      pills.forEach(p => p.classList.toggle('active', p === pill));

      refreshQuotes();
    });

    // Reset Filters Buttons
    DOM.btnResetFilters.addEventListener('click', resetFilters);
    DOM.btnEmptyReset.addEventListener('click', resetFilters);
  }

  /**
   * Application Initialization
   */
  async function init() {
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
        loadRandomQuote(),
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
