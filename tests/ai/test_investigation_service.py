import unittest
from unittest.mock import patch

from backend.app.investigation.service import investigate_anomaly


class TestInvestigationService(unittest.TestCase):
    def test_delegates_to_fallback_engine(self):
        anomaly = {
            "device_id": "device-123",
            "signals": [{"type": "traffic_spike"}],
        }

        expected = {
            "alert_id": "alert-1",
            "device_id": "device-123",
            "summary": "Test investigation",
            "observed_evidence": [],
            "possible_explanations": [],
            "check_first": [],
            "next_steps": [],
            "confidence": "low",
            "generated_by": "deterministic_fallback",
        }

        with patch(
            "backend.app.investigation.service.generate_fallback_investigation"
        ) as mock_generator:
            mock_generator.return_value = expected
            result = investigate_anomaly(anomaly)

        mock_generator.assert_called_once_with(
            anomaly=anomaly,
            device=None,
            alert=None,
        )
        self.assertEqual(result["summary"], "Test investigation")

    def test_rejects_non_dictionary_input(self):
        with self.assertRaises(TypeError):
            investigate_anomaly("not-an-anomaly")


if __name__ == "__main__":
    unittest.main()
