"""
Tests for Clerk JWT verification in app.api.deps.

Generates a real RSA keypair and signs real JWTs so the RS256 verification path
(kid matching, signature check, expiry) is exercised end to end. `_get_jwks` is
monkeypatched to return our test JWKS instead of calling out to Clerk.
"""

import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwk, jwt

import app.api.deps as deps

KID = "test-kid-1"


@pytest.fixture(scope="module")
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


@pytest.fixture
def jwks(keypair):
    _, public_pem = keypair
    key_dict = jwk.construct(public_pem, algorithm="RS256").to_dict()
    key_dict["kid"] = KID
    return {"keys": [key_dict]}


@pytest.fixture(autouse=True)
def patch_jwks(monkeypatch, jwks):
    async def _fake_get_jwks():
        return jwks

    monkeypatch.setattr(deps, "_get_jwks", _fake_get_jwks)


def _sign(keypair, claims: dict, kid: str | None = KID) -> str:
    private_pem, _ = keypair
    headers = {"kid": kid} if kid else {}
    return jwt.encode(claims, private_pem, algorithm="RS256", headers=headers)


def _credentials(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


async def test_valid_token_returns_user_id(keypair):
    token = _sign(keypair, {"sub": "user_123", "exp": time.time() + 3600})
    user_id = await deps.get_current_user_id(_credentials(token))
    assert user_id == "user_123"


async def test_token_with_unknown_kid_and_multiple_keys_rejected(keypair, monkeypatch, jwks):
    # Add a second key so the "fall back to the only key" path doesn't apply
    jwks["keys"].append({**jwks["keys"][0], "kid": "other-kid"})
    token = _sign(keypair, {"sub": "user_123", "exp": time.time() + 3600}, kid="nonexistent-kid")
    with pytest.raises(HTTPException) as exc_info:
        await deps.get_current_user_id(_credentials(token))
    assert exc_info.value.status_code == 401


async def test_expired_token_rejected(keypair):
    token = _sign(keypair, {"sub": "user_123", "exp": time.time() - 60})
    with pytest.raises(HTTPException) as exc_info:
        await deps.get_current_user_id(_credentials(token))
    assert exc_info.value.status_code == 401


async def test_token_missing_sub_rejected(keypair):
    token = _sign(keypair, {"exp": time.time() + 3600})
    with pytest.raises(HTTPException) as exc_info:
        await deps.get_current_user_id(_credentials(token))
    assert exc_info.value.status_code == 401


async def test_tampered_signature_rejected(keypair):
    token = _sign(keypair, {"sub": "user_123", "exp": time.time() + 3600})
    tampered = token[:-4] + ("aaaa" if token[-4:] != "aaaa" else "bbbb")
    with pytest.raises(HTTPException) as exc_info:
        await deps.get_current_user_id(_credentials(tampered))
    assert exc_info.value.status_code == 401
