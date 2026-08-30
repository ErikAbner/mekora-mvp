# Tokens — artefato gerado, não editado à mão

Estes dois arquivos são a **saída** do design system, que vive em `~/dev/mekora-ds`
e é cópia de terceiro sob licença MIT. Pela `DEC-0038 §5` ele **não** entra neste
repositório: misturar embaralharia licença e atribuição.

O que entra é o resultado, commitado como artefato. Assim o produto tem os valores
sem depender de um caminho relativo — que era o arranjo anterior, e quebrava em
silêncio se alguém clonasse só um dos dois repositórios.

## Para regenerar

```
cd ~/dev/mekora-ds
npm run controller        # localhost:4400, ajusta e Save & apply
npm run build:output
cp packages/ui/src/styles/theme.css       ~/dev/mekora/web/tokens/theme.css
cp packages/theme-css/src/variables.css   ~/dev/mekora/web/tokens/variables.css
```

O `Save & apply` do controller confere contraste antes de deixar sair, e foi ele
que pegou o caso que a nossa medição não cobria: o `estado/perigo` medido como
**tinta sobre superfície** passava, e como **superfície com texto em cima** não.
