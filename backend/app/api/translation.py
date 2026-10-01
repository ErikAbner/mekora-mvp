"""
Endpoints de status das engines de tradução — Fase C.

GET /translation/engines       — lista engines disponíveis com status
GET /translation/models/status — detalhes de disponibilidade do NLLB
GET /translation/engines/pairs — pares Argos instalados
GET /tools/comic-status        — status combinado KCC + Argos (para pré-checagem no frontend)
"""

from __future__ import annotations

from fastapi import APIRouter

from app.services.app_config_service import load_app_config
from app.services.translation_model_service import get_engines_status, get_nllb_detail

router = APIRouter(tags=["translation"])


@router.get("/translation/engines")
def list_engines() -> dict:
    """
    Lista as engines de tradução disponíveis e seu status de disponibilidade.

    Argos é sempre listado. NLLB aparece somente se `nllb_enabled` estiver
    habilitado nas configurações do app.
    """
    cfg = load_app_config()
    return get_engines_status(cfg)


@router.get("/translation/engines/pairs")
def list_available_pairs() -> dict:
    """
    Retorna os pares de idioma instalados por engine.

    Argos: lista pares reais instalados localmente (depende de pacotes baixados).
    Retorna [{src, tgt}] em códigos ISO 639-2 de 3 letras (por, eng, spa...).
    """
    from app.services.translation_engine import ArgosTranslatorEngine

    engine = ArgosTranslatorEngine()
    argos_pairs = engine.get_installed_pairs()
    return {"argos": argos_pairs}


@router.get("/tools/comic-status")
def comic_tools_status() -> dict:
    """A bandeira vem PRIMEIRO, e o resto continua sendo relatado.

    Esta rota é pré-checagem: a tela lê daqui se dá para converter quadrinho.
    Com a conversão desligada ela precisa dizer isso — e não 503, porque quem
    pergunta "dá?" merece "não, e por quê", não uma porta fechada. Os campos de
    KCC e Argos continuam vindo: eles descrevem a máquina, e não a permissão.

    Status combinado das dependências do pipeline comic:
    - kcc: disponível, caminho
    - argos: biblioteca instalada, pares disponíveis
    - argos_library_installed: bool (distinção entre "lib ausente" e "sem pacotes")

    Permite ao frontend pré-checar antes de exibir ações de conversão/tradução.
    """
    from app.services.kcc_service import get_kcc_status
    from app.services.translation_engine import ArgosTranslatorEngine

    kcc = get_kcc_status()

    argos_library_installed = False
    argos_pairs: list[dict] = []
    try:
        engine = ArgosTranslatorEngine()
        argos_pairs = engine.get_installed_pairs()
        argos_library_installed = True
    except Exception:
        pass

    from app.core import quadrinhos

    return {
        "quadrinhos_ligados": quadrinhos.ligados(),
        "razao": None if quadrinhos.ligados() else quadrinhos.RAZAO,
        "kcc": kcc,
        "argos": {
            "library_installed": argos_library_installed,
            "pairs": argos_pairs,
        },
    }


@router.get("/translation/models/status")
def models_status() -> dict:
    """
    Retorna detalhes de disponibilidade do modelo NLLB:
    torch instalado, transformers instalado, modelo em disco, caminho local.
    """
    cfg = load_app_config()
    return get_nllb_detail(cfg)
