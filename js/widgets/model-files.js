/* Interactive figures for the essay "What's in a Model File". viewer.js
   mounts them into <div data-widget="…"> placeholders; nothing here runs on
   any other page. Everything is computed in the browser: a file you inspect
   is read in slices and never leaves the machine, and a URL is read with
   HTTP range requests, so only the header crosses the network. */
(function () {
  'use strict';

  var TL = window.TL || (window.TL = {});
  var W = TL.widgets || (TL.widgets = {});

  /* ------------------------------------------------------------ helpers */

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function num(n, d) {
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d });
  }
  function bytes(n) {
    if (n == null || !isFinite(n)) return '—';
    var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return num(n, n < 10 && i ? 2 : 1) + ' ' + u[i];
  }
  function params(n) {
    if (n >= 1e12) return num(n / 1e12, 2) + 'T';
    if (n >= 1e9) return num(n / 1e9, 2) + 'B';
    if (n >= 1e6) return num(n / 1e6, 1) + 'M';
    return num(n, 0);
  }
  function prod(a) { return a.reduce(function (x, y) { return x * y; }, 1); }

  function chips(options, current, onPick, label) {
    var box = h('div', { class: 'chips', role: 'group', 'aria-label': label || null });
    options.forEach(function (o) {
      var id = typeof o === 'string' ? o : o[0], text = typeof o === 'string' ? o : o[1];
      box.appendChild(h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(id === current),
        onclick: function () {
          box.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          this.setAttribute('aria-pressed', 'true');
          onPick(id);
        }
      }, [text]));
    });
    return box;
  }
  function field(label, control, grow) {
    return h('label', { class: 'pg-field' + (grow ? ' pg-field--grow' : '') }, [h('span', { class: 'pg-lab' }, [label]), control]);
  }
  function stat(label, value, hi) {
    return h('div', { class: 'pg-stat' + (hi ? ' pg-stat--hi' : '') }, [h('span', { class: 'pg-lab' }, [label]), h('b', null, [value])]);
  }
  function stats(list) {
    return h('div', { class: 'pg-stats' }, list.map(function (s) { return stat(s[0], s[1], s[2]); }));
  }
  function table(head, rows) {
    return h('div', { class: 'table-wrap' }, [h('table', null, [
      h('thead', null, [h('tr', null, head.map(function (c) { return h('th', null, [c]); }))]),
      h('tbody', null, rows.map(function (r) {
        return h('tr', null, r.map(function (c) { return h('td', null, [c]); }));
      }))
    ])]);
  }
  /* Horizontal share bars in the essay's own .fig-row vocabulary. */
  function bars(items) {
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1e-12]));
    return h('div', { class: 'pg-hist' }, items.map(function (i) {
      return h('div', { class: 'fig-row fig-row--bar' }, [
        h('span', { class: 'fig-name' + (i.hi ? ' fig-name--hi' : '') }, [i.name]),
        h('span', { class: 'fig-track' }, [h('i', { class: 'fig-bar', style: 'width:' + (100 * i.value / max).toFixed(2) + '%' })]),
        h('span', { class: 'fig-val' }, [i.label])
      ]);
    }));
  }
  function code(t) { return h('code', null, [t]); }

  /* ========================================================= QUANTIZER */

  function f16(x) {
    if (x === 0 || !isFinite(x)) return x;
    var a = Math.abs(x), e = Math.floor(Math.log2(a));
    var step = e < -14 ? Math.pow(2, -24) : Math.pow(2, e - 10);
    return Math.sign(x) * Math.round(a / step) * step;
  }
  /* FP8 E4M3 as the OCP spec defines it: bias 7, 3 mantissa bits, max 448. */
  function e4m3(x) {
    var a = Math.abs(x); if (a === 0) return 0;
    var e = Math.max(Math.floor(Math.log2(a)), -6);
    var step = Math.pow(2, e - 3);
    return Math.sign(x) * Math.min(Math.round(a / step) * step, 448);
  }
  var FP4 = [0, 0.5, 1, 1.5, 2, 3, 4, 6];
  function e2m1(x) {
    var a = Math.abs(x), best = 0, bd = Infinity;
    FP4.forEach(function (v) { var d = Math.abs(a - v); if (d < bd) { bd = d; best = v; } });
    return (x < 0 ? -1 : 1) * best;
  }
  function amaxOf(xs) { return xs.reduce(function (m, x) { return Math.max(m, Math.abs(x)); }, 0); }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function fp4Levels(s) {
    var l = [];
    FP4.forEach(function (v) { l.push(v * s); if (v) l.push(-v * s); });
    return l;
  }

  /* Each scheme quantizes 32 weights and reports what it stored. The maths
     follows ggml's reference quantizers (Q8_0, Q4_0, Q4_1) and the OCP MX
     and NVIDIA NVFP4 definitions; only the per-tensor NVFP4 scale is
     simplified to this one block. */
  var SCHEMES = {
    Q8_0: {
      bpw: 8.5, layout: [['d · fp16', 2, 1], ['32 × int8', 32]],
      run: function (xs) {
        var d = f16(amaxOf(xs) / 127), id = d ? 1 / d : 0;
        var q = xs.map(function (x) { return Math.round(x * id); });
        return { codes: q, recon: q.map(function (c) { return c * d; }), blocks: [[0, 32, null]], scales: 'd = ' + d.toPrecision(4) };
      }
    },
    Q4_0: {
      bpw: 4.5, layout: [['d · fp16', 2, 1], ['32 × 4-bit', 16]],
      run: function (xs) {
        var max = 0;
        xs.forEach(function (x) { if (Math.abs(x) > Math.abs(max)) max = x; });
        var d = f16(max / -8), id = d ? 1 / d : 0;
        var q = xs.map(function (x) { return Math.max(0, Math.min(15, Math.floor(x * id + 8.5))); });
        return {
          codes: q, recon: q.map(function (c) { return (c - 8) * d; }),
          blocks: [[0, 32, range(16).map(function (k) { return (k - 8) * d; })]],
          scales: 'd = ' + d.toPrecision(4) + '  (the largest weight maps to −8)'
        };
      }
    },
    Q4_1: {
      bpw: 5, layout: [['d · fp16', 2, 1], ['m · fp16', 2, 1], ['32 × 4-bit', 16]],
      run: function (xs) {
        var mn = Math.min.apply(null, xs), mx = Math.max.apply(null, xs);
        var d = f16((mx - mn) / 15), m = f16(mn), id = d ? 1 / d : 0;
        var q = xs.map(function (x) { return Math.max(0, Math.min(15, Math.floor((x - m) * id + 0.5))); });
        return {
          codes: q, recon: q.map(function (c) { return c * d + m; }),
          blocks: [[0, 32, range(16).map(function (k) { return k * d + m; })]],
          scales: 'd = ' + d.toPrecision(4) + ',  m = ' + m.toPrecision(4)
        };
      }
    },
    MXFP4: {
      bpw: 4.25, layout: [['scale · E8M0', 1, 1], ['32 × FP4 E2M1', 16]],
      run: function (xs) {
        var a = amaxOf(xs), e = a ? Math.floor(Math.log2(a)) - 2 : 0, s = Math.pow(2, e);
        var q = xs.map(function (x) { return e2m1(x / s); });
        return {
          codes: q, recon: q.map(function (c) { return c * s; }),
          blocks: [[0, 32, fp4Levels(s)]], scales: 'scale = 2^' + e + '  (a power of two; values above 6 × scale clip)'
        };
      }
    },
    NVFP4: {
      bpw: 4.5, layout: [['scale · E4M3', 1, 1], ['16 × FP4', 8], ['scale · E4M3', 1, 1], ['16 × FP4', 8]],
      run: function (xs) {
        var g = amaxOf(xs) / (6 * 448) || 1, codes = [], recon = [], blocks = [], sc = [];
        [0, 16].forEach(function (b) {
          var part = xs.slice(b, b + 16), s = e4m3(amaxOf(part) / 6 / g) * g;
          part.forEach(function (x) { var c = s ? e2m1(x / s) : 0; codes.push(c); recon.push(c * s); });
          blocks.push([b, b + 16, fp4Levels(s)]);
          sc.push(s.toPrecision(3));
        });
        return { codes: codes, recon: recon, blocks: blocks, scales: 'block scales = ' + sc.join(', ') + '  (FP8, one per 16)' };
      }
    }
  };
  var SCHEME_ORDER = ['Q8_0', 'Q4_1', 'Q4_0', 'NVFP4', 'MXFP4'];

  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function gaussians(n, rnd) {
    var out = [];
    while (out.length < n) {
      var u = rnd() || 1e-9, v = rnd();
      var r = Math.sqrt(-2 * Math.log(u));
      out.push(r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v));
    }
    return out.slice(0, n).map(function (x) { return +(x * 0.02).toFixed(5); });
  }
  function errorStats(xs, recon, skip) {
    var se = 0, n = 0, worst = 0, zeros = 0, rms = 0;
    xs.forEach(function (x, i) {
      if (i === skip) return;
      var e = recon[i] - x;
      se += e * e; rms += x * x; n++;
      worst = Math.max(worst, Math.abs(e));
      if (recon[i] === 0 && x !== 0) zeros++;
    });
    return { rel: Math.sqrt(se / n) / Math.sqrt(rms / n), worst: worst, zeros: zeros, n: n };
  }

  W.quantizer = function (root) {
    var state = { scheme: root.getAttribute('data-scheme') || 'Q4_0', seed: 7, outlier: root.hasAttribute('data-outlier') };
    var OUT = 11;
    clear(root).classList.add('pg');

    var controls = h('div', { class: 'pg-row' }, [
      field('Scheme', chips(SCHEME_ORDER, state.scheme, function (s) { state.scheme = s; draw(); }, 'Quantization scheme')),
      field('Weights', h('div', { class: 'chips' }, [
        h('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.outlier), onclick: function () {
          state.outlier = !state.outlier; this.setAttribute('aria-pressed', String(state.outlier)); draw();
        } }, ['One outlier']),
        h('button', { type: 'button', class: 'pg-btn', onclick: function () { state.seed++; draw(); } }, ['New weights'])
      ]))
    ]);
    var chart = h('div', { class: 'pg-q', role: 'img' });
    var layout = h('div', { class: 'pg-bytes' });
    var codesLine = h('p', { class: 'pg-mono pg-note' });
    var statBox = h('div');
    var compare = h('div');
    root.appendChild(controls);
    root.appendChild(chart);
    root.appendChild(h('div', { class: 'fig-key' }, [
      h('span', null, [h('i', { class: 'fig-m fig-m--cx' }), 'the weight as trained (bar)']),
      h('span', null, [h('i', { class: 'fig-m fig-m--pi' }), 'what the file stores (square)']),
      h('span', null, ['dashed lines: every value this block can represent'])
    ]));
    root.appendChild(h('div', null, [h('span', { class: 'pg-lab' }, ['Bytes on disk for these 32 weights']), layout]));
    root.appendChild(codesLine);
    root.appendChild(statBox);
    root.appendChild(compare);

    function draw() {
      var xs = gaussians(32, lcg(state.seed));
      if (state.outlier) xs[OUT] = 0.2 * (xs[OUT] < 0 ? -1 : 1);
      var skip = state.outlier ? OUT : -1;
      var sc = SCHEMES[state.scheme], res = sc.run(xs);
      var ymax = 1.25 * Math.max.apply(null, xs.map(function (x, i) { return i === skip ? 0 : Math.abs(x); }));
      var y = function (v) { return Math.max(0, Math.min(100, 50 - 50 * v / ymax)); };
      var col = 100 / 32;

      clear(chart).setAttribute('aria-label', state.scheme + ' quantization of 32 weights');
      chart.appendChild(h('span', { class: 'pg-q-zero' }));
      res.blocks.forEach(function (b) {
        if (b[0] > 0) chart.appendChild(h('span', { class: 'pg-q-blk', style: 'left:' + (b[0] * col) + '%' }));
        (b[2] || []).forEach(function (l) {
          if (Math.abs(l) > ymax) return;
          chart.appendChild(h('span', { class: 'pg-q-lvl', style: 'left:' + (b[0] * col) + '%;width:' + ((b[1] - b[0]) * col) + '%;top:' + y(l).toFixed(2) + '%' }));
        });
      });
      xs.forEach(function (x, i) {
        var top = Math.min(y(x), 50), hgt = Math.abs(y(x) - 50);
        chart.appendChild(h('span', { class: 'pg-q-bar', style: 'left:' + (i * col + col * 0.2).toFixed(3) + '%;width:' + (col * 0.6).toFixed(3) + '%;top:' + top.toFixed(2) + '%;height:' + Math.max(hgt, 0.5).toFixed(2) + '%' }));
        chart.appendChild(h('span', { class: 'pg-q-pt', style: 'left:' + ((i + 0.5) * col).toFixed(3) + '%;top:' + y(res.recon[i]).toFixed(2) + '%' }));
        if (Math.abs(x) > ymax) chart.appendChild(h('i', { class: 'pg-q-clip', style: 'left:' + ((i + 0.5) * col).toFixed(3) + '%;' + (x > 0 ? 'top:2px' : 'top:auto;bottom:2px') }, [(x > 0 ? '▲ ' : '▼ ') + x.toFixed(2)]));
      });

      var total = sc.layout.reduce(function (s, l) { return s + l[1]; }, 0);
      clear(layout);
      sc.layout.forEach(function (l) {
        layout.appendChild(h('span', { class: 'pg-byte' + (l[2] ? ' pg-byte--scale' : ''), style: 'flex:' + l[1] + ' 1 0', title: l[0] + ' — ' + l[1] + ' B' }, [l[0] + ' · ' + l[1] + ' B']));
      });

      codesLine.textContent = 'stored: ' + res.scales + '\ncodes: ' + res.codes.map(function (c) { return String(c); }).join(' ');
      codesLine.style.whiteSpace = 'pre-wrap';

      var st = errorStats(xs, res.recon, skip);
      clear(statBox).appendChild(stats([
        ['Bits per weight', num(sc.bpw, 2) + '  (' + total + ' B / 32)', true],
        ['RMS error', num(100 * st.rel, 1) + '% of a typical weight'],
        ['Worst error', st.worst.toPrecision(2)],
        ['Rounded to zero', st.zeros + ' of ' + st.n]
      ]));

      clear(compare).appendChild(table(['Scheme', 'Bits / weight', 'RMS error', 'Rounded to zero'],
        SCHEME_ORDER.map(function (k) {
          var r = SCHEMES[k].run(xs), s = errorStats(xs, r.recon, skip);
          var name = k === state.scheme ? h('b', null, [k]) : k;
          return [name, num(SCHEMES[k].bpw, 2), num(100 * s.rel, 1) + '%', String(s.zeros)];
        })));
    }
    draw();
  };

  /* ====================================================== NAME DECODER */

  var ORGS = {
    'bartowski': 'An individual quantizer who publishes GGUF files of popular models, usually within hours of a release, with an importance matrix for every size.',
    'unsloth': 'The Unsloth fine-tuning project. Publishes GGUFs (including its "UD" dynamic mixes) and pre-quantized bitsandbytes checkpoints.',
    'mradermacher': 'A quantizer who publishes static and imatrix ("i1") GGUFs for a very large number of models, including obscure fine-tunes.',
    'thebloke': 'Tom Jobbins, the quantizer who defined the genre in 2023 with GGML, GGUF, GPTQ and AWQ versions of thousands of models.',
    'lmstudio-community': 'LM Studio’s own channel of GGUF and MLX conversions.',
    'mlx-community': 'The community organisation for Apple MLX conversions.',
    'ggml-org': 'The llama.cpp project’s own organisation: reference GGUF conversions.',
    'nvidia': 'NVIDIA: its own models (Nemotron) and FP8 / NVFP4 checkpoints of others, made with Model Optimizer.',
    'redhatai': 'Red Hat AI (formerly Neural Magic): compressed-tensors checkpoints for vLLM — FP8, INT8, W4A16, NVFP4.',
    'neuralmagic': 'Neural Magic, now Red Hat AI: compressed-tensors checkpoints for vLLM.',
    'qwen': 'Alibaba’s Qwen team — the original publisher.',
    'meta-llama': 'Meta — the original publisher.',
    'google': 'Google — the original publisher.',
    'mistralai': 'Mistral AI — the original publisher.',
    'deepseek-ai': 'DeepSeek — the original publisher.',
    'moonshotai': 'Moonshot AI (Kimi) — the original publisher.',
    'openai': 'OpenAI — the original publisher.',
    'microsoft': 'Microsoft — the original publisher.',
    'ibm-granite': 'IBM — the original publisher.',
    'allenai': 'Ai2 — publishes weights, data and training code.',
    'huggingfacetb': 'Hugging Face’s small-model team (SmolLM).',
    'zai-org': 'Z.ai (GLM) — the original publisher.',
    'openai-community': 'Hugging Face’s home for OpenAI’s early open models (GPT-2).',
    'hf.co': 'Ollama pulling a GGUF straight from Hugging Face.',
    'jackrong': 'An individual fine-tuner; the Qwopus series (Qwen fine-tuned on Claude-Opus-style reasoning traces).',
    '0xsero': 'An individual who publishes expert-pruned builds of very large MoE models.',
    'cerebras': 'Cerebras; publishes REAP expert-pruned versions of large MoE models.',
    'turboderp': 'The author of ExLlama; EXL2 and EXL3 quants, one bit width per git branch.',
    'mlc-ai': 'The MLC-LLM project: weights plus compiled kernel libraries, for phones and WebLLM.',
    'openvino': 'Intel\u2019s OpenVINO organisation: IR conversions, usually int4 or int8.',
    'onnx-community': 'ONNX conversions, mostly for transformers.js in the browser.',
    'xenova': 'ONNX conversions for transformers.js.',
    'richarderkhov': 'A bulk quantizer (tens of thousands of GGUF and bitsandbytes repos).',
    'nousresearch': 'Nous Research (the Hermes fine-tunes).',
    'huihui-ai': 'Publishes abliterated (refusal-removed) versions of popular models.'
  };

  var FAMILIES = {
    llama: 'Meta', qwen: 'Alibaba', qwq: 'Alibaba', gemma: 'Google', phi: 'Microsoft', mistral: 'Mistral AI',
    mixtral: 'Mistral AI', ministral: 'Mistral AI', devstral: 'Mistral AI', magistral: 'Mistral AI', codestral: 'Mistral AI',
    pixtral: 'Mistral AI', deepseek: 'DeepSeek', kimi: 'Moonshot AI', glm: 'Z.ai', nemotron: 'NVIDIA', olmo: 'Ai2',
    smollm: 'Hugging Face', granite: 'IBM', falcon: 'TII', minimax: 'MiniMax', hermes: 'Nous Research',
    command: 'Cohere', aya: 'Cohere', yi: '01.AI', internlm: 'Shanghai AI Lab', ernie: 'Baidu', hunyuan: 'Tencent',
    seed: 'ByteDance', lfm: 'Liquid AI', jamba: 'AI21', whisper: 'OpenAI', bge: 'BAAI', gpt: 'OpenAI', mimo: 'Xiaomi',
    llava: 'LLaVA project', flux: 'Black Forest Labs', stable: 'Stability AI', exaone: 'LG AI Research'
  };
  var BRANDS = {
    qwopus: 'Qwen + Opus: an individual\u2019s series of Qwen fine-tunes on Claude-Opus-style reasoning traces. Not from Alibaba or Anthropic.',
    hermes: 'Nous Research\u2019s fine-tune series; the base model follows in the name.',
    dolphin: 'Cognitive Computations\u2019 fine-tune series; the base model follows in the name.'
  };

  var WORDS = {
    instruct: ['tuning', 'Instruction-tuned: trained after pre-training to follow prompts in a chat format. The one most people want.'],
    it: ['tuning', 'Google’s abbreviation for instruction-tuned.'],
    chat: ['tuning', 'Tuned for conversation — the older word for what is now usually "Instruct".'],
    base: ['tuning', 'The pre-trained model before instruction tuning: it continues text rather than answering.'],
    pt: ['tuning', 'Pre-trained (base) — the counterpart of "it".'],
    thinking: ['tuning', 'A reasoning variant that writes a long chain of thought before it answers.'],
    reasoning: ['tuning', 'A reasoning variant.'],
    preview: ['tuning', 'An early release; expect a later final version.'],
    hf: ['format', 'Converted to the Hugging Face Transformers layout. Meta shipped Llama 1 and 2 in its own checkpoint format, so the "-hf" repos were the ones Transformers could load.'],
    coder: ['skill', 'Specialised for code.'], code: ['skill', 'Specialised for code.'], math: ['skill', 'Specialised for mathematics.'],
    vl: ['skill', 'Vision-language: accepts images as well as text.'], vision: ['skill', 'Accepts images.'],
    omni: ['skill', 'Accepts text, images, audio and video.'], audio: ['skill', 'Accepts or produces audio.'],
    embed: ['skill', 'An embedding model: turns text into a vector for search and retrieval instead of generating text.'],
    embedding: ['skill', 'An embedding model: turns text into a vector for search and retrieval instead of generating text.'],
    reranker: ['skill', 'Scores how well a passage answers a query — the second stage of retrieval.'],
    guard: ['skill', 'A safety classifier that labels prompts or responses.'],
    ocr: ['skill', 'Reads text from images of documents.'],
    distill: ['derivation', 'A student model trained on a larger teacher’s outputs; the name after it is usually the student’s base.'],
    abliterated: ['derivation', 'A community edit that removes the refusal direction from the weights. Not from the original publisher.'],
    uncensored: ['derivation', 'A community fine-tune with refusals trained out. Not from the original publisher.'],
    merge: ['derivation', 'Two or more fine-tunes combined in weight space.'],
    heretic: ['derivation', 'Refusal removal automated with the Heretic tool. Not from the original publisher.'],
    dwq: ['method', 'MLX \u201cDWQ\u201d quantization: the quantized weights were tuned by distillation from the full-precision model.'],
    next: ['tier', 'A product line name (Qwen3-Next is a hybrid-attention architecture), not a size.'],
    super: ['tier', 'A product tier: the publisher\u2019s own size class, not a parameter count.'],
    lightning: ['tier', 'A product tier name, not a parameter count.'],
    minitron: ['derivation', 'NVIDIA\u2019s prune-and-distill method: the model was cut down from a larger one, then retrained on its outputs.'],
    width: ['derivation', 'Pruned in width (hidden and MLP sizes), as opposed to depth.'],
    depth: ['derivation', 'Pruned in depth (whole layers removed).'],
    pruned: ['derivation', 'Parameters were removed from a larger model.'],
    asym: ['method', 'Asymmetric quantization: each group stores an offset (zero point) as well as a scale.'],
    sym: ['method', 'Symmetric quantization: each group stores only a scale.'],
    quantized: ['method', 'A quantized derivative; the scheme usually follows.'],
    meta: ['name', 'Meta’s own prefix on the Llama 3.0 and 3.1 repositories (Meta-Llama-3.1-8B); from 3.2 the repos drop it.'],
    reap: ['derivation', 'Expert pruning (Cerebras’ REAP): a Mixture-of-Experts model with its least-used experts removed, so fewer total parameters.'],
    mtp: ['structure', 'Multi-token prediction layers kept in the file; a runtime can use them to draft several tokens per step (speculative decoding).'],
    moe: ['structure', 'Mixture of Experts: only some weights are used for each token.'],
    gguf: ['container', 'GGUF: one file with weights, tokenizer and metadata, for llama.cpp, Ollama and LM Studio.'],
    mlx: ['container', 'Apple MLX: safetensors laid out for mlx-lm on Apple Silicon.'],
    onnx: ['container', 'ONNX: the whole computation graph plus weights, for ONNX Runtime.'],
    ov: ['container', 'OpenVINO IR (Intel): an .xml graph and a .bin of weights.'],
    openvino: ['container', 'OpenVINO IR (Intel): an .xml graph and a .bin of weights.'],
    safetensors: ['container', 'Safetensors: named tensors and nothing else.'],
    mlc: ['container', 'MLC-LLM weights: headerless shards plus a kernel library compiled per device.'],
    exl2: ['method', 'ExLlamaV2 format: a different bit width per layer, chosen to hit a target average. Each size lives in its own git branch.'],
    gptq: ['method', 'GPTQ: usually 4-bit weights chosen layer by layer to cancel their own rounding error on calibration data. Stored as packed integers in safetensors.'],
    awq: ['method', 'AWQ: 4-bit weights that protect the channels activations lean on hardest. Stored as packed integers in safetensors.'],
    bnb: ['method', 'bitsandbytes: 4-bit NF4 or 8-bit weights, the QLoRA format.'],
    exl3: ['method', 'ExLlamaV3 format: trellis-coded weights (after QTIP) at a chosen average bit width.'],
    hqq: ['method', 'Half-Quadratic Quantization: calibration-free low-bit weights.'],
    awq4: ['method', 'AWQ, 4-bit.'],
    dynamic: ['method', 'With FP8, "dynamic" means activation scales are computed per token at run time rather than calibrated in advance.'],
    i1: ['method', 'mradermacher’s marker for imatrix quants: calibration text steered the rounding.'],
    imatrix: ['method', 'Quantized with an importance matrix: calibration text told the quantizer which weights matter.'],
    ud: ['method', 'Unsloth Dynamic: Unsloth’s own per-tensor bit choices, usually larger than the standard mix of the same name.'],
    qat: ['method', 'Quantization-aware training: the model was trained to survive being quantized, so the small version loses less.'],
    fp32: ['precision', '32-bit float: 4 bytes per weight. Training precision.'],
    f32: ['precision', '32-bit float: 4 bytes per weight.'],
    fp16: ['precision', '16-bit float (IEEE half): 2 bytes per weight.'],
    f16: ['precision', '16-bit float: 2 bytes per weight — GGUF’s unquantized option.'],
    bf16: ['precision', 'bfloat16: 2 bytes per weight with FP32’s range. The usual release precision.'],
    fp8: ['precision', '8-bit float (E4M3), usually with a scale per tensor, channel or 128×128 block. Native on Hopper and Blackwell GPUs.'],
    nvfp4: ['precision', 'NVIDIA’s 4-bit float: E2M1 values, an FP8 scale per 16 weights and an FP32 scale per tensor — about 4.5 bits per weight. Native on Blackwell.'],
    mxfp4: ['precision', 'The OCP microscaling 4-bit float: E2M1 values with a power-of-two scale per 32 weights — 4.25 bits per weight.'],
    fp4: ['precision', 'A 4-bit float (E2M1).'],
    int8: ['precision', '8-bit integer weights.'], int4: ['precision', '4-bit integer weights.']
  };

  var TIERS = ['flash', 'mini', 'nano', 'small', 'medium', 'large', 'lite', 'air', 'pro', 'max', 'turbo', 'plus', 'ultra', 'tiny', 'micro'];

  /* Effective bits per weight used for size estimates. The K-quant mixes
     are measured on Llama 3.1 8B (bartowski's files); a smaller model with a
     large vocabulary comes out higher, because embeddings are kept at Q6_K. */
  var BPW = {
    F32: 32, FP32: 32, F16: 16, FP16: 16, BF16: 16, FP8: 8, INT8: 8, Q8_0: 8.5, Q6_K: 6.56, Q5_K_M: 5.7, Q5_K_S: 5.57,
    Q4_K_M: 4.89, Q4_K_S: 4.67, Q4_K_L: 5.29, Q4_0: 4.64, Q4_1: 5.1, IQ4_XS: 4.42, IQ4_NL: 4.66, Q3_K_L: 4.3, Q3_K_M: 4.0,
    Q3_K_S: 3.65, IQ3_M: 3.77, IQ3_XS: 3.51, Q2_K: 3.16, IQ2_M: 2.94, NVFP4: 4.5, MXFP4: 4.25, INT4: 4.15, FP4: 4.5,
    W4A16: 4.15, W8A8: 8, W8A16: 8, W4A8: 4.15, GPTQ: 4.15, AWQ: 4.15
  };

  function ggufQuant(t) {
    var m = /^(I?Q)(\d)(?:_(K|0|1|NL))?(?:_(XXS|XS|S|M|L|XL))?(?:_(\d_\d))?$/i.exec(t);
    var tq = /^TQ([12])_0$/i.exec(t);
    if (tq) return 'Ternary weights (−1, 0, +1) packed at ' + (tq[1] === '1' ? '1.69' : '2.06') + ' bits per weight, for BitNet-style models.';
    if (!m) return null;
    var iq = m[1].toUpperCase() === 'IQ', bits = m[2], kind = (m[3] || '').toUpperCase(), tier = (m[4] || '').toUpperCase();
    var parts = ['About ' + bits + ' bits per weight'];
    if (iq) parts.push('an i-quant: non-uniform levels drawn from a codebook (a lattice for the 2- and 3-bit types), made with an importance matrix');
    else if (kind === 'K') parts.push('a K-quant: 256-weight super-blocks whose sub-block scales are themselves quantized');
    else if (kind === '0') parts.push('legacy type: one FP16 scale per 32 weights');
    else if (kind === '1') parts.push('legacy type: an FP16 scale and minimum per 32 weights');
    if (kind === 'NL') parts.push('non-linear 4-bit levels in 32-weight blocks');
    if (tier) parts.push({
      XXS: 'the smallest i-quant of this width', XS: 'extra-small', S: 'small mix: the fewest tensors promoted to more bits',
      M: 'medium mix — the default: attention V and FFN-down get more bits in about half the layers',
      L: 'large mix; in bartowski’s files _L also keeps embeddings and output at Q8_0', XL: 'extra-large mix (Unsloth and others)'
    }[tier]);
    if (m[5]) parts.push('weights repacked for ARM CPU kernels (' + m[5].replace('_', '×') + ' interleave) — same numbers, different order');
    var key = (m[1] + bits + (kind ? '_' + kind : '') + (tier ? '_' + tier : '')).toUpperCase();
    if (BPW[key]) parts.push('≈' + BPW[key] + ' bits per weight on an 8B model');
    return parts.join('; ') + '.';
  }

  function sizeOf(t, seen) {
    var m;
    if ((m = /^(\d+(?:\.\d+)?)([BMT])$/i.exec(t))) {
      var mult = { B: 1e9, M: 1e6, T: 1e12 }[m[2].toUpperCase()];
      if (m[2].toUpperCase() === 'M' && seen.size) return null;
      return { n: parseFloat(m[1]) * mult };
    }
    if ((m = /^(\d+)x(\d+(?:\.\d+)?)B$/i.exec(t))) return { n: +m[1] * parseFloat(m[2]) * 1e9, experts: +m[1], each: m[2] };
    if ((m = /^E(\d+(?:\.\d+)?)B$/.exec(t))) return { n: parseFloat(m[1]) * 1e9, effective: true };
    return null;
  }

  function decodeName(raw) {
    var s = String(raw || '').trim()
      .replace(/^https?:\/\/(www\.)?huggingface\.co\//i, '')
      .replace(/\/(resolve|blob|tree)\/[^/]+\//, '/').replace(/\?.*$/, '');
    var toks = [], seen = { size: 0 }, sizes = {};
    var add = function (text, kind, note, hi) { toks.push({ text: text, kind: kind, note: note, hi: !!hi }); };

    var ollama = null;
    if (/^[^/]*:[^/]+$/.test(s) || /^hf\.co\/.+:.+$/.test(s)) {
      var ci = s.lastIndexOf(':'); ollama = s.slice(ci + 1); s = s.slice(0, ci);
    }
    var path = s.split('/').filter(Boolean);
    if (path.length > 1) {
      var org = path.shift();
      if (org === 'hf.co' && path.length > 1) { add(org, 'registry', ORGS['hf.co']); org = path.shift(); }
      add(org, 'publisher', ORGS[org.toLowerCase()] || 'The account that uploaded it. Not necessarily who trained the model — check the card’s base_model field.');
    }
    var name = path.shift() || '';
    var file = path.length ? path.pop() : null;
    var folders = path;

    var parseTokens = function (str, isFile) {
      var ext = /\.(gguf|safetensors|bin|pt|pth|onnx|tflite|pte|engine|plan|ckpt|npz|h5|keras|mlpackage|mlmodel|litertlm|task|msgpack|pkl)$/i.exec(str);
      if (ext) str = str.slice(0, ext.index);
      var pre = /^([A-Za-z0-9]+)_(.+)$/.exec(str);
      if (pre && /-/.test(pre[2]) && /[a-z]/i.test(pre[1]) && !ggufQuant(str.split('-')[0])) {
        add(pre[1] + '_', 'original author', 'bartowski\u2019s convention: the original publisher, prefixed so a quantization is not mistaken for an official release.');
        str = pre[2];
      }
      var parts = str.replace(/([^\d])\.|\.([^\d])/g, function (m0, a1, b1) { return (a1 || '') + '-' + (b1 || ''); })
        .split('-').filter(Boolean), i = 0, first = true;
      while (i < parts.length) {
        var p = parts[i], lp = p.toLowerCase(), nx = parts[i + 1] || '', nx2 = parts[i + 2] || '', m, sz;
        if (/^\d{5}$/.test(p) && nx.toLowerCase() === 'of' && /^\d{5}$/.test(nx2)) {
          add(p + '-of-' + nx2, 'shard', 'Part ' + (+p) + ' of ' + (+nx2) + ': big files are split, and loaders read all the parts from the first.'); i += 3; continue;
        }
        if (lp === 'ud' && ggufQuant(nx)) { add(p + '-' + nx, 'quant', WORDS.ud[1] + ' ' + ggufQuant(nx), true); i += 2; continue; }
        if (/^g(\d+)$/i.test(p) && toks.length && /precision|method/.test(toks[toks.length - 1].kind)) { add(p, 'group', 'One scale per ' + p.slice(1) + ' weights.'); i++; continue; }
        if (lp === 'fp8' && /^(static|block)$/i.test(nx)) { add(p + '-' + nx, 'precision', WORDS.fp8[1] + (nx.toLowerCase() === 'block' ? ' One scale per block of weights (DeepSeek style).' : ' Activation scales fixed in advance by calibration.'), true); seen.bpw = 8; i += 2; continue; }
        if (lp === 'fp8' && nx.toLowerCase() === 'dynamic') { add(p + '-' + nx, 'precision', WORDS.fp8[1] + ' ' + WORDS.dynamic[1], true); seen.bpw = 8; i += 2; continue; }
        if (lp === 'bnb' && /^\dbit$/i.test(nx)) { add(p + '-' + nx, 'method', WORDS.bnb[1], true); seen.bpw = seen.bpw || +nx[0] + 0.15; i += 2; continue; }
        if (lp === 'reap') { add(p, 'derivation', WORDS.reap[1] + ' The size that follows is the size after pruning.'); i++; continue; }
        if (lp === 'gpt' && nx.toLowerCase() === 'oss') { add(p + '-' + nx, 'family', 'OpenAI\u2019s open-weight models (2025), released with their experts already in MXFP4 \u2014 about 4.5 bits per weight overall. The sizes are rounded: 120b has 116.8B parameters, 20b has 20.9B.'); seen.bpw = seen.bpw || 4.47; seen.nativeMx = true; first = false; i += 2; continue; }
        if ((sz = sizeOf(p, seen)) && /^A\d+(\.\d+)?B$/i.test(nx)) {
          add(p + '-' + nx, 'size (MoE)', params(sz.n) + ' parameters in total, of which about ' + nx.slice(1) + ' are used for each token. Memory scales with the first number, speed with the second.', true);
          seen.size++; sizes.total = sz.n; sizes.active = parseFloat(nx.slice(1)) * 1e9; first = false; i += 2; continue;
        }
        if ((sz = sizeOf(p, seen))) {
          var note = sz.experts ? sz.experts + ' experts of about ' + sz.each + 'B each (Mixtral naming). The real total is smaller, because attention and embeddings are shared.'
            : sz.effective ? 'Effective parameters (Gemma 3n): the part that has to sit in accelerator memory; per-layer embeddings can live elsewhere.'
            : params(sz.n) + ' parameters.';
          add(p, 'size', note, true); seen.size++;
          if (!sz.experts && !sz.effective) sizes.total = sizes.total || sz.n;
          first = false; i++; continue;
        }
        if (/^A\d+(\.\d+)?B$/i.test(p)) { add(p, 'active', 'About ' + p.slice(1) + ' parameters active per token.'); i++; continue; }
        var gq = ggufQuant(p);
        if (gq) { add(p, 'quant', gq, true); seen.bpw = BPW[p.toUpperCase()] || parseFloat(p.replace(/^I?Q/i, '')) + 0.5; i++; continue; }
        if ((m = /^W(\d+)A(\d+)$/i.exec(p))) { add(p, 'precision', 'Weights in ' + m[1] + ' bits, activations in ' + m[2] + ' (compressed-tensors / vLLM naming).', true); seen.bpw = BPW[p.toUpperCase()] || +m[1]; i++; continue; }
        if ((m = /^(\d)bit$/i.exec(p))) { add(p, 'precision', m[1] + '-bit weights (MLX and bitsandbytes naming). MLX adds a scale and bias per 64 weights, about 0.5 bits more.', true); seen.bpw = +m[1] + 0.5; i++; continue; }
        if ((m = /^(\d+(?:\.\d+)?)bpw$/i.exec(p))) { add(p, 'precision', 'EXL2/EXL3 target: ' + m[1] + ' bits per weight on average.', true); seen.bpw = parseFloat(m[1]); i++; continue; }
        if ((m = /^q(\d)f(16|32)(?:_(\d))?$/i.exec(p))) { add(p, 'quant', 'MLC-LLM: ' + m[1] + '-bit weights, ' + m[2] + '-bit float activations' + (m[3] ? ', layout variant ' + m[3] : '') + '.', true); seen.bpw = +m[1] + 0.5; i++; continue; }
        if ((m = /^int(\d)$/i.exec(p))) { add(p, 'precision', m[1] + '-bit integer weights.', true); seen.bpw = BPW['INT' + m[1]] || +m[1]; i++; continue; }
        if (WORDS[lp]) {
          var w = WORDS[lp], hi = w[0] === 'precision' || w[0] === 'method' || w[0] === 'container';
          if (w[0] === 'container' && lp !== 'safetensors') seen.container = lp;
          add(p, w[0], w[1], hi);
          if (BPW[p.toUpperCase()] && !seen.bpw) seen.bpw = BPW[p.toUpperCase()];
          first = false; i++; continue;
        }
        if (TIERS.indexOf(lp) >= 0) { add(p, 'tier', 'A product tier: the publisher’s own size or speed class, not a parameter count.'); i++; continue; }
        if ((m = /^v(\d+(?:\.\d+)*)[a-z]?$/i.exec(p))) { add(p, 'version', 'Release version ' + m[1] + '.'); i++; continue; }
        if (/^\d+(\.\d+)+$/.test(p) || (/^\d+[a-z]?$/.test(p) && toks.length && /family|name|brand/.test(toks[toks.length - 1].kind))) { add(p, 'version', 'Generation ' + p + ' of the family' + (/[a-z]$/.test(p) ? ' (the letter marks a variant line, as in Gemma 3n for on-device use)' : '') + '.'); i++; continue; }
        if (/^\d{4}$/.test(p)) {
          var a = +p.slice(0, 2), b = +p.slice(2);
          var yymm = b > 12 ? false : a > 12 ? true : !/deepseek/i.test(raw);
          add(p, 'date', yymm ? 'A dated re-release: 20' + p.slice(0, 2) + '-' + p.slice(2) + ' (year-month, Qwen and Mistral style).'
            : 'A dated re-release: month ' + a + ', day ' + b + ' (DeepSeek style, MMDD). For Qwen or Mistral the same four digits would be a year and month.');
          i++; continue;
        }
        if ((m = /^(\d+)([kKmM])$/.exec(p))) { add(p, 'context', 'Context window of ' + m[1] + (m[2].toLowerCase() === 'k' ? ' thousand' : ' million') + ' tokens.'); i++; continue; }
        if (/^[A-Z]\d+(\.\d+)?$/.test(p)) { add(p, 'model line', 'A product line and generation (as in DeepSeek R1 or V3, Kimi K2, MiniMax M2).'); i++; continue; }
        var br = /^([a-z]+?)(\d+(?:\.\d+)*)?$/i.exec(p);
        if (br && BRANDS[br[1].toLowerCase()]) { add(p, first ? 'name' : 'brand', BRANDS[br[1].toLowerCase()] + (br[2] ? ' Generation ' + br[2] + ', inherited from the base.' : '')); first = false; i++; continue; }
        var fam = /^([a-z]+?)(\d+(?:\.\d+)*)?$/i.exec(p), known = null;
        if (fam) Object.keys(FAMILIES).some(function (f) { if (fam[1].toLowerCase() === f) { known = f; return true; } return false; });
        if (known) {
          add(p, 'family', FAMILIES[known] + (fam[2] ? ', generation ' + fam[2] : '') + '.'); first = false; i++; continue;
        }
        if (first) { add(p, 'name', 'The model’s own name. Not a family this decoder knows, so read the card for what it was built from.'); first = false; i++; continue; }
        add(p, '?', 'Not a convention this decoder knows: a publisher’s own label.'); i++;
      }
      if (ext) {
        var e = ext[1].toLowerCase();
        add('.' + e, 'file type', {
          gguf: 'GGUF file: weights, tokenizer and metadata in one.', safetensors: 'Safetensors: tensors only, no code.',
          bin: 'Usually a PyTorch pickle (pytorch_model.bin). Loading it can run code.', pt: 'PyTorch pickle checkpoint. Loading it can run code.',
          pth: 'PyTorch pickle checkpoint. Loading it can run code.', ckpt: 'A training checkpoint, usually a pickle; may include optimizer state.',
          onnx: 'ONNX graph + weights.', tflite: 'LiteRT (TensorFlow Lite) FlatBuffer.', pte: 'ExecuTorch program for on-device PyTorch.',
          engine: 'TensorRT engine: compiled for one GPU model and TensorRT version.', plan: 'TensorRT engine: compiled for one GPU model and TensorRT version.',
          npz: 'NumPy zip of arrays.', h5: 'HDF5, the legacy Keras format.', keras: 'Keras 3 archive (zip of config + HDF5 weights).',
          mlpackage: 'Core ML package (a directory).', mlmodel: 'Core ML model (protobuf).', litertlm: 'LiteRT-LM bundle for on-device LLMs.',
          task: 'MediaPipe task bundle.', msgpack: 'Flax weights serialized with msgpack.', pkl: 'A raw pickle. Loading it can run code.'
        }[e] || 'File extension.', true);
      }
    };

    if (name) parseTokens(name, false);
    folders.forEach(function (f) { add(f + '/', 'folder', 'A folder inside the repository; large models often keep one folder per quantization.'); });
    if (file) { add('/', 'file', 'Everything after this is one file inside the repository.'); parseTokens(file, true); }
    if (ollama) {
      add(':', 'ollama tag', 'Ollama’s model:tag syntax. The tag picks a size and quantization; with none, Ollama pulls ":latest".');
      parseTokens(ollama, false);
    }

    var est = null;
    if (sizes.total && (seen.bpw || !seen.container)) {
      var bpw = seen.bpw || 16;
      est = { gb: sizes.total * bpw / 8, bpw: bpw, assumed: !seen.bpw, active: sizes.active };
    }
    return { toks: toks, est: est };
  }

  W['name-decoder'] = function (root) {
    var examples = (root.getAttribute('data-examples') || '').split('|').filter(Boolean);
    clear(root).classList.add('pg');
    var input = h('input', { class: 'pg-input', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Model name' });
    input.value = examples[0] || 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf';
    var strip = h('div', { class: 'pg-toks' }), notes = h('div'), estBox = h('div');
    root.appendChild(field('A model name, repo, file or Ollama tag', input, true));
    if (examples.length) {
      root.appendChild(h('div', { class: 'chips' }, examples.map(function (ex) {
        return h('button', { type: 'button', class: 'chip', title: ex, onclick: function () { input.value = ex; draw(); } }, [ex.length > 34 ? ex.slice(0, 32) + '…' : ex]);
      })));
    }
    root.appendChild(strip); root.appendChild(estBox); root.appendChild(notes);
    function draw() {
      var r = decodeName(input.value);
      clear(strip);
      r.toks.forEach(function (t) {
        strip.appendChild(h('span', { class: 'pg-tok' + (t.hi ? ' pg-tok--hi' : '') + (t.kind === '?' ? ' pg-tok--unk' : ''), title: t.note }, [code(t.text), h('i', null, [t.kind])]));
      });
      clear(estBox);
      if (r.est) {
        estBox.appendChild(stats([
          ['Weights, estimated', bytes(r.est.gb), true],
          ['Bits per weight', num(r.est.bpw, 2) + (r.est.assumed ? ' (assumed BF16)' : '')],
          ['Read per token', r.est.active ? bytes(r.est.active * r.est.bpw / 8) + ' (active experts only)' : bytes(r.est.gb)]
        ]));
        estBox.appendChild(h('p', { class: 'pg-note' }, ['Parameters × bits ÷ 8, using the bits a mix averages on an 8B model; small models with large vocabularies come out larger, because their embeddings are kept at more bits.']));
      }
      clear(notes).appendChild(table(['Token', 'Kind', 'Meaning'], r.toks.map(function (t) { return [code(t.text), t.kind, t.note]; })));
    }
    input.addEventListener('input', draw);
    draw();
  };

  /* ================================================ MEMORY CALCULATOR */

  /* Architecture numbers from each model's config.json on Hugging Face;
     parameter counts from the Hub's safetensors index. kv = cached elements
     per token per full-attention layer: 2 × KV heads × head dim for grouped-
     query attention, kv_lora_rank + rope dim for DeepSeek-style MLA. */
  var MODELS = [
    { id: 'llama32-1b', name: 'Llama 3.2 1B', total: 1.24, active: 1.24, layers: 16, kv: 1024 },
    { id: 'qwen3-8b', name: 'Qwen3 8B', total: 8.19, active: 8.19, layers: 36, kv: 2048 },
    { id: 'llama31-8b', name: 'Llama 3.1 8B', total: 8.03, active: 8.03, layers: 32, kv: 2048 },
    { id: 'gptoss-20b', name: 'gpt-oss 20B (MoE)', total: 20.9, active: 3.6, layers: 12, swa: 12, win: 128, kv: 1024, native: 'MXFP4' },
    { id: 'mistral-24b', name: 'Mistral Small 3.2 24B', total: 24.0, active: 24.0, layers: 40, kv: 2048 },
    { id: 'gemma3-27b', name: 'Gemma 3 27B', total: 27.4, active: 27.4, layers: 10, swa: 52, win: 1024, kv: 4096 },
    { id: 'qwen3-30b', name: 'Qwen3 30B-A3B (MoE)', total: 30.5, active: 3.3, layers: 48, kv: 1024 },
    { id: 'llama33-70b', name: 'Llama 3.3 70B', total: 70.6, active: 70.6, layers: 80, kv: 2048 },
    { id: 'gptoss-120b', name: 'gpt-oss 120B (MoE)', total: 116.8, active: 5.1, layers: 18, swa: 18, win: 128, kv: 1024, native: 'MXFP4' },
    { id: 'qwen3-235b', name: 'Qwen3 235B-A22B (MoE)', total: 235.1, active: 22, layers: 94, kv: 1024 },
    { id: 'deepseek-v3', name: 'DeepSeek-V3 671B (MoE, MLA)', total: 671, active: 37, layers: 61, kv: 576, native: 'FP8' },
    { id: 'kimi-k2', name: 'Kimi K2 1T (MoE, MLA)', total: 1026, active: 32, layers: 61, kv: 576, native: 'FP8' }
  ];
  var FORMATS = [
    ['BF16', 16], ['FP8', 8], ['Q8_0', 8.5], ['Q6_K', 6.56], ['Q5_K_M', 5.7], ['Q4_K_M', 4.89], ['NVFP4', 4.5],
    ['IQ4_XS', 4.42], ['MXFP4', 4.25], ['INT4 (GPTQ/AWQ, g128)', 4.15], ['Q3_K_M', 4.0], ['Q2_K', 3.16], ['IQ2_XXS', 2.06], ['Ternary (1.58-bit)', 1.69]
  ];
  var KVTYPES = [['F16', 2], ['Q8_0', 1.0625], ['Q4_0', 0.5625]];
  var DEVICES = [
    ['phone', 'Phone, 12 GB (LPDDR5X)', 12, 77], ['gpu8', 'Laptop GPU, 8 GB', 8, 256], ['m4', 'Mac mini M4, 16 GB', 16, 120],
    ['cpu', 'Desktop CPU, 64 GB DDR5', 64, 90], ['4090', 'RTX 4090, 24 GB', 24, 1008], ['5090', 'RTX 5090, 32 GB', 32, 1792],
    ['spark', 'DGX Spark, 128 GB', 128, 273], ['strix', 'Ryzen AI Max+ 395, 128 GB', 128, 256], ['m4max', 'MacBook Pro M4 Max, 128 GB', 128, 546],
    ['m3u', 'Mac Studio M3 Ultra, 512 GB', 512, 819], ['h100', 'H100 SXM, 80 GB', 80, 3350], ['h200', 'H200, 141 GB', 141, 4800],
    ['b200', 'B200, 180 GB', 180, 8000], ['8h100', '8 × H100, 640 GB (ideal split)', 640, 26800]
  ];
  var CTX = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 1048576];

  W['memory-calculator'] = function (root) {
    var st = { model: 'llama31-8b', fmt: 'Q4_K_M', ctx: 5, kvt: 'F16', seqs: 1, dev: '4090' };
    clear(root).classList.add('pg');
    var mk = function (opts, cur, on) {
      var s = h('select', { class: 'pg-select', onchange: function () { on(this.value); } }, opts.map(function (o) {
        return h('option', { value: o[0], selected: o[0] === cur ? true : null }, [o[1]]);
      }));
      return s;
    };
    var ctxIn = h('input', { class: 'pg-range', type: 'range', min: 0, max: CTX.length - 1, step: 1, value: st.ctx, 'aria-label': 'Context length' });
    var ctxLab = h('span', { class: 'pg-lab' });
    root.appendChild(h('div', { class: 'pg-row' }, [
      field('Model', mk(MODELS.map(function (m) { return [m.id, m.name]; }), st.model, function (v) { st.model = v; draw(); }), true),
      field('Weights stored as', mk(FORMATS.map(function (f) { return [f[0], f[0] + ' · ' + f[1] + ' bits']; }), st.fmt, function (v) { st.fmt = v; draw(); }), true),
      field('Device', mk(DEVICES.map(function (d) { return [d[0], d[1]]; }), st.dev, function (v) { st.dev = v; draw(); }), true)
    ]));
    root.appendChild(h('div', { class: 'pg-row' }, [
      h('div', { class: 'pg-field pg-field--grow' }, [ctxLab, ctxIn]),
      field('KV cache', chips(KVTYPES.map(function (k) { return k[0]; }), st.kvt, function (v) { st.kvt = v; draw(); }, 'KV cache type')),
      field('Parallel chats', chips(['1', '4', '16', '64'], '1', function (v) { st.seqs = +v; draw(); }, 'Concurrent sequences'))
    ]));
    ctxIn.addEventListener('input', function () { st.ctx = +this.value; draw(); });
    var barBox = h('div'), out = h('div'), note = h('p', { class: 'pg-note' });
    root.appendChild(barBox); root.appendChild(out); root.appendChild(note);

    function draw() {
      var m = MODELS.filter(function (x) { return x.id === st.model; })[0];
      var bpw = FORMATS.filter(function (f) { return f[0] === st.fmt; })[0][1];
      var dev = DEVICES.filter(function (d) { return d[0] === st.dev; })[0];
      var kvb = KVTYPES.filter(function (k) { return k[0] === st.kvt; })[0][1];
      var ctx = CTX[st.ctx];
      ctxLab.textContent = 'Context · ' + (ctx >= 1048576 ? '1M' : num(ctx / 1024, 0) + 'K') + ' tokens';
      var perTok = m.kv * kvb * m.layers;
      var kvCache = st.seqs * m.kv * kvb * (m.layers * ctx + (m.swa || 0) * Math.min(ctx, m.win || 0));
      var weights = m.total * 1e9 * bpw / 8;
      var extra = 0.5e9 + 0.03 * weights;
      var total = weights + kvCache + extra, cap = dev[2] * 1e9;
      var scale = Math.max(total, cap) * 1.04;

      clear(barBox).appendChild(h('div', { class: 'pg-mem', role: 'img', 'aria-label': 'Memory needed ' + bytes(total) + ' against ' + dev[2] + ' GB' }, [
        h('span', { class: 'pg-mem-seg pg-mem-seg--w', style: 'left:0;width:' + (100 * weights / scale).toFixed(2) + '%' }),
        h('span', { class: 'pg-mem-seg pg-mem-seg--kv', style: 'left:' + (100 * weights / scale).toFixed(2) + '%;width:' + (100 * kvCache / scale).toFixed(2) + '%' }),
        h('span', { class: 'pg-mem-seg pg-mem-seg--x', style: 'left:' + (100 * (weights + kvCache) / scale).toFixed(2) + '%;width:' + (100 * extra / scale).toFixed(2) + '%' }),
        h('span', { class: 'pg-mem-cap', style: 'left:' + (100 * cap / scale).toFixed(2) + '%', title: dev[1] })
      ]));
      barBox.appendChild(h('div', { class: 'pg-mem-key fig-key' }, [
        h('span', null, [h('i', { class: 'pg-mem-seg--w' }), 'weights ' + bytes(weights)]),
        h('span', null, [h('i', { class: 'pg-mem-seg--kv' }), 'KV cache ' + bytes(kvCache)]),
        h('span', null, [h('i', { class: 'pg-mem-seg--x' }), 'runtime allowance ' + bytes(extra)]),
        h('span', null, [h('i', { class: 'fig-m fig-m--pi' }), dev[1]])
      ]));

      var fits = total <= cap;
      var readEmpty = m.active * 1e9 * bpw / 8;
      var readFull = readEmpty + kvCache / st.seqs;
      var tpsE = dev[3] * 1e9 / readEmpty, tpsF = dev[3] * 1e9 / readFull;
      clear(out).appendChild(stats([
        ['Total needed', bytes(total), true],
        ['Fits?', fits ? 'Yes — ' + bytes(cap - total) + ' spare' : 'No — ' + bytes(total - cap) + ' over'],
        ['KV per token', bytes(perTok) + (m.swa ? ' + windowed layers' : '')],
        ['Speed ceiling', '≤ ' + num(tpsE, 0) + ' tok/s empty, ≤ ' + num(tpsF, 0) + ' full']
      ]));
      note.textContent = 'Weights = parameters × bits ÷ 8. The KV cache stores keys and values for every token in the context, for every layer' +
        (m.swa ? ' (this model’s sliding-window layers keep only the last ' + m.win + ' tokens)' : '') +
        '. The speed ceiling is memory bandwidth (' + num(dev[3], 0) + ' GB/s) divided by the bytes read per generated token: the active weights plus the cache. Real engines fall short of it by an amount that depends on the engine and the hardware. ' +
        (m.native ? 'This model was released in ' + m.native + '. ' : '') +
        'The runtime allowance (0.5 GB + 3%) is a rough stand-in for activations and buffers, which vary by engine.';
    }
    draw();
  };

  /* ========================================================= INSPECTOR */

  /* A random-access byte source, local File or remote URL, cached in 64 KB
     pages. Missing pages are fetched as one range per run, and a run that
     continues the previous one reads ahead twice as far each time (up to
     4 MB), so a header read front to back costs a handful of requests while
     a parser that hops between offsets only pays for the pages it touches. */
  var PAGE = 1 << 16;
  function paged(src, fetchRange) {
    var pages = {}, order = [], lastEnd = -2, ahead = 1;
    function store(i, u8) {
      if (!pages[i]) order.push(i);
      pages[i] = u8;
      if (order.length > 1024) delete pages[order.shift()];
    }
    src.read = function (off, len) {
      if (src.size != null) len = Math.max(0, Math.min(len, src.size - off));
      if (len <= 0) return Promise.resolve(new Uint8Array(0));
      var a = Math.floor(off / PAGE), b = Math.floor((off + len - 1) / PAGE), runs = [];
      for (var i = a; i <= b; i++) {
        if (pages[i]) continue;
        var r = runs[runs.length - 1];
        if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]);
      }
      return runs.reduce(function (chain, r) {
        return chain.then(function () {
          ahead = r[0] === lastEnd + 1 ? Math.min(ahead * 2, 64) : 1;
          var end = Math.max(r[1], r[0] + ahead - 1);
          if (src.size != null) end = Math.min(end, Math.floor((src.size - 1) / PAGE));
          lastEnd = end;
          return fetchRange(r[0] * PAGE, (end + 1) * PAGE).then(function (u8) {
            for (var j = r[0]; j <= end; j++) {
              var s0 = (j - r[0]) * PAGE;
              if (s0 < u8.length) store(j, u8.subarray(s0, Math.min(u8.length, s0 + PAGE)));
            }
          });
        });
      }, Promise.resolve()).then(function () {
        var parts = [];
        for (var k = a; k <= b && pages[k]; k++) parts.push(pages[k]);
        var total = parts.reduce(function (t, p) { return t + p.length; }, 0), all = new Uint8Array(total), o = 0;
        parts.forEach(function (p) { all.set(p, o); o += p.length; });
        return all.subarray(off - a * PAGE, off - a * PAGE + len);
      });
    };
    return src;
  }
  function fileSource(file) {
    return paged({ name: file.name, size: file.size, remote: false }, function (s0, e0) {
      return file.slice(s0, Math.min(file.size, e0)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
    });
  }
  function bufferSource(name, u8) {
    return { name: name, size: u8.length, remote: false, read: function (off, len) { return Promise.resolve(u8.subarray(off, Math.min(u8.length, off + len))); } };
  }
  function urlSource(url) {
    var src = { name: decodeURIComponent(url.split('?')[0].split('/').pop()), size: null, remote: true, requests: 0, fetched: 0 };
    return paged(src, function (s0, e0) {
      src.requests++;
      if (src.requests > 300) return Promise.reject(new Error('Stopped after 300 range requests: this file spreads its structure too thin to read remotely. Download it and open it locally instead.'));
      var ctl = window.AbortController ? new AbortController() : null;
      return fetch(url, { headers: { Range: 'bytes=' + s0 + '-' + (e0 - 1) }, signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          if (r.status === 416) return new Uint8Array(0);
          if (r.status === 200) { if (ctl) ctl.abort(); throw new Error('The server ignored the range request, so reading the header would mean downloading the whole file.'); }
          if (r.status !== 206) throw new Error('HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' — the repository may be gated or private.' : r.status === 404 ? ' — no such file.' : ''));
          var cr = r.headers.get('Content-Range'); if (cr && cr.indexOf('/') > 0) src.size = +cr.split('/')[1];
          return r.arrayBuffer().then(function (b) { src.fetched += b.byteLength; return new Uint8Array(b); });
        });
    });
  }

  /* A cursor over a source with a sliding buffer, so parsers read small
     values synchronously after one awaited ensure(). */
  function Cursor(src, pos) { this.src = src; this.pos = pos || 0; this.buf = new Uint8Array(0); this.off = 0; }
  Cursor.prototype.ensure = function (n) {
    var self = this;
    if (this.pos >= this.off && this.pos + n <= this.off + this.buf.length) return Promise.resolve();
    return this.src.read(this.pos, Math.max(n, 1 << 16)).then(function (b) {
      if (b.length < n) throw new Error('The file ended early — truncated, or not the format its first bytes suggest.');
      self.buf = b; self.off = self.pos;
    });
  };
  Cursor.prototype.dv = function () { return new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength); };
  Cursor.prototype.u8 = function () { return this.buf[this.pos++ - this.off]; };
  Cursor.prototype.u32 = function () { var v = this.dv().getUint32(this.pos - this.off, true); this.pos += 4; return v; };
  Cursor.prototype.u64 = function () {
    var d = this.dv(), o = this.pos - this.off; this.pos += 8;
    return d.getUint32(o, true) + d.getUint32(o + 4, true) * 4294967296;
  };
  Cursor.prototype.take = function (n) { var o = this.pos - this.off; this.pos += n; return this.buf.subarray(o, o + n); };
  var utf8 = new TextDecoder('utf-8');

  /* ---- GGUF ---------------------------------------------------------- */

  var GGML = {
    0: ['F32', 1, 4], 1: ['F16', 1, 2], 2: ['Q4_0', 32, 18], 3: ['Q4_1', 32, 20], 6: ['Q5_0', 32, 22], 7: ['Q5_1', 32, 24],
    8: ['Q8_0', 32, 34], 9: ['Q8_1', 32, 36], 10: ['Q2_K', 256, 84], 11: ['Q3_K', 256, 110], 12: ['Q4_K', 256, 144],
    13: ['Q5_K', 256, 176], 14: ['Q6_K', 256, 210], 15: ['Q8_K', 256, 292], 16: ['IQ2_XXS', 256, 66], 17: ['IQ2_XS', 256, 74],
    18: ['IQ3_XXS', 256, 98], 19: ['IQ1_S', 256, 50], 20: ['IQ4_NL', 32, 18], 21: ['IQ3_S', 256, 110], 22: ['IQ2_S', 256, 82],
    23: ['IQ4_XS', 256, 136], 24: ['I8', 1, 1], 25: ['I16', 1, 2], 26: ['I32', 1, 4], 27: ['I64', 1, 8], 28: ['F64', 1, 8],
    29: ['IQ1_M', 256, 56], 30: ['BF16', 1, 2], 34: ['TQ1_0', 256, 54], 35: ['TQ2_0', 256, 66], 39: ['MXFP4', 32, 17]
  };
  var FTYPE = {
    0: 'ALL_F32', 1: 'MOSTLY_F16', 2: 'MOSTLY_Q4_0', 3: 'MOSTLY_Q4_1', 7: 'MOSTLY_Q8_0', 8: 'MOSTLY_Q5_0', 9: 'MOSTLY_Q5_1',
    10: 'MOSTLY_Q2_K', 11: 'MOSTLY_Q3_K_S', 12: 'MOSTLY_Q3_K_M', 13: 'MOSTLY_Q3_K_L', 14: 'MOSTLY_Q4_K_S', 15: 'MOSTLY_Q4_K_M',
    16: 'MOSTLY_Q5_K_S', 17: 'MOSTLY_Q5_K_M', 18: 'MOSTLY_Q6_K', 19: 'MOSTLY_IQ2_XXS', 20: 'MOSTLY_IQ2_XS', 21: 'MOSTLY_Q2_K_S',
    22: 'MOSTLY_IQ3_XS', 23: 'MOSTLY_IQ3_XXS', 24: 'MOSTLY_IQ1_S', 25: 'MOSTLY_IQ4_NL', 26: 'MOSTLY_IQ3_S', 27: 'MOSTLY_IQ3_M',
    28: 'MOSTLY_IQ2_S', 29: 'MOSTLY_IQ2_M', 30: 'MOSTLY_IQ4_XS', 31: 'MOSTLY_IQ1_M', 32: 'MOSTLY_BF16', 36: 'MOSTLY_TQ1_0',
    37: 'MOSTLY_TQ2_0', 38: 'MOSTLY_MXFP4_MOE'
  };
  var GV = ['uint8', 'int8', 'uint16', 'int16', 'uint32', 'int32', 'float32', 'bool', 'string', 'array', 'uint64', 'int64', 'float64'];
  var GSZ = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8 };

  function gScalar(c, t) {
    var d = c.dv(), o = c.pos - c.off, v;
    switch (t) {
      case 0: v = d.getUint8(o); break; case 1: v = d.getInt8(o); break;
      case 2: v = d.getUint16(o, true); break; case 3: v = d.getInt16(o, true); break;
      case 4: v = d.getUint32(o, true); break; case 5: v = d.getInt32(o, true); break;
      case 6: v = d.getFloat32(o, true); break; case 7: v = d.getUint8(o) !== 0; break;
      case 10: v = d.getUint32(o, true) + d.getUint32(o + 4, true) * 4294967296; break;
      case 11: v = Number(d.getBigInt64(o, true)); break; case 12: v = d.getFloat64(o, true); break;
    }
    c.pos += GSZ[t];
    return v;
  }
  async function gStr(c, keep) {
    await c.ensure(8); var n = c.u64();
    if (keep === false && n > 64) { c.pos += n; return null; }
    await c.ensure(n); return utf8.decode(c.take(n));
  }
  async function gVal(c, t) {
    if (t === 8) return await gStr(c);
    if (t === 9) {
      await c.ensure(12); var et = c.u32(), n = c.u64(), sample = [];
      if (et === 8) {
        for (var i = 0; i < n; i++) { var s = await gStr(c, i < 6); if (i < 6) sample.push(s); }
      } else if (GSZ[et]) {
        var keep = Math.min(n, 6); await c.ensure(keep * GSZ[et]);
        for (var j = 0; j < keep; j++) sample.push(gScalar(c, et));
        c.pos += (n - keep) * GSZ[et];
      } else throw new Error('Nested GGUF arrays are not shown here.');
      return { array: true, type: GV[et], n: n, sample: sample };
    }
    await c.ensure(GSZ[t] || 8);
    return gScalar(c, t);
  }

  async function parseGGUF(src, progress) {
    var c = new Cursor(src, 0);
    await c.ensure(24);
    c.pos = 4;
    var ver = c.u32();
    if (ver < 2) throw new Error('GGUF version ' + ver + ' used 32-bit counts and is not read here.');
    var nt = c.u64(), nkv = c.u64(), kv = {};
    for (var i = 0; i < nkv; i++) {
      var k = await gStr(c); await c.ensure(4); var t = c.u32();
      kv[k] = { type: GV[t], value: await gVal(c, t) };
      if (progress && i % 4 === 0) progress('Reading metadata ' + (i + 1) + ' / ' + nkv + '…');
    }
    var tensors = [];
    for (var j = 0; j < nt; j++) {
      var name = await gStr(c); await c.ensure(4); var nd = c.u32(); await c.ensure(nd * 8 + 12);
      var dims = []; for (var d = 0; d < nd; d++) dims.push(c.u64());
      var type = c.u32(), off = c.u64();
      tensors.push({ name: name, dims: dims, type: type, off: off });
    }
    var align = kv['general.alignment'] ? kv['general.alignment'].value : 32;
    var dataStart = Math.ceil(c.pos / align) * align;
    return { ver: ver, kv: kv, tensors: tensors, headerBytes: dataStart };
  }

  function bitsLevel(bpw) { return bpw < 3 ? 0 : bpw < 4 ? 1 : bpw < 5 ? 2 : bpw < 7 ? 3 : 4; }

  function renderGGUF(g, src, out) {
    var totP = 0, totB = 0, byType = {};
    g.tensors.forEach(function (t) {
      var info = GGML[t.type] || ['type ' + t.type, 1, 0], p = prod(t.dims), b = p / info[1] * info[2];
      t.tname = info[0]; t.p = p; t.b = b; totP += p; totB += b;
      var e = byType[info[0]] || (byType[info[0]] = { n: 0, p: 0, b: 0 }); e.n++; e.p += p; e.b += b;
    });
    var kv = g.kv, v = function (k) { return kv[k] ? kv[k].value : null; };
    var arch = v('general.architecture');
    var ft = v('general.file_type');
    out.appendChild(stats([
      ['Format', 'GGUF v' + g.ver, true],
      ['Parameters', params(totP)],
      ['Average bits / weight', num(totB * 8 / totP, 2)],
      ['Tensors', num(g.tensors.length, 0)],
      ['Metadata keys', num(Object.keys(kv).length, 0)],
      ['Header', bytes(g.headerBytes) + (src.size ? ' · ' + num(100 * g.headerBytes / src.size, 2) + '% of the file' : '')]
    ]));
    var lede = [h('b', null, [String(v('general.name') || src.name)]), ' — architecture ', code(String(arch || '?'))];
    if (ft != null) lede.push(', file type ', code((FTYPE[ft] || ft) + ''));
    if (arch && v(arch + '.context_length')) lede.push(', context ' + num(v(arch + '.context_length'), 0) + ' tokens');
    out.appendChild(h('p', { class: 'pg-note' }, lede.concat(['.'])));

    out.appendChild(h('span', { class: 'pg-lab' }, ['Where the bytes go, by tensor type']));
    out.appendChild(bars(Object.keys(byType).sort(function (a, b) { return byType[b].b - byType[a].b; }).map(function (k) {
      var e = byType[k];
      return { name: k, value: e.b, label: num(100 * e.b / totB, 1) + '% · ' + e.n + ' t · ' + num(e.b * 8 / e.p, 2) + ' b' };
    })));

    /* the layer map: the mix the quantizer chose, tensor by layer */
    var rows = {}, maxL = -1;
    g.tensors.forEach(function (t) {
      var m = /^blk\.(\d+)\.(.+)\.weight$/.exec(t.name);
      if (!m || t.dims.length < 2) return;
      var l = +m[1]; maxL = Math.max(maxL, l);
      (rows[m[2]] || (rows[m[2]] = {}))[l] = t;
    });
    var kinds = Object.keys(rows);
    if (kinds.length && maxL >= 0) {
      var n = maxL + 1;
      var grid = h('div', { class: 'pg-heat', style: 'grid-template-columns: 7.5rem repeat(' + n + ', minmax(1.6rem, 1fr))' });
      grid.appendChild(h('span', { class: 'pg-heat-lab' }, ['layer →']));
      for (var l = 0; l < n; l++) grid.appendChild(h('span', null, [String(l)]));
      kinds.forEach(function (k) {
        grid.appendChild(h('span', { class: 'pg-heat-lab', title: k }, [k]));
        for (var l2 = 0; l2 < n; l2++) {
          var t = rows[k][l2];
          if (!t) { grid.appendChild(h('span')); continue; }
          var bpw = GGML[t.type] ? 8 * GGML[t.type][2] / GGML[t.type][1] : 16;
          grid.appendChild(h('span', { class: 'pg-h' + bitsLevel(bpw), title: t.name + ' · ' + t.tname + ' · ' + t.dims.join('×') }, [t.tname.replace(/^I?Q/, function (q) { return q === 'IQ' ? 'i' : ''; }).replace('_K', 'K').replace('_', '.')]));
        }
      });
      out.appendChild(h('span', { class: 'pg-lab' }, ['Layer map — the type chosen for each weight matrix (darker = more bits)']));
      out.appendChild(grid);
      var others = g.tensors.filter(function (t) { return !/^blk\./.test(t.name) && t.dims.length > 1; });
      if (others.length) out.appendChild(h('p', { class: 'pg-note' }, ['Outside the layers: '].concat(others.map(function (t, i) {
        return h('span', null, [(i ? ', ' : ''), code(t.name), ' ' + t.tname]);
      }))));
    }

    var meta = Object.keys(kv).filter(function (k) { return k !== 'tokenizer.chat_template'; }).map(function (k) {
      var val = kv[k].value, shown;
      if (val && val.array) shown = '[' + num(val.n, 0) + ' × ' + val.type + ']  ' + val.sample.map(function (s) { return JSON.stringify(s); }).join(', ') + (val.n > val.sample.length ? ', …' : '');
      else shown = typeof val === 'number' && !Number.isInteger(val) ? String(+val.toPrecision(6)) : String(val);
      if (shown.length > 160) shown = shown.slice(0, 157) + '…';
      return [code(k), h('span', { class: 'pg-mono' }, [shown])];
    });
    out.appendChild(h('details', null, [h('summary', { class: 'pg-lab' }, ['All ' + meta.length + ' metadata keys']), table(['Key', 'Value'], meta)]));
    if (kv['tokenizer.chat_template']) {
      out.appendChild(h('details', null, [h('summary', { class: 'pg-lab' }, ['The chat template (Jinja), stored in the file']), h('pre', { class: 'pg-pre' }, [String(kv['tokenizer.chat_template'].value)])]));
    }
    out.appendChild(h('details', null, [h('summary', { class: 'pg-lab' }, ['Tensor list (' + g.tensors.length + ')']),
      table(['Name', 'Shape', 'Type', 'Size'], g.tensors.slice(0, 400).map(function (t) { return [code(t.name), t.dims.join(' × '), t.tname, bytes(t.b)]; }))]));
  }

  /* ---- safetensors ---------------------------------------------------- */

  var ST_BITS = { F64: 64, F32: 32, F16: 16, BF16: 16, I64: 64, I32: 32, I16: 16, I8: 8, U64: 64, U32: 32, U16: 16, U8: 8, BOOL: 8, F8_E4M3: 8, F8_E5M2: 8, F8_E8M0: 8, F6_E2M3: 6, F6_E3M2: 6, F4: 4, C64: 64 };

  async function parseSafetensors(src) {
    var c = new Cursor(src, 0); await c.ensure(8);
    var n = c.u64();
    if (n > 100e6) throw new Error('Header length ' + n + ' is implausible: not a safetensors file.');
    await c.ensure(n);
    var json = JSON.parse(utf8.decode(c.take(n)));
    return { n: n, header: json };
  }
  function layoutOf(names) {
    var has = function (re) { return names.some(function (k) { return re.test(k); }); };
    if (has(/\.qweight$/) && has(/\.qzeros$/)) return 'GPTQ or AWQ: 4-bit weights packed eight to an int32 (qweight), with per-group scales and zero points (qzeros).';
    if (has(/\.weight_packed$/)) return 'compressed-tensors (llm-compressor / vLLM): packed integer weights with weight_scale tensors beside them.';
    if (has(/_blocks$/) && has(/_scales$/)) return 'MXFP4, as gpt-oss ships it: FP4 values packed two to a byte (_blocks) and one power-of-two scale per 32 (_scales).';
    if (has(/\.weight_scale_inv$/)) return 'Block-scaled FP8, as DeepSeek ships it: F8_E4M3 weights and one inverse scale per 128 × 128 tile (weight_scale_inv).';
    if (has(/\.weight_scale_2$/) || has(/\.input_scale$/) && has(/\.weight_scale$/)) return 'NVIDIA Model Optimizer layout: low-precision weights with per-block and per-tensor scales (weight_scale, weight_scale_2).';
    if (has(/\.biases$/) && has(/\.scales$/)) return 'MLX: weights packed eight 4-bit values (or other widths) per uint32, with a scale and a bias per group of weights (usually 64).';
    if (has(/\.absmax$/) || has(/quant_state/)) return 'bitsandbytes: NF4 or FP4 weights packed into uint8, with absmax and quant_state tensors.';
    return null;
  }
  function renderSafetensors(s, src, out) {
    var hd = s.header, meta = hd.__metadata__; delete hd.__metadata__;
    var names = Object.keys(hd), totP = 0, totB = 0, byType = {};
    names.forEach(function (k) {
      var t = hd[k], p = prod(t.shape), b = t.data_offsets[1] - t.data_offsets[0];
      totP += p; totB += b;
      var e = byType[t.dtype] || (byType[t.dtype] = { n: 0, p: 0, b: 0 }); e.n++; e.p += p; e.b += b;
    });
    out.appendChild(stats([
      ['Format', 'safetensors', true], ['Tensors', num(names.length, 0)], ['Elements', params(totP)],
      ['Tensor bytes', bytes(totB)], ['Header', bytes(s.n + 8) + ' of JSON']
    ]));
    var lay = layoutOf(names);
    if (lay) out.appendChild(h('p', { class: 'pg-note' }, [h('b', null, ['Quantized layout detected. ']), lay, ' The recipe itself lives in config.json, not here.']));
    if (meta) out.appendChild(h('p', { class: 'pg-note' }, ['__metadata__: ', h('span', { class: 'pg-mono' }, [JSON.stringify(meta).slice(0, 300)])]));
    out.appendChild(h('span', { class: 'pg-lab' }, ['Where the bytes go, by dtype']));
    out.appendChild(bars(Object.keys(byType).sort(function (a, b) { return byType[b].b - byType[a].b; }).map(function (k) {
      var e = byType[k]; return { name: k, value: e.b, label: num(100 * e.b / totB, 1) + '% · ' + e.n + ' tensors' };
    })));
    var sorted = names.slice().sort(function (a, b) { return hd[a].data_offsets[0] - hd[b].data_offsets[0]; });
    out.appendChild(h('details', null, [h('summary', { class: 'pg-lab' }, ['Tensor list, in file order (' + names.length + ')']),
      table(['Name', 'Dtype', 'Shape', 'Bytes'], sorted.slice(0, 500).map(function (k) {
        var t = hd[k]; return [code(k), t.dtype, t.shape.join(' × ') || 'scalar', bytes(t.data_offsets[1] - t.data_offsets[0])];
      }))]));
    out.appendChild(h('p', { class: 'pg-note' }, ['This is the whole of the format: an 8-byte length, this JSON, then raw bytes at the listed offsets. There is nothing in it that can execute.']));
  }

  /* ---- pickle ---------------------------------------------------------- */

  var DANGER = /^(os|posix|nt|subprocess|sys|builtins|__builtin__|runpy|socket|shutil|webbrowser|pty|importlib|ctypes|code|commands|urllib|requests|http|marshal|pickle|dill|torch\.hub|platform|asyncio|threading|multiprocessing)\b|^builtins\.(exec|eval|compile|open|getattr|setattr|__import__|apply|breakpoint|input)$/;
  var EXPECTED = /^(collections\.OrderedDict|torch\._utils\._rebuild_\w+|torch\.\w+Storage|torch\.storage\.\w+|torch\._tensor\._rebuild_from_type_v2|torch\.Size|torch\.(float|half|bfloat16|float16|float32|float64|double|int|int8|int16|int32|int64|uint8|bool|long|complex64)|torch\.device|torch\.nn\.parameter\.Parameter|numpy\.core\.multiarray\._reconstruct|numpy\._core\.multiarray\._reconstruct|numpy\.ndarray|numpy\.dtype|_codecs\.encode|builtins\.(set|frozenset|bytearray|slice|complex)|torch\._utils\._rebuild_tensor_v2|__builtin__\.set)$/;

  /* Walks opcodes without executing anything: records every global the
     pickle would import, and counts the calls it would make. */
  function scanPickle(u8, start) {
    var i = start || 0, strs = [], memo = {}, memoN = 0, globals = {}, reduce = 0, persid = 0, build = 0, proto = 0, last = null;
    var push = function (v) { strs.push(v); last = v; if (strs.length > 16) strs.shift(); };
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    var line = function () { var j = u8.indexOf(10, i); if (j < 0) throw new Error('eof'); var s = utf8.decode(u8.subarray(i, j)); i = j + 1; return s; };
    var glob = function (mod, nm) { var k = mod + '.' + nm; globals[k] = (globals[k] || 0) + 1; push(null); };
    var need = function (n) { if (i + n > u8.length) throw new Error('eof'); };
    try {
      while (i < u8.length) {
        var op = u8[i++];
        switch (op) {
          case 0x2e: return { end: i, globals: globals, reduce: reduce, persid: persid, build: build, proto: proto, complete: true };
          case 0x80: need(1); proto = u8[i++]; break;
          case 0x95: need(8); i += 8; break;
          case 0x63: case 0x69: { var mod = line(), nm = line(); glob(mod, nm); break; }
          case 0x93: { var n2 = strs[strs.length - 1], m2 = strs[strs.length - 2]; glob(String(m2), String(n2)); break; }
          case 0x8c: case 0x55: case 0x43: { need(1); var ln = u8[i++]; need(ln); var s1 = utf8.decode(u8.subarray(i, i + ln)); i += ln; push(op === 0x43 ? null : s1); break; }
          case 0x58: case 0x54: case 0x42: { need(4); var ln4 = dv.getUint32(i, true); i += 4; need(ln4); var s4 = op === 0x42 ? null : utf8.decode(u8.subarray(i, i + ln4)); i += ln4; push(s4); break; }
          case 0x8d: case 0x8e: case 0x96: { need(8); var ln8 = dv.getUint32(i, true) + dv.getUint32(i + 4, true) * 4294967296; i += 8; need(ln8); var s8 = op === 0x8d ? utf8.decode(u8.subarray(i, i + ln8)) : null; i += ln8; push(s8); break; }
          case 0x56: case 0x53: push(line()); break;
          case 0x46: case 0x49: case 0x4c: line(); push(null); break;
          case 0x50: line(); persid++; push(null); break;
          case 0x67: case 0x70: { var ix = line(); if (op === 0x70) memo[ix] = last; else push(memo[ix]); break; }
          case 0x71: need(1); memo[u8[i++]] = last; break;
          case 0x72: need(4); memo[dv.getUint32(i, true)] = last; i += 4; break;
          case 0x94: memo[memoN++] = last; break;
          case 0x68: need(1); push(memo[u8[i++]]); break;
          case 0x6a: need(4); push(memo[dv.getUint32(i, true)]); i += 4; break;
          case 0x4a: need(4); i += 4; push(null); break;
          case 0x4b: case 0x82: need(1); i += 1; push(null); break;
          case 0x4d: case 0x83: need(2); i += 2; push(null); break;
          case 0x84: need(4); i += 4; push(null); break;
          case 0x47: need(8); i += 8; push(null); break;
          case 0x8a: { need(1); var l1 = u8[i++]; need(l1); i += l1; push(null); break; }
          case 0x8b: { need(4); var l4 = dv.getUint32(i, true); i += 4 + l4; push(null); break; }
          case 0x51: persid++; break;
          case 0x52: case 0x81: case 0x92: case 0x6f: reduce++; push(null); break;
          case 0x62: build++; break;
          case 0x28: case 0x30: case 0x31: case 0x32: case 0x4e: case 0x61: case 0x64: case 0x7d: case 0x65: case 0x6c: case 0x5d:
          case 0x73: case 0x74: case 0x29: case 0x75: case 0x85: case 0x86: case 0x87: case 0x88: case 0x89: case 0x8f: case 0x90:
          case 0x91: case 0x97: case 0x98: if (op !== 0x28) push(null); break;
          default: throw new Error('Unknown pickle opcode 0x' + op.toString(16) + ' at byte ' + (i - 1) + '.');
        }
      }
    } catch (e) {
      if (e.message !== 'eof') return { end: i, globals: globals, reduce: reduce, persid: persid, build: build, proto: proto, error: e.message };
    }
    return { end: i, globals: globals, reduce: reduce, persid: persid, build: build, proto: proto, complete: false };
  }

  function renderPickle(scans, out, label) {
    var globals = {}, reduce = 0, persid = 0;
    scans.forEach(function (s) {
      Object.keys(s.globals).forEach(function (k) { globals[k] = (globals[k] || 0) + s.globals[k]; });
      reduce += s.reduce; persid += s.persid;
    });
    var keys = Object.keys(globals);
    var bad = keys.filter(function (k) { return DANGER.test(k) && !EXPECTED.test(k); });
    var odd = keys.filter(function (k) { return !EXPECTED.test(k) && bad.indexOf(k) < 0; });
    out.appendChild(stats([
      ['Format', label, true], ['Imports', String(keys.length)], ['Calls on load', String(reduce)],
      ['Tensor storages', String(persid)], ['Verdict', bad.length ? 'Would run code' : odd.length ? 'Needs review' : 'Only tensor rebuilding']
    ]));
    out.appendChild(h('p', { class: 'pg-note' }, [bad.length
      ? h('b', null, ['Unpickling this file would call ' + bad.join(', ') + '. ' + 'That is arbitrary code execution: do not load it with pickle or with torch.load(weights_only=False).'])
      : odd.length ? 'It imports names outside the usual tensor-rebuilding set. Each one is a function the loader would be told to call. torch.load(weights_only=True) refuses anything not on its allowlist.'
      : 'Every import is one PyTorch uses to rebuild tensors. This is what a clean checkpoint looks like — and it is still a program: the scan above had to walk its opcodes to know that.']));
    out.appendChild(table(['Global the pickle imports', 'Uses', 'Class'], keys.sort().map(function (k) {
      return [code(k), String(globals[k]), bad.indexOf(k) >= 0 ? 'executes code' : odd.indexOf(k) >= 0 ? 'unexpected' : 'tensor rebuild'];
    })));
  }

  /* ---- zip (PyTorch, Keras, NumPy) ------------------------------------ */

  async function parseZip(src) {
    if (!src.size) { await src.read(0, 1); }
    var size = src.size, tailLen = Math.min(size, 65557), tail = await src.read(size - tailLen, tailLen);
    var dv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength), e = -1;
    for (var i = tail.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('No zip directory found at the end of the file.');
    var count = dv.getUint16(e + 10, true), cdSize = dv.getUint32(e + 12, true), cdOff = dv.getUint32(e + 16, true);
    if (cdOff === 0xffffffff || count === 0xffff) {
      var loc = e - 20;
      if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
        var z64 = dv.getUint32(loc + 8, true) + dv.getUint32(loc + 12, true) * 4294967296;
        var r = await src.read(z64, 56), d2 = new DataView(r.buffer, r.byteOffset, r.byteLength);
        count = d2.getUint32(32, true) + d2.getUint32(36, true) * 4294967296;
        cdSize = d2.getUint32(40, true) + d2.getUint32(44, true) * 4294967296;
        cdOff = d2.getUint32(48, true) + d2.getUint32(52, true) * 4294967296;
      }
    }
    var cd = await src.read(cdOff, cdSize), cv = new DataView(cd.buffer, cd.byteOffset, cd.byteLength), p = 0, entries = [];
    for (var k = 0; k < count && p + 46 <= cd.length; k++) {
      if (cv.getUint32(p, true) !== 0x02014b50) break;
      var method = cv.getUint16(p + 10, true), csize = cv.getUint32(p + 20, true), usize = cv.getUint32(p + 24, true);
      var nl = cv.getUint16(p + 28, true), xl = cv.getUint16(p + 30, true), cl = cv.getUint16(p + 32, true), lo = cv.getUint32(p + 42, true);
      var name = utf8.decode(cd.subarray(p + 46, p + 46 + nl));
      var x = p + 46 + nl, xe = x + xl;
      while (x + 4 <= xe) {
        var id = cv.getUint16(x, true), sz = cv.getUint16(x + 2, true), q = x + 4;
        if (id === 1) {
          var rd = function () { var v = cv.getUint32(q, true) + cv.getUint32(q + 4, true) * 4294967296; q += 8; return v; };
          if (usize === 0xffffffff) usize = rd();
          if (csize === 0xffffffff) csize = rd();
          if (lo === 0xffffffff) lo = rd();
        }
        x += 4 + sz;
      }
      entries.push({ name: name, method: method, csize: csize, usize: usize, lo: lo });
      p += 46 + nl + xl + cl;
    }
    return entries;
  }
  async function zipRead(src, e, limit) {
    var hdr = await src.read(e.lo, 30), hv = new DataView(hdr.buffer, hdr.byteOffset, hdr.byteLength);
    var start = e.lo + 30 + hv.getUint16(26, true) + hv.getUint16(28, true);
    var raw = await src.read(start, Math.min(e.csize, limit || e.csize));
    if (e.method === 0) return raw;
    if (e.method === 8 && window.DecompressionStream) {
      var stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    throw new Error('Compressed with zip method ' + e.method + ', which this page cannot inflate.');
  }

  async function renderZip(src, out) {
    var entries = await parseZip(src);
    var pkl = entries.filter(function (e) { return /(^|\/)data\.pkl$/.test(e.name); })[0];
    var code_ = entries.some(function (e) { return /(^|\/)code\//.test(e.name); });
    var keras = entries.some(function (e) { return e.name === 'config.json'; }) && entries.some(function (e) { return /\.weights\.h5$/.test(e.name); });
    var npy = entries.length && entries.every(function (e) { return /\.npy$/.test(e.name); });
    var stored = entries.reduce(function (s, e) { return s + e.usize; }, 0);
    var aligned = entries.filter(function (e) { return /\/data\/\d+$/.test(e.name); });
    if (pkl) {
      var u8 = await zipRead(src, pkl);
      renderPickle([scanPickle(u8, 0)], out, code_ ? 'TorchScript archive' : 'PyTorch zip (torch.save)');
      out.appendChild(h('p', { class: 'pg-note' }, [
        'A zip of ' + entries.length + ' entries: the pickle ', code(pkl.name), ' (' + bytes(pkl.usize) + ') describes the object, and ' + aligned.length +
        ' raw storage files under ', code('data/'), ' hold ' + bytes(stored - pkl.usize) + ' of numbers. ' +
        (code_ ? 'The code/ folder holds TorchScript source that the runtime compiles and runs.' : '')
      ]));
    } else if (keras) {
      out.appendChild(stats([['Format', 'Keras 3 archive', true], ['Entries', String(entries.length)]]));
      var cfg = entries.filter(function (e) { return e.name === 'config.json'; })[0];
      try {
        var j = JSON.parse(utf8.decode(await zipRead(src, cfg, 2e6)));
        out.appendChild(h('p', { class: 'pg-note' }, ['config.json names the class ', code(String(j.class_name)), '. Loading rebuilds the model from this JSON; safe_mode (the default) refuses serialized Python lambdas.']));
      } catch (e2) { }
    } else {
      out.appendChild(stats([['Format', npy ? 'NumPy .npz' : 'zip archive', true], ['Entries', String(entries.length)], ['Uncompressed', bytes(stored)]]));
    }
    out.appendChild(h('details', null, [h('summary', { class: 'pg-lab' }, ['Archive entries (' + entries.length + ')']),
      table(['Entry', 'Size', 'Stored as'], entries.slice(0, 300).map(function (e) { return [code(e.name), bytes(e.usize), e.method === 0 ? 'stored' : 'deflated']; }))]));
  }

  /* ---- ONNX (protobuf) ------------------------------------------------ */

  var ONNX_DT = { 1: 'FLOAT', 2: 'UINT8', 3: 'INT8', 4: 'UINT16', 5: 'INT16', 6: 'INT32', 7: 'INT64', 8: 'STRING', 9: 'BOOL', 10: 'FLOAT16', 11: 'DOUBLE', 12: 'UINT32', 13: 'UINT64', 16: 'BFLOAT16', 17: 'FLOAT8E4M3FN', 18: 'FLOAT8E4M3FNUZ', 19: 'FLOAT8E5M2', 20: 'FLOAT8E5M2FNUZ', 21: 'UINT4', 22: 'INT4', 23: 'FLOAT4E2M1' };
  var ONNX_BITS = { 1: 32, 2: 8, 3: 8, 4: 16, 5: 16, 6: 32, 7: 64, 9: 8, 10: 16, 11: 64, 12: 32, 13: 64, 16: 16, 17: 8, 18: 8, 19: 8, 20: 8, 21: 4, 22: 4, 23: 4 };

  async function varint(c) {
    var v = 0, mul = 1, b;
    do { await c.ensure(1); b = c.u8(); v += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
    return v;
  }
  /* Calls fn(field, wire, cursor, end) for each field in [c.pos, end). */
  async function pbWalk(c, end, fn) {
    while (c.pos < end) {
      var key = await varint(c), f = Math.floor(key / 8), w = key & 7, len = 0;
      if (w === 2) { len = await varint(c); var s = c.pos; await fn(f, w, c, s + len, len); c.pos = s + len; }
      else if (w === 0) { var val = await varint(c); await fn(f, w, c, null, val); }
      else if (w === 1) c.pos += 8;
      else if (w === 5) c.pos += 4;
      else throw new Error('Unexpected protobuf wire type ' + w + '.');
    }
  }
  async function pbString(c, len) { await c.ensure(len); return utf8.decode(c.take(len)); }

  async function parseONNX(src, progress) {
    var c = new Cursor(src, 0), size = src.size || (await src.read(0, 1), src.size);
    var model = { ops: {}, nodes: 0, inits: 0, initP: 0, initB: 0, dtypes: {}, external: 0, opsets: [], inputs: [], outputs: [] };
    await pbWalk(c, size, async function (f, w, c1, end, v) {
      if (f === 1 && w === 0) model.ir = v;
      else if (f === 2 && w === 2) model.producer = await pbString(c1, end - c1.pos);
      else if (f === 3 && w === 2) model.producerVersion = await pbString(c1, end - c1.pos);
      else if (f === 8 && w === 2) {
        var os = {}; await pbWalk(c1, end, async function (g, w2, c2, e2, v2) { if (g === 1 && w2 === 2) os.domain = await pbString(c2, e2 - c2.pos); if (g === 2 && w2 === 0) os.version = v2; });
        model.opsets.push((os.domain || 'ai.onnx') + ' v' + os.version);
      } else if (f === 7 && w === 2) {
        await pbWalk(c1, end, async function (g, w2, c2, e2) {
          if (w2 !== 2) return;
          if (g === 1) {
            model.nodes++;
            await pbWalk(c2, e2, async function (k, w3, c3, e3) { if (k === 4 && w3 === 2) { var op = await pbString(c3, e3 - c3.pos); model.ops[op] = (model.ops[op] || 0) + 1; } });
          } else if (g === 5) {
            model.inits++; var dims = [], dt = 0, ext = false;
            if (progress && model.inits % 20 === 0) progress('Reading initializer ' + model.inits + '…');
            await pbWalk(c2, e2, async function (k, w3, c3, e3, v3) {
              if (k === 1 && w3 === 0) dims.push(v3);
              else if (k === 1 && w3 === 2) { while (c3.pos < e3) dims.push(await varint(c3)); }
              else if (k === 2 && w3 === 0) dt = v3;
              else if (k === 14 && w3 === 0 && v3 === 1) ext = true;
            });
            var p = prod(dims); model.initP += p; model.initB += p * (ONNX_BITS[dt] || 0) / 8;
            model.dtypes[ONNX_DT[dt] || dt] = (model.dtypes[ONNX_DT[dt] || dt] || 0) + p;
            if (ext) model.external++;
          } else if (g === 11 || g === 12) {
            var nm = null; await pbWalk(c2, e2, async function (k, w3, c3, e3) { if (k === 1 && w3 === 2) nm = await pbString(c3, e3 - c3.pos); });
            (g === 11 ? model.inputs : model.outputs).push(nm);
          }
        });
      }
    });
    return model;
  }
  function renderONNX(m, src, out) {
    out.appendChild(stats([
      ['Format', 'ONNX', true], ['IR version', String(m.ir)], ['Opset', m.opsets.join(', ') || '—'],
      ['Graph nodes', num(m.nodes, 0)], ['Weights (initializers)', num(m.inits, 0) + ' · ' + params(m.initP)],
      ['Stored outside the file', m.external ? m.external + ' tensors' : 'none']
    ]));
    out.appendChild(h('p', { class: 'pg-note' }, ['Written by ', code((m.producer || '?') + ' ' + (m.producerVersion || '')), '. Unlike a weights file, this one is a program: ' + num(m.nodes, 0) + ' operations wired together, which ONNX Runtime executes. ' +
      (m.external ? 'Its weights live in a side file (the protobuf format caps a file at 2 GB).' : '')]));
    var ops = Object.keys(m.ops).sort(function (a, b) { return m.ops[b] - m.ops[a]; });
    out.appendChild(h('span', { class: 'pg-lab' }, ['The ' + ops.length + ' kinds of operation in the graph']));
    out.appendChild(bars(ops.slice(0, 14).map(function (k) { return { name: k, value: m.ops[k], label: num(m.ops[k], 0) + ' nodes' }; })));
    out.appendChild(h('p', { class: 'pg-note' }, ['Inputs: ', h('span', { class: 'pg-mono' }, [m.inputs.slice(0, 12).join(', ') + (m.inputs.length > 12 ? ', …' : '')]), '  ·  Outputs: ', h('span', { class: 'pg-mono' }, [m.outputs.slice(0, 12).join(', ') + (m.outputs.length > 12 ? ', …' : '')])]));
  }

  /* ---- LiteRT / TFLite (FlatBuffers) ---------------------------------- */

  var TFL_TYPES = ['FLOAT32', 'FLOAT16', 'INT32', 'UINT8', 'INT64', 'STRING', 'BOOL', 'INT16', 'COMPLEX64', 'INT8', 'FLOAT64', 'COMPLEX128', 'UINT64', 'RESOURCE', 'VARIANT', 'UINT32', 'UINT16', 'INT4', 'BFLOAT16', 'INT2', 'UINT4', 'FLOAT8_E4M3FN', 'FLOAT8_E5M2'];
  var TFL_BITS = [32, 16, 32, 8, 64, 0, 8, 16, 64, 8, 64, 128, 64, 0, 0, 32, 16, 4, 16, 2, 4, 8, 8];
  var TFL_OPS = { 0: 'ADD', 2: 'CONCATENATION', 3: 'CONV_2D', 4: 'DEPTHWISE_CONV_2D', 6: 'DEQUANTIZE', 7: 'EMBEDDING_LOOKUP', 9: 'FULLY_CONNECTED', 14: 'LOGISTIC', 18: 'MUL', 19: 'RELU', 22: 'RESHAPE', 25: 'SOFTMAX', 28: 'TANH', 32: 'CUSTOM', 34: 'PAD', 36: 'GATHER', 39: 'TRANSPOSE', 40: 'MEAN', 41: 'SUB', 42: 'DIV', 43: 'SQUEEZE', 45: 'STRIDED_SLICE', 47: 'EXP', 49: 'SPLIT', 53: 'CAST', 55: 'MAXIMUM', 56: 'ARG_MAX', 57: 'MINIMUM', 58: 'LESS', 59: 'NEG', 61: 'GREATER', 64: 'SELECT', 65: 'SLICE', 66: 'SIN', 69: 'TILE', 70: 'EXPAND_DIMS', 71: 'EQUAL', 74: 'SUM', 75: 'SQRT', 76: 'RSQRT', 77: 'SHAPE', 78: 'POW', 82: 'REDUCE_MAX', 83: 'PACK', 88: 'UNPACK', 92: 'SQUARE', 94: 'FILL', 96: 'RANGE', 99: 'SQUARED_DIFFERENCE', 102: 'SPLIT_V', 107: 'GATHER_ND', 108: 'COS', 114: 'QUANTIZE', 123: 'SELECT_V2', 126: 'BATCH_MATMUL', 150: 'GELU' };

  function FB(src) { this.src = src; }
  FB.prototype.at = async function (off, n) { var b = await this.src.read(off, n); return new DataView(b.buffer, b.byteOffset, b.byteLength); };
  FB.prototype.u32 = async function (off) { return (await this.at(off, 4)).getUint32(0, true); };
  FB.prototype.i32 = async function (off) { return (await this.at(off, 4)).getInt32(0, true); };
  /* Offset of field i of the table at t, or 0 when the field is absent. */
  FB.prototype.field = async function (t, i) {
    var vt = t - await this.i32(t), d = await this.at(vt, 4), vlen = d.getUint16(0, true);
    if (4 + 2 * i + 2 > vlen) return 0;
    var o = (await this.at(vt + 4 + 2 * i, 2)).getUint16(0, true);
    return o ? t + o : 0;
  };
  FB.prototype.deref = async function (p) { return p + await this.u32(p); };
  FB.prototype.vec = async function (p) { var v = await this.deref(p); return { n: await this.u32(v), at: v + 4 }; };
  FB.prototype.str = async function (p) { var v = await this.deref(p), n = await this.u32(v); return utf8.decode(await this.src.read(v + 4, Math.min(n, 400))); };

  async function parseTFLite(src, progress) {
    var fb = new FB(src), root = await fb.u32(0), m = { ops: {}, types: {}, nOps: 0, nTensors: 0, params: 0 };
    var f;
    if ((f = await fb.field(root, 0))) m.version = await fb.u32(f);
    if ((f = await fb.field(root, 3))) m.description = await fb.str(f);
    var codes = [];
    if ((f = await fb.field(root, 1))) {
      var v = await fb.vec(f);
      for (var i = 0; i < v.n; i++) {
        var t = await fb.deref(v.at + 4 * i), dep = 0, bc = 0, cc = null, g;
        if ((g = await fb.field(t, 0))) dep = (await fb.at(g, 1)).getInt8(0);
        if ((g = await fb.field(t, 3))) bc = await fb.i32(g);
        if ((g = await fb.field(t, 1))) cc = await fb.str(g);
        var id = Math.max(dep, bc);
        codes.push(cc || TFL_OPS[id] || 'op ' + id);
      }
    }
    if ((f = await fb.field(root, 2))) {
      var sgs = await fb.vec(f); m.subgraphs = sgs.n;
      var sg = await fb.deref(sgs.at), tf, of;
      if ((of = await fb.field(sg, 3))) {
        var ops = await fb.vec(of); m.nOps = ops.n;
        for (var j = 0; j < ops.n; j++) {
          var op = await fb.deref(ops.at + 4 * j), oc = await fb.field(op, 0), ix = oc ? await fb.u32(oc) : 0;
          var nm = codes[ix] || '?'; m.ops[nm] = (m.ops[nm] || 0) + 1;
          if (progress && j % 200 === 0) progress('Reading operator ' + j + ' / ' + ops.n + '…');
        }
      }
      if ((tf = await fb.field(sg, 0))) {
        var ts = await fb.vec(tf); m.nTensors = ts.n;
        for (var k = 0; k < ts.n; k++) {
          var tt = await fb.deref(ts.at + 4 * k), sf = await fb.field(tt, 0), ty = await fb.field(tt, 1);
          var type = ty ? (await fb.at(ty, 1)).getInt8(0) : 0, shape = [];
          if (sf) { var sv = await fb.vec(sf), dvv = await fb.at(sv.at, 4 * sv.n); for (var q = 0; q < sv.n; q++) shape.push(dvv.getInt32(4 * q, true)); }
          var p = shape.length ? prod(shape.map(function (x) { return Math.max(1, x); })) : 1;
          var nmT = TFL_TYPES[type] || String(type); m.types[nmT] = (m.types[nmT] || 0) + p * (TFL_BITS[type] || 0) / 8;
        }
      }
    }
    return m;
  }
  function renderTFLite(m, out) {
    out.appendChild(stats([
      ['Format', 'LiteRT / TFLite', true], ['Schema version', String(m.version)], ['Operators', num(m.nOps, 0)],
      ['Tensors', num(m.nTensors, 0)], ['Subgraphs', String(m.subgraphs || 1)]
    ]));
    if (m.description) out.appendChild(h('p', { class: 'pg-note' }, ['Converter: ', code(m.description)]));
    var ops = Object.keys(m.ops).sort(function (a, b) { return m.ops[b] - m.ops[a]; });
    out.appendChild(h('span', { class: 'pg-lab' }, ['Operators in the main graph']));
    out.appendChild(bars(ops.slice(0, 14).map(function (k) { return { name: k, value: m.ops[k], label: num(m.ops[k], 0) }; })));
    var types = Object.keys(m.types).sort(function (a, b) { return m.types[b] - m.types[a]; });
    out.appendChild(h('span', { class: 'pg-lab' }, ['Tensor bytes by type (weights and activations)']));
    out.appendChild(bars(types.map(function (k) { return { name: k, value: m.types[k], label: bytes(m.types[k]) }; })));
    out.appendChild(h('p', { class: 'pg-note' }, ['A FlatBuffer: every table is found by following offsets, so a phone can memory-map the file and use it in place without parsing it first.']));
  }

  /* ---- msgpack (Flax) --------------------------------------------------- */

  async function parseMsgpack(src) {
    var c = new Cursor(src, 0), leaves = [], maps = 0;
    async function u(n) { await c.ensure(n); var d = c.dv(), o = c.pos - c.off; c.pos += n; return n === 1 ? d.getUint8(o) : n === 2 ? d.getUint16(o) : d.getUint32(o); }
    async function str(n) { await c.ensure(n); return utf8.decode(c.take(n)); }
    async function val(path, depth) {
      var b = await u(1), n;
      if (b <= 0x7f || b >= 0xe0) return b;
      if ((b & 0xf0) === 0x80 || b === 0xde || b === 0xdf) {
        n = (b & 0xf0) === 0x80 ? b & 15 : await u(b === 0xde ? 2 : 4); maps++;
        for (var i = 0; i < n; i++) { var k = await val(path, depth + 1); await val(path.concat([String(k)]), depth + 1); }
        return null;
      }
      if ((b & 0xf0) === 0x90 || b === 0xdc || b === 0xdd) {
        n = (b & 0xf0) === 0x90 ? b & 15 : await u(b === 0xdc ? 2 : 4); var arr = [];
        for (var j = 0; j < n; j++) arr.push(await val(path, depth + 1));
        return arr;
      }
      if ((b & 0xe0) === 0xa0) return await str(b & 31);
      switch (b) {
        case 0xc0: return null; case 0xc2: return false; case 0xc3: return true;
        case 0xd9: return await str(await u(1)); case 0xda: return await str(await u(2)); case 0xdb: return await str(await u(4));
        case 0xc4: n = await u(1); c.pos += n; return { bin: n }; case 0xc5: n = await u(2); c.pos += n; return { bin: n };
        case 0xc6: n = await u(4); c.pos += n; return { bin: n };
        case 0xcc: return await u(1); case 0xcd: return await u(2); case 0xce: return await u(4); case 0xcf: c.pos += 8; return 0;
        case 0xd0: c.pos += 1; return 0; case 0xd1: c.pos += 2; return 0; case 0xd2: c.pos += 4; return 0; case 0xd3: c.pos += 8; return 0;
        case 0xca: c.pos += 4; return 0; case 0xcb: c.pos += 8; return 0;
        case 0xd4: case 0xd5: case 0xd6: case 0xd7: case 0xd8: case 0xc7: case 0xc8: case 0xc9: {
          var len = { 0xd4: 1, 0xd5: 2, 0xd6: 4, 0xd7: 8, 0xd8: 16 }[b];
          if (len == null) len = await u(b === 0xc7 ? 1 : b === 0xc8 ? 2 : 4);
          var type = await u(1), end = c.pos + len;
          if (type === 1 || type === 2) {
            var inner = await val(path, depth + 1);
            if (Array.isArray(inner)) leaves.push({ name: path.join('/'), shape: inner[0] || [], dtype: String(inner[1]) });
          }
          c.pos = end; return null;
        }
      }
      throw new Error('Unexpected msgpack byte 0x' + b.toString(16) + '.');
    }
    await val([], 0);
    return { leaves: leaves, maps: maps };
  }
  function renderMsgpack(m, out) {
    var P = m.leaves.reduce(function (s, l) { return s + prod(l.shape); }, 0);
    out.appendChild(stats([['Format', 'Flax msgpack', true], ['Arrays', num(m.leaves.length, 0)], ['Elements', params(P)], ['Nested dicts', num(m.maps, 0)]]));
    out.appendChild(h('p', { class: 'pg-note' }, ['A Flax parameter tree: nested dictionaries of arrays, each array an extension record of shape, dtype and bytes. Pure data, like safetensors, but it must be read front to back.']));
    out.appendChild(h('details', null, [h('summary', { class: 'pg-lab' }, ['Arrays (' + m.leaves.length + ')']),
      table(['Path', 'Dtype', 'Shape'], m.leaves.slice(0, 300).map(function (l) { return [code(l.name), l.dtype, l.shape.join(' × ')]; }))]));
  }

  /* ---- detection -------------------------------------------------------- */

  var PICKLE_DEMO = new TextEncoder().encode('cbuiltins\nprint\n(Vhello from inside a pickle\ntR.');

  async function inspect(src, out, progress) {
    var head = await src.read(0, 64), ascii = utf8.decode(head.subarray(0, 8));
    var dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
    var name = (src.name || '').toLowerCase();
    if (ascii.slice(0, 4) === 'GGUF') { renderGGUF(await parseGGUF(src, progress), src, out); return; }
    if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 3 && head[3] === 4) { await renderZip(src, out); return; }
    if (head.length >= 8 && utf8.decode(head.subarray(4, 8)) === 'TFL3') { renderTFLite(await parseTFLite(src, progress), out); return; }
    if (head[0] === 0x89 && ascii.slice(1, 4) === 'HDF') {
      out.appendChild(stats([['Format', 'HDF5', true], ['Superblock version', String(head[8])]]));
      out.appendChild(h('p', { class: 'pg-note' }, ['HDF5: a general-purpose scientific container — a small filesystem of groups and datasets. It is what Keras 2 saved as .h5 and Keras 3 keeps inside .keras for the weights. Reading its tree needs a real HDF5 library, so this page stops at the signature.']));
      return;
    }
    if (head[0] === 0x93 && ascii.slice(1, 6) === 'NUMPY') {
      var hl = head[6] === 1 ? dv.getUint16(8, true) : dv.getUint32(8, true), hs = head[6] === 1 ? 10 : 12;
      var hdr = utf8.decode(await src.read(hs, hl));
      out.appendChild(stats([['Format', 'NumPy .npy v' + head[6], true]]));
      out.appendChild(h('pre', { class: 'pg-pre' }, [hdr.trim()]));
      return;
    }
    if (head[0] === 0x80 && head[1] >= 2 && head[1] <= 5) {
      var buf = await src.read(0, Math.min(src.size || 4 << 20, 4 << 20)), scans = [], pos = 0;
      for (var k = 0; k < 4 && pos < buf.length; k++) {
        var s = scanPickle(buf, pos); scans.push(s);
        if (!s.complete) break;
        pos = s.end;
      }
      var legacy = head[2] === 0x8a && head[3] === 0x0a;
      renderPickle(scans, out, legacy ? 'PyTorch legacy pickle' : 'Python pickle');
      if (legacy) out.appendChild(h('p', { class: 'pg-note' }, ['The file opens with PyTorch’s legacy magic number (0x1950a86a20f9469cfc6c) as a pickled integer: the format torch.save wrote before version 1.6 — a stream of pickles followed by raw tensor storages.']));
      return;
    }
    if (ascii.charCodeAt(0) === 0x63 || /\.pkl$/.test(name)) { renderPickle([scanPickle(await src.read(0, Math.min(src.size || 1 << 20, 1 << 20)), 0)], out, 'Python pickle (protocol 0)'); return; }
    if ((head[0] & 0xf0) === 0x80 && /\.msgpack$/.test(name)) { renderMsgpack(await parseMsgpack(src), out); return; }
    var n = dv.getUint32(0, true) + dv.getUint32(4, true) * 4294967296;
    if (n > 1 && n < 100e6 && head[8] === 0x7b) { renderSafetensors(await parseSafetensors(src), src, out); return; }
    if (head[0] === 0x08 && (head[2] === 0x12 || head[2] === 0x3a || /\.onnx$/.test(name))) { renderONNX(await parseONNX(src, progress), src, out); return; }
    if (utf8.decode(head.subarray(4, 8)) === 'ET12' || /\.pte$/.test(name)) {
      out.appendChild(stats([['Format', 'ExecuTorch program', true]]));
      out.appendChild(h('p', { class: 'pg-note' }, ['A FlatBuffer holding an already-lowered PyTorch program and its constants, run by the ExecuTorch runtime on device.']));
      return;
    }
    throw new Error('Not a format this page recognises from its first bytes (' + Array.prototype.map.call(head.subarray(0, 8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(' ') + ').');
  }

  W.inspector = function (root) {
    var samples = (root.getAttribute('data-samples') || '').split('|').filter(Boolean).map(function (s) { var i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; });
    clear(root).classList.add('pg');
    var urlIn = h('input', { class: 'pg-input', type: 'url', spellcheck: 'false', placeholder: 'https://huggingface.co/…/resolve/main/model.safetensors', 'aria-label': 'File URL' });
    var fileIn = h('input', { type: 'file', class: 'visually-hidden', id: 'pg-file-' + Math.random().toString(36).slice(2) });
    var drop = h('label', { class: 'pg-drop', for: fileIn.id }, ['Drop a model file here, or click to choose one. It is read in slices and never uploaded.']);
    var status = h('p', { class: 'pg-note', 'aria-live': 'polite' }), out = h('div', { class: 'pg' });
    root.appendChild(h('div', { class: 'pg-row' }, [
      field('Hugging Face file URL', urlIn, true),
      h('button', { type: 'button', class: 'pg-btn', onclick: function () { if (urlIn.value.trim()) run(urlSource(urlIn.value.trim().replace('/blob/', '/resolve/'))); } }, ['Read header'])
    ]));
    if (samples.length) root.appendChild(h('div', { class: 'chips' }, samples.map(function (s) {
      return h('button', { type: 'button', class: 'chip', title: s[1], onclick: function () {
        if (s[1] === 'demo:pickle') { urlIn.value = ''; run(bufferSource('demo.pkl', PICKLE_DEMO)); }
        else { urlIn.value = s[1]; run(urlSource(s[1])); }
      } }, [s[0]]);
    })));
    root.appendChild(fileIn); root.appendChild(drop); root.appendChild(status); root.appendChild(out);
    urlIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (this.value.trim()) run(urlSource(this.value.trim().replace('/blob/', '/resolve/'))); } });
    fileIn.addEventListener('change', function () { if (this.files[0]) run(fileSource(this.files[0])); });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('pg-drop--over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('pg-drop--over'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) run(fileSource(f)); });

    var runId = 0;
    function run(src) {
      var id = ++runId;
      clear(out); status.textContent = 'Reading ' + (src.name || 'file') + '…';
      var t0 = performance.now();
      inspect(src, out, function (msg) { if (id === runId) status.textContent = msg; })
        .then(function () {
          if (id !== runId) return;
          var read = src.remote ? ' Fetched ' + bytes(src.fetched) + (src.size ? ' of ' + bytes(src.size) + ' (' + num(100 * src.fetched / src.size, 2) + '%)' : '') + ' in ' + src.requests + ' range request' + (src.requests === 1 ? '' : 's') + '.' : '';
          status.textContent = (src.name || 'File') + (src.size && !src.remote ? ' · ' + bytes(src.size) : '') + ' — parsed in ' + num((performance.now() - t0) / 1000, 1) + ' s.' + read;
        })
        .catch(function (e) {
          if (id !== runId) return;
          status.textContent = '';
          clear(out).appendChild(h('p', { class: 'pg-err' }, [String(e && e.message || e)]));
        });
    }
  };
})();
