/* CLIP MUSICAL AI V2 — modos e gêneros. Usa as funções originais.
   Cenas geradas no navegador são arte abstrata, NÃO vídeo criado por IA. */
(function(){
  "use strict";
  const el=id=>document.getElementById(id);
  const principal=document.querySelector(".container");
  const musicaCard=el("inputMusica")?.closest(".card");
  const midiaCard=el("inputImagens")?.closest(".card");
  const estiloCard=el("estilo")?.closest(".card");
  if(!principal||!musicaCard||!midiaCard||!estiloCard)return;
  const cab=document.createElement("div");
  cab.className="v2-hero";
  cab.innerHTML='<strong>CLIP MUSICAL AI · V2</strong><p>Videoclipes para todos os gêneros: escolha uma música e, se desejar, adicione imagens ou vídeos.</p>';
  principal.insertBefore(cab,principal.querySelector(".card"));
  const bloco=document.createElement("div");
  bloco.className="card v2-mode-card";
  bloco.innerHTML='<h2>🎬 1. Modo de criação</h2>'+
    '<div class="v2-modes" role="group" aria-label="Modo de criação">'+
    '<button type="button" class="v2-mode" data-v2-modo="musica" aria-pressed="false">🎵 Somente música<small>Cenas gráficas abstratas automáticas</small></button>'+
    '<button type="button" class="v2-mode" data-v2-modo="imagem" aria-pressed="true">🖼️ Música + imagem<small>Uma foto ou arte animada por movimentos de câmera</small></button>'+
    '<button type="button" class="v2-mode" data-v2-modo="imagens" aria-pressed="false">🎞️ Música + várias imagens<small>Sequência de fotos com zoom e transições</small></button>'+
    '<button type="button" class="v2-mode" data-v2-modo="videos" aria-pressed="false">🎥 Música + vídeos<small>Vídeos sem áudio, com música como trilha principal</small></button></div>'+
    '<p class="v2-note" id="v2ModoInfo" role="status"></p>'+
    '<div class="v2-notice">✨ Nesta etapa, a montagem acontece no navegador. A geração de imagens e vídeos novos com IA ainda depende de serviço externo e não está ativada.</div>';
  principal.insertBefore(bloco,musicaCard);
  const campoGenero=document.createElement("div");
  campoGenero.innerHTML='<label for="v2Genero">🎼 Categoria musical</label>'+
    '<select id="v2Genero">'+
    ['Gospel','Worship','Pop','Romântico','Funk','Rap','Trap','Sertanejo','Rock','MPB','Eletrônica','Lo-fi','Infantil','Instrumental','Motivacional','Cinemático','Outros'].map(g=>'<option value="'+g+'">'+g+'</option>').join('')+
    '</select>';
  estiloCard.insertBefore(campoGenero,estiloCard.firstElementChild.nextSibling);
  const estiloSelect=el("estilo");
  ['Anime','3D','Futurista','Vintage','Épico','Minimalista'].forEach(v=>{
    if(![...estiloSelect.options].some(x=>x.value===v)){
      const op=document.createElement("option");op.textContent=v;estiloSelect.appendChild(op);
    }
  });
  const formatoSelect=el("formato");
  if(![...formatoSelect.options].some(x=>x.value==="1:1")){
    const op=document.createElement("option");op.value="1:1";op.textContent="1:1 — Quadrado";formatoSelect.appendChild(op);
  }
  const res=el("resumoMusica")?.closest(".resumo");
  if(res){
    const modoResumo=document.createElement("div");
    modoResumo.className="resumo-box";
    modoResumo.innerHTML='<strong>🎬 Modo</strong><span id="v2ResumoModo">Música + imagem</span>';
    const generoResumo=document.createElement("div");
    generoResumo.className="resumo-box";
    generoResumo.innerHTML='<strong>🎼 Categoria</strong><span id="v2ResumoGenero">Gospel</span>';
    res.append(modoResumo,generoResumo);
  }
  const inputMidia=el("inputImagens");
  const generoSelect=el("v2Genero");
  const midiaTexto=midiaCard.querySelector("label");
  const mensagem=el("v2ModoInfo");
  let modo="imagem";
  const nomes={musica:"Somente música",imagem:"Música + imagem",imagens:"Música + várias imagens",videos:"Música + vídeos"};
  const textos={
    musica:"Basta selecionar um áudio. O sistema criará cenas gráficas abstratas com movimentos, sem usar IA generativa.",
    imagem:"Envie uma imagem; ela será preservada, com zoom e movimento durante o clipe.",
    imagens:"Envie várias imagens e organize a ordem antes de gerar.",
    videos:"Envie um ou mais vídeos. A trilha do clipe será apenas a música escolhida, sem o áudio original dos vídeos."
  };
  function definirModo(novo){
    if(!nomes[novo])return;
    if(modo!==novo){
      inputMidia.value="";
      imagensSelecionadas.forEach(i=>{if(i.objectURL)try{URL.revokeObjectURL(i.objectURL)}catch(e){}});
      imagensSelecionadas=[];atualizarImagens();
    }
    modo=novo;
    bloco.querySelectorAll("[data-v2-modo]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v2Modo===modo)));
    midiaCard.classList.toggle("v2-hidden",modo==="musica");
    inputMidia.accept=modo==="videos"?"video/*":"image/*";
    inputMidia.multiple=modo==="imagens"||modo==="videos";
    if(midiaTexto)midiaTexto.textContent=modo==="videos"?"Selecione vídeos":modo==="imagem"?"Selecione uma imagem":"Selecione imagens";
    mensagem.textContent=textos[modo];
    const resumoModo=el("v2ResumoModo");if(resumoModo)resumoModo.textContent=nomes[modo];
    roteiroAtual="";
  }
  bloco.querySelectorAll("[data-v2-modo]").forEach(btn=>btn.addEventListener("click",()=>definirModo(btn.dataset.v2Modo)));
  generoSelect.addEventListener("change",()=>{
    el("v2ResumoGenero").textContent=generoSelect.value;
    roteiroAtual="";
  });
  const cores={
    Gospel:["#36246e","#e7ba6c"],Worship:["#142e62","#d7a85c"],Pop:["#5c1a79","#ff478c"],
    Romântico:["#6e2b51","#f5ac9a"],Funk:["#681842","#ffc131"],Rap:["#161b43","#e45777"],
    Trap:["#221044","#9d64e8"],Sertanejo:["#40301b","#d0a15b"],Rock:["#151820","#bb3030"],
    MPB:["#165d52","#e2ac5c"],Eletrônica:["#062c53","#28c9df"],"Lo-fi":["#493c6e","#f2bca6"],
    Infantil:["#154f7d","#ffd54a"],Instrumental:["#173e57","#81d8c1"],
    Motivacional:["#422960","#febd46"],Cinemático:["#111d4e","#cb7eb8"],Outros:["#29385b","#77baff"]
  };
  function produzirImagensAbstratas(){
    if(modo!=="musica"||imagensSelecionadas.length)return;
    const paleta=cores[generoSelect.value]||cores.Outros;
    for(let cena=0;cena<6;cena++){
      const canvas=document.createElement("canvas");
      canvas.width=960;canvas.height=540;
      const ctx=canvas.getContext("2d");
      const grad=ctx.createLinearGradient(0,0,960,540);
      grad.addColorStop(0,paleta[0]);grad.addColorStop(1,paleta[1]);
      ctx.fillStyle=grad;ctx.fillRect(0,0,960,540);
      for(let j=0;j<9;j++){
        const x=90+((j*187+cena*91)%880),y=70+((j*113+cena*71)%430);
        const r=28+(j*19)%90;
        const brilho=ctx.createRadialGradient(x,y,0,x,y,r);
        brilho.addColorStop(0,"rgba(255,255,255,.34)");
        brilho.addColorStop(1,"rgba(255,255,255,0)");
        ctx.fillStyle=brilho;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle="rgba(0,0,0,.36)";ctx.fillRect(0,395,960,145);
      const barras=48,centro=480;
      for(let i=0;i<barras;i++){
        const altura=18+Math.abs(Math.sin(i*.42+cena*.8))*93+Math.abs(Math.cos(i*.18+cena)) *28;
        ctx.fillStyle="rgba(255,255,255,.68)";
        ctx.fillRect(centro-390+i*16,472-altura/2,8,altura);
      }
      imagensSelecionadas.push({file:null,src:canvas.toDataURL("image/jpeg",.82),gerada:true});
    }
    atualizarImagens();
    el("resumoImagens").textContent="6 cenas gráficas automáticas";
  }
  [el("botaoGerar"),el("botaoGerarEngajamento"),el("botaoRoteiro")].filter(Boolean)
    .forEach(botao=>botao.addEventListener("click",produzirImagensAbstratas,true));
  const roteiroBtn=el("botaoRoteiro");
  roteiroBtn.addEventListener("click",()=>{
    const texto=el("roteiro").textContent;
    if(texto.startsWith("🎬 CLIP MUSICAL AI")){
      const cabecalho="Categoria: "+generoSelect.value+"\nModo: "+nomes[modo]+"\n";
      roteiroAtual=roteiroAtual.replace("ESTRUTURA DAS CENAS",cabecalho+"\nESTRUTURA DAS CENAS");
      el("roteiro").textContent=roteiroAtual;
    }
  });
  const heroTitle=principal.querySelector("h1");
  if(heroTitle)heroTitle.textContent="🎬 CLIP MUSICAL AI V2";
  const subtitle=principal.querySelector(".subtitulo");
  if(subtitle)subtitle.textContent="Crie videoclipes para qualquer gênero musical";
  musicaCard.querySelector("label").textContent="Arquivo de música";
  musicaCard.querySelector("h2").textContent="🎵 2. Escolha sua música";
  midiaCard.querySelector("h2").textContent="🖼️ 3. Escolha os arquivos visuais";
  const letraCard=el("inputLetra")?.closest(".card");
  if(letraCard){
    letraCard.querySelector("h2").textContent="📝 4. Letra da música (opcional)";
    letraCard.querySelector("label").textContent="Cole aqui a letra, se desejar legendas";
  }
  el("botaoAuto").textContent="⚡ DISTRIBUIR VERSOS POR TEMPO (ESTIMATIVA)";
  const modoResumo=el("v2ResumoGenero");if(modoResumo)modoResumo.textContent=generoSelect.value;
  definirModo("imagem");
})();
