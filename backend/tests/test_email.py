"""
Testes unitários do email_service (smtplib mockado).
"""

from __future__ import annotations

import os
import smtplib

import pytest


def _patch_smtp_settings(monkeypatch):
    """Configura settings SMTP válidos para evitar SendFailedError de config."""
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(cfg.settings, "smtp_port", 587)
    monkeypatch.setattr(cfg.settings, "smtp_user", "user@example.com")
    monkeypatch.setattr(cfg.settings, "smtp_pass", "secret123")
    monkeypatch.setattr(cfg.settings, "kindle_email", "kindle@kindle.com")


def test_is_smtp_reachable_true(monkeypatch):
    """SMTP + NOOP bem-sucedido → True."""
    import smtplib as _smtplib
    from unittest.mock import MagicMock

    mock_smtp = MagicMock()
    mock_smtp.__enter__ = lambda s: s
    mock_smtp.__exit__ = MagicMock(return_value=False)
    mock_smtp.noop = MagicMock(return_value=(250, b"OK"))
    monkeypatch.setattr(_smtplib, "SMTP", lambda *a, **kw: mock_smtp)

    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(cfg.settings, "smtp_port", 587)

    from app.services.email_service import is_smtp_reachable

    assert is_smtp_reachable() is True


def test_is_smtp_reachable_false_timeout(monkeypatch):
    """SMTP constructor lança timeout → False."""
    import smtplib as _smtplib
    import socket as _socket

    def raise_timeout(*a, **kw):
        raise _socket.timeout()

    monkeypatch.setattr(_smtplib, "SMTP", raise_timeout)

    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(cfg.settings, "smtp_port", 587)

    from app.services.email_service import is_smtp_reachable

    assert is_smtp_reachable() is False


def test_is_smtp_reachable_false_noop_fail(monkeypatch):
    """Servidor aceita TCP mas NOOP lança SMTPServerDisconnected → False."""
    import smtplib as _smtplib
    from unittest.mock import MagicMock

    mock_smtp = MagicMock()
    mock_smtp.__enter__ = lambda s: s
    mock_smtp.__exit__ = MagicMock(return_value=False)
    mock_smtp.noop.side_effect = _smtplib.SMTPServerDisconnected("dropped")
    monkeypatch.setattr(_smtplib, "SMTP", lambda *a, **kw: mock_smtp)

    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(cfg.settings, "smtp_port", 587)

    from app.services.email_service import is_smtp_reachable

    assert is_smtp_reachable() is False


def test_missing_config_raises(tmp_path, monkeypatch):
    """smtp_host vazio → SendFailedError com 'incompleta'."""
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "smtp_host", "")
    monkeypatch.setattr(cfg.settings, "smtp_port", 587)
    monkeypatch.setattr(cfg.settings, "smtp_user", "")
    monkeypatch.setattr(cfg.settings, "smtp_pass", "")
    monkeypatch.setattr(cfg.settings, "kindle_email", "")

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    from app.services.email_service import SendFailedError, send_epub_to_kindle

    with pytest.raises(SendFailedError, match="incompleta"):
        send_epub_to_kindle(epub, "Livro")


def test_file_too_large(tmp_path, monkeypatch):
    """Arquivo > 50 MB → SendFailedError com 'grande'."""
    _patch_smtp_settings(monkeypatch)

    big_file = tmp_path / "big.epub"
    big_file.touch()
    os.truncate(big_file, 51 * 1024 * 1024)  # 51 MB via sparse file

    from app.services.email_service import SendFailedError, send_epub_to_kindle

    with pytest.raises(SendFailedError, match="grande"):
        send_epub_to_kindle(big_file, "Livro Grande")


def test_smtp_auth_error(tmp_path, monkeypatch):
    """SMTPAuthenticationError → SendFailedError com 'autenticação'."""
    _patch_smtp_settings(monkeypatch)

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    import socket as _socket
    monkeypatch.setattr(_socket, "getaddrinfo", lambda *a, **kw: [])  # DNS ok

    class FakeSMTP:
        def __init__(self, *a, **kw):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def ehlo(self):
            pass

        def starttls(self):
            pass

        def login(self, *a):
            raise smtplib.SMTPAuthenticationError(535, b"authentication failed")

        def send_message(self, *a):
            pass

    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)

    from app.services.email_service import SendFailedError, send_epub_to_kindle

    with pytest.raises(SendFailedError, match="autenticação"):
        send_epub_to_kindle(epub, "Livro Teste")


def test_smtp_connect_error(tmp_path, monkeypatch):
    """SMTPConnectError → SendConnectivityError com 'pendente'."""
    _patch_smtp_settings(monkeypatch)

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    import socket as _socket
    monkeypatch.setattr(_socket, "getaddrinfo", lambda *a, **kw: [])  # DNS ok

    def fake_smtp_init(*a, **kw):
        raise smtplib.SMTPConnectError(421, b"cannot connect")

    monkeypatch.setattr(smtplib, "SMTP", fake_smtp_init)

    from app.services.email_service import SendFailedError, send_epub_to_kindle

    with pytest.raises(SendFailedError, match="pendente"):
        send_epub_to_kindle(epub, "Livro Teste")


def test_socket_gaierror(tmp_path, monkeypatch):
    """socket.gaierror (falha de DNS) → SendFailedError com 'DNS'."""
    _patch_smtp_settings(monkeypatch)

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    import socket as _socket

    def fake_getaddrinfo(*a, **kw):
        raise _socket.gaierror("Name or service not known")

    monkeypatch.setattr(_socket, "getaddrinfo", fake_getaddrinfo)

    from app.services.email_service import SendFailedError, send_epub_to_kindle

    with pytest.raises(SendFailedError, match="DNS"):
        send_epub_to_kindle(epub, "Livro Teste")


def test_smtp_server_disconnected(tmp_path, monkeypatch):
    """SMTPServerDisconnected durante send → SendConnectivityError com 'pendente'."""
    _patch_smtp_settings(monkeypatch)

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    import socket as _socket
    monkeypatch.setattr(_socket, "getaddrinfo", lambda *a, **kw: [])  # DNS ok

    class FakeSMTP:
        def __init__(self, *a, **kw):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def ehlo(self):
            pass

        def starttls(self):
            pass

        def login(self, *a):
            pass

        def send_message(self, *a):
            raise smtplib.SMTPServerDisconnected("Server not connected")

    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)

    from app.services.email_service import SendFailedError, send_epub_to_kindle

    with pytest.raises(SendFailedError, match="pendente"):
        send_epub_to_kindle(epub, "Livro Teste")


def test_smtp_connect_error_raises_connectivity(tmp_path, monkeypatch):
    """SMTPConnectError → instância de SendConnectivityError (não só SendFailedError)."""
    _patch_smtp_settings(monkeypatch)

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    import socket as _socket
    monkeypatch.setattr(_socket, "getaddrinfo", lambda *a, **kw: [])

    def fake_smtp_init(*a, **kw):
        raise smtplib.SMTPConnectError(421, b"cannot connect")

    monkeypatch.setattr(smtplib, "SMTP", fake_smtp_init)

    from app.services.email_service import SendConnectivityError, send_epub_to_kindle

    with pytest.raises(SendConnectivityError, match="pendente"):
        send_epub_to_kindle(epub, "Livro Teste")


def test_smtp_server_disconnected_raises_connectivity(tmp_path, monkeypatch):
    """SMTPServerDisconnected durante send_message → SendConnectivityError."""
    _patch_smtp_settings(monkeypatch)

    epub = tmp_path / "book.epub"
    epub.write_bytes(b"PK fake epub content")

    import socket as _socket
    monkeypatch.setattr(_socket, "getaddrinfo", lambda *a, **kw: [])

    class FakeSMTP:
        def __init__(self, *a, **kw):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

        def ehlo(self):
            pass

        def starttls(self):
            pass

        def login(self, *a):
            pass

        def send_message(self, *a):
            raise smtplib.SMTPServerDisconnected("dropped")

    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)

    from app.services.email_service import SendConnectivityError, send_epub_to_kindle

    with pytest.raises(SendConnectivityError, match="pendente"):
        send_epub_to_kindle(epub, "Livro Teste")
