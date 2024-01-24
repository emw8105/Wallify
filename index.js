const axios = require('axios')
const express = require('express');
const app = express();

console.log('running')

const getToken = async() => {
    let res = await axios.post({
        url: "https://accounts.spotify.com/api/token",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
    })
    .then(response => {
      console.log(response.data)
      return response.data
    })
    // .catch(async err => {
    //   if (err.response && err.response.status && err.response.status === 401 && retry < 3) {
    //       console.error("Unauthorized: retrieving new token and retrying")
    //       cachedAzureSecrets.Token = getNewAzureToken(cachedAzureSecrets)
    //       return await updateRecord(req, cachedAzureSecrets.Token, ++retry)
    //   }
    //   if (err.response && err.response.status && err.response.status === 400) {
    //       return err.response.data
    //   }
    //   if (retry >= 3) {
    //     console.error("Call failing after multiple token retries: stopping process")
    //   }
    //   console.error(err)
    //   return err
    // })
  return res
}



let cachedToken
if (!cachedToken)
    cachedToken = getToken()

// const getTotalPlayers = async() => { // gets the current total player count to iterate until to print the whole leaderboard
//     return await axios.get(`https://devildaggers.info/api/leaderboards?rankStart=1`).then(response => { return response.data.totalPlayers})}

// (async () => {
//     let start = 1, urls = [], end = 10000, playerCount = await getTotalPlayers()
//     console.log(`Total players: ${playerCount}`)
//     while(end <= playerCount) { // server doesnt like thousands of simultaneous requests, have to send chunks of requests
//         while(start < end) {urls.push(`https://devildaggers.info/api/leaderboards?rankStart=${start}`), start+=100} // push next 100 URL requests onto array representing next 10000 players
//         const requests = urls.map((url) => axios.get(url)); // map url requests to axios.get so requests can be made simultaneously with axios.all
//         let res = await axios.all(requests)
//         res.forEach(response => { // loop through JSON response and print entry information to populate the leaderboard
//             response.data.entries.forEach(entry => {
//             console.log(`Rank: ${entry.rank}\nid: ${entry.id}\nTime: ${entry.time}\nDeath Type: ${entry.deathType}\n\n`)
//             })
//         })
//         end += 10000, urls = [] // update to get next 10000 players
//     }
// })()