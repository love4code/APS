const sharp = require('sharp')
const fs = require('fs')

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 200, height: 200, quality: 80 },
  medium: { width: 800, height: 800, quality: 85 },
  large: { width: 1920, height: 1920, quality: 90 }
}

/**
 * Process image and return buffers for database storage
 * @param {Buffer|string} imagePath - Path to the uploaded image file or Buffer
 * @param {string} jobId - Job ID (for logging purposes)
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} Object with image buffers and sizes
 */
async function processJobImage (imagePath, jobId, originalFilename) {
  // Read original file to get size
  let originalBuffer
  if (Buffer.isBuffer(imagePath)) {
    originalBuffer = imagePath
  } else {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`)
    }
    originalBuffer = fs.readFileSync(imagePath)
  }
  const originalSize = originalBuffer.length

  const results = {
    thumbnailData: null,
    mediumData: null,
    largeData: null,
    thumbnailSize: 0,
    mediumSize: 0,
    largeSize: 0
  }

  try {
    // Process thumbnail (200x200) - auto-rotate based on EXIF
    const thumbnailBuffer = await sharp(originalBuffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_SIZES.thumbnail.quality, mozjpeg: true })
      .toBuffer()
    results.thumbnailData = thumbnailBuffer
    results.thumbnailSize = thumbnailBuffer.length

    // Process medium (800x800) - auto-rotate based on EXIF
    const mediumBuffer = await sharp(originalBuffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_SIZES.medium.quality, mozjpeg: true })
      .toBuffer()
    results.mediumData = mediumBuffer
    results.mediumSize = mediumBuffer.length

    // Process large (1920x1920) - auto-rotate based on EXIF
    const largeBuffer = await sharp(originalBuffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_SIZES.large.quality, mozjpeg: true })
      .toBuffer()
    results.largeData = largeBuffer
    results.largeSize = largeBuffer.length
  } catch (error) {
    console.error(
      `[Image Service] Error processing image ${originalFilename}:`,
      error
    )
    throw new Error(`Failed to process image: ${error.message}`)
  }

  // Delete temporary uploaded file if it was a file path (not a buffer)
  if (typeof imagePath === 'string' && fs.existsSync(imagePath)) {
    try {
      fs.unlinkSync(imagePath)
    } catch (err) {
      console.error('Error deleting temp file:', err)
    }
  }

  return {
    ...results,
    originalSize
  }
}

/**
 * Delete job image - no longer needed since images are in database
 * This function is kept for backward compatibility but does nothing
 * @param {Object} jobImage - JobImage document
 */
function deleteJobImageFiles (jobImage) {
  // Images are stored in database, no files to delete
  // This function is kept for backward compatibility
  console.log(
    'deleteJobImageFiles called - images are stored in database, no files to delete'
  )
}

module.exports = {
  processJobImage,
  deleteJobImageFiles,
  IMAGE_SIZES
}
