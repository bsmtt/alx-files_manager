import { v4 } from "uuid";
import { getUser, getUserByToken } from "../utils/auth";
import redisClient from "../utils/redis";

export default class AuthController {
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  static async getConnect(req, res) {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = v4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

    res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const xtoken = req.headers["x-token"];
    await redisClient.del(`auth_${xtoken}`);

    res.status(204).send();
  }
}
