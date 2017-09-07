const SpotifyWebApi = require('spotify-web-api-node');

var scopes = ["playlist-modify-public", "playlist-modify-private", "playlist-read-private", "user-library-read", "user-read-private"],
    redirectUri = 'http://localhost:3000/callback',
    clientId = 'b5a536dd66f74bbb861f3d32f81c7de7',
    state = 'some-state-of-my-choice';

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
  redirectUri : redirectUri,
  clientId : clientId
});

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

// https://accounts.spotify.com:443/authorize?client_id=5fe01282e44241328a84e7c5cc169165&response_type=code&redirect_uri=https://example.com/callback&scope=user-read-private%20user-read-email&state=some-state-of-my-choice
console.log(authorizeURL);