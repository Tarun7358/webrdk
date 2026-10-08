# RAGE Cloud — Revenue Engine & Economics

## 1. Core Economic Principle

> **Crucial Rule:** The platform never promises users fixed payouts per download (e.g. "₹5 for every download"). Earnings are computed strictly from verified gross platform revenue (advertising CPMs, paid content purchases, subscriptions) and distributed according to configured revenue split percentages.

---

## 2. Dynamic Revenue Distribution

Platform splits are managed by Super Admins through `/api/v1/admin/settings` or the UI:

- **Creator Revenue Share:** Default `60%`
- **Platform Revenue Share:** Default `40%`
- **Team Split:** Distributed among team members according to validated shares summing to &le; `100%`.
- **Referral Reward Bonus:** Default `₹50` per creator onboarded who reaches their first upload milestone.

---

## 3. Qualified Download Model

Not every raw request qualifies for revenue. When a visitor triggers `/download/{short_code}`:
1. `FraudDetector` evaluates request telemetry (User-Agent, request velocity, repeat file downloads from same IP, elapsed time).
2. If `risk_score <= 30`, the event is classified as **QUALIFIED**.
3. `RevenueEngine` attributes revenue and credits the creator's wallet.
4. If `risk_score > 30`, the file streams normally to the visitor, but no monetization is generated. This shields the platform from click-farms, scrapers, and bot nets.
