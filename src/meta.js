const { tmdbApiKey } = require("../config/keys")
const needle = require('needle')

const findShowInfo = async (type, id) => {
    if (type == 'movie') {
        return await findMovieTmdb(type, id) || await findMovieCinemeta(type, id)
    } else if (type == 'series') {
        return await findSeriesTmdb(type, id) || await findSeriesCinemeta(type, id)
    }
}

const findMovieCinemeta = async (type, id) => {
    const resp = await needle('get', 'https://v3-cinemeta.strem.io/meta/' + type + '/' + id + '.json')
    return resp.body && { name: resp.body.meta.name, originalName: null, type }
}

const findSeriesCinemeta = async (type, id) => {
    const segments = id.split(':')
    if (segments.length == 3) {
        const [id, series, episode] = segments
        const resp = await needle('get', 'https://v3-cinemeta.strem.io/meta/' + type + '/' + id + '.json')
        return resp.body && { name: resp.body.meta.name, originalName: null, type, series, episode }
    }
}

const tmbdHeaders = {
    accept: 'application/json',
    Authorization: `Bearer ${tmdbApiKey}`
}

const getFirstResult = (response) => {

}
const findMovieTmdb = async (type, id) => {
    const resp = await needle(
        'get',
        `https://api.themoviedb.org/3/find/${id}?external_source=imdb_id&language=cs`,
        null,
        {headers: tmbdHeaders})
    if (resp.statusCode == 200) {
        const results = resp.body.movie_results
        if (results.length >= 1) {
            return { name: results[0].title, originalName: results[0].original_title, type }
        }
    }
}

const findSeriesTmdb = async (type, id) => {
    const segments = id.split(':')
    if (segments.length == 3) {
        const [id, series, episode] = segments
        const resp = await needle(
            'get',
            `https://api.themoviedb.org/3/find/${id}?external_source=imdb_id&language=cs`,
            null,
            {headers: tmbdHeaders})
        if (resp.statusCode == 200) {
            const results = resp.body.tv_results
            if (results.length >= 1) {
                return { name: results[0].name, originalName: results[0].original_name, type, series, episode }
            }
        }
    }
}

module.exports = { findShowInfo }