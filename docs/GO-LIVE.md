# Mekora MVP — checklist de go-live

Este checklist é o portão de publicação do MVP. Um item não confirmado permanece aberto; ausência de evidência não conta como aprovação.

## 1. Antes da janela de publicação

- [ ] domínio apontado para o IP correto;
- [ ] Docker e Docker Compose disponíveis no servidor;
- [ ] portas 80 e 443 liberadas;
- [ ] espaço em disco conferido para imagens, banco, documentos e backups;
- [ ] `.env` criado diretamente no servidor e fora do Git;
- [ ] `MEKORA_DOMINIO` contém somente o domínio, sem protocolo;
- [ ] `DONO_EMAIL` contém ao menos uma conta administrativa;
- [ ] SMTP validado com uma mensagem real;
- [ ] remetente autorizado no Kindle, quando o envio estiver habilitado;
- [ ] política de retenção e capacidade de processamento revisadas;
- [ ] último backup copiado para um destino fora do servidor.

## 2. Portões do código

```bash
bash scripts/verificar-release.sh
```

Todos os comandos precisam terminar sem falha. Avisos devem ser lidos e registrados; não devem ser ignorados automaticamente.

## 3. Primeira subida

```bash
cp .env.example .env
# preencher o arquivo antes de continuar
docker compose up -d --build
docker compose ps
```

O serviço `backend` precisa aparecer como `healthy`. Em seguida:

```bash
curl -fsS https://SEU-DOMINIO/health
docker compose exec web caddy validate --config /etc/caddy/Caddyfile
docker compose exec backend alembic current
```

## 4. Smoke test no endereço público

- [ ] landing abre em HTTPS sem alerta;
- [ ] pedido de link de entrada chega ao e-mail esperado;
- [ ] link autentica uma vez e expira corretamente;
- [ ] upload pequeno chega ao Preparo;
- [ ] conversão simples termina e abre no leitor;
- [ ] progresso de leitura sobrevive a uma recarga;
- [ ] destaque, nota e marcador sobrevivem a uma recarga;
- [ ] Mesa, Estante, Notas, Estudos e Canvas abrem sem erro;
- [ ] tema e preferência permanecem entre visitas;
- [ ] layout conferido em desktop e telefone;
- [ ] logs não expõem conteúdo, credenciais ou tokens completos.

## 5. Backup e restauração

Crie um backup logo após a subida:

```bash
python3 scripts/backup.py
python3 scripts/backup.py --conferir
```

O procedimento completo de recuperação está em [`RESTAURAR.md`](RESTAURAR.md). Uma publicação só é considerada reversível depois que ao menos um snapshot foi aberto e validado fora do caminho de produção.

## 6. Observação inicial

Nas primeiras 24 horas, acompanhar:

- espaço em disco e crescimento de `storage/`;
- estado dos containers e reinicializações;
- tempo e falhas por etapa de conversão;
- entrega dos e-mails de acesso;
- erros 4xx/5xx e tentativas bloqueadas por limite;
- consumo de CPU e memória em OCR, Calibre e KCC.

## 7. Reversão

Se saúde, autenticação, conversão ou leitura falharem:

1. interromper novos uploads;
2. preservar logs e o volume de dados;
3. voltar para a tag anterior;
4. reconstruir os containers;
5. validar `/health` e a versão da migração;
6. restaurar dados somente se houver evidência de corrupção ou migração incompatível.

Nunca substitua `storage/` por uma cópia durante escrita ativa. Use o fluxo documentado de restauração.

## Estado da candidata `v1.0.0-mvp.1`

- backend: 936 aprovados, 1 ignorado;
- interface e contratos: 14 aprovados;
- build web: aprovado;
- segredo ou dado pessoal rastreado: nenhum encontrado;
- validação visual: desktop e 390 px;
- build Docker local nesta preparação: não executado porque o ambiente não possui Docker; deve ser confirmado no servidor antes da promoção.
