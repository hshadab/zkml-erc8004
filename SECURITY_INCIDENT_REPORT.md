# Security Incident Report - Private Key Exposure

**Date:** October 24, 2025
**Severity:** CRITICAL
**Status:** CONTAINED - Action Required

---

## Executive Summary

**CRITICAL SECURITY BREACH:** The oracle wallet private key was accidentally committed to the public GitHub repository in plaintext, making it accessible to anyone. The wallet has been compromised and must be replaced immediately.

---

## Incident Details

### Compromised Wallets

#### Wallet #1 (First Compromise)
- **Address:** `0x4E3eD682f723DD133252aae032D32f1Ef7EEafb4`
- **Private Key:** `[REDACTED - was exposed in render.yaml]`
- **Exposure Date:** October 21, 2025 (Commit: 7d5d61c)
- **File:** `render.yaml` line 16
- **Repository:** https://github.com/hshadab/zkml-erc8004 (PUBLIC)

#### Wallet #2 (Second Compromise)
- **Address:** `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`
- **Private Key:** `[REDACTED - was exposed in markdown documentation files]`
- **Exposure Date:** October 24, 2025
- **Files:** `SECURITY_INCIDENT_REPORT.md`, `QUICK_START_NEW_WALLET.md`, `NEW_DEPLOYMENT_ADDRESSES.md`
- **Root Cause:** Private key included in documentation committed to git

### How it Happened
1. Private key was hardcoded in `render.yaml` for Render deployment
2. File was committed and pushed to public GitHub repository
3. Key has been public for 3+ days
4. Bots likely detected and exploited it immediately

### Evidence of Compromise
- Wallet funded with 0.0062 ETH ($24.15) on Oct 24, 2025
- Funds disappeared immediately after arrival
- 107 transactions sent from wallet but balance shows 0
- No successful on-chain classifications or trade evaluations
- Stats unchanged (still showing old data from Oct 21)

### Impact Assessment
- ✅ **Funds Lost:** ~$24.15 (0.0062 ETH) drained immediately
- ✅ **Service Disabled:** Oracle cannot post classifications
- ✅ **Reputation:** Oracle address compromised, cannot be trusted
- ❌ **Smart Contracts:** NOT compromised (separate private keys)
- ❌ **User Funds:** None affected (demo project)

---

## Remediation Steps Taken

### ✅ COMPLETED

#### 1. New Secure Wallet Generated
```
New Oracle Address: 0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9
Private Key: SECURELY STORED (not in git)
Mnemonic: SECURELY STORED (not in git)
```

**File:** `.oracle-wallet-NEW.json` (gitignored, local only)

#### 2. Private Key Removed from Repository Files
- **render.yaml:** Changed to `sync: false` (uses Render env vars)
- **DEPLOYMENT_STATUS.md:** Removed exposed key, added security warning
- **.gitignore:** Added patterns to block wallet files

#### 3. Git History Cleanup Prepared
- Commits containing private key identified
- Will use `git filter-branch` or BFG Repo-Cleaner to remove

---

## Actions Required (USER)

### 🚨 IMMEDIATE (Within 24 Hours)

#### 1. Update Render Environment Variables
Go to Render Dashboard → trustlessdefi service → Environment

**Update these variables:**
```
ORACLE_PRIVATE_KEY = [Get from local .oracle-wallet-SECURE-v3.json file]
```

**Add for worker service too:**
```
ORACLE_PRIVATE_KEY = [Get from local .oracle-wallet-SECURE-v3.json file]
```

⚠️ **CRITICAL:** Copy the new private key from `.oracle-wallet-SECURE-v3.json` file (LOCAL ONLY)
⚠️ **DO NOT** commit this file to git - it's already gitignored
⚠️ **NEVER** include private keys in documentation or commit messages

#### 2. Fund New Oracle Wallet
Send **0.002-0.005 ETH** (~$7.80-$19.50) to:
```
New Address: [Check .oracle-wallet-SECURE-v3.json for current address]
Network: Base Mainnet
```

**VERIFY** you're sending to the NEW address, not the old compromised one!

#### 3. Update Contract Configuration (If Needed)
If the NewsOracle contract has the old address hardcoded:
- Deploy new oracle or update authorized signer
- Or verify contract uses signature validation (address can change)

### 📅 SHORT TERM (This Week)

#### 4. Clean Git History
Remove private key from ALL git history:

**Option A: BFG Repo-Cleaner (Recommended)**
```bash
# Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Replace private key in history
java -jar bfg-1.14.0.jar --replace-text passwords.txt zkml-erc8004.git

# Force push
cd zkml-erc8004
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**Option B: Git Filter-Branch**
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch render.yaml" \
  --prune-empty --tag-name-filter cat -- --all

git push --force --all
git push --force --tags
```

⚠️ **WARNING:** Force push will rewrite history. Coordinate with any collaborators.

#### 5. Rotate Other Secrets
If any other services use the same private key or related keys:
- Generate new keys for them too
- Update all environment variables
- Never reuse compromised keys

#### 6. Enable GitHub Secret Scanning
- Go to repo Settings → Security → Secret scanning
- Enable push protection
- This prevents future accidents

---

## Prevention Measures Implemented

### ✅ Code Changes
1. **render.yaml:** Uses `sync: false` to pull from Render env vars
2. **.gitignore:** Added wallet file patterns
3. **Documentation:** Updated to remove hardcoded secrets

### ✅ Best Practices Going Forward
1. **NEVER** commit private keys to git
2. **ALWAYS** use environment variables for secrets
3. **USE** Render's built-in environment variable management
4. **ENABLE** pre-commit hooks to detect secrets
5. **REVIEW** all commits before pushing

---

## Technical Details

### Git Commits Containing Private Key
```
e1e68df - fix: resolve critical production issues and improve code quality
7d5d61c - Add Alchemy RPC URL and private key to render.yaml  ← FIRST EXPOSURE
cbd41bc - Fix environment variable names for Render deployment
db28aba - Rename service to trustlessdefi.onrender.com
```

### Files That Contained Private Key
1. `render.yaml` (lines 16, 100) - ✅ FIXED
2. `DEPLOYMENT_STATUS.md` (line 20) - ✅ FIXED
3. `.env` files (multiple) - ✅ Already gitignored

### Attack Timeline
```
Oct 21, 2025 - Private key committed to GitHub (7d5d61c)
Oct 24, 2025 - User reports site not updating
Oct 24, 2025 - User sends 0.0062 ETH to compromised wallet
Oct 24, 2025 - Funds immediately drained by attacker
Oct 24, 2025 - Breach discovered during investigation
Oct 24, 2025 - New wallet generated, remediation started
```

---

## Verification Checklist

### Before Considering This Resolved:

- [ ] New oracle wallet generated and saved securely
- [ ] Render environment variables updated with new key
- [ ] New wallet funded with ETH on Base Mainnet
- [ ] Service successfully posting with new wallet
- [ ] Old private key removed from all repo files
- [ ] Git history cleaned (private key purged)
- [ ] Force push completed
- [ ] GitHub secret scanning enabled
- [ ] Pre-commit hooks installed (optional but recommended)
- [ ] All team members notified of new wallet

### Testing New Wallet
```bash
# Verify new wallet is being used
curl https://trustlessdefi.onrender.com/api/stats

# Should see new classifications with timestamps after remediation
curl https://trustlessdefi.onrender.com/api/classifications | jq '.[0]'
```

---

## Lessons Learned

### What Went Wrong
1. **Developer error:** Hardcoded secrets in config file
2. **No pre-commit checks:** No scanning for secrets before commit
3. **No code review:** Changes pushed directly to main
4. **Public repository:** Increased exposure surface

### What Went Right
1. **Quick detection:** Found within hours of funding
2. **No user impact:** Demo project, no customer funds at risk
3. **Comprehensive fix:** New wallet generated immediately
4. **Documentation:** Full incident report created

### Improvements for Future
1. **Pre-commit hooks:** Install git-secrets or similar
2. **Environment-only secrets:** Never hardcode in config
3. **Code review:** Require PR approval for main branch
4. **Regular audits:** Scan repository for exposed secrets
5. **Monitoring:** Alert on suspicious wallet activity

---

## Related Files

- `render.yaml` - Fixed to use environment variables
- `.gitignore` - Updated to block wallet files
- `.oracle-wallet-NEW.json` - New wallet (LOCAL ONLY, gitignored)
- `DEPLOYMENT_STATUS.md` - Sanitized
- `SECURITY_INCIDENT_REPORT.md` - This document

---

## Contact & Support

If you need help with:
- Git history cleanup
- Render environment variable configuration
- Smart contract updates

Refer to this incident report and the new wallet file.

---

**Report Status:** DRAFT - Pending user actions
**Next Review:** After Render variables updated and service restored
**Severity:** CRITICAL → Will become LOW after remediation complete

---

## Appendix: Wallet Information

**All wallet details are stored in LOCAL FILES ONLY:**

- `.oracle-wallet-SECURE-v3.json` (current secure wallet - gitignored)
- Never commit wallet files to git
- Never include private keys in documentation
- Only store in Render environment variables and local password manager

**Compromised Wallets (DO NOT USE):**
- Wallet #1: `0x4E3eD682f723DD133252aae032D32f1Ef7EEafb4` (compromised Oct 21, 2025)
- Wallet #2: `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9` (compromised Oct 24, 2025)

**Current Wallet:**
- See `.oracle-wallet-SECURE-v3.json` for address and credentials (LOCAL ONLY)

⚠️ **SECURITY RULES:**
⚠️ **NEVER COMMIT PRIVATE KEYS TO GIT**
⚠️ **NEVER INCLUDE IN DOCUMENTATION**
⚠️ **STORE IN PASSWORD MANAGER**
⚠️ **BACKUP SECURELY OFFLINE**
