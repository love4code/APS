/**
 * Cleanup script to remove orphaned image records from database
 * when the actual files no longer exist on the filesystem.
 *
 * This is useful for Heroku deployments where the filesystem is ephemeral
 * and files can disappear on dyno restarts.
 *
 * Usage: node scripts/cleanup-orphaned-images.js [--dry-run]
 */

require('dotenv').config()
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const JobImage = require('../models/JobImage')

// Connect to database
const connectDB = require('../config/db')
connectDB()

async function cleanupOrphanedImages (dryRun = true) {
  try {
    console.log('Starting orphaned image cleanup...')
    console.log(
      `Mode: ${
        dryRun
          ? 'DRY RUN (no changes will be made)'
          : 'LIVE (will delete records)'
      }`
    )

    const publicDir = path.join(__dirname, '..', 'public')
    const allImages = await JobImage.find({}).lean()

    console.log(`Found ${allImages.length} image records in database`)

    let orphanedCount = 0
    let validCount = 0
    const orphanedImages = []

    for (const img of allImages) {
      // Normalize paths
      let thumbnailPath = (img.thumbnailPath || '').replace(/^\/+/, '')
      let mediumPath = (img.mediumPath || '').replace(/^\/+/, '')
      let largePath = (img.largePath || '').replace(/^\/+/, '')

      const thumbnailFullPath = path.join(publicDir, thumbnailPath)
      const mediumFullPath = path.join(publicDir, mediumPath)
      const largeFullPath = path.join(publicDir, largePath)

      // Check if any of the image files exist
      const thumbnailExists = fs.existsSync(thumbnailFullPath)
      const mediumExists = fs.existsSync(mediumFullPath)
      const largeExists = fs.existsSync(largeFullPath)

      if (!thumbnailExists && !mediumExists && !largeExists) {
        // All files are missing - this is an orphaned record
        orphanedCount++
        orphanedImages.push({
          _id: img._id,
          job: img.job,
          originalFilename: img.originalFilename,
          uploadedAt: img.uploadedAt,
          thumbnailPath: img.thumbnailPath,
          mediumPath: img.mediumPath,
          largePath: img.largePath
        })

        if (!dryRun) {
          // Delete the orphaned record
          await JobImage.findByIdAndDelete(img._id)
          console.log(
            `Deleted orphaned image record: ${img._id} (${img.originalFilename})`
          )
        } else {
          console.log(
            `Would delete orphaned image record: ${img._id} (${img.originalFilename})`
          )
        }
      } else {
        validCount++
      }
    }

    console.log('\n=== Cleanup Summary ===')
    console.log(`Total images in database: ${allImages.length}`)
    console.log(`Valid images (files exist): ${validCount}`)
    console.log(`Orphaned images (files missing): ${orphanedCount}`)

    if (dryRun && orphanedCount > 0) {
      console.log('\n⚠️  DRY RUN MODE - No records were deleted')
      console.log('Run with --live flag to actually delete orphaned records')
      console.log('\nOrphaned image details:')
      orphanedImages.forEach(img => {
        console.log(
          `  - ${img._id}: ${img.originalFilename} (Job: ${img.job}, Uploaded: ${img.uploadedAt})`
        )
      })
    } else if (!dryRun && orphanedCount > 0) {
      console.log(`\n✅ Deleted ${orphanedCount} orphaned image record(s)`)
    } else if (orphanedCount === 0) {
      console.log('\n✅ No orphaned images found - all files exist!')
    }

    process.exit(0)
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

// Check command line arguments
const args = process.argv.slice(2)
const dryRun = !args.includes('--live')

if (!dryRun) {
  console.log(
    '⚠️  WARNING: Running in LIVE mode - orphaned records will be deleted!'
  )
  console.log('Press Ctrl+C within 5 seconds to cancel...')

  setTimeout(() => {
    cleanupOrphanedImages(false)
  }, 5000)
} else {
  cleanupOrphanedImages(true)
}
