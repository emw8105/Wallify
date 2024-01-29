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
// by default is medium term
const getUserTracks = async(token, offset, limit) => {
  let res = await axios({
    method: 'get',
    maxBodyLength: Infinity,
    url: `https:api.spotify.com/v1/me/top/artists?limit=${limit}&offset=${offset}`,
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  })
  .then((response) => {
    console.log("REQUESTING")
    console.log(JSON.stringify(response.data)); // this line prints the response correctly
    return response.data.items;
  })
  .catch((error) => {
    console.log(error);
  });

  return res
}

const getTopArtists = async (token, limit) => {
  const requests = [];
  let totalArtists = [];
  let offset = 0;

  // Make multiple requests until you reach the desired limit
  while (totalArtists.length < limit) {
    console.log(`getting tracks from ${offset} to ${offset + 50}`);
    const currentData = await getUserTracks(token, limit - totalArtists.length, offset);

    // Check if 'currentData' is defined before accessing 'items'
    const items = currentData || [];
    totalArtists = totalArtists.concat(items);

    offset += 50;
  }

  // Return only the desired number of artists
  return totalArtists.slice(0, limit);
};

module.exports = {
    getProfileData,
    getUserTracks,
    getTopArtists
}