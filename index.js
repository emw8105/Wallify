const axios = require('axios')
const express = require('express')
require('dotenv').config();

let SpotifyWebApi = require('spotify-web-api-node')
const { getProfileData, getUserTracks } = require('./getProfile')

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

let spotify = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri
})

const scopes = [
  'user-top-read'
]
const app = express()

app.get('/login', (req, res) => {
  const authUrl = spotify.createAuthorizeURL(scopes)
  console.log('Generated Authorization URL:', authUrl);
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const data = new URLSearchParams({
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': redirectUri,
  });

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${authHeader}`,
  };

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', data, { headers });
    const access_token = response.data.access_token;
    const refresh_token = response.data.refresh_token;
    const expires_in = response.data.expires_in;

    console.log('access_token:', access_token);
    console.log('refresh_token:', refresh_token);

    console.log(`Successfully retrieved access token. Expires in ${expires_in} s.`);
    getProfileData(access_token)
    let topData = await getUserTracks(access_token, 0);
    topData += await getUserTracks(access_token, 50)
    console.log(topData.items[0].name)


    res.send('Success! You can now close the window.');

    setInterval(async () => {
      const refreshData = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
      }), { headers });

      const newAccessToken = refreshData.data.access_token;
      console.log('The access token has been refreshed!');
      console.log('access_token:', newAccessToken);
    }, expires_in / 2 * 1000);
  } catch (error) {
    console.error('Error getting Tokens:', error);
    res.send(`Error getting Tokens: ${error}`);
  }
});


app.listen(8888, () =>
  console.log(
    'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
  )
);

// USE THIS API:
// https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
// https://api.spotify.com/v1/me/top/{type}
// {type} is replaced by either 'artists' or 'tracks'
// params: time_range = short_term, medium_term, long_term --> limit = 0-50 --> offset = 0 to whatever