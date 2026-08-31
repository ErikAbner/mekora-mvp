import smtplib

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.jobs import TestEmailResponse

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
async def get_config() -> dict:
    """Retorna a configuração SMTP/Kindle atual (senha mascarada)."""
    return {
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_user": settings.smtp_user,
        "smtp_pass_set": bool(settings.smtp_pass),
        "kindle_email": settings.kindle_email,
    }


@router.get("/formatos")
async def formatos() -> dict:
    """Quais arquivos o Mekora aceita.

    A tela listava seis extensões escritas à mão, e elas divergiam nos DOIS
    sentidos: ofereciam `.zip`, que o backend recusa, e escondiam ODT, RTF, TXT,
    HTML, CB7 e CBC, que ele aceita. Quem tivesse um `.odt` olhava a lista e
    concluía que não dava.

    Nenhuma das duas metades do erro apareceria testando: oferecer a mais dá uma
    mensagem de erro depois do upload, e esconder de menos não dá erro nenhum —
    a pessoa simplesmente não tenta.

    A lista sai de `input_router_service`, que é quem decide de verdade para
    onde cada arquivo vai.
    """
    from app.services.input_router_service import COMIC_EXTENSIONS, DOCUMENT_EXTENSIONS

    return {
        "documentos": sorted(DOCUMENT_EXTENSIONS),
        "quadrinhos": sorted(COMIC_EXTENSIONS),
        "todos": sorted(DOCUMENT_EXTENSIONS | COMIC_EXTENSIONS),
    }


@router.post("/test-email", response_model=TestEmailResponse)
async def test_email() -> TestEmailResponse:
    """
    Testa a autenticação SMTP sem enviar arquivos.
    Útil para verificar se as credenciais do .env estão corretas
    antes de tentar um envio real ao Kindle.
    """
    missing = [
        k for k, v in {
            "SMTP_HOST": settings.smtp_host,
            "SMTP_USER": settings.smtp_user,
            "SMTP_PASS": settings.smtp_pass,
        }.items()
        if not v
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Configuração SMTP incompleta. Variáveis ausentes: {', '.join(missing)}",
        )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
        return TestEmailResponse(success=True, message="Autenticação SMTP bem-sucedida.")

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Falha na autenticação SMTP. Verifique SMTP_USER e SMTP_PASS no .env.",
        )
    except smtplib.SMTPConnectError:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível conectar ao servidor SMTP configurado.",
        )
    except (smtplib.SMTPHeloError, smtplib.SMTPNotSupportedError):
        raise HTTPException(
            status_code=502,
            detail="Servidor SMTP recusou o handshake inicial.",
        )
    except smtplib.SMTPException:
        raise HTTPException(
            status_code=502,
            detail="Falha na comunicação com o servidor SMTP.",
        )
    except OSError:
        # DNS/rede — não vazar host, porta, IP, path do resolver
        raise HTTPException(
            status_code=503,
            detail="Servidor SMTP inacessível.",
        )
    except Exception:
        # Último recurso: mensagem fixa, sem str(exc) — evita vazamento
        # de senha/host/user que possam estar em __str__ da exceção
        raise HTTPException(
            status_code=400,
            detail="Erro inesperado ao testar SMTP.",
        )
