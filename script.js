const secs = [...document.querySelectorAll('section[id]')];
const links = [...document.querySelectorAll('.side-nav a')];
const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
const rand = (a, b) => a + Math.random() * (b - a);
// Every section but the last gets a node of Ranvier; the last (Contact) is the axon terminals
const nodeSecs = secs.slice(0, -1);
const TERMINALS = nodeSecs.length;

// Neuron: soma → myelinated axon with a node of Ranvier per section → axon terminals (the last section).
// The impulse hops node to node (saltatory conduction) as you move between sections. Each node
// flashes as it depolarizes and then fades (refractory period), so only the leading edge glows.
// At the bottom of the page the impulse reaches the terminals, which release vesicles.
class Neuron {
  constructor(el) {
    this.el = el;
    this.horizontal = el.classList.contains('neuron-h');
    this.side = this.horizontal ? 'left' : 'top';
    this.headEl = el.querySelector('.neuron-head');
    this.shaft = el.querySelector('.axon-shaft');
    this.soma = +el.dataset.soma;
    this.pos = -1;          // -1 = soma, 0…n-1 = nodes, n = terminals
    this.target = null;
    this.nodes = [];
    this.len = 0;
    this.pulse = document.createElement('div');
    this.pulse.className = 'pulse';
    el.appendChild(this.pulse);
  }

  build() {
    this.len = this.horizontal ? this.shaft.clientWidth : this.shaft.clientHeight;
    this.target = null;
    if (!this.len) return;  // hidden at this screen size
    const n = nodeSecs.length;
    this.pts = nodeSecs.map((_, i) => this.len * (i + 1) / (n + 1));
    const edges = [0, ...this.pts, this.len];
    this.shaft.innerHTML = '<div class="axon-line"></div><div class="axon-lit"></div>';
    this.lit = this.shaft.querySelector('.axon-lit');
    this.myelins = [];
    for (let i = 0; i < edges.length - 1; i++) {   // myelin sheaths between nodes
      const m = document.createElement('div');
      m.className = 'myelin';
      m.style[this.side] = (edges[i] + 6) + 'px';
      m.style[this.horizontal ? 'width' : 'height'] = Math.max(0, edges[i + 1] - edges[i] - 12) + 'px';
      this.shaft.appendChild(m);
      this.myelins.push(m);
    }
    this.nodes = nodeSecs.map((s, i) => {
      const a = document.createElement('a');
      a.className = 'node';
      a.href = '#' + s.id;
      a.tabIndex = -1;    // keyboard users have the sidebar nav
      const link = links.find(l => l.getAttribute('href') === '#' + s.id);
      a.dataset.label = link ? link.textContent.trim() : s.id;
      a.style[this.side] = this.pts[i] + 'px';
      this.shaft.appendChild(a);
      return a;
    });
    // En passant boutons: one small synapse off the shaft beside each node (side neuron only)
    this.passants = this.horizontal ? [] : this.pts.map(p => {
      const ep = document.createElement('div');
      ep.className = 'en-passant';
      ep.style.top = (p + 13) + 'px';
      ep.innerHTML = '<span class="ep-bulb"></span>';
      this.shaft.appendChild(ep);
      return ep;
    });
    this.place();
  }

  coord(pos) {
    const offset = p => this.horizontal ? p.offsetLeft : p.offsetTop;
    if (pos < 0) return offset(this.headEl) + this.soma;
    return offset(this.shaft) + (pos >= this.nodes.length ? this.len : this.pts[pos]);
  }

  place() {
    this.pulse.style[this.side] = this.coord(this.pos) + 'px';
    // Light the axon behind the impulse (not how real axons behave, but easy to follow)
    const reached = this.pos < 0 ? 0 : this.pos >= this.nodes.length ? this.len : this.pts[this.pos];
    this.lit.style[this.horizontal ? 'width' : 'height'] = reached + 'px';
    this.myelins.forEach((m, i) => m.classList.toggle('fired', i <= this.pos));
  }

  flash(pos) {
    const node = this.nodes[pos];
    if (!node) return;
    node.classList.remove('firing');
    void node.offsetWidth;   // restart the animation
    node.classList.add('firing');
  }

  goTo(target) {
    if (!this.len || target === this.target) return;
    this.target = target;
    clearTimeout(this.timer);
    const step = () => {
      if (this.pos === this.target) return;
      this.pos += Math.sign(this.target - this.pos);
      this.place();
      this.flash(this.pos);
      const landed = this.pos === this.target;
      const arrived = this.pos === this.nodes.length;
      // Only the bouton where the impulse comes to rest lights up and releases, so a fast
      // multi-section jump doesn't spray vesicles from every node it passes through
      this.passants.forEach((ep, i) => ep.classList.toggle('active', landed && i === this.pos));
      if (landed && this.passants[this.pos]) {
        this.release([this.passants[this.pos].firstChild], 3, () => [rand(-55, -25), rand(-12, 14)], 'small');
      }
      if (arrived && !this.el.classList.contains('arrived')) {
        // Drift toward the contact form: left on the side neuron, down on the top bar
        this.release([...this.el.querySelectorAll('.bouton')], 3,
          () => this.horizontal ? [rand(-20, 10), rand(18, 46)] : [rand(-120, -50), rand(-30, 15)]);
      }
      this.el.classList.toggle('arrived', arrived);
      if (!landed) this.timer = setTimeout(step, 130);
    };
    step();
  }

  release(sources, perSource, drift, size = '') {
    const box = this.el.getBoundingClientRect();
    sources.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      for (let k = 0; k < perSource; k++) {
        const v = document.createElement('span');
        v.className = ('vesicle ' + size).trim();
        v.style.left = (r.left + r.width / 2 - box.left) + 'px';
        v.style.top = (r.top + r.height / 2 - box.top) + 'px';
        const [dx, dy] = drift();
        v.style.setProperty('--dx', dx + 'px');
        v.style.setProperty('--dy', dy + 'px');
        v.style.animationDelay = (i * 80 + k * 180) + 'ms';
        v.addEventListener('animationend', () => v.remove());
        this.el.appendChild(v);
      }
    });
  }
}

const neurons = [...document.querySelectorAll('.neuron')].map(el => new Neuron(el));
let activeIdx = 0, started = false;

function updateNeurons() {
  if (!started) return;
  const target = atBottom() ? TERMINALS : Math.min(activeIdx, TERMINALS);
  neurons.forEach(n => n.goTo(target));
}

// Highlight the nav link for the section in view
function setActive(id) {
  activeIdx = Math.max(0, secs.findIndex(s => s.id === id));
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  updateNeurons();
}

// The active section is the last one whose top has scrolled above a line about a third of the
// way down the screen. At the very bottom of the page it's always the last section, because a
// short final section may never reach that line. This is worked out from the scroll position
// every time (not with an IntersectionObserver, which only reports a section when it enters or
// leaves the line and so missed jumps like Contact → Projects).
function currentSection() {
  if (atBottom()) return secs.length - 1;
  const line = window.innerHeight * 0.35;
  let idx = 0;
  secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) idx = i; });
  return idx;
}

let scrollQueued = false;
window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => { scrollQueued = false; setActive(secs[currentSection()].id); });
}, { passive: true });

setActive(secs[currentSection()].id);
neurons.forEach(n => n.build());
// Fire once on load: the impulse leaves the soma and travels to the current section
setTimeout(() => { started = true; updateNeurons(); }, 600);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { neurons.forEach(n => n.build()); updateNeurons(); }, 150);
});

// Contact form (Formspree)
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const btn = form.querySelector('button[type="submit"]');

function showStatus(message, state) {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btn.disabled = true;
  btn.textContent = 'Sending…';
  showStatus('', '');

  try {
    const response = await fetch('https://formspree.io/f/mwvrgpde', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      form.reset();
      showStatus('Message sent. I’ll get back to you soon.', 'ok');
    } else {
      showStatus('Your message didn’t send. Try again, or email me directly.', 'error');
    }
  } catch {
    showStatus('Couldn’t reach the server. Check your connection, or email me directly.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send message';
  }
});