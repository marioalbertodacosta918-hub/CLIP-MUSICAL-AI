# CLIP MUSICAL AI — geração real de imagens (prévia)

## Situação
O painel `ai-v2.js` e o servidor `server/ai-worker.mjs` foram adicionados à ramificação de desenvolvimento. **Nenhum servidor foi publicado e nenhuma chave real foi configurada.** A versão pública original permanece inalterada.

## Fluxo
1. O usuário seleciona uma música, o gênero, o estilo e, opcionalmente, uma imagem.
2. O painel cria descrições de cenas usando gênero, tema e trechos da letra. Não transcreve áudio nem detecta BPM automaticamente.
3. Após confirmação explícita de possíveis custos, o navegador solicita imagens ao servidor configurado.
4. O servidor usa a chave secreta da API para chamar geração de imagens; com imagem de referência (PNG, JPEG ou WebP), usa edição de imagem.
5. As imagens recebidas são incorporadas à montagem WebM já existente.

## Arquitetura segura
A chave do provedor de imagens **não pode** ser inserida no HTML, JavaScript do navegador, GitHub ou variável pública do Hatchable. Ela pertence ao servidor intermediário.

O exemplo é compatível com Cloudflare Workers. Configurar como segredos privados:
- `OPENAI_API_KEY`: chave de API do provedor (cobrança independente do ChatGPT).
- `CLIP_OWNER_TOKEN`: token privado de acesso para uso exclusivo do proprietário.
- `ALLOWED_ORIGIN`: origem exata do site que fará chamadas (por exemplo, `https://clip-musical-ai.hatchable.site`).
- `IMAGE_MODEL` (opcional): modelo de imagens autorizado.

O endpoint disponibilizado pelo servidor é `POST /api/generate-scene`. O navegador recebe apenas a URL pública do Worker e um token de acesso do proprietário em uma sessão; nenhuma chave do provedor é enviada ao navegador.

## Limitações e segurança antes de lançar
- O exemplo é **somente para uso privado do proprietário**. Antes de disponibilizar a usuários externos, implementar login robusto, limites por usuário, limites de custo e monitoramento.
- A geração de imagens custa créditos na API. O projeto solicita confirmação antes de enviar pedidos.
- A imagem de referência é enviada ao servidor da IA. Não é garantida fidelidade absoluta do personagem.
- Esta etapa gera **imagens estáticas**, não vídeos generativos. O movimento vem do mecanismo local (zoom/transição).
- Testes automáticos simulam a resposta da API e não representam cobrança nem validação com o provedor real.
- A integração não funciona no site público até configurar, publicar e testar um servidor autorizado.
- O Hatchable pode não importar automaticamente esta ramificação: verificar a configuração antes de publicar.

## Testar
```sh
node tests/check-v2.mjs
node tests/ai-worker.test.mjs
```
O GitHub Actions também realiza um teste em Chromium na versão móvel simulada.
