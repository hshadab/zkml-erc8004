# Circle-OOAK Demo UI Architecture & Design Patterns

## Overview
The Circle-OOAK project contains two main UI implementations demonstrating cryptographic proof systems for trustless AI agent payments. Both are single-file HTML applications with embedded CSS and JavaScript, designed for high performance and security (SES-safe).

## File Locations
- **Simple version**: `/home/hshadab/agentkit/Circle-OOAK/ooak-ui.html` (107 lines)
- **Advanced version**: `/home/hshadab/agentkit/Circle-OOAK/node-ui/public/index.html` (934 lines)
- **Backend server**: `/home/hshadab/agentkit/Circle-OOAK/node-ui/server.js` (410 lines, Express.js)
- **Stylesheet**: `/home/hshadab/agentkit/Circle-OOAK/node-ui/public/style.css` (25 lines, minified)

---

## Design Architecture

### 1. Color Scheme (CSS Custom Properties)
All styling uses a cohesive dark theme via CSS variables:

```css
:root {
  --bg: #0a0e1a;           /* Dark navy background */
  --fg: #e7ecf7;           /* Light foreground text */
  --muted: #8b92a8;        /* Muted/secondary text */
  --primary: #5b8cff;      /* Blue for primary CTAs */
  --accent: #4de2cf;       /* Teal/cyan for highlights */
  --success: #10b981;      /* Green for success states */
  --card: #0f1420;         /* Darker card background */
  --border: #1a1f2e;       /* Subtle borders */
  --step-bg: #141825;      /* Step/section backgrounds */
}
```

**Pattern**: Define all colors once, use throughout via CSS variables for consistency and easy theming.

---

### 2. Layout Patterns

#### A. Hero Section (Header)
```css
.hero {
  background: linear-gradient(135deg, #1a1f2e 0%, #0a0e1a 100%);
  padding: 30px 20px 20px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
```
- Uses gradient background for visual depth
- Centered text with top padding for breathing room
- Subtle bottom border for section separation

**UI Element**: Logo display with hero title and subtitle

#### B. Container/Card System
```css
.container { 
  max-width: 960px;  /* or 1600px for wider layouts */
  margin: 0 auto; 
  padding: 40px 20px; 
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 20px 80px rgba(0,0,0,.35);
}
```

**Pattern**: 
- Consistent padding and margins
- Subtle inset highlight + outer shadow for depth
- Dark card on darker background with subtle borders

---

### 3. Flow Diagram Component (Advanced Layout)

**Purpose**: Visualize multi-step workflow with animated transitions

```css
.flow-diagram {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 20px;
  margin-bottom: 40px;
  overflow-x: auto;
  position: relative;
}

.flow-main {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-width: 1450px;
  gap: 12px;
}

.flow-box {
  flex: 0 0 175px;
  background: var(--step-bg);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.flow-box.active {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(91, 140, 255, 0.3);
}

.flow-box.success {
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.05);
}
```

**Key Design Patterns**:
1. Horizontal flex layout for left-to-right flow
2. Fixed-width boxes to maintain consistent spacing
3. `overflow-x: auto` for responsive scrolling
4. Smooth transitions (`transition: all 0.3s ease`)
5. State-based styling (active/success classes)
6. Color-coded borders for status indication

**Animation Example**: Box becomes active (blue border + glow), then success (green border + soft green background)

---

### 4. Secure Tool Box (Special Component)

```css
.flow-box-secure {
  flex: 0 0 420px;  /* Larger than standard boxes */
  background: var(--step-bg);
  border: 2px solid var(--accent);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
}

.flow-box-secure.active {
  box-shadow: 0 0 25px rgba(77, 226, 207, 0.3);
  animation: borderPulse 1.5s ease-in-out infinite;
}

@keyframes borderPulse {
  0%, 100% {
    border-color: var(--accent);
    box-shadow: 0 0 25px rgba(77, 226, 207, 0.3);
  }
  50% {
    border-color: var(--primary);
    box-shadow: 0 0 35px rgba(91, 140, 255, 0.5);
  }
}

.secure-tool-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secure-tool-item {
  background: rgba(77, 226, 207, 0.08);
  border: 1px solid rgba(77, 226, 207, 0.2);
  border-radius: 8px;
  padding: 12px;
  text-align: left;
  transition: all 0.3s ease;
}

.secure-tool-item.active {
  border-color: var(--accent);
  background: rgba(77, 226, 207, 0.15);
}

.secure-tool-item.success {
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.1);
}
```

**Design Highlights**:
- Emphasizes importance with larger size (420px vs 175px)
- Animated pulse effect using `@keyframes` for active state
- Contains sub-items that animate individually
- Color theming (accent/success) for status indication

---

### 5. Form Patterns

```css
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--muted);
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

**Responsive Grid**: `minmax(250px, 1fr)` auto-wraps on mobile

---

### 6. Button System

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

**Patterns**:
- Primary buttons use gradient backgrounds
- Hover effects: slight lift (`translateY(-1px)`) + shadow glow
- Secondary buttons are subtle
- Disabled state uses opacity

---

### 7. Results Display

```css
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.result-card {
  background: var(--step-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.result-card.hidden { display: none; }

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.result-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.result-badge.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.result-card pre {
  font-size: 12px;
  color: var(--muted);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
}
```

**Pattern**: Card-based results with badges and monospace code display

---

### 8. Info Sections

```css
.info-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 30px;
}

.info-section ul {
  list-style: none;
  padding: 0;
}

.info-section li {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  color: var(--muted);
}

.info-section li:last-child { border-bottom: none; }

.info-section b { 
  color: var(--fg); 
  font-weight: 600; 
}
```

**Pattern**: Divide list items with subtle borders, emphasis with bold text

---

## JavaScript Patterns

### 1. DOM Query Shorthand
```javascript
const $ = s => document.querySelector(s);
```
**Pattern**: Use short alias for frequent DOM queries

### 2. State Management
```javascript
let approvalData = null;  // Store workflow result
```
**Pattern**: Single global state object for workflow data

### 3. UI State Functions
```javascript
function updateFlowBox(num, state) {
  const box = $(`#flow-${num}`);
  if (!box) return;
  box.classList.remove('active', 'success');
  if (state === 'active') box.classList.add('active');
  if (state === 'success') box.classList.add('success');
}

function updateSecureItem(num, state) {
  const item = $(`#secure-item-${num}`);
  if (!item) return;
  item.classList.remove('active', 'success');
  if (state === 'active') item.classList.add('active');
  if (state === 'success') item.classList.add('success');
}
```

**Pattern**: Pure state update functions via class manipulation

### 4. Async Workflow with Timing

```javascript
$('#request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Reset UI
  for (let i = 1; i <= 5; i++) updateFlowBox(i, '');
  
  try {
    // Step 1: User Request
    updateFlowBox(1, 'success');
    updateArrow(1, true);
    await new Promise(r => setTimeout(r, 200));
    
    // Step 2: AI Agent
    updateFlowBox(2, 'active');
    await new Promise(r => setTimeout(r, 300));
    updateFlowBox(2, 'success');
    
    // Step 3: ONNX Inference
    const resp = await fetch('http://localhost:8616/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, risk })
    });
    
    const data = await resp.json();
    
    // Update UI with results
    showResult('onnx', {
      decision: data.decision === 1 ? 'APPROVED' : 'DENIED',
      confidence: `${data.confidence}%`,
      model: 'agent_classifier.onnx (4→8→4→1)'
    });
    
  } catch (err) {
    alert('Error: ' + String(err));
  } finally {
    // Re-enable button
    $('#flow-run-btn').disabled = false;
  }
});
```

**Patterns**:
1. Sequential timing with `await new Promise(r => setTimeout(r, ms))`
2. Async/await for API calls
3. Try/catch/finally for error handling
4. State update → delay → state update for animated transitions

### 5. Result Display
```javascript
function showResult(id, data) {
  const resultEl = $(`#result-${id}`);
  const contentEl = $(`#result-${id}-content`);
  if (!resultEl || !contentEl) return;
  resultEl.classList.remove('hidden');
  contentEl.textContent = JSON.stringify(data, null, 2);
}
```

**Pattern**: Conditional display with class manipulation

---

## Backend API Design (Express.js)

### Core Endpoints

#### 1. Health Check
```javascript
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, circuitDir: CIRCUIT_DIR });
});
```

#### 2. ONNX Inference
```javascript
async function inferONNX(amount, risk) {
  const session = await ort.InferenceSession.create(modelPath);
  const tensor = new ort.Tensor('float32', x, [1, x.length]);
  const out = await session.run({ [inputName]: tensor });
  return { decision, confidence };
}
```

#### 3. Groth16 Proof Generation
```javascript
app.post('/api/groth16/prove', async (req, res) => {
  // Generate witness
  // Run snarkjs groth16 prove
  // Return proof + public signals
});
```

#### 4. On-Chain Storage
```javascript
app.post('/api/groth16/store', async (req, res) => {
  // Create ProofStorage contract transaction
  // Store on Base Sepolia
  // Return tx hash + explorer link
});
```

#### 5. USDC Payment
```javascript
app.post('/api/send-usdc', async (req, res) => {
  // Verify approval
  // Transfer ERC20 tokens
  // Return tx hash
});
```

### CORS & Caching
```javascript
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});
```

---

## Responsive Design

### Mobile Breakpoint
```css
@media (max-width: 768px) {
  .hero h1 { font-size: 22px; }
  .flow-diagram { padding: 20px 10px; }
  .flow-main { min-width: 1100px; }  /* Still scrollable */
}
```

**Pattern**: Keep horizontal flow on mobile with horizontal scroll

---

## Integration Points

### 1. Form → API
```javascript
$('#request-form').addEventListener('submit', async (e) => {
  const amount = parseFloat($('#amount').value);
  const risk = parseFloat($('#risk').value);
  
  const resp = await fetch('http://localhost:8616/api/approve', {
    method: 'POST',
    body: JSON.stringify({ amount, risk })
  });
});
```

### 2. API → UI Display
```javascript
showResult('onnx', {
  decision: data.decision === 1 ? 'APPROVED' : 'DENIED',
  confidence: `${data.confidence}%`
});
```

### 3. Blockchain Integration
```javascript
// Store proof on Base Sepolia
const storeResp = await fetch('/api/groth16/store', {
  body: JSON.stringify({ a, b, c, publicSignals })
});

// Update UI with transaction link
$('#zkml-verify-desc').innerHTML = 
  `Verified on Base (<a href="${storeData.explorer}">view tx</a>)`;
```

---

## Key Design Principles

1. **Single-File Architecture**: All HTML/CSS/JS in one file for easy deployment
2. **SES-Safe**: No `eval()`, no dynamic code generation, no `Function()` constructor
3. **Progressive Enhancement**: Works with basic HTML, enhanced with CSS/JS
4. **State-Based Styling**: CSS classes for states (active/success/hidden)
5. **Smooth Animations**: Consistent 0.2s-0.3s transitions throughout
6. **Consistent Spacing**: 8px/12px/20px/30px padding system
7. **Color Coding**: Blue (primary), Teal (accent), Green (success)
8. **Error Handling**: Try/catch with user-friendly messages
9. **Async Workflows**: Sequential steps with visual feedback
10. **Mobile Responsive**: Horizontal scroll for complex diagrams

---

## Component Summary

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Hero | Both HTMLs | ~20 | Title + subtitle |
| Flow Diagram | Advanced | ~100 | Multi-step visualization |
| Secure Tool Box | Advanced | ~50 | Central focus box |
| Form Grid | Both | ~30 | Input collection |
| Results Grid | Advanced | ~50 | Output display |
| Info Sections | Both | ~30 | Documentation |
| Backend Server | server.js | 410 | API endpoints |

---

## Production Considerations

1. **Environment Variables**: Private keys, RPC URLs, contract addresses
2. **Rate Limiting**: Prevent API abuse
3. **Input Validation**: Sanitize all form inputs
4. **Error Logging**: Log failures for debugging
5. **Gas Estimation**: Calculate costs before transactions
6. **Circuit Security**: Audit all Circom circuits
7. **Contract Audits**: Professional security review of ProofStorage

---

## References

- **Main UI**: `/home/hshadab/agentkit/Circle-OOAK/node-ui/public/index.html`
- **Backend**: `/home/hshadab/agentkit/Circle-OOAK/node-ui/server.js`
- **Simple Version**: `/home/hshadab/agentkit/Circle-OOAK/ooak-ui.html`
- **Documentation**: `/home/hshadab/agentkit/Circle-OOAK/node-ui/README.md`

