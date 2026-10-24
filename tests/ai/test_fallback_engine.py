import json
import unittest
from pathlib import Path

from backend.app.ai.fallback_engine import generate_fallback_investigation
from backend.app.ml import AnomalyEngine
from backend.app.simulation.data_generator import (
    build_hero_anomaly_record,
    generate_dataset,
)


REQUIRED_ACTIONS = [
    "Review DNS requests",
    "Inspect outbound connections",
    "Check running processes on host",
    "Verify device ownership",
]


class TestFallbackEngine(unittest.TestCase):
    def test_generates_investigation(self):
        anomaly = {
            "device_id": "192.168.1.23",
            "signals": [
                {
                    "type": "traffic_spike",
                    "deviation_factor": 86.0,
                    "explanation": "Outbound traffic exceeds baseline.",
                },
                {
                    "type": "failed_connection_burst",
                    "explanation": "340 connection attempts failed.",
                },
            ],
        }

        result = generate_fallback_investigation(
            anomaly,
            {"id": "192.168.1.23", "name": "Student-Laptop"},
            {"id": "alert_001"},
        )

        self.assertEqual(result["alert_id"], "alert_001")
        self.assertEqual(result["device_id"], "192.168.1.23")
        self.assertEqual(result["generated_by"], "deterministic_fallback")
        self.assertIn(
            "Outbound traffic exceeds baseline.",
            result["observed_evidence"],
        )
        self.assertTrue(result["check_first"])

    def test_handles_missing_signals(self):
        result = generate_fallback_investigation(
            {"device_id": "device-1", "signals": []}
        )

        self.assertEqual(result["confidence"], "low")
        self.assertTrue(result["observed_evidence"])
        self.assertTrue(result["possible_explanations"])
        self.assertTrue(result["check_first"])

    def test_required_actions_remain_first_with_signal_actions(self):
        result = generate_fallback_investigation({
            "device_id": "device-1",
            "signals": [
                {
                    "type": "traffic_spike",
                    "severity": "HIGH",
                    "deviation_factor": 10.0,
                    "explanation": "Outbound traffic exceeds baseline.",
                },
                {
                    "type": "failed_connection_burst",
                    "severity": "MEDIUM",
                    "deviation_factor": 5.0,
                    "explanation": "Repeated connection failures.",
                },
                {
                    "type": "unusual_hours",
                    "severity": "LOW",
                    "deviation_factor": 1.0,
                    "explanation": "Activity occurred outside normal hours.",
                },
            ],
        })

        actions = result["check_first"]
        self.assertEqual(
            [item["action"] for item in actions[:4]],
            REQUIRED_ACTIONS,
        )
        self.assertEqual(actions[4]["action"], "Review failed connection logs")
        self.assertLessEqual(len(actions), 5)
        self.assertEqual(
            [item["priority"] for item in actions],
            list(range(1, len(actions) + 1)),
        )
        self.assertEqual(len({item["action"] for item in actions}), len(actions))

    def test_missing_ranking_fields_use_defaults_without_mutating_signals(self):
        signals = [
            {
                "type": "traffic_spike",
                "deviation_factor": 86.0,
                "explanation": "Outbound traffic exceeds baseline.",
            },
            {
                "type": "failed_connection_burst",
                "severity": "LOW",
                "explanation": "340 connection attempts failed.",
            },
            {
                "type": "unusual_hours",
                "explanation": "Activity occurred outside normal hours.",
            },
        ]
        original_signals = [dict(signal) for signal in signals]

        result = generate_fallback_investigation(
            {"device_id": "device-1", "signals": signals}
        )

        self.assertEqual(
            result["observed_evidence"],
            [
                "Outbound traffic exceeds baseline.",
                "340 connection attempts failed.",
                "Activity occurred outside normal hours.",
            ],
        )
        self.assertEqual(signals, original_signals)

    def test_required_contract_fields(self):
        schema_path = Path("shared/contracts/investigation_schema.json")
        schema = json.loads(schema_path.read_text())

        result = generate_fallback_investigation({
            "device_id": "device-1",
            "signals": [{"type": "traffic_spike"}],
        })

        for field in schema["required"]:
            self.assertIn(field, result)

        for item in result["check_first"]:
            self.assertIsInstance(item["priority"], int)
            self.assertIsInstance(item["action"], str)
            self.assertIsInstance(item["reason"], str)

    def test_real_anomaly_engine_output_generates_investigation(self):
        dataset = generate_dataset()
        engine = AnomalyEngine.from_dataset(dataset)
        device_id = "192.168.1.23"
        device = next(item for item in dataset["devices"] if item["id"] == device_id)
        analysis = engine.analyze(device_id, build_hero_anomaly_record())
        anomaly = analysis.to_anomaly_contract()

        self.assertTrue(analysis.anomaly)
        self.assertTrue(anomaly["signals"])

        result = generate_fallback_investigation(anomaly, device)

        schema_path = Path("shared/contracts/investigation_schema.json")
        schema = json.loads(schema_path.read_text())
        for field in schema["required"]:
            self.assertIn(field, result)
        self.assertEqual(
            result["observed_evidence"],
            [signal["explanation"] for signal in analysis.top_signals(4)],
        )

        actions = result["check_first"]
        self.assertEqual(
            [item["action"] for item in actions[:4]],
            REQUIRED_ACTIONS,
        )
        self.assertLessEqual(len(actions), 5)
        self.assertEqual(
            [item["priority"] for item in actions],
            list(range(1, len(actions) + 1)),
        )
        for item in actions:
            self.assertEqual(set(item), {"priority", "action", "reason"})


if __name__ == "__main__":
    unittest.main()
