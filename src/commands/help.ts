import { Context, Telegraf } from 'telegraf'

export function setupHelp(bot: Telegraf<Context>) {
  bot.command('start', (ctx) => {
    ctx.replyWithHTML(ctx.i18n.t('start'))
  })
  bot.command('help', (ctx) => {
    ctx.replyWithHTML(ctx.i18n.t('help'))
    try {
      ctx.deleteMessage(ctx.message.message_id)
    } catch (err) { console.log(err) }
  })
}
