"""
Serviço de envio ao Kindle via SMTP — Fase 6.

Envia o EPUB gerado para o endereço de email do Kindle físico do usuário
usando um Gmail (ou outro SMTP) previamente autorizado na Amazon como remetente.

Pré-requisitos:
    - SMTP_HOST, SMTP_USER, SMTP_PASS e KINDLE_EMAIL definidos no .env
    - O endereço SMTP_USER deve estar na lista de remetentes aprovados da Amazon:
      https://www.amazon.com/hz/mycd/myx#/home/settings/payment
    - Limite: 50 MB por email (imposto pela Amazon)
"""

from __future__ import annotations

import smtplib
import socket
from email.message import EmailMessage
from pathlib import Path

# Limite de tamanho imposto pelo serviço Send-to-Kindle da Amazon (50 MB)
MAX_SIZE_BYTES = 50 * 1024 * 1024


class SendFailedError(Exception):
    """Lançada quando o envio ao Kindle falha por qualquer motivo."""


class SendConnectivityError(SendFailedError):
    """Lançada quando o envio falha por problema de conectividade temporário.

    Cobre: SMTPConnectError, SMTPServerDisconnected, BrokenPipeError.
    O job deve ser marcado como 'pending' para retry posterior.
    """


def is_smtp_reachable(timeout: float = 3.0) -> bool:
    """Verifica se o servidor SMTP está acessível e responde ao handshake.

    Abre uma sessão SMTP e envia NOOP para confirmar que o servidor processa
    comandos. Cobre: DNS, porta bloqueada, timeout e desconexão imediata.
    """
    from app.core.config import settings

    if not settings.smtp_host or not settings.smtp_port:
        return False
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=timeout) as smtp:
            smtp.noop()
        return True
    except Exception:
        return False


def send_epub_to_kindle(epub_path: Path, title: str) -> None:
    """
    Envia *epub_path* ao endereço configurado em KINDLE_EMAIL via SMTP + STARTTLS.

    Args:
        epub_path: Caminho local do arquivo EPUB a enviar.
        title:     Título do livro (não usado no subject — Amazon processa pelo MIME).

    Raises:
        SendFailedError: Se a configuração estiver incompleta, o arquivo for muito
                         grande, ou ocorrer qualquer falha SMTP durante o envio.
    """
    # Importação local para evitar circular import durante testes de módulo
    from app.core.config import settings

    # --- Validar configuração SMTP ---
    missing = [
        k for k, v in {
            "SMTP_HOST": settings.smtp_host,
            "SMTP_USER": settings.smtp_user,
            "SMTP_PASS": settings.smtp_pass,
            "KINDLE_EMAIL": settings.kindle_email,
        }.items()
        if not v
    ]
    if missing:
        raise SendFailedError(
            f"Configuração SMTP incompleta. Variáveis ausentes: {', '.join(missing)}"
        )

    # --- Validar tamanho do arquivo ---
    size = epub_path.stat().st_size
    if size > MAX_SIZE_BYTES:
        raise SendFailedError(
            f"Arquivo muito grande: {size / 1_048_576:.1f} MB "
            f"(limite Amazon: 50 MB por email)."
        )

    # --- Montar mensagem ---
    msg = EmailMessage()
    msg["From"] = settings.smtp_user
    msg["To"] = settings.kindle_email
    msg["Subject"] = ""  # Subject vazio: Amazon identifica o livro pelo nome do anexo
    msg.add_attachment(
        epub_path.read_bytes(),
        maintype="application",
        subtype="epub+zip",
        filename=epub_path.name,
    )

    # --- Verificar resolução de DNS antes de tentar conectar ---
    try:
        socket.getaddrinfo(settings.smtp_host, settings.smtp_port)
    except socket.gaierror:
        raise SendFailedError(
            f"Falha na resolução de DNS para '{settings.smtp_host}'. "
            "Verifique sua conexão de internet e se o SMTP_HOST está correto."
        )

    # --- Enviar via SMTP + STARTTLS ---
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.smtp_user, settings.smtp_pass)
            smtp.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise SendFailedError(
            "Falha na autenticação SMTP. Verifique SMTP_USER e SMTP_PASS no .env."
        )
    except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, BrokenPipeError):
        raise SendConnectivityError(
            "SMTP indisponível – tentativa marcada como pendente."
        )
    except Exception as exc:
        raise SendFailedError(str(exc)) from exc
