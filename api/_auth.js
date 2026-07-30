const crypto=require('crypto');const{getCookies,json,clientIp}=require('./_http');const COOKIE_NAME='vg_admin_session',SESSION_HOURS=8,attempts=new Map();
function secret(){return process.env.SESSION_SECRET||'somente-desenvolvimento-local-troque-na-vercel'}
function sign(v){return crypto.createHmac('sha256',secret()).update(v).digest('base64url')}
function eq(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function createSession(email){const payload={email,csrf:crypto.randomBytes(24).toString('base64url'),exp:Date.now()+SESSION_HOURS*3600000},encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return{token:`${encoded}.${sign(encoded)}`,payload}}
function parseSession(token){if(!token||!token.includes('.'))return null;const[e,s]=token.split('.');if(!eq(sign(e),s))return null;try{const p=JSON.parse(Buffer.from(e,'base64url').toString());return p.exp>Date.now()&&p.email&&p.csrf?p:null}catch{return null}}
function cookieString(token,req){const sec=Boolean(process.env.VERCEL)||String(req.headers?.['x-forwarded-proto']||'').includes('https');return[`${COOKIE_NAME}=${encodeURIComponent(token)}`,'Path=/','HttpOnly','SameSite=Strict',`Max-Age=${SESSION_HOURS*3600}`,sec?'Secure':''].filter(Boolean).join('; ')}
function clearCookie(req){const sec=Boolean(process.env.VERCEL)||String(req.headers?.['x-forwarded-proto']||'').includes('https');return[`${COOKIE_NAME}=`,'Path=/','HttpOnly','SameSite=Strict','Max-Age=0',sec?'Secure':''].filter(Boolean).join('; ')}
function credentialsConfigured(){return Boolean(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD&&process.env.SESSION_SECRET)}
function checkCredentials(email,password){const em=String(process.env.ADMIN_EMAIL||'admin@local.test').trim().toLowerCase(),pw=String(process.env.ADMIN_PASSWORD||'admin123');return eq(String(email||'').trim().toLowerCase(),em)&&eq(String(password||''),pw)}
function key(req,email){return`${clientIp(req)}|${String(email||'').toLowerCase()}`}
function canAttempt(req,email){const x=attempts.get(key(req,email));return!x||x.until<Date.now()||x.count<8}
function registerFailure(req,email){const k=key(req,email),x=attempts.get(k),until=Date.now()+600000;attempts.set(k,!x||x.until<Date.now()?{count:1,until}:{...x,count:x.count+1})}
function clearFailures(req,email){attempts.delete(key(req,email))}
function getSession(req){return parseSession(getCookies(req)[COOKIE_NAME])}
function requireAdmin(req,res,{csrf=false}={}){const s=getSession(req);if(!s){json(res,401,{ok:false,error:'Sessão expirada. Entre novamente.'});return null}if(csrf&&!eq(req.headers?.['x-csrf-token']||'',s.csrf)){json(res,403,{ok:false,error:'Validação de segurança inválida. Atualize a página.'});return null}return s}
module.exports={createSession,cookieString,clearCookie,credentialsConfigured,checkCredentials,canAttempt,registerFailure,clearFailures,getSession,requireAdmin};
