"""Detecção local e conservadora de português/inglês em documentos.

Metadado de idioma costuma vir vazio (especialmente em PDFs e EPUBs baixados).
Para a receita "Leitura em português", vazio não pode significar português: a
decisão deve vir do texto que a análise acabou de extrair.
"""
from __future__ import annotations

import re
import unicodedata

_TOKEN = re.compile(r"[a-zà-ÿ]+", re.IGNORECASE)

_WORDS = {
    "eng": frozenset(
        "the and of to in a is that for it as with this was on be by are from or an at not have has but which you we they their can will one all more into about than when what how who these those also use using between through our your its such each other".split()
    ),
    "por": frozenset(
        "o a os as de do da dos das e em um uma para por com que se no na nos nas é são foi como ao aos à às não mais ou mas entre sobre quando onde quem este esta isso sua seu suas seus também cada outro outra pelo pela".split()
    ),
    "spa": frozenset(
        "el la los las de del y en un una unos unas para por con que se lo le les es son fue como al sin no más pero entre sobre cuando donde quien este esta esto sus muy desde hacia todos todas puede pueden".split()
    ),
}


def normalize_language_code(value: str | None) -> str:
    raw = (value or "").strip().lower().replace("_", "-")
    if raw in {"en", "eng", "english", "en-us", "en-gb"}:
        return "eng"
    if raw in {"pt", "por", "pt-br", "pt-pt", "portuguese", "português"}:
        return "por"
    if raw in {"es", "spa", "es-es", "es-mx", "spanish", "español"}:
        return "spa"
    return raw[:3] if len(raw) >= 3 else raw


def detect_document_language(text: str, *, minimum_tokens: int = 24) -> str:
    """Retorna ``eng``, ``por`` ou vazio quando a amostra não é convincente."""
    normalized = unicodedata.normalize("NFKC", text or "").lower()
    tokens = _TOKEN.findall(normalized)[:12000]
    if len(tokens) < minimum_tokens:
        return ""

    scores = {code: sum(token in words for token in tokens) for code, words in _WORDS.items()}
    winner = max(scores, key=scores.get)
    winner_score = scores[winner]
    other_score = max(score for code, score in scores.items() if code != winner)
    # Textos técnicos trazem termos estrangeiros; função gramatical, não uma
    # palavra isolada, precisa sustentar a escolha.
    if winner_score < 6 or winner_score < max(1, other_score) * 1.35:
        return ""
    return winner
