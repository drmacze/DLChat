import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const SUPABASE_STORAGE_BUCKET = process.env["SUPABASE_STORAGE_BUCKET"] || "dlavie-chat";

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw {
      status: 503,
      message:
        "Storage provider is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
      code: "STORAGE_NOT_CONFIGURED",
    };
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<string> {
  const client = getSupabaseClient();
  const path = `${folder}/${Date.now()}-${fileName}`;

  const { error } = await client.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw {
      status: 500,
      message: `Storage upload failed: ${error.message}`,
      code: "STORAGE_UPLOAD_FAILED",
    };
  }

  const { data } = client.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
