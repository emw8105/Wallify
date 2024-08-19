const express = require('express');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();
const cors = require('cors');
const app = express();
app.use(cors());

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

let spotify = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri
});

const scopes = ['user-top-read'];

// route for login, redirects to spotify login page
app.get('/login', (req, res) => {
  const authUrl = spotify.createAuthorizeURL(scopes);
  console.log('Generated Authorization URL:', authUrl);
  res.redirect(authUrl);
});

// route for callback, retrieves tokens and redirects back to React app
app.get('/callback', async (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  console.log('Authorization code:', code);
  if (!code) {
    console.error('Authorization code is missing');
    res.send('Authorization code is missing');
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

    // Redirect to React app with tokens as query parameters
    res.redirect(`http://localhost:3000?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error getting Tokens:', error.response ? error.response.data : error.message);
    res.send(`Error getting Tokens: ${error.response ? error.response.data : error.message}`);
  }
  
});

// route for getting user profile picture
app.get('/profile', async (req, res) => {
  console.log('GET /profile');
  const accessToken = req.headers.authorization.split(' ')[1];
  
  try {
    const spotify = new SpotifyWebApi();
    spotify.setAccessToken(accessToken);
    
    const profile = await spotify.getMe();
    const profilePictureUrl = profile.body.images?.[0]?.url; // Assuming the first image is the profile picture
    
    res.json({ profilePictureUrl });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Error fetching user profile');
  }
});

// route for getting top artists
app.get('/top-artists', async (req, res) => {
  console.log('GET /top-artists');
  const accessToken = req.headers.authorization.split(' ')[1];
  const { limit } = req.query; // Get the limit from the query params

  try {
    const topData = await getTopContent(accessToken, "artists", parseInt(limit, 10));
    res.json(topData); 
  } catch (error) {
    console.error('Error fetching top artists:', error);
    res.status(500).send('Error fetching top artists');
  }
});

// route for getting top artists
app.get('/top-tracks', async (req, res) => {
  console.log('GET /top-tracks');
  const accessToken = req.headers.authorization.split(' ')[1];
  const { limit } = req.query; // Get the limit from the query params

  try {
    const topData = await getTopContent(accessToken, "tracks", parseInt(limit, 10));
    res.json(topData);
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    res.status(500).send('Error fetching top tracks');
  }
});



// used to manage the api requests to get the top artists or tracks
const getTopContent = async (token, content, totalContent) => {
  const limit = 50;  // Spotify's API limit per request
  const requests = [];

  for (let offset = 0; offset < totalContent; offset += limit) {
    const requestLimit = Math.min(limit, totalContent - offset);
    requests.push(getUserContent(token, offset, requestLimit, content));
  }

  try {
    const results = await Promise.all(requests);
    const topContent = results.flat(); // Flatten the array of arrays into a single array
    return topContent.slice(0, totalContent); // Return only the exact number of items requested
  } catch (error) {
    console.error(`Error fetching top ${content}:`, error);
    throw error; // Rethrow the error if needed
  }
};

// function makes an api request to retrieve user content, either tracks or artists
const getUserContent = async (token, offset, limit, content) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/me/top/${content}`, {
      params: {
        limit,
        offset,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      maxBodyLength: Infinity,
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching user tracks:', error.response ? error.response.data : error.message);
    throw error; // Rethrow the error to handle it in the calling function
  }
};


app.listen(8888, () => {
  console.log('Server is running on http://localhost:8888');
});