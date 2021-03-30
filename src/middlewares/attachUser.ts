import { findUser } from '../models'
import { Context } from 'telegraf'

export async function attachUser(ctx: Context, next) {
  if (ctx.from != undefined) {
    const dbuser = await findUser(ctx.from.id)
    ctx.dbuser = dbuser
  }
  return next()
}
