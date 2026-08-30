"""v1.2.2 — SMTP: mensagens públicas nunca vazam segredos (P7)."""
from __future__ import annotations

import smtplib

SECRET_PASS = "TestSecretPassword_XYZ_12345"
SECRET_HOST = "internal.mail.example.local"
SECRET_USER = "user_bob@example.com"


def _monkey_smtp(monkeypatch, raiser):
    monkeypatch.setattr(smtplib, "SMTP", lambda *a, **kw: raiser())


class _Ctx:
    def __init__(self, *a, **kw): pass
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def ehlo(self): pass
    def starttls(self): pass
    def login(self, u, p): raise self._exc


def _install_smtp_raising(monkeypatch, exc: BaseException) -> None:
    """Faz o `smtplib.SMTP(...)` retornar um context que lança `exc` no login."""
    def _factory(*args, **kwargs):
        c = _Ctx()
        c._exc = exc
        return c
    import smtplib as _smtplib
    monkeypatch.setattr(_smtplib, "SMTP", _factory)


def _fill_env(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "smtp_host", SECRET_HOST)
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_user", SECRET_USER)
    monkeypatch.setattr(settings, "smtp_pass", SECRET_PASS)
    monkeypatch.setattr(settings, "kindle_email", "kindle_bob@kindle.com")


def _assert_no_leak(text: str) -> None:
    """A resposta pública nunca pode conter senha, usuário ou host reais."""
    lowered = text.lower()
    assert SECRET_PASS.lower() not in lowered
    assert SECRET_HOST.lower() not in lowered
    assert SECRET_USER.lower() not in lowered
    # Também nenhum path absoluto do resolver
    assert "/etc/resolv" not in lowered


def test_generic_exception_returns_fixed_message(client, monkeypatch):
    _fill_env(monkeypatch)
    class _Exotic(Exception):
        def __str__(self): return f"boom host={SECRET_HOST} pass={SECRET_PASS}"
    _install_smtp_raising(monkeypatch, _Exotic("nope"))
    r = client.post("/config/test-email")
    assert r.status_code in (400, 502, 503)
    _assert_no_leak(r.text)


def test_auth_error_returns_fixed_message(client, monkeypatch):
    _fill_env(monkeypatch)
    _install_smtp_raising(
        monkeypatch,
        smtplib.SMTPAuthenticationError(535, f"5.7.8 Wrong password: {SECRET_PASS}"),
    )
    r = client.post("/config/test-email")
    assert r.status_code == 401
    _assert_no_leak(r.text)


def test_connect_error_hides_host(client, monkeypatch):
    _fill_env(monkeypatch)
    _install_smtp_raising(
        monkeypatch,
        smtplib.SMTPConnectError(421, f"Cannot reach {SECRET_HOST}"),
    )
    r = client.post("/config/test-email")
    assert r.status_code == 502
    _assert_no_leak(r.text)


def test_os_error_hides_details(client, monkeypatch):
    _fill_env(monkeypatch)
    _install_smtp_raising(
        monkeypatch,
        OSError(f"DNS failure resolving {SECRET_HOST} (see /etc/resolv.conf)"),
    )
    r = client.post("/config/test-email")
    assert r.status_code == 503
    _assert_no_leak(r.text)
