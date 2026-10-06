
/* ----------------------------------------------------------------- form */
(function () {
  'use strict';
  const A = window.__TST_APP, { $, $$, CONFIG, analytics } = A;
  const form = $('[data-form]');
  if (!form) return;
  const status = $('[data-form-status]', form);
  const submit = $('[data-submit]', form);
  const HE = (document.documentElement.lang || '').toLowerCase().startsWith('he');
  const MSG = HE ? {
    required: 'שדה חובה',
    email: 'כתובת הדואר האלקטרוני אינה תקינה',
    demo: 'זהו אתר לדוגמה, ולכן הפנייה לא נשלחה. באתר האמיתי היא תגיע לתיבת הפניות של החברה.',
    ok: 'תודה, הפנייה התקבלה. נחזור אליכם בהקדם.',
    err: 'שליחת הפנייה נכשלה. אפשר לנסות שוב או לפנות אלינו ישירות בדואר אלקטרוני.'
  } : {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    demo: 'This is a sample site, so the inquiry was not sent. On the live site it will reach the company inbox.',
    ok: 'Thank you, your inquiry has been received. We will get back to you shortly.',
    err: 'Sending failed. Please try again or email us directly.'
  };

  let started = false;
  form.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    analytics.track('form_start', { form: 'contact' });
  });

  function setError(input, msg) {
    const field = input.closest('.field');
    const err = field && field.querySelector('.field__err');
    if (field) field.classList.toggle('is-invalid', !!msg);
    if (err) err.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function validate() {
    let ok = true, first = null;
    $$('input[required], textarea[required]', form).forEach((input) => {
      const v = input.value.trim();
      let msg = '';
      if (!v) msg = MSG.required;
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = MSG.email;
      setError(input, msg);
      if (msg) { ok = false; first = first || input; }
    });
    if (first) first.focus();
    return ok;
  }
  $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => {
    const f = i.closest('.field');
    if (f && f.classList.contains('is-invalid')) setError(i, '');
  }));
  function show(msg, kind) {
    status.hidden = false;
    status.textContent = msg;
    status.className = 'form__status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.hidden = true;
    /* honeypot filled → silently drop */
    if (form.elements._company && form.elements._company.value) { show(MSG.ok, 'success'); return; }
    if (!validate()) { analytics.track('form_error', { form: 'contact', reason: 'validation' }); return; }

    const data = {};
    new FormData(form).forEach((v, k) => { if (k !== '_company') data[k] = v; });
    data.page = location.href;

    if (!CONFIG.formEndpoint) {
      show(MSG.demo);
      analytics.track('generate_lead', { form: 'contact', topic: data.topic, mode: 'demo' });
      return;
    }
    submit.classList.add('is-loading'); submit.disabled = true;
    fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      show(MSG.ok, 'success');
      form.reset();
      analytics.track('generate_lead', { form: 'contact', topic: data.topic });
    }).catch(() => {
      show(MSG.err, 'error');
      analytics.track('form_error', { form: 'contact', reason: 'network' });
    }).finally(() => {
      submit.classList.remove('is-loading'); submit.disabled = false;
    });
  });
})();
