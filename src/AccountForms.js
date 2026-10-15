// Email sign-in form. Phaser has no text inputs, so this is a small HTML
// overlay on top of the canvas, styled like the game's cream panels.
// Step 1: email → we send a 6-digit code (and a magic link).
// Step 2: code → signed in; CloudSync migrates/restores the save.
// Errors are shown inline and every step can be retried or cancelled.
import { cloudSync, requestEmailCode, waypointAvailable, preloadWaypoint } from './Account.js';

const STYLE = `
.ae-auth{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.6);font-family:Rowdies,system-ui,sans-serif}
.ae-auth form{background:#fff7e2;border:4px solid #1d1a16;border-radius:20px;padding:22px 24px;
  width:min(360px,calc(100vw - 32px));box-sizing:border-box;color:#1d1a16;text-align:center}
.ae-auth h2{margin:0 0 6px;font-size:22px}
.ae-auth p{margin:0 0 14px;font-size:14px;line-height:1.35;color:#5a4a2e;font-family:system-ui,sans-serif}
.ae-auth input{width:100%;box-sizing:border-box;font-size:18px;padding:10px 12px;border:3px solid #1d1a16;
  border-radius:12px;background:#fff;margin-bottom:12px;font-family:system-ui,sans-serif}
.ae-auth input.code{letter-spacing:8px;text-align:center;font-size:24px}
.ae-auth .row{display:flex;gap:10px}
.ae-auth button{flex:1;font-family:inherit;font-size:16px;padding:10px;border:3px solid #1d1a16;border-radius:12px;
  background:#ffc83d;color:#3a2600;cursor:pointer}
.ae-auth button.secondary{background:#e8dcc0;color:#1d1a16}
.ae-auth button:disabled{opacity:.55;cursor:default}
.ae-auth .err{color:#b3261e;min-height:18px;font-size:13px;margin:0 0 10px;font-family:system-ui,sans-serif}
.ae-auth .sm{width:100%;background:#1273ea;color:#fff;margin-bottom:12px}
.ae-auth .or{font-size:12px;color:#7a5c1e;margin:0 0 10px;font-family:system-ui,sans-serif}
.ae-auth .link{background:none;border:none;color:#2a6fb0;font-size:13px;margin-top:10px;padding:0;
  text-decoration:underline;font-family:system-ui,sans-serif}
`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  children.forEach((c) => node.append(c));
  return node;
}

// Resolves true when signed in, false if cancelled.
export function openEmailSignIn() {
  return new Promise((resolve) => {
    if (!document.getElementById('ae-auth-style')) {
      document.head.append(el('style', { id: 'ae-auth-style' }, STYLE));
    }
    const root = el('div', { class: 'ae-auth', role: 'dialog', 'aria-modal': 'true' });
    const done = (ok) => {
      root.remove();
      resolve(ok);
    };
    let email = '';

    const showEmailStep = (prefill = '') => {
      const input = el('input', { type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'you@example.com', required: '' });
      input.value = prefill;
      const err = el('div', { class: 'err' });
      const send = el('button', { type: 'submit' }, 'Send code');
      const form = el('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          send.disabled = true;
          err.textContent = '';
          try {
            email = await requestEmailCode(input.value);
            showCodeStep();
          } catch (ex) {
            err.textContent = ex.message;
            send.disabled = false;
          }
        },
      },
      el('h2', {}, 'Save your progress'),
      el('p', {}, 'Sign in to keep your Axies, stages and Gems safe and play on any device.'),
      ...(waypointAvailable ? [smButton(err), el('div', { class: 'or' }, '— or use your email (we send a 6-digit code) —')] : []),
      input, err,
      el('div', { class: 'row' }, el('button', { type: 'button', class: 'secondary', onclick: () => done(false) }, 'Not now'), send));
      root.replaceChildren(form);
      input.focus();
    };

    function smButton(err) {
      const b = el('button', {
        type: 'button', class: 'sm',
        onclick: async () => {
          b.disabled = true;
          err.textContent = '';
          try {
            await cloudSync.signIn({ provider: 'waypoint' });
            done(true);
          } catch (ex) {
            err.textContent = ex.message || 'Sky Mavis sign-in failed. Please try again.';
            b.disabled = false;
          }
        },
      }, 'Sign in with Sky Mavis');
      return b;
    }

    const showCodeStep = () => {
      const input = el('input', { class: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '••••••', pattern: '[0-9]*' });
      const err = el('div', { class: 'err' });
      const go = el('button', { type: 'submit' }, 'Sign in');
      const form = el('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          go.disabled = true;
          err.textContent = '';
          try {
            await cloudSync.signIn({ email, code: input.value });
            done(true);
          } catch (ex) {
            err.textContent = ex.message || cloudSync.status?.message || 'Sign-in failed. Please try again.';
            go.disabled = false;
          }
        },
      },
      el('h2', {}, 'Check your email'),
      el('p', {}, `We sent a code to ${email}. Type it below, or just tap the link in the email.`),
      input, err,
      el('div', { class: 'row' }, el('button', { type: 'button', class: 'secondary', onclick: () => done(false) }, 'Cancel'), go),
      el('button', { type: 'button', class: 'link', onclick: () => showEmailStep(email) }, 'Use a different email / resend code'));
      root.replaceChildren(form);
      input.focus();
    };

    root.addEventListener('click', (e) => { if (e.target === root) done(false); });
    document.body.append(root);
    preloadWaypoint();
    showEmailStep();
  });
}
