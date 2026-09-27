/**
 * A picture ready to upload as a cover: at most `maxWidth` px wide, re-encoded
 * as WebP (JPEG where the browser cannot write WebP). Re-encoding also drops
 * the file's metadata, such as where a photo was taken.
 */
export async function toCoverImage(file: File, maxWidth = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  const webp = await encode('image/webp')
  if (webp?.type === 'image/webp') return webp
  // JPEG has no transparency: put a white sheet behind the picture first.
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const jpeg = await encode('image/jpeg')
  if (!jpeg) throw new Error('Could not encode the image')
  return jpeg
}
