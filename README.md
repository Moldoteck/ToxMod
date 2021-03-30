# Telegram bot for detecting links to malware sites
This bot will reply with text `Possible threat: ...` and triggered database to a message containing links to malware sites

# Databases:
<b>Already implemented:</b>
* AbuseIPDB
* AlienVault Open Threat Exchang<br>

<b>Will be added:</b>
* Google Safe Browsing
* Metacert
* URLScan.io
* VirusTotal
* Web of Trust

# Installation and local launch

1. Clone this repo: `git clone https://github.com/Moldoteck/MalwareBot`
2. Launch the [mongo database](https://www.mongodb.com/) locally
3. Create `.env` with the environment variables listed below
4. Run `yarn install` in the root folder
5. Run `yarn develop`

And you should be good to go! Feel free to fork and submit pull requests. Thanks!

# Environment variables

- `TOKEN` — Telegram bot token
- `MONGO`— URL of the mongo database
- `ABUSEIPKEY` — Token for AbuseIPDB
- `OTXKEY`— Token for AlienVault Open Threat Exchange

Also, please, consider looking at `.env.sample`.

# License

MIT — use for any purpose. Would be great if you could leave a note about the original developers. Thanks!

** Inspired from here: https://github.com/backmeupplz/telegraf-template **
