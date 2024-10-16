import { createClient } from "redis";
import { promisify } from "util";

class RedisClient {
  constructor() {
    this.client = createClient();
    this.isConnected = true;

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on("error", (e) => {
      console.log(`Redis client not connected to server: ${e}`);
      this.isConnected = false;
    });
  }

  /**
   * is redis live
   * @returns {bool}
   */
  isAlive() {
    return this.isConnected;
  }

  /**
   * 
   * @param {string} key 
   * @returns {*}
   */
  async get(key) {
    return promisify(this.client.get).bind(this.client)(key);
  }

  /**
   * 
   * @param {string} key 
   * @param {*} value 
   * @param {*} duration 
   */
  async set(key, value, duration) {
    await promisify(this.client.setex).bind(this.client)(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
