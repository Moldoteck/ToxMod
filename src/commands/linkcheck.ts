const { Telegraf } = require('telegraf')
const needle = require('needle')

async function checkABUSEIP(ip) {
  //TODO: check if ipv6, should escape
  let options = { headers: { 'Key': process.env.ABUSEIPKEY, 'Accept': 'application/json' }, follow_max: 5 }
  let result = await needle('get', `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, options)
  try {
    if (result.body['data'] != undefined) {
      result = Number((result.body['data'])['totalReports'])
      result = result > 0 ? true : false
    }
    else {
      result = false
    }
  }
  catch (err) {
    console.log(err)
    result = false
  }

  return result
}
async function checkOTX(ip) {
  let options = { headers: { 'X-OTX-API-KEY': process.env.OTXKEY }, follow_max: 5 }
  //TODO: check if ipv6
  let result = await needle('get', `https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/malware`, options)
  try {
    result = Number((result.body['size']))
    result = result > 0 ? true : false
  }
  catch (err) {
    console.log(err)
    result = false
  }

  return result
}


// https://www.abuseipdb.com/check/[IP]/json?key=process.env.ABUSEIPKEY
export function checkLinks(bot: typeof Telegraf) {
  var dns = require('dns');
  bot.on('text', ctx => {
    if (ctx.message.text !== undefined) {
      let detected_urls = ctx.message.text.split(' ')
      detected_urls = detected_urls.filter(function (item) {
        return item.length > 6 && item.includes('.') && item.indexOf('.') < item.length - 1 - 1 && (item.match(/\./g) || []).length == 1;
      });
      if (detected_urls !== null) {
        detected_urls = [...new Set(detected_urls)];
        detected_urls.forEach(url => {
          console.log(url)
          dns.lookup(ctx.message.text, async function (err, address, _) {
            if (err == null) {
              let ABUSEIP_result = await checkABUSEIP(address)
              let OTX_result = await checkOTX(address)

              let final_result = 'Possible threat: '
              if (ABUSEIP_result) {
                final_result += '\nABUSEIP ' + ABUSEIP_result
              }
              if (OTX_result) {
                final_result += '\nOTX ' + OTX_result
              }

              if (final_result != 'Possible threat: ') {
                ctx.reply(final_result, { reply_to_message_id: ctx.message.message_id });
              }
            }
            else {
              console.log(err)
            }
          });
        })
      }
    }
  })
}
