import { Context, Telegraf } from 'telegraf'
import { checkAdmin } from "./adminChecker"
let default_vals = {
    toxic_thresh: 0.65,
    profan_thresh: 0.7,
    insult_thresh: 0.6,
    identity_thresh: 0.7
}

export function handleTriggers(bot: Telegraf<Context>) {
    bot.command('setthresh', async (ctx) => {
        let isAdmin = await checkAdmin(ctx)
        if (isAdmin) {
            await setVal(ctx)
        }
        try {
            ctx.deleteMessage(ctx.message.message_id)
        }
        catch (err) {
            console.log(err)
        }
    })

    bot.command('resetthresh', async (ctx) => {
        let isAdmin = await checkAdmin(ctx)
        if (isAdmin) {
            await resetVals(ctx)
            ctx.reply(`${ctx.i18n.t('default_thresh')}:\n ${JSON.stringify(default_vals, null, 2)}`, { reply_to_message_id: ctx.message.message_id });
        }
        try {
            ctx.deleteMessage(ctx.message.message_id)
        }
        catch (err) {
            console.log(err)
        }
    })

    bot.command('getthresh', async (ctx) => {
        let isAdmin = await checkAdmin(ctx)
        if (isAdmin) {
            let thresh = {
                toxic_thresh: ctx.dbchat.toxic_thresh,
                profan_thresh: ctx.dbchat.profan_thresh,
                insult_thresh: ctx.dbchat.insult_thresh,
                identity_thresh: ctx.dbchat.identity_thresh
            }
            ctx.reply(`${ctx.i18n.t('thresh_info')}:\n ${JSON.stringify(thresh, null, 2)}`, { reply_to_message_id: ctx.message.message_id });
        }
        try {
            ctx.deleteMessage(ctx.message.message_id)
        }
        catch (err) {
            console.log(err)
        }
    })
}

async function setVal(ctx) {
    let elements = ctx.message.text.split(' ')
    let return_msg = undefined
    if (elements.length == 3) {
        let thresh_type = elements[1]
        if (['toxic', 'profan', 'identity', 'insult'].includes(thresh_type)) {
            try {
                let thresh_val = parseFloat(elements[2])
                if (thresh_val != NaN && thresh_val <= 1 && thresh_val >= 0) {
                    let chat = ctx.dbchat
                    switch (thresh_type) {
                        case 'toxic':
                            chat.toxic_thresh = thresh_val
                            chat = await (chat as any).save()
                            break
                        case 'profan':

                            chat.profan_thresh = thresh_val
                            chat = await (chat as any).save()
                            break
                        case 'identity':
                            chat.identity_thresh = thresh_val
                            chat = await (chat as any).save()
                            break
                        case 'insult':
                            chat.insult_thresh = thresh_val
                            chat = await (chat as any).save()
                    }
                    chat = await (chat as any).save()
                } else {
                    return_msg = 'Number should be between 0 and 1'
                }
            }
            catch (err) {
                console.log(err)
            }
        } else {
            return_msg = 'Thresh should be one of: toxic, profan, identity, insult'
        }
    } else {
        return_msg = 'invalid command'
    }
}

async function resetVals(ctx: Context) {
    let chat = ctx.dbchat
    chat.toxic_thresh = default_vals.toxic_thresh
    chat.profan_thresh = default_vals.profan_thresh
    chat.insult_thresh = default_vals.insult_thresh
    chat.identity_thresh = default_vals.identity_thresh
    chat = await (chat as any).save()
}