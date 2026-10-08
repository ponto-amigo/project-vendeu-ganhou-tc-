const repo=require('./_repository');
const {normalizarCodigo,dataBrasil,enviarAvisoWhatsApp}=require('./_config');
const {readJson,json,method,errorMessage}=require('./_http');
const campos={favorecido:160,documento:18,banco:100,agencia:30,conta:40,operacao:30,chavePix:160};
module.exports=async(req,res)=>{
 if(!method(req,res,['POST']))return;
 try{
  const body=await readJson(req),codigo=normalizarCodigo(body.codigo);
  const p=await repo.findParticipantByCode(codigo);
  if(!p||!p.active)return json(res,403,{ok:false,erro:'Código inválido ou inativo.'});
  const participacao=await repo.getParticipationByParticipantId(p.id);
  if(!participacao?.finalized)return json(res,409,{ok:false,erro:'É necessário sortear uma carta antes.'});
  if(participacao.paymentAt)return json(res,200,{ok:true,jaEnviado:true,mensagem:'Os dados já foram registrados.'});
  const dados={};
  for(const [campo,limite] of Object.entries(campos)){
   const valor=String(body[campo]??'').trim();
   if(!valor||valor.length>limite||/[\x00-\x1f]/.test(valor))return json(res,400,{ok:false,erro:`Verifique o campo ${campo}.`});
   dados[campo]=valor;
  }
  const doc=dados.documento.replace(/\D/g,'');
  if(![11,14].includes(doc.length))return json(res,400,{ok:false,erro:'CPF/CNPJ precisa ter 11 ou 14 dígitos.'});
  if(!dados.chavePix.trim())return json(res,400,{ok:false,erro:'Informe a chave Pix.'});
  const r=await repo.savePayment(p.id,dados);
  if(!r.createdNow)return json(res,200,{ok:true,jaEnviado:true});
  const settings=await repo.getSettings();
  const msg=`💳 ${settings.campaignName} — DADOS PARA PAGAMENTO\n\nParceiro: ${p.name}\nCódigo: ${p.code}\nContato: ${p.contact||'Não informado'}\nPrêmio: ${r.participation.prize}\nCarta: ${r.participation.selectedCard}\n\nFavorecido: ${dados.favorecido}\nCPF/CNPJ: ${dados.documento}\nBanco: ${dados.banco}\nAgência: ${dados.agencia}\nConta: ${dados.conta}\nOperação: ${dados.operacao}\nChave Pix: ${dados.chavePix}\n\nRecebido: ${dataBrasil()}`;
  let notificationStatus='pending';
  if(settings.whatsappEnabled&&settings.adminWhatsapp){
   try{const result=await enviarAvisoWhatsApp({numero:settings.adminWhatsapp,mensagem:msg});notificationStatus=result.enviado?'sent':'pending'}
   catch(err){console.error('Falha ao notificar dados de pagamento:',err.message);notificationStatus='failed'}
  }
  await repo.setPaymentNotificationStatus(p.id,notificationStatus);
  return json(res,200,{ok:true,notificacaoWhatsapp:notificationStatus,mensagem:'Dados de pagamento registrados com sucesso.'});
 }catch(err){console.error(err);return json(res,500,{ok:false,erro:errorMessage(err,'Não foi possível salvar seus dados.')})}
};
