/**
 * Utility for fast client-side image processing to optimize uploads.
 * Uses hardware-accelerated createImageBitmap for maximum speed.
 */
export async function compressAndResizeImage(file: File, maxWidth = 300, maxHeight = 300): Promise<Blob> {
  // Use modern, faster decoding
  const bitmap = await createImageBitmap(file);
  
  const canvas = document.createElement('canvas');
  let { width, height } = bitmap;

  // Calculate new dimensions maintain aspect ratio
  if (width > height) {
    if (width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low'; // High performance setting
    ctx.drawImage(bitmap, 0, 0, width, height);
  }
  
  // Clean up bitmap reference
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Fast compression failed'));
        }
      },
      'image/jpeg',
      0.6 // Balanced quality for speed and size
    );
  });
}
