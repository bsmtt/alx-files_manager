import { ObjectId } from "mongodb";
import Queue from "bull";
import { v4 } from "uuid";
import { promises as fs } from "fs";
import { getUserByToken } from "../utils/auth";
import dbClient from "../utils/db";

const fileQueue = new Queue("fileQueue");
export default class FilesController {
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  static async postUpload(req, res) {
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
        return res.status(400).json({ error: "Parent not found" });
      }
      if (file.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" });
      }
    }

    try {
      if (type === "folder") {
        const fileData = await files.insertOne({
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic: isPublic || false,
        });

        return res.status(200).json({
          id: fileData.insertedId,
          userId: user._id,
          name,
          type,
          isPublic: isPublic || false,
          parentId: parentId || 0,
        });
      }
      const filePath =
        process.env.FOLDER_PATH || `${__dirname}/tmp/files_manager`;
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
        parentId: parentId || 0,
        isPublic: isPublic || false,
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
        isPublic: isPublic || false,
        parentId: parentId || 0,
      });
    } catch (e) {
      console.log(e);
      return e;
    }
  }

  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  static async getShow(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const files = dbClient.db.collection("files");
    const file = await files.findOne({
      _id: new ObjectId(req.params.id),
      userId: user._id,
    });
    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json(file);
  }

  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  static async getIndex(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const parentId = req.query.parentId || 0;
    const page = req.query.page ? Number.parseInt(req.query.page, 10) : 0;
    console.log(page);
    const query = {
      userId: user._id,
      parentId: parentId === 0 ? parentId : new ObjectId(parentId),
    };
    const pipeline = [
      { $match: query },
      { $sort: { _id: -1 } },
      { $skip: page * 20 },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          id: "$_id",
          userId: "$userId",
          name: "$name",
          type: "$type",
          isPublic: "$isPublic",
          parentId: {
            $cond: {
              if: { $eq: ["$parentId", "0"] },
              then: 0,
              else: "$parentId",
            },
          },
        },
      },
    ];
    console.log(query);
    const filesCollection = dbClient.db.collection("files");
    const data = await filesCollection.aggregate(pipeline).toArray();
    return res.status(200).json(data);
  }

  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  static async putPublish(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const userId = user._id.toString();
    const query = {
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    };
    const filesCollection = dbClient.db.collection("files");
    const file = await filesCollection.findOne(query);

    if (!file) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await filesCollection.updateOne(query, { $set: { isPublic: true } });
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId:
        file.parentId === ROOT_FOLDER_ID.toString()
          ? 0
          : file.parentId.toString(),
    });
  }

  static async putUnpublish(req, res) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      req,
      false
    );

    if (error) return res.status(code).send({ error });

    return res.status(code).send(updatedFile);
  }

  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  static async putUnpublish(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const files = dbClient.db.collection("files");
    const idObject = new ObjectID(id);
    const newValue = { $set: { isPublic: false } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate(
      { _id: idObject, userId: user._id },
      newValue,
      options,
      (err, file) => {
        if (!file.lastErrorObject.updatedExisting) {
          return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json(file.value);
      }
    );
    return null;
  }

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   * @returns 
   */
  static async getFile(req, res) {
    const user = await getUserByToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const filesCollection = dbClient.db.collection("files");
    const { id } = req.params;
    const size = req.query.size || null;
    const userId = user ? user._id.toString() : "";
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(id),
    };
    const file = await filesCollection.findOne(fileFilter);

    if (!file || (!file.isPublic && file.userId.toString() !== userId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (file.type === 'folder') {
      res.status(400).json({ error: "A folder doesn't have content" });
      return;
    }
    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }
    if (existsSync(filePath)) {
      const fileInfo = await statAsync(filePath);
      if (!fileInfo.isFile()) {
        res.status(404).json({ error: "Not found" });
        return;
      }
    } else {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const absoluteFilePath = await realpathAsync(filePath);
    res.setHeader(
      "Content-Type",
      contentType(file.name) || "text/plain; charset=utf-8"
    );
    res.status(200).sendFile(absoluteFilePath);
  }
}
