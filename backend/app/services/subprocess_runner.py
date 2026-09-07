"""
v1.2.2 — Execução controlada de ferramentas externas.

Substitui chamadas espalhadas a `subprocess.run(cmd, capture_output=True)`
por um helper único que aplica:

- `shell=False`, argumentos como lista (nunca string concatenada)
- timeout explícito por chamada; ao expirar, encerra o processo e filhos
- captura de stdout/stderr limitada em bytes (evita crescimento absurdo)
- mensagens públicas curtas, sem paths absolutos nem stack trace
- erro de domínio único (`ExternalToolError`) para os serviços consumirem

Não substitui a chamada a `ocrmypdf.ocr()` — essa é uma função in-process
da biblioteca, sem processo-filho controlado. Ver docstring de
`OCR_LIMITATION` abaixo.
"""

from __future__ import annotations

import os
import re
import signal
import subprocess
from pathlib import Path
from typing import Callable, Optional, Sequence

from app.core.limits import limits

OCR_LIMITATION = (
    "OCRmyPDF é executado como biblioteca in-process (não subprocess). "
    "Um timeout de thread apenas devolveria erro à UI enquanto o OCR "
    "continua rodando em background — o cancelamento cooperativo já "
    "implementado (progress_service) + os limites de upload/páginas/imagens "
    "são os controles atuais. Refatoração para processo-filho fica registrada "
    "como melhoria futura."
)


class ExternalToolCancelled(Exception):
    """A pessoa pediu para parar, e o processo externo foi encerrado.

    Ela existe SEPARADA de `ExternalToolError` de propósito: cancelar não é
    falhar. Tratar as duas juntas faria o job terminar em "error" — e a decisão
    do Erik em 07/09 diz o contrário, com todas as letras: "não transformar
    cancelamento voluntário em erro".
    """


class ExternalToolError(Exception):
    """Erro de domínio único para falhas de ferramenta externa."""

    def __init__(
        self,
        code: str,
        public_message: str,
        *,
        redacted_detail: str = "",
    ) -> None:
        self.code = code
        # `public_message` vai para HTTP/UI — curto, sem paths, sem stack trace
        self.public_message = public_message
        # `redacted_detail` fica só para log local; NUNCA propagado à UI
        self.redacted_detail = redacted_detail
        super().__init__(public_message)


# ---------------------------------------------------------------------------
# Redação de output
# ---------------------------------------------------------------------------

_HOME = str(Path.home())
_PROJECT_ROOT = str(Path(__file__).resolve().parents[3])

# Padrões que não devem escapar do log local para a resposta HTTP
_ABS_PATH_RE = re.compile(r"(?:/[\w.\-]+){2,}")


def _clip(data: bytes, limit_bytes: int) -> str:
    """Decodifica e trunca ao limite. Nunca lança."""
    if not data:
        return ""
    if len(data) > limit_bytes:
        data = data[:limit_bytes] + b"\n...[truncated]"
    try:
        return data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _redact_public(text: str) -> str:
    """
    Redige paths locais em mensagens PÚBLICAS.
    Substitui HOME → "~", raiz do projeto → "<project>", demais absolutos
    → "<path>".
    """
    if not text:
        return ""
    txt = text.replace(_PROJECT_ROOT, "<project>").replace(_HOME, "~")
    txt = _ABS_PATH_RE.sub("<path>", txt)
    return txt.strip()


# ---------------------------------------------------------------------------
# Validação de path de entrada (defesa em profundidade)
# ---------------------------------------------------------------------------

def _validate_input_path(input_path: Path, allowed_roots: Sequence[Path]) -> None:
    """
    Defesa em profundidade: garante que `input_path` está contido em algum
    `allowed_roots`. Se `input_path` NÃO existe em disco, deixa a ferramenta
    externa reportar o erro (o serviço já foi chamado com path do banco;
    tratar como out-of-scope aqui geraria falso-positivo com paths de teste).
    """
    try:
        resolved = input_path.resolve()
    except (OSError, ValueError):
        return  # Sem containment aplicável — subprocess falhará naturalmente
    if not resolved.exists():
        return
    for root in allowed_roots:
        try:
            root_resolved = root.resolve()
        except (OSError, ValueError):
            continue
        try:
            resolved.relative_to(root_resolved)
            return
        except ValueError:
            continue
    raise ExternalToolError(
        "INPUT_PATH_OUT_OF_SCOPE",
        "Arquivo de entrada fora do diretório permitido.",
    )


# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------

def run_external(
    cmd: Sequence[str],
    *,
    timeout_seconds: int,
    tool_label: str,
    input_path: Optional[Path] = None,
    allowed_roots: Optional[Sequence[Path]] = None,
    output_limit_bytes: Optional[int] = None,
    deve_parar: Optional[Callable[[], bool]] = None,
    intervalo_de_checagem: float = 0.5,
) -> subprocess.CompletedProcess:
    """
    Executa `cmd` com `shell=False`, timeout, captura limitada e limpeza.

    - Se `input_path` + `allowed_roots` forem passados, valida contenção
      antes de invocar o processo (defesa em profundidade).
    - No timeout: `Popen.kill()` + `communicate()` para colher o que tiver
      escrito; se o processo abriu grupo (POSIX), envia sinal ao grupo.
    - Sucesso (returncode == 0) retorna o CompletedProcess com stdout/stderr
      já truncados.
    - Retorno != 0 levanta `ExternalToolError` com mensagem pública curta e
      detalhe redigido para log.
    - Se `deve_parar` for passado, a espera vira um laço de fatias de
      `intervalo_de_checagem` segundos e a função é consultada entre elas. Um
      "sim" mata o grupo e levanta `ExternalToolCancelled` — que NÃO é erro.
    """
    if not cmd or not isinstance(cmd, (list, tuple)):
        raise ExternalToolError(
            "INTERNAL",
            "Comando externo inválido.",
            redacted_detail=f"cmd type={type(cmd).__name__}",
        )
    if any(not isinstance(part, str) for part in cmd):
        raise ExternalToolError(
            "INTERNAL",
            "Comando externo inválido.",
            redacted_detail="non-string arg",
        )

    if input_path is not None and allowed_roots:
        _validate_input_path(input_path, allowed_roots)

    limit = output_limit_bytes or limits.subprocess_output_max_bytes

    # start_new_session=True cria um grupo próprio no POSIX, permitindo
    # matar processos-filhos (ex.: KCC dispara worker de renderização).
    popen_kwargs: dict = {
        "stdout": subprocess.PIPE,
        "stderr": subprocess.PIPE,
        "shell": False,
    }
    if os.name == "posix":
        popen_kwargs["start_new_session"] = True

    try:
        proc = subprocess.Popen(list(cmd), **popen_kwargs)
    except FileNotFoundError:
        raise ExternalToolError(
            "TOOL_NOT_FOUND",
            f"{tool_label} não encontrado no PATH.",
            redacted_detail=_redact_public(cmd[0]),
        )
    except (OSError, ValueError) as exc:
        raise ExternalToolError(
            "TOOL_LAUNCH_FAILED",
            f"Não foi possível iniciar {tool_label}.",
            redacted_detail=type(exc).__name__,
        )

    def _encerrar_grupo() -> None:
        """Mata o processo e os filhos dele. No POSIX o grupo inteiro, porque
        `ebook-convert` dispara workers que sobrevivem ao pai."""
        try:
            if os.name == "posix":
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except (ProcessLookupError, PermissionError):
                    proc.kill()
            else:
                proc.kill()
        except Exception:
            pass

    try:
        if deve_parar is None:
            stdout_b, stderr_b = proc.communicate(timeout=timeout_seconds)
        else:
            # ESPERA EM FATIAS, para poder perguntar "devo parar?".
            #
            # `communicate` bloqueia até o fim ou até o timeout, e não há como
            # interrompê-lo — era por isso que cancelar durante a conversão não
            # fazia nada: a marca de cancelamento era escrita e ninguém a lia,
            # porque `ebook-convert` é UMA etapa longa, sem checkpoint por onde
            # o cancelamento cooperativo pudesse entrar.
            #
            # O laço não lê stdout enquanto espera, e isso é seguro aqui: as
            # ferramentas deste projeto escrevem pouco em stdout/stderr e o
            # `_clip` já trunca. Se alguma passar a escrever o suficiente para
            # encher o cano do sistema operacional, ela travaria — e o timeout
            # total continua sendo o teto.
            restante = float(timeout_seconds)
            while True:
                if deve_parar():
                    _encerrar_grupo()
                    try:
                        proc.communicate(timeout=5)
                    except Exception:
                        pass
                    raise ExternalToolCancelled(tool_label)
                try:
                    stdout_b, stderr_b = proc.communicate(timeout=min(intervalo_de_checagem, restante))
                    break
                except subprocess.TimeoutExpired:
                    restante -= intervalo_de_checagem
                    if restante <= 0:
                        raise
    except subprocess.TimeoutExpired:
        _encerrar_grupo()
        try:
            stdout_b, stderr_b = proc.communicate(timeout=5)
        except Exception:
            stdout_b, stderr_b = b"", b""
        raise ExternalToolError(
            "TOOL_TIMEOUT",
            f"{tool_label} não respondeu no tempo limite "
            f"({timeout_seconds}s). Tente novamente ou reduza o arquivo.",
            redacted_detail=_redact_public(_clip(stderr_b or stdout_b, 512)),
        )

    stdout = _clip(stdout_b or b"", limit)
    stderr = _clip(stderr_b or b"", limit)

    if proc.returncode != 0:
        # Mensagem pública curta; detalhe (redigido) só para log
        raise ExternalToolError(
            "TOOL_FAILED",
            f"{tool_label} falhou ao processar o arquivo "
            f"(código {proc.returncode}).",
            redacted_detail=_redact_public(stderr or stdout),
        )

    return subprocess.CompletedProcess(
        args=list(cmd),
        returncode=proc.returncode,
        stdout=stdout,
        stderr=stderr,
    )
