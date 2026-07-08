// ============================================================
// CART PAGE — standalone behavior
// Reads from the shared cart store (localStorage) and renders a
// simple list with qty +/-, remove, and subtotal. No customize
// logic here on purpose — that lives on checkout.html.
// ============================================================

(function () {
  const listEl    = document.getElementById('rcCartList');
  const emptyEl   = document.getElementById('rcCartEmpty');
  const footerEl  = document.getElementById('rcCartFooter');
  const subtotalOut = document.getElementById('rcSubtotalOut');
  const proceedBtn  = document.getElementById('rcProceedBtn');

  function render() {
    const cart = rcGetCart();

    if (cart.length === 0) {
      listEl.style.display = 'none';
      footerEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }

    listEl.style.display = 'flex';
    footerEl.style.display = 'flex';
    emptyEl.style.display = 'none';

    listEl.innerHTML = '';
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'rc-cart-item';
      row.innerHTML = `
        <img src="${item.poster}" alt="${item.name}">
        <div class="rc-ci-info">
          <h3>${item.name}</h3>
          <div class="rc-ci-price">Rs ${item.price} each</div>
          ${item.wantsCustomize ? '<span class="rc-ci-tag">Customize pending</span>' : ''}
        </div>
        <div class="rc-ci-qty">
          <button class="rc-qty-btn" data-action="dec" data-id="${item.id}">−</button>
          <span class="rc-qty-val">${item.qty}</span>
          <button class="rc-qty-btn" data-action="inc" data-id="${item.id}">+</button>
        </div>
        <button class="rc-ci-remove" data-action="remove" data-id="${item.id}" aria-label="Remove">
          <svg viewBox="0 0 24 24"><path d="M4 6h16M9 6V4h6v2m-8 0l1 14h8l1-14"/></svg>
        </button>
      `;
      listEl.appendChild(row);
    });

    subtotalOut.textContent = `Rs ${rcCartSubtotal()}`;
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const cart = rcGetCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (action === 'inc') rcUpdateQty(id, item.qty + 1);
    if (action === 'dec') rcUpdateQty(id, item.qty - 1);
    if (action === 'remove') rcRemoveFromCart(id);

    render();
  });

  render();
})();