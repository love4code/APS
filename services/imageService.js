const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 200, height: 200, quality: 80 },
  medium: { width: 800, height: 800, quality: 85 },
  large: { width: 1920, height: 1920, quality: 90 }
}

/**
 * Process and save image in multiple sizes
 * @param {Buffer|string} imagePath - Path to the uploaded image file
 * @param {string} jobId - Job ID for folder structure
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} Object with paths and sizes for all image versions
 */
async function processJobImage(imagePath, jobId, originalFilename) {
  const baseDir = path.join(__dirname, '..', 'public', 'uploads', 'jobs', jobId.toString())
  
  // Ensure directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }

  // Generate unique filename base
  const timestamp = Date.now()
  const randomSuffix = Math.round(Math.random() * 1e9)
  const fileExt = path.extname(originalFilename).toLowerCase()
  const baseFilename = `img-${timestamp}-${randomSuffix}`

  const results = {
    thumbnailPath: null,
    mediumPath: null,
    largePath: null,
    thumbnailSize: 0,
    mediumSize: 0,
    largeSize: 0
  }

  // Read original file to get size
  const originalBuffer = fs.readFileSync(imagePath)
  const originalSize = originalBuffer.length

  // Always use JPEG extension for processed images for better compression
  const outputExt = '.jpg'

  // Process thumbnail (200x200)
  const thumbnailPath = path.join(baseDir, `${baseFilename}-thumb${outputExt}`)
  const thumbnailBuffer = await sharp(imagePath)
    .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: IMAGE_SIZES.thumbnail.quality, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(thumbnailPath, thumbnailBuffer)
  results.thumbnailPath = `uploads/jobs/${jobId}/${path.basename(thumbnailPath)}`
  results.thumbnailSize = thumbnailBuffer.length

  // Process medium (800x800)
  const mediumPath = path.join(baseDir, `${baseFilename}-medium${outputExt}`)
  const mediumBuffer = await sharp(imagePath)
    .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: IMAGE_SIZES.medium.quality, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(mediumPath, mediumBuffer)
  results.mediumPath = `uploads/jobs/${jobId}/${path.basename(mediumPath)}`
  results.mediumSize = mediumBuffer.length

  // Process large (1920x1920)
  const largePath = path.join(baseDir, `${baseFilename}-large${outputExt}`)
  const largeBuffer = await sharp(imagePath)
    .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: IMAGE_SIZES.large.quality, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(largePath, largeBuffer)
  results.largePath = `uploads/jobs/${jobId}/${path.basename(largePath)}`
  results.largeSize = largeBuffer.length

  // Delete temporary uploaded file (it's in the temp directory)
  if (fs.existsSync(imagePath)) {
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
 * Delete image files from filesystem
 * @param {Object} jobImage - JobImage document with paths
 */
function deleteJobImageFiles(jobImage) {
  const baseDir = path.join(__dirname, '..', 'public')
  
  const filesToDelete = [
    jobImage.thumbnailPath,
    jobImage.mediumPath,
    jobImage.largePath
  ]

  filesToDelete.forEach(filePath => {
    if (filePath) {
      const fullPath = path.join(baseDir, filePath)
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath)
        } catch (err) {
          console.error(`Error deleting file ${fullPath}:`, err)
        }
      }
    }
  })

  // Try to delete the job folder if it's empty
  const jobDir = path.join(baseDir, 'uploads', 'jobs', jobImage.job.toString())
  try {
    if (fs.existsSync(jobDir)) {
      const files = fs.readdirSync(jobDir)
      if (files.length === 0) {
        fs.rmdirSync(jobDir)
      }
    }
  } catch (err) {
    console.error(`Error deleting job directory ${jobDir}:`, err)
  }
}

module.exports = {
  processJobImage,
  deleteJobImageFiles,
  IMAGE_SIZES
}

