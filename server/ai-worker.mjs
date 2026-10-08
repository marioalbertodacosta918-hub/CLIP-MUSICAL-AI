// Motor privado do CLIP MUSICAL AI: Cloudflare Workers AI (FLUX.1 Schnell).
// Use apenas a cota gratuita configurada na conta Cloudflare.
// As credenciais permanecem nas variáveis privadas do Render, nunca no HTML/GitHub.
// FLUX Schnell é text-to-image: NÃO faz edição de imagem de referência.
const MODEL="@cf/black-forest-labs/flux-1-schnell";
const MAX_BODY=50000;
const ASPECT={"16:9":"wide cinematic 16:9 landscape composition","9:16":"vertical 9:16 portrait composition","1:1":"square 1:1 composition"};
const respond=(data,status=200,headers={})=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}
});
function safeEqual(a,b){
 if(typeof a!=="string"||typeof b!=="string")return false;
 let diff=a.length^b.length;const n=Math.max(a.length,b.length);
 for(let i=0;i<n;i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
 return diff===0;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!=="/api/generate-scene")return respond({error:"Not found"},404);
  if(request.headers.get("origin")!==env.ALLOWED_ORIGIN || !env.ALLOWED_ORIGIN)
   return respond({error:"Origem não autorizada."},403);
  const cors={
   "access-control-allow-origin":env.ALLOWED_ORIGIN,
   "access-control-allow-methods":"POST, OPTIONS",
   "access-control-allow-headers":"content-type, authorization",
   "vary":"Origin"
  };
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST")return respond({error:"Método inválido."},405,cors);
  if(!env.CLIP_OWNER_TOKEN||!env.CF_API_TOKEN||!env.CF_ACCOUNT_ID)
   return respond({error:"Configure CF_ACCOUNT_ID, CF_API_TOKEN e CLIP_OWNER_TOKEN nas variáveis privadas do Render."},503,cors);
  if(env.CF_IMAGE_MODEL && env.CF_IMAGE_MODEL!==MODEL)
   return respond({error:"Modelo inválido. Somente FLUX.1 Schnell está autorizado nesta versão."},503,cors);
  if(!/^[0-9a-f]{32}$/i.test(env.CF_ACCOUNT_ID))
   return respond({error:"CF_ACCOUNT_ID inválido. Confira o ID no painel Cloudflare."},503,cors);
  if(!safeEqual(request.headers.get("authorization")||"","Bearer "+env.CLIP_OWNER_TOKEN))
   return respond({error:"Senha privada do servidor incorreta."},401,cors);
  const length=Number(request.headers.get("content-length")||0);
  if(length>MAX_BODY)return respond({error:"Solicitação grande demais."},413,cors);
  let body;
  try{
   const raw=await request.text();
   if(raw.length>MAX_BODY)return respond({error:"Solicitação grande demais."},413,cors);
   body=JSON.parse(raw);
  }catch{return respond({error:"JSON inválido."},400,cors)}
  if(typeof body?.prompt!=="string"||body.prompt.length<10||body.prompt.length>1900)
   return respond({error:"Descrição da cena inválida (10–1900 caracteres)."},400,cors);
  if(body.reference_image)
   return respond({error:"O modelo gratuito FLUX Schnell gera imagens a partir de texto e não aceita foto como entrada."},400,cors);
  const aspect=ASPECT[body.format||"16:9"];
  if(!aspect)return respond({error:"Formato inválido."},400,cors);
  // O modelo pode devolver imagem quadrada; enquadramento solicitado por prompt não é garantia.
  const prompt=(body.prompt+". "+aspect+". No writing, no text, no watermark.").slice(0,2048);
  const endpoint="https://api.cloudflare.com/client/v4/accounts/"+env.CF_ACCOUNT_ID+
   "/ai/run/"+MODEL;
  try{
   const response=await fetch(endpoint,{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.CF_API_TOKEN,"Content-Type":"application/json"},
    body:JSON.stringify({prompt,steps:4})
   });
   if(!response.ok){
    if(response.status===429)return respond({error:"Cota ou limite de requisições da Cloudflare atingido. Verifique o painel Cloudflare e tente mais tarde."},429,cors);
    if(response.status===401||response.status===403)
     return respond({error:"Cloudflare recusou o acesso. Confira o token e as permissões Workers AI."},502,cors);
    return respond({error:"Cloudflare recusou a geração de imagem. Verifique cota, modelo e permissões.",status_ia:response.status},502,cors);
   }
   const data=await response.json();
   const base64=data?.result?.image;
   if(data?.success!==true||typeof base64!=="string"||base64.length<8||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
    return respond({error:"A Cloudflare não retornou uma imagem válida."},502,cors);
   return respond({image:"data:image/jpeg;base64,"+base64},200,cors);
  }catch{
   return respond({error:"Não foi possível se comunicar com a Cloudflare AI."},502,cors);
  }
 }
};
