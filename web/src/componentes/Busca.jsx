/* A busca do cabeçalho — nó 941:23107 ("Estudo · seletor").
 *
 * O botão estava DESLIGADO desde o começo, com o motivo escrito no código:
 * "não há rota de busca no backend". Agora há (`busca.py`), e o botão virou
 * campo.
 *
 * O DESENHO mostra o painel abrindo colado embaixo da barra, com 12px de
 * respiro interno, linhas de 108px separadas por um fio, e cada linha com a
 * capa de 47×60 à esquerda, o título em cima e "autor · formato" embaixo.
 * As notas e os estudos usam a MESMA linha com outro subtítulo — o rótulo é
 * "Buscar em Mekora", e o Mekora tem os três.
 *
 * O TECLADO É REQUISITO, não enfeite: um campo que só responde a mouse
 * exclui quem navega por tab, e o desenho mostra uma lista — lista se percorre
 * com as setas. `Esc` fecha, ↑↓ andam, `Enter` vai.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icone } from "./Icone.jsx";
import { buscarNoMekora } from "../../../contrato/api.js";
import "./busca.css";

const iconeBuscar = "/icones/icone-buscar.svg";

/* Espera antes de perguntar. Sem isto cada tecla é uma consulta, e "abcdef"
 * dispara seis — cinco delas para respostas que ninguém vai ler. */
const ESPERA_MS = 220;

function achatar(r) {
  if (!r) return [];
  return [
    ...r.livros.map((l) => ({
      chave: `livro-${l.id}`,
      /* A ficha do livro mora em `/estante/:id`, e não em `/livro/:id` — que não
         existe e cai no "este endereço não existe". */
      rota: `/estante/${l.id}`,
      capa: l.capa,
      titulo: l.titulo,
      /* O desenho escreve "Ana duarte - Epub". Autor e formato podem faltar os
         dois — e aí a linha diz o que sabe, em vez de mostrar um traço solto. */
      abaixo: [l.autor, l.formato].filter(Boolean).join(" · ") || "Livro seu",
    })),
    ...r.notas.map((n) => ({
      chave: `nota-${n.id}`,
      rota: `/nota/${n.id}`,
      capa: null,
      titulo: n.trecho,
      abaixo: n.comentario || (n.job_id ? "Nota de um livro" : "Nota escrita por você"),
    })),
    ...r.estudos.map((e) => ({
      chave: `estudo-${e.id}`,
      rota: `/estudo/${e.id}`,
      capa: null,
      titulo: e.nome,
      abaixo: e.sobre || "Estudo",
    })),
  ];
}

export function Busca() {
  const navegar = useNavigate();
  const caixa = useRef(null);
  const campo = useRef(null);
  const [termo, setTermo] = useState("");
  const [aberta, setAberta] = useState(false);
  const [resposta, setResposta] = useState(null);
  const [erro, setErro] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [marcado, setMarcado] = useState(0);

  const itens = useMemo(() => achatar(resposta), [resposta]);

  useEffect(() => {
    const limpo = termo.trim();
    if (!limpo) { setResposta(null); setErro(null); return; }

    let vivo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      buscarNoMekora(limpo)
        .then((r) => { if (vivo) { setResposta(r); setErro(null); setMarcado(0); } })
        .catch((e) => {
          if (!vivo) return;
          setResposta(null);
          /* 401 aqui não é falha: é a busca dizendo o que ela precisa. Ela só
             olha o que é da pessoa, e sem conta não há "da pessoa". */
          setErro(e.status === 401 ? "Entre para buscar no que é seu." : e.message);
        })
        .finally(() => vivo && setBuscando(false));
    }, ESPERA_MS);

    return () => { vivo = false; clearTimeout(t); };
  }, [termo]);

  /* Clique fora fecha. Sem isto o painel fica aberto por cima da tela e a
   * pessoa precisa achar o campo de novo só para sumir com ele. */
  useEffect(() => {
    if (!aberta) return;
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberta(false); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberta]);

  const ir = useCallback((item) => {
    setAberta(false);
    setTermo("");
    navegar(item.rota);
  }, [navegar]);

  const tecla = (e) => {
    if (e.key === "Escape") { setAberta(false); campo.current?.blur(); return; }
    if (!itens.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((i) => (i + 1) % itens.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((i) => (i - 1 + itens.length) % itens.length); }
    if (e.key === "Enter") { e.preventDefault(); ir(itens[marcado]); }
  };

  const curto = resposta?.curto;
  const vazio = resposta && !curto && !itens.length;

  return (
    <div className="busca-caixa" ref={caixa}>
      <div className="busca">
        <Icone src={iconeBuscar} />
        <input
          ref={campo}
          type="search"
          className="busca-campo"
          placeholder="Buscar em Mekora"
          aria-label="Buscar em Mekora"
          role="combobox"
          aria-expanded={aberta && !!termo.trim()}
          aria-controls="busca-resultados"
          autoComplete="off"
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberta(true); }}
          onFocus={() => setAberta(true)}
          onKeyDown={tecla}
        />
      </div>

      {aberta && termo.trim() && (
        <div className="busca-painel" id="busca-resultados">
          {/* O produto diz o que está fazendo e o que não achou. Painel vazio
              sem frase é indistinguível de painel quebrado. */}
          {erro && <p className="busca-recado" role="alert">{erro}</p>}
          {!erro && curto && <p className="busca-recado">Escreva ao menos duas letras.</p>}
          {!erro && !curto && buscando && !itens.length && <p className="busca-recado">Procurando…</p>}
          {!erro && vazio && (
            <p className="busca-recado">
              Nada com esse texto. A busca olha título, autor, nome do arquivo, o
              texto das notas e o assunto dos estudos — não o interior dos livros.
            </p>
          )}

          {!!itens.length && (
            <ul className="busca-lista" role="listbox" aria-label="Resultados">
              {itens.map((item, i) => (
                <li key={item.chave}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === marcado}
                    className={`busca-item${i === marcado ? " marcado" : ""}`}
                    onMouseEnter={() => setMarcado(i)}
                    onClick={() => ir(item)}
                  >
                    <span className="busca-capa">
                      {item.capa && <img src={item.capa} alt="" />}
                    </span>
                    <span className="busca-texto">
                      <span className="busca-titulo">{item.titulo}</span>
                      <span className="busca-abaixo">{item.abaixo}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
