from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class UploadResponse(BaseModel):
    """Retornado por POST /upload."""

    upload_id: int
    filename: str
    status: str
    # O endereço pelo qual o arquivo deste trabalho é alcançável. Vai na
    # resposta porque quem acabou de enviar precisa dele para abrir o
    # resultado — e o número do trabalho não serve mais para isso.
    endereco: Optional[str] = None


class JobResponse(BaseModel):
    """Retornado por GET /analyze/{upload_id} e POST /jobs/{id}/metadata|cover."""

    upload_id: int
    # Por onde os arquivos deste trabalho são alcançados. Vem do backend porque
    # é ele que sabe — e porque o número ao lado não serve mais para isso.
    endereco: Optional[str] = None
    # O endereço para abrir o livro. Vem pronto do backend porque o nome do
    # arquivo é derivado do título, e a tela não tem como adivinhá-lo.
    # `None` enquanto a conversão não terminou.
    leitura_url: Optional[str] = None
    # O endereço para BAIXAR — o EPUB que vai para o aparelho, e não a versão
    # web que `leitura_url` aponta. Ver `_epub_url` em jobs.py.
    epub_url: Optional[str] = None

    # O que a ficha da estante mostra sobre a LEITURA. Tudo derivado — antes
    # estes quatro vinham de um exemplo escrito à mão, iguais em todo livro.
    # `None` quer dizer "não sei", e a tela cala em vez de inventar.
    notas: int = 0
    capitulo: Optional[int] = None
    capitulos: Optional[int] = None
    # Quanto do livro ja foi lido, de 0 a 1. Calculada no cliente, que e quem
    # conhece a extensao; nula para leitura registrada antes disso.
    fracao: Optional[float] = None
    ultima_nota: Optional[dict] = None

    original_filename: str
    status: str

    # Resultado da análise do PDF
    page_count: Optional[int] = None
    is_scanned: Optional[bool] = None
    avg_chars_per_page: Optional[float] = None

    # Metadados detectados automaticamente
    detected_title: str = ""
    detected_author: str = ""
    detected_language: str = ""

    # Metadados editáveis pelo usuário
    final_title: str = ""
    final_author: str = ""
    final_language: str = ""
    final_filename: str = ""

    # OCR (Fase 4)
    ocr_used: bool = False
    ocr_status: str = "not_needed"
    processed_pdf_path: Optional[str] = None  # caminho do PDF com OCR embutido

    # Conversão para EPUB (Fase 5)
    epub_path: Optional[str] = None
    # O EPUB com imagens em WebP, para ler no navegador. Sem esta linha o campo
    # existe no banco, e a resposta devolve None — o valor some no schema, nao
    # no modelo.
    epub_web_path: Optional[str] = None
    conversion_status: str = "not_started"

    # Envio ao Kindle (Fase 6)
    send_status: str = "not_started"
    send_error: Optional[str] = None

    # Capa escolhida
    selected_cover_page: Optional[int] = None
    cover_path: Optional[str] = None
    thumbnails: list[str] = []

    # Erro, se houver
    error_message: Optional[str] = None

    # Multipformato e modo de processamento (Fase A)
    input_format: str = ""
    processing_mode: str = "document"
    comic_mode: bool = False
    manga_rtl: bool = False

    # Tradução textual (Fase B)
    translation_enabled: bool = False
    source_language: str = ""
    target_language: str = ""
    translation_status: str = "not_started"
    translation_error: Optional[str] = None
    translator_engine: str = ""
    translated_artifact_path: Optional[str] = None
    translated_artifact_format: str = ""

    # Tradução experimental de quadrinhos (Fase D)
    comic_translation_enabled: bool = False
    comic_translation_status: str = "not_started"
    comic_translation_error: Optional[str] = None
    comic_translation_artifact_path: Optional[str] = None
    comic_translation_artifact_format: str = ""

    # Export final de quadrinhos (Estabilização v1)
    comic_export_status: str = "not_started"
    comic_export_path: Optional[str] = None
    comic_export_source: str = ""
    comic_export_error: Optional[str] = None
    flow_mode: str = "advanced"
    active_operation: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    @field_validator(
        "input_format", "processing_mode",
        "detected_title", "detected_author", "detected_language",
        "final_title", "final_author", "final_language", "final_filename",
        "conversion_status", "send_status",
        "source_language", "target_language", "translator_engine",
        "translated_artifact_format", "translation_status",
        "comic_translation_status", "comic_translation_artifact_format",
        "comic_export_status", "comic_export_source", "flow_mode",
        mode="before",
    )
    @classmethod
    def coerce_none_to_empty(cls, v: object) -> str:
        return "" if v is None else str(v)

    model_config = {"from_attributes": True}


class HistoryEntry(BaseModel):
    """Item retornado por GET /history e GET /batch/jobs."""

    upload_id: int
    # Por onde os arquivos deste trabalho são alcançados. Vem do backend porque
    # é ele que sabe — e porque o número ao lado não serve mais para isso.
    endereco: Optional[str] = None
    # O endereço para abrir o livro. Vem pronto do backend porque o nome do
    # arquivo é derivado do título, e a tela não tem como adivinhá-lo.
    # `None` enquanto a conversão não terminou.
    leitura_url: Optional[str] = None

    # O que a ficha da estante mostra sobre a LEITURA. Tudo derivado — antes
    # estes quatro vinham de um exemplo escrito à mão, iguais em todo livro.
    # `None` quer dizer "não sei", e a tela cala em vez de inventar.
    notas: int = 0
    capitulo: Optional[int] = None
    capitulos: Optional[int] = None
    # O NUMERO DE PAGINAS, que a vista de pé usa para derivar a espessura da
    # lombada. Ele existe no modelo e no JobResponse desde sempre; faltava aqui,
    # e por isso a estante de pé mostrava toda lombada como "espessura
    # desconhecida" — o dado existia e morria no schema.
    page_count: Optional[int] = None
    # Quanto do livro ja foi lido, de 0 a 1. Calculada no cliente, que e quem
    # conhece a extensao; nula para leitura registrada antes disso.
    fracao: Optional[float] = None
    ultima_nota: Optional[dict] = None

    original_filename: str
    # URL da capa, montada no backend e não no cliente. A estante não deve
    # precisar conhecer o layout do storage para desenhar um livro — é o mesmo
    # princípio que `get_thumbnail_urls` já seguia.
    cover_url: Optional[str] = None
    final_title: str = ""
    final_author: str = ""
    final_language: str = ""
    status: str
    is_scanned: Optional[bool] = None
    ocr_used: bool = False
    conversion_status: str = "not_started"
    send_status: str = "not_started"
    send_error: Optional[str] = None
    kindle_sent: bool = False
    error_message: Optional[str] = None

    # Multipformato e modo de processamento (Fase A)
    input_format: str = ""
    processing_mode: str = "document"

    # Fase K — campos extras para filtragem no modo lote
    translation_enabled: bool = False
    translation_status: str = "not_started"
    comic_translation_enabled: bool = False
    comic_translation_status: str = "not_started"
    comic_mode: bool = False
    manga_rtl: bool = False

    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator(
        "input_format", "processing_mode",
        "conversion_status", "send_status",
        "final_title", "final_author", "final_language",
        "translation_status", "comic_translation_status",
        mode="before",
    )
    @classmethod
    def coerce_none_str(cls, v: object) -> str:
        return "" if v is None else str(v)

    model_config = {"from_attributes": True}


class MetadataUpdate(BaseModel):
    """Corpo de POST /jobs/{id}/metadata."""

    final_title: Optional[str] = None
    final_author: Optional[str] = None
    final_language: Optional[str] = None
    final_filename: Optional[str] = None

    # Multipformato / modo de processamento (Fase A)
    comic_mode: Optional[bool] = None
    manga_rtl: Optional[bool] = None
    processing_mode: Optional[str] = None  # permite override de PDF para 'comic'

    # Tradução textual (Fase B / C)
    translation_enabled: Optional[bool] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    translator_engine: Optional[str] = None  # "argos" | "nllb"

    # Tradução experimental de quadrinhos (Fase D)
    comic_translation_enabled: Optional[bool] = None

    # Modo de fluxo (Estabilização v1 — P3)
    flow_mode: Optional[str] = None  # "recommended" | "advanced"


class DuplicateJobRequest(BaseModel):
    """Corpo de POST /jobs/{id}/duplicate — Fase M."""

    mode: str = "metadata_only"  # único modo disponível na Fase M


class CoverUpdate(BaseModel):
    """Corpo de POST /jobs/{id}/cover."""

    selected_cover_page: Optional[int] = None  # índice 0–4


class JobStatusResponse(BaseModel):
    """Retornado por GET /jobs/{id}/status — resposta leve para polling."""

    upload_id: int
    status: str
    ocr_status: str = "not_needed"
    conversion_status: str = "not_started"
    send_status: str = "not_started"
    translation_status: str = "not_started"
    comic_translation_status: str = "not_started"
    error_message: Optional[str] = None
    send_error: Optional[str] = None

    # Export final de quadrinhos (Estabilização v1)
    comic_export_status: str = "not_started"
    comic_export_error: Optional[str] = None
    flow_mode: str = "advanced"
    active_operation: Optional[str] = None

    # Progresso da operação ativa (P4) — anexado dinamicamente pelo endpoint
    progress: Optional[dict] = None
    phase: str = ""

    @field_validator("comic_export_status", "flow_mode", "phase", mode="before")
    @classmethod
    def _coerce_none_to_empty(cls, v: object) -> str:
        return "" if v is None else str(v)

    model_config = {"from_attributes": True}


class ComicTranslateRequest(BaseModel):
    """Corpo de POST /jobs/{id}/comic-translate."""

    source_language: Optional[str] = None
    target_language: Optional[str] = None
    translator_engine: Optional[str] = None  # "argos" | "nllb"


# ---------------------------------------------------------------------------
# Fase E — Revisão humana do sidecar de tradução de quadrinhos
# ---------------------------------------------------------------------------

class ReviewBlock(BaseModel):
    block_id: str
    original_text: str = ""
    translated_text: str = ""
    reviewed_text: str = ""
    review_status: str = "pending"  # pending | approved | edited | skipped
    confidence: Optional[float] = None
    bbox: Optional[list[float]] = None


class ReviewPage(BaseModel):
    page_number: int
    blocks: list[ReviewBlock] = []
    error: Optional[str] = None


class ReviewSidecar(BaseModel):
    job_id: Optional[int] = None
    source_language: str = ""
    target_language: str = ""
    pages: list[ReviewPage] = []


class ReviewStats(BaseModel):
    total: int = 0
    pending: int = 0
    approved: int = 0
    edited: int = 0
    skipped: int = 0


class ComicReviewResponse(BaseModel):
    sidecar: ReviewSidecar
    stats: ReviewStats


class BlockPatch(BaseModel):
    block_id: str
    reviewed_text: Optional[str] = None
    review_status: Optional[str] = None  # pending | approved | edited | skipped


class ComicReviewPatchRequest(BaseModel):
    patches: list[BlockPatch]


class ComicReviewExportResponse(BaseModel):
    json_path: str
    html_path: str
    md_path: str


# ---------------------------------------------------------------------------
# Fase F — Overlay visual experimental
# ---------------------------------------------------------------------------

class OverlayBlock(BaseModel):
    block_id: str
    original_text: str = ""
    translated_text: str = ""
    reviewed_text: str = ""
    review_status: str = "pending"  # pending | approved | edited | skipped
    bbox: Optional[list[float]] = None              # [x, y, w, h] normalizado 0..1
    overlay_position: Optional[list[float]] = None  # [x, y, w, h] — override do usuário (Fase G)
    overlay_style: Optional[dict] = None            # {font_size, color, bg_color}
    overlay_visibility: bool = True


class OverlayPage(BaseModel):
    page_number: int
    image_path: Optional[str] = None  # /storage/output/{id}/pages/page_NNN.jpg
    blocks: list[OverlayBlock] = []
    error: Optional[str] = None


class OverlaySidecar(BaseModel):
    job_id: Optional[int] = None
    source_language: str = ""
    target_language: str = ""
    pages: list[OverlayPage] = []


class OverlayResponse(BaseModel):
    sidecar: OverlaySidecar
    stats: ReviewStats


class OverlayPatch(BaseModel):
    block_id: str
    reviewed_text: Optional[str] = None
    review_status: Optional[str] = None
    overlay_position: Optional[list[float]] = None
    overlay_visibility: Optional[bool] = None
    overlay_style: Optional[dict] = None


class OverlayPatchRequest(BaseModel):
    patches: list[OverlayPatch]


class OverlayExportResponse(BaseModel):
    json_path: str
    html_path: str


# ---------------------------------------------------------------------------
# Fase H — Renderização visual não destrutiva
# ---------------------------------------------------------------------------

class RenderPageResult(BaseModel):
    page_number: int
    rendered_path: Optional[str] = None   # caminho local em disco
    serve_path: Optional[str] = None      # /storage/output/{id}/rendered_pages/page_NNN.png
    warnings: list[str] = []
    error: Optional[str] = None


class RenderManifest(BaseModel):
    job_id: Optional[int] = None
    source_language: str = ""
    target_language: str = ""
    total_pages: int = 0
    rendered_pages: int = 0
    total_visible_blocks: int = 0
    pages: list[RenderPageResult] = []
    zip_path: Optional[str] = None   # /storage/output/{id}/rendered_pages.zip
    cbz_path: Optional[str] = None   # /storage/output/{id}/rendered_pages.cbz


class RenderResponse(BaseModel):
    manifest: RenderManifest


# ---------------------------------------------------------------------------
# Fase I.A — Inpainting experimental não destrutivo
# ---------------------------------------------------------------------------

class InpaintParams(BaseModel):
    algorithm: str = "telea"       # "telea" | "ns" | "blur"
    mask_padding: int = 2          # pixels de expansão da máscara
    inpaint_radius: int = 3        # raio do inpainting (OpenCV) / fator blur (fallback)
    feather: int = 0               # pixels de suavização das bordas da máscara


class InpaintRequest(BaseModel):
    params: InpaintParams = InpaintParams()


class InpaintPageResult(BaseModel):
    page_number: int
    inpainted_path: Optional[str] = None  # caminho local em disco
    serve_path: Optional[str] = None      # /storage/output/{id}/inpaint_pages/page_NNN.png
    masked_blocks: int = 0
    algorithm_used: str = ""
    warnings: list[str] = []
    error: Optional[str] = None


class InpaintManifest(BaseModel):
    job_id: Optional[int] = None
    source_language: str = ""
    target_language: str = ""
    total_pages: int = 0
    inpainted_pages: int = 0
    params: InpaintParams = InpaintParams()
    pages: list[InpaintPageResult] = []
    zip_path: Optional[str] = None  # /storage/output/{id}/inpaint_pages.zip


class InpaintResponse(BaseModel):
    manifest: InpaintManifest


# ---------------------------------------------------------------------------
# Fase I.B — Curadoria visual e export final derivado
# ---------------------------------------------------------------------------

class FinalPageEntry(BaseModel):
    page_number: int
    selected_variant: str = "original"   # "original" | "render_overlay" | "inpaint"
    available_variants: list[str] = []
    notes: Optional[str] = None
    updated_at: Optional[str] = None
    serve_paths: dict = {}               # variant → serve_path
    # Populado após export
    final_serve_path: Optional[str] = None
    export_error: Optional[str] = None
    # Fase I.C — origem da seleção: "default" | "manual" | "auto"
    selection_source: str = "default"


class FinalManifest(BaseModel):
    job_id: Optional[int] = None
    total_pages: int = 0
    pages: list[FinalPageEntry] = []
    summary: dict = {}                   # {original: N, render_overlay: N, inpaint: N}
    exported_pages: int = 0
    zip_path: Optional[str] = None
    cbz_path: Optional[str] = None
    # Fase J.A — PDF derivado
    pdf_path: Optional[str] = None


class FinalResponse(BaseModel):
    manifest: FinalManifest


class FinalPagePatch(BaseModel):
    page_number: int
    selected_variant: str                # "original" | "render_overlay" | "inpaint"
    notes: Optional[str] = None


class FinalPatchRequest(BaseModel):
    patches: list[FinalPagePatch]


# ---------------------------------------------------------------------------
# Fase I.C — Curadoria semi-automática e operações em lote
# ---------------------------------------------------------------------------

class SuggestionPageEntry(BaseModel):
    page_number: int
    available_variants: list[str] = []
    scores: dict = {}                     # {variant: float}
    suggested_variant: str = "original"
    confidence_score: float = 0.0
    reasons: list[str] = []
    review_required: bool = False


class SuggestionManifest(BaseModel):
    job_id: Optional[int] = None
    total_pages: int = 0
    computed_at: Optional[str] = None
    pages: list[SuggestionPageEntry] = []


class SuggestionResponse(BaseModel):
    manifest: SuggestionManifest


class ApplySuggestionsRequest(BaseModel):
    only_undecided: bool = True    # True = apenas pages com selection_source=="default"
    min_confidence: float = 0.0   # Pula sugestões abaixo deste threshold


class ApplySuggestionsResponse(BaseModel):
    manifest: FinalManifest
    applied_count: int


# ---------------------------------------------------------------------------
# Fase J.A — Pipeline de export final derivado controlado
# ---------------------------------------------------------------------------

class ExportPageResult(BaseModel):
    page_number: int
    selected_variant: str
    source_path: Optional[str] = None
    final_path: Optional[str] = None
    exported_at: Optional[str] = None
    selection_source: str = "default"
    notes: Optional[str] = None
    error: Optional[str] = None


class ExportManifest(BaseModel):
    job_id: Optional[int] = None
    exported_at: Optional[str] = None
    total_pages: int = 0
    pdf_path: Optional[str] = None
    pages: list[ExportPageResult] = []


class ExportResponse(BaseModel):
    manifest: ExportManifest


# ---------------------------------------------------------------------------
# Fase K — Presets e Modo Lote
# ---------------------------------------------------------------------------

class Preset(BaseModel):
    id: str
    name: str
    description: str = ""
    is_system: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Configurações de processamento
    processing_mode: str = "document"      # "document" | "comic"
    comic_mode: bool = False
    manga_rtl: bool = False
    translation_enabled: bool = False
    source_language: str = ""
    target_language: str = ""
    translator_engine: str = ""            # "argos" | "nllb"
    nllb_model_name: str = ""
    nllb_device_preference: str = ""


class PresetCreate(BaseModel):
    name: str
    description: str = ""
    processing_mode: str = "document"
    comic_mode: bool = False
    manga_rtl: bool = False
    translation_enabled: bool = False
    source_language: str = ""
    target_language: str = ""
    translator_engine: str = ""
    nllb_model_name: str = ""
    nllb_device_preference: str = ""


class PresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    processing_mode: Optional[str] = None
    comic_mode: Optional[bool] = None
    manga_rtl: Optional[bool] = None
    translation_enabled: Optional[bool] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    translator_engine: Optional[str] = None
    nllb_model_name: Optional[str] = None
    nllb_device_preference: Optional[str] = None


class PresetDuplicateRequest(BaseModel):
    new_name: Optional[str] = None


class PresetListResponse(BaseModel):
    presets: list[Preset]


class ApplyPresetRequest(BaseModel):
    preset_id: str


class BatchItemResult(BaseModel):
    job_id: int
    status: str                              # "success" | "error" | "skipped"
    message: str = ""
    action: Optional[str] = None             # ação executada (informativo)
    warnings: Optional[list[str]] = None    # avisos não-fatais


class BatchResult(BaseModel):
    total: int
    succeeded: int
    failed: int
    skipped: int
    item_results: list[BatchItemResult]


class BatchJobsResponse(BaseModel):
    jobs: list[HistoryEntry]
    total: int


class BatchApplyPresetRequest(BaseModel):
    job_ids: list[int]
    preset_id: str


class BatchExportRequest(BaseModel):
    job_ids: list[int]


class BatchApplySuggestionsRequest(BaseModel):
    job_ids: list[int]
    only_undecided: bool = True
    min_confidence: float = 0.0


class BatchRetrySendRequest(BaseModel):
    job_ids: list[int]


class BatchSetFinalVariantRequest(BaseModel):
    job_ids: list[int]
    variant: str     # "original" | "render_overlay" | "inpaint"


class TestEmailResponse(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Fase N.A — Acabamento visual assistido (finished_pages)
# ---------------------------------------------------------------------------

class FinishAdjustments(BaseModel):
    """Ajustes PIL ImageEnhance aplicados sobre a variante final escolhida."""

    contrast: float = 1.0
    brightness: float = 1.0
    sharpness: float = 1.0
    saturation: float = 1.0


class FinishPagePatch(BaseModel):
    """Override visual para uma página específica."""

    page_number: int
    preset_override: Optional[str] = None
    adjustments_override: Optional[FinishAdjustments] = None


class FinishGlobalPatch(BaseModel):
    """Body de PATCH /jobs/{id}/comic-finish."""

    global_preset: Optional[str] = None
    global_adjustments: Optional[FinishAdjustments] = None
    page_patches: list[FinishPagePatch] = []
    auto_fix_layout: Optional[bool] = None


class LayoutIssue(BaseModel):
    issue_type: str
    block_id: str
    severity: str
    detail: str


class LayoutSuggestion(BaseModel):
    font_scale: float
    detail: str
    has_overflow: bool
    has_low_contrast: bool


class FinishPageEntry(BaseModel):
    page_number: int
    source_variant: str
    preset_override: Optional[str] = None
    adjustments_override: Optional[dict] = None
    source_path: Optional[str] = None
    finished_path: Optional[str] = None
    exported_at: Optional[str] = None
    warnings: list[str] = []
    layout_issues: list[LayoutIssue] = []
    suggested_adjustments: Optional[LayoutSuggestion] = None
    auto_adjustments_applied: bool = False


class FinishManifest(BaseModel):
    job_id: int
    global_preset: str = "none"
    global_adjustments: FinishAdjustments = FinishAdjustments()
    pages: list[FinishPageEntry] = []
    zip_path: Optional[str] = None
    cbz_path: Optional[str] = None
    pdf_path: Optional[str] = None
    auto_fix_layout: bool = False
    analyzed_at: Optional[str] = None


class FinishResponse(BaseModel):
    manifest: FinishManifest
    quality_score: Optional[int] = None


# ---------------------------------------------------------------------------
# Fase O — Consistência Visual Global
# ---------------------------------------------------------------------------

class ConsistencyStats(BaseModel):
    mean: float
    std: float
    min: float
    max: float


class ImageMetrics(BaseModel):
    """Métricas visuais extraídas de uma imagem real (Fase P.A)."""

    mean_brightness: float
    rms_contrast: float
    histogram_entropy: float
    dark_fraction: float
    light_fraction: float


class ConsistencyPageEntry(BaseModel):
    page_number: int
    effective_adjustments: dict = {}
    is_outlier: bool = False
    outlier_reasons: list[str] = []
    is_manual_override: bool = False
    excluded_from_harmonization: bool = False
    harmonization_applied: bool = False
    # Fase P.A — métricas visuais
    image_metrics: Optional[ImageMetrics] = None
    is_visual_outlier: bool = False
    visual_outlier_reasons: list[str] = []
    preview_path: Optional[str] = None


class ConsistencyManifest(BaseModel):
    job_id: int
    analyzed_at: Optional[str] = None
    consistency_score: float = 0.0
    page_count: int = 0
    stat_distributions: dict = {}
    preset_frequency: dict = {}
    suggested_global_style: Optional[dict] = None
    global_recommendations: list[str] = []
    pages: list[ConsistencyPageEntry] = []
    warnings: list[str] = []
    harmonization_applied_at: Optional[str] = None
    # Fase P.A — scores visuais
    consistency_score_visual: Optional[float] = None
    consistency_score_combined: Optional[float] = None
    visual_analyzed_at: Optional[str] = None
    preview_generated_at: Optional[str] = None


class ConsistencyResponse(BaseModel):
    manifest: ConsistencyManifest


class ConsistencyPagePatch(BaseModel):
    is_manual_override: Optional[bool] = None
    excluded_from_harmonization: Optional[bool] = None


class ConsistencyApplyBody(BaseModel):
    mode: str = "apply"  # "apply" | "reset"


# ---------------------------------------------------------------------------
# Fase P.B — Recomendação de preset assistida
# ---------------------------------------------------------------------------

class PresetPreviewEntry(BaseModel):
    page_number: int
    preview_path: Optional[str] = None  # JPEG side-by-side before|after


class PresetRecommendation(BaseModel):
    job_id: int
    recommended_preset: str = "none"
    alternatives: list[str] = []
    reasons: list[str] = []
    confidence_score: float = 0.0
    page_level_exceptions: list[dict] = []  # [{page_number, reason}]
    applied_preset: Optional[str] = None
    manual_overrides_present: bool = False
    recommended_at: Optional[str] = None
    applied_at: Optional[str] = None
    preview_entries: list[PresetPreviewEntry] = []


class PresetRecommendationResponse(BaseModel):
    recommendation: PresetRecommendation


class PresetApplyBody(BaseModel):
    preset: str
    mode: str = "apply_to_all_eligible"
    # "apply_to_all_eligible" | "apply_to_filtered" | "reset_to_previous"
    target_pages: Optional[list[int]] = None


# ---------------------------------------------------------------------------
# Fase Q — Health check e repair de job
# ---------------------------------------------------------------------------


class JobHealthCheck(BaseModel):
    name: str
    ok: bool
    detail: str = ""


class JobHealthResponse(BaseModel):
    job_id: int
    is_healthy: bool
    checks: list[JobHealthCheck]
    manifests_present: list[str]
    manifests_missing: list[str]
    recommended_next_action: str


class JobRepairResponse(BaseModel):
    job_id: int
    repaired: list[str]
    not_repaired: list[str]
    health: JobHealthResponse


# ---------------------------------------------------------------------------
# Estabilização v1 — Export final de quadrinhos
# ---------------------------------------------------------------------------


class ComicExportRequest(BaseModel):
    """Corpo de POST /jobs/{id}/comic-export."""

    target: str = "epub"  # "epub" (CBZ + EPUB via KCC) | "cbz" (somente CBZ)
    force: bool = False


class ComicExportResponse(BaseModel):
    """Resposta de GET/POST /jobs/{id}/comic-export."""

    job_id: int
    comic_export_status: str = "not_started"
    comic_export_error: Optional[str] = None
    manifest: Optional[dict] = None
    epub_url: Optional[str] = None
    cbz_url: Optional[str] = None


class PipelineStep(BaseModel):
    """Etapa do pipeline comic (Estabilização v1)."""

    id: str
    status: str  # done | available | blocked
    blocked_reason: Optional[str] = None
    prerequisite_step: Optional[str] = None


class PipelineStateResponse(BaseModel):
    """Resposta de GET /jobs/{id}/pipeline-state."""

    job_id: int
    processing_mode: str = "document"
    render_done: bool = False
    steps: list[PipelineStep] = []
    current_step: str = ""
