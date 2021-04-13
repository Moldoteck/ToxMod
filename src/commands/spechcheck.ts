import { Context, Telegraf } from 'telegraf'
const { google } = require('googleapis');
const needle = require('needle')

let perspective_link = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

let default_vals = {
  toxic_thresh: 0.65,
  profan_thresh: 0.7,
  insult_thresh: 0.6,
  identity_thresh: 0.7
}
let response_score_map = {
  toxic_score: 'toxic_msg',
  profan_score: 'profan_msg',
  insult_score: 'insult_msg',
  identity_score: 'identity_msg'
}
let response_notification = {
  toxic_score: 'toxic_notification',
  profan_score: 'profan_notification',
  insult_score: 'insult_notification',
  identity_score: 'identity_notification'
}

async function getHFToxicityResult(text) {
  let API_URL = "https://api-inference.huggingface.co/models/sismetanin/rubert-toxic-pikabu-2ch"
  var options = {
    headers: { Authorization: `Bearer ${process.env.HUGGINGFACEKEY}` }
  }
  let res = await needle('post', API_URL, text, options)

  // console.log(res.body)
  return res.body[0][1].score
}

async function getToxicityResult(language, text) {
  let client = await google.discoverAPI(perspective_link)
  let toxic_score: number = 0
  let profan_score: number = 0
  let insult_score: number = 0
  let identity_score: number = 0
  const analyzeRequest = {
    comment: {
      text: text
    },
    requestedAttributes: {
      TOXICITY: { scoreType: "PROBABILITY" },
      PROFANITY: { scoreType: "PROBABILITY" },
      IDENTITY_ATTACK: { scoreType: "PROBABILITY" },
      INSULT: { scoreType: "PROBABILITY" }
    },
    languages: [language],
    doNotStore: true
  };

  let err, response = await client.comments.analyze({
    key: process.env.PERSPECTIVEKEY,
    resource: analyzeRequest,
  })
  if (err) {
    console.log(err)
  }
  else {
    toxic_score = response.data.attributeScores.TOXICITY.summaryScore.value
    profan_score = response.data.attributeScores.PROFANITY.summaryScore.value
    insult_score = response.data.attributeScores.INSULT.summaryScore.value
    identity_score = response.data.attributeScores.IDENTITY_ATTACK.summaryScore.value
    // console.log(response.data.attributeScores)
  }
  let result = {
    toxic_score: toxic_score,
    profan_score: profan_score,
    insult_score: insult_score,
    identity_score: identity_score
  }
  console.log(result)

  return result
}

async function setVal(ctx) {
  let elements = ctx.message.text.split(' ')
  if (elements.length == 3) {
    let thresh_type = elements[1]
    try {
      let thresh_val = parseFloat(elements[2])
      if (thresh_val != NaN && thresh_val <= 1 && thresh_val >= 0) {
        let chat = ctx.dbchat
        if ('toxic' == thresh_type) {
          chat.toxic_thresh = thresh_val
          chat = await (chat as any).save()
          ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
        }
        if ('profan' == thresh_type) {
          chat.profan_thresh = thresh_val
          chat = await (chat as any).save()
          ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
        }
        if ('identity' == thresh_type) {
          chat.identity_thresh = thresh_val
          chat = await (chat as any).save()
          ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
        }
        if ('insult' == thresh_type) {
          chat.insult_thresh = thresh_val
          chat = await (chat as any).save()
          ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
        }
      }
    }
    catch (err) {
      console.log(err)
    }
  }
}

async function resetVals(ctx: Context) {
  let chat = ctx.dbchat
  chat.toxic_thresh = default_vals.toxic_thresh
  chat.profan_thresh = default_vals.profan_thresh
  chat.insult_thresh = default_vals.insult_thresh
  chat.identity_thresh = default_vals.identity_thresh
  chat = await (chat as any).save()
  ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
}

async function checkAdmin(ctx) {
  let isAdmin = false
  if (ctx.chat.type == 'group' || ctx.chat.type == 'supergroup') {
    let chat_member = ctx.message.from.id
    let chat_admins = await ctx.getChatAdministrators()
    chat_admins = chat_admins.map(({ user }) => user.id);

    if (chat_admins.indexOf(chat_member) != -1) {
      isAdmin = true
    }
  }
  else if (ctx.chat.type == "private") {
    isAdmin = true
  }
  return isAdmin
}

export function checkSpeech(bot: Telegraf<Context>) {

  bot.command('thresh', async (ctx) => {
    let isAdmin = await checkAdmin(ctx)
    if (isAdmin) {
      await setVal(ctx)
    }
  })

  bot.command('resetthresh', async (ctx) => {
    let isAdmin = await checkAdmin(ctx)
    if (isAdmin) {
      await resetVals(ctx)
      ctx.reply(`${ctx.i18n.t('default_thresh')}:\n ${JSON.stringify(default_vals, null, 2)}`, { reply_to_message_id: ctx.message.message_id });
    }
  })

  bot.command('getthresh', async (ctx) => {
    let thresh = {
      toxic_thresh: ctx.dbchat.toxic_thresh,
      profan_thresh: ctx.dbchat.profan_thresh,
      insult_thresh: ctx.dbchat.insult_thresh,
      identity_thresh: ctx.dbchat.identity_thresh
    }
    ctx.reply(`${ctx.i18n.t('thresh_info')}:\n ${JSON.stringify(thresh, null, 2)}`, { reply_to_message_id: ctx.message.message_id });
  })

  bot.command('toxicscore', async (ctx) => {
    let reply = ctx.message.reply_to_message
    if (reply) {
      if ('text' in reply) {
        let result = await getToxicityResult(ctx.i18n.t('short_name'), reply.text)
        var keys = Object.keys(result);
        var max = result[keys[0]];
        var max_index = 0;
        var i;

        for (i = 1; i < keys.length; i++) {
          var value = result[keys[i]];
          if (value > max) {
            max = value;
            max_index = i;
          }
        }
        let msg = response_score_map[keys[max_index]]
        ctx.reply(`${ctx.i18n.t(msg)} ${Math.trunc(100 * max)}%`, { reply_to_message_id: ctx.message.message_id });
      }
    }
  })

  bot.on('text', async ctx => {
    if (ctx.message.text !== undefined) {
      let result = await getToxicityResult(ctx.i18n.t('short_name'), ctx.message.text)

      if (result.toxic_score > ctx.dbchat.toxic_thresh
        || result.profan_score > ctx.dbchat.profan_thresh
        || result.insult_score > ctx.dbchat.insult_thresh
        || result.identity_score > ctx.dbchat.identity_thresh) {
        var keys = Object.keys(result);
        var max = result[keys[0]];
        var max_index = 0;
        var i;

        for (i = 1; i < keys.length; i++) {
          var value = result[keys[i]];
          if (value > max) {
            max = value;
            max_index = i;
          }
        }
        let msg = response_notification[keys[max_index]]
        ctx.reply(ctx.i18n.t(msg), { reply_to_message_id: ctx.message.message_id });

        // ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
      }
      else {
        // if (ctx.i18n.t('short_name') == 'ru') {
        //   let hgresult = await getHFToxicityResult(ctx.message.text)
        //   if (hgresult > 0.85) {
        //     ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
        //   }
        // }
      }
    }
  })
}

