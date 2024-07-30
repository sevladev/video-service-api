import express, { Request, Response } from "express";
import AWS from "aws-sdk";
import multer from "multer";
import path from "path";
import stream from "stream";
import { v4 } from "uuid";
import cors from "cors";

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  const referrer = req.get("Referrer");
  if (referrer && referrer.startsWith("http://localhost:3000")) {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
});

const s3 = new AWS.S3({
  endpoint: process.env.AWS_S3_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3ForcePathStyle: true,
});

const bucketName = "my-development-bucket";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    console.error("No file uploaded");
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileStream = new stream.PassThrough();
  fileStream.end(req.file.buffer);

  const fileSize = req.file.size;
  const key = v4() + path.extname(req.file.originalname);

  const uploadParams: AWS.S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: req.file.mimetype,
  };

  const managedUpload = s3.upload(uploadParams);

  managedUpload.on("httpUploadProgress", (progress) => {
    const loaded = progress.loaded;
    const percentage = Math.round((loaded / fileSize) * 100);
    console.log(`Uploaded ${loaded} bytes (${percentage}%)`);
  });

  managedUpload.send((err, data) => {
    if (err) {
      const awsError = err as AWS.AWSError;
      console.error("Upload error:", awsError);
      return res
        .status(500)
        .json({ message: awsError.message, code: awsError.code });
    }
    return res.json({
      message: "Upload successful",
      data: data,
      key,
    });
  });
});

app.get("/video/:key", (req: Request, res: Response) => {
  const { key } = req.params;

  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucketName,
    Key: key,
  };

  s3.headObject(params, (err, data) => {
    if (err) {
      const awsError = err as AWS.AWSError;
      console.error("HeadObject error:", awsError);
      return res
        .status(500)
        .json({ message: awsError.message, code: awsError.code });
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send("Range not satisfiable");
    }

    const fileSize = data.ContentLength!;
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    const streamParams = {
      Bucket: bucketName,
      Key: key,
      Range: `bytes=${start}-${end}`,
    };

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept, pragma, cache-control, Referrer-Policy",
    });

    const videoStream = s3.getObject(streamParams).createReadStream();
    videoStream.pipe(res);
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
