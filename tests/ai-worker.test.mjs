import assert from "node:assert/strict";
import worker from "../server/ai-worker.mjs";

const env={
 CF_ACCOUNT_ID:"0123456789abcdef0123456789abcdef",
 CF_API_TOKEN:"fake-cloudflare-api-token",
 CF_IMAGE_MODEL:"@cf/black-forest-labs/flux-1-schnell",
 CLIP_OWNER_TOKEN:"private-owner-token",
 ALLOWED_ORIGIN:"https://clip-musical-ai.hatchable.site"
};
const base="https://my-backend.example/api/generate-scene";
function req({
 method="POST",origin=env.ALLOWED_ORIGIN,auth="Bearer private-owner-token",
 body={prompt:"Paisagem musical cinematográfica ao pôr do sol",format:"16:9"}
}={}){
 return new Request(base,{
  method,headers:{Origin:origin,Authorization:auth,"Content-Type":"application/json"},
  body:method==="POST"?JSON.stringify(body):undefined
 });
}
async function call(options={},environment=env){
 return worker.fetch(req(options),environment);
}
assert.equal((await call({origin:"https://evil.example"})).status,403);
assert.equal((await call({auth:"Bearer incorrect"})).status,401);
assert.equal((await call({body:{prompt:"short"}})).status,400);
assert.equal((await call({body:{prompt:"Cena cinematográfica romântica",format:"4:5"}})).status,400);
assert.equal((await call({body:{prompt:"Cena cinematográfica romântica",reference_image:"data:image/png;base64,AAEC"}})).status,400);
assert.equal((await call({}, {...env,CF_API_TOKEN:""})).status,503);
assert.equal((await call({}, {...env,CF_IMAGE_MODEL:"@cf/something-paid"})).status,503);
const preflight=await call({method:"OPTIONS"});
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get("access-control-allow-origin"),env.ALLOWED_ORIGIN);

const rawFetch=globalThis.fetch;
let calls=0;
globalThis.fetch=async(url,options)=>{
 calls++;
 assert.equal(url,"https://api.cloudflare.com/client/v4/accounts/"+env.CF_ACCOUNT_ID+"/ai/run/@cf/black-forest-labs/flux-1-schnell");
 assert.equal(options.headers.Authorization,"Bearer "+env.CF_API_TOKEN);
 const sent=JSON.parse(options.body);
 assert.equal(sent.steps,4);
 assert.match(sent.prompt,/cinematic 16:9/i);
 return new Response(JSON.stringify({success:true,result:{image:"QUJDREVGR0g="}}),{status:200,headers:{"Content-Type":"application/json"}});
};
try{
 const response=await call();
 assert.equal(response.status,200);
 assert.equal((await response.json()).image,"data:image/jpeg;base64,QUJDREVGR0g=");
 assert.equal(calls,1);
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,errors:[{message:"quota reached"}]}),{status:429,headers:{"Content-Type":"application/json"}});
 assert.equal((await call()).status,429);
 console.log("PASS: Cloudflare FLUX Schnell, proteção de credenciais, origem, referência não suportada e cota (API simulada)");
}finally{globalThis.fetch=rawFetch;}
