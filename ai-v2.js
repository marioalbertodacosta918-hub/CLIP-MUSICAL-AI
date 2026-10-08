/* CLIP MUSICAL AI — interface opcional para cenas geradas por IA.
   A chave da OpenAI só existe no servidor; esta interface requer autenticação
   do proprietário e um endereço de backend próprio, não incluídos no site estático. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const host=$("botaoRoteiro")?.closest(".card");
 if(!host||!$("inputMusica")||!$("v2Genero"))return;
 const panel=document.createElement("section");
 panel.className="card ai-v2-card";
 panel.innerHTML=[
  '<h2>🤖 Estúdio de cenas com IA</h2>',
  '<p class="dica">Crie imagens inéditas a partir do gênero e da letra. Com uma imagem enviada, a IA recebe essa imagem como referência. A consistência visual não é garantida.</p>',
  '<label for="aiV2Theme">Tema e direção criativa</label>',
  '<textarea id="aiV2Theme" rows="3" placeholder="Ex.: um casal caminhando ao pôr do sol; manter o mesmo personagem em todas as cenas."></textarea>',
  '<div class="ai-v2-grid"><label>Quantidade de cenas<select id="aiV2Count"><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option></select></label>',
  '<label>Endereço do servidor de IA<input id="aiV2Endpoint" type="url" placeholder="https://meu-servidor.workers.dev" autocomplete="off"></label></div>',
  '<label>Senha de acesso ao servidor<input id="aiV2Token" type="password" autocomplete="off" placeholder="Token privado do proprietário"></label>',
  '<div class="ai-v2-help">A senha é usada somente durante esta sessão; não é salva no GitHub nem no navegador. A geração externa pode ter custos. Não use sua chave de API aqui.</div>',
  '<div class="ai-v2-actions"><button type="button" id="aiV2Plan" class="btn-azul">📝 Preparar cenas</button><button type="button" id="aiV2Generate" class="btn-verde">✨ Gerar imagens com IA</button></div>',
  '<div id="aiV2Status" class="status" role="status">Serviço externo ainda não configurado.</div>',
  '<div id="aiV2Preview" class="ai-v2-preview"></div>'
 ].join("");
 host.parentNode.insertBefore(panel,host);
 const status=$("aiV2Status");
 const preview=$("aiV2Preview");
 let running=false;
 let plan=[];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function activeMode(){return document.querySelector('[data-v2-modo][aria-pressed="true"]')?.dataset.v2Modo||"imagem";}
 function originals(){return imagensSelecionadas.filter(x=>!x.aiV2&&!x.gerada);}
 function makePlan(){
  if(!musicaSelecionada){status.textContent="Escolha a música antes de preparar o clipe.";return [];}
  const genre=$("v2Genero").value;
  const style=$("estilo").value;
  const duration=audioPreview.duration;
  const lyrics=obterVersos();
  const count=Number($("aiV2Count").value);
  const theme=$("aiV2Theme").value.trim();
  const stages=["abertura","primeira parte","crescimento","refrão","clímax","encerramento"];
  plan=Array.from({length:count},(_,i)=>{
   const stage=stages[Math.min(stages.length-1,Math.floor(i*stages.length/count))];
   const verse=lyrics.length?lyrics[Math.min(lyrics.length-1,Math.floor(i*lyrics.length/count))]:"";
   const prompt=[
    "Cinematic still frame for a music video",
    "Genre: "+genre,
    "Visual direction: "+style,
    "Scene: "+stage,
    "Keep characters and visual identity consistent across all scenes",
    "Detailed environment, beautiful framing, professional lighting, no captions or text in the image"
   ];
   if(theme)prompt.push("Art direction: "+theme);
   if(verse)prompt.push("Inspired by this lyric: "+verse);
   if(activeMode()==="imagem"&&originals().length)prompt.push("Use the uploaded reference image to preserve the subject and mood");
   return {number:i+1,stage,verse,prompt:prompt.join(". ").slice(0,1900)};
  });
  preview.replaceChildren();
  plan.forEach(c=>{
   const item=document.createElement("article");
   item.className="ai-v2-prompt";
   item.innerHTML="<strong>Cena "+c.number+" — "+esc(c.stage)+"</strong><p>"+esc(c.prompt)+"</p>";
   preview.append(item);
  });
  roteiroAtual=plan.map(c=>"CENA "+c.number+" — "+c.stage+"\n"+c.prompt).join("\n\n");
  $("roteiro").textContent=roteiroAtual;
  const time=isFinite(duration)?Math.round(duration/count):null;
  status.textContent="Plano preparado: "+count+" cenas"+(time?" (cerca de "+time+" s cada).":".");
  return plan;
 }
 $("aiV2Plan").addEventListener("click",makePlan);
 async function generate(){
  if(running)return;
  if(!musicaSelecionada){status.textContent="Primeiro escolha uma música.";return;}
  const base=($("aiV2Endpoint").value||"").trim().replace(/\/+$/,"");
  const token=$("aiV2Token").value;
  if(!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(base)||!token){
   status.textContent="Configure o endereço HTTPS e a senha do seu servidor de IA. Sem servidor, esta opção não gera imagens reais.";
   return;
  }
  const scenes=makePlan();if(!scenes.length)return;
  const costConfirm=confirm("Serão solicitadas "+scenes.length+" imagens à API de IA. Isso pode gerar cobranças no serviço conectado. Deseja continuar?");
  if(!costConfirm)return;
  running=true;
  const button=$("aiV2Generate");button.disabled=true;
  const previous=imagensSelecionadas.slice();
  const generated=[];
  const reference=activeMode()==="imagem"?originals().find(x=>x.tipo!=="video"&&/^data:image\/(png|jpeg|webp);base64,/.test(x.src))?.src:null;
  try{
   for(let i=0;i<scenes.length;i++){
    status.textContent="IA criando cena "+(i+1)+" de "+scenes.length+"…";
    const res=await fetch(base+"/api/generate-scene",{
     method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
     body:JSON.stringify({prompt:scenes[i].prompt,format:$("formato").value,reference_image:reference||undefined})
    });
    let body={};try{body=await res.json()}catch{}
    if(!res.ok)throw new Error(body.error||"Servidor respondeu "+res.status);
    if(!/^data:image\/(png|jpeg|webp);base64,/.test(body.image||""))
     throw new Error("Resposta sem imagem válida.");
    generated.push({src:body.image,file:null,tipo:"imagem",aiV2:true});
   }
   const keep=previous.filter(x=>!x.aiV2&&!x.gerada);
   imagensSelecionadas=activeMode()==="musica"?generated:keep.concat(generated);
   atualizarImagens();
   status.textContent="✅ "+generated.length+" imagens novas geradas. Agora use GERAR CLIPE para montar o vídeo.";
  }catch(err){
   console.error("Falha IA:",err);
   status.textContent="❌ "+String(err.message||"Falha ao gerar imagens.")+" Nenhuma cena anterior foi apagada.";
  }finally{running=false;button.disabled=false;}
 }
 $("aiV2Generate").addEventListener("click",generate);
 window.clipMusicalAIV2Engine={makePlan,generate};
})();