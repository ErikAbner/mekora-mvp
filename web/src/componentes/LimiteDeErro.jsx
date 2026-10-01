import { Component } from "react";
import "./limite-de-erro.css";

export class LimiteDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro, informacao) {
    console.error("O Mekora não conseguiu desenhar a tela.", erro, informacao);
  }

  render() {
    if (!this.state.falhou) return this.props.children;

    return (
      <main className="falha-da-interface" role="alert">
        <p className="falha-da-interface-marca">Mekora local</p>
        <h1>Esta tela não conseguiu abrir.</h1>
        <p>
          Seus livros e seu progresso continuam guardados. Recarregue para usar
          a versão mais recente da interface ou volte para a Mesa.
        </p>
        <div className="falha-da-interface-acoes">
          <button type="button" onClick={() => window.location.reload()}>Recarregar</button>
          <a href="/mesa">Voltar para a Mesa</a>
        </div>
      </main>
    );
  }
}
