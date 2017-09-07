const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const swig = require('swig');
const consolidate = require('consolidate');

const SpotifyStrategy = require('passport-spotify').Strategy;
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('../config/spotify.json');

const open = require('electron-open-url');

const spotifyApi = new SpotifyWebApi({
  redirectUri: config.redirectUri,
  clientId: config.clientId,
  clientSecret: config.clientSecret
});



passport.use(new SpotifyStrategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.redirectUri
  },
  function (accessToken, refreshToken, profile, done) {
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);
    process.nextTick(function () {
      return done(null, profile);
    });
  }));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});



const app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));

app.engine('html', consolidate.swig);


function importTracks(user, name, tracks, isPublic = true) {
  console.log("tracks", tracks);
  return spotifyApi.createPlaylist(user.id, name, {
      'public': isPublic
    })
    .then(data => {
      //console.log('Created playlist!');
      return data.body.id;
    })
    .then(playlistId => {
      //console.log("playlistId ", playlistId);
      return spotifyApi.addTracksToPlaylist(user.id, playlistId, tracks);
    })
    .then(function (data) {
      //console.log('Added tracks to playlist!');
      return `${tracks.length} tracks were added to the playlist ${name} !`;
    })
    .catch(err => {
      //console.log('Something went wrong!', err);
      return `Oops... Something went wrong : ${err}`;
    });

}

function SpotifyPlaylist(name, tracksArray, isPublic) {
  app.get('/',
    passport.authenticate('spotify', {
      scope: config.scope,
      showDialog: true
    }),
    function (req, res) {}
  );

  app.get('/callback',
    passport.authenticate('spotify', {
      failureRedirect: '/logout'
    }),
    function (req, res) {
      importTracks(req.user, name, tracksArray, isPublic)
        .then(message => res.render('import-done.html', { user: req.user, message: message }) )
    }
  );

  app.get('/logout', function (req, res) {
    req.logout();
  });

  app.listen(8888);
  open({
    target: 'http://localhost:8888/',
    fallback: true
  });
}

module.exports = SpotifyPlaylist;