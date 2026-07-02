import math

import pytest

from app.services.ai import cosine_similarity


def test_cosine_similarity_identical_vectors():
    v = [1.0, 2.0, 3.0]
    assert cosine_similarity(v, v) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_similarity_opposite_vectors():
    assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)


def test_cosine_similarity_zero_magnitude_returns_zero():
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0
    assert cosine_similarity([1.0, 1.0], [0.0, 0.0]) == 0.0


def test_cosine_similarity_known_value():
    # cos(theta) between [1,1] and [1,0] = 1/sqrt(2)
    result = cosine_similarity([1.0, 1.0], [1.0, 0.0])
    assert result == pytest.approx(1 / math.sqrt(2))
