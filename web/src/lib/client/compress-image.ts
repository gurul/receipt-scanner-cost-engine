const MAX_DIMENSION = 1568;
const TARGET_BYTES = 3_300_000;
const MAX_SOURCE_BYTES = 30_000_000;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export async function compressReceiptImage(file: File): Promise<File> {
  if (file.type === "image/gif" && file.size <= TARGET_BYTES) return file;
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("This photo is too large. Choose an image smaller than 30 MB.");
  }

  const decoded = await decodeImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(decoded.width, decoded.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    decoded.close();
    throw new Error("This browser cannot prepare receipt images");
  }
  context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  decoded.close();

  for (const quality of [0.84, 0.72, 0.6, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && (blob.size <= TARGET_BYTES || quality === 0.5)) {
      if (blob.size > TARGET_BYTES) throw new Error("This image is still too large after compression");
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }
  throw new Error("Could not prepare this receipt image");
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Older iOS versions need the HTMLImageElement path below.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error(
      "This photo format is not supported by your browser. Try a screenshot or a JPEG image.",
    );
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}
