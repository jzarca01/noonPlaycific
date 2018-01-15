const request = require("request");

function Api() {

}

Api.prototype.getMixtapes = function (collection = 'los-angeles') {
    const options = {
        method: 'GET',
        url: 'https://beta.whitelabel.cool/api/mixtapes',
        qs: { collection: collection},
        headers: {
            'cache-control': 'no-cache',
            referer: 'https://noonpacific.com/mixtapes/los-angeles/noon-250',
            dnt: '1',
            client: 'xO9gpB4DaYzQjZf344AYoGE9VaYl04OOcSdOgpxY',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            origin: 'https://noonpacific.com',
            accept: 'application/json; version=1.0'
        }
    };

    if(collection)

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error)
                reject(error);

            resolve(JSON.parse(body))
        });
    });
}

Api.prototype.getTracks = function (mixtape) {
    const options = {
        method: 'GET',
        url: 'https://beta.whitelabel.cool/api/tracks',
        qs: { mixtape: mixtape },
        headers: {
            'cache-control': 'no-cache',
            referer: 'https://noonpacific.com/mixtapes/los-angeles/noon-250',
            dnt: '1',
            client: 'xO9gpB4DaYzQjZf344AYoGE9VaYl04OOcSdOgpxY',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            origin: 'https://noonpacific.com',
            accept: 'application/json; version=1.0'
        }
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error)
                reject(error);

            resolve(JSON.parse(body))
        });
    });
}

module.exports = Api;