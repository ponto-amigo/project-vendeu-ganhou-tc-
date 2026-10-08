const painelLogin = document.getElementById('painelLogin');
const painelJogo = document.getElementById('painelJogo');
const formCodigo = document.getElementById('formCodigo');
const codigoUsuario = document.getElementById('codigoUsuario');
const btnEntrar = document.getElementById('btnEntrar');
const btnTrocarUsuario = document.getElementById('btnTrocarUsuario');
const erroLogin = document.getElementById('erroLogin');
const nomeParticipante = document.getElementById('nomeParticipante');
const tabuleiro = document.getElementById('tabuleiro');
const mensagem = document.getElementById('mensagem');
const carregando = document.getElementById('carregando');
const overlaySorteio = document.getElementById('overlaySorteio');
const overlayTitulo = document.getElementById('overlayTitulo');
const overlayContador = document.getElementById('overlayContador');
const overlayTexto = document.getElementById('overlayTexto');
const chuvaPremio = document.getElementById('chuvaPremio');

let jogoAtivo = false;
let usuarioAtual = null;
let quantidadeCartas = 8;
let audioCtx = null;
let campaignSettings = { campaignName: 'VENDEU, GANHOU', campaignTag: 'TOTAL CASH' };

function normalizarCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase();
}

function chaveEstado(codigo) {
  return `total-cash-jogo:${normalizarCodigo(codigo)}`;
}

function salvarEstado(codigo, dados) {
  const chave = chaveEstado(codigo);
  const atual = carregarEstado(codigo) || {};
  localStorage.setItem(chave, JSON.stringify({ ...atual, ...dados }));
  localStorage.setItem('total-cash-ultimo-codigo', normalizarCodigo(codigo));
}

function carregarEstado(codigo) {
  try {
    const raw = localStorage.getItem(chaveEstado(codigo));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function limparEstado(codigo) {
  if (codigo) {
    localStorage.removeItem(chaveEstado(codigo));
  }

  localStorage.removeItem('total-cash-ultimo-codigo');
  localStorage.removeItem('vendeu-ganhou-ultimo-codigo');
}

function mostrarTelaCodigo({ limparCampo = false } = {}) {
  usuarioAtual = null;
  jogoAtivo = false;

  erroLogin.innerText = '';
  mensagem.innerText = '';
  tabuleiro.innerHTML = '';

  painelJogo.classList.add('escondido');
  document.getElementById('painelPagamento').classList.add('escondido');
  document.getElementById('pagamentoConcluido').classList.add('escondido');
  painelLogin.classList.remove('escondido');

  if (limparCampo) codigoUsuario.value = '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mostrarCarregando(texto = 'Registrando...') {
  carregando.querySelector('p').innerText = texto;
  carregando.classList.remove('escondido');
}

function esconderCarregando() {
  carregando.classList.add('escondido');
}

function garantirAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch {
    audioCtx = null;
  }
}

function tocarTom(freq = 440, duracao = 0.15, tipo = 'sine', volume = 0.05, atraso = 0) {
  if (!audioCtx) return;

  const agora = audioCtx.currentTime + atraso;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, agora);

  gain.gain.setValueAtTime(0.0001, agora);
  gain.gain.exponentialRampToValueAtTime(volume, agora + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, agora + duracao);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(agora);
  osc.stop(agora + duracao + 0.03);
}

function tocarTick() {
  tocarTom(920, 0.08, 'square', 0.025);
}

function tocarFlip() {
  tocarTom(430, 0.05, 'triangle', 0.03);
  tocarTom(690, 0.08, 'triangle', 0.022, 0.035);
}

function tocarSuspense() {
  const notas = [220, 260, 315, 380, 470, 590, 740, 920];
  notas.forEach((freq, i) => tocarTom(freq, 0.12, 'sawtooth', 0.026, i * 0.075));
}

function tocarRevelacao() {
  tocarTom(523, 0.12, 'triangle', 0.042);
  tocarTom(659, 0.12, 'triangle', 0.042, 0.07);
  tocarTom(784, 0.22, 'triangle', 0.05, 0.14);
}

function tocarVitoria() {
  tocarTom(523, 0.12, 'sine', 0.04);
  tocarTom(659, 0.12, 'sine', 0.04, 0.10);
  tocarTom(784, 0.15, 'sine', 0.05, 0.20);
  tocarTom(1046, 0.32, 'sine', 0.06, 0.34);
}

function normalizarMapaPremios(dados) {
  const origem = dados?.mapaPremios || dados?.cartasReveladas || [];

  if (!Array.isArray(origem)) return [];

  return origem
    .map((item) => ({
      carta: Number(item.carta),
      premio: String(item.premio || '').trim(),
    }))
    .filter((item) => item.carta && item.premio)
    .sort((a, b) => a.carta - b.carta);
}

function criarCartas(total) {
  tabuleiro.innerHTML = '';
  mensagem.innerText = '';
  tabuleiro.classList.remove('bloqueado');

  const totalSeguro = Math.max(1, Number(total || 8));

  for (let i = 1; i <= totalSeguro; i++) {
    const carta = document.createElement('button');
    carta.type = 'button';
    carta.className = 'carta';
    carta.dataset.carta = String(i);
    carta.setAttribute('aria-label', `Carta ${i}`);

    carta.innerHTML = `
      <div class="carta-inner">
        <div class="carta-face carta-verso">
          <div class="carta-brilho"></div>
          <div class="logo-carta-box">
            <img src="${campaignSettings.logoUrl || '/totalcash.png'}" class="logo-carta" alt="Total Cash" />
          </div>
          <div class="numero-carta">${i}</div>
          <div class="texto-carta">Escolha sua sorte</div>
        </div>

        <div class="carta-face carta-frente">
          <div class="premio-label">Prêmio</div>
          <div class="premio-texto">Aguarde...</div>
        </div>
      </div>
    `;

    carta.addEventListener('click', () => virarCarta(carta));
    tabuleiro.appendChild(carta);
  }
}

function preencherCarta(carta, premio, label = 'Prêmio') {
  if (!carta) return;
  const premioLabel = carta.querySelector('.premio-label');
  const premioTexto = carta.querySelector('.premio-texto');

  premioLabel.innerText = label;
  premioTexto.innerText = premio || 'Não informado';
}

function obterCartaPorNumero(numero) {
  return tabuleiro.querySelector(`.carta[data-carta="${Number(numero)}"]`);
}

function revelarResultadoSalvo(estado) {
  const mapa = normalizarMapaPremios(estado);

  criarCartas(estado.quantidadeCartas || quantidadeCartas);
  tabuleiro.classList.add('bloqueado');

  if (!mapa.length) {
    const carta = obterCartaPorNumero(estado.cartaEscolhida || 1);
    preencherCarta(carta, estado.premio, 'Seu prêmio');
    carta?.classList.add('virada', 'ganhadora');
  } else {
    mapa.forEach((item) => {
      const carta = obterCartaPorNumero(item.carta);
      const ehEscolhida = String(item.carta) === String(estado.cartaEscolhida);
      preencherCarta(carta, item.premio, ehEscolhida ? 'Seu prêmio' : 'Estava aqui');
      carta?.classList.add('virada');
      if (ehEscolhida) carta.classList.add('ganhadora');
    });
  }

  mensagem.innerText =
    `Você já participou. Seu prêmio foi: ${estado.premio}. ` +
    `A confirmação oficial será feita pela equipe da Total Cash.`;
}

function abrirJogo(usuario, totalCartas) {
  usuarioAtual = usuario;
  quantidadeCartas = Number(totalCartas || 8);

  nomeParticipante.innerText = usuario.nome || usuario.codigo;
  painelLogin.classList.add('escondido');
  painelJogo.classList.remove('escondido');

  const estado = carregarEstado(usuario.codigo);

  if (estado && estado.finalizado && estado.premio) {
    jogoAtivo = false;
    revelarResultadoSalvo(estado);
    return;
  }

  jogoAtivo = true;
  criarCartas(quantidadeCartas);
}

async function chamarApi(url, dados) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });

  const json = await resposta.json().catch(() => ({}));

  if (!resposta.ok || !json.ok) {
    throw new Error(json.erro || 'Erro inesperado.');
  }

  return json;
}

async function animacaoSuspense(cartaSelecionada) {
  overlayTitulo.innerText = 'Preparando seu sorteio';
  overlayTexto.innerText = 'As cartas estão girando... escolha registrada!';
  overlayContador.innerText = '3';
  overlaySorteio.classList.remove('escondido');
  cartaSelecionada.classList.add('selecionada');

  for (const numero of ['3', '2', '1']) {
    overlayContador.innerText = numero;
    tocarTick();
    await sleep(620);
  }

  overlayTitulo.innerText = 'Sorteando...';
  overlayTexto.innerText = 'A sorte está batendo na sua carta!';
  overlayContador.innerText = '★';
  tocarSuspense();
  await sleep(1050);

  overlaySorteio.classList.add('escondido');
}

function soltarMoedas() {
  chuvaPremio.innerHTML = '';
  chuvaPremio.classList.remove('escondido');

  const simbolos = ['$', '★', '✦', 'PIX'];
  for (let i = 0; i < 42; i++) {
    const item = document.createElement('span');
    item.innerText = simbolos[i % simbolos.length];
    item.style.left = `${Math.random() * 100}%`;
    item.style.animationDelay = `${Math.random() * 0.45}s`;
    item.style.animationDuration = `${1.7 + Math.random() * 1.3}s`;
    chuvaPremio.appendChild(item);
  }

  setTimeout(() => {
    chuvaPremio.classList.add('escondido');
    chuvaPremio.innerHTML = '';
  }, 3200);
}

async function revelarTodasAsCartas(mapaPremios, cartaEscolhida, premioGanho) {
  const mapa = normalizarMapaPremios({ mapaPremios });
  const cartaEscolhidaNumero = Number(cartaEscolhida);

  const cartaPrincipal = obterCartaPorNumero(cartaEscolhidaNumero);

  if (cartaPrincipal) {
    cartaPrincipal.classList.add('revelando');
    await sleep(520);
    preencherCarta(cartaPrincipal, premioGanho, 'Seu prêmio');
    cartaPrincipal.classList.add('virada', 'ganhadora');
    cartaPrincipal.classList.remove('revelando', 'selecionada');
    tocarRevelacao();
    soltarMoedas();
  }

  await sleep(650);

  if (!mapa.length) return;

  for (const item of mapa) {
    if (Number(item.carta) === cartaEscolhidaNumero) continue;

    const carta = obterCartaPorNumero(item.carta);
    if (!carta) continue;

    preencherCarta(carta, item.premio, 'Estava aqui');
    carta.classList.add('virada', 'outra-revelada');
    tocarFlip();
    await sleep(130);
  }

  tocarVitoria();
}

formCodigo.addEventListener('submit', async (event) => {
  event.preventDefault();
  garantirAudio();

  const codigo = normalizarCodigo(codigoUsuario.value);
  erroLogin.innerText = '';

  if (!codigo) {
    erroLogin.innerText = 'Digite seu código para entrar.';
    return;
  }

  try {
    btnEntrar.disabled = true;
    mostrarCarregando('Entrando no jogo...');

    const dados = await chamarApi('/api/entrar', { codigo });

    if (dados.finalizado) {
      limparEstado(codigo);
      if (dados.pagamentoPendente) { abrirPagamento(dados); return; }
      mostrarPagamentoConcluido();
      return;
    }

    const mapa = normalizarMapaPremios(dados);

    salvarEstado(codigo, {
      usuario: dados.usuario,
      quantidadeCartas: dados.quantidadeCartas,
      entrouEm: dados.entrouEm || new Date().toISOString(),
      finalizado: dados.finalizado || false,
      premio: dados.premio || undefined,
      cartaEscolhida: dados.cartaEscolhida || undefined,
      sorteadoEm: dados.sorteadoEm || undefined,
      mapaPremios: mapa,
      cartasReveladas: mapa,
    });

    abrirJogo(dados.usuario, dados.quantidadeCartas);
  } catch (erro) {
    erroLogin.innerText = erro.message;
  } finally {
    btnEntrar.disabled = false;
    esconderCarregando();
  }
});

async function virarCarta(cartaClicada) {
  if (!jogoAtivo || !usuarioAtual || cartaClicada.classList.contains('virada')) return;

  garantirAudio();
  jogoAtivo = false;
  tabuleiro.classList.add('bloqueado');
  mensagem.innerText = '';

  try {
    await animacaoSuspense(cartaClicada);

    const dados = await chamarApi('/api/sortear', {
      codigo: usuarioAtual.codigo,
      cartaEscolhida: cartaClicada.dataset.carta,
    });

    const mapa = normalizarMapaPremios(dados);

    await revelarTodasAsCartas(
      mapa,
      dados.cartaEscolhida || cartaClicada.dataset.carta,
      dados.premio
    );

    mensagem.innerText =
      `Parabéns, ${dados.usuario.nome}! Você ganhou: ${dados.premio}. ` +
      `Resultado registrado com sucesso. A confirmação oficial será feita pela equipe responsável.`;

    // Depois do sorteio, não mantém o participante conectado no navegador.
    // Ao atualizar, reabrir o link ou voltar pelo Safari, a página retorna ao campo de código.
    limparEstado(usuarioAtual.codigo);
    abrirPagamento(dados, true);
  } catch (erro) {
    cartaClicada.classList.remove('selecionada', 'revelando');
    mensagem.innerText = erro.message;
    jogoAtivo = true;
    tabuleiro.classList.remove('bloqueado');
  } finally {
    overlaySorteio.classList.add('escondido');
  }
}

btnTrocarUsuario.addEventListener('click', () => {
  if (usuarioAtual?.codigo) limparEstado(usuarioAtual.codigo);
  mostrarTelaCodigo({ limparCampo: true });
  codigoUsuario.focus();
});

// Sempre começa pela tela de código. Isso também corrige a restauração automática
// de páginas pelo cache de navegação do Safari (bfcache).
window.addEventListener('pageshow', () => {
  mostrarTelaCodigo({ limparCampo: true });
  limparEstado();
});

window.addEventListener('pointerdown', garantirAudio, { once: true });





async function carregarConfiguracaoPublica(){try{const r=await fetch('/api/public-config',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)return;campaignSettings=d.settings||campaignSettings;const title=document.getElementById('tituloCampanha'),tag=document.getElementById('tagCampanha'),inst=document.getElementById('instrucaoCampanha'),logo=document.getElementById('logoCampanha'),overlay=document.getElementById('overlayTag');if(title)title.textContent=campaignSettings.campaignName||'VENDEU, GANHOU';if(tag){tag.textContent=campaignSettings.campaignTag||'';tag.style.display=campaignSettings.campaignTag?'':'none'}if(inst)inst.textContent=campaignSettings.instruction||'';if(logo&&campaignSettings.logoUrl)logo.src=campaignSettings.logoUrl;if(overlay)overlay.textContent=campaignSettings.campaignTag||campaignSettings.campaignName||'';if(campaignSettings.primaryColor)document.documentElement.style.setProperty('--tc-blue',campaignSettings.primaryColor);if(campaignSettings.secondaryColor)document.documentElement.style.setProperty('--tc-green',campaignSettings.secondaryColor);document.title=`${campaignSettings.campaignName||'Vendeu, Ganhou'} | Total Cash`}catch(e){console.warn('Configuração pública indisponível:',e.message)}}
carregarConfiguracaoPublica();

// O resultado do sorteio permanece finalizado; apenas os dados para pagamento ficam pendentes.
let pagamentoAtual=null;
function abrirPagamento(dados,aposSorteio=false){
 pagamentoAtual={codigo:dados.usuario.codigo,nome:dados.usuario.nome,premio:dados.premio};
 document.getElementById('pagamentoResumo').textContent=`${pagamentoAtual.nome} • Código ${pagamentoAtual.codigo} • Prêmio: ${pagamentoAtual.premio}`;
 document.getElementById('painelLogin').classList.add('escondido');
 if(!aposSorteio)document.getElementById('painelJogo').classList.add('escondido');
 document.getElementById('pagamentoConcluido').classList.add('escondido');
 document.getElementById('painelPagamento').classList.remove('escondido');
 document.getElementById('pagamentoErro').textContent='';
 document.getElementById('painelPagamento').scrollIntoView({behavior:'smooth',block:'start'});
}
function mostrarPagamentoConcluido(){
 pagamentoAtual=null;
 document.getElementById('painelLogin').classList.add('escondido');
 document.getElementById('painelJogo').classList.add('escondido');
 document.getElementById('painelPagamento').classList.add('escondido');
 document.getElementById('pagamentoConcluido').classList.remove('escondido');
}
document.getElementById('formPagamento').addEventListener('submit',async e=>{
 e.preventDefault();if(!pagamentoAtual)return;
 const btn=document.getElementById('btnSalvarPagamento'),erro=document.getElementById('pagamentoErro');erro.textContent='';btn.disabled=true;
 try{
  const dados=Object.fromEntries(new FormData(e.currentTarget).entries());
  const r=await chamarApi('/api/pagamento',{codigo:pagamentoAtual.codigo,...dados});
  if(r.notificacaoWhatsapp==='failed'||r.notificacaoWhatsapp==='pending')console.warn('Pagamento salvo; aviso WhatsApp pendente:',r.notificacaoWhatsapp);
  e.currentTarget.reset();mostrarPagamentoConcluido();
 }catch(err){erro.textContent=err.message}finally{btn.disabled=false}
});
document.getElementById('btnPagamentoDepois').onclick=()=>{pagamentoAtual=null;mostrarTelaCodigo({limparCampo:true})};
document.getElementById('btnVoltarPagamento').onclick=()=>mostrarTelaCodigo({limparCampo:true});
