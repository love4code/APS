# ⚠️ Image Storage Warning

## The Problem

If you're deploying this application on **Heroku** or similar platforms with an **ephemeral filesystem**, uploaded images will **disappear** when:

- The dyno restarts
- The dyno goes to sleep
- The application is redeployed
- The filesystem is cleared

This happens because Heroku's filesystem is **ephemeral** - any files written to the local filesystem are temporary and will be lost.

## Current Behavior

- Images are uploaded to `public/uploads/jobs/` directory
- Database records are created in MongoDB
- When files disappear, database records remain (orphaned records)
- The application will show warnings when image files are missing

## Solutions

### Option 1: Use Cloud Storage (Recommended for Production)

Use a cloud storage service like:

- **AWS S3** (Amazon Simple Storage Service)
- **Cloudinary** (Image hosting with transformations)
- **Google Cloud Storage**
- **Azure Blob Storage**

These services provide persistent storage that survives dyno restarts.

### Option 2: Use Heroku Add-ons

- **Heroku Bucketeer** (S3-compatible storage)
- **Cloudinary Add-on**

### Option 3: Clean Up Orphaned Records

If you're experiencing missing images, you can clean up orphaned database records:

```bash
# Dry run (see what would be deleted)
npm run cleanup-images

# Actually delete orphaned records
npm run cleanup-images-live
```

## Implementation Guide for Cloud Storage

### Using AWS S3

1. Install AWS SDK:

   ```bash
   npm install aws-sdk
   ```

2. Set environment variables:

   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=your_bucket_name
   AWS_REGION=us-east-1
   ```

3. Modify `services/imageService.js` to upload to S3 instead of local filesystem

4. Update image paths to use S3 URLs

### Using Cloudinary

1. Install Cloudinary:

   ```bash
   npm install cloudinary
   ```

2. Set environment variables:

   ```
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   ```

3. Modify `services/imageService.js` to upload to Cloudinary

4. Cloudinary automatically provides multiple image sizes

## Temporary Workaround

For development/testing, you can:

1. Run the cleanup script regularly to remove orphaned records
2. Re-upload images after dyno restarts
3. Use a persistent filesystem (not available on Heroku)

## Monitoring

The application will:

- Log warnings when image files are missing
- Show warning messages in the UI
- Filter out missing images from display (only show images with valid files)

Check your logs for messages like:

```
[Job Detail] X image(s) have missing files for job Y
```

## Next Steps

1. **For Production**: Implement cloud storage (S3, Cloudinary, etc.)
2. **For Development**: Be aware that images may disappear on restart
3. **Clean Up**: Run cleanup script periodically to remove orphaned records
