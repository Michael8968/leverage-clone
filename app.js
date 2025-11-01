
'use strict';

const express = require('express');
const cors = require('cors');
const cloudbase = require('@cloudbase/node-sdk');

// --- 配置 ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const { TCB_SECRET_ID, TCB_SECRET_KEY, TCB_ENV_ID, SERVER_API_KEY } = process.env;

// --- 初始化 Express App 和 CloudBase ---
const app = express();
app.use(express.json());
app.use(cors());

// 初始化 TCB SDK
const tcb = cloudbase.init({
  secretId: TCB_SECRET_ID,
  secretKey: TCB_SECRET_KEY,
  env: TCB_ENV_ID,
});
const db = tcb.database();
const _ = db.command;

// --- 中间件 ---

/**
 * API 密钥认证中间件
 * 验证请求头中是否包含有效的服务器API密钥
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: Missing or invalid token.' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== SERVER_API_KEY) {
    return res.status(403).send({ error: 'Forbidden: Invalid API key.' });
  }

  next();
};

// --- 路由 ---

app.get('/', (req, res) => {
  res.send('TCB HTTP API Server is running.');
});

/**
 * @api {post} /api/createUser 创建用户
 * @apiName CreateUser
 * @apiGroup User
 *
 * @apiParam {String} email 用户邮箱.
 * @apiParam {String} password 用户密码.
 *
 * @apiSuccess {String} _id 新创建用户的唯一ID.
 * @apiSuccess {String} message 成功信息.
 */
app.post('/api/createUser', authMiddleware, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ error: 'Email and password are required.' });
  }

  // 模拟邮箱验证和密码处理逻辑
  if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).send({ error: 'Invalid email format.' });
  }

  try {
    const usersCollection = db.collection('users');

    // 检查邮箱是否已存在
    const existingUser = await usersCollection.where({ email }).count();
    if (existingUser.total > 0) {
        return res.status(409).send({ error: 'Email already exists.' });
    }

    // 实际项目中应哈希密码
    // const hashedPassword = await bcrypt.hash(password, 10);

    const result = await usersCollection.add({
      email,
      // password: hashedPassword,
      createdAt: new Date(),
    });

    res.status(201).send({
      message: 'User created successfully.',
      _id: result.id,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send({ error: 'Failed to create user in database.' });
  }
});

/**
 * @api {get} /api/posts 获取帖子列表
 * @apiName GetPosts
 * @apiGroup Post
 *
 * @apiParam {String} [userId] (可选) 用于过滤特定用户的帖子.
 *
 * @apiSuccess {Object[]} posts 帖子对象数组.
 */
app.get('/api/posts', authMiddleware, async (req, res) => {
  const { userId } = req.query;

  try {
    const postsCollection = db.collection('posts');
    let query = postsCollection;

    if (userId) {
      query = query.where({ userId });
    }

    const result = await query.orderBy('createdAt', 'desc').get();
    res.status(200).send({ posts: result.data });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send({ error: 'Failed to fetch posts from database.' });
  }
});


/**
 * 微信登录回退/占位路由
 * 实际实现需要与微信开放平台SDK集成
 */
app.post('/api/wechatLogin', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).send({ error: 'WeChat login code is required.'});
    }
    // TODO: 在此处集成微信服务端SDK，用code换取openid和session_key
    console.log(`Received WeChat login code: ${code}`);
    res.status(200).send({
        message: "WeChat login request received. Integration pending.",
        // MOCK DATA
        token: 'mock-jwt-token-for-wechat-user',
        userId: 'mock-wechat-user-id'
    });
});


// --- 启动服务器 ---
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
