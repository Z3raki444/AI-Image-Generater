// ===== UI =====
const themeToggle  = document.querySelector('.theme-toggle');
const promptBtn    = document.querySelector('.prompt-btn');
const promptInput  = document.querySelector('.prompt-input');
const form         = document.querySelector('.prompt-form');
const galleryGrid  = document.querySelector('.gallery-grid');

const modelSelect  = document.getElementById('modelSelect');
const countSelect  = document.getElementById('countSelect');
const ratioSelect  = document.getElementById('ratioSelect');
const hordeKeyEl   = document.getElementById('hordeKey');

// ===== Stable Horde config =====
const HORDE_BASE = "https://stablehorde.net/api/v2";
const ANON_KEY   = "0000000000";
const CLIENT_AGENT = "SumathyR-AIImageGen:1.0:email@example.com";

// --- Free-tier safe limits ---
const SAFE_MAX_SIDE = 704;        // keep both W/H <= 704 to avoid upfront kudos
const DEFAULT_STEPS = 28;         // keep <= 50 (avoid special samplers that halve limit)
const DEFAULT_CFG   = 7;
const SAMPLER       = "k_euler_a"; // avoids the stricter halving (don’t use k_heun/dpmpp_sde/dpm_2*)

// Optional negative prompt
const NEGATIVE_PROMPT = "blurry, low quality, artifacts, watermark, extra fingers, text";

// Surprise prompts
const examplePrompts = [
  "A magic forest with glowing plants and fairy homes among giant mushrooms",
  "An old steampunk airship floating through golden clouds at sunset",
  "A futuristic Mars colony with glass domes and gardens",
  "A dragon sleeping on gold coins in a crystal cave",
  "A cyberpunk city with neon signs and flying cars at night",
  "A peaceful bamboo forest with a hidden ancient temple"
];

// ===== Theme init/toggle =====
(() => {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDarkTheme = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
  document.body.classList.toggle('dark-theme', isDarkTheme);
  const icon = themeToggle.querySelector('i');
  if (icon) icon.className = isDarkTheme ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
})();
themeToggle.addEventListener('click', () => {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
  const icon = themeToggle.querySelector('i');
  if (icon) icon.className = isDarkTheme ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
});

// ===== Surprise me =====
promptBtn.addEventListener('click', () => {
  const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
  promptInput.value = prompt;
  promptInput.focus();
});

// ===== Helpers =====
// Map aspect ratio to a base size then scale to fit SAFE_MAX_SIDE on longest edge.
function ratioToSize(r) {
  let w = 768, h = 768; // initial targets (will be scaled down)
  if (r === '16/9') { w = 1280; h = 720; }
  if (r === '9/16')  { w = 720;  h = 1280; }
  // scale down so max side <= SAFE_MAX_SIDE
  const scale = Math.min(1, SAFE_MAX_SIDE / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  return { width: w, height: h };
}

function createLoadingCard() {
  const card = document.createElement('div');
  card.className = 'img-card loading';
  card.setAttribute('aria-busy', 'true');
  card.setAttribute('aria-live', 'polite');

  const status = document.createElement('div');
  status.className = 'status-container';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-label', 'Generating image');

  const spinner = document.createElement('div'); spinner.className = 'spinner';
  const warnIcon = document.createElement('i'); warnIcon.className = 'fa-solid fa-triangle-exclamation';
  const text = document.createElement('p'); text.className = 'status-text'; text.textContent = 'Generating...';

  status.append(spinner, warnIcon, text);
  card.appendChild(status);

  const img = document.createElement('img'); img.className = 'result-img'; img.alt = 'Generated result';
  const overlay = document.createElement('div'); overlay.className = 'img-overlay';
  const dl = document.createElement('button'); dl.className = 'img-download-btn'; dl.type = 'button';
  dl.setAttribute('aria-label', 'Download image');
  dl.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i>';

  overlay.appendChild(dl);
  card.append(img, overlay);
  return card;
}

function setCardImage(card, dataUrl) {
  const img = card.querySelector('.result-img');
  img.src = dataUrl;
  const btn = card.querySelector('.img-download-btn');
  btn.onclick = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `gen_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click(); a.remove();
  };
  card.classList.remove('loading', 'error');
  card.removeAttribute('aria-busy');
}

function setCardError(card, message = 'Generation failed') {
  card.classList.remove('loading');
  card.classList.add('error');
  const txt = card.querySelector('.status-text');
  if (txt) txt.textContent = message;
}

// ===== Stable Horde client =====
async function hordeSubmit({ prompt, model, width, height, steps = DEFAULT_STEPS }) {
  const key = (hordeKeyEl.value || ANON_KEY).trim();

  const payload = {
    prompt,
    nsfw: false,
    params: {
      n: 1,                   // one image per request; we loop for count
      width, height,          // <= 704 ensured above
      steps,                  // <= 50, default 28
      cfg_scale: DEFAULT_CFG,
      sampler_name: SAMPLER,  // avoids stricter halving rules
      // negative_prompt: NEGATIVE_PROMPT, // Uncomment if you want to send it
      models: [model],
      // karras: true,         // optional
    }
  };

  const res = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Client-Agent': CLIENT_AGENT
    },
    body: JSON.stringify(payload)
  });

  // Horde returns 202 on accepted; 403 for KudosUpfront
  if (res.status === 403) {
    const msg = await res.text();
    throw new Error(`KudosUpfront:${msg}`);
  }
  if (res.status !== 202) {
    throw new Error(`Submit failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.id;
}

async function hordeWaitForResult(jobId, { timeoutMs = 180000, intervalMs = 4000 } = {}) {
  const key = (hordeKeyEl.value || ANON_KEY).trim();
  const start = Date.now();

  while (true) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for generation.');
    const res = await fetch(`${HORDE_BASE}/generate/status/${jobId}`, {
      headers: { 'apikey': key, 'Client-Agent': CLIENT_AGENT }
    });
    if (!res.ok) throw new Error(`Status error (${res.status}): ${await res.text()}`);
    const status = await res.json();
    if (status.done) return status.generations || [];
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// ===== Submit handler with auto-retry on KudosUpfront =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  const model  = modelSelect.value;
  const count  = parseInt(countSelect.value, 10);
  const ratio  = ratioSelect.value;
  if (!prompt || !model || !count || !ratio) return;

  // Always compute a safe size
  const { width, height } = ratioToSize(ratio);

  // Reset grid, add loading cards
  galleryGrid.innerHTML = '';
  const cards = Array.from({ length: count }, () => {
    const c = createLoadingCard();
    galleryGrid.appendChild(c);
    return c;
  });

  // Generate sequentially (nicer to the free queue)
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    try {
      let steps = DEFAULT_STEPS;

      // 1) Try normal safe request
      let jobId;
      try {
        jobId = await hordeSubmit({ prompt, model, width, height, steps });
      } catch (err) {
        // 2) If upfront kudos requested, auto-retry cheaper: smaller side & fewer steps
        if (String(err.message).startsWith('KudosUpfront:')) {
          const cheapW = Math.min(width, 640);
          const cheapH = Math.min(height, 640);
          steps = Math.min(steps, 20);
          jobId = await hordeSubmit({ prompt, model, width: cheapW, height: cheapH, steps });
        } else {
          throw err;
        }
      }

      const results = await hordeWaitForResult(jobId);
      if (!results.length) {
        setCardError(card, 'No image returned.');
        continue;
      }

      const first = results[0];
      let dataUrl;
      if (first.img?.startsWith('http')) {
        dataUrl = first.img; // hosted url
      } else {
        const mime = first.mime_type || 'image/png';
        dataUrl = `data:${mime};base64,${first.img}`;
      }
      setCardImage(card, dataUrl);

    } catch (err) {
      console.error(err);
      const msg = /KudosUpfront/.test(err?.message)
        ? 'Needs more kudos at this size/steps. Reduced size & steps and retried, but failed.'
        : (err?.message || 'Generation failed');
      setCardError(card, msg);
    }
  }
});
