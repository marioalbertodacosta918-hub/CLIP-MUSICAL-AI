// CLIP MUSICAL AI: ponte segura para geração de imagens.
// Implante como Cloudflare Worker. Configure secrets OPENAI_API_KEY e CLIP_OWNER_TOKEN,
// e variável ALLOWED_ORIGIN para a origem EXATA do site. Nunca publique segredos no GitHub.
// Uso previsto: protótipo privado do proprietário, não serviço público multiusuário.
const MAX_BODY=7000000;
const SIZES={"16:9":"1536x1024","9:16":"1024x1536","1:1":"1024x1024"};
const respond=(data,status=200,headers={})=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}
});
function safeEqual(a,b){
 if(typeof a!=="string"||typeof b!=="string")return false;
 let diff=a.length^b.length;const n=Math.max(a.length,b.length);
 for(let i=0;i<n;i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
 return diff===0;
}
function referenceImage(data){
 const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data);
 if(!m||m[2].length>MAX_BODY)throw new Error("Imagem de referência inválida ou grande demais.");
 const binary=atob(m[2]);if(binary.length>4500000)throw new Error("Imagem de referência grande demais.");
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return {mime:m[1],bytes};
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!=="/api/generate-scene")return respond({error:"Not found"},404);
  if(!env.OPENAI_API_KEY||!env.CLIP_OWNER_TOKEN||!env.ALLOWED_ORIGIN)
   return respond({error:"Servidor não configurado."},503);
  if(request.headers.get("origin")!==env.ALLOWED_ORIGIN)
   return respond({error:"Origem não autorizada."},403);
  const cors={
   "access-control-allow-origin":env.ALLOWED_ORIGIN,
   "access-control-allow-methods":"POST, OPTIONS",
   "access-control-allow-headers":"content-type, authorization",
   "vary":"Origin"
  };
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST")return respond({error:"Método inválido."},405,cors);
  if(!safeEqual(request.headers.get("authorization")||"","Bearer "+env.CLIP_OWNER_TOKEN))
   return respond({error:"Não autorizado."},401,cors);
  const length=Number(request.headers.get("content-length")||0);
  if(length>MAX_BODY)return respond({error:"Arquivo grande demais."},413,cors);
  let body;
  try{
   const text=await request.text();
   if(text.length>MAX_BODY)return respond({error:"Arquivo grande demais."},413,cors);
   body=JSON.parse(text);
  }catch{return respond({error:"JSON inválido."},400,cors)}
  if(typeof body?.prompt!=="string"||body.prompt.length<10||body.prompt.length>2000)
   return respond({error:"Descrição da cena inválida."},400,cors);
  const size=SIZES[body.format||"16:9"];
  if(!size)return respond({error:"Formato inválido."},400,cors);
  try{
   const model=env.IMAGE_MODEL||"gpt-image-1";
   let endpoint,options;
   if(body.reference_image){
    const {mime,bytes}=referenceImage(body.reference_image);
    const form=new FormData();
    form.set("model",model);form.set("prompt",body.prompt);form.set("size",size);
    form.set("image",new Blob([bytes],{type:mime}),mime==="image/png"?"referencia.png":mime==="image/webp"?"referencia.webp":"referencia.jpg");
    endpoint="https://api.openai.com/v1/images/edits";
    options={method:"POST",headers:{Authorization:"Bearer "+env.OPENAI_API_KEY},body:form};
   }else{
    endpoint="https://api.openai.com/v1/images/generations";
    options={method:"POST",headers:{Authorization:"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},
     body:JSON.stringify({model,prompt:body.prompt,size})};
   }
   const result=await fetch(endpoint,options);
   if(!result.ok)return respond({error:"O gerador recusou a solicitação.",status_ia:result.status},502,cors);
   const image=(await result.json())?.data?.[0]?.b64_json;
   if(!image)return respond({error:"O gerador não retornou uma imagem."},502,cors);
   return respond({image:"data:image/png;base64,"+image},200,cors);
  }catch(e){
   if((e?.message||"").startsWith("Imagem de referência"))
    return respond({error:e.message},400,cors);
   return respond({error:"Erro ao gerar cena."},502,cors);
  }
 }
};
