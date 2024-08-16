import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TopArtists = ({ accessToken, refreshToken, expiresIn }) => {
    // const [artists, setArtists] = useState([]);
  
    // useEffect(() => {
    //   const fetchTopArtists = async () => {
    //     try {
    //       console.log(`Successfully retrieved access token. Expires in ${expiresIn} s.`);
  
    //       let topData = await getTopArtists(accessToken);
  
    //       const artistNames = topData.map(artist => artist.name);
    //       console.log(artistNames);
    //       console.log(`NUMBER OF ARTISTS RETURNED: ${topData.length}`);
  
    //       setArtists(topData);
  
    //       setInterval(async () => {
    //         const refreshData = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
    //           'grant_type': 'refresh_token',
    //           'refresh_token': refreshToken,
    //         }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  
    //         const newAccessToken = refreshData.data.access_token;
    //         console.log('The access token has been refreshed!');
    //         console.log('access_token:', newAccessToken);
    //       }, expiresIn / 2 * 1000);
    //     } catch (error) {
    //       console.error('Error getting Tokens:', error);
    //     }
    //   };
  
    //   fetchTopArtists();
    // }, [accessToken, refreshToken, expiresIn]);
};

export default TopArtists;