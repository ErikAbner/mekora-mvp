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
    # O MESMO PRAGMA do produto: sem ele o SQLite ignora chave estrangeira, e o
    # teste de apagar conta provaria o contrário do que acontece no ar.
    from app.db.database import ligar_chaves_estrangeiras

    ligar_chaves_estrangeiras(engine)

    from app.db.database import Base
    from app.models.pessoa import Chave, Pessoa, Sessao  # noqa: F401 — registra modelos de acesso
    from app.models.aparelho import Aparelho  # noqa: F401 — registra os Kindles
    from app.models.canvas import Ligacao, NoCanvas  # noqa: F401 — registra o Canvas
    from app.models.estudo import Estudo, EstudoNota  # noqa: F401 — registra os Estudos
    from app.models.nota import Nota  # noqa: F401 — registra as notas
    from app.models.preferencia import Preferencia  # noqa: F401 — registra as preferências
    from app.models.progresso import Progresso  # noqa: F401 — registra onde a pessoa parou
    from app.models.marcador import Marcador  # noqa: F401 — registra os marcadores
    from app.models.processing_job import ProcessingJob  # noqa: F401 — registra modelo
    from app.models.stage_metric import StageMetric  # noqa: F401 — registra modelo Fase L
    from app.models.grupo_ignorado import GrupoIgnorado  # noqa: F401 — registra os grupos calados
    from app.models.recado import Recado  # noqa: F401 — registra os recados

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

    ELE TAMBÉM ENTRA NUMA CONTA. Em 31/08 uma revisão do conjunto fechou as
    rotas que falam da INSTALAÇÃO — `/config`, `/app-config`, `/presets`,
    `/metrics` —, que estavam abertas a qualquer visitante e devolviam, entre
    outras coisas, o endereço de Kindle real de alguém.

    Isso quebrou 116 testes de uma vez, todos com `assert 401 == 200`. Nenhum
    deles estava errado: eles descreviam o produto de antes das contas. A saída
    fácil seria desligar a porta durante os testes, e ela é a pior possível —
    testes que rodam com a proteção desligada não percebem quando ela some.

    Então o cliente entra numa conta de teste, como uma pessoa entra.

    Ele NÃO é usado nos testes de acesso: `test_acesso.py` usa `client_cru`,
    porque um cliente que se autoriza sozinho não pode ser o que prova que a
    autorização existe.
    """

    def __init__(self, app, engine):
        super().__init__(app)
        self._engine = engine
        self.cookies.set("mekora_sessao", self._abrir_sessao())

    def _abrir_sessao(self):
        """Cria uma pessoa e uma sessão direto no banco de teste.

        Pelo fluxo de verdade seria pedir um link e abri-lo — e isso exigiria um
        servidor de e-mail em cada um dos 66 arquivos de teste. O caminho do
        link é provado em `test_acesso.py`, uma vez, onde ele é o assunto.
        """
        from datetime import timedelta

        from sqlalchemy.orm import sessionmaker

        from app.models.pessoa import Pessoa, Sessao, agora
        from app.services.acesso_service import resumir

        Sessao_ = sessionmaker(bind=self._engine)
        db = Sessao_()
        try:
            pessoa = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first()
            if pessoa is None:
                pessoa = Pessoa(email="teste@mekora.local")
                db.add(pessoa)
                db.flush()
            token = "sessao-de-teste"
            if not db.query(Sessao).filter(Sessao.resumo == resumir(token)).first():
                db.add(Sessao(
                    pessoa_id=pessoa.id,
                    resumo=resumir(token),
                    expira_em=agora() + timedelta(days=1),
                ))
            db.commit()
            return token
        finally:
            db.close()

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

    # A janela de envios é um dicionário de módulo: sem limpar, um teste que
    # sobe muitos arquivos faz o próximo receber 429 sem ter feito nada.
    from app.api import vazao
    vazao._envios.clear()

    # A CONTA DE TESTE É A DONA DA INSTALAÇÃO DE TESTE.
    #
    # Pela mesma razão da porta de conta, uma linha acima: `/config`,
    # `/app-config` e `/presets` passaram a exigir DONO, e desligar a porta
    # durante os testes seria testar um produto que não existe. Então a pessoa
    # de teste é nomeada dona — como o Erik é dono da instalação dele.
    #
    # Quem prova que a porta existe é `test_acesso.py`, com `client_cru` e com
    # uma pessoa que NÃO está nesta lista.
    from app.core.config import settings
    monkeypatch.setattr(settings, "dono_email", "teste@mekora.local")

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
    client.post("/entrar/pedir", json={"email": email})
    client.get(f"/entrar/{caixa[-1]}", follow_redirects=False)
    with _Session(test_engine) as db:
        return email, db.query(Pessoa).filter(Pessoa.email == email).one().id
