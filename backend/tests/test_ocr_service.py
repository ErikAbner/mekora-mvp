from app.services.ocr_service import choose_ocr_languages


def test_ocr_usa_so_o_idioma_detectado_quando_ele_esta_instalado() -> None:
    assert choose_ocr_languages("pt-BR", ["por", "eng", "spa"]) == ["por"]
    assert choose_ocr_languages("eng", ["por", "eng", "spa"]) == ["eng"]


def test_ocr_preserva_lista_configurada_quando_idioma_e_desconhecido() -> None:
    assert choose_ocr_languages("", ["por", "eng", "spa"]) == ["por", "eng", "spa"]
    assert choose_ocr_languages("deu", ["por", "eng"]) == ["por", "eng"]


def test_ocr_remove_repeticoes_e_tem_fallback_portugues() -> None:
    assert choose_ocr_languages("por", ["pt", "por", "eng"]) == ["por"]
    assert choose_ocr_languages(None, []) == ["por", "eng", "spa"]
