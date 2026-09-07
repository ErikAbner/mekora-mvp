# Ensaio de restauração — 07/09/2026 15:49

Gerado por `scripts/ensaio-de-restauracao.sh`. Não editar à mão:
rode o ensaio de novo e ele reescreve este arquivo.

```
snapshot:   kindle_tool_20260907_154906.db
origem:     /Users/sipnm/dev/mekora/.ver2/backups
destino:    /var/folders/sx/zgknrg395b34x41xj98ks7gw0000gn/T//mekora-ensaio-JWveQI/restaurado  (temporário, apagado no fim)
porta:      8399
duração:    6s
resultado:  PASSOU — caminho inteiro comprovado
storage:    /Users/sipnm/dev/mekora/.ver2/storage
```

## Verificações da restauração

```
  ok                 integridade do banco  ok
  ok                 chaves estrangeiras  nenhuma órfã
  ok                 contagem por tabela  21 tabelas, 2872 linhas
  ok                 caminhos apontam para o destino  nenhum resto da raiz antiga
  ok                 registro tem arquivo  378 caminho(s) conferido(s)
  ok                 nenhum arquivo truncado  nenhum de tamanho zero
  ok                 arquivos idênticos ao espelho  694 arquivo(s) comparado(s)
  ok                 permissões no destino  banco e pastas legíveis e graváveis
```

## O teste funcional, contra a cópia restaurada

```
  ok      registros consultáveis: /history devolveu 7 trabalhos, 6 com leitura
  ok      livro abre: "Cadernos de campo" — 4944 bytes, 11 entradas, zip íntegro
  ok      notas sobrevivem: 3 no livro, com texto — "O que separa uma estante de uma pasta é a me…"
  ok      progresso sobrevive: capítulo 1, deslocamento 120, de 8 capítulos, fração 0.97
  ok      todo registro de livro tem o arquivo dele no disco
```

## O que a restauração fez

```
  banco restaurado: kindle_tool.db (1.0 MB)
  arquivos restaurados: 693 (54.4 MB)
  caminhos reescritos: 378 valores em 2 grafia(s) de raiz
```
