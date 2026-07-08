// ============================================================
// CHECKOUT PAGE — standalone behavior
// Handles Order Summary (customize items) + Delivery & Payment,
// desktop split-view (right panel locked until left is done) and
// mobile sequential steps, plus the order confirmation overlay.
// ============================================================

(function () {
  const grid            = document.getElementById('rcCheckoutGrid');
  const pendingBanner    = document.getElementById('rcPendingBanner');
  const pendingText      = document.getElementById('rcPendingText');
  const skipAllBtn       = document.getElementById('rcSkipAllBtn');
  const summaryListEl    = document.getElementById('rcSummaryList');
  const continueBtn      = document.getElementById('rcContinueBtn');

  const panelDelivery    = document.getElementById('rcPanelDelivery');
  const mobileBackBtn    = document.getElementById('rcMobileBack');

  const addressListEl    = document.getElementById('rcAddressList');
  const addAddressBtn    = document.getElementById('rcAddAddressBtn');
  const addAddressForm   = document.getElementById('rcAddAddressForm');
  const newAddrLabel     = document.getElementById('rcNewAddrLabel');
  const newAddrText      = document.getElementById('rcNewAddrText');
  const saveAddressBtn   = document.getElementById('rcSaveAddressBtn');

  const paymentListEl    = document.getElementById('rcPaymentList');
  const totalOut         = document.getElementById('rcTotalOut');
  const payBtn            = document.getElementById('rcPayBtn');

  const confirmOverlay   = document.getElementById('rcConfirmOverlay');

  // ---- local UI state (not persisted — resets if they reload) ----
  let expandedIds = new Set();          // which order-summary cards are open
  let openSwapCategoryByItem = {};      // per item id: which swap pill is open
  let initialized = false;
  let selectedAddressId = null;
  let selectedPaymentId = null;

  let addresses = [
    { id: 'addr1', label: 'Home', text: '21 MG Road, Mysuru' },
    { id: 'addr2', label: 'Hostel', text: 'IISER Mohali Campus' }
  ];
  const paymentMethods = [
    { id: 'upi', label: 'UPI' },
    { id: 'card', label: 'Card' },
    { id: 'cod', label: 'Cash on delivery' }
  ];

  function getCart() { return rcGetCart(); }

  function pendingItems() {
    return getCart().filter(i => i.wantsCustomize && !i.opened);
  }

  // ============================================================
  // ORDER SUMMARY
  // ============================================================

  function renderPendingBanner() {
    const pending = pendingItems();
    if (pending.length === 0) {
      pendingBanner.style.display = 'none';
      return;
    }
    pendingBanner.style.display = 'flex';
    const names = pending.map(i => i.name).join(', ');
    pendingText.textContent = `${pending.length} item${pending.length > 1 ? 's' : ''} still need customizing — ${names}`;
  }

  function renderSummaryList() {
    const cart = getCart();

    // first render: auto-expand every item that still needs customizing
    if (!initialized) {
      cart.forEach(item => {
        if (item.wantsCustomize && !item.opened) expandedIds.add(item.id);
      });
      initialized = true;
    }

    summaryListEl.innerHTML = '';

    cart.forEach(item => {
      const isPending = item.wantsCustomize && !item.opened;
      const isExpanded = expandedIds.has(item.id);

      const card = document.createElement('div');
      card.className = 'rc-os-card' + (isPending ? ' rc-os-pending' : '') + (isExpanded ? ' rc-expanded' : '');
      card.dataset.id = item.id;

      const badge = item.opened
        ? (Object.keys(item.customizations || {}).length > 0 ? '<span class="rc-os-badge rc-badge-done">Customized</span>' : '')
        : (item.wantsCustomize ? '<span class="rc-os-badge rc-badge-pending">Customize</span>' : '');

      card.innerHTML = `
        <div class="rc-os-head" data-action="toggle">
          <img src="${item.poster}" alt="${item.name}">
          <div class="rc-os-head-info">
            <h4>${item.name}</h4>
            <span>Rs ${item.price} · Qty ${item.qty}</span>
          </div>
          ${badge}
          <svg class="rc-os-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="rc-os-body"></div>
      `;

      summaryListEl.appendChild(card);

      if (isExpanded) {
        renderCardBody(card.querySelector('.rc-os-body'), item);
      }
    });

    renderPendingBanner();
    updateContinueState();
  }

  function renderCardBody(bodyEl, item) {
    const cats = rcGetSwapCategories(item.category);
    const custom = item.customizations || {};
    const openCat = openSwapCategoryByItem[item.id] || null;

    const catsHtml = cats.map(cat => {
      const picked = custom[cat.label];
      const isOpen = openCat === cat.label;
      const changed = !!picked;
      return `<button class="rc-swap-pill ${isOpen ? 'rc-swap-active' : ''} ${changed ? 'rc-swap-changed' : ''}" data-cat="${cat.label}">${cat.label}${changed ? ' ✓' : ''}</button>`;
    }).join('');

    bodyEl.innerHTML = `
      <div class="rc-swap-cats">${catsHtml}</div>
      <div class="rc-swap-panel-slot"></div>
      <div class="rc-note-field">
        <label>Anything else? (optional)</label>
        <textarea placeholder="e.g. less sweet, small portion">${item.note || ''}</textarea>
      </div>
      <button class="rc-os-done-btn" data-action="done">Done</button>
      ${item.wantsCustomize && !item.opened ? '<button class="rc-os-skip-link" data-action="skip">Skip this one</button>' : ''}
    `;

    if (openCat) {
      const cat = cats.find(c => c.label === openCat);
      if (cat) renderSwapPanel(bodyEl.querySelector('.rc-swap-panel-slot'), item, cat);
    }
  }

  function renderSwapPanel(slot, item, cat) {
    const custom = item.customizations || {};
    const currentChoice = custom[cat.label] ? custom[cat.label].choice : cat.current;

    const optsHtml = cat.swaps.map(opt => {
      const selected = custom[cat.label] && custom[cat.label].choice === opt.label;
      return `<button class="rc-swap-opt ${selected ? 'rc-opt-selected' : ''}" data-choice="${opt.label}" data-price="${opt.price}">${opt.label}${opt.price ? ' (+Rs ' + opt.price + ')' : ''}</button>`;
    }).join('');

    slot.innerHTML = `
      <div class="rc-swap-panel">
        <div class="rc-swap-current">Currently: ${currentChoice}</div>
        <div class="rc-swap-opts">${optsHtml}</div>
      </div>
    `;
  }

  summaryListEl.addEventListener('click', (e) => {
    const card = e.target.closest('.rc-os-card');
    if (!card) return;
    const id = card.dataset.id;
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;

    // toggle expand/collapse
    if (e.target.closest('[data-action="toggle"]')) {
      if (expandedIds.has(id)) {
        expandedIds.delete(id);
      } else {
        expandedIds.add(id);
      }
      openSwapCategoryByItem[id] = null;
      renderSummaryList();
      return;
    }

    // open/close a swap category panel for THIS item
    const pill = e.target.closest('.rc-swap-pill');
    if (pill) {
      const catLabel = pill.dataset.cat;
      const current = openSwapCategoryByItem[id] || null;
      openSwapCategoryByItem[id] = (current === catLabel) ? null : catLabel;
      renderSummaryList();
      return;
    }

    // pick a swap option
    const optBtn = e.target.closest('.rc-swap-opt');
    if (optBtn) {
      const label = optBtn.dataset.choice;
      const price = parseFloat(optBtn.dataset.price) || 0;
      const openCat = openSwapCategoryByItem[id];
      const custom = item.customizations || {};
      custom[openCat] = { choice: label, extra: price };
      item.customizations = custom;
      rcSaveCart(cart);
      openSwapCategoryByItem[id] = null;
      renderSummaryList();
      return;
    }

    // Done — mark this item as resolved
    if (e.target.closest('[data-action="done"]')) {
      const textarea = card.querySelector('.rc-note-field textarea');
      const note = textarea ? textarea.value : '';
      rcMarkOpened(id, item.customizations || {}, note);
      expandedIds.delete(id);
      openSwapCategoryByItem[id] = null;
      renderSummaryList();
      updateTotal();
      return;
    }

    // Skip this one (last-chance skip from inside the open card)
    if (e.target.closest('[data-action="skip"]')) {
      rcSkipCustomize(id);
      expandedIds.delete(id);
      openSwapCategoryByItem[id] = null;
      renderSummaryList();
      return;
    }
  });

  skipAllBtn.addEventListener('click', () => {
    pendingItems().forEach(i => {
      rcSkipCustomize(i.id);
      expandedIds.delete(i.id);
    });
    renderSummaryList();
  });

  function updateContinueState() {
    const stillPending = pendingItems().length > 0;
    continueBtn.disabled = stillPending;
  }

  continueBtn.addEventListener('click', () => {
    if (pendingItems().length > 0) return; // guard, button should be disabled anyway
    panelDelivery.classList.remove('rc-locked');
    grid.classList.add('rc-step-delivery');   // no-op on desktop (media-gated), switches view on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  mobileBackBtn.addEventListener('click', () => {
    grid.classList.remove('rc-step-delivery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============================================================
  // DELIVERY & PAYMENT
  // ============================================================

  function renderAddresses() {
    addressListEl.innerHTML = '';
    addresses.forEach(addr => {
      const btn = document.createElement('button');
      btn.className = 'rc-select-card' + (selectedAddressId === addr.id ? ' rc-selected' : '');
      btn.dataset.id = addr.id;
      btn.innerHTML = `<strong>${addr.label}</strong> — ${addr.text}`;
      btn.addEventListener('click', () => {
        selectedAddressId = addr.id;
        renderAddresses();
        updatePayButtonState();
      });
      addressListEl.appendChild(btn);
    });
  }

  addAddressBtn.addEventListener('click', () => {
    addAddressForm.style.display = addAddressForm.style.display === 'none' ? 'flex' : 'none';
  });

  saveAddressBtn.addEventListener('click', () => {
    const label = newAddrLabel.value.trim();
    const text = newAddrText.value.trim();
    if (!label || !text) return;
    const id = 'addr-' + Date.now();
    addresses.push({ id, label, text });
    selectedAddressId = id;
    newAddrLabel.value = '';
    newAddrText.value = '';
    addAddressForm.style.display = 'none';
    renderAddresses();
    updatePayButtonState();
  });

  function renderPaymentMethods() {
    paymentListEl.innerHTML = '';
    paymentMethods.forEach(pm => {
      const btn = document.createElement('button');
      btn.className = 'rc-select-card' + (selectedPaymentId === pm.id ? ' rc-selected' : '');
      btn.textContent = pm.label;
      btn.addEventListener('click', () => {
        selectedPaymentId = pm.id;
        renderPaymentMethods();
        updatePayButtonState();
      });
      paymentListEl.appendChild(btn);
    });
  }

  function updatePayButtonState() {
    const ready = selectedAddressId && selectedPaymentId;
    payBtn.disabled = !ready;
    payBtn.textContent = ready ? 'Proceed to Pay' : 'Select address & payment';
  }

  function computeTotal() {
    const cart = getCart();
    let total = 0;
    cart.forEach(item => {
      let itemPrice = item.price;
      const custom = item.customizations || {};
      Object.values(custom).forEach(c => { itemPrice += (c.extra || 0); });
      total += itemPrice * item.qty;
    });
    return total;
  }

  function updateTotal() {
    totalOut.textContent = `Rs ${computeTotal()}`;
  }

  payBtn.addEventListener('click', () => {
    if (payBtn.disabled) return;
    confirmOverlay.style.display = 'flex';
    setTimeout(() => {
      rcClearCart();
      window.location.href = 'bowls.html';
    }, 2800);
  });

  // ============================================================
  // INIT
  // ============================================================

  renderSummaryList();
  renderAddresses();
  renderPaymentMethods();
  updateTotal();
  updatePayButtonState();
})();