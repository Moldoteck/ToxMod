const { Telegraf } = require('telegraf')

export const bot = new Telegraf(process.env.TOKEN)
