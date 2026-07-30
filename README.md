# Vendeu, Ganhou — versão comercial 5.0

Sistema de campanha promocional com página pública, painel administrativo e persistência Postgres para Vercel.

## Recursos

- Login administrativo com cookie HttpOnly, expiração, assinatura e proteção CSRF.
- Cadastro, edição, ativação e exclusão de participantes.
- Geração de código e importação por CSV.
- Cadastro de prêmios e quantidade de cartas por rodada.
- Prêmio fixo opcional por participante.
- Histórico de entradas e resultados.
- Liberação para uma nova jogada.
- Exportação de resultados em CSV.
- Personalização de nome, texto, logo e cores.
- Notificações opcionais pela AvisaAPI.
- Banco Postgres na Vercel e JSON somente no desenvolvimento local.
- Auditoria básica das alterações administrativas.

## Rodar localmente

Use Node.js 20 ou superior:

```bash
npm install
npm start
```

Acesse:

- Campanha: `http://localhost:3000`
- Painel: `http://localhost:3000/admin`

Login local de demonstração:

```txt
admin@local.test
admin123
```

Nunca publique usando essas credenciais. Na Vercel, o login de demonstração é bloqueado quando as variáveis administrativas não estão configuradas.

## Publicar na Vercel

1. Envie esta pasta para um repositório privado no GitHub.
2. Importe o repositório na Vercel.
3. Em **Storage/Marketplace**, conecte um Postgres compatível.
4. Confirme que a variável `DATABASE_URL` foi criada.
5. Adicione as variáveis abaixo e faça um novo deploy.

```txt
DATABASE_URL
ADMIN_EMAIL
ADMIN_PASSWORD
SESSION_SECRET
SORTEIO_SECRET
```

Para WhatsApp:

```txt
AVISAAPI_BASE_URL=https://www.avisaapi.com.br/api
AVISAAPI_TOKEN=seu_token_novo
ENVIAR_WHATSAPP=true
```

O número que recebe as mensagens é definido no painel em **Configurações**. As tabelas e os dados iniciais são criados automaticamente na primeira execução.

## Importação CSV

Exemplo:

```csv
codigo;nome;contato;ativo;premioFixo
123456;Maria Silva;81999999999;true;
654321;João Souza;81988888888;true;PIX DE R$ 50,00
```

As colunas obrigatórias são `codigo` e `nome`. O sistema aceita `;` ou `,`.

## Regra dos prêmios

A quantidade é o número de cartas daquele prêmio em cada rodada. A lista de prêmios é salva quando o participante entra, portanto alterações futuras não mudam uma rodada já iniciada.

O prêmio fixo, quando preenchido, é colocado na carta escolhida pelo participante. Deixe `Sorteio normal` para usar a distribuição configurada.

## Segurança

- O token antigo da AvisaAPI foi removido do projeto. Gere e use um token novo.
- Nunca coloque senhas ou tokens dentro dos arquivos.
- Mantenha o repositório privado.
- Use códigos longos e aleatórios em campanhas públicas.
- A responsabilidade pelo regulamento e pela legalidade da promoção é da empresa responsável pela campanha.
