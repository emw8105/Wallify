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

const getTopArtists = async (token) => {
  const requests = [];

  requests.push(getUserTracks(token, 0, 49))
  requests.push(getUserTracks(token, 49, 50))

  try {
    const results = await Promise.all(requests);
    // Concatenate the arrays
    const topArtists = results.flat();

    return topArtists // Return only the desired number of artists
  } catch (error) {
    console.error(error);
    throw error; // Rethrow the error if needed
  }
};

module.exports = {
    getProfileData,
    getUserTracks,
    getTopArtists
}