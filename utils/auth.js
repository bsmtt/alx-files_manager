import sha1 from "sha1";
import { ObjectId } from "mongodb";
import dbClient from "./db";
import redisClient from "./redis";

export const getUser = async (req) => {
  const Authorization = req.header("Authorization") || "";
  const credentials = Authorization.split(" ")[1];

  if (!credentials) return null;

  const decodedCredentials = Buffer.from(credentials, "base64").toString(
    "utf-8"
  );

  const [email, password] = decodedCredentials.split(":");

  if (!email || !password) return null;

  const user = await dbClient.db.collection("users").findOne({ email });

  if (!user || sha1(password) !== user.password) return null;

  return user;
};

export const getUserByToken = async (req) => {
  const token = req.headers["x-token"];
  if (!token) return null;
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return null;

  const user = await dbClient.db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  return user;
};

export default {
  getUser: async (req) => getUser(req),
  getUserByToken: async (req) => getUserByToken(req),
};
