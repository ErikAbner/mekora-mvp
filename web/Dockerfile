# Duas etapas: o Node constrói e vai embora; o que sobe é o Caddy com arquivos
# estáticos. A imagem final não carrega o Node, nem as dependências de build,
# nem o código-fonte — ela carrega HTML, CSS e JavaScript já prontos.
FROM node:20-slim AS construcao
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
COPY contrato/ /contrato/

# Em produção o backend fica atrás do mesmo domínio, sob /api. Isso vale mais que
# conveniência: mesma origem significa nenhum CORS para configurar e nenhum
# cabeçalho permissivo para esquecer aberto.
ARG VITE_API=/api
ENV VITE_API=$VITE_API
RUN npm run build

FROM caddy:2-alpine
COPY --from=construcao /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
