import io

import pytest
from docx import Document
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.services.resume_parser import (
    _clean_text,
    _detect_file_type,
    _sanitize_filename,
    parse_resume,
)


def _make_upload_file(content: bytes, filename: str) -> UploadFile:
    return UploadFile(file=io.BytesIO(content), filename=filename)


def _make_docx_bytes(paragraphs: list[str]) -> bytes:
    doc = Document()
    for text in paragraphs:
        doc.add_paragraph(text)
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


# -- _detect_file_type --------------------------------------------------


def test_detect_file_type_pdf():
    assert _detect_file_type(b"%PDF-1.4 rest of file") == "pdf"


def test_detect_file_type_docx():
    assert _detect_file_type(b"PK\x03\x04 rest of zip") == "docx"


def test_detect_file_type_unsupported_raises_415():
    with pytest.raises(HTTPException) as exc_info:
        _detect_file_type(b"not a real document")
    assert exc_info.value.status_code == 415


# -- _clean_text ----------------------------------------------------------


def test_clean_text_strips_control_chars():
    assert _clean_text("hello\x00world") == "helloworld"


def test_clean_text_collapses_blank_lines():
    assert _clean_text("a\n\n\n\n\nb") == "a\n\nb"


def test_clean_text_collapses_spaces():
    assert _clean_text("a    b\tc") == "a b c"


def test_clean_text_strips_surrounding_whitespace():
    assert _clean_text("  padded  ") == "padded"


# -- _sanitize_filename ----------------------------------------------------


def test_sanitize_filename_removes_unsafe_chars():
    assert _sanitize_filename("my resume?!.pdf", "pdf") == "my resume.pdf"


def test_sanitize_filename_enforces_extension():
    assert _sanitize_filename("resume", "docx") == "resume.docx"


def test_sanitize_filename_falls_back_when_empty():
    assert _sanitize_filename("???", "pdf") == "resume.pdf"


# -- parse_resume (end-to-end) ---------------------------------------------


async def test_parse_resume_rejects_unsupported_format():
    upload = _make_upload_file(b"just some text", "notes.txt")
    with pytest.raises(HTTPException) as exc_info:
        await parse_resume(upload)
    assert exc_info.value.status_code == 415


async def test_parse_resume_rejects_oversized_file(monkeypatch):
    monkeypatch.setattr(settings, "max_upload_size_bytes", 10)
    upload = _make_upload_file(b"%PDF-1.4" + b"0" * 100, "resume.pdf")
    with pytest.raises(HTTPException) as exc_info:
        await parse_resume(upload)
    assert exc_info.value.status_code == 413


async def test_parse_resume_rejects_empty_docx():
    content = _make_docx_bytes([])
    upload = _make_upload_file(content, "resume.docx")
    with pytest.raises(HTTPException) as exc_info:
        await parse_resume(upload)
    assert exc_info.value.status_code == 422


async def test_parse_resume_extracts_docx_text():
    content = _make_docx_bytes(["Jane Doe", "Software Engineer with 5 years experience"])
    upload = _make_upload_file(content, "Jane Doe's Résumé.docx")
    raw_text, file_type, safe_filename = await parse_resume(upload)

    assert file_type == "docx"
    assert "Jane Doe" in raw_text
    assert "Software Engineer" in raw_text
    assert safe_filename.endswith(".docx")
