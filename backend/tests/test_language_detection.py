from app.services.language_detection_service import detect_document_language, normalize_language_code


def test_detects_english_from_document_text() -> None:
    text = "The purpose of this book is to help the reader understand how people use products and why they make decisions. " * 12
    assert detect_document_language(text) == "eng"


def test_detects_portuguese_from_document_text() -> None:
    text = "O objetivo deste livro é ajudar a pessoa a entender como as pessoas usam produtos e por que tomam decisões. " * 12
    assert detect_document_language(text) == "por"


def test_does_not_call_spanish_portuguese() -> None:
    text = "Cómo usar los datos para crear más rápido una empresa mejor, con todos los derechos de esta edición. " * 12
    assert detect_document_language(text) == "spa"


def test_short_uncertain_sample_stays_unknown() -> None:
    assert detect_document_language("Design systems") == ""


def test_normalizes_metadata_codes() -> None:
    assert normalize_language_code("en-US") == "eng"
    assert normalize_language_code("pt_BR") == "por"
    assert normalize_language_code("es") == "spa"
