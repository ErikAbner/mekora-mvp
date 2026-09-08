# Prompt para Claude — testes de UX e funcionalidade do Kindle Local

Você é um pesquisador sênior de UX, QA lead e product designer. Avalie um protótipo navegável do **Kindle Local**, uma ferramenta que prepara, converte e envia arquivos para o Kindle. O teste deve combinar análise heurística, simulação de usuários, cobertura funcional e recomendações priorizadas.

## Contexto do produto

Depois que a pessoa anexa um arquivo, ela entra em um fluxo guiado:

1. confirmação do arquivo;
2. escolha entre **Preparar para mim (recomendado/automático)** e **Configurar manualmente**;
3. definição do nome e tradução;
4. revisão visual das cinco primeiras páginas;
5. configuração do endereço Kindle e do momento do envio;
6. revisão final;
7. conversão, envio, progresso e próximos passos.

Objetivos do produto:

- reduzir ansiedade e carga cognitiva;
- permitir conclusão rápida para iniciantes;
- manter controle e transparência para usuários avançados;
- nunca enviar um arquivo sem confirmação explícita;
- explicar recomendações e preservar escolhas ao alternar de caminho;
- comunicar privacidade, tempo estimado, estado atual e próxima ação.

## Material a testar

- Arquivo local anexado: `index.html`
- Viewports: desktop 1440×900, tablet 768×1024 e mobile 390×844.
- Idioma principal: português do Brasil.

## Perfis simulados

Execute cada jornada com estes cinco perfis:

1. **Iniciante cauteloso** — primeiro envio ao Kindle, pouca familiaridade técnica, teme perder ou expor o arquivo.
2. **Leitor frequente** — quer concluir em menos de dois minutos e aceita boas recomendações.
3. **Usuário avançado** — deseja controlar formato, idioma, metadados, destino e agendamento.
4. **Usuário mobile com pressa** — usa apenas uma mão, conexão instável e pode interromper a jornada.
5. **Usuário com acessibilidade** — navegação apenas por teclado e leitor de tela; considere também baixa visão, zoom de 200% e preferência por movimento reduzido.

## Cenários obrigatórios

### A. Caminho recomendado

- Inicie com o EPUB de exemplo.
- Escolha “Preparar para mim”.
- Aceite o nome sugerido e “Não traduzir”.
- Revise as cinco páginas.
- Envie imediatamente ao Kindle.
- Confirme se o estado final deixa claro: o que foi concluído, o que está ocorrendo, quanto falta e o que fazer depois.

### B. Caminho manual

- Volte ao início e selecione “Configurar manualmente”.
- Altere o título.
- Selecione tradução para inglês.
- Escolha um formato diferente, se disponível.
- Agende para hoje às 21h.
- Revise a tela final e confirme se todas as alterações aparecem corretamente.

### C. Alternância de caminho

- Comece no recomendado, altere o título e a tradução.
- Volte à escolha de caminho e mude para manual.
- Verifique se as escolhas são preservadas, se novos controles aparecem e se nada é redefinido silenciosamente.
- Retorne ao recomendado e verifique novamente.

### D. Erros e limites

Simule ou inspecione o comportamento esperado para:

- título vazio, muito longo, com emoji e caracteres especiais;
- e-mail Kindle vazio, malformado e com espaços;
- arquivo corrompido, protegido por DRM, grande demais ou em formato incompatível;
- ausência de conexão durante conversão ou envio;
- falha parcial após a conversão e antes do envio;
- endereço Kindle que ainda não autorizou o remetente;
- clique duplo no botão final;
- uso dos botões voltar/avançar do navegador e recarregamento;
- fechamento da página durante processamento;
- agendamento em horário passado e mudança de fuso;
- cancelamento e repetição do envio.

### E. Responsividade e acessibilidade

- Navegue por todo o fluxo apenas com Tab, Shift+Tab, Enter, Espaço e setas.
- Verifique foco visível, ordem de foco, nomes acessíveis e anúncio de mudança de etapa.
- Inspecione contraste, tamanho de alvos, zoom a 200%, reflow e rolagem horizontal.
- Confirme que cartões selecionáveis expõem estado selecionado e não dependem apenas de cor.
- Avalie textos com leitor de tela, especialmente progresso, radios, erros e estimativas.
- Verifique comportamento com `prefers-reduced-motion`.

## Método de avaliação

Para cada perfil e cenário:

1. Descreva a intenção do usuário.
2. Liste as ações executadas, uma a uma.
3. Registre o resultado observado.
4. Classifique o resultado como **passou**, **passou com ressalvas**, **falhou** ou **não testável**.
5. Avalie:
   - clareza da escolha;
   - esforço percebido;
   - confiança;
   - reversibilidade;
   - visibilidade do estado;
   - prevenção e recuperação de erros;
   - acessibilidade;
   - consistência entre desktop e mobile.
6. Atribua severidade:
   - **S0** bloqueador/risco de envio incorreto ou perda;
   - **S1** impede a principal jornada;
   - **S2** causa confusão relevante ou retrabalho;
   - **S3** problema menor de acabamento.
7. Para cada problema, forneça evidência, impacto, correção específica e critério de aceite testável.

## Perguntas de UX que precisam de resposta

- A diferença entre recomendado e manual é compreendida em até 10 segundos?
- A recomendação parece confiável e explica “por quê”?
- O modo recomendado realmente reduz decisões sem esconder consequências?
- O usuário entende que pode voltar e editar sem perder progresso?
- A revisão das cinco páginas parece útil ou burocrática?
- “Não traduzir” comunica preservação do original?
- Destino, horário e ação irreversível estão claros antes da confirmação?
- A tela de progresso diferencia “converter”, “enviar” e “aparecer na biblioteca”?
- O próximo passo no dispositivo Kindle está explícito?
- Há algum dark pattern, falsa urgência ou certeza indevida?

## Testes de conteúdo

Compare as seguintes variações e recomende uma:

- “Preparar para mim” vs. “Fluxo recomendado” vs. “Configuração automática”.
- “Configurar manualmente” vs. “Personalizar”.
- “Converter e enviar para o Kindle” vs. “Confirmar envio”.
- “Está tudo certo” vs. “Aprovar prévia”.

Para cada comparação, avalie compreensão, expectativa, confiança e risco de interpretação incorreta. Não invente métricas quantitativas: se não houver participantes reais, identifique conclusões como hipóteses.

## Saída exigida

Entregue o relatório nesta ordem:

1. **Resumo executivo** — máximo 10 linhas.
2. **Scorecard** — notas de 1 a 5 para compreensão, velocidade, controle, confiança, acessibilidade e recuperação de erros.
3. **Matriz de cobertura** — perfis × cenários × viewport, com status.
4. **Achados priorizados** — tabela com ID, severidade, etapa, evidência, impacto, recomendação e critério de aceite.
5. **Resultados funcionais** — testes que passaram, falharam ou não puderam ser executados.
6. **Análise por etapa** — do arquivo ao acompanhamento.
7. **Análise recomendado vs. manual** — clareza, persistência de estado e lacunas.
8. **Acessibilidade** — achados alinhados à WCAG 2.2 AA.
9. **Recomendação de microcopy** — texto atual, texto sugerido e justificativa.
10. **Backlog** — Quick wins, próxima iteração e itens antes de produção.
11. **Cinco experimentos de produto** — hipótese, variante, métrica principal, guardrail e critério de decisão.
12. **Veredito** — “pronto para teste moderado”, “precisa de ajustes antes do teste” ou “não está pronto”, com justificativa.

## Regras

- Não afirme que algo foi testado se apenas foi inferido pelo código ou pela imagem.
- Diferencie claramente observação, hipótese e recomendação.
- Não se limite à estética; priorize conclusão segura da tarefa.
- Não proponha funcionalidades fora do escopo sem explicar o problema que resolvem.
- Cite a etapa e o elemento exato em cada achado.
- Ao final, faça uma segunda passagem procurando contradições no próprio relatório e corrija-as.
