'use strict';

/**
 * CloudBase 云函数：getTripo3dModelStatus
 * Tripo3D状态查询 - 查询Tripo3D 3D模型生成任务的处理状态
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
      const { taskId, apiKey } = JSON.parse(body || '{}');

      if (!taskId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'taskId is required' })
        };
      }

      try {
        // Get task from database
        const taskSnapshot = await db.collection('tripo3d_tasks')
          .where({ taskId: taskId })
          .get();

        if (!taskSnapshot.data || taskSnapshot.data.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Task not found',
              details: `No Tripo3D task found with ID: ${taskId}`
            })
          };
        }

        const task = taskSnapshot.data[0];

        // Tripo3D API status endpoint (mock - in real implementation, use actual Tripo3D API)
        const tripoStatusUrl = `https://api.tripo3d.ai/v1/task/${taskId}`; // This is a placeholder URL

        // In a real implementation, you would make the actual API call to Tripo3D
        // For now, we'll simulate status progression based on time elapsed
        console.log('Tripo3D status check would be made to:', tripoStatusUrl);

        const now = Date.now();
        const createdAt = new Date(task.createdAt).getTime();
        const elapsedMinutes = (now - createdAt) / (1000 * 60);

        let status;
        let progress;
        let output = null;

        if (elapsedMinutes < 1) {
          status = 'queued';
          progress = 10;
        } else if (elapsedMinutes < 3) {
          status = 'processing';
          progress = 30 + Math.random() * 40; // 30-70%
        } else if (elapsedMinutes < 5) {
          status = 'processing';
          progress = 80 + Math.random() * 15; // 80-95%
        } else {
          status = 'success';
          progress = 100;
          output = {
            model_url: `https://storage.tripo3d.ai/models/${taskId}/model.glb`,
            thumbnail_url: `https://storage.tripo3d.ai/models/${taskId}/thumbnail.png`,
            images: [
              {
                url: `https://storage.tripo3d.ai/models/${taskId}/render1.png`
              },
              {
                url: `https://storage.tripo3d.ai/models/${taskId}/render2.png`
              }
            ]
          };
        }

        const result = {
          task_id: taskId,
          status: status,
          progress: Math.round(progress),
          output: output,
          estimated_time_remaining: status === 'processing' ? Math.max(0, 5 - elapsedMinutes) * 60 : 0,
          created_at: task.createdAt,
          updated_at: new Date().toISOString()
        };

        // Update task status in database
        await db.collection('tripo3d_tasks').doc(task._id).update({
          status: status,
          progress: result.progress,
          output: output,
          updatedAt: new Date()
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        };

      } catch (error) {
        console.error('Tripo3D status check error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing Tripo3D status check request',
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
    console.error('getTripo3dModelStatus error:', error);
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