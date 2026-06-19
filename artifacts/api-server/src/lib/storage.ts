import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getPublicBucketAndPrefix(): { bucketName: string; prefix: string } {
  const searchPaths = process.env["PUBLIC_OBJECT_SEARCH_PATHS"];
  if (!searchPaths) {
    throw {
      status: 503,
      message:
        "Storage provider is not configured. Please provision Replit Object Storage (PUBLIC_OBJECT_SEARCH_PATHS not set).",
      code: "STORAGE_NOT_CONFIGURED",
    };
  }
  const firstPath = searchPaths.split(",")[0].trim();
  const parts = firstPath.replace(/^\//, "").split("/");
  const bucketName = parts[0];
  const prefix = parts.slice(1).join("/");
  return { bucketName, prefix };
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<string> {
  const { bucketName, prefix } = getPublicBucketAndPrefix();
  const basePath = prefix ? `${prefix}/${folder}` : folder;
  const objectName = `${basePath}/${Date.now()}-${randomUUID()}-${fileName}`;
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}
