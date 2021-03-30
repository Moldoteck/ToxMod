const { Telegraf } = require('telegraf')

export function setupHelp(bot: typeof Telegraf) {
  bot.command(['help', 'start'], (ctx) => {
    ctx.replyWithHTML(ctx.i18n.t('help'))
  })
}
