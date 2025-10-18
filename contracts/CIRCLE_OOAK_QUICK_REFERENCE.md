# Quick Reference: Circle-OOAK UI Patterns for zkML-ERC8004

## Key Files to Reference
- **Full UI HTML** (934 lines): `/home/hshadab/agentkit/Circle-OOAK/node-ui/public/index.html`
- **Backend API** (410 lines): `/home/hshadab/agentkit/Circle-OOAK/node-ui/server.js`
- **Simple version** (107 lines): `/home/hshadab/agentkit/Circle-OOAK/ooak-ui.html`

## Copy-Paste CSS Variables
```css
:root {
  --bg: #0a0e1a;
  --fg: #e7ecf7;
  --muted: #8b92a8;
  --primary: #5b8cff;
  --accent: #4de2cf;
  --success: #10b981;
  --card: #0f1420;
  --border: #1a1f2e;
  --step-bg: #141825;
}
```

## Copy-Paste CSS Reset
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--bg);
  color: var(--fg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

## Copy-Paste Card Component
```css
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 20px 80px rgba(0,0,0,.35);
}

.card h2 {
  margin: 0 0 12px;
  font-size: 20px;
}
```

## Copy-Paste Form Grid
```css
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: var(--step-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--fg);
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.1);
}
```

## Copy-Paste Button Styles
```css
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), #4d7ff7);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 140, 255, 0.4);
}

.btn-secondary {
  background: var(--step-bg);
  color: var(--muted);
  border: 1px solid var(--border);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Copy-Paste Result Card
```css
.result-card {
  background: var(--step-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.result-badge.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.result-card pre {
  font-size: 12px;
  color: var(--muted);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
}
```

## Copy-Paste State Update Functions
```javascript
const $ = s => document.querySelector(s);

function updateFlowBox(num, state) {
  const box = $(`#flow-${num}`);
  if (!box) return;
  box.classList.remove('active', 'success');
  if (state === 'active') box.classList.add('active');
  if (state === 'success') box.classList.add('success');
}

function showResult(id, data) {
  const resultEl = $(`#result-${id}`);
  const contentEl = $(`#result-${id}-content`);
  if (!resultEl || !contentEl) return;
  resultEl.classList.remove('hidden');
  contentEl.textContent = JSON.stringify(data, null, 2);
}
```

## Copy-Paste Async Workflow Pattern
```javascript
$('#form-id').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = $('#btn-id');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    // Step 1: Show active state
    updateFlowBox(1, 'active');
    await new Promise(r => setTimeout(r, 300));
    
    // Step 2: Make API call
    const resp = await fetch('http://localhost:8616/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ param: value })
    });
    
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    
    // Step 3: Show success state
    updateFlowBox(1, 'success');
    showResult('result-1', data);
    
  } catch (err) {
    alert('Error: ' + String(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
});
```

## Copy-Paste Hero Section HTML
```html
<div class="hero">
  <div class="hero-logos">
    <img src="https://cdn.brandfetch.io/..." alt="Circle Logo">
    <img src="https://cdn.prod.website-files.com/..." alt="Partner Logo">
  </div>
  <h1>Your Title Here</h1>
  <p>Your subtitle or description</p>
</div>
```

## Copy-Paste Flow Diagram Structure
```html
<div class="flow-diagram">
  <button class="flow-diagram-run-btn" id="flow-run-btn">▶ Run Workflow</button>
  <div class="flow-main">
    
    <div class="flow-box" id="flow-1">
      <div class="flow-box-icon">📋</div>
      <div class="flow-box-title">Step 1</div>
      <div class="flow-box-desc">Description</div>
    </div>
    <div class="flow-arrow" id="arrow-1">→</div>
    
    <div class="flow-box" id="flow-2">
      <div class="flow-box-icon">🔄</div>
      <div class="flow-box-title">Step 2</div>
      <div class="flow-box-desc">Description</div>
    </div>
    
  </div>
</div>
```

## Copy-Paste Form Grid HTML
```html
<div class="form-grid">
  <div class="form-group">
    <label>Field 1</label>
    <input type="text" id="field1" placeholder="Enter value" />
  </div>
  <div class="form-group">
    <label>Field 2</label>
    <input type="number" id="field2" step="0.01" value="0.0" />
  </div>
</div>
```

## Copy-Paste Results Grid HTML
```html
<div class="results-grid">
  <div class="result-card hidden" id="result-1">
    <div class="result-header">
      <span style="font-weight:600; font-size:13px;">Result 1</span>
      <span class="result-badge success">SUCCESS</span>
    </div>
    <pre id="result-1-content"></pre>
  </div>
  
  <div class="result-card hidden" id="result-2">
    <div class="result-header">
      <span style="font-weight:600; font-size:13px;">Result 2</span>
      <span class="result-badge success">SUCCESS</span>
    </div>
    <pre id="result-2-content"></pre>
  </div>
</div>
```

## Design Principles to Follow

1. **Use CSS Variables** - Always reference --colors, never hardcode
2. **Consistent Spacing** - Use multiples of 4px: 4, 8, 12, 16, 20, 24, 30, 40
3. **Class-Based State** - Use `.active`, `.success`, `.hidden` for states
4. **Smooth Transitions** - Always include `transition: all 0.2s` or `0.3s`
5. **Accessible Contrast** - Light text (#e7ecf7) on dark bg (#0a0e1a)
6. **Grid for Forms** - Use `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`
7. **Color Coding** - Blue (primary action), Teal (accent/secure), Green (success)
8. **Inset + Outer Shadows** - Combine for depth: `box-shadow: inset 0... outer 0...`
9. **Focus States** - Always show focus ring with `box-shadow: 0 0 0 3px rgba(...)`
10. **Mobile Scrolling** - Use `overflow-x: auto` for complex horizontal layouts

## Performance Tips

1. **Single HTML file** - Embed all CSS/JS for instant load
2. **No external fonts** - Use system fonts with fallbacks
3. **Minimal animations** - 0.2s-0.3s transitions only
4. **Lazy images** - Use `loading="lazy"` for logos
5. **Event delegation** - Use few event listeners, delegate to parent
6. **LocalStorage** - Store UI state for persistence
7. **No shadows on every element** - Use sparingly for hierarchy

## Testing Checklist

- [ ] Colors render correctly on dark backgrounds
- [ ] Forms work on mobile (touch-friendly 44px minimum)
- [ ] Flow diagrams scroll horizontally on mobile
- [ ] Animations are smooth (60fps)
- [ ] Buttons disable during async operations
- [ ] Error messages display clearly
- [ ] Results copy/paste JSON from pre tags
- [ ] Links to explorer/blockchain work
- [ ] SES-safe (no eval, Function, dynamic code)

---

All code blocks above are from `/home/hshadab/agentkit/Circle-OOAK/node-ui/public/index.html`
See `CIRCLE_OOAK_UI_REFERENCE.md` for full documentation.
