// ImgBB image upload helper — used by the Institute Logo uploader.
// Uploads an image file to ImgBB and returns the public image URL.
//
// Note: ImgBB blocks requests from datacenter/automation IPs (error 103,
// "You have been forbidden to use this website"), so uploads are expected
// to run from the end-user's browser (home/office IP), not from CI/servers.

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload'

// ImgBB API key. For production you may prefer an env var, e.g.
// const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY
const IMGBB_API_KEY = 'e2cd43c2eeaf055bdb644ba84ea202dd'

export const LOGO_MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Validate a candidate logo file; returns an error message or null. */
export function validateLogoFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Only PNG, JPG, WEBP or GIF images are allowed'
  }
  if (file.size > LOGO_MAX_SIZE_MB * 1024 * 1024) {
    return `Image must be ${LOGO_MAX_SIZE_MB} MB or smaller`
  }
  return null
}

/** Upload an image file to ImgBB; resolves to the public image URL. */
export async function uploadToImgbb(file: File): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  form.append('key', IMGBB_API_KEY)

  const res = await fetch(IMGBB_API_URL, { method: 'POST', body: form })
  if (!res.ok) {
    let message = `Upload failed (HTTP ${res.status})`
    try {
      const data = (await res.json()) as { error?: { message?: string } }
      if (data.error?.message) message = data.error.message
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(message)
  }

  const data = (await res.json()) as {
    data?: { url?: string; display_url?: string }
  }
  const url = data.data?.url ?? data.data?.display_url
  if (!url) throw new Error('Upload failed: no image URL returned')
  return url
}
