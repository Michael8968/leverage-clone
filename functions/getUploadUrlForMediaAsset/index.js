'use strict';

/**
 * CloudBase 云函数：getUploadUrlForMediaAsset
 * 获取媒体资源上传URL - 生成COS签名URL
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  try {
    // 初始化 CloudBase
    const app = cloudbase.init({
      env: process.env.ENV_ID || 'cloud1-7galmfiu70af91a6'
    });

    const db = app.database();
    const { httpMethod, body } = event;

    if (httpMethod === 'POST') {
      const { fileName, fileType, fileSize, userId } = JSON.parse(body || '{}');

      if (!fileName || !fileType) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'fileName and fileType are required' })
        };
      }

      try {
        // Generate unique file key
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExtension = fileName.split('.').pop();
        const fileKey = `uploads/${userId || 'anonymous'}/${timestamp}-${randomId}.${fileExtension}`;

        // Get COS instance from CloudBase
        const cos = app.getCos();

        // Generate signed URL for upload
        const signedUrl = await new Promise((resolve, reject) => {
          cos.getObjectUrl({
            Bucket: process.env.COS_BUCKET || 'your-bucket-name',
            Region: process.env.COS_REGION || 'ap-shanghai',
            Key: fileKey,
            Expires: 3600, // 1 hour
            Sign: true
          }, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data.Url);
            }
          });
        });

        // Store upload record in database
        const uploadRecord = {
          fileKey,
          fileName,
          fileType,
          fileSize: fileSize || 0,
          userId: userId || null,
          uploadUrl: signedUrl,
          status: 'pending',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        };

        await db.collection('media_uploads').add(uploadRecord);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadUrl: signedUrl,
            fileKey,
            expiresIn: 3600,
            success: true
          })
        };

      } catch (error) {
        console.error('Upload URL generation error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Failed to generate upload URL',
            details: error.message
          })
        };
      }
    } else {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('getUploadUrlForMediaAsset error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};