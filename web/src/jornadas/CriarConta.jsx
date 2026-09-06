/* Criar conta — nó 941:23106.
 *
 * Ela é a explicação que faltava antes de um empurrão silencioso. Quem não
 * entrou e clica em Estante, Canvas ou Estudos era mandado para `/entrar` por
 * um `<Navigate replace>` — sem uma palavra sobre o que aconteceu nem por quê,
 * e com o botão de voltar do navegador inútil, porque `replace` apaga de onde
 * a pessoa veio.
 *
 * Os três itens do desenho são exatamente os três lugares que empurram, e o
 * primeiro diz a razão inteira: "São o seu acervo, e ele precisa de um dono".
 *
 * O QUE DIVERGE DO DESENHO, e está em DESVIOS.md: o botão primário do Figma diz
 * "Preparar arquivos". Numa folha cujo assunto é a conta, um primário que leva
 * para longe dela deixa o símbolo sem nenhum caminho para a coisa que ele
 * nomeia — não há, no desenho, botão que crie conta. Aqui o primário leva para
 * `/entrar`, que é onde a conta nasce, e o secundário continua sendo o "Agora
 * não" do desenho, que leva para a Mesa: preparar nunca exigiu conta, e é isso
 * que o subtítulo promete.
 */
import { Link, useNavigate } from "react-router-dom";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Botao } from "../componentes/Botao.jsx";
import "./criar-conta.css";

/* O texto é o do desenho, palavra por palavra. */
const RAZOES = [
  {
    n: 1,
    titulo: "Estante, Canvas e Conexões",
    sobre: "São o seu acervo, e ele precisa de um dono.",
  },
  {
    n: 2,
    titulo: "O seu Kindle fica salvo",
    sobre: "Sem conta, o endereço é digitado a cada envio.",
  },
  {
    n: 3,
    titulo: "Sem conta, esta aba é o único endereço",
    sobre: "O preparo não morre se você fechar, mas não haverá Mesa onde reencontrá-lo.",
  },
];

export function CriarConta({ lugar }) {
  const navegar = useNavigate();

  return (
    <div className="mesa">
      <Cabecalho />

      <main className="criar-conta">
        {/* O CABEÇALHO É UM BLOCO, e não quatro irmãos soltos: `895:11594` separa
            as suas partes por 32 e o separa da lista e das ações por 40. Uma
            coluna de vão único não sabe dizer os dois números. */}
        <div className="criar-conta-topo">
          <p className="criar-conta-etiqueta">Criação de conta</p>

          <h1>Criar conta no Mekora</h1>
          <p className="titulo-24 discreto criar-conta-abre">
            Converter não exige conta e não vai exigir.
            <br />
            A conta serve para o que vem depois:
          </p>

          {/* Diz QUAL lugar pediu conta. O desenho não tem esta linha, e sem ela a
              folha explica o geral e cala sobre o clique que a abriu. */}
          {lugar && (
            <p className="criar-conta-porque">
              Você pediu {lugar}. É um dos três.
            </p>
          )}
        </div>

        <ol className="criar-conta-razoes">
          {RAZOES.map((r) => (
            <li key={r.n}>
              {/* A capitular é do sistema — Display/Large/Capitular, itálica,
                  64px. Ela é o número da lista, então `aria-hidden`: o leitor de
                  tela já numera a `<ol>`, e ouvir "um um" é ruído. */}
              <span className="criar-conta-numero" aria-hidden="true">{r.n}</span>
              <span className="criar-conta-razao">
                <span className="titulo-24 criar-conta-razao-titulo">{r.titulo}</span>
                <span className="criar-conta-razao-sobre">{r.sobre}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="criar-conta-acoes">
          <Botao tom="secundaria" onClick={() => navegar("/mesa")}>Agora não</Botao>
          <Botao tom="primaria" onClick={() => navegar("/entrar")}>Criar conta</Botao>
        </div>

        <p className="criar-conta-rodape">
          A conta é um e-mail e nada mais — nem senha, nem nome. O que o Mekora
          guarda está em{" "}
          <Link to="/politica-de-privacidade">Política de privacidade</Link>.
        </p>
      </main>
    </div>
  );
}
