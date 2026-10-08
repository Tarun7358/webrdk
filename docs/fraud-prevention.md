# RAGE Cloud — Anti-Fraud & Quality Scoring Engine

## 1. Risk Score Spectrum (0 to 100)

RAGE Cloud analyzes download and viewing traffic with a rule-based engine:

- **0 – 30 (Low Risk):** Verified authentic human traffic &rarr; **Qualified for Creator Revenue**
- **31 – 60 (Medium Risk):** Questionable patterns (e.g. rapid repeat downloads) &rarr; Not qualified
- **61 – 100 (High / Bot Fraud):** Automated scrapers, headless browsers &rarr; Flagged in Admin Telemetry

---

## 2. Rule Evaluation Signals

1. **User-Agent Filtering**:
   - Matches known scrapers, bots, and test runners (`python`, `curl`, `wget`, `puppeteer`, `selenium`, `playwright`, `headless`, `aiohttp`, etc.).
   - Adds **+55 Risk Score**.
2. **IP Velocity Scoring**:
   - Computes downloads originating from the same hashed IP within the past 60 minutes.
   - If downloads > 20/hr &rarr; Adds **+40 Risk Score**.
   - If downloads > 8/hr &rarr; Adds **+20 Risk Score**.
3. **Repeated File Probes**:
   - Downloads of the identical file from the same IP > 3 times in 1 hour &rarr; Adds **+35 Risk Score**.
4. **Instantaneous Transfer Anomalies**:
   - Large files (> 5MB) downloaded in < 0.5s session &rarr; Adds **+30 Risk Score**.

---

## 3. Privacy Preservation

Visitor IP addresses are never stored in raw text. They are hashed using a salted SHA-256 algorithm before database insertion:
```python
def hash_ip(ip: str) -> str:
    return hashlib.sha256(f"rage-cloud-privacy-salt-2026:{ip}".encode()).hexdigest()
```
