/* That 1 Painter Knoxville — shared JS */

(function () {
  'use strict';

  // ---- Lead form: capture name + phone, then open HCP booking modal pre-filled if available
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

        // GA4 / gtag event (no-ops if gtag not loaded)
        if (window.gtag) {
          window.gtag('event', 'generate_lead', {
            event_category: 'lead_form',
            event_label: form.dataset.formLocation || 'hero',
            value: 1,
            lead_name: name,
            lead_phone: phone
          });
        }

        // Try Housecall Pro booking widget — opens prefilled modal if available.
        if (window.HCPWidget && typeof window.HCPWidget.openModal === 'function') {
          try {
            window.HCPWidget.openModal({
              customer: {
                first_name: name.split(' ')[0] || name,
                last_name: name.split(' ').slice(1).join(' ') || '',
                mobile_number: phone
              }
            });
            form.reset();
            return;
          } catch (err) {
            // fall through to thank-you redirect
          }
        }

        // Fallback: redirect to thank-you page with lead params (the page can ping a webhook from there)
        var params = new URLSearchParams({ name: name, phone: phone, src: form.dataset.formLocation || 'hero' });
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
    attachLeadForms();
    attachPhoneMask();
    attachHcpOpeners();
    attachPhoneTracking();
  });
})();
