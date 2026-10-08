import { strict as assert } from "node:assert";
import { createAppServer } from "../server/index.mjs";
const env={
 CF_ACCOUNT_ID:"0123456789abcdef0123456789abcdef",
 CF_API_TOKEN:"fake-cloudflare-key",
 CLIP_OWNER_TOKEN:"private-token",
 ALLOWED_ORIGIN:"https://clip-musical-ai.hatchable.site,https://marioalbertodacosta918-hub.github.io"
};
const server=createAppServer(env);
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const nativeFetch=globalThis.fetch;
let upstreamCalls=0;
globalThis.fetch=async(url,opts)=>{
 if(String(url).startsWith("https://api.cloudflare.com/")){
  upstreamCalls++;
  assert.equal(opts.headers.Authorization,"Bearer fake-cloudflare-key");
  return new Response(JSON.stringify({success:true,result:{image:"QUJDREVGR0g="}}),
   {status:200,headers:{"content-type":"application/json"}});
 }
 return nativeFetch(url,opts);
};
const req=(body,token="private-token")=>nativeFetch(base+"/api/generate-scene",{
 method:"POST",
 headers:{Origin:"https://clip-musical-ai.hatchable.site",Authorization:"Bearer "+token,"Content-Type":"application/json"},
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
 assert.match((await generated.json()).image,/^data:image\/jpeg;base64,/);
 assert.equal(upstreamCalls,1);
 console.log("PASS: Render Node /health, Cloudflare FLUX gratuita simulada e proteção por senha");
}finally{
 globalThis.fetch=nativeFetch;
 await new Promise(resolve=>server.close(resolve));
}
