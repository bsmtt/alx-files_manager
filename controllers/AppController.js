import redisClient from "../utils/redis";
import dbClient from "../utils/db";

export default class AppController {
  /**
   *
   * @param {Express.Request} req
   * @param {Express.Response} res
   */
  static getStatus(req, res) {
    const [redis, db] = [redisClient.isAlive(), dbClient.isAlive()];

    res.status(200).json({ redis, db });
  }

  /**
   *
   * @param {Express.Request} req
   * @param {Express.Response} res
   */
  static async getStats(req, res) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbUsers();

    res.status(200).json({ users, files });
  }
}
