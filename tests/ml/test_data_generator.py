from backend.app.simulation import data_generator as dg

REQUIRED_FIELDS = {
    "timestamp", "source_ip", "destination_ip", "source_port", "destination_port", "protocol",
    "bytes_sent", "bytes_received", "packets", "connection_count", "unique_destinations",
    "failed_connections", "dns_requests", "is_new_destination", "is_unusual_hour",
}


def test_42_unique_devices(dataset):
    devices = dataset["devices"]
    assert len(devices) == 42
    assert len({d["id"] for d in devices}) == 42
    assert len({d["name"] for d in devices}) == 42
    names = {d["name"] for d in devices}
    assert {"Developer-MacBook", "Admin-Workstation", "Student-Laptop", "Finance-PC", "Lab-PC-07", "Library-Server"} <= names


def test_hero_device_matches_contract(dataset):
    hero = next(d for d in dataset["devices"] if d["id"] == "192.168.1.23")
    assert hero["name"] == "Student-Laptop" and hero["type"] == "Workstation"
    assert hero["mac"] == "00:1B:44:11:3A:B7"


def test_record_schema_and_volume(dataset):
    assert len(dataset["records"]) == 42 * 7 * 24 == dataset["meta"]["record_count"]
    for r in dataset["records"][:200]:
        assert set(r) == REQUIRED_FIELDS
        assert isinstance(r["is_new_destination"], bool) and isinstance(r["is_unusual_hour"], bool)
        assert r["bytes_sent"] >= 0 and r["connection_count"] >= 0


def test_generation_is_deterministic():
    assert dg.generate_dataset() == dg.generate_dataset()


def test_unusual_hour_flag_matches_active_window(dataset):
    hero = [r for r in dataset["records"] if r["source_ip"] == "192.168.1.23"]
    for r in hero:
        hour = int(r["timestamp"][11:13])
        assert r["is_unusual_hour"] == (not 8 <= hour < 22)


def test_history_is_clean_of_attack_traffic(dataset):
    """No window in the clean history should come anywhere near hero-anomaly volumes."""
    assert max(r["failed_connections"] for r in dataset["records"] if r["source_ip"] == "192.168.1.23") < 10


def test_hero_record_values():
    r = dg.build_hero_anomaly_record()
    assert r["source_ip"] == "192.168.1.23" and r["timestamp"] == "2026-10-24T03:17:00Z"
    assert (r["bytes_sent"], r["bytes_received"], r["connection_count"]) == (2_202_010, 512_000, 430)
    assert (r["unique_destinations"], r["failed_connections"], r["dns_requests"]) == (47, 340, 180)
    assert r["is_unusual_hour"] is True and r["is_new_destination"] is True


def test_write_and_load_roundtrip(tmp_path, dataset):
    out = dg.write_dataset(tmp_path / "logs.json", dataset)
    assert dg.load_dataset(out) == dataset
