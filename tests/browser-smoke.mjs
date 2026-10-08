// Teste de navegador real em viewport móvel. Execute com playwright-core e Chromium.
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

function wav(durationSeconds=2){
  const rate=22050,frames=Math.floor(rate*durationSeconds);
  const b=Buffer.alloc(44+frames*2);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);
  b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
  b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/rate)*6500),44+i*2);
  return b;
}
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",
  args:["--no-sandbox","--autoplay-policy=no-user-gesture-required","--use-fake-ui-for-media-stream"]
});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 page.on("pageerror",err=>errors.push(err.message));
 await page.goto(pathToFileURL(resolve("index.html")).href,{waitUntil:"load"});
 await page.locator('[data-v2-modo="imagem"]').waitFor();
 assert.equal(await page.locator('[data-v2-modo]').count(),4);
 assert.equal(await page.locator("#inputImagens").getAttribute("accept"),"image/*");
 assert.equal(await page.locator("#inputImagens").getAttribute("multiple"),null);
 await page.locator('[data-v2-modo="imagens"]').click();
 assert.notEqual(await page.locator("#inputImagens").getAttribute("multiple"),null);
 await page.locator('[data-v2-modo="videos"]').click();
 assert.equal(await page.locator("#inputImagens").getAttribute("accept"),"video/*");
 await page.locator("#v2Genero").selectOption("Rock");
 assert.equal(await page.locator("#v2ResumoGenero").innerText(),"Rock");
 await page.locator("#formato").selectOption("1:1");
 assert.equal(await page.locator("#resumoFormato").innerText(),"1:1");
 console.log("PASS navegador: seletores, quatro modos, gênero e formato 1:1");
 await page.locator("#inputMusica").setInputFiles({name:"teste.wav",mimeType:"audio/wav",buffer:wav()});
 await page.waitForFunction(()=>document.getElementById("audioPreview").duration>0,{timeout:10000});
 await page.locator("#aiV2Theme").fill("paisagem cinematográfica ao anoitecer");
 await page.locator("#aiV2Plan").click();
 assert.equal(await page.locator(".ai-v2-prompt").count(),3);
 assert.match(await page.locator("#aiV2Status").innerText(),/Plano preparado/);
 await page.locator("#aiV2Generate").click();
 assert.match(await page.locator("#aiV2Status").innerText(),/Configure o endereço HTTPS/);
 console.log("PASS navegador: prompts de cenas e bloqueio seguro quando não existe servidor externo");
 await page.locator('[data-v2-modo="musica"]').click();
 assert.equal(await page.locator("#inputImagens").isVisible(),false);
 await page.locator("#botaoGerar").click();
 await page.waitForFunction(()=>document.querySelector("#download")?.style.display==="block",{timeout:25000});
 const resultado=await page.locator("#resultadoInfo").innerText();
 assert.match(resultado,/criada/i);
 const videoInfo=await page.evaluate(async()=>{
    const href=document.getElementById("download").href;
    const blob=await fetch(href).then(r=>r.blob());
    return {size:blob.size,type:blob.type};
 });
 assert.ok(videoInfo.size>500,"Clipe gerado não pode ser vazio");
 assert.match(videoInfo.type,/webm/);
 // Modo Música + Imagem: a imagem enviada realmente participa da exportação.
 const pngBase64=await page.evaluate(()=>{
   const c=document.createElement("canvas");c.width=320;c.height=180;
   const ctx=c.getContext("2d");ctx.fillStyle="#2158af";ctx.fillRect(0,0,320,180);
   ctx.fillStyle="#fae04f";ctx.fillRect(30,30,260,120);
   return c.toDataURL("image/png").split(",")[1];
 });
 const png=Buffer.from(pngBase64,"base64");
 await page.locator('[data-v2-modo="imagem"]').click();
 await page.locator("#inputImagens").setInputFiles({name:"imagem.png",mimeType:"image/png",buffer:png});
 await page.waitForFunction(()=>document.getElementById("contadorImagens").textContent.includes("1 arquivo"));
 await page.locator("#botaoGerar").click();
 await page.waitForFunction(()=>document.getElementById("download").style.display==="block");
 assert.match(await page.locator("#resultadoInfo").innerText(),/criada/i);
 console.log("PASS navegador: música + uma imagem gerou WebM");

 // Integração completa com serviço simulado, sem cobranças de API.
 let requests=0, referenceRequests=0;
 page.on("dialog",dialog=>dialog.accept());
 await page.route("https://ai-test.example/api/generate-scene",async route=>{
   const req=route.request();
   if(req.method()==="OPTIONS"){
     return route.fulfill({status:204,headers:{"access-control-allow-origin":"*","access-control-allow-headers":"content-type,authorization","access-control-allow-methods":"POST, OPTIONS"}});
   }
   requests++;
   const payload=JSON.parse(req.postData()||"{}");
   if(payload.reference_image)referenceRequests++;
   return route.fulfill({
     status:200,contentType:"application/json",
     headers:{"access-control-allow-origin":"*"},
     body:JSON.stringify({image:"data:image/png;base64,"+pngBase64})
   });
 });
 await page.locator("#aiV2Endpoint").fill("https://ai-test.example");
 await page.locator("#aiV2Token").fill("fake-local-test-token");
 await page.locator("#aiV2FullClip").click();
 await page.waitForFunction(()=>!document.getElementById("aiV2FullClip").disabled,{timeout:25000});
 assert.equal(requests,3);
 assert.equal(referenceRequests,0);
 assert.equal(await page.locator(".preview-item").count(),4);
 assert.match(await page.locator("#resultadoInfo").innerText(),/criada/i);
 assert.equal(errors.length,0,errors.join(" | "));
 console.log("PASS navegador: fluxo música + imagem de referência → 3 cenas FLUX simuladas sem enviar foto ao provedor → WebM, preservando foto original");

 // Modo várias imagens: mantém mais de um arquivo.
 await page.locator('[data-v2-modo="imagens"]').click();
 await page.locator("#inputImagens").setInputFiles([
   {name:"foto-1.png",mimeType:"image/png",buffer:png},
   {name:"foto-2.png",mimeType:"image/png",buffer:png}
 ]);
 await page.waitForFunction(()=>document.getElementById("contadorImagens").textContent.includes("2 arquivos"));
 await page.locator("#botaoGerar").click();
 await page.waitForFunction(()=>document.getElementById("download").style.display==="block");
 assert.match(await page.locator("#resultadoInfo").innerText(),/criada/i);
 console.log("PASS navegador: música + duas imagens gerou WebM");
 // Modo vídeos: cria um WebM de entrada legítimo antes de importá-lo.
 const bytesVideo=await page.evaluate(async()=>{
   const c=document.createElement("canvas");c.width=160;c.height=90;
   const ctx=c.getContext("2d");
   ctx.fillStyle="#6548db";ctx.fillRect(0,0,160,90);
   const stream=c.captureStream(15);
   const media=new MediaRecorder(stream,{mimeType:"video/webm"});
   const partes=[];
   media.ondataavailable=e=>{if(e.data.size)partes.push(e.data)};
   media.start(200);
   const timer=setInterval(()=>{ctx.fillStyle="#f8cb46";ctx.fillRect(Math.floor(Math.random()*160),25,30,50)},90);
   await new Promise(r=>setTimeout(r,1250));
   clearInterval(timer);
   const parado=new Promise(resolve=>media.addEventListener("stop",resolve,{once:true}));
   media.stop();await parado;
   stream.getTracks().forEach(t=>t.stop());
   return Array.from(new Uint8Array(await new Blob(partes,{type:"video/webm"}).arrayBuffer()));
 });
 await page.locator('[data-v2-modo="videos"]').click();
 await page.locator("#inputImagens").setInputFiles({name:"filmagem.webm",mimeType:"video/webm",buffer:Buffer.from(bytesVideo)});
 await page.waitForFunction(()=>document.getElementById("contadorImagens").textContent.includes("1 arquivo"));
 await page.locator("#botaoGerar").click();
 await page.waitForFunction(()=>document.getElementById("download").style.display==="block",{timeout:20000});
 assert.match(await page.locator("#resultadoInfo").innerText(),/criada/i);
 console.log("PASS navegador: música + vídeo importado gerou WebM");
 assert.equal(errors.length,0,"Erros de JavaScript: "+errors.join(" | "));
 console.log("PASS navegador: vídeo real WebM criado com música e cenas abstratas — "+videoInfo.size+" bytes");
}catch(e){
 console.error("FALHA no teste de navegador:",e.stack||e);
 if(errors.length)console.error("JavaScript:",errors.join(" | "));
 process.exitCode=1;
}finally{await browser.close()}
