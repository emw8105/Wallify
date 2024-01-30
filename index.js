const axios = require('axios')
const express = require('express')
require('dotenv').config();

let SpotifyWebApi = require('spotify-web-api-node')
const { getProfileData, getUserTracks, getTopArtists } = require('./utilities')

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
    const response = await axios.post('https://accounts.spotify.com/api/token', data, { headers })
    const access_token = response.data.access_token;
    const refresh_token = response.data.refresh_token;
    const expires_in = response.data.expires_in;

    console.log('access_token:', access_token)
    console.log('refresh_token:', refresh_token)

    console.log(`Successfully retrieved access token. Expires in ${expires_in} s.`)

    // these requests are perfectly fine (up to 49 to prevent duplicate)
    let topData = await getTopArtists(access_token)
    //topData.concat(await getUserTracks(access_token, 49, 50))

    // these requests return nothing because for some reason any thing that requests artist #100+ returns nothing at all
    //const temp = await getUserTracks(access_token, 99, 1);
    //const temp2 = await getUserTracks(access_token, 150, 1);
    //console.log(JSON.stringify(topData))
    const artistNames = topData.map(artist => artist.name)
    //const nextNames = nextData.map(artist => artist.name)
    console.log(artistNames)
    //console.log(nextNames)
    //console.log(artistNames)
    console.log(`NUMBER OF ARTISTS RETURNED: ${topData.length}`)
    //console.log(`NUMBER OF ARTISTS RETURNED: ${nextData.length}`)


    // PUT REACT COMPONENTS TO BUILD A VISUAL USING THE ARTIST IMAGES
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