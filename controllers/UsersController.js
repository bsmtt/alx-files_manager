import { ObjectId } from "mongodb";
import sha1 from "sha1";
import Queue from "bull";
import dbClient from "../utils/db";
import { getUserByToken } from "../utils/auth";

const userQueue = new Queue("userQueue");

export default class UsersController {
  /**
   *  Crete new user
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @returns {JSON}
   */
  static async postNew(req, res) {
    const { email, password } = req.body;
    const collection = dbClient.db.collection("users");

    if (!email) return res.status(400).send({ error: "Missing email" });

    if (!password) return res.status(400).send({ error: "Missing password" });

    const emailExists = await collection.findOne({ email });

    if (emailExists) return res.status(400).send({ error: "Already exist" });

    try {
      const user = await collection.insertOne({
        email,
        password: sha1(password),
      });

      await userQueue.add({ userId: user.insertedId.toString() });
      return res.status(201).send({
        id: user.insertedId,
        email,
      });
    } catch (err) {
      await userQueue.add({});
      return res.status(500).send({ error: "Error creating user." });
    }
  }

  static async getMe(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
