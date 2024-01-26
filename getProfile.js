const fs = require('fs')
const SpotifyWebApi = require('spotify-web-api-node');

function getProfileData(token) {
  (async () => {

    const spotify = new SpotifyWebApi();
    spotify.setAccessToken(token);

    const profile = await spotify.getMe();
    console.log(profile.body);
    getUserPlaylists(profile.body.id);
  })().catch(e => {
    console.error(e);
  });
}

module.exports = {
    getProfileData
}