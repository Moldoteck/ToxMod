# Telegram bot for detecting toxic messages in group chats
 <a href="https://t.me/ToxModBot">@ToxModBot</a><br>
This bot will reply with `Possible toxic message` to a message containing toxic/profanic words.
`doNotStore` flag is set to true in order to preserve better privacy for message content (it will not be stored on servers)

# API's:
Google Perspective API

# Installation and local launch

1. Clone this repo: `git clone https://github.com/Moldoteck/ToxMod`
2. Launch the [mongo database](https://www.mongodb.com/) locally
3. Create `.env` with the environment variables listed below
4. Run `yarn install` in the root folder
5. Run `yarn develop`

And you should be good to go! Feel free to fork and submit pull requests. Thanks!

# Environment variables

- `TOKEN` — Telegram bot token
- `MONGO`— URL of the mongo database
- `PERSPECTIVEKEY` — Token for Google Perspective API. More info here: https://perspectiveapi.com
- `HUGGINGFACEKEY` — Token for huggingface

Also, please, consider looking at `.env.sample`.

# License

MIT — use for any purpose. Would be great if you could leave a note about the original developers. Thanks!

Inspired from here: https://github.com/backmeupplz/telegraf-template
