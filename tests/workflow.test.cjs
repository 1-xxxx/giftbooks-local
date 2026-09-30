// Run with Node 22+ after installing jsdom: node tests/workflow.test.cjs
// Camera, catalog, microphone, clock, and recognition are controlled fixtures.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = readFileSync(path.join(__dirname, '..', 'giftbooks_local_v2.py'), 'utf8');
const html = source.split('HTML = r"""')[1].split('\n"""')[0]
  .replace('{{ roles|tojson }}', JSON.stringify(['title_page','copyright_page','front_cover','back_cover','spine','other']))
  .replace('{{ found_sound|tojson }}', '"data:audio/mpeg;base64,"')
  .replace('{{ not_found_sound|tojson }}', '"data:audio/mpeg;base64,"');

function harness({ speech = true, failFinalize = false, denySpeech = false } = {}) {
  const calls = [], errors = [], timers = new Map(), microphones = [];
  let now = 0, timerId = 0, currentRecognition;
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8502', runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window.performance, 'now', { value: () => now });
      window.setInterval = () => 0;
      window.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; };
      window.clearTimeout = id => timers.delete(id);
      window.confirm = () => true;
      window.focus = window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      Object.defineProperty(window.HTMLVideoElement.prototype, 'videoWidth', { get: () => 1920 });
      Object.defineProperty(window.HTMLVideoElement.prototype, 'videoHeight', { get: () => 1080 });
      window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
      window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,eA==';
      window.open = () => ({ closed: false, document: { title: '', body: {} }, location: { replace(url) { this.url = url; } }, focus() {}, close() { this.closed = true; } });
      Object.defineProperty(window.navigator, 'mediaDevices', { value: { getUserMedia: async options => {
        const track = { stopped: false, stop() { this.stopped = true; } };
        if (options.audio) microphones.push(track);
        return { getTracks: () => [track] };
      } } });
      class Recorder {
        static isTypeSupported() { return true; }
        constructor(stream, options) { this.mimeType = options.mimeType; this.state = 'inactive'; }
        start() { this.state = 'recording'; }
        stop() { this.state = 'inactive'; Promise.resolve().then(() => { this.ondataavailable({ data: new window.Blob(['audio fixture']) }); this.onstop(); }); }
      }
      window.MediaRecorder = Recorder;
      if (speech) window.SpeechRecognition = class {
        constructor() { currentRecognition = this; this.processLocally = false; }
        start() { Promise.resolve().then(() => denySpeech ? this.onerror({ error: 'not-allowed' }) : this.onstart()); }
        abort() { Promise.resolve().then(() => this.onend?.()); }
      };
      window.fetch = async (url, options = {}) => {
        const payload = options.body ? JSON.parse(options.body) : {};
        calls.push({ url, payload, at: now });
        if (url === '/api/warmup') return { ok: true, json: async () => ({ ready: true }) };
        if (url === '/api/check') return { ok: true, json: async () => ({ metadata: { title: 'Example', authors: ['Jane Author'] }, result: { status: 'found', message: 'Found', record: { title: 'Example', authors: ['Jane Author'], record_url: 'https://i-share-uiu.primo.exlibrisgroup.com/nde/fulldisplay?docid=test' }, search_url: 'https://i-share-uiu.primo.exlibrisgroup.com/nde/search?query=test' } }) };
        if (url === '/api/save-result') return { ok: true, json: async () => ({ scan_id: 'scan_20260930_010000_000001' }) };
        if (url === '/api/finalize-time') return { ok: !failFinalize, json: async () => failFinalize ? { error: 'Workbook open' } : {} };
        throw Error('Unexpected request: ' + url);
      };
      window.addEventListener('error', event => errors.push(event.error));
    }
  });
  const window = dom.window, $ = id => window.document.getElementById(id);
  const flush = async () => { for (let i=0; i<30; i++) await Promise.resolve(); };
  const clock = async delta => { now += delta; for (const [id, entry] of [...timers]) if (entry.at <= now) { timers.delete(id); entry.callback(); } await flush(); };
  const say = async (text, final = true) => { const result = [{ transcript: text }]; result.isFinal = final; currentRecognition.onresult({ resultIndex: 0, results: [result] }); await flush(); };
  const fast = () => { $('workflowMode').value = 'fast'; $('workflowMode').onchange(); };
  const camera = async () => { await $('startCamera').onclick(); await flush(); };
  const capture = async () => { await $('takePhoto').onclick(); await flush(); };
  return { window, $, calls, errors, microphones, flush, clock, say, fast, camera, capture, close: () => window.close() };
}

test('decision interpretation accepts explicit choices and rejects uncertain discussion', () => {
  const h = harness();
  const cases = [
    ['Let us keep this book', 'keep'], ['We should give this away', 'give away'],
    ["Do not give it away", 'keep'], ["Do not keep it; give it away", 'give away'],
    ['Keep it, but actually donate it', 'give away'], ['Should we keep it?', null],
    ['Maybe donate this one', null], ['Keep or give away', null], ['It has a blue cover', null]
  ];
  for (const [text, expected] of cases) assert.equal(h.window.inferDecision(text), expected, text);
  h.close();
});

test('fast capture checks immediately, records conversation, stops for manual review', async () => {
  const h = harness();h.fast();await h.camera();await h.$('nextBook').onclick();await h.clock(4000);await h.capture();
  assert.equal(h.calls.filter(c => c.url === '/api/check').length, 1);
  assert.equal(h.calls.find(c => c.url === '/api/check').at, 4000);
  assert.equal(h.calls.find(c => c.url === '/api/check').payload.images[0].role, 'front_cover');
  assert.match(h.$('voiceStatus').textContent, /Listening/);
  assert.equal(h.$('saveResult').disabled, true);
  await h.say('Let us keep this book');await h.clock(1000);await h.say('Actually give this away');await h.clock(2600);
  assert.equal(h.window.selectedDecision(), 'give away');
  assert.match(h.$('voiceStatus').textContent, /off/);
  assert.equal(h.microphones[0].stopped, true);
  assert.equal(h.$('saveResult').disabled, false);
  assert.equal(h.calls.some(c => c.url === '/api/save-result'), false);
  assert.equal(h.window.eval('catalogWindow'), null);
  assert.equal(h.errors.length, 0);
  h.close();
});

test('uncertain or interim speech keeps listening and never saves', async () => {
  const h = harness();h.fast();await h.camera();await h.capture();
  await h.say('Maybe keep it');await h.clock(3000);assert.equal(h.window.selectedDecision(), '');
  await h.say('Keep this');await h.clock(2000);await h.say('Actually I think', false);await h.clock(3000);
  assert.equal(h.window.selectedDecision(), '');assert.equal(h.window.eval('voiceEnabled'), true);
  assert.equal(h.calls.some(c => c.url === '/api/save-result'), false);h.close();
});

test('unsupported or denied speech leaves manual review and releases microphone', async () => {
  for (const options of [{ speech: false }, { denySpeech: true }]) {
    const h = harness(options);h.fast();await h.camera();await h.capture();
    assert.equal(h.$('saveResult').disabled, false);assert.equal(h.window.eval('decisionListening'), false);
    assert.equal(h.window.eval('workflowPhase'), 'review');assert.equal(h.microphones[0].stopped, true);
    assert.match(h.$('saveStatus').textContent, /manually/);assert.equal(h.errors.length, 0);h.close();
  }
});

test('traditional capture remains manual and supports multiple photographs', async () => {
  const h = harness();await h.camera();await h.capture();await h.capture();
  assert.equal(h.calls.some(c => c.url === '/api/check'), false);
  assert.equal(h.window.eval('images.length'), 2);
  await h.$('check').onclick();await h.flush();
  assert.equal(h.calls.find(c => c.url === '/api/check').payload.mode, 'traditional');
  assert.equal(h.microphones.length, 0);assert.equal(h.errors.length, 0);h.close();
});

test('timer finalization spans Next clicks and updates saved scan without re-saving', async () => {
  const h = harness();await h.$('nextBook').onclick();await h.clock(10000);await h.camera();await h.capture();await h.$('check').onclick();
  h.window.document.querySelector('input[value="keep"]').checked = true;
  await h.clock(5000);await h.$('saveResult').onclick();await h.clock(5000);
  await h.$('nextBook').onclick();await h.flush();
  assert.equal(h.calls.find(c => c.url === '/api/save-result').payload.elapsed_seconds, 15);
  assert.equal(h.calls.find(c => c.url === '/api/finalize-time').payload.elapsed_seconds, 20);
  assert.equal(h.window.eval('scanStartedAt'), 20000);assert.equal(h.window.eval('images.length'), 0);
  assert.match(h.$('lastBookTime').textContent, /20.0 s$/);
  assert.equal(h.calls.filter(c => c.url === '/api/save-result').length, 1);h.close();
});

test('failed timing update keeps the saved book for retry', async () => {
  const h = harness({ failFinalize: true });await h.$('nextBook').onclick();await h.camera();await h.capture();await h.$('check').onclick();
  h.window.document.querySelector('input[value="keep"]').checked = true;await h.$('saveResult').onclick();await h.clock(4000);await h.$('nextBook').onclick();
  assert.equal(h.window.eval('images.length'), 1);assert.equal(h.window.eval('resultSaved'), true);
  assert.match(h.$('saveStatus').textContent, /retry Next book/);assert.equal(h.errors.length, 0);h.close();
});

test('manual fast-mode save waits for audio and sends transcript once', async () => {
  const h = harness();h.fast();await h.camera();await h.capture();await h.say('Keep this book');await h.clock(2600);
  await h.$('saveResult').onclick();await h.flush();
  const saved = h.calls.find(c => c.url === '/api/save-result');
  assert.equal(saved.payload.decision, 'keep');
  assert.match(saved.payload.conversation.audio, /^data:audio\/webm;codecs=opus;base64,/);
  assert.equal(saved.payload.conversation.transcript[0].text, 'Keep this book');
  await h.$('saveResult').onclick();assert.equal(h.calls.filter(c => c.url === '/api/save-result').length, 1);
  assert.equal(h.errors.length, 0);h.close();
});

test('saved book cannot be recaptured or cleared by changing modes', async () => {
  const h = harness();await h.camera();await h.capture();await h.$('check').onclick();
  h.window.document.querySelector('input[value="keep"]').checked = true;await h.$('saveResult').onclick();h.fast();
  assert.equal(h.$('takePhoto').disabled, true);assert.equal(h.$('clearPhotos').disabled, true);
  await h.capture();assert.equal(h.window.eval('images.length'), 1);assert.equal(h.window.eval('resultSaved'), true);
  h.close();
});

test('fatal speech failure after startup returns to manual review', async () => {
  const h = harness();h.fast();await h.camera();await h.capture();
  h.window.eval('recognition').onerror({ error: 'audio-capture' });await h.flush();
  assert.equal(h.window.eval('catalogWindow'), null);assert.equal(h.$('saveResult').disabled, false);
  assert.equal(h.window.eval('workflowPhase'), 'review');assert.equal(h.microphones[0].stopped, true);
  assert.match(h.$('voiceStatus').textContent, /audio-capture/);h.close();
});
