// Adaptador HTTP para hospedar o mesmo motor de IA em um serviço Node.js.
// Chaves e tokens são recebidos APENAS por variáveis privadas do serviço.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import worker from "./ai-worker.mjs";

const MAX_BODY=7000000;
function json(res,status,body){
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
 res.end(JSON.stringify(body));
}
export function createAppServer(env=process.env){
 return createServer(async(req,res)=>{
  const path=(req.url||"/").split("?")[0];
  if(path==="/health"&&req.method==="GET")return json(res,200,{status:"ok"});
  let body;
  try{
   if(req.method==="POST"){
    const chunks=[];let bytes=0;
    for await (const chunk of req){
     bytes+=chunk.byteLength;
     if(bytes>MAX_BODY)return json(res,413,{error:"Solicitação grande demais."});
     chunks.push(chunk);
    }
    body=Buffer.concat(chunks);
   }
   const request=new Request("https://backend.local"+(req.url||"/"),{
     method:req.method,headers:req.headers,body
   });
   const response=await worker.fetch(request,env);
   const headers=Object.fromEntries(response.headers);
   const data=Buffer.from(await response.arrayBuffer());
   res.writeHead(response.status,headers);
   res.end(data);
  }catch(e){
   json(res,500,{error:"O servidor não conseguiu processar esta solicitação."});
  }
 });
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const port=Number(process.env.PORT||3000);
 const server=createAppServer();
 server.listen(port,"0.0.0.0",()=>console.log("CLIP MUSICAL AI backend ativo na porta "+port));
}
