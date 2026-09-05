"""O que o Mekora guarda sobre uma pessoa, e como levar embora.

POR QUE ESTA TELA É DERIVADA, E NÃO ESCRITA
===========================================
Uma política de privacidade escrita à mão envelhece na primeira coluna nova: o
produto passa a guardar mais uma coisa, e o texto continua listando as antigas.
Ela vira uma promessa que ninguém checa contra o banco.

Aqui a lista é CONTADA no banco, na hora. Se amanhã existir uma tabela nova
ligada à pessoa e ela não aparecer aqui, é porque alguém esqueceu de acrescentar
uma linha neste arquivo — e o teste que confere isso está em
`test_privacidade.py`, comparando com as tabelas que de fato apontam para
`pessoas`.

APAGAR APAGA
============
Não marca como apagado, não esconde da listagem. As chaves estrangeiras têm
`ondelete="CASCADE"`, então apagar a pessoa leva junto sessões, chaves, notas,
progresso, aparelhos e preferências.

Os ARQUIVOS são o caso que o banco não resolve sozinho, e por isso ele é feito à
mão aqui: o trabalho tem `dono_id` com `SET NULL`, o que preservaria o registro
de conversão e deixaria o EPUB no disco sem dono. Para quem pediu para apagar a
conta, "os arquivos continuam lá, sem seu nome" não é o que foi pedido.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.aparelho import Aparelho
from app.models.canvas import GrupoCanvas, Ligacao, LivroCanvas, MidiaCanvas, NoCanvas
from app.models.grupo_ignorado import GrupoIgnorado
from app.models.dispensa import SugestaoDispensada
from app.models.marcador import Marcador
from app.models.estudo import Estudo, EstudoNota
from app.models.nota import Nota
from app.models.pessoa import Chave, Pessoa, Sessao
from app.models.recado import Recado
from app.models.preferencia import Preferencia
from app.models.processing_job import ProcessingJob
from app.models.progresso import Progresso
from app.services import acesso_service
from app.services.cleanup_service import DIAS_DOS_EVENTOS

router = APIRouter()


def _quem(db: Session, biscoito: Optional[str]) -> Pessoa:
    pessoa = acesso_service.quem_e(db, biscoito)
    if pessoa is None:
        raise HTTPException(status_code=401, detail="Entre para ver seus dados.")
    return pessoa


# O que existe, e o que cada coisa é em português. A explicação fica ao lado da
# contagem porque um número sozinho não diz o que se está guardando — "7
# progressos" não significa nada para quem não escreveu o código.
# O NOME É O QUE A PESSOA LÊ, e não a chave do código.
#
# A tela mostrava `preferencias`, `no_canvas` e `grupos_do_canvas` — sem acento e
# com underline, porque eram os identificadores internos servidos crus. O Erik
# viu numa captura. Agora há um `nome` para a tela e um `chave` para o código, e
# o portão passou a recusar `_` no meio de palavra em texto de interface.
O_QUE_GUARDAMOS = [
    # A FRASE MUDOU EM 02/09/2026, quando o Erik decidiu que a conta tem nome e
    # retrato. Ela dizia "seu e-mail; é a única coisa que identifica você — não
    # há nome, telefone nem foto", e a partir do momento em que os dois campos
    # existem essa frase vira a mentira que ela existia para evitar.
    #
    # O que continua verdade e importa mais: os dois são OPCIONAIS, e o produto
    # nunca pediu nenhum dos dois para deixar alguém entrar.
    ("conta", "conta", Pessoa, "Seu e-mail, e o nome e o retrato que você tiver escolhido pôr. Os dois últimos são opcionais — entrar nunca pede nenhum deles."),
    ("livros", "livros", ProcessingJob, "Os arquivos que você enviou e o que foi convertido a partir deles."),
    ("notas", "notas", Nota, "O que você marcou lendo, e o que trouxe do Kindle."),
    ("leituras", "leituras", Progresso, "Onde você parou em cada livro."),
    ("marcadores", "marcadores", Marcador, "Os lugares que você marcou para voltar, e o trecho que estava em cada um."),
    ("aparelhos", "aparelhos", Aparelho, "Os endereços de Kindle que você ligou à conta."),
    ("preferencias", "preferências", Preferencia, "As escolhas que você fez em Preferências."),
    ("estudos", "estudos", Estudo, "Os estudos que você montou, com a pergunta de cada um."),
    ("no_canvas", "notas no Canvas", NoCanvas, "As notas que você pôs no Canvas, e onde cada uma está."),
    ("grupos_do_canvas", "grupos no Canvas", GrupoCanvas, "As áreas que você nomeou no Canvas, e o tamanho de cada uma."),
    ("ligacoes", "ligações", Ligacao, "As ligações que você fez entre notas e livros."),
    ("midias_do_canvas", "imagens no Canvas", MidiaCanvas, "As fotos que você pôs no Canvas."),
    ("livros_do_canvas", "livros no Canvas", LivroCanvas, "Quais livros você pôs no Canvas, e onde cada um está. O livro em si está acima, com os arquivos."),
    ("sugestoes_dispensadas", "sugestões que você recusou", SugestaoDispensada, "Os pares de notas que o Mekora sugeriu ligar e você dispensou. Guardados para não sugerir de novo."),
    ("grupos_calados", "grupos que você mandou parar", GrupoIgnorado, "Os grupos de notas parecidas que você pediu para o Mekora não sugerir mais."),
    ("sessoes", "sessões", Sessao, "Os navegadores em que você entrou."),
    ("links", "links de entrada", Chave, "Links de entrada pedidos e ainda não vencidos. Guardados como resumo, nunca em texto."),
    ("recados", "recados", Recado, "O que você escreveu na caixa de recado, e em que tela estava quando escreveu."),
]


class Confirmacao(BaseModel):
    email: str


@router.get("/privacidade")
def o_que_existe(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    pessoa = _quem(db, mekora_sessao)

    itens = []
    for chave, nome, modelo, explicacao in O_QUE_GUARDAMOS:
        if modelo is Pessoa:
            quantos = 1
        elif modelo is ProcessingJob:
            quantos = db.query(modelo).filter(modelo.dono_id == pessoa.id).count()
        else:
            quantos = db.query(modelo).filter(modelo.pessoa_id == pessoa.id).count()
        itens.append({"chave": chave, "nome": nome, "quantos": quantos, "explicacao": explicacao})

    from app.services.app_config_service import load_app_config

    dias = int(load_app_config().get("retention_days", 30))

    return {
        "email": pessoa.email,
        "desde": pessoa.criada_em,
        "itens": itens,
        # ── O CICLO DE VIDA DOS ARQUIVOS — seção "Seus arquivos" do nó 895:10909.
        #
        # No desenho o prazo de retenção está como PENDENTE, com uma nota
        # honesta: "marquei como pendente em vez de escrever um número; uma
        # política de privacidade inventada no protótipo vira promessa no
        # produto". Só que o código já decidiu — `cleanup_old_jobs` apaga o
        # original de trabalhos terminados há mais de `retention_days` dias, e o
        # número vem daqui, não de um texto escrito à mão.
        #
        # A ressalva sobre QUANDO a limpeza roda é parte do fato: ela é chamada
        # no `startup` do servidor, e em lugar nenhum mais. Um servidor que não
        # reinicia não limpa, e dizer "30 dias" sem isso seria a promessa que a
        # nota do desenho quer evitar.
        "arquivos": [
            {
                "titulo": "O original",
                "explicacao": (
                    "Guardado enquanto o livro existir. É ele que permite refazer a "
                    "preparação com outras opções, sem você enviar de novo."
                ),
                # O PRAZO DEPENDE DE HAVER CONTA, e é a decisão do Erik de
                # 03/09: a conta passa a valer justamente isso.
                #
                # A frase anterior prometia trinta dias para todo mundo, e nem
                # isso era verdade — o filtro da limpeza olhava `status in
                # ("done", "error")` e a conversão bem-sucedida grava
                # `"converted"`, então nada era apagado nunca.
                "prazo": (
                    "Enquanto o Mekora existir. É o que ter conta significa aqui: "
                    "o arquivo que você enviou fica, e sai quando você remove o livro."
                    if pessoa
                    else f"Sem conta, ele é apagado {dias} dias depois do preparo."
                ),
            },
            {
                "titulo": "O resultado",
                # E ESTA TAMBÉM SÓ AGORA É VERDADE. A limpeza por idade removia
                # a pasta de saída inteira — o EPUB junto com o original —, e o
                # livro de alguém sumiria da estante trinta dias depois de ser
                # preparado. Não aconteceu com ninguém porque o outro defeito
                # impedia a limpeza de rodar; um escondia o outro.
                "explicacao": "Fica na sua estante. Sai quando você remove o livro, e não por tempo.",
                "prazo": None,
            },
            {
                "titulo": "Conteúdo",
                "explicacao": (
                    "Não é lido por pessoa nenhuma. O texto que sai do reconhecimento "
                    "serve ao seu arquivo e não é usado para mais nada."
                ),
                "prazo": None,
            },
        ],
        # ── DADOS DE USO — seção do mesmo nó, e a que estava faltando por
        # inteiro. O produto MEDE: a tabela `stage_metrics` grava, a cada etapa,
        # qual foi, se terminou, quanto levou e em que formato.
        #
        # A lista abaixo é o esquema da tabela em português, campo por campo. Se
        # uma coluna nova aparecer lá e não aqui, a tela passa a mentir — e é por
        # isso que `test_privacidade.py` compara as duas.
        "uso": [
            {
                "titulo": "O que é medido",
                "explicacao": (
                    "De cada etapa do preparo: qual foi, se terminou ou falhou, quanto "
                    "tempo levou, o formato do arquivo, o modo e o motor de tradução. "
                    "Fica ligado ao número do trabalho, e não à sua conta, e é apagado "
                    f"depois de {DIAS_DOS_EVENTOS} dias."
                ),
                "marca": "Sem interruptor ainda",
            },
            {
                "titulo": "O que nunca é medido",
                "explicacao": (
                    "O conteúdo dos seus arquivos. Nem o texto que sai do "
                    "reconhecimento, nem o nome dos arquivos: quando uma etapa falha, "
                    "a mensagem de erro é guardada com os caminhos e nomes trocados "
                    "por um marcador."
                ),
                "marca": "Regra fixa",
            },
            # ── AS TRÊS FERRAMENTAS DE FORA, a partir de 03/09/2026.
            #
            # Até aqui esta tela podia dizer "não há rastreamento por
            # terceiros". Não pode mais, e a mudança tem de aparecer ANTES de
            # qualquer script descer — uma tela de privacidade que descreve o
            # produto de ontem é pior que não ter tela.
            {
                "titulo": "Quem mede a navegação, e só depois de você deixar",
                "explicacao": (
                    "Duas ferramentas de fora — PostHog e Microsoft Clarity — registram "
                    "onde as pessoas clicam e onde travam, e gravam a navegação. Elas só "
                    "são carregadas depois de você responder que pode: até lá o Mekora "
                    "nem busca o arquivo delas. Dizer não não tira nada de você, e a "
                    "resposta pode ser mudada aqui a qualquer momento."
                ),
                "marca": "Só com o seu sim",
                # ESTA LINHA GANHA UM CONTROLE NA TELA, e a explicação acima é
                # quem exige: ela promete que "a resposta pode ser mudada aqui a
                # qualquer momento", e até 05/09 não havia onde. Uma tela de
                # privacidade que promete um controle que não existe é pior que
                # uma que não promete nada.
                #
                # O interruptor é do NAVEGADOR, e não do servidor: quem guarda a
                # resposta é o `localStorage` do `web/src/medir.js`, porque são
                # os scripts do cliente que sobem ou não sobem. O servidor só
                # diz QUAL linha tem controle; o valor mora lá.
                "interruptor": "medicao",
            },
            {
                "titulo": "O que essas gravações NÃO mostram",
                "explicacao": (
                    "O texto dos seus livros, o trecho das suas notas, o que você "
                    "escreveu num estudo e o que você digitou num recado ficam TAPADOS "
                    "nas gravações — em preto, sempre, sem opção de ligar. Seu endereço "
                    "de rede também não é guardado por elas."
                ),
                "marca": "Regra fixa",
            },
            {
                "titulo": "Quantas visitas houve",
                "explicacao": (
                    "A Cloudflare, que já é por onde todo pedido ao Mekora passa, conta "
                    "quantas visitas cada tela teve. Ela não põe cookie, não guarda "
                    "identificador e não monta perfil — por isso essa contagem não "
                    "espera resposta sua."
                ),
                "marca": "Sem interruptor",
            },
        ],
        # Ditos aqui, e não num texto à parte, porque são fatos do código:
        # `email_service` manda o EPUB por SMTP, e nada mais sai daqui.
        "para_onde_vai": [
            "Os arquivos que você manda ao Kindle vão pelo servidor de e-mail configurado, "
            "e daí para a Amazon. É o único lugar fora do Mekora para onde algo seu é enviado.",
            "Os livros são lidos no seu próprio navegador — o texto não passa por servidor nenhum "
            "depois de convertido.",
            "Quando você põe um link no Canvas, o Mekora busca o título e a "
            "imagem da página para montar a prévia — e essa busca sai daqui para "
            "o endereço que você colou. O site visitado vê o pedido, como veria "
            "se você abrisse o link. Nada além do endereço é enviado, e a prévia "
            "só acontece quando você cola um link.",
            # ESTA FRASE JÁ ERROU DUAS VEZES, e por isso está comentada.
            #
            # Ela dizia "não há rastreamento, ANÁLISE DE USO nem publicidade", e
            # a segunda parte era falsa: `stage_metrics` mede o preparo etapa
            # por etapa. Corrigida, ela passou a dizer "não há rastreamento POR
            # TERCEIROS" — e isso deixou de ser verdade em 03/09, quando PostHog,
            # Clarity e Cloudflare entraram.
            #
            # O padrão é o mesmo das duas vezes: a frase descrevia o produto de
            # ontem. Ela agora nomeia os destinos em vez de negar categorias, que
            # é a forma que não envelhece sozinha.
            "Publicidade não existe aqui, e nada seu é vendido para ninguém. "
            "O que sai do Mekora sai para quatro lugares, e só: a Amazon, quando "
            "você manda ao Kindle; o site do link que você colou no Canvas; e o "
            "PostHog e a Microsoft Clarity, que medem a navegação e só entram "
            "depois de você deixar. A Cloudflare conta as visitas na borda, sem "
            "cookie e sem perfil.",
        ],
    }


@router.get("/privacidade/levar")
def levar(
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Tudo o que é seu, em JSON.

    Inclui as NOTAS por inteiro — trecho e comentário —, que é o que a pessoa
    escreveu e a única coisa aqui que ela não conseguiria refazer. Os arquivos
    não vão junto: eles já são baixáveis um a um, e um JSON com EPUBs dentro
    seria grande demais para o navegador montar.
    """
    pessoa = _quem(db, mekora_sessao)

    return {
        # O NOME VAI JUNTO; o retrato vai como um SIM ou NÃO.
        #
        # Um JSON com a imagem embutida em base64 é grande, ilegível e não abre
        # em nada — a mesma razão pela qual os EPUBs não vão. O que a exportação
        # deve garantir é que nada seja OMITIDO em silêncio: quem lê o arquivo
        # fica sabendo que há um retrato, e ele está a um clique na tela da
        # conta.
        "conta": {
            "email": pessoa.email,
            "nome": pessoa.nome,
            "tem_retrato": bool(pessoa.retrato),
            "desde": pessoa.criada_em,
        },
        "notas": [
            {
                "livro": n.origem or (n.job_id and f"trabalho {n.job_id}") or "",
                "fonte": n.fonte, "cor": n.cor,
                "trecho": n.trecho, "comentario": n.comentario,
                "capitulo": n.capitulo, "de": n.de, "ate": n.ate,
                "criada_em": n.criada_em,
            }
            for n in db.query(Nota).filter(Nota.pessoa_id == pessoa.id).order_by(Nota.criada_em).all()
        ],
        # OS MARCADORES SÃO ATO DELIBERADO, como a nota: alguém escolheu aquele
        # lugar. Vão inteiros — capítulo, deslocamento e o trecho guardado —,
        # porque sem o trecho a linha exportada seria um par de números que não
        # diz que lugar era.
        "marcadores": [
            {
                "livro": m.job_id,
                "capitulo": m.capitulo, "deslocamento": m.deslocamento,
                "trecho": m.trecho, "criado_em": m.criado_em,
            }
            for m in db.query(Marcador).filter(Marcador.pessoa_id == pessoa.id)
            .order_by(Marcador.capitulo, Marcador.deslocamento).all()
        ],
        "livros": [
            {
                "titulo": j.final_title or j.original_filename,
                "autor": j.final_author or "",
                "enviado_ao_kindle": bool(j.kindle_sent),
                "criado_em": j.created_at,
            }
            for j in db.query(ProcessingJob).filter(ProcessingJob.dono_id == pessoa.id).all()
        ],
        "aparelhos": [
            {"nome": a.nome, "endereco": a.endereco, "principal": a.principal}
            for a in db.query(Aparelho).filter(Aparelho.pessoa_id == pessoa.id).all()
        ],
        "estudos": [
            {
                "nome": e.nome, "sobre": e.sobre, "fechado": e.fechado,
                "notas": [
                    en.nota_id
                    for en in db.query(EstudoNota).filter(EstudoNota.estudo_id == e.id).all()
                ],
            }
            for e in db.query(Estudo).filter(Estudo.pessoa_id == pessoa.id).all()
        ],
        "canvas": [
            {"nota": n.nota_id, "x": n.x, "y": n.y}
            for n in db.query(NoCanvas).filter(NoCanvas.pessoa_id == pessoa.id).all()
        ],
        "ligacoes": [
            {"de": f"{l.de_tipo}:{l.de_id}", "para": f"{l.para_tipo}:{l.para_id}", "como": l.como}
            for l in db.query(Ligacao).filter(Ligacao.pessoa_id == pessoa.id).all()
        ],
        # O NOME DO GRUPO É COISA ESCRITA PELA PESSOA, como o comentário da
        # nota — e leva junto o retângulo, porque sem ele o nome não diz sobre o
        # que era. Levar o nome sem a geometria seria levar metade.
        # A IMAGEM VAI COMO ARQUIVO, e aqui só o endereço dela. Pôr os bytes num
        # JSON os transformaria em base64 — um terço maior, e ilegível para quem
        # abrir o arquivo para conferir o que o Mekora tem sobre ela.
        "midias_do_canvas": [
            {"nota": m.nota_id, "endereco": f"/canvas/midia/{m.token}",
             "largura": m.largura, "altura": m.altura}
            for m in db.query(MidiaCanvas).filter(MidiaCanvas.pessoa_id == pessoa.id).all()
        ],
        # O LIVRO NO CANVAS É SÓ A POSIÇÃO. O arquivo, o título e o autor já
        # saem junto dos trabalhos, acima — repeti-los aqui seria dizer duas
        # vezes a mesma coisa e sugerir que há duas cópias.
        "livros_do_canvas": [
            {"livro": lc.job_id, "x": lc.x, "y": lc.y}
            for lc in db.query(LivroCanvas).filter(LivroCanvas.pessoa_id == pessoa.id).all()
        ],
        "grupos_do_canvas": [
            {"nome": g.nome, "x": g.x, "y": g.y, "largura": g.largura, "altura": g.altura}
            for g in db.query(GrupoCanvas).filter(GrupoCanvas.pessoa_id == pessoa.id).all()
        ],
        "preferencias": {
            p.chave: p.valor
            for p in db.query(Preferencia).filter(Preferencia.pessoa_id == pessoa.id).all()
        },
    }


@router.post("/privacidade/apagar", status_code=204)
def apagar(
    confirmacao: Confirmacao,
    mekora_sessao: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Apaga a conta e tudo que é dela. Não há volta.

    EXIGE O E-MAIL DIGITADO. Não é burocracia: é a diferença entre um clique
    errado e uma decisão. Um botão que apaga tudo sozinho vai ser clicado por
    engano por alguém, um dia, e não há como desfazer.
    """
    pessoa = _quem(db, mekora_sessao)

    if confirmacao.email.strip().lower() != pessoa.email:
        raise HTTPException(
            status_code=400,
            detail="O e-mail digitado não é o da sua conta. Nada foi apagado.",
        )

    # OS ARQUIVOS PRIMEIRO, enquanto ainda dá para saber quais são dela.
    # `dono_id` tem `SET NULL`: apagar a pessoa antes deixaria os trabalhos sem
    # dono e os EPUBs no disco, sem ninguém para reclamá-los.
    from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP

    trabalhos = db.query(ProcessingJob).filter(ProcessingJob.dono_id == pessoa.id).all()
    for j in trabalhos:
        for pasta in (STORAGE_OUTPUT / str(j.id), STORAGE_TEMP / str(j.id)):
            shutil.rmtree(pasta, ignore_errors=True)
        for entrada in STORAGE_INPUT.glob(f"{j.id}_*"):
            entrada.unlink(missing_ok=True)
        db.delete(j)

    # O RETRATO É ARQUIVO, e o CASCADE do banco não alcança o disco. Deixá-lo
    # ali com a linha apagada seria "removido da tela" em vez de removido — a
    # mesma distinção que esta tela faz sobre a conta inteira.
    if pessoa.retrato:
        Path(pessoa.retrato).unlink(missing_ok=True)

    # AS IMAGENS DO CANVAS, pela mesma razão: o CASCADE apaga a linha e deixa o
    # arquivo. Aqui elas são muitas, e uma foto esquecida no disco é pior que um
    # retrato esquecido — pode ser qualquer coisa que a pessoa fotografou.
    from app.core.config import STORAGE_RAIZ

    for m in db.query(MidiaCanvas).filter(MidiaCanvas.pessoa_id == pessoa.id).all():
        (STORAGE_RAIZ / "midia" / f"{m.token}.webp").unlink(missing_ok=True)

    # E a pessoa por último: o CASCADE leva sessões, chaves, notas, progresso,
    # aparelhos e preferências.
    db.delete(pessoa)
    db.commit()
    return None
