#!/usr/bin/env python3
"""
Script de configuração do modelo NLLB-200 para tradução premium — Fase C.

Verifica dependências, baixa o modelo do Hugging Face Hub para o diretório
local de armazenamento do projeto e confirma a instalação.

Uso:
    python scripts/setup_nllb.py
    python scripts/setup_nllb.py --model facebook/nllb-200-distilled-1.3B
    python scripts/setup_nllb.py --check   (apenas verifica, não baixa)

O modelo é salvo em: <projeto>/storage/models/nllb/
Esse caminho é lido automaticamente pelo NllbTranslatorEngine.

IMPORTANTE: Este script nunca é executado automaticamente.
            O download só acontece quando você rodá-lo explicitamente.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Localizar raiz do projeto (../../ a partir de scripts/)
# ---------------------------------------------------------------------------

_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
_MODEL_DIR = _PROJECT_ROOT / "storage" / "models" / "nllb"

DEFAULT_MODEL = "facebook/nllb-200-distilled-600M"


def _check_deps() -> bool:
    """Verifica se torch, transformers e huggingface_hub estão instalados."""
    missing = []
    for pkg in ("torch", "transformers", "huggingface_hub"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(
            f"\n[ERRO] Dependências faltando: {', '.join(missing)}\n"
            f"       Execute primeiro:\n"
            f"           pip install -r requirements-nllb.txt\n",
            file=sys.stderr,
        )
        return False
    return True


def _is_model_ready(model_dir: Path) -> bool:
    """True se o diretório existe e contém config.json (indicativo de modelo completo)."""
    return model_dir.exists() and (model_dir / "config.json").exists()


def _download_model(model_name: str, model_dir: Path) -> bool:
    """Baixa o modelo usando huggingface_hub.snapshot_download."""
    try:
        from huggingface_hub import snapshot_download  # type: ignore[import-untyped]
    except ImportError:
        print("[ERRO] huggingface_hub não instalado.", file=sys.stderr)
        return False

    model_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nBaixando modelo: {model_name}")
    print(f"Destino: {model_dir}")
    print("Isso pode levar alguns minutos dependendo da conexão...\n")

    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=str(model_dir),
            local_dir_use_symlinks=False,
        )
        print(f"\n[OK] Modelo '{model_name}' baixado com sucesso em:\n     {model_dir}\n")
        return True
    except Exception as exc:
        print(f"\n[ERRO] Falha ao baixar o modelo: {exc}", file=sys.stderr)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Instala o modelo NLLB-200 para tradução premium local.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Nome do modelo no Hugging Face Hub (padrão: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Apenas verifica o status da instalação, sem baixar nada.",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Kindle Local Tool — Setup NLLB")
    print("=" * 60)

    # 1. Verificar dependências Python
    print("\n[1/3] Verificando dependências Python...")
    if not _check_deps():
        sys.exit(1)
    print("      torch ✓  transformers ✓  huggingface_hub ✓")

    # 2. Verificar se modelo já está disponível
    print(f"\n[2/3] Verificando modelo: {args.model}")
    if _is_model_ready(_MODEL_DIR):
        print(f"      Modelo já instalado em: {_MODEL_DIR}")
        if args.check:
            print("\n[OK] NLLB está pronto para uso!\n")
            return
        print("      Para re-baixar, remova o diretório manualmente e rode novamente.")
        print("\n[OK] NLLB já está configurado.\n")
        return

    if args.check:
        print(f"      Modelo NÃO encontrado em: {_MODEL_DIR}")
        print(
            "\n[INFO] Para instalar, execute sem --check:\n"
            "       python scripts/setup_nllb.py\n"
        )
        sys.exit(1)

    # 3. Download
    print(f"\n[3/3] Iniciando download...")
    if not _download_model(args.model, _MODEL_DIR):
        sys.exit(1)

    # Confirmação final
    if _is_model_ready(_MODEL_DIR):
        print("Instalação concluída. O motor NLLB está pronto para uso.")
        print("Ative-o em Configurações → Tradução → Habilitar NLLB.\n")
    else:
        print("[AVISO] Download concluído, mas config.json não encontrado.", file=sys.stderr)
        print("        O modelo pode estar incompleto. Tente novamente.\n", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
