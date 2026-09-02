import secrets
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String

from app.db.database import Base


class ProcessingJob(Base):
    """
    Registra cada PDF processado pela ferramenta.
    Campos seguem o PRD seção 8.7 (histórico local).
    """

    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)

    # O ENDEREÇO PÚBLICO DO TRABALHO, e ele existe por um defeito concreto: o
    # `id` acima é um número em sequência, e `/storage/output/7/livro.epub`
    # respondia para quem pedisse. Num endereço público, qualquer visitante leria
    # os documentos de todos só contando (DEC-0039 §5).
    #
    # O número continua servindo por dentro, onde nunca foi problema. Para fora
    # vai este token, que ninguém adivinha.
    # O valor nasce AQUI, e não em quem cria o trabalho. Há dois lugares que
    # criam `ProcessingJob` hoje e haverá mais; um deles esquecendo daria um
    # trabalho sem endereço, cujo arquivo não abre — e o esquecimento não faria
    # barulho nenhum até alguém clicar.
    token_publico = Column(
        String, unique=True, index=True, default=lambda: secrets.token_urlsafe(16)
    )

    # Nulo de propósito. A DEC-0018 fixou que converter NÃO exige conta, e a
    # DEC-0039 §2 manteve: a conta nasce quando a pessoa quer guardar na estante,
    # e não quando quer converter um arquivo.
    dono_id = Column(Integer, ForeignKey("pessoas.id", ondelete="SET NULL"), index=True)

    # Arquivo original e caminhos gerados
    original_filename = Column(String, nullable=False)
    input_path = Column(String)           # storage/input/
    # O TAMANHO DO ARQUIVO QUE CHEGOU, em bytes.
    #
    # O nó `966:31504` põe "11.5 MB" como selo, ao lado do formato e das
    # páginas. Ele existia só no disco, e ler o disco a cada abertura de tela
    # faria a ficha depender de um arquivo que a limpeza pode ter apagado —
    # `cleanup_old_jobs` remove o input e deixa o EPUB.
    #
    # Guardado no momento em que o arquivo chega, que é o único em que ele
    # existe com certeza. Nulo para trabalho anterior a esta coluna: nulo é "não
    # sei", e a tela cala em vez de mostrar zero.
    input_bytes = Column(Integer)
    processed_pdf_path = Column(String)   # storage/temp/ após OCR
    epub_path = Column(String)            # storage/output/
    # O TAMANHO DO EPUB GERADO, em bytes. O nó `895:8164` escreve
    # "Diário 02.epub · 8,4 MB" na faixa de "pronto" — o tamanho é metade da
    # frase, e ele não existia em lugar nenhum.
    #
    # Gravado ao fim da conversão pela mesma razão do `input_bytes`: a limpeza
    # por idade apaga a pasta de saída, e depois disso o disco não sabe mais
    # responder.
    epub_bytes = Column(Integer)

    # O QUE TRAVA ESTE TRABALHO, esperando uma decisão da pessoa.
    #
    # Faltava um estado. Um PDF com senha não é um PDF quebrado, e o produto
    # tratava os dois igual: a análise não conseguia ler nada, o arquivo era
    # classificado como digitalização, e a pessoa recebia "OCR falhou" para um
    # arquivo que só precisava de uma senha.
    #
    # Guarda o NOME do motivo — hoje só `"senha"` — e não um booleano: o segundo
    # motivo vai aparecer, e `is_blocked` obrigaria uma segunda coluna para
    # dizer por quê. Nulo quer dizer que nada trava.
    bloqueio = Column(String)
    # O EPUB com as imagens em WebP, para ler no navegador. Separado porque o
    # `epub_path` e o que vai para o Kindle, e o Kindle nao le WebP de forma
    # confiavel. Nulo quando o livro nao tem imagem que valha converter.
    epub_web_path = Column(String)
    cover_path = Column(String)           # caminho da capa selecionada
    selected_cover_page = Column(Integer) # índice 0–4 das miniaturas

    # Metadados detectados automaticamente do PDF
    detected_title = Column(String, default="")
    detected_author = Column(String, default="")
    detected_language = Column(String, default="")

    # Metadados editáveis pelo usuário (pré-preenchidos a partir dos detectados)
    final_title = Column(String, default="")
    final_author = Column(String, default="")
    final_language = Column(String, default="")
    final_filename = Column(String, default="")

    # Resultado da análise do PDF
    page_count = Column(Integer)
    is_scanned = Column(Boolean)
    avg_chars_per_page = Column(Float)

    # Status de cada etapa
    ocr_used = Column(Boolean, default=False)
    ocr_status = Column(String, default="not_needed")
    # not_needed | needed | pending | done | failed

    conversion_status = Column(String, default="not_started")  # not_started | in_progress | done | failed
    send_status = Column(String, default="not_started")  # not_started | in_progress | sent | failed
    send_error = Column(String)          # mensagem de erro do último envio (Fase 6)
    kindle_sent = Column(Boolean, default=False)

    # Status geral do processamento
    status = Column(String, default="uploaded")
    # uploaded → analyzing → analyzed → converting → converted → sending → done | error
    error_message = Column(String)

    # Multipformato (Fase 12)
    input_format = Column(String)            # extensão detectada: pdf, docx, cbz, etc.
    processing_mode = Column(String)         # document | comic

    # Tradução (Fase B)
    translation_enabled = Column(Boolean, default=False)
    source_language = Column(String)         # código 3 letras: por, eng, spa, fra, deu
    target_language = Column(String)         # código 3 letras de destino
    translation_status = Column(String, default="not_started")  # not_started | in_progress | done | failed | skipped
    translation_error = Column(String)
    translator_engine = Column(String)       # argos (Fase B) | nllb (Fase C)
    translated_artifact_path = Column(String)    # caminho do HTML traduzido
    translated_artifact_format = Column(String)  # sempre "html" quando preenchido

    # Quadrinhos (Fase A)
    comic_mode = Column(Boolean, default=False)
    manga_rtl = Column(Boolean, default=False)

    # Tradução experimental de quadrinhos (Fase D)
    comic_translation_enabled = Column(Boolean, default=False)
    comic_translation_status = Column(String, default="not_started")
    # not_started | in_progress | done | failed
    comic_translation_error = Column(String)
    comic_translation_artifact_path = Column(String)   # storage/output/{id}/comic_translation.json
    comic_translation_artifact_format = Column(String) # "json" quando preenchido

    # Export final de quadrinhos (Estabilização v1)
    comic_export_status = Column(String, default="not_started")
    # not_started | in_progress | done | failed
    comic_export_path = Column(String)      # EPUB final traduzido (comic_export/)
    comic_export_source = Column(String)    # finished_pages | final_pages
    comic_export_error = Column(String)

    # Modo de fluxo (Estabilização v1): advanced | recommended
    flow_mode = Column(String, default="advanced")

    # Operação assíncrona ativa: "{operation_type}:{operation_id}" | NULL
    active_operation = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
