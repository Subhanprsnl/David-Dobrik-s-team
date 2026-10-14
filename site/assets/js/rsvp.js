/* RSVP client.
 * <meta name="rsvp-endpoint"> (filled by the build from RSVP_ENDPOINT) switches the sheet to the live form.
 * Empty endpoint = hand-off mode: the sheet links to the event on Rumor (<meta name="rumor-event-url">).
 * Live flow: POST {action:"start", ...guest} texts a code; POST {action:"verify", code, ...guest} confirms the RSVP.
 */
(function () {
  function meta(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    var v = m ? m.getAttribute('content') : '';
    return v && v.indexOf('__') === 0 ? '' : v; // unbuilt placeholder
  }
  var endpoint = meta('rsvp-endpoint');

  async function post(body) {
    try {
      var res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok) return Object.assign({ ok: true }, data);
      if (data.code === 'bad_code') return { ok: false, badCode: true, error: data.error };
      return { ok: false, error: (data.error || "We couldn't reach Rumor.") + ' Please try again.' };
    } catch (err) {
      return { ok: false, error: "We couldn't reach Rumor. Check your connection and try again." };
    }
  }

  window.RSVP = {
    live: !!endpoint,
    eventUrl: meta('rumor-event-url') || 'https://therumor.com/p/926326',
    start: function (guest) { return post(Object.assign({ action: 'start' }, guest)); },
    verify: function (guest) { return post(Object.assign({ action: 'verify' }, guest)); },
  };
})();
