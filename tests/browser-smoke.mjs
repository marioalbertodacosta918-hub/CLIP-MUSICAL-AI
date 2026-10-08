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
 assert.equal(errors.length,0,"Erros de JavaScript: "+errors.join(" | "));
 console.log("PASS navegador: vídeo real WebM criado com música e cenas abstratas — "+videoInfo.size+" bytes");
}catch(e){
 console.error("FALHA no teste de navegador:",e.stack||e);
 if(errors.length)console.error("JavaScript:",errors.join(" | "));
 process.exitCode=1;
}finally{await browser.close()}
