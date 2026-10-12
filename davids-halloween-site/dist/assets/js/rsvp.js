/* RSVP sender shared by the three concept pages.
 * The endpoint comes from <meta name="rsvp-endpoint">, which the build fills from the RSVP_ENDPOINT env var.
 * Empty endpoint = demo mode: the form validates and confirms without sending anything.
 */
(function () {
  var meta = document.querySelector('meta[name="rsvp-endpoint"]');
  var endpoint = meta ? meta.getAttribute('content') : '';
  if (endpoint && endpoint.indexOf('__') === 0) endpoint = ''; // unbuilt placeholder

  window.sendRSVP = async function (form) {
    if (!endpoint) return true;
    if (form.dataset.busy) return false;
    var button = form.querySelector('[type="submit"]');
    var msg = form.querySelector('.send-err');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'send-err';
      msg.setAttribute('role', 'alert');
      button.insertAdjacentElement('afterend', msg);
    }
    msg.textContent = '';
    var label = button.textContent;
    form.dataset.busy = '1';
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      var data = Object.fromEntries(new FormData(form).entries());
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.name, email: data.email, phone: data.phone, instagram: data.ig,
          website: data.website || '', concept: document.body.dataset.concept || location.pathname
        })
      });
      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.error || "We couldn't send your RSVP.");
      }
      return true;
    } catch (err) {
      msg.textContent = (err && err.message ? err.message : "We couldn't send your RSVP.") + ' Please try again.';
      return false;
    } finally {
      delete form.dataset.busy;
      button.disabled = false;
      button.textContent = label;
    }
  };
})();
