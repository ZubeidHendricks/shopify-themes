/* Predictive search. Queries /search/suggest.json and renders product
   suggestions under the header search input. Debounced, no framework. */
(function () {
  var input = document.querySelector('[data-predictive-input]');
  var results = document.querySelector('[data-predictive-results]');
  if (!input || !results) return;

  var base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.predictive_search_url) || '/search/suggest';
  var timer = null;
  var controller = null;

  function clear() { results.innerHTML = ''; results.hidden = true; }

  function render(products) {
    if (!products.length) { clear(); return; }
    results.hidden = false;
    results.innerHTML =
      '<ul class="predictive__list">' +
      products.map(function (p) {
        var img = p.featured_image && p.featured_image.url
          ? '<img src="' + p.featured_image.url + '" alt="" width="40" height="40" loading="lazy">'
          : '';
        return (
          '<li class="predictive__item">' +
            '<a href="' + p.url + '">' +
              '<span class="predictive__media">' + img + '</span>' +
              '<span class="predictive__title">' + p.title + '</span>' +
            '</a>' +
          '</li>'
        );
      }).join('') +
      '</ul>';
  }

  function search(q) {
    if (controller) controller.abort();
    controller = new AbortController();
    // JSON resource API (stable shape) rather than the section render.
    fetch(base + '.json?q=' + encodeURIComponent(q) + '&resources[type]=product&resources[limit]=6', {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var products = (data.resources && data.resources.results && data.resources.results.products) || [];
        render(products);
      })
      .catch(function (err) { if (err.name !== 'AbortError') clear(); });
  }

  input.addEventListener('input', function () {
    var q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { clear(); return; }
    timer = setTimeout(function () { search(q); }, 200);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-predictive]')) clear();
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') clear(); });
})();
