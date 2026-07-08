// ============================================================
// CART STORE — shared across bowl-detail.html, cart.html, and
// checkout.html. Everything is kept in localStorage under the
// key "rc-cart" so it persists as the user moves between pages.
//
// Cart item shape:
// {
//   id: "category-itemIndex"  (unique per bowl)
//   category, itemIndex, name, poster, price,
//   qty: number,
//   wantsCustomize: bool   -- did they tap "Yes" when adding?
//   opened: bool           -- have they actually opened/resolved
//                             the customize panel for this item?
//   customizations: { categoryLabel: chosenValue, ... }
//   note: string
// }
// ============================================================

const RC_CART_KEY = 'rc-cart';

function rcGetCart() {
  try {
    return JSON.parse(localStorage.getItem(RC_CART_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function rcSaveCart(cart) {
  localStorage.setItem(RC_CART_KEY, JSON.stringify(cart));
}

function rcCartCount() {
  return rcGetCart().reduce((sum, item) => sum + item.qty, 0);
}

function rcAddToCart({ category, itemIndex, name, poster, price, wantsCustomize }) {
  const cart = rcGetCart();
  const id = `${category}-${itemIndex}`;
  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.qty += 1;
    // if they now say "yes" to customize on a repeat add, honor that
    if (wantsCustomize) existing.wantsCustomize = true;
  } else {
    cart.push({
      id,
      category,
      itemIndex,
      name,
      poster,
      price,
      qty: 1,
      wantsCustomize: !!wantsCustomize,
      opened: false,
      customizations: {},
      note: ''
    });
  }

  rcSaveCart(cart);
  return id;
}

function rcUpdateQty(id, qty) {
  let cart = rcGetCart();
  if (qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  } else {
    const item = cart.find(i => i.id === id);
    if (item) item.qty = qty;
  }
  rcSaveCart(cart);
}

function rcRemoveFromCart(id) {
  const cart = rcGetCart().filter(i => i.id !== id);
  rcSaveCart(cart);
}

function rcCartSubtotal() {
  return rcGetCart().reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function rcMarkOpened(id, customizations, note) {
  const cart = rcGetCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.opened = true;
    if (customizations) item.customizations = customizations;
    if (typeof note === 'string') item.note = note;
  }
  rcSaveCart(cart);
}

function rcSkipCustomize(id) {
  const cart = rcGetCart();
  const item = cart.find(i => i.id === id);
  if (item) item.opened = true; // treated as resolved either way
  rcSaveCart(cart);
}

function rcClearCart() {
  localStorage.removeItem(RC_CART_KEY);
}

// ============================================================
// SWAP CATEGORIES — generic per bowl category, reused for every
// item in that category (so we don't need unique swap data per
// bowl, just per category type).
// ============================================================

const RC_SWAP_CATEGORIES = {
  smoothies: [
    { label: 'Base', current: 'Greek yogurt', swaps: [
      { label: 'Coconut yogurt', price: 20 },
      { label: 'Oat milk', price: 15 },
      { label: 'Almond milk', price: 15 }
    ]},
    { label: 'Fruit', current: 'Seasonal mix', swaps: [
      { label: 'Mango + pineapple', price: 0 },
      { label: 'Papaya + banana', price: 0 }
    ]},
    { label: 'Nuts', current: 'Almond butter', swaps: [
      { label: 'Sunflower butter', price: 15 },
      { label: 'No nuts', price: 0 }
    ]},
    { label: 'Sugar strip', current: 'Honey drizzle', swaps: [
      { label: 'Maple syrup', price: 0 },
      { label: 'No added sugar', price: 0 }
    ]}
  ],
  'indian-rice-bowl': [
    { label: 'Base', current: 'Steamed rice', swaps: [
      { label: 'Brown rice', price: 10 },
      { label: 'Quinoa', price: 25 },
      { label: 'Mixed greens', price: 15 }
    ]},
    { label: 'Protein', current: 'Paneer', swaps: [
      { label: 'Grilled chicken', price: 40 },
      { label: 'Chickpeas', price: 0 },
      { label: 'Tofu', price: 20 }
    ]},
    { label: 'Veggies', current: 'Seasonal mix', swaps: [
      { label: 'Extra veggies', price: 20 },
      { label: 'Light on veggies', price: 0 }
    ]},
    { label: 'Sauce', current: 'House curry', swaps: [
      { label: 'Mint yogurt', price: 0 },
      { label: 'Tamarind', price: 0 },
      { label: 'No sauce', price: 0 }
    ]}
  ],
  'rice-bowl': [
    { label: 'Base', current: 'Steamed rice', swaps: [
      { label: 'Brown rice', price: 10 },
      { label: 'Quinoa', price: 25 }
    ]},
    { label: 'Protein', current: 'Chicken', swaps: [
      { label: 'Tofu', price: 0 },
      { label: 'Salmon', price: 60 },
      { label: 'Chickpeas', price: 0 }
    ]},
    { label: 'Veggies', current: 'Seasonal mix', swaps: [
      { label: 'Extra veggies', price: 20 }
    ]},
    { label: 'Sauce', current: 'House special', swaps: [
      { label: 'Spicy sriracha', price: 0 },
      { label: 'Teriyaki', price: 0 },
      { label: 'No sauce', price: 0 }
    ]}
  ],
  salads: [
    { label: 'Greens', current: 'Mixed lettuce', swaps: [
      { label: 'Spinach', price: 0 },
      { label: 'Kale', price: 10 }
    ]},
    { label: 'Protein', current: 'Feta', swaps: [
      { label: 'Grilled chicken', price: 40 },
      { label: 'Chickpeas', price: 0 },
      { label: 'No protein', price: 0 }
    ]},
    { label: 'Toppings', current: 'Seasonal mix', swaps: [
      { label: 'Extra toppings', price: 15 },
      { label: 'Light on toppings', price: 0 }
    ]},
    { label: 'Dressing', current: 'House vinaigrette', swaps: [
      { label: 'Lemon olive oil', price: 0 },
      { label: 'Tahini', price: 10 },
      { label: 'No dressing', price: 0 }
    ]}
  ],
  dumplings: [
    { label: 'Wrapper', current: 'Steamed', swaps: [
      { label: 'Pan-fried', price: 0 }
    ]},
    { label: 'Filling', current: 'Veggie', swaps: [
      { label: 'Chicken', price: 30 },
      { label: 'Paneer', price: 20 }
    ]},
    { label: 'Sauce', current: 'Soy-ginger', swaps: [
      { label: 'Chili oil', price: 0 },
      { label: 'Sweet chili', price: 0 }
    ]},
    { label: 'Spice level', current: 'Medium', swaps: [
      { label: 'Mild', price: 0 },
      { label: 'Extra spicy', price: 0 }
    ]}
  ]
};

function rcGetSwapCategories(category) {
  return RC_SWAP_CATEGORIES[category] || [];
}