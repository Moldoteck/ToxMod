import { privateEncrypt } from "node:crypto"

const { Telegraf } = require('telegraf')
const needle = require('needle')

async function checkABUSEIP(ip) {
  //TODO: check if ipv6, should escape
  let options = { headers: { 'Key': process.env.ABUSEIPKEY, 'Accept': 'application/json' }, follow_max: 5 }
  let result = await needle('get', `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, options)
  try {
    if (result.body['data'] != undefined) {
      let reports = Number((result.body['data'])['totalReports'])
      result = reports > 0 ? { 'ABUSEIP': 'malicious' } : {}
    }
    else {
      result = {}
    }
  }
  catch (err) {
    console.log(err)
    result = {}
  }

  return result
}
async function checkOTX(ip) {
  let options = { headers: { 'X-OTX-API-KEY': process.env.OTXKEY }, follow_max: 5 }
  //TODO: check if ipv6
  let result = await needle('get', `https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/malware`, options)
  try {
    let reports = Number((result.body['size']))
    result = reports > 0 ? { 'OTX': 'malicious' } : {}
  }
  catch (err) {
    console.log(err)
    result = {}
  }

  return result
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  

async function virusTotalIDCheck(id) {
  //wait a bit for VT to process the request
  await sleep(2000);
  let options = { headers: { 'x-apikey': process.env.VIRUSTOTALKEY, 'Accept': 'application/json' }, follow_max: 5 }
  return await needle('get', `https://www.virustotal.com/api/v3/analyses/${id}`, options)
} 

async function checkVirusTotal(url) {
  // TODO: add support for community score
  // TODO: add limits: if more than 4 req per minute, add them to global list, wait a minute, send bulk 4 requests
  // TODO: add suport for bulk reading
  // TODO: add limit for 500 requests per day
  let options = { headers: { 'x-apikey': process.env.VIRUSTOTALKEY, 'Accept': 'application/json' }, follow_max: 5 }
  let data = { 'url': url }

  let result = await needle('post', `https://www.virustotal.com/api/v3/urls`, data, options)
  let id = (result.body['data'])['id']
  //TODO: if empty result, do new request after one/two seconds

  result = await virusTotalIDCheck(id)

  let results = ((result.body['data'])['attributes'])['results']
  result = {}
  for (const [_, value] of Object.entries(results)) {
    if (value['category'] != 'harmless' && value['category'] != 'undetected') {
      result[value['engine_name']] = value['result']
    }
  }
  return result
}

export function checkLinks(bot: typeof Telegraf) {
  var dns = require('dns');
  const REPLACE_REGEX = /^(https?):\/\//i
  bot.on('text', ctx => {
    if (ctx.message.text !== undefined) {
      let detected_urls = ctx.message.text.split(' ')
      detected_urls = detected_urls.filter(function (item) {
        let point_nr = (item.match(/\./g) || []).length
        return item.length > 6 && item.lastIndexOf('.') < item.length - 1 - 1 && point_nr <= 2 && point_nr >= 1;
      });
      if (detected_urls !== null) {
        detected_urls = [...new Set(detected_urls)];
        detected_urls.forEach(url => {
          url = url.replace(REPLACE_REGEX, '');
          url = url.split('/')[0]
          console.log(url)
          dns.lookup(url, async function (err, address, _) {
            if (err == null) {
              let ABUSEIP_result = await checkABUSEIP(address)
              let OTX_result = await checkOTX(address)
              let VT_result = await checkVirusTotal(url)

              let final_result = 'Possible threat: '
              if (ABUSEIP_result != {}) {
                for (const [key, value] of Object.entries(ABUSEIP_result)) {
                  final_result += `\n${key}: ${value}`
                }
              }
              if (OTX_result != {}) {
                for (const [key, value] of Object.entries(OTX_result)) {
                  final_result += `\n${key}: ${value}`
                }
              }
              if (VT_result != {}) {
                for (const [key, value] of Object.entries(VT_result)) {
                  final_result += `\n${key}: ${value}`
                }
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
