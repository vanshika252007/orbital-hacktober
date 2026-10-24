import json
import unittest
from pathlib import Path

from backend.app.ai.fallback_engine import generate_fallback_investigation


class TestFallbackEngine(unittest.TestCase):
    def test_generates_investigation(self):
        anomaly = {
            "device_id": "192.168.1.23",
            "signals": [
                {
                    "type": "traffic_spike",
                    "explanation": "Outbound traffic is 8.2x above baseline.",
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
            "Outbound traffic is 8.2x above baseline.",
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


if __name__ == "__main__":
    unittest.main()
