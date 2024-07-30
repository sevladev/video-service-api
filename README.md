Express Video Upload and Streaming Service

This project is an Express.js server that enables video file uploads to an AWS S3 bucket and allows streaming of uploaded videos. It uses AWS SDK, Multer for file handling, and CORS for cross-origin requests.

Features

    •	Upload video files to AWS S3
    •	Stream video files from AWS S3 with byte-range support

Requirements

    •	Node.js
    •	Docker

Setup

1 - Clone the repository:

```sh
git clone https://github.com/sevladev/video-service-api.git

cd video-service-api
```

2 - Setup Docker:

```sh
docker-compose up --build
```

The server will run on http://localhost:3000.

API Endpoints

Upload Video

Endpoint: POST /upload

Description: Upload a video file to the S3 bucket.

Request:

- file: Video file to be uploaded (multipart/form-data)

Response:

```json
{
  "message": "Upload successful",
  "key": "2e7f007b-bd77-4550-a593-99f97d3d63f9.mp4"
}
```

Stream Video

Endpoint: GET /video/:key

Description: Stream a video file from the S3 bucket using byte-range requests.

Request Headers:

- Range: Byte range for video streaming (e.g., bytes=0-)
