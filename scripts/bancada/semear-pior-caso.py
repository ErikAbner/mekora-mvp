#!/usr/bin/env python3
"""Cria uma conta descartavel no limite visual do Mekora.

Esta bancada NAO usa o acervo real. Ela recebe o banco isolado criado por
``scripts/prova.sh`` e povoa somente a pessoa indicada. O objetivo e tornar
reproduziveis os casos que uma semente pequena nunca mostra: centenas de
livros, milhares de notas, titulos no limite, muitos estudos, Canvas denso e
uma Mesa cheia de falhas diferentes.

Uso:
    python scripts/bancada/semear-pior-caso.py /tmp/prova/storage/kindle_tool.db \
        --email pessoa@teste.local
"""

from __future__ import annotations

import argparse
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path


CORES = ("amarelo", "verde", "rosa", "azul")
PALAVRAS = (
    "memoria", "interface", "tipografia", "pesquisa", "contexto", "leitura",
    "acessibilidade", "arquivo", "conversao", "observacao", "evidencia", "metodo",
)


def agora_menos(minutos: int) -> str:
    return (datetime.utcnow() - timedelta(minutes=minutos)).isoformat(" ", "seconds")


def titulo_longo(indice: int) -> str:
    nucleo = (
        "Uma investigacao extraordinariamente extensa sobre sistemas editoriais, "
        "memoria de leitura, tipografia, arquivos imperfeitos e interfaces que "
        "continuam compreensiveis quando absolutamente tudo cresce"
    )
    return f"{indice:04d} — {nucleo}: volume {indice % 17 + 1}, edicao revista, ampliada e comentada"


def nota_longa(indice: int) -> str:
    frase = (
        f"Nota {indice:05d}: o excesso de informacao nao pode apagar procedencia, "
        "hierarquia, acao ou contexto. "
    )
    cauda = " ".join(PALAVRAS[(indice + passo) % len(PALAVRAS)] for passo in range(210))
    return (frase + cauda)[:1996]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("banco", type=Path)
    parser.add_argument("--email", required=True)
    parser.add_argument("--livros", type=int, default=360)
    parser.add_argument("--notas", type=int, default=4200)
    parser.add_argument("--estudos", type=int, default=84)
    parser.add_argument("--canvas", type=int, default=320)
    parser.add_argument("--erros", type=int, default=48)
    args = parser.parse_args()

    if not args.banco.is_file():
        raise SystemExit(f"banco de prova nao encontrado: {args.banco}")

    db = sqlite3.connect(args.banco)
    db.execute("PRAGMA foreign_keys = ON")
    pessoa = db.execute("SELECT id FROM pessoas WHERE email = ?", (args.email,)).fetchone()
    if pessoa is None:
        raise SystemExit(f"pessoa de prova nao encontrada: {args.email}")
    pessoa_id = pessoa[0]

    marcador = f"pior-caso-{pessoa_id}-"
    existente = db.execute(
        "SELECT COUNT(*) FROM processing_jobs WHERE dono_id = ? AND token_publico LIKE ?",
        (pessoa_id, marcador + "%"),
    ).fetchone()[0]
    if existente:
        print(f"bancada ja existe para {args.email}: {existente} trabalhos")
        return

    livro_ids: list[int] = []
    for i in range(args.livros):
        titulo = titulo_longo(i) if i % 7 == 0 else f"{i:04d} — {PALAVRAS[i % len(PALAVRAS)].title()} em escala: caderno {i + 1}"
        autor = (
            "Professora Doutora Maria da Conceicao dos Santos Albuquerque e colaboradores do "
            "Laboratorio Internacional de Pesquisa Aplicada"
            if i % 9 == 0 else f"Pessoa autora com nome composto numero {i + 1}"
        )
        momento = agora_menos(args.livros - i + 300)
        cur = db.execute(
            """INSERT INTO processing_jobs (
                original_filename, detected_title, detected_author, detected_language,
                final_title, final_author, final_language, final_filename, page_count,
                is_scanned, avg_chars_per_page, ocr_used, ocr_status,
                conversion_status, send_status, kindle_sent, status, input_format,
                processing_mode, translation_enabled, translation_status, flow_mode,
                created_at, updated_at, token_publico, dono_id, input_bytes, epub_bytes,
                paginas_ilegiveis, paginas_sem_texto, capitulos_declarados, ordem_leitura
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f"documento-extremo-{i:04d}-com-um-nome-de-arquivo-deliberadamente-enorme.pdf",
                titulo, autor, "por", titulo, autor, "por", f"livro-{i:04d}.epub",
                12 + (i * 97) % 2880, i % 5 == 0, 1700 + i % 400, i % 5 == 0,
                "done" if i % 5 == 0 else "not_needed", "done",
                "sent" if i % 11 == 0 else "not_started", i % 11 == 0, "converted",
                "epub" if i % 6 else "pdf", "document", False, "skipped", "recommended",
                momento, momento, f"{marcador}livro-{i:04d}", pessoa_id,
                3_000_000 + i * 113_111, 500_000 + i * 17_711, i % 4, i % 13,
                1 + i % 73, i,
            ),
        )
        livro_ids.append(cur.lastrowid)
        if i % 3 != 0:
            db.execute(
                """INSERT INTO progressos
                   (pessoa_id, job_id, capitulo, deslocamento, atualizado_em, capitulos, fracao, estado_leitura)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    pessoa_id, cur.lastrowid, i % 30, i * 19, momento, 30,
                    min(0.99, ((i * 37) % 100) / 100),
                    ("lendo", "a_ler", "lido", None)[i % 4],
                ),
            )

    # A Mesa recebe uma mistura grande de falhas, bloqueios e esperas. Nenhum
    # deles inicia processo externo: a bancada testa a interface, nao o Calibre.
    estados = (
        ("error", "failed", "not_started", None, "A conversao excedeu o tempo limite depois de varias tentativas."),
        ("error", "not_started", "failed", None, "O servidor SMTP recusou temporariamente o anexo."),
        ("analyzed", "not_started", "not_started", None, None),
        ("analyzed", "not_started", "not_started", "senha", "Este PDF precisa de senha para continuar."),
    )
    for i in range(args.erros):
        status, conversao, envio, bloqueio, erro = estados[i % len(estados)]
        titulo = titulo_longo(10_000 + i)
        momento = agora_menos(i)
        db.execute(
            """INSERT INTO processing_jobs (
                original_filename, final_title, final_author, page_count, is_scanned,
                ocr_used, ocr_status, conversion_status, send_status, send_error,
                kindle_sent, status, error_message, input_format, processing_mode,
                translation_enabled, source_language, target_language, translation_status,
                translator_engine, flow_mode, created_at, updated_at, token_publico,
                dono_id, bloqueio, tentativas_senha
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f"arquivo-problematico-{i:03d}-nome-longo-e-dificil-de-distinguir.pdf",
                titulo, "Equipe editorial com muitos participantes", 900 + i * 11, i % 2 == 0,
                False, "failed" if i % 4 == 0 else "not_needed", conversao, envio,
                erro if envio == "failed" else None, False, status, erro, "pdf", "document",
                i % 2 == 0, "eng", "por", "failed" if i % 6 == 0 else "not_started",
                "nllb", "recommended", momento, momento, f"{marcador}erro-{i:03d}",
                pessoa_id, bloqueio, 5 if bloqueio else 0,
            ),
        )

    nota_ids: list[int] = []
    for i in range(args.notas):
        # Um livro-monstro concentra muitas notas; o restante testa a dispersao
        # pelo acervo. Os dois casos exigem composicoes diferentes na interface.
        livro = livro_ids[0] if i < min(1200, args.notas) else (
            livro_ids[i % len(livro_ids)] if i % 13 else None
        )
        trecho = nota_longa(i) if i % 31 == 0 else (
            f"Trecho {i:05d} sobre {PALAVRAS[i % len(PALAVRAS)]}, "
            f"{PALAVRAS[(i + 1) % len(PALAVRAS)]} e {PALAVRAS[(i + 2) % len(PALAVRAS)]}."
        )
        comentario = (
            ("Comentario muito longo. " + nota_longa(i + 70_000))[:1996]
            if i % 43 == 0 else (f"Minha observacao {i}: isto precisa voltar para o estudo certo." if i % 4 == 0 else "")
        )
        momento = agora_menos(i + 800)
        cur = db.execute(
            """INSERT INTO notas (
                pessoa_id, job_id, capitulo, de, ate, cor, trecho, comentario,
                criada_em, atualizada_em, origem, fonte, estado, antes, depois, revisar_desde
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                pessoa_id, livro, i % 91, i * 23, i * 23 + len(trecho), CORES[i % 4],
                trecho, comentario, momento, momento,
                "Colecao importada com um titulo extremamente grande" if livro is None else "",
                "kindle" if livro is None and i % 2 else ("solta" if livro is None else "leitura"),
                "rascunho" if i % 97 == 0 else None,
                "Contexto anterior " * 8, "Contexto posterior " * 8,
                momento if i % 71 == 0 else None,
            ),
        )
        nota_ids.append(cur.lastrowid)

    estudo_ids: list[int] = []
    for i in range(args.estudos):
        nome = (
            f"{i:03d} — Como manter contexto, procedencia e hierarquia quando um estudo "
            "atravessa dezenas de livros, anos de leitura e perguntas que continuam mudando?"
        )
        sobre = ("Pergunta central muito extensa. " + nota_longa(i + 90_000))[:2800]
        momento = agora_menos(i * 7)
        cur = db.execute(
            "INSERT INTO estudos (pessoa_id, nome, sobre, fechado, criado_em, mexido_em) VALUES (?,?,?,?,?,?)",
            (pessoa_id, nome, sobre, i % 5 == 0, momento, momento),
        )
        estudo_ids.append(cur.lastrowid)

    # Cada estudo recebe 24 notas; algumas aparecem em mais de um estudo, que e
    # uma possibilidade legitima do modelo e aumenta a densidade sem duplicar.
    for i, estudo in enumerate(estudo_ids):
        for passo in range(24):
            nota = nota_ids[(i * 43 + passo * 11) % len(nota_ids)]
            db.execute(
                "INSERT OR IGNORE INTO estudo_notas (estudo_id, nota_id, reunida_em) VALUES (?,?,?)",
                (estudo, nota, agora_menos(i + passo)),
            )

    # E um estudo-monstro: centenas de notas, centenas de livros e a pergunta
    # longa. A lista e a pagina de detalhe precisam sobreviver aos dois eixos.
    for nota in nota_ids[: min(800, len(nota_ids))]:
        db.execute(
            "INSERT OR IGNORE INTO estudo_notas (estudo_id, nota_id, reunida_em) VALUES (?,?,?)",
            (estudo_ids[0], nota, agora_menos(1)),
        )

    grupos: list[int] = []
    for i in range(32):
        cur = db.execute(
            """INSERT INTO canvas_grupos
               (pessoa_id, nome, x, y, largura, altura, criado_em, movido_em)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                pessoa_id,
                f"Area {i + 1}: {PALAVRAS[i % len(PALAVRAS)]}, hipoteses, divergencias e proximos passos",
                (i % 8) * 1550 - 900, (i // 8) * 1250 - 500,
                1320, 980, agora_menos(i), agora_menos(i),
            ),
        )
        grupos.append(cur.lastrowid)

    canvas_notas = nota_ids[: args.canvas]
    for i, nota in enumerate(canvas_notas):
        coluna, linha = i % 20, i // 20
        grupo = grupos[(linha // 4 * 8 + coluna // 3) % len(grupos)] if i % 5 else None
        db.execute(
            """INSERT OR IGNORE INTO canvas_nos
               (pessoa_id, nota_id, x, y, largura, grupo_id, movido_em)
               VALUES (?,?,?,?,?,?,?)""",
            (
                pessoa_id, nota, coluna * 430 - 600, linha * 310 - 300,
                520 if i % 17 == 0 else 375, grupo, agora_menos(i),
            ),
        )

    # Uma malha suficientemente densa para revelar custo e legibilidade, mas
    # sem grafo completo (que seria artificial e quadratico).
    for i in range(min(720, len(canvas_notas) * 2)):
        a = canvas_notas[i % len(canvas_notas)]
        b = canvas_notas[(i * 17 + 29) % len(canvas_notas)]
        if a == b:
            continue
        de, para = sorted((a, b))
        db.execute(
            """INSERT OR IGNORE INTO ligacoes
               (pessoa_id, de_tipo, de_id, para_tipo, para_id, como, criada_em)
               VALUES (?, 'nota', ?, 'nota', ?, 'mao', ?)""",
            (pessoa_id, de, para, agora_menos(i)),
        )

    db.commit()
    totais = {
        "livros": args.livros,
        "trabalhos_com_problema": args.erros,
        "notas": args.notas,
        "estudos": args.estudos,
        "objetos_no_canvas": len(canvas_notas),
        "grupos_no_canvas": len(grupos),
    }
    print("bancada extrema criada:")
    for nome, total in totais.items():
        print(f"  {nome}: {total}")


if __name__ == "__main__":
    main()
