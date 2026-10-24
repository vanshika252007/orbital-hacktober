import json
import unittest
from pathlib import Path

from backend.app.investigation.service import investigate_anomaly


class TestInvestigationContract(unittest.TestCase):
    def test_result_matches_contract_types(self):
        schema_path = Path("shared/contracts/investigation_schema.json")
        schema = json.loads(schema_path.read_text())

        result = investigate_anomaly({
            "device_id": "device-123",
            "signals": [{"type": "traffic_spike"}],
        })

        for field in schema["required"]:
            self.assertIn(field, result, f"Missing field: {field}")

        properties = schema["properties"]

        for field, rules in properties.items():
            if field not in result:
                continue

            expected_type = rules.get("type")

            if expected_type == "string":
                self.assertIsInstance(result[field], str, field)
            elif expected_type == "array":
                self.assertIsInstance(result[field], list, field)

        self.assertIn(
            result["confidence"],
            schema["properties"]["confidence"]["enum"],
        )

        for item in result["check_first"]:
            self.assertIsInstance(item["priority"], int)
            self.assertIsInstance(item["action"], str)
            self.assertIsInstance(item["reason"], str)


if __name__ == "__main__":
    unittest.main()
