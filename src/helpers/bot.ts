import { Context, Telegraf } from 'telegraf'

export const bot = new Telegraf<Context>(process.env.TOKEN)
