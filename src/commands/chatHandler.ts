import { ExecException, ExecOptions } from 'node:child_process';
import { Context, Telegraf } from 'telegraf'
const { google } = require('googleapis');
const needle = require('needle')
import { findAllChats, findOnlyChat } from '../models'
import { checkAdmin } from "./adminChecker"

let perspective_link = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

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
let bot_commands = [{ command: 'subscribe_mod', description: 'became moderator of chat' },
{ command: 'unsubscribe_mod', description: 'unsubscribe from moderating' },
{ command: 'interactive', description: 'will respond to toxic messages' },
{ command: 'setthresh', description: 'change threshold for category' },
{ command: 'resetthresh', description: 'reset thresholds to defaults' },
{ command: 'getthresh', description: 'get defaults' },
{ command: 'toxicscore', description: 'get toxicity score for message' },
{ command: 'language', description: 'change language' },
{ command: 'help', description: 'help message' },
{ command: 'hide_cmd', description: 'hide inline commands' },
{ command: 'show_cmd', description: 'show inline commands' }]

async function getHFToxicityResult(text) {
  let API_URL = "https://api-inference.huggingface.co/models/sismetanin/rubert-toxic-pikabu-2ch"
  var options = {
    headers: { Authorization: `Bearer ${process.env.HUGGINGFACEKEY}` }
  }
  let res = await needle('post', API_URL, text, options)

  // console.log(res.body)
  return res.body[0][1].score
}

function delay(scnd: number) {
  return new Promise(resolve => setTimeout(resolve, scnd * 1000));
}

function dataObject(language: string,
  text: string,
  dontStore: boolean = false) {
  return {
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
    doNotStore: dontStore
  }
}

async function analyzeComment(client, requestData, depth = 0) {
  let response = undefined
  if (depth > 120) {
    console.log('Analysis wait time exceeded')
    return undefined
  }
  try {
    response = await client.comments.analyze({
      key: process.env.PERSPECTIVEKEY,
      resource: requestData,
    })
  } catch (err) {
    if (err.message.includes('Quota exceeded for quota metric')) {
      await delay(1)
      response = await analyzeComment(client, requestData, depth + 1)
    } else {
      console.log("Error stack: ", err.stack)
      console.log("Error name: ", err.name)
      console.log("Error message: ", err.message)
      response = undefined
    }
  }
  return response
}

async function getToxicityResult(requestData) {
  let client = undefined

  let toxic_score: number = 0
  let profan_score: number = 0
  let insult_score: number = 0
  let identity_score: number = 0

  try {
    client = await google.discoverAPI(perspective_link)
  }
  catch (err) {
    console.log("Error stack: ", err.stack)
    console.log("Error name: ", err.name)
    console.log("Error message: ", err.message)
    return undefined
  }
  let response = await analyzeComment(client, requestData)

  // else {
  let attr_scores = response.data.attributeScores
  toxic_score = attr_scores.TOXICITY.summaryScore.value
  profan_score = attr_scores.PROFANITY.summaryScore.value
  insult_score = attr_scores.INSULT.summaryScore.value
  identity_score = attr_scores.IDENTITY_ATTACK.summaryScore.value
  // }
  let result = {
    toxic_score: toxic_score,
    profan_score: profan_score,
    insult_score: insult_score,
    identity_score: identity_score
  }
  // console.log(result)s

  return result
}


import { countChats } from '@/models'
async function customReply(message: string, context) {
  try {
    await context.reply(message, { reply_to_message_id: context.message.message_id })
  } catch (err) {
    let msg = '' + err.message
    if (msg.includes('retry after')) {
      let st = msg.indexOf('retry after') + 'retry after '.length
      msg = msg.substring(st).split(' ')[0]
      await delay(parseInt(msg))
      await customReply(message, context)
    } else {
      console.log("Error", err.stack);
      console.log("Error", err.name);
      console.log("Error", err.message);
    }
  }
}

async function modReply(mod: number, message: string, context) {
  try {
    await context.telegram.sendMessage(mod, message, { disable_notification: true })
  } catch (err) {
    let msg = '' + err.message
    if (msg.includes('retry after')) {
      let st = msg.indexOf('retry after') + 'retry after '.length
      msg = msg.substring(st).split(' ')[0]
      await delay(parseInt(msg))
      await modReply(mod, message, context)
    } else {
      console.log("Error", err.stack);
      console.log("Error", err.name);
      console.log("Error", err.message);
    }
  }
}

export function checkSpeech(bot: Telegraf<Context>) {
  bot.command('show_cmd_force', async (ctx) => {
    if (ctx.message.from.id == 180001222) {
      let chats = await findAllChats()
      for (let ind = 0; ind < chats.length; ++ind) {
        let chat_id = chats[ind].id
        let options = {
          headers: { 'Content-Type': 'application/json' }
        }
        let data = { commands: bot_commands, scope: { type: 'chat', chat_id: `${chat_id}` } }
        let tg_url = `https://api.telegram.org/bot${process.env.TOKEN}/setMyCommands`
        await needle('post', tg_url, JSON.stringify(data), options)
      }
    }
  })
  bot.command('hide_cmd_force', async (ctx) => {
    if (ctx.message.from.id == 180001222) {
      let chats = await findAllChats()
      for (let ind = 0; ind < chats.length; ++ind) {
        let chat_id = chats[ind].id
        let options = {
          headers: { 'Content-Type': 'application/json' }
        }
        let data = { scope: { type: 'chat', chat_id: `${chat_id}` } }
        let tg_url = `https://api.telegram.org/bot${process.env.TOKEN}/deleteMyCommands`
        await needle('post', tg_url, JSON.stringify(data), options)
      }
    }
  })

  bot.command('show_cmd', async (ctx) => {
    if (await checkAdmin(ctx)) {
      let options = {
        headers: { 'Content-Type': 'application/json' }
      }
      let data = { commands: bot_commands, scope: { type: 'chat', chat_id: `${ctx.message.chat.id}` } }
      let tg_url = `https://api.telegram.org/bot${process.env.TOKEN}/setMyCommands`
      await needle('post', tg_url, JSON.stringify(data), options)
    }
  })

  bot.command('hide_cmd', async (ctx) => {
    if (await checkAdmin(ctx)) {
      let options = {
        headers: { 'Content-Type': 'application/json' }
      }
      let data = { scope: { type: 'chat', chat_id: `${ctx.message.chat.id}` } }
      let tg_url = `https://api.telegram.org/bot${process.env.TOKEN}/deleteMyCommands`
      await needle('post', tg_url, JSON.stringify(data), options)
    }
  })

  bot.command('toxicscore', async (ctx) => {
    let reply = ctx.message.reply_to_message
    if (reply != undefined && 'text' in reply) {
      let data = dataObject(ctx.i18n.t('short_name'), reply.text)
      let result = await getToxicityResult(data)
      if (result) {
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
        ctx.reply(`${ctx.i18n.t(msg)} ${Math.trunc(100 * max)}%`, { reply_to_message_id: ctx.message.reply_to_message.message_id });
      }
    }
    try {
      ctx.deleteMessage(ctx.message.message_id)
    }
    catch (err) {
      console.log(err)
    }
  })

  bot.command('toxicscorefull', async (ctx) => {
    let reply = ctx.message.reply_to_message
    if (reply) {
      if ('text' in reply) {
        let result = await getToxicityResult(dataObject(ctx.i18n.t('short_name'), reply.text))
        if (result) {
          let keys = Object.keys(result)
          keys.forEach(key => {
            result[key] = `${Math.trunc(100 * result[key])}%`
          });

          // let responseString = replaceAll(deleteStrings(JSON.stringify(result), ['"', '{', '}']), ',', '\n')
          ctx.reply(`${JSON.stringify(result, null, 2)}`, { reply_to_message_id: ctx.message.reply_to_message.message_id });
        }
      }
    }
    try {
      ctx.deleteMessage(ctx.message.message_id)
    }
    catch (err) {
      console.log(err)
    }
  })

  bot.command('subscribe_mod', async (ctx) => {
    let chat = ctx.dbchat
    let user_id = ctx.from.id
    try {
      ctx.deleteMessage(ctx.message.message_id)
    }
    catch (err) {
      console.log(err)
    }
    if (!chat.moderators.includes(user_id)) {
      if (await checkAdmin(ctx)) {
        let private_chat = await findOnlyChat(user_id)
        if (private_chat) {
          chat.moderators.push(ctx.from.id)
          chat = await (chat as any).save()
        } else {
          ctx.reply(ctx.i18n.t('chat_missing'))
        }
      } else {
        ctx.reply(ctx.i18n.t('not_admin'))
      }
    } else {
      ctx.reply(ctx.i18n.t('subscribed'))
    }
  })

  bot.command('unsubscribe_mod', async (ctx) => {
    let chat = ctx.dbchat
    let user_id = ctx.from.id
    try {
      ctx.deleteMessage(ctx.message.message_id)
    }
    catch (err) {
      console.log(err)
    }
    if (chat.moderators.includes(user_id)) {
      chat.moderators.splice(chat.moderators.indexOf(user_id), 1)
      chat = await (chat as any).save()
    } else {
      ctx.reply(ctx.i18n.t('unsubscribed'))
    }
  })

  bot.command('countChats', async (ctx) => {
    if (ctx.message.from.id == 180001222) {
      ctx.reply(' ' + (await countChats()))
    }
  })

  bot.command('interactive', async (ctx) => {
    let chat = ctx.dbchat
    let user_id = ctx.from.id
    try {
      ctx.deleteMessage(ctx.message.message_id)
    }
    catch (err) {
      console.log(err)
    }
    if (await checkAdmin(ctx)) {
      let private_chat = await findOnlyChat(user_id)
      if (private_chat) {
        chat.interactive = !chat.interactive
        chat = await (chat as any).save()
        ctx.reply(`${ctx.i18n.t('interactive')} ${chat.interactive}`)
      } else {
        ctx.reply(ctx.i18n.t('chat_missing'))
      }
    } else {
      ctx.reply(ctx.i18n.t('not_admin'))
    }
  })

  bot.on('text', async ctx => {
    if (ctx.message.text !== undefined) {
      let data = dataObject(ctx.i18n.t('short_name'), ctx.message.text)
      // for(let ind=0;ind<250;++ind){
      //   let result = await getToxicityResult(data)
      // }
      let result = await getToxicityResult(data)

      if (result) {
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

          if (ctx.dbchat.interactive) {
            let msg = response_notification[keys[max_index]]
            customReply(ctx.i18n.t(msg), ctx)
            // try {
            //   ctx.reply(ctx.i18n.t(msg), { reply_to_message_id: ctx.message.message_id })
            // } catch (err) {
            //   let msg = ''
            //   if (msg.includes('retry after')) {
            //     // err.message
            //     let st = msg.indexOf('retry after') + 'retry after '.length
            //     msg = msg.substring(st).split(' ')[0]
            //     await delay(parseInt(msg))
            //   }
            // }
          }

          let chat = ctx.dbchat
          chat.moderators.forEach(async moderator_id => {
            try {
              let chat_info = await ctx.getChat()
              if (chat_info != undefined && 'username' in chat_info) {
                let tt = "https://t.me/" + chat_info.username + '/' + ctx.message.message_id
                modReply(moderator_id, tt, ctx)
                // ctx.telegram.sendMessage(moderator_id, ctx.i18n.t(msg), { reply_to_message_id: first_message.message_id, disable_notification: true })
              }
              else if (chat_info != undefined && !('username' in chat_info)) {
                customReply("Group is not public (it should have t.me/... link)", ctx)
              }
            }
            catch (err) {
              console.log(err)
            }
          });
        }
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

function deleteStrings(input: string, strings: Array<string>) {
  strings.forEach(element => {
    input = replaceAll(input, element)
  });
  return input
}
function replaceAll(input: string, what: string, substitute: string = '') {
  return input.split(what).join(substitute)
}

