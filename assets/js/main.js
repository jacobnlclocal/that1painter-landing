/* That 1 Painter Knoxville - shared JS */

(function () {
  'use strict';

  // ---- GCLID capture: read ?gclid from URL on landing and persist for 90 days.
  // Lets us pass the click ID back with the lead so Google Ads can match conversions
  // to the exact keyword/search term.
  function captureGclid() {
    try {
      var params = new URLSearchParams(window.location.search);
      var gclid = params.get('gclid');
      if (gclid) {
        var ttl = 90 * 24 * 60 * 60 * 1000;
        var expires = new Date(Date.now() + ttl).toUTCString();
        document.cookie = '_gclid=' + encodeURIComponent(gclid) + '; expires=' + expires + '; path=/; SameSite=Lax';
      }
    } catch (e) { /* no-op */ }
  }
  function getGclid() {
    var match = document.cookie.match(/(?:^|;\s*)_gclid=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  var FORMSPREE_ENDPOINT = 'https://formspree.io/f/xlgzkqqw';

  // ---- Send a lead to Formspree. Fire-and-forget with keepalive so the request
  // survives the subsequent HCP modal open or thank-you page navigation.
  function postLeadToFormspree(payload) {
    try {
      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(function () { /* silent - we don't block UX on this */ });
    } catch (e) { /* silent */ }
  }

  // ---- Lead form: capture name + phone, POST to Formspree, then open HCP booking modal
  // pre-filled if available, else redirect to /thank-you.
  function attachLeadForms() {
    var forms = document.querySelectorAll('form[data-lead-form]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameEl = form.querySelector('[name="name"]');
        var phoneEl = form.querySelector('[name="phone"]');
        var name = nameEl ? nameEl.value.trim() : '';
        var phone = phoneEl ? phoneEl.value.trim() : '';
        if (!name || !phone) {
          if (!name && nameEl) nameEl.focus();
          else if (phoneEl) phoneEl.focus();
          return;
        }

        var phoneDigits = phone.replace(/\D/g, '');
        var phoneE164 = phoneDigits.length === 10 ? '+1' + phoneDigits : (phoneDigits.length === 11 ? '+' + phoneDigits : phone);
        var firstName = name.split(' ')[0] || name;
        var lastName = name.split(' ').slice(1).join(' ') || '';
        var source = form.dataset.formLocation || 'hero';
        var gclid = getGclid();

        // Build payload from every field on the form, plus useful meta. The free-estimate page
        // form has extras (email, service, area, notes) that get included automatically.
        var payload = {};
        var fd = new FormData(form);
        fd.forEach(function (value, key) { payload[key] = value; });
        payload._source = source;
        payload._page = window.location.pathname;
        payload._referrer = document.referrer || '';
        payload._gclid = gclid;
        payload._phone_e164 = phoneE164;
        payload._submitted_at = new Date().toISOString();

        // 1) POST to Formspree (lead source of truth - every submit gets logged here)
        postLeadToFormspree(payload);

        // 2) Enhanced Conversions for Leads - pass user data so phone-based bookings match
        // back to the Google Ads click. Google handles hashing automatically.
        if (window.gtag) {
          window.gtag('set', 'user_data', {
            phone_number: phoneE164,
            address: { first_name: firstName, last_name: lastName }
          });
          window.gtag('event', 'generate_lead', {
            event_category: 'lead_form',
            event_label: source,
            value: 1,
            currency: 'USD'
          });
        }

        // 3) Try Housecall Pro booking widget - opens prefilled modal if available.
        if (window.HCPWidget && typeof window.HCPWidget.openModal === 'function') {
          try {
            window.HCPWidget.openModal({
              customer: {
                first_name: firstName,
                last_name: lastName,
                mobile_number: phone
              }
            });
            form.reset();
            return;
          } catch (err) {
            // fall through to thank-you redirect
          }
        }

        // 4) Fallback: redirect to thank-you with lead params
        var params = new URLSearchParams({ name: name, phone: phone, src: source });
        if (gclid) params.set('gclid', gclid);
        window.location.href = '/thank-you.html?' + params.toString();
      });
    });
  }

  // ---- Auto-format phone input to (XXX) XXX-XXXX
  function attachPhoneMask() {
    document.querySelectorAll('input[name="phone"]').forEach(function (input) {
      input.addEventListener('input', function () {
        var digits = input.value.replace(/\D/g, '').slice(0, 10);
        var out;
        if (digits.length === 0) out = '';
        else if (digits.length < 4) out = '(' + digits;
        else if (digits.length < 7) out = '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
        else out = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
        input.value = out;
      });
    });
  }

  // ---- HCPWidget click bindings (any element with data-open-hcp)
  function attachHcpOpeners() {
    document.querySelectorAll('[data-open-hcp]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (window.HCPWidget && typeof window.HCPWidget.openModal === 'function') {
          e.preventDefault();
          window.HCPWidget.openModal();
        }
      });
    });
  }

  // ---- Track phone clicks
  function attachPhoneTracking() {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.gtag) {
          window.gtag('event', 'phone_click', {
            event_category: 'engagement',
            event_label: a.href.replace('tel:', '')
          });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    captureGclid();
    attachLeadForms();
    attachPhoneMask();
    attachHcpOpeners();
    attachPhoneTracking();
  });
})();
