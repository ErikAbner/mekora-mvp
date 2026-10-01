#!/usr/bin/env python3
"""Confere a autenticação SMTP sem enviar e-mail e sem imprimir segredos."""

import smtplib
import sys
from pathlib import Path

# Quando executado como `python scripts/verificar-smtp.py`, o primeiro caminho
# de importação é `scripts/`, não a raiz do repositório.
RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from backend.app.core.config import settings


def main() -> int:
    ausentes = [
        nome
        for nome, valor in {
            "SMTP_HOST": settings.smtp_host,
            "SMTP_USER": settings.smtp_user,
            "SMTP_PASS": settings.smtp_pass,
            "KINDLE_EMAIL": settings.kindle_email,
        }.items()
        if not valor
    ]
    if ausentes:
        print("  SMTP não configurado: faltam " + ", ".join(ausentes) + ".")
        return 2

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=8) as servidor:
            servidor.ehlo()
            servidor.starttls()
            servidor.login(settings.smtp_user, settings.smtp_pass)
    except smtplib.SMTPAuthenticationError:
        print("  SMTP recusou a autenticação. Confira o e-mail e a senha de app no .env.")
        return 3
    except (OSError, smtplib.SMTPException):
        print("  SMTP está inacessível agora. Confira a internet e tente novamente.")
        return 4

    return 0


if __name__ == "__main__":
    sys.exit(main())
