/* AJAX cart drawer. Uses Shopify's Cart AJAX API (/cart/add.js, /cart/change.js,
   /cart.js) and rebuilds the drawer from JSON. No framework. */
(function () {
  var moneyFormat = (window.Shopify && window.Shopify.moneyFormat) || '${{amount}}';

  // Canonical Shopify money formatter (handles ${{amount}}, comma separators, etc.).
  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var value = '';
    var placeholder = /\{\{\s*(\w+)\s*\}\}/;
    var f = format || moneyFormat;

    function withDelimiters(number, precision, thousands, decimal) {
      precision = precision == null ? 2 : precision;
      thousands = thousands || ',';
      decimal = decimal || '.';
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var cents = parts[1] ? decimal + parts[1] : '';
      return dollars + cents;
    }

    switch ((f.match(placeholder) || [])[1]) {
      case 'amount': value = withDelimiters(cents, 2); break;
      case 'amount_no_decimals': value = withDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = withDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = withDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_space_separator': value = withDelimiters(cents, 2, ' ', ','); break;
      default: value = withDelimiters(cents, 2);
    }
    return f.replace(placeholder, value);
  }

  function el(id) { return document.getElementById(id); }

  function openDrawer() {
    var d = el('CartDrawer');
    if (d) { d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false'); }
  }
  function closeDrawer() {
    var d = el('CartDrawer');
    if (d) { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); }
  }

  function renderDrawer(cart) {
    var body = el('CartDrawerItems');
    var footer = el('CartDrawerFooter');
    var counts = document.querySelectorAll('[data-cart-count]');
    counts.forEach(function (c) { c.textContent = cart.item_count; });

    if (!body) return;
    if (cart.item_count === 0) {
      body.innerHTML = '<p class="cart-drawer__empty">' + (body.dataset.empty || 'Your cart is empty.') + '</p>';
      if (footer) footer.hidden = true;
      return;
    }
    if (footer) footer.hidden = false;

    body.innerHTML = cart.items.map(function (item) {
      var img = item.image
        ? '<img src="' + item.image.replace(/(\.[^.]*)$/, '_120x$1') + '" alt="" width="60" height="60">'
        : '';
      var variant = item.variant_title ? '<small>' + item.variant_title + '</small>' : '';
      return (
        '<li class="cart-drawer__item" data-key="' + item.key + '">' +
          '<div class="cart-drawer__media">' + img + '</div>' +
          '<div class="cart-drawer__details">' +
            '<a href="' + item.url + '">' + item.product_title + '</a>' + variant +
            '<div class="cart-drawer__price">' + formatMoney(item.final_line_price) + '</div>' +
          '</div>' +
          '<div class="cart-drawer__qty">' +
            '<button type="button" data-change="-1" aria-label="Decrease">&minus;</button>' +
            '<span>' + item.quantity + '</span>' +
            '<button type="button" data-change="1" aria-label="Increase">&plus;</button>' +
            '<button type="button" data-remove aria-label="Remove">&times;</button>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    var subtotal = el('CartDrawerSubtotal');
    if (subtotal) subtotal.textContent = formatMoney(cart.total_price);
  }

  function refresh() {
    return fetch(window.Shopify.routes.cart + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(renderDrawer);
  }

  function change(key, quantity) {
    return fetch(window.Shopify.routes.cart + '/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    }).then(function (r) { return r.json(); }).then(renderDrawer);
  }

  // Add to cart from any product form.
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[action$="/cart/add"], form#ProductForm');
    if (!form) return;
    e.preventDefault();
    var btn = form.querySelector('[name="add"]');
    if (btn) btn.setAttribute('disabled', 'disabled');
    fetch(window.Shopify.routes.cart + '/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (r) { return r.json(); })
      .then(function () { return refresh(); })
      .then(function () { openDrawer(); })
      .finally(function () { if (btn) btn.removeAttribute('disabled'); });
  });

  // Drawer interactions (delegated).
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-toggle]')) { e.preventDefault(); refresh().then(openDrawer); return; }
    if (e.target.closest('[data-cart-close]')) { closeDrawer(); return; }

    var item = e.target.closest('.cart-drawer__item');
    if (!item) return;
    var key = item.dataset.key;
    var qty = parseInt(item.querySelector('.cart-drawer__qty span').textContent, 10);
    if (e.target.closest('[data-remove]')) change(key, 0);
    else if (e.target.closest('[data-change="1"]')) change(key, qty + 1);
    else if (e.target.closest('[data-change="-1"]')) change(key, Math.max(qty - 1, 0));
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
})();
