// add delayed functionality here
// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../blocks/fragment/fragment.js';
import { hasConsent } from '../blocks/cookie-banner/cookie-banner.js';

async function loadCookieBanner() {
  if (hasConsent()) return;

  const fragment = await loadFragment('/content/fragments/cookie-banner');
  const block = fragment?.querySelector('.cookie-banner');
  if (!block) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'cookie-banner-wrapper';
  wrapper.append(block);
  document.body.append(wrapper);
}

loadCookieBanner();
