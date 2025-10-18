# Visual Component Breakdown - Circle OOAK UI

## Page Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HERO SECTION (gradient background)                          │
│ ┌─────────┐  ┌──────────────────┐                          │
│ │ Circle  │  │ NovaNet Logo     │                          │
│ └─────────┘  └──────────────────┘                          │
│                                                             │
│     Trustless USDC Agents                                  │
│     Extending Object Oriented Agent Kit with zkML          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FLOW DIAGRAM SECTION                                        │
│                                                             │
│ [▶ Initiate User Request Button]                           │
│                                                             │
│ ┌─────┐    ┌─────┐    ┌─────────────────────────┐  ┌─────┐│
│ │ 👤  │ →  │ 🤖  │ →  │ @secure_tool            │ →│ ⚖️  ││
│ │User │    │Agent│    │ [Item 1]  [Item 2]    │  │Work ││
│ │     │    │     │    │ [Item 3]  [Item 4]    │  │Mgr  ││
│ └─────┘    └─────┘    └─────────────────────────┘  └─────┘│
│                          (Larger central box)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CONFIGURATION SECTION                                       │
│                                                             │
│ ⚙️ Configure Transaction                                   │
│                                                             │
│ ┌──────────────┐  ┌──────────────┐                        │
│ │ Amount (USD) │  │ Risk Score   │                        │
│ │ [25.0      ] │  │ [0.01      ] │                        │
│ └──────────────┘  └──────────────┘                        │
│                                                             │
│ [▶ Run Cryptographic Approval Workflow]                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WORKFLOW RESULTS SECTION                                    │
│                                                             │
│ 📊 Workflow Results                                        │
│                                                             │
│ ┌───────────────────┐  ┌───────────────────┐              │
│ │ ONNX Neural       │  │ JOLT zkML Proof   │              │
│ │ ─────────────────│  │ ─────────────────│              │
│ │ decision: APPROVED│  │ [JSON proof data] │              │
│ │ confidence: 99%  │  │                   │              │
│ │ model: ...onnx  │  │ SUCCESS           │              │
│ └───────────────────┘  └───────────────────┘              │
│                                                             │
│ ┌───────────────────┐  ┌───────────────────┐              │
│ │ On-Chain Verification  │ Workflow Manager │              │
│ │ ─────────────────│  │ ─────────────────│              │
│ │ [Groth16 proof] │  │ decision: ✓ APPROVED              │
│ │ verified: true  │  │ proofs verified  │              │
│ │ network: Base   │  │ ready for payment│              │
│ │ SUCCESS         │  │ SUCCESS         │              │
│ └───────────────────┘  └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PAYMENT EXECUTION SECTION                                   │
│                                                             │
│ 💳 Execute USDC Payment                                    │
│                                                             │
│ ┌──────────────────────────────┐  ┌──────────────┐        │
│ │ Recipient Address            │  │ Amount (USDC)│        │
│ │ [0x2e408ad62e30...       ]   │  │ [0.05      ] │        │
│ └──────────────────────────────┘  └──────────────┘        │
│                                                             │
│ [Send USDC (Approval Required)]                           │
│                                                             │
│ Payment Result:                                            │
│ ┌────────────────────────────────────────────────┐        │
│ │ txHash: 0xabc...  [view on explorer] SUCCESS  │        │
│ │ from: 0x456...  to: 0x789...  amount: 0.05   │        │
│ └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ INFO SECTION                                                │
│                                                             │
│ 🔍 Architecture Overview                                   │
│                                                             │
│ • User → AI Agent: Transaction through Circle OOAK        │
│ • ONNX Neural Network: Real ML model (4→8→4→1)           │
│ • @secure_tool: 5 sequential approval steps               │
│   1. Authorization: ONNX decision enforced                │
│   2. zkML Proof: JOLT-Atlas (~600ms)                      │
│   3. On-Chain: Groth16 on Ethereum Sepolia               │
│   4. Send USDC: Circle execute transfer on Base           │
│   5. Post-validation: Verify success & log results        │
│ • Workflow Manager: Final authorization decision          │
│ • USDC: Circle stablecoin on Base Sepolia                 │
└─────────────────────────────────────────────────────────────┘
```

---

## CSS State Transitions

### Flow Box Animation Sequence

```
Initial State:
┌───────────┐
│ Step Box  │  (border: #1a1f2e, bg: #141825)
└───────────┘

     ↓ (user interaction)

Active State:
┌═══════════┐ 🔵 glow
│ Step Box  │  (border: #5b8cff, shadow: blue)
└═══════════┘

     ↓ (API response received)

Success State:
┌═══════════┐
│ Step Box  │  (border: #10b981, bg: rgba(16,185,129,0.05))
└═══════════┘
   ✓ DONE
```

### Secure Tool Item Animation

```
Initial (hidden):
┌─────────────────────────────┐
│ before_invoke_tool() 1/2    │ (subtle teal border)
│ Authorization Check          │
└─────────────────────────────┘

     ↓

Active (processing):
┌─────────────────────────────┐ 🔵 highlight
│ before_invoke_tool() 1/2    │ (teal border: 1px → bold)
│ Authorization Check          │ (bg: rgba(77,226,207,0.15))
└─────────────────────────────┘

     ↓

Success (complete):
┌─────────────────────────────┐
│ before_invoke_tool() 1/2    │ (green border, green bg)
│ Authorization Check          │
│ ✓ Verified                   │
└─────────────────────────────┘
```

---

## Color Usage By Component

### Primary Colors
```
Blue (#5b8cff):        Forms, primary buttons, active borders
Teal (#4de2cf):        Secure tool box, accent highlights
Green (#10b981):       Success states, checkmarks
Muted Gray (#8b92a8):  Secondary text, labels
```

### Component Color Map
```
Hero:           Gradient + primary text
Form inputs:    Dark bg + light border (focus: blue glow)
Primary buttons: Blue gradient + hover lift
Secondary btn:  Dark bg + muted text
Result cards:   Dark card + green success badge
Borders:        Subtle dark borders everywhere
Shadows:        Inset highlights + outer glow
```

---

## Typography Hierarchy

```
Hero H1:    36px, bold, gradient (primary→accent)
Section H1: 18px, bold, light text
Card H2:    20px, medium weight
Labels:     13px, muted color
Body text:  14-15px, light text
Code:       12px, muted color, monospace

Font: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI'
```

---

## Spacing System (8px base)

```
xs:  4px   (badges, small gaps)
sm:  8px   (form labels, tight spacing)
md:  12px  (button padding, medium gaps)
lg:  20px  (section gaps, card padding)
xl:  30px  (container padding)
2xl: 40px  (major sections)
```

---

## Component Sizes

```
Hero height:          Variable with padding
Container max-width:  960px (simple) / 1600px (advanced)
Flow boxes:           175px width (fixed)
Secure tool box:      420px width (fixed, 2.4x larger)
Form grid items:      250px minimum
Result cards:         300px minimum
Button padding:       12px vertical, 24px horizontal
Input padding:        12px vertical, 16px horizontal
Icon circles:         55px diameter
```

---

## Responsive Breakpoints

```
Mobile-first:
< 768px:   Stack forms, reduce font sizes, keep horizontal scroll
768px+:    Multi-column grids, larger typography
1200px+:   Full layout with spacious gaps
```

---

## Interactive Elements Timeline

```
1. User submits form (amount, risk)
              ↓
2. Button disabled, text changes to "Running..."
              ↓
3. Flow box 1 → success (200ms)
              ↓
4. Flow box 2 → active (300ms)
              ↓
5. Flow box 2 → success
              ↓
6. Make API call: /api/approve
              ↓
7. Parse response, show ONNX result
              ↓
8. Secure item 1 → active (300ms)
              ↓
9. Secure item 1 → success
              ↓
10. Secure item 2 → active (600ms) [zkML proof]
              ↓
11. Make API call: /api/groth16/store
              ↓
12. Show on-chain verification result
              ↓
13. Secure item 2 → success
              ↓
14. Flow box 5 (Workflow Manager) → active, then success
              ↓
15. If approved: Secure item 3 → active (300ms) [USDC]
              ↓
16. Make API call: /api/send-usdc
              ↓
17. Show payment result
              ↓
18. Secure item 3 → success
              ↓
19. Secure item 4 → active, then success [validation]
              ↓
20. Re-enable button, show "▶ Initiate User Request"
```

**Total duration**: ~4-7 seconds (includes all API calls)

