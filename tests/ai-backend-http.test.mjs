import { strict as assert } from "node:assert";
import { createAppServer } from "../server/index.mjs";

const env={OPENAI_API_KEY:"fake-key",CLIP_OWNER_TOKEN:"private-token",ALLOWED_ORIGIN:"https://clip-musical-ai.hatchable.site"};
const server=createAppServer(env);
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const nativeFetch=globalThis.fetch;
let upstreamCalls=0;
globalThis.fetch=async(url,opts)=>{
 if(String(url).startsWith("https://api.openai.com/")){
  upstreamCalls++;
  assert.equal(opts.headers.Authorization,"Bearer fake-key");
  return new Response(JSON.stringify({data:[{b64_json:"AAEC"}]}),{status:200,headers:{"content-type":"application/json"}});
 }
 return nativeFetch(url,opts);
};
const req=(body,token="private-token")=>nativeFetch(base+"/api/generate-scene",{
 method:"POST",
 headers:{Origin:env.ALLOWED_ORIGIN,Authorization:"Bearer "+token,"Content-Type":"application/json"},
 body:JSON.stringify(body)
});
try{
 const health=await nativeFetch(base+"/health");
 assert.equal(health.status,200);
 assert.deepEqual(await health.json(),{status:"ok"});
 const unauthorized=await req({prompt:"Paisagem cinematográfica de montanhas ao amanhecer"},"wrong");
 assert.equal(unauthorized.status,401);
 assert.equal(upstreamCalls,0);
 const generated=await req({prompt:"Paisagem cinematográfica de montanhas ao amanhecer",format:"16:9"});
 assert.equal(generated.status,200);
 assert.match((await generated.json()).image,/^data:image\/png;base64,/);
 assert.equal(upstreamCalls,1);
 console.log("PASS: hospedagem Node/Render responde /health, bloqueia token inválido e gera imagem via API simulada");
}finally{
 globalThis.fetch=nativeFetch;
 await new Promise(resolve=>server.close(resolve));
}
