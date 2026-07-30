const crypto=require('crypto');
const CONFIG={avisaApiBaseUrl:process.env.AVISAAPI_BASE_URL||'https://www.avisaapi.com.br/api',avisaApiToken:process.env.AVISAAPI_TOKEN||'',enviarWhatsapp:process.env.ENVIAR_WHATSAPP!=='false',sorteioSecret:process.env.SORTEIO_SECRET||'desenvolvimento-local-altere-na-vercel'};
function normalizarCodigo(v){return String(v||'').trim().toUpperCase()}
function normalizarTexto(v,l=200){return String(v||'').trim().slice(0,l)}
function gerarId(prefixo=''){return `${prefixo}${crypto.randomUUID()}`}
function hashString(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function criarRandomComSeed(s){let seed=hashString(s)||123456789;return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function embaralharLista(lista,semente){const r=[...lista],random=criarRandomComSeed(semente);for(let i=r.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[r[i],r[j]]=[r[j],r[i]]}return r}
function dataBrasil(d=new Date()){return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',dateStyle:'short',timeStyle:'medium'}).format(d)}
async function enviarAvisoWhatsApp({mensagem,numero}){if(!CONFIG.enviarWhatsapp)return{enviado:false,motivo:'Envio desativado'};if(!CONFIG.avisaApiToken)return{enviado:false,motivo:'Token não configurado'};if(!numero)return{enviado:false,motivo:'Número não configurado'};const r=await fetch(`${CONFIG.avisaApiBaseUrl}/actions/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${CONFIG.avisaApiToken}`},body:JSON.stringify({number:numero,message:mensagem})});const t=await r.text();if(!r.ok)throw new Error(`Erro AvisaAPI ${r.status}: ${t}`);return{enviado:true,resposta:t}}
module.exports={CONFIG,normalizarCodigo,normalizarTexto,gerarId,embaralharLista,dataBrasil,enviarAvisoWhatsApp};
