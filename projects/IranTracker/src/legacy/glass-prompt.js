const STYLE_ID = 'sigint-glass-prompt-styles';

function injectStyles(bucket = []) {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .sigint-glass-prompt {
      position: fixed;
      inset: 0;
      z-index: 250;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(2, 6, 15, 0.62);
      backdrop-filter: blur(14px) saturate(1.15);
    }
    .sigint-glass-prompt__dialog {
      width: min(560px, 100%);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(180deg, rgba(11, 16, 28, 0.98), rgba(6, 11, 21, 0.96));
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(0, 212, 255, 0.06);
      overflow: hidden;
      color: var(--color-text, #f5f7fb);
    }
    .sigint-glass-prompt__hero {
      padding: 20px 22px 10px;
      background:
        radial-gradient(circle at top right, rgba(0, 212, 255, 0.18), transparent 44%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
    }
    .sigint-glass-prompt__eyebrow {
      font: 600 11px/1.4 var(--font-mono, ui-monospace, monospace);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(185, 234, 255, 0.78);
      margin-bottom: 10px;
    }
    .sigint-glass-prompt__title {
      font: 700 26px/1.08 var(--font-display, Inter, system-ui, sans-serif);
      letter-spacing: -0.03em;
      color: #f7fbff;
      margin: 0 0 8px;
    }
    .sigint-glass-prompt__message {
      font: 500 14px/1.55 var(--font-ui, Inter, system-ui, sans-serif);
      color: rgba(221, 232, 242, 0.82);
      margin: 0;
    }
    .sigint-glass-prompt__body {
      padding: 18px 22px 22px;
    }
    .sigint-glass-prompt__field {
      width: 100%;
      min-height: 54px;
      resize: vertical;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      color: #f7fbff;
      padding: 15px 16px;
      font: 500 15px/1.5 var(--font-ui, Inter, system-ui, sans-serif);
      outline: none;
      transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }
    .sigint-glass-prompt__field:focus {
      border-color: rgba(0, 212, 255, 0.42);
      background: rgba(255, 255, 255, 0.06);
      box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.18), 0 0 0 4px rgba(0, 212, 255, 0.08);
    }
    .sigint-glass-prompt__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      color: rgba(190, 202, 214, 0.72);
      font: 500 11px/1.4 var(--font-mono, ui-monospace, monospace);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .sigint-glass-prompt__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }
    .sigint-glass-prompt__btn {
      appearance: none;
      border: none;
      outline: none;
      cursor: pointer;
      border-radius: 999px;
      padding: 0 16px;
      min-height: 40px;
      font: 600 12px/1 var(--font-mono, ui-monospace, monospace);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease;
    }
    .sigint-glass-prompt__btn:hover { transform: translateY(-1px); }
    .sigint-glass-prompt__btn:active { transform: translateY(0); }
    .sigint-glass-prompt__btn--cancel {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(233, 240, 247, 0.82);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    }
    .sigint-glass-prompt__btn--confirm {
      color: #04111d;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.95), rgba(119, 227, 255, 0.96));
      box-shadow: 0 12px 32px rgba(0, 212, 255, 0.24);
    }
    @media (max-width: 720px) {
      .sigint-glass-prompt { padding: 16px; }
      .sigint-glass-prompt__dialog { border-radius: 20px; }
      .sigint-glass-prompt__title { font-size: 22px; }
      .sigint-glass-prompt__actions { flex-direction: column-reverse; }
      .sigint-glass-prompt__btn { width: 100%; }
    }
  `;
  document.head.appendChild(style);
  bucket.push(() => style.remove());
}

export function requestGlassPrompt(bucket, options = {}) {
  injectStyles(bucket);

  const {
    title = 'Confirm input',
    message = 'Provide a value to continue.',
    defaultValue = '',
    placeholder = '',
    confirmLabel = 'Save',
    cancelLabel = 'Cancel',
    eyebrow = 'Operator input',
    multiline = false,
    allowEmpty = false,
    maxLength = multiline ? 480 : 120,
  } = options;

  return new Promise((resolve) => {
    let settled = false;
    const overlay = document.createElement('div');
    overlay.className = 'sigint-glass-prompt';

    const dialog = document.createElement('div');
    dialog.className = 'sigint-glass-prompt__dialog';

    const hero = document.createElement('div');
    hero.className = 'sigint-glass-prompt__hero';

    const eyebrowNode = document.createElement('div');
    eyebrowNode.className = 'sigint-glass-prompt__eyebrow';
    eyebrowNode.textContent = eyebrow;

    const titleNode = document.createElement('h2');
    titleNode.className = 'sigint-glass-prompt__title';
    titleNode.textContent = title;

    const messageNode = document.createElement('p');
    messageNode.className = 'sigint-glass-prompt__message';
    messageNode.textContent = message;

    hero.append(eyebrowNode, titleNode, messageNode);

    const body = document.createElement('div');
    body.className = 'sigint-glass-prompt__body';

    const field = multiline ? document.createElement('textarea') : document.createElement('input');
    field.className = 'sigint-glass-prompt__field';
    if (!multiline) field.type = 'text';
    field.placeholder = placeholder;
    field.value = String(defaultValue || '');
    field.maxLength = maxLength;
    if (multiline) field.rows = 6;

    const meta = document.createElement('div');
    meta.className = 'sigint-glass-prompt__meta';
    const hint = document.createElement('span');
    hint.textContent = multiline ? 'Ctrl/Cmd + Enter to save · Esc to cancel' : 'Enter to save · Esc to cancel';
    const count = document.createElement('span');
    count.textContent = `${field.value.length}/${maxLength}`;
    meta.append(hint, count);

    const actions = document.createElement('div');
    actions.className = 'sigint-glass-prompt__actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'sigint-glass-prompt__btn sigint-glass-prompt__btn--cancel';
    cancelButton.textContent = cancelLabel;

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'sigint-glass-prompt__btn sigint-glass-prompt__btn--confirm';
    confirmButton.textContent = confirmLabel;

    actions.append(cancelButton, confirmButton);
    body.append(field, meta, actions);
    dialog.append(hero, body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const syncCount = () => {
      count.textContent = `${field.value.length}/${maxLength}`;
      confirmButton.disabled = !allowEmpty && !field.value.trim();
      confirmButton.style.opacity = confirmButton.disabled ? '0.56' : '1';
      confirmButton.style.pointerEvents = confirmButton.disabled ? 'none' : 'auto';
    };

    const close = (value) => {
      if (settled) return;
      settled = true;
      overlay.removeEventListener('click', onOverlayClick);
      cancelButton.removeEventListener('click', onCancel);
      confirmButton.removeEventListener('click', onConfirm);
      field.removeEventListener('input', syncCount);
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      resolve(value);
    };

    const onOverlayClick = (event) => {
      if (event.target === overlay) close(null);
    };
    const onCancel = () => close(null);
    const onConfirm = () => {
      const value = String(field.value || '');
      if (!allowEmpty && !value.trim()) {
        field.focus();
        return;
      }
      close(value);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(null);
        return;
      }
      if (!multiline && event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
        return;
      }
      if (multiline && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onConfirm();
      }
    };

    overlay.addEventListener('click', onOverlayClick);
    cancelButton.addEventListener('click', onCancel);
    confirmButton.addEventListener('click', onConfirm);
    field.addEventListener('input', syncCount);
    document.addEventListener('keydown', onKeyDown, true);

    bucket?.push?.(() => close(null));
    syncCount();
    window.requestAnimationFrame(() => {
      field.focus();
      field.select?.();
    });
  });
}
