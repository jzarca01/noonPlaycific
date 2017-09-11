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

const DeezerStrategy = require('passport-deezer').Strategy;
const config = require('../config/deezer.json');

const open = require('electron-open-url');

var deezerConfig = {
    accessToken: '',
    refreshToken: '',
    profile: {}
};

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

// Use the DeezerStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Deezer
//   profile), and invoke a callback with a user object.
passport.use(new DeezerStrategy({
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.redirectUri,
        scope: ['basic_access', 'email', 'manage_library']
    },
    function (accessToken, refreshToken, profile, done) {
        deezerConfig.accessToken = accessToken,
            deezerConfig.profile = profile;

        process.nextTick(function () {
            return done(null, profile);
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


// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
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


function createPlaylist(accessToken, name, isPublic = true) {
    const url = util.format('http://api.deezer.com/user/me/playlists?access_token=%s&title=%s&public=%s', accessToken, name, isPublic);

    return new Promise((resolve, reject) => {
        request.post(url, {
            method: "POST"
        }, function (error, response, body) {
            if (!error && response.statusCode === 200 && body)
                resolve(JSON.parse(body));

            reject(error);
        });
    });
}


function getNumberOfTracks(accessToken, playlistId) {
    const url = util.format(`http://api.deezer.com/playlist/${playlistId}/?access_token=%s`, accessToken);
    
    return new Promise((resolve, reject) => {
        request.get(url, {
            method: "GET"
        }, function (error, response, body) {
            if (!error && response.statusCode === 200 && body) {
            console.log(JSON.parse(body));
                resolve(JSON.parse(body));
        }
            reject(error);
        });
    });
}


function searchSong(accessToken, artist, song) {
    const url = util.format('http://api.deezer.com/search?access_token=%s&q=track:"%s"', accessToken, song);

    return new Promise((resolve, reject) => {
            request.get(url, {
                method: "GET"
            }, function (error, response, body) {
                if (!error && response.statusCode === 200 && body)
                    resolve(JSON.parse(body).data);

                reject(error);
            });
        })
        .then(songs => songs.filter(song => song.artist.name.toLowerCase() === artist.toLowerCase()));
}

function addTrackToPlaylist(accessToken, playlistId, song) {
    if (song) {
        const url = util.format(`http://api.deezer.com/playlist/${playlistId}/tracks?access_token=%s&songs=%s`, accessToken, song);

        return new Promise((resolve, reject) => {
            request.post(url, {
                method: "POST"
            }, function (error, response, body) {
                if (!error && response.statusCode === 200 && body)
                    resolve(JSON.parse(body));

                reject(error);
            });
        });
    }
}

function DeezerPlaylist(name, tracksArray, isPublic) {

    app.get('/',
        passport.authenticate('deezer', {
            scope: config.scope,
            showDialog: true
        }),
        function (req, res) {}
    );

    app.get('/callback',
        passport.authenticate('deezer', {
            scope: config.scope,
            failureRedirect: '/logout'
        }),
        function (req, res) {
            return createPlaylist(deezerConfig.accessToken, name, isPublic)
                .then(response => response.id)
                .then(playlistId => {
                    tracksArray.map(track => {
                    searchSong(deezerConfig.accessToken, track.artist, track.title)
                        .then(response => {
                            return response[0] ? response[0].id : null;
                        })
                        .then(songId => addTrackToPlaylist(deezerConfig.accessToken, playlistId, songId))
                        .catch(error => console.log(error));
                    });
                    return playlistId;
                })
                .then(() => `Playlist ${name} was created !`)
                .then(message => {
                    return res.render('import-done.html', { user: req.user.displayName, message: message }) })
                .catch(error => console.log(error));
        }
    );

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    app.listen(8888);
    open({
        target: 'http://localhost:8888/',
        fallback: true
      });
}

module.exports = DeezerPlaylist;