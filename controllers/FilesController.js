import { ObjectId } from "mongodb";
import mime from "mime-types";
import Queue from "bull";
import { getUserByToken } from "../utils/auth";
import dbClient from "../utils/db";
import { v4 } from "uuid";
import { promises as fs } from "fs";

const FOLDER_PATH = process.env.FOLDER_PATH || "/tmp/files_manager";

const fileQueue = new Queue("fileQueue");

export default class FilesController {
  static async postUpload(req, res) {
    console.log(req.body);
    const { name, type, parentId, isPublic, data } = req.body;
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }
    if (!type) {
      return res.status(400).json({ error: "Missing type" });
    }
    if (type !== "folder" && !data) {
      return res.status(400).json({ error: "Missing data" });
    }

    const files = dbClient.db.collection("files");
    if (parentId) {
      const idObject = new ObjectId(parentId);
      const file = await files.findOne({ _id: idObject, userId: user._id });
      if (!file) {
        return response.status(400).json({ error: "Parent not found" });
      }
      if (file.type !== "folder") {
        return response.status(400).json({ error: "Parent is not a folder" });
      }
    }

    try {
      if (type === "folder") {
        const fileData = await files.insertOne({
          userId: user._id,
          name,
          type,
          parentId: parentId ?? 0,
          isPublic: isPublic ?? false,
        });

        return res.status(200).json({
          id: fileData.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: isPublic ?? false,
          parentId: parentId ?? 0, 
        });
      } else {
        const filePath =
          process.env.FOLDER_PATH || __dirname + "/tmp/files_manager";
        const fileName = `${filePath}/${v4()}`;
        const buff = Buffer.from(data, "base64");
        try {
          await fs.mkdir(filePath, { recursive: true });
          await fs.writeFile(fileName, buff, "utf-8");
        } catch (err) {
          console.log(err.message);
          return { error: err.message, code: 400 };
        }
        const fileData = await files.insertOne({
          userId: user._id,
          name,
          type,
          parentId: parentId ?? 0,
          isPublic: isPublic ?? false,
          localPath: fileName,
        });
        if (type === "image") {
          await fileQueue.add({
            userId: user._id,
            fileId: fileData.insertedId,
          });
        }
        return res.status(200).json({
          id: fileData.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: isPublic ?? false,
          parentId: parentId ?? 0,
        });
      }
    } catch (e) {
      console.log(e);
      return e;
    }
  }
}
