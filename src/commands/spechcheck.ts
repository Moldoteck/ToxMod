// import { Context } from "telegraf";
import { Context, Telegraf } from 'telegraf'
const { google } = require('googleapis');
const needle = require('needle')

let perspective_link = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

let default_vals = {
  toxic_thresh: 0.65,
  profan_thresh: 0.7,
  identity_thresh: 0.7,
  insult_thresh: 0.6
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

async function setToxVal(ctx) {
  let toxVal = parseFloat(ctx.message.text.split(' ')[1])
  if (toxVal != NaN && toxVal <= 1 && toxVal >= 0) {
    let chat = ctx.dbchat
    chat.toxic_thresh = toxVal
    chat = await (chat as any).save()
    ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
  }
}

async function setProfanVal(ctx) {
  let profanVal = parseFloat(ctx.message.text.split(' ')[1])
  if (profanVal != NaN && profanVal <= 1 && profanVal >= 0) {
    let chat = ctx.dbchat
    chat.profan_thresh = profanVal
    chat = await (chat as any).save()
    ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
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
    let chat_member = await ctx.getChatMember(ctx.message.from.id)
    let chat_admins = await ctx.getChatAdministrators()
    chat_member = chat_member.user
    chat_admins = chat_admins.map(({ user }) => user);
    console.log(chat_admins)
    console.log(chat_member)    

    if (chat_admins.includes(chat_member)) {
      isAdmin = true
    }
  }
  else if (ctx.chat.type == "private") {
    isAdmin = true
  }
  return isAdmin
}

export function checkSpeech(bot: Telegraf<Context>) {

  bot.command('toxic', async (ctx) => {
    let isAdmin = await checkAdmin(ctx)
    if (isAdmin) {
      await setToxVal(ctx)
    }
  })

  bot.command('profan', async (ctx) => {
    let isAdmin = await checkAdmin(ctx)
    if (isAdmin) {
      await setProfanVal(ctx)
    }
  })

  bot.command('resetthresh', async (ctx) => {
    let isAdmin = await checkAdmin(ctx)
    if (isAdmin) {
      await resetVals(ctx)
      ctx.reply(`Thresholds are dafaulted:\n ${JSON.stringify(default_vals, null, 2)}`, { reply_to_message_id: ctx.message.message_id });
    }
  })

  bot.command('getthresh', async (ctx) => {
    let thresh = {
      toxic_score: ctx.dbchat.toxic_thresh,
      profan_score: ctx.dbchat.profan_thresh,
      insult_score: ctx.dbchat.insult_thresh,
      identity_score: ctx.dbchat.identity_thresh
    }
    ctx.reply(`Thresholds are:\n ${JSON.stringify(thresh, null, 2)}`, { reply_to_message_id: ctx.message.message_id });
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
        ctx.reply(`${keys[max_index]}: ${max}`, { reply_to_message_id: ctx.message.message_id });
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
        ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
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

