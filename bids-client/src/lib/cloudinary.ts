const CLOUDINARY_CLOUD_NAME = "dawc0rbyi";
const CLOUDINARY_UPLOAD_PRESET = "winit_unsigned_preset";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Uploads an image file directly to Cloudinary using an unsigned upload preset.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = "Image upload failed.";

    try {
      const parsed = JSON.parse(errorBody);
      message = parsed?.error?.message ?? message;
    } catch {
      // ignore parse errors
    }

    throw new Error(message);
  }

  const data = await response.json();
  return data.secure_url as string;
}
