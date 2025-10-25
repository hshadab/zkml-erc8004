# Quick Start: New Oracle Wallet Setup

## 🚨 YOUR OLD WALLET IS COMPROMISED - Follow These Steps

---

## Step 1: Get Your New Wallet Info

Open the file: `.oracle-wallet-NEW.json`

⚠️ **THIS FILE IS OUTDATED - Wallet #2 was compromised on Oct 24, 2025**

**NEW WALLET FILE:** `.oracle-wallet-SECURE-v3.json` (LOCAL ONLY - gitignored)

You'll see:
```json
{
  "address": "[SEE LOCAL FILE]",
  "privateKey": "[SEE LOCAL FILE - NEVER COMMIT TO GIT]",
  "mnemonic": "[SEE LOCAL FILE - NEVER COMMIT TO GIT]"
}
```

**SAVE THESE SECURELY:**
1. Copy private key to password manager
2. Write down mnemonic phrase on paper
3. Store backup in secure location

---

## Step 2: Update Render Environment Variables

1. Go to: https://dashboard.render.com/
2. Find service: **trustlessdefi**
3. Click **Environment** tab
4. Find `ORACLE_PRIVATE_KEY`
5. Click **Edit**
6. Paste: `[Get from .oracle-wallet-SECURE-v3.json file]`
7. Click **Save Changes**

**ALSO update the worker service (zkml-base-trader):**
1. Click on **zkml-base-trader** service
2. Click **Environment** tab
3. Update `ORACLE_PRIVATE_KEY` to same value
4. Click **Save Changes**

**Render will automatically redeploy** - wait 2-5 minutes

---

## Step 3: Fund the New Wallet

**IMPORTANT:** Send to the NEW address, not the old one!

### New Address (SAFE):
```
0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9
```

### Old Address (COMPROMISED - DON'T USE):
```
0x4E3eD682f723DD133252aae032D32f1Ef7EEafb4  ❌ STOLEN
```

### How Much to Send:
- **Minimum:** 0.002 ETH (~$7.80) - Good for testing
- **Recommended:** 0.005 ETH (~$19.50) - 1-2 weeks of operation
- **Conservative:** 0.01 ETH (~$39) - Rarely need to refill

### Where to Send:
1. **Network:** Base Mainnet (Chain ID: 8453)
2. **Amount:** 0.002-0.01 ETH
3. **To:** `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`

### How to Send:

**Option A: From Coinbase**
1. Open Coinbase app
2. Tap ETH → Send
3. Select "Base" network
4. Enter address: `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`
5. Amount: 0.002-0.01 ETH
6. Confirm & send

**Option B: From MetaMask**
1. Add Base network if not added
2. Switch to Base Mainnet
3. Send ETH to: `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`

**Option C: Bridge from Ethereum**
1. Go to: https://bridge.base.org/
2. Connect wallet
3. Bridge ETH to Base
4. Send to: `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`

---

## Step 4: Verify Everything Works

### Wait 2-5 minutes after funding, then check:

**1. Check new wallet balance:**
```bash
curl -s https://base-mainnet.g.alchemy.com/v2/sREmjSL1Dq2l7JjyxPXFX \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9","latest"],"id":1}'
```

Should show your balance in hex (convert to ETH)

**2. Check service status:**
```
https://trustlessdefi.onrender.com/api/stats
```

**3. Check for new classifications:**
```
https://trustlessdefi.onrender.com/api/classifications
```

Look for timestamps AFTER you funded the wallet.

**4. Check dashboard:**
```
https://trustlessdefi.onrender.com/
```

Should see new classifications and trades appearing within 5 minutes!

---

## Troubleshooting

### "Render says deployment failed"
- Check Render logs for errors
- Verify you pasted the private key correctly (starts with 0x)
- Make sure no extra spaces

### "Balance still shows 0 ETH"
- Verify you sent on Base Mainnet (not Ethereum, Optimism, etc.)
- Check transaction in your wallet - did it confirm?
- View on BaseScan: https://basescan.org/address/0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9

### "Service still not updating"
- Wait 5 minutes for Render to redeploy
- Check Render logs for errors
- Verify news-service is running (not crashed)

### "I sent to the old address by mistake"
- Unfortunately, those funds are lost (wallet is compromised)
- Send to the NEW address: `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`

---

## Security Checklist

- [x] New wallet generated
- [x] Private key saved in password manager
- [x] Mnemonic phrase backed up
- [ ] Render environment variables updated (YOU DO THIS)
- [ ] New wallet funded with ETH (YOU DO THIS)
- [ ] Service verified working
- [ ] Old wallet address marked as compromised
- [ ] Never reuse old private key

---

## What Happens Next

Once you complete Steps 2-3:

1. **Within 2-5 min:** Render redeploys with new wallet
2. **Within 5-10 min:** Service fetches first news article
3. **Immediately after:** Classification posted to Base Mainnet
4. **If sentiment strong:** Trade executes automatically
5. **60 seconds later:** Trade profitability evaluated
6. **Dashboard updates:** Real-time refresh shows new activity

---

## Important Reminders

⚠️ **OLD WALLET IS COMPROMISED**
- Address: `0x4E3eD682f723DD133252aae032D32f1Ef7EEafb4`
- Any funds sent there WILL BE STOLEN
- Private key was public on GitHub for 3+ days

✅ **NEW WALLET IS SECURE**
- Address: `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`
- Private key NEVER committed to git
- Stored only in Render environment variables
- Backed up in your password manager

🔒 **NEVER COMMIT PRIVATE KEYS TO GIT**
- Always use environment variables
- Check before pushing commits
- Review .gitignore regularly

---

## Need Help?

Read the full incident report:
- `SECURITY_INCIDENT_REPORT.md`

Check wallet details:
- `.oracle-wallet-NEW.json` (local only)

Questions? Issues? Check Render logs first!

---

**You're almost done! Just update Render and fund the new wallet.**
