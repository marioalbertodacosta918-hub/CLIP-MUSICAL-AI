
# CLIP MUSICAL AI — Cloudflare Workers AI gratuita no Render

## Situação
O backend Node está hospedado no Render com o nome clip-musical-ai-ia.
- Backend: https://clip-musical-ai-ia.onrender.com
- Painel: https://dashboard.render.com/web/srv-db3mj62j9qps73894iag
- Código: branch feat/clip-musical-ai-v2
- A versão original do site NÃO foi substituída.

## Provedor
- Cloudflare Workers AI com FLUX.1 Schnell: @cf/black-forest-labs/flux-1-schnell
- Disponível para geração de imagens a partir de texto.
- A Cloudflare informa 10.000 Neurons gratuitos/dia no Workers Free: isso não é quantidade de imagens.
- O modelo NÃO aceita foto de referência nessa integração. A foto enviada é mantida na montagem, não enviada à Cloudflare.
- Os formatos 16:9/9:16/1:1 são solicitados por texto; a saída exata não é garantida.
- Esta etapa gera imagens estáticas, e o navegador monta o videoclipe WebM com música e transições.

## Configuração privada no Render (feita pelo proprietário)
Abra o serviço clip-musical-ai-ia no Render e entre em Environment.
Adicione estas variáveis com seus valores verdadeiros:
- CF_ACCOUNT_ID: Account ID da conta Cloudflare (32 caracteres hexadecimais).
- CF_API_TOKEN: token secreto Workers AI da Cloudflare, com permissões adequadas.
- CLIP_OWNER_TOKEN: senha particular longa, inventada pelo proprietário, diferente do CF_API_TOKEN.

Já configurada pelo projeto: ALLOWED_ORIGIN = https://clip-musical-ai.hatchable.site.
Opcional: CF_IMAGE_MODEL = @cf/black-forest-labs/flux-1-schnell. O código fixa esse modelo.
NUNCA coloque essas credenciais em código público, no GitHub, no chat, nem em capturas de tela.

Na interface do aplicativo, o campo Senha de acesso ao servidor usa somente CLIP_OWNER_TOKEN.
**Não digite o token da Cloudflare nesse campo.**

## Testes
- GET /health confirma funcionamento do Node.
- POST /api/generate-scene solicita a geração ao modelo, quando credenciais e cota estão disponíveis.
- Testes de GitHub Actions usam uma API simulada e não consomem a cota da Cloudflare.

## Segurança e limites
O servidor foi desenhado para uso pessoal protegido por senha; antes de disponibilizar a muitos usuários, implementar contas, rate limits e limite de custos. A Cloudflare pode cobrar se o proprietário escolher um plano pago; no plano Workers Free, a cota é limitada.
Antes de divulgar publicamente, testar origem, limites e navegador móvel.

## Próximos passos
1. Preencher as três variáveis privadas no Render.
2. Testar uma geração real na cota gratuita da Cloudflare.
3. Publicar a interface V2 na origem permitida, só depois de confirmar com o proprietário.
