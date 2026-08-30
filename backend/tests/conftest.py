"""
Fixtures compartilhadas para os testes do Kindle Local Tool.

Estratégia de isolamento:
- banco de dados: SQLite em arquivo temporário por teste
- storage: diretórios dentro de tmp_path (sem tocar em storage/ real)
- config.json: CONFIG_PATH redirecionado para tmp_path
- SessionLocal patchado para que background tasks usem o banco de teste
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Garante que backend/ esteja no sys.path (necessário ao rodar de fora do diretório)
_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))


@pytest.fixture(scope="function")
def tmp_storage(tmp_path, monkeypatch):
    """Redireciona todas as constantes de storage e CONFIG_PATH para tmp_path."""
    import app.core.config as cfg

    dirs = {
        "STORAGE_INPUT": tmp_path / "input",
        "STORAGE_OUTPUT": tmp_path / "output",
        "STORAGE_TEMP": tmp_path / "temp",
        "STORAGE_COVERS": tmp_path / "covers",
        "STORAGE_LOGS": tmp_path / "logs",
    }
    for name, path in dirs.items():
        path.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cfg, name, path)

    # Redirecionar CONFIG_PATH do app_config_service
    import app.services.app_config_service as acs

    monkeypatch.setattr(acs, "CONFIG_PATH", tmp_path / "config.json")

    # Redirecionar PRESET_PATH do preset_service (Fase K)
    import app.services.preset_service as ps

    monkeypatch.setattr(ps, "PRESET_PATH", tmp_path / "config_presets.json")

    return tmp_path


@pytest.fixture(scope="function")
def test_engine(tmp_path):
    """Engine SQLite isolado para cada teste."""
    db_path = tmp_path / "test_kindle.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    from app.db.database import Base
    from app.models.pessoa import Chave, Pessoa, Sessao  # noqa: F401 — registra modelos de acesso
    from app.models.processing_job import ProcessingJob  # noqa: F401 — registra modelo
    from app.models.stage_metric import StageMetric  # noqa: F401 — registra modelo Fase L

    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


class _ClienteQueProvaAcesso(TestClient):
    """TestClient que apresenta a chave do trabalho automaticamente.

    A partir da DEC-0039 toda rota com o número de um trabalho no caminho exige
    prova de acesso: a sessão do dono, ou a chave do trabalho no cabeçalho
    `X-Mekora-Chave`. Sem prova, 404.

    Os testes deste repositório testam CONVERSÃO, OCR, tradução e quadrinho — a
    autorização é ortogonal ao que cada um deles verifica. Fazê-los todos
    entrar na conta antes acrescentaria ruído a 66 arquivos e não provaria nada
    de novo.

    Então este cliente busca a chave no banco e a apresenta, como o navegador
    faz. Ele NÃO é usado nos testes de acesso: `test_acesso.py` usa `client_cru`,
    porque um cliente que se autoriza sozinho não pode ser o que prova que a
    autorização existe.
    """

    def __init__(self, app, engine):
        super().__init__(app)
        self._engine = engine

    def request(self, method, url, *args, **kwargs):
        chave = self._chave_do_caminho(str(url))
        if chave:
            cabecalhos = dict(kwargs.get("headers") or {})
            cabecalhos.setdefault("X-Mekora-Chave", chave)
            kwargs["headers"] = cabecalhos
        return super().request(method, url, *args, **kwargs)

    def _chave_do_caminho(self, url):
        import re

        from sqlalchemy import text as _text

        m = re.search(r"/(?:jobs|analyze|batch)/(\d+)", url)
        if not m:
            return None
        try:
            with self._engine.connect() as c:
                linha = c.execute(
                    _text("SELECT token_publico FROM processing_jobs WHERE id = :i"),
                    {"i": int(m.group(1))},
                ).fetchone()
            return linha[0] if linha else None
        except Exception:
            return None


@pytest.fixture(scope="function")
def client(test_engine, tmp_storage, monkeypatch):
    """TestClient com banco e storage isolados. Patches SessionLocal globalmente."""
    import app.db.database as db_mod

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    # Patch SessionLocal para que _bg_analyze/_bg_convert usem o banco de teste
    monkeypatch.setattr(db_mod, "SessionLocal", TestingSessionLocal)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from main import app  # noqa: backend/ está em sys.path
    from app.db.database import get_db

    app.dependency_overrides[get_db] = override_get_db

    with _ClienteQueProvaAcesso(app, test_engine) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client_cru(test_engine, tmp_storage, monkeypatch):
    """TestClient sem nenhuma prova de acesso — o que um estranho tem.

    É com ele que se testa a porta. O `client` comum apresenta a chave sozinho,
    e usá-lo aqui faria os testes de autorização passarem sempre.
    """
    import app.db.database as db_mod

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    monkeypatch.setattr(db_mod, "SessionLocal", TestingSessionLocal)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from main import app  # noqa
    from app.db.database import get_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_pdf(tmp_path):
    """Cria um PDF mínimo válido usando PyMuPDF (sem dependência extra)."""
    import fitz  # PyMuPDF

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 72), "Sample PDF for testing. Hello Kindle!")
    pdf_path = tmp_path / "sample.pdf"
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


@pytest.fixture
def logado(client, test_engine, monkeypatch):
    """Entra no Mekora e devolve `(email, pessoa_id)`.

    O id vem junto porque um teste que cria `ProcessingJob` direto no banco
    precisa dizer de quem ele é — do contrário a estante não o mostra, e com
    razão: trabalho sem dono não pertence a quem logou primeiro.

    A partir da DEC-0039 a estante pertence a alguém: `/history` responde com os
    trabalhos de quem pede, e vazio para quem não entrou. Testes que esperam ver
    o que enviaram precisam ter entrado — que é também o que a pessoa faz.
    """
    from app.services import acesso_service

    caixa = []
    monkeypatch.setattr(
        acesso_service, "enviar_link", lambda email, token, base_url: caixa.append(token)
    )

    from sqlalchemy.orm import Session as _Session

    from app.models.pessoa import Pessoa

    email = "teste@exemplo.com"
    client.post("/entrar", json={"email": email})
    client.get(f"/entrar/{caixa[-1]}", follow_redirects=False)
    with _Session(test_engine) as db:
        return email, db.query(Pessoa).filter(Pessoa.email == email).one().id
