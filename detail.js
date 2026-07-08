// ============================================================
// BOWL DETAIL PAGE — standalone behavior
// Reads category + item straight from the URL (?cat=...&item=...)
// and finds the matching data in the #rcData block further down
// this same HTML file. No sessionStorage, no click-capture on
// the menu page — everything needed lives in this one file.
// ============================================================

(function () {
  const params   = new URLSearchParams(window.location.search);
  const catParam  = params.get('cat');
  const itemParam = parseInt(params.get('item'), 10);

  const stage      = document.getElementById('rcStage');
  const prevBtn    = document.getElementById('rcPrevBtn');
  const nextBtn    = document.getElementById('rcNextBtn');
  const counterEl  = document.getElementById('rcCounter');
  const emptyState = document.getElementById('rcEmptyState');

  const pageFront  = document.getElementById('rcPageFront');
  const pageBack   = document.getElementById('rcPageBack');
  const photoFront = document.getElementById('rcPhotoFront');
  const photoBack  = document.getElementById('rcPhotoBack');
  const favBtn  = document.getElementById('rcFavBtn');
const cartBtn = document.getElementById('rcCartBtn');

const customizePrompt = document.getElementById('rcCustomizePrompt');
  const customizeYes    = document.getElementById('rcCustomizeYes');
  const customizeSkip   = document.getElementById('rcCustomizeSkip');
  const viewCartToast   = document.getElementById('rcViewCartToast');
  const toastText       = document.getElementById('rcToastText');
  

// ---- Find the matching category block in #rcData ----
  let items = [];
  if (catParam) {
    const categoryBlock = document.querySelector(
      `#rcData .rc-category[data-category="${CSS.escape(catParam)}"]`
    );
    if (categoryBlock) {
      items = Array.from(categoryBlock.querySelectorAll('.rc-item')).map(el => {
        const img = el.querySelector('img');
        return {
          name:   el.getAttribute('data-name') || '',
          price:  parseFloat(el.getAttribute('data-price')) || 0,
          poster: img ? img.getAttribute('src') : ''
        };
      });
    }
  }
 
  const hasItems = items.length > 0 && !isNaN(itemParam);
 
  if (!hasItems) {
    stage.style.display = 'none';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    counterEl.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
 
  let current = ((itemParam % items.length) + items.length) % items.length;
  let busy = false;
 
  function renderInto(photoEl, item) {
    photoEl.src = item.poster || '';
    photoEl.alt = item.name || '';
  }
 
  function updateCounter() {
    counterEl.textContent = `${current + 1} / ${items.length}`;
  }
 
  function updateUrl() {
    // keep the address bar in sync so reload/back button stays on
    // the same slide, and it's shareable
    const url = new URL(window.location.href);
    url.searchParams.set('cat', catParam);
    url.searchParams.set('item', current);
    window.history.replaceState({}, '', url);
  }
 
  // ---- Favorites (persisted in localStorage, per bowl name) ----
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem('rc-favorites') || '[]');
    } catch (e) {
      return [];
    }
  }
  function isFavorited(name) {
    return getFavorites().includes(name);
  }
  function toggleFavorite(name) {
    let favs = getFavorites();
    if (favs.includes(name)) {
      favs = favs.filter(n => n !== name);
    } else {
      favs.push(name);
    }
    localStorage.setItem('rc-favorites', JSON.stringify(favs));
  }
  function updateFavButton() {
    const name = items[current].name;
    favBtn.classList.toggle('rc-fav-active', isFavorited(name));
  }
 
  favBtn.addEventListener('click', () => {
    toggleFavorite(items[current].name);
    updateFavButton();
  });
 
  let toastTimer = null;
 
  function showToast(text) {
    toastText.textContent = text;
    viewCartToast.style.display = 'flex';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      viewCartToast.style.display = 'none';
    }, 4000);
  }
 
  function addCurrentToCart(wantsCustomize) {
    const item = items[current];
    rcAddToCart({
      category: catParam,
      itemIndex: current,
      name: item.name,
      poster: item.poster,
      price: item.price,
      wantsCustomize: wantsCustomize
    });
    customizePrompt.style.display = 'none';
    showToast(`${item.name} added to cart`);
  }
 
  cartBtn.addEventListener('click', () => {
    // brief visual confirmation on the button itself
    cartBtn.classList.add('rc-cart-added');
    setTimeout(() => cartBtn.classList.remove('rc-cart-added'), 700);
 
    // then ask, inline, whether they want to customize this item —
    // no modal, no blur, just a small prompt under the button
    customizePrompt.style.display = 'flex';
  });
 
  customizeYes.addEventListener('click', () => addCurrentToCart(true));
  customizeSkip.addEventListener('click', () => addCurrentToCart(false));
 
  function initRender() {
    renderInto(photoFront, items[current]);
    updateCounter();
    updateFavButton();
  }
 
  function goTo(targetIndex, direction) {
    if (busy) return;
    busy = true;
 
    renderInto(photoBack, items[targetIndex]);
 
    const origin = direction === 'next' ? 'left center' : 'right center';
    const angle  = direction === 'next' ? '-180deg' : '180deg';
 
    pageFront.style.transformOrigin = origin;
    void pageFront.offsetWidth; // force reflow before transition
 
    pageFront.classList.add('rc-flipping');
    pageFront.style.transform = `rotateY(${angle})`;
 
    const onEnd = () => {
      pageFront.removeEventListener('transitionend', onEnd);
 
      pageFront.classList.remove('rc-flipping');
      pageFront.style.transition = 'none';
      pageFront.style.transform = 'rotateY(0deg)';
      renderInto(photoFront, items[targetIndex]);
 
      requestAnimationFrame(() => {
        pageFront.style.transition = '';
      });
 
      current = targetIndex;
      updateCounter();
      updateUrl();
      updateFavButton();
      busy = false;
    };
 
    pageFront.addEventListener('transitionend', onEnd);
  }
 
  function next() {
    goTo((current + 1) % items.length, 'next');
  }
  function prev() {
    goTo((current - 1 + items.length) % items.length, 'prev');
  }
 
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
 
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });
 
  let touchStartX = null;
  stage.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next(); else prev();
    }
    touchStartX = null;
  });
 
  initRender();
})();
