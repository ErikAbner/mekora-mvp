/* Conta — segurança: os navegadores em que você entrou.
 *
 * Existe porque sair só valia AQUI. O `/sair` encerra a sessão deste navegador,
 * e não havia nada que respondesse "onde mais eu estou logado?" — nem meio de
 * derrubar um computador emprestado, um celular perdido ou um navegador do
 * trabalho. O modelo `Sessao` já guardava tudo o que a tela precisa desde que
 * existe: criação, último uso, vencimento. Faltava mostrar.
 *
 * A LINHA NUNCA CARREGA O TOKEN. O que o servidor guarda é o resumo sha256, e
 * mandá-lo daria a quem lesse a resposta a metade que falta. Quem é este
 * navegador é decidido no servidor, comparando resumo com resumo, e o que chega
 * aqui é um booleano.
 *
 * Construída sem o desenho: o `figma-local` exige o Dev Mode ligado, e a aba
 * estava em modo design. Está em DESVIOS.md, para o pente fino.
 */
import { useCallback, useEffect, useState } from "react";
import {
  encerrarOutrasSessoes,
  encerrarSessao,
  lerSessoes,
} from "../../../contrato/api.js";
import { Botao } from "../componentes/Botao.jsx";
import "./conta-seguranca.css";

/* "há 3 dias" diz mais que uma data para julgar se uma sessão é sua: ninguém
 * lembra em que dia entrou, mas todo mundo sabe se usou o Mekora ontem. */
function quando(iso) {
  if (!iso) return "sem uso registrado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem uso registrado";
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function vence(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dias = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (dias <= 0) return "vence hoje";
  return dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
}

export function ContaSeguranca({ pessoa, aoSair }) {
  const [sessoes, setSessoes] = useState(null);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(() => {
    return lerSessoes()
      .then((r) => setSessoes(r?.sessoes ?? []))
      .catch(() => setErro("Não foi possível ler os navegadores agora."));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const derrubar = async (id) => {
    setOcupado(true);
    setAviso(null);
    try {
      await encerrarSessao(id);
      await carregar();
      setAviso("Esse navegador saiu.");
    } catch {
      setErro("Não deu para encerrar esse navegador.");
    } finally {
      setOcupado(false);
    }
  };

  const derrubarOutras = async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await encerrarOutrasSessoes();
      await carregar();
      /* O número, e não "pronto": sem ele a pessoa não sabe se havia alguma
         coisa lá — e é justamente isso que ela quer saber. */
      const n = r?.encerradas ?? 0;
      setAviso(
        n === 0
          ? "Não havia outro navegador. Só este."
          : n === 1
            ? "Um navegador saiu. Este continua."
            : `${n} navegadores saíram. Este continua.`,
      );
    } catch {
      setErro("Não deu para encerrar os outros navegadores.");
    } finally {
      setOcupado(false);
    }
  };

  const outras = (sessoes ?? []).filter((s) => !s.este).length;

  return (
    /* O cabecalho fica FORA do `.conta`, que e a linha de trilha mais painel.
       Dentro dele o cabecalho vira uma terceira coluna e empurra o painel para
       fora da tela — foi o que aconteceu na primeira medida. */
    /* `chao` no lugar do fundo liso: a Conta se abre POR CIMA do chão
       pontilhado, e é o que o `895:10599` mostra. */
    <main className="conta-painel">
        {/* SEGURANÇA TAMBÉM TEM ABERTURA VISUAL. Esta página nasceu depois dos
            quatro quadros de conta e, por isso, não possui arte própria no seu
            frame. A escolha vem da biblioteca oficial: `966:25339`, “magic
            password”, mostra a credencial e o gesto que a cria. Aqui ele fala
            diretamente da entrada por link sem inventar cadeado ou escudo de
            outra linguagem. É decorativo, então não entra na leitura sonora. */}
        <img
          className="conta-desenho seguranca-desenho"
          src="/icones/ilustracao-seguranca.svg"
          alt=""
          aria-hidden="true"
        />
        {erro && <p className="conta-erro" role="alert">{erro}</p>}
        {aviso && <p className="seguranca-aviso" role="status">{aviso}</p>}

        <section className="seguranca-como">
          <h2>Como se entra aqui</h2>
          <p>
            Não há senha. Você pede um link, ele chega por e-mail, vale quinze
            minutos e serve uma vez só. Quem tem acesso ao seu e-mail entra na
            sua conta — é onde a segurança do Mekora mora, e vale proteger lá.
          </p>
        </section>

        <section className="seguranca-navegadores">
          <h2>Onde você está logado</h2>

          {sessoes === null && <p className="seguranca-espera">Buscando…</p>}

          {/* Lista vazia não acontece com sessão válida — este navegador é uma
              delas. Se acontecer, é falha de leitura, e a tela diz isso em vez
              de mostrar "nenhum", que seria mentira tranquilizadora. */}
          {sessoes !== null && sessoes.length === 0 && (
            <p className="seguranca-espera">
              A lista voltou vazia, e isso não deveria acontecer com você logado.
              Recarregue a página.
            </p>
          )}

          {sessoes !== null && sessoes.length > 0 && (
            <ul className="seguranca-lista">
              {sessoes.map((s) => (
                <li key={s.id} className={s.este ? "este" : undefined}>
                  <div className="seguranca-texto">
                    <p className="seguranca-titulo">
                      {s.este ? "Este navegador" : "Outro navegador"}
                    </p>
                    {/* O que o servidor SABE, e nada além. Não há nome de
                        aparelho nem cidade: o Mekora não guarda user-agent nem
                        IP, e inventar "Chrome no Mac" a partir de nada seria
                        dar à pessoa uma certeza falsa para decidir. */}
                    <p className="seguranca-detalhe">
                      Último uso {quando(s.ultimo_uso ?? s.criada_em)}
                      {vence(s.expira_em) ? ` · ${vence(s.expira_em)}` : ""}
                    </p>
                  </div>
                  {!s.este && (
                    <Botao onClick={() => derrubar(s.id)} porque={ocupado ? "Espere a operação anterior terminar" : null}>
                      Encerrar
                    </Botao>
                  )}
                </li>
              ))}
            </ul>
          )}

          {outras > 0 && (
            <div className="seguranca-todas">
              <Botao tom="secundaria" onClick={derrubarOutras} porque={ocupado ? "Espere a operação anterior terminar" : null}>
                Sair de todos os outros
              </Botao>
              <p>
                Este navegador continua. Os outros vão precisar de um link novo
                para voltar.
              </p>
            </div>
          )}
        </section>
        </main>
  );
}
