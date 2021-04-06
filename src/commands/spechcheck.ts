// import { Context } from "telegraf";
const { Telegraf } = require('telegraf')
const { google } = require('googleapis');

let perspective_link = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

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

export function checkSpeech(bot: typeof Telegraf) {
  bot.on('text', async ctx => {
    if (ctx.message.text !== undefined) {
      let result = await getToxicityResult(ctx.i18n.t('short_name'), ctx.message.text)
      if (result[0] > 0.65 || result[1] > 0.7 || result[2] > 0.6 || result[3] > 0.6) {
        ctx.reply(ctx.i18n.t('toxic_notification'), { reply_to_message_id: ctx.message.message_id });
      }
    }
  })
}

export function setupToxicThreshold(bot: typeof Telegraf) {
  bot.command(['toxic'], (ctx) => {
    // ctx.
  })
}

export function setupProfanityThreshold(bot: typeof Telegraf) {
  bot.command(['profan'], (ctx) => {
    // ctx.
  })
}
