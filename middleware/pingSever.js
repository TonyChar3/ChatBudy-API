import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const pingServer = () => {
    console.log(`Pinging ${process.env.HOST_NAME}`);
    axios.get(process.env.HOST_NAME)
    .then(response => {
        console.log('Server pinged successfully');
      })
    .catch(error => {
        console.error('Error pinging server: ', error.message);
    });
};