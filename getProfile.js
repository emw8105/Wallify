const axios = require('axios')
const SpotifyWebApi = require('spotify-web-api-node');

function getProfileData(token) {
  (async () => {

    const spotify = new SpotifyWebApi();
    spotify.setAccessToken(token);

    const profile = await spotify.getMe();
    console.log(profile.body);
  })().catch(e => {
    console.error(e);
  });
}

// https://api.spotify.com/v1/me/top/{type}
// {type} is replaced by either 'artists' or 'tracks'
// params: time_range = short_term, medium_term, long_term --> limit = 0-50 --> offset = 0 to whatever
const getUserTracks = async(token, offset) => {
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https:api.spotify.com/v1/me/top/artists?limit=50&offset=${offset}`,
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  };
  
  axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
    return response.data;
  })
  .catch((error) => {
    console.log(error);
  });

}

module.exports = {
    getProfileData,
    getUserTracks
}