import { MongoClient } from "mongodb";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || "files_manager";


class DBClient {
  constructor() {
    const url = `mongodb://${DB_HOST}:${DB_PORT}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect();
    this.db = this.client.db(DB_DATABASE);
  }

  /**
   * Checks if connection is Alive
   * @return {boolean} true if connection alive or false if not
   */
  isAlive() {
    return this.client.topology.isConnected();
  }

  /**
   * Returns the count in the collection users
   * @return {number} amount of users
   */
  async nbUsers() {
    return this.db.collection("users").countDocuments();
  }

  /**
   * Returns the count the collection files
   * @return {number} amount of files
   */
  async nbFiles() {
    return this.db.collection("files").countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
