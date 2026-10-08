import assert from "node:assert/strict";
import worker from "../server/ai-worker.mjs";
const env={OPENAI_API_KEY:"fake-secret",CLIP_OWNER_TOKEN:"private-token",ALLOWED_ORIGIN:"https://clip-musical-ai.hatchable.site",IMAGE_MODEL:"gpt-image-1"};
const base="https://my-worker.example/api/generate-scene";
function req({method="POST",origin=env.ALLOWED_ORIGIN,auth="Bearer private-token",body={prompt:"Um cenário cinematográfico ao pôr do sol",format:"16:9"}}={}){
 return new Request(base,{method,headers:{"Origin":origin,"Authorization":auth,"Content-Type":"application/json"},body:method==="POST"?JSON.stringify(body):undefined});
}
let bad=await worker.fetch(req({origin:"https://evil.example"}),env);
assert.equal(bad.status,403);
bad=await worker.fetch(req({auth:"Bearer incorrect"}),env);
assert.equal(bad.status,401);
bad=await worker.fetch(req({body:{prompt:"curto"}}),env);
assert.equal(bad.status,400);
const options=await worker.fetch(req({method:"OPTIONS"}),env);
assert.equal(options.status,204);
let called="";
const realFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
 called=url;
 assert.equal(options.headers.Authorization,"Bearer fake-secret");
 return new Response(JSON.stringify({data:[{b64_json:"AAEC"}]}),{status:200,headers:{"Content-Type":"application/json"}});
};
try{
 let good=await worker.fetch(req(),env);
 assert.equal(good.status,200);
 assert.equal((await good.json()).image,"data:image/png;base64,AAEC");
 assert.ok(called.endsWith("/images/generations"));
 const tiny="data:image/png;base64,"+Buffer.from([137,80,78,71]).toString("base64");
 good=await worker.fetch(req({body:{prompt:"Outra cena romântica cinematográfica",format:"9:16",reference_image:tiny}}),env);
 assert.equal(good.status,200);
 assert.ok(called.endsWith("/images/edits"));
 console.log("PASS: autenticação, origem, geração e edição com referência (API simulada)");
}finally{globalThis.fetch=realFetch;}
