export async function checkAdmin(ctx) {
  let isAdmin = false
  if (ctx.chat.type == 'group' || ctx.chat.type == 'supergroup') {
    let chat_admins = await ctx.getChatAdministrators()
    chat_admins = chat_admins.map(({ user }) => user.id);

    if (chat_admins.indexOf(ctx.from.id) != -1) {
      isAdmin = true
    }
  }
  return isAdmin
}