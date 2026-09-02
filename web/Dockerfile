# Duas etapas: o Node constrói e vai embora; o que sobe é o Caddy com arquivos
# estáticos. A imagem final não carrega o Node, nem as dependências de build,
# nem o código-fonte — ela carrega HTML, CSS e JavaScript já prontos.
FROM node:20-slim AS construcao
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
COPY contrato/ /contrato/

# NÃO HÁ BASE DE API PARA CONFIGURAR, e havia: um `ARG VITE_API=/api` aqui, e um
# comentário dizendo que em produção o backend ficava sob `/api`. Nenhuma das
# duas coisas era verdade. O `contrato/api.js` mora fora da raiz do Vite, então a
# substituição de build nunca o alcançava — o valor era lido e jogado fora, e o
# comentário mandava a próxima pessoa procurar um `/api` que não existe.
#
# A regra de verdade está escrita lá: o caminho da chamada é O MESMO em
# desenvolvimento e em produção. A borda repassa `/upload` para `/upload`. Não há
# ambiente onde seja outro, logo não há o que configurar nem como configurar
# errado. Mesma origem, nenhum CORS.
RUN npm run build

FROM caddy:2-alpine
COPY --from=construcao /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
