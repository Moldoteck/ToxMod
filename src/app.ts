// Setup @/ aliases for modules
import 'module-alias/register'
// Config dotenv
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })
// Dependencies
import { bot } from '@/helpers/bot'
import { checkTime } from '@/middlewares/checkTime'
import { setupHelp } from '@/commands/help'
import { setupI18N } from '@/helpers/i18n'
import { setupLanguage } from '@/commands/language'
// import { checkSpeech } from '@/commands/spechcheck'
import { handleTriggers } from '@/commands/triggerHandler'
import { checkSpeech } from '@/commands/chatHandler'
import { attachUser } from '@/middlewares/attachUser'
import { attachChat } from '@/middlewares/attachChat'

// Check time
bot.use(checkTime)
// Attach user
bot.use(attachUser)
// Attach chat
bot.use(attachChat)
// Setup localization
setupI18N(bot)
// Setup commands
setupHelp(bot)
setupLanguage(bot)
handleTriggers(bot)
checkSpeech(bot)

// Start bot
bot.launch().then(() => {
  console.info('Bot is up and running')
})
