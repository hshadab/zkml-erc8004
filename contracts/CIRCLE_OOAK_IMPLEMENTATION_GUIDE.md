# Circle-OOAK UI Implementation Guide for zkML-ERC8004

## Executive Summary

Circle-OOAK demonstrates a production-ready UI pattern for cryptographic proof workflows. This guide explains how to replicate and adapt it for your zkML-ERC8004 interface.

**Key Takeaway**: Single-file HTML + Express.js backend provides a clean, SES-safe demo UI that scales to complex workflows.

---

## File Organization

```
Circle-OOAK/
├── ooak-ui.html                    # Simple version (107 lines)
├── node-ui/
│   ├── public/
│   │   ├── index.html              # Advanced version (934 lines)
│   │   └── style.css               # Stylesheet (minified, 25 lines)
│   ├── server.js                   # Express backend (410 lines)
│   └── README.md
└── contracts/
    └── ProofStorage.sol            # On-chain storage contract
```

---

## Architecture Patterns

### 1. Single-File HTML
- **Benefit**: Easy deployment, no build step, instant load
- **Approach**: Embed all CSS and JavaScript in one HTML file
- **Security**: SES-safe (no eval, Function, dynamic code)
- **Size**: ~30-35 KB total (including all styles + scripts)

### 2. Express.js Backend
- **Ports**: 8616 (Circle-OOAK), 8000-8007 (other services)
- **CORS**: Enabled for local development
- **Cache**: Disabled to prevent stale data
- **Endpoints**: Modular per feature (health, ONNX, Groth16, storage, USDC)

### 3. State Management
- **UI State**: CSS class-based (`.active`, `.success`, `.hidden`)
- **Data State**: Single global object (e.g., `let approvalData = null`)
- **Updates**: Function-based class manipulation

---

## Design System Reference

### Color Palette
```
Primary Blue:       #5b8cff  (buttons, active states)
Accent Teal:        #4de2cf  (secure elements, highlights)
Success Green:      #10b981  (completion, validation)
Muted Gray:         #8b92a8  (secondary text, labels)

Backgrounds:
Dark Navy:          #0a0e1a  (page background)
Card Dark:          #0f1420  (card background)
Step Background:    #141825  (section backgrounds)
Border Subtle:      #1a1f2e  (dividers, borders)
```

### Typography
- **Headline**: 36px, bold, gradient text
- **Subheading**: 18-20px, semibold
- **Body**: 14-15px, regular
- **Label**: 12-13px, medium, muted
- **Code**: 12px, monospace, muted
- **Font Stack**: Inter, system fonts, Segoe UI

### Spacing Grid
```
4px:   Tiny gaps (badges, icons)
8px:   Small gaps (form labels)
12px:  Medium gaps (button padding)
16px:  Input padding, small containers
20px:  Section gaps, card padding
30px:  Container padding, major sections
40px:  Page-level padding
```

---

## Component Patterns

### 1. Hero Section
```html
<div class="hero">
  <div class="hero-logos">
    <img src="logo-url" alt="Logo 1">
    <img src="logo-url" alt="Logo 2">
  </div>
  <h1>Title with Gradient</h1>
  <p>Subtitle or description</p>
</div>
```

**CSS**:
```css
.hero {
  background: linear-gradient(135deg, #1a1f2e 0%, #0a0e1a 100%);
  padding: 30px 20px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
```

**Usage**: Introduction + logo display at top of page

---

### 2. Flow Diagram
**HTML Structure**:
- Container: `.flow-diagram` (scrollable)
- Main flow: `.flow-main` (flex, horizontal)
- Step boxes: `.flow-box` (175px fixed width)
- Connector arrows: `.flow-arrow` (animated)
- Large box: `.flow-box-secure` (420px, central focus)

**State Machine**:
```
Initial → Active → Success
(gray)    (blue)    (green)
```

**JavaScript Pattern**:
```javascript
function updateFlowBox(num, state) {
  const box = $(`#flow-${num}`);
  if (!box) return;
  box.classList.remove('active', 'success');
  if (state === 'active') box.classList.add('active');
  if (state === 'success') box.classList.add('success');
}
```

---

### 3. Form Grid
**Pattern**: Responsive grid with 250px minimum columns

```css
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
```

**Auto-wraps** on mobile, stays multi-column on desktop

---

### 4. Result Cards
**Structure**:
- Header: Title + badge (SUCCESS/ERROR)
- Content: JSON in monospace
- Hidden until populated: `.result-card.hidden`

```javascript
function showResult(id, data) {
  const resultEl = $(`#result-${id}`);
  const contentEl = $(`#result-${id}-content`);
  if (!resultEl || !contentEl) return;
  resultEl.classList.remove('hidden');
  contentEl.textContent = JSON.stringify(data, null, 2);
}
```

---

### 5. Button System
**Primary** (gradient, hover lift):
```css
.btn-primary {
  background: linear-gradient(135deg, var(--primary), #4d7ff7);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 140, 255, 0.4);
}
```

**Secondary** (subtle, no lift):
```css
.btn-secondary {
  background: var(--step-bg);
  border: 1px solid var(--border);
}
```

---

## Workflow Pattern (Async with Timing)

```javascript
$('#request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = $('#btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    // Sequential steps with visual feedback
    for (let i = 1; i <= STEPS; i++) {
      updateFlowBox(i, 'active');
      await new Promise(r => setTimeout(r, 300));  // Processing time
      
      // Make API call if needed
      if (i === 3) {
        const resp = await fetch('/api/endpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data })
        });
        const result = await resp.json();
        if (result.error) throw new Error(result.error);
        showResult('result-3', result);
      }
      
      updateFlowBox(i, 'success');
      await new Promise(r => setTimeout(r, 200));
    }
    
  } catch (err) {
    alert('Error: ' + String(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Try Again';
  }
});
```

**Key Principles**:
1. Disable button immediately
2. Show visual progress (active → success)
3. Add delays between steps (200-600ms)
4. Make API calls during active states
5. Display results after each step
6. Re-enable button in finally block

---

## Backend Pattern (Express.js)

### Setup
```javascript
const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

app.use('/', express.static('public'));
```

### Health Endpoint
```javascript
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
```

### Processing Endpoint
```javascript
app.post('/api/process', async (req, res) => {
  try {
    const { input1, input2 } = req.body;
    if (!input1 || !input2) {
      return res.status(400).json({ error: 'input1 and input2 required' });
    }
    
    // Process data
    const result = await someProcessing(input1, input2);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
```

### Environment Variables
```bash
export OOAK_UI_PORT=8616                    # UI port
export BASE_RPC_URL="https://sepolia.base.org"
export PRIVATE_KEY="your_private_key"       # For on-chain actions
export USDC_ADDRESS="0x036CbD53842c5426..."
```

---

## Integration with Blockchain

### Pattern: Proof Storage

1. **Generate Proof**:
```javascript
const resp = await fetch('/api/groth16/prove', {
  body: JSON.stringify({ decision, confidence })
});
const { proof, publicSignals } = await resp.json();
```

2. **Store On-Chain**:
```javascript
const storeResp = await fetch('/api/groth16/store', {
  body: JSON.stringify({ a, b, c, publicSignals })
});
const { txHash, explorer } = await storeResp.json();
```

3. **Display Link**:
```javascript
$('#result').innerHTML = 
  `<a href="${explorer}" target="_blank">View on Base Explorer</a>`;
```

---

## Performance Optimization

### Critical Rendering Path
1. HTML loads
2. CSS parsed (inline)
3. JavaScript executes (inline)
4. First paint (hero visible)
5. Forms interactive ~100ms
6. Ready for input ~200ms

### Optimization Strategies
- Inline all CSS/JS (no external requests)
- Compress styles (minify)
- Use CSS variables (reusable colors)
- Lazy load images (`loading="lazy"`)
- Minimal animations (0.2s-0.3s only)
- Event delegation (few listeners)

### File Sizes (Circle-OOAK)
- Simple version: 6-7 KB
- Advanced version: 30-35 KB
- Both include all CSS + JS

---

## Security Best Practices

### SES-Safe (Secure ECMAScript)
- No `eval()`, `Function()`, `setTimeout(string)`
- No dynamic code generation
- No `innerHTML` with untrusted content
- Use `textContent` for user data

**Violation Example (AVOID)**:
```javascript
// UNSAFE
const userCode = getUserInput();
eval(userCode);  // NEVER DO THIS
```

**Safe Example (DO THIS)**:
```javascript
// SAFE
const userData = getUserInput();
$('#result').textContent = userData;  // Safe
```

### Environment Variables
```javascript
// DO NOT hardcode private keys
const pk = process.env.PRIVATE_KEY;  // From .env
if (!pk) throw new Error('PRIVATE_KEY not set');
```

### Input Validation
```javascript
const { amount, to } = req.body;
if (typeof amount !== 'number' || amount <= 0) {
  return res.status(400).json({ error: 'Invalid amount' });
}
if (!ethers.isAddress(to)) {
  return res.status(400).json({ error: 'Invalid address' });
}
```

---

## Adapting for zkML-ERC8004

### Recommended Structure

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>zkML ERC8004 Verification</title>
  <style>
    /* Embed Circle-OOAK color scheme */
    :root { --bg:#0a0e1a; ... }
    /* Your custom styles */
  </style>
</head>
<body>
  <!-- Hero Section (logos) -->
  <div class="hero">...</div>
  
  <!-- Main Container -->
  <div class="container">
    <!-- Flow Diagram: Model → Inference → Proof → Verification -->
    <div class="flow-diagram">...</div>
    
    <!-- Configuration Section: Input parameters -->
    <div class="interactive-section">...</div>
    
    <!-- Results Grid: Model output, proof hash, verification status -->
    <div class="interactive-section">
      <div class="results-grid">...</div>
    </div>
    
    <!-- Info Section: Documentation -->
    <div class="info-section">...</div>
  </div>
  
  <script>
    // Pattern: State update functions
    function updateFlowBox(num, state) {...}
    function showResult(id, data) {...}
    
    // Pattern: Async workflow
    $('#request-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        // Sequential steps
        for (let i = 1; i <= STEPS; i++) {
          updateFlowBox(i, 'active');
          await new Promise(r => setTimeout(r, 300));
          // API call here
          updateFlowBox(i, 'success');
        }
      } catch (err) {
        alert('Error: ' + String(err));
      }
    });
  </script>
</body>
</html>
```

### Backend Endpoints for zkML
```javascript
// 1. Health check
GET /api/health

// 2. Load ONNX model
POST /api/model/load
{ modelPath: "path/to/model.onnx" }

// 3. Run inference
POST /api/inference
{ inputData: [...] }

// 4. Generate zkML proof
POST /api/zkml/prove
{ modelHash: "...", inputHash: "..." }

// 5. Verify on-chain
POST /api/verify
{ proofData: {...} }
```

---

## Testing Checklist

### UI/UX
- [ ] Colors render correctly
- [ ] Forms responsive on mobile
- [ ] Flow diagram scrolls horizontally
- [ ] Animations smooth (60fps)
- [ ] Buttons disable during loading
- [ ] Error messages clear
- [ ] JSON results copy/paste

### Functionality
- [ ] Health endpoint returns 200
- [ ] Form validation works
- [ ] API calls succeed
- [ ] Results display correctly
- [ ] State transitions work
- [ ] Final button re-enables

### Performance
- [ ] Page loads < 500ms
- [ ] Forms interactive < 1s
- [ ] Animations smooth
- [ ] No layout shift

### Security
- [ ] No eval/Function used
- [ ] Private keys in .env only
- [ ] Input validation on backend
- [ ] CORS properly configured
- [ ] No console errors

---

## Common Issues & Solutions

### Issue: Form doesn't submit
**Solution**: Check event listener binding
```javascript
const form = $('#form-id');
if (!form) {
  console.error('Form element not found');
  return;
}
form.addEventListener('submit', ...);
```

### Issue: API returns CORS error
**Solution**: Ensure backend has CORS middleware
```javascript
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  next();
});
```

### Issue: Results not showing
**Solution**: Check `.hidden` class removal
```javascript
resultEl.classList.remove('hidden');  // Must remove class
contentEl.textContent = JSON.stringify(data, null, 2);
```

### Issue: Animations lag
**Solution**: Use `will-change` and reduce animations
```css
.flow-box {
  transition: all 0.2s ease;  /* Keep short */
  will-change: transform;      /* Optimize for GPU */
}
```

---

## File References

### Source Files (Read These First)
1. **Advanced UI** (934 lines):
   `/home/hshadab/agentkit/Circle-OOAK/node-ui/public/index.html`
   
2. **Backend API** (410 lines):
   `/home/hshadab/agentkit/Circle-OOAK/node-ui/server.js`
   
3. **Simple UI** (107 lines):
   `/home/hshadab/agentkit/Circle-OOAK/ooak-ui.html`

### Documentation Files
- `CIRCLE_OOAK_UI_REFERENCE.md` - Full architecture guide
- `CIRCLE_OOAK_VISUAL_COMPONENTS.md` - Layout & animation details
- `CIRCLE_OOAK_QUICK_REFERENCE.md` - Copy-paste code snippets

### Copy-Paste Resources
See `CIRCLE_OOAK_QUICK_REFERENCE.md` for:
- CSS variables
- Component styles
- Form patterns
- Button styles
- Result cards
- JavaScript patterns
- HTML structure templates

---

## Summary: 5 Key Takeaways

1. **Single HTML File**: Embed CSS/JS, no build step, ~30-35 KB
2. **State-Based Styling**: Use `.active`, `.success`, `.hidden` classes
3. **Sequential Workflows**: Async/await + setTimeout for visual progress
4. **Modular Backend**: One endpoint per feature, clear error handling
5. **Dark Theme**: Use CSS variables for consistent, themeable colors

---

## Next Steps

1. Review Circle-OOAK's advanced UI (index.html) line by line
2. Extract CSS variables and color scheme
3. Adapt flow diagram for your workflow (Model → Proof → Verification)
4. Create Express backend with your endpoints
5. Map API responses to result cards
6. Test on mobile and desktop
7. Deploy as single HTML file

---

**All files located in**: `/home/hshadab/agentkit/Circle-OOAK/`
**Reference documentation**: `/home/hshadab/zkml-erc8004/contracts/CIRCLE_OOAK_*.md`

