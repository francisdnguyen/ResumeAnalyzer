def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_check_sets_request_id_header(client):
    response = client.get("/health")
    assert "x-request-id" in response.headers
