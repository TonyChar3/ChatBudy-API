import https from 'https';

/**
 * Function to check the url validity from a user who wants to register to the app
 */
const checkUrlValidity = (website_url) => {
    return new Promise ((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
              resolve("The URL is valid and reachable.");
            } else {
              resolve(`Received non-OK status code: ${res.statusCode}`);
            }
          }).on('error', (e) => {
            reject(`An error occurred: ${e.message}`);
          });
    })
}

export { checkUrlValidity }