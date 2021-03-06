export async function checkAdmin(ctx) {
  let isAdmin = false
  if (ctx.chat.type == 'group' || ctx.chat.type == 'supergroup') {
    let chat_admins = await ctx.getChatAdministrators()
    chat_admins = chat_admins.map(({ user }) => user.id);

    if (chat_admins.indexOf(ctx.from.id) != -1) {
      isAdmin = true
    }
  }
  if (ctx.chat.type == 'private') {
    isAdmin = true
  }
  return isAdmin
}

export async function checkAdminID(ctx, adminID) {
  let isAdmin = false
  if (ctx.chat.type == 'group' || ctx.chat.type == 'supergroup') {
    let chat_admins = await ctx.getChatAdministrators()
    chat_admins = chat_admins.map(({ user }) => user.id);

    if (chat_admins.indexOf(adminID) != -1) {
      isAdmin = true
    }
  }
  if (ctx.chat.type == 'private') {
    isAdmin = true
  }
  return isAdmin
}
