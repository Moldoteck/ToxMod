// import { Context } from "telegraf";
import { Context, Telegraf } from 'telegraf'
const { google } = require('googleapis');
const needle = require('needle')

let perspective_link = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';


async function getHFToxicityResult(text) {
  let API_URL = "https://api-inference.huggingface.co/models/sismetanin/rubert-toxic-pikabu-2ch"
  var options = {
    headers: { Authorization: `Bearer ${process.env.HUGGINGFACEKEY}` }
  }
  let res = await needle('post', API_URL, text, options)

  console.log(res.body)
  return res.body[0][1].score
}

async function getToxicityResult(language, text) {
  let client = await google.discoverAPI(perspective_link)
  let toxic_score: number = 0
  let profan_score: number = 0
  let insult_score: number = 0
  let identity_atack_score: number = 0
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
    identity_atack_score = response.data.attributeScores.IDENTITY_ATTACK.summaryScore.value
    // console.log(response.data.attributeScores)
  }
  console.log(toxic_score, profan_score, insult_score, identity_atack_score)
  return [toxic_score, profan_score, insult_score, identity_atack_score]
}



function setToxVal(ctx)//should add to chat info
{
  let toxVal = parseFloat(ctx.message.text.split(' ')[1])
  if (toxVal != NaN && toxVal <= 1 && toxVal >= 0) {
    ctx.reply('ok', { reply_to_message_id: ctx.message.message_id });
  }
}

export function checkSpeech(bot: Telegraf<Context>) {

  bot.command('toxic', async (ctx) => {
    console.log(ctx.chat.type)
    if (ctx.chat.type == 'group' || ctx.chat.type == 'supergroup') {
      let chat_member = await ctx.getChatMember(ctx.message.from.id)
      let chat_admins = await ctx.getChatAdministrators()

      if (chat_admins.includes(chat_member)) {
        setToxVal(ctx)
      }
    }
    else if (ctx.chat.type == "private") {
      setToxVal(ctx)
    }
  })

  bot.on('text', async ctx => {
    if (ctx.message.text !== undefined) {
      let user = ctx.dbuser
      user.language
      let result = await getToxicityResult('ru', ctx.message.text)

      if (result[0] > 0.65 || result[1] > 0.7 || result[2] > 0.6 || result[3] > 0.8) {
        ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
      }
      else {
        // let result = await getToxicityResult('en', ctx.message.text)

        // if (result[0] > 0.65 || result[1] > 0.7 || result[2] > 0.6 || result[3] > 0.8) {
        //   ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
        // }
        // if (ctx.i18n.t('short_name') == 'ru') {
        //   let hgresult = await getHFToxicityResult(ctx.message.text)
        //   if (hgresult > 0.85) {
        //     ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
        //   }
        // }
      }
    }
  })


  // bot.command(['profan'], (ctx) => {
  //   // ctx.
  // })

}

