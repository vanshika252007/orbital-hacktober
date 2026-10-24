# Risk Score Formula

Implemented in `backend/app/ml/risk_engine.py`. Fully deterministic: identical signals and ML probability always give the identical score.

```
risk_score = round( A + B + C + D )        clamped to 0..100
```

| Part | What it measures | Formula | Max |
|------|------------------|---------|-----|
| **A** Signal severity | How serious each fired rule is | `min(50, Σ points)` with LOW=4, MEDIUM=8, HIGH=14, CRITICAL=20 | 50 |
| **B** Deviation size | How far the worst ratio signal is above baseline | `20 · min(1, log10(max_ratio) / log10(1000))` (ratio signals only: traffic_spike, connection_burst, destination_explosion, failed_connection_burst) | 20 |
| **C** Breadth | How many independent signals fired | `10 · min(1, (n_signals − 1) / 4)` | 10 |
| **D** ML component | Isolation Forest probability for this device | `20 · p_ml` | 20 |

## Severity bands

| Score | Severity | Device status |
|-------|----------|---------------|
| 0–30 | LOW | healthy |
| 31–60 | MEDIUM | warning |
| 61–80 | HIGH | warning |
| 81–100 | CRITICAL | critical |

A window is flagged `anomaly: true` when its score is above 30 (MEDIUM or higher).

## Signal severity (per rule)

Each rule's severity depends on how far past its threshold it fired (`deviation / threshold`):
`< 1.5` LOW, `< 3` MEDIUM, `< 6` HIGH, otherwise CRITICAL.
`unusual_hours` is HIGH when ≥ 3 hours outside the device's active window, otherwise MEDIUM.
`new_external_destination` is always MEDIUM.

Rule thresholds: `traffic_spike`, `connection_burst`, `failed_connection_burst` at > 5× the device's own baseline; `destination_explosion` at > 3×.

## Design properties

* **Explainable:** every point comes from a named signal or the ML probability; `RiskResult.components` returns A, B, C, D.
* **ML cannot alert alone:** D is capped at 20, so with zero rule signals the score can never exceed the LOW band. Every alert has at least one human-readable reason behind it.
* **Per-device:** baselines and Isolation Forest models are trained per device, so "normal" for a file server is never compared with a thermostat.
* **Noise-tolerant:** a lone, mild signal (e.g. 5.2× traffic) scores well under 30 and does not alert.

## Worked example: hero scenario (Student-Laptop, 192.168.1.23, 03:17)

| Signal | Deviation | Severity | Points |
|--------|-----------|----------|--------|
| traffic_spike | 86.0× (2.1 MB vs 25 KB) | CRITICAL | 20 |
| connection_burst | 13.4× (430 vs 32) | MEDIUM | 8 |
| destination_explosion | 9.4× (47 vs 5) | HIGH | 14 |
| failed_connection_burst | 170.0× (340 vs 2) | CRITICAL | 20 |
| unusual_hours | 5 h outside 08:00–22:00 | HIGH | 14 |
| new_external_destination | unseen external IP | MEDIUM | 8 |

* A = min(50, 84) = **50**
* B = 20 · log10(170) / 3 = **14.87**
* C = 10 · min(1, 5/4) = **10**
* D = 20 · 0.955 = **19.10**
* Total = 93.97 → **94 (CRITICAL)**

## Calibration

The Isolation Forest output is converted to a probability with a sigmoid centred on the 99th percentile of the device's own training scores. Its sharpness (`WIDTH_FACTOR = 0.4` in `isolation_forest.py`) was tuned so the deterministic hero scenario scores exactly 94, as required by the demo script. Verification on the full clean history (42 devices × 168 hourly windows = 7 056 windows): 0 rule signals, 0 anomalies, maximum score 20.

If the hero scenario's numbers change, the score will move; re-check this table and the `test_hero_*` tests in `tests/ml/`.

## Language policy

Signal explanations and `primary_reason` use hedged phrasing ("above baseline", "could indicate", "significant deviation") and never assert compromise.

## Signal Evidence Ranking (`top_signals`)

To ensure primary investigation interfaces and alert summaries display the most critical telemetry deviations first, signals are ranked using a multi-tier sort:
1. **Severity Rank**: `CRITICAL` > `HIGH` > `MEDIUM` > `LOW`
2. **Deviation Factor**: Sorted in descending order for ties within the same severity level.

By default, `top_signals(signals, n=4)` caps hero evidence to the top 4 most impactful signals.