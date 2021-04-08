const { Telegraf } = require('telegraf')

export function setupHelp(bot: typeof Telegraf) {
  bot.command('start', (ctx) => {
    ctx.replyWithHTML(ctx.i18n.t('start'))
  })
  bot.command('help', (ctx) => {
    ctx.replyWithHTML(ctx.i18n.t('help'))

  })
}
