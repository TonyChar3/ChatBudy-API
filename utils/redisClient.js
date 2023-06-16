import redis from 'redis';
import { promisify } from 'util';
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

const cacheObject = async(key, value) => {
    
    try{
        const connected = await client.connect();
        if(connected){

            const cached = await setAsync(key, JSON.stringify(value));
            if(cached){
                console.log('Object cached successfully');
            }
        }

    } catch(err) {
        console.log('Redis cache error: ', err)
    } finally {
        client.quit()
    }
}

export { cacheObject }