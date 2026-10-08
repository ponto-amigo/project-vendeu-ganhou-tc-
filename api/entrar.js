const repo = require('./_repository');
const { criarSnapshotPremios } = require('./_game');
const {
  normalizarCodigo,
  dataBrasil,
  enviarAvisoWhatsApp,
} = require('./_config');
const { readJson, json, method, errorMessage } = require('./_http');

async function notify(settings, mensagem) {
  try {
    if (settings.whatsappEnabled) {
      await enviarAvisoWhatsApp({
        mensagem,
        numero: settings.adminWhatsapp,
      });
    }
  } catch (erro) {
    console.warn('WhatsApp não enviado:', erro.message);
  }
}

module.exports = async (req, res) => {
  if (!method(req, res, ['POST'])) return;

  try {
    const body = await readJson(req);
    const code = normalizarCodigo(body.codigo);

    if (!code) {
      return json(res, 400, {
        ok: false,
        erro: 'Informe o código de acesso.',
      });
    }

    const participante = await repo.findParticipantByCode(code);

    if (!participante || !participante.active) {
      return json(res, 403, {
        ok: false,
        erro: 'Código inválido ou inativo.',
      });
    }

    // O banco é a fonte oficial: depois que o participante conclui o sorteio,
    // o mesmo código não consegue abrir o jogo novamente em nenhum navegador.
    const participacaoExistente = await repo.getParticipationByParticipantId(
      participante.id
    );

    if (participacaoExistente?.finalized) {
      return json(res, 200, {
        ok:true,finalizado:true,pagamentoPendente:!participacaoExistente.paymentAt,
        usuario:{codigo:participante.code,nome:participante.name},
        premio:participacaoExistente.prize,
        cartaEscolhida:participacaoExistente.selectedCard,
      });
    }

    const premios = await repo.listPrizes({ activeOnly: true });
    const snapshot = criarSnapshotPremios(premios);

    if (!snapshot.length) {
      return json(res, 409, {
        ok: false,
        erro: 'A campanha ainda não possui prêmios ativos.',
      });
    }

    const settings = await repo.getSettings();
    const registro = await repo.registerEntry(participante, snapshot);
    const participacao = registro.participation;

    if (registro.createdNow) {
      await notify(
        settings,
        `👀 ${settings.campaignName}\n\n` +
          `Uma pessoa entrou no jogo.\n\n` +
          `Nome: ${participante.name}\n` +
          `Código: ${participante.code}\n` +
          `Contato: ${participante.contact || 'Não informado'}\n` +
          `Data/hora: ${dataBrasil()}`
      );
    }

    return json(res, 200, {
      ok: true,
      usuario: {
        codigo: participante.code,
        nome: participante.name,
        contato: participante.contact,
      },
      quantidadeCartas: participacao.prizeSnapshot.length || snapshot.length,
      nomeCampanha: settings.campaignName,
      finalizado: false,
      entrouEm: participacao.enteredAt,
    });
  } catch (erro) {
    console.error(erro);
    return json(res, 500, {
      ok: false,
      erro: errorMessage(erro, 'Não foi possível registrar a entrada agora.'),
    });
  }
};
