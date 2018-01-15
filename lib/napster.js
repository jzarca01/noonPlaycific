const express = require('express');
const passport = require('passport');
const util = require('util');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const request = require('request');
const swig = require('swig');
const consolidate = require('consolidate');
const jquery = require('jquery');

const OAuth2Strategy = require('passport-oauth2').Strategy;
const config = require('../config/napster.json');

const open = require('electron-open-url');

var napsterConfig = {
    access_token: '',
    refresh_token: '',
    profile: {}
};

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new OAuth2Strategy({
        authorizationURL: 'https://api.napster.com/oauth/authorize',
        tokenURL: 'https://api.napster.com/oauth/access_token',
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.redirectUri
    },
    function (done) {
        process.nextTick(function () {
            return done(null);
        });
    }
));

const app = express();

// configure Express
app.set('views', __dirname + '/views');
app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
    secret: 'keyboard cat'
}));
app.engine('html', consolidate.swig);

app.use(passport.initialize());
app.use(passport.session());

app.get('/account', function (req, res) {
    res.render('account', {
        user: req.user.name
    });
});

app.get('/login', function (req, res) {
    res.render('login', {
        user: req.user.name
    });
});

function getAccessToken(code) {
    const url = "https://api.napster.com/oauth/access_token";

    const napsterData = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        response_type: "code",
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
        code: code
    };

    return new Promise((resolve, reject) => {
        request.post(url, {
            method: "POST",
            qs: napsterData
        }, function (error, response, body) {
            if (!error && response.statusCode === 200 && body) {
                resolve(JSON.parse(body));
            }
            reject(error);
        });
    });
}

function getUserDetails(accessToken) {

    var options = {
        method: 'GET',
        url: 'http://api.napster.com/v2.2/me/account',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        json: true
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (!error && response.statusCode === 200 && body) {
                resolve(body);
            }
            reject(error);
        });

    });
}


function createPlaylist(accessToken, name, isPublic = true) {
    const playlistOptions = {
        playlists: {
            "name": name,
            "privacy": isPublic ? 'public' : 'private',
        }
    };

    const options = {
        method: 'POST',
        url: 'https://api.napster.com/v2.2/me/library/playlists',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: playlistOptions,
        json: true
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (!error && response.statusCode === 201 && body) {
                resolve(body.playlists[0]);
            }
            reject(error);
        });

    });
}


function getNumberOfTracks(accessToken, playlistId) {
    const options = {
        method: 'GET',
        url: `https://api.napster.com/v2.2/me/library/playlists/${playlistId}`,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        json: true
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (!error && response.statusCode === 200 && body) {
                resolve(body.playlists[0].trackCount);
            }
            reject(error);
        });
    });
}


function searchSong(accessToken, artist, song) {
    var options = {
        method: 'GET',
        url: 'http://api.napster.com/v2.2/search/verbose',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        qs: {
            apikey: accessToken,
            query: song,
            type: 'track'
        },
        json: true
    };

    return new Promise((resolve, reject) => {
            request(options, function (error, response, body) {
                if (!error && response.statusCode === 200 && body) {
                    resolve(body.search.data.tracks);
                }
                reject(error);
            });
        })
        .then(songs => songs.filter(song => song.artistName.toLowerCase() === artist.toLowerCase()));
}

function addTrackToPlaylist(accessToken, playlistId, song) {
    if (song) {
        const songData = {
            "tracks": [{
                "id": song
            }]
        };

        const options = {
            method: 'POST',
            url: `https://api.napster.com/v2.2/me/library/playlists/${playlistId}/tracks`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: songData,
            json: true
        };

        return new Promise((resolve, reject) => {
            request(options, function (error, response, body) {
                if (!error && response.statusCode === 204) {
                    resolve(true);
                }
                reject(error);
            });
        });
    }
}

function NapsterPlaylist(name, tracksArray, isPublic) {

    app.get('/',
        passport.authenticate('oauth2', {
            showDialog: true,
        }),
        function (req, res) {}
    );

    app.get('/callback',
        function (req, res) {
            if (req.query.code) {
                getAccessToken(req.query.code)
                    .then(response => {
                        napsterConfig = { ...response
                        }
                    })
                    .then(() => getUserDetails(napsterConfig.access_token))
                    .then(profile => {
                        napsterConfig.profile = profile;
                    })
                    .then(() => createPlaylist(napsterConfig.access_token, name, isPublic))
                    .then(playlist => {
                        napsterConfig.playlistId = playlist.id;
                        tracksArray.map(track => {
                                return searchSong(napsterConfig.access_token, track.artist, track.title)
                                    .then(response => {
                                        return response.length > 1 ? response[0].id : null;
                                    })
                                    .then(song => addTrackToPlaylist(napsterConfig.access_token, napsterConfig.playlistId, song))
                                    .catch(error => console.log(error));
                                });
                        return true;
                    })
                    .then(() => `Playlist ${name} was created !`)
                    .then(message => {
                        return res.render('import-done.html', {
                            user: napsterConfig.profile.screenName,
                            message: message
                        })
                    })
                    .catch(error => console.log(error));
            }
        }
    );

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    app.listen(8883);
    open({
        target: 'http://localhost:8883/',
        fallback: true
    });
}

module.exports = NapsterPlaylist;