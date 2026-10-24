"""Make the repo root importable and share the (expensive) trained engine across tests."""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.ml import AnomalyEngine  # noqa: E402
from backend.app.simulation.data_generator import generate_dataset  # noqa: E402


@pytest.fixture(scope="session")
def dataset():
    return generate_dataset()


@pytest.fixture(scope="session")
def engine(dataset):
    return AnomalyEngine.from_dataset(dataset)
