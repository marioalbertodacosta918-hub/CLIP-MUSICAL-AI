// Valida a estrutura básica do CLIP MUSICAL AI V2 sem dependências externas.
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import assert from "node:assert/strict";
const html=readFileSync("index.html","utf8");
const v2=readFileSync("v2.js","utf8");
const css=readFileSync("v2.css","utf8");
const titulo="CLIP MUSICAL AI";
assert.match(html,new RegExp(titulo),"O aplicativo principal deve permanecer no arquivo index.html");
assert.match(html,/<link rel="stylesheet" href="v2\.css">/,"Estilos V2 precisam estar vinculados");
assert.match(html,/<script src="v2\.js"><\/script>/,"Controlador V2 precisa estar vinculado");
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length>0,"A página precisa de código principal");
for(let i=0;i<scripts.length;i++)new Script(scripts[i][1],{filename:"index.inline."+i+".js"});
new Script(v2,{filename:"v2.js"});
new Script(readFileSync("ai-v2.js","utf8"),{filename:"ai-v2.js"});
assert.match(html,/<script src="ai-v2\.js"><\/script>/,"Motor de IA precisa estar ligado à página");
console.log("PASS: JavaScript principal e V2 são sintaticamente válidos");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,"IDs HTML duplicados na página original");
for(const id of ["inputMusica","inputImagens","inputLetra","botaoGerar","botaoRoteiro","formato","audioPreview","videoResultado","download"]){
 assert.ok(ids.includes(id),"Campo original ausente: "+id);
}
console.log("PASS: IDs HTML preservados e sem duplicatas");
for(const modo of ["musica","imagem","imagens","videos"])
 assert.ok(v2.includes('data-v2-modo="'+modo+'"'),"Modo faltante: "+modo);
for(const genero of ["Gospel","Pop","Funk","Sertanejo","Rock","MPB","Instrumental","Outros"])
 assert.ok(v2.includes("'"+genero+"'"),"Categoria faltante: "+genero);
assert.match(v2,/aria-pressed/);
assert.match(v2,/atualizarImagens\(\)/);
assert.match(html,/formato\.value==="1:1"/);
assert.match(html,/Math\.min\(1,\(pCena-\.88\)\/\.12\)/);
assert.match(html,/audioAnalyser\.getByteFrequencyData/);
assert.match(html,/getVideoTracks\(\)\.forEach/);
console.log("PASS: quatro modos, gêneros, transições, formato quadrado e controle de áudio");
assert.match(css,/max-width:420px/);
console.log("PASS: estilos móveis disponíveis");
