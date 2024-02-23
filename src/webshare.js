const needle = require('needle')
const md5 = require('nano-md5');
const sha1 = require('sha1');
const formencode = require('form-urlencoded')
const { filesize } = require('filesize')

const headers = { content_type: 'application/x-www-form-urlencoded; charset=UTF-8', accept: 'text/xml; charset=UTF-8' }
const getQuery = (info) => {
    if (info.type == 'series') {
        return `${info.name} S${info.series.padStart(2, '0')}E${info.episode.padStart(2, '0')}`
    } else {
        return info.name
    }
}
const webshare = {
    login: async (user, password) => {
        console.log(`Logging in user ${user}`)
        // get salt
        const saltResp = await needle('https://webshare.cz/api/salt/', `username_or_email=${user}`, headers)
        const salt = saltResp.body.children.find(el => el.name == 'salt').value

        // login
        const passEncoded = sha1(md5.crypt(password, salt))
        const data = formencode({ username_or_email: user, password: passEncoded, keep_logged_in: 0 })
        const resp = await needle('post', 'https://webshare.cz/api/login/', data, headers)
        if (resp.statusCode != 200 || resp.body.children.find(el => el.name == 'status').value != 'OK') {
            throw Error('Cannot log in to Webshare.cz, invalid login credentials')
        }
        return resp.body.children.find(el => el.name == 'token').value
    },

    // improve movie query by adding year with movies
    // search localized names too
    // we could also combine multiple different queries to get better results
    search: async (showInfo, token) => {
        const query = getQuery(showInfo)
        console.log('Searching', showInfo.type, query)
        const data = formencode({ what: query, category: 'video', sort: 'largest', limit: '20', wst: token })
        const resp = await needle('post', 'https://webshare.cz/api/search/', data, headers)
        const files = resp.body.children.filter(el => el.name == 'file')
        return files.filter(el => {
            const protected = el.children.find(el => el.name == 'password')
            return protected == null || protected.value == '0'
        }).map(el => {
            const ident = el.children.find(el => el.name == 'ident').value
            const size = filesize(el.children.find(el => el.name == 'size').value)
            const posVotes = el.children.find(el => el.name == 'positive_votes').value
            const negVotes = el.children.find(el => el.name == 'negative_votes').value
            const name = el.children.find(el => el.name == 'name').value
            return {
                ident,
                description: name,
                name: `💾 ${size} 👍 ${posVotes} 👎 ${negVotes}`
            }
        })
    },

    addUrlToStreams: (streams, token) => {
        return Promise.all(streams.map(async stream => {
            const { ident, ...restStream } = stream
            const data = formencode({ ident, download_type: 'video_stream', force_https: 1, wst: token })
            const resp = await needle('post', 'https://webshare.cz/api/file_link/', data, headers)
            const status = resp.body.children.find(el => el.name == 'status').value
            if (status == 'OK') {
                const url = resp.body.children.find(el => el.name == 'link').value
                return { ...restStream, url }
            } else {
                return restStream
            }
        }))
    }
}
module.exports = webshare