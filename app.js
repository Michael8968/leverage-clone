'use strict';

const express = require('express');
const cors = require('cors');
const cloudbase = require('@cloudbase/node-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


// --- 配置 ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const { TCB_SECRET_ID, TCB_SECRET_KEY, TCB_ENV_ID, SERVER_API_KEY, JWT_SECRET } = process.env;

const JWT_SECRET_KEY = JWT_SECRET || 'your-default-super-secret-key-that-is-long';
const SALT_ROUNDS = 10;

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
 * API 密钥或JWT认证中间件
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: Missing or invalid token.' });
  }

  const token = authHeader.split(' ')[1];

  // 首先检查是否为服务器API密钥
  if (token === SERVER_API_KEY) {
    req.authType = 'server_key';
    return next();
  }

  // 否则，尝试作为JWT进行验证
  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: 'Forbidden: Invalid JWT.' });
    }
    req.user = decoded; // { uid, role }
    req.authType = 'jwt';
    next();
  });
};


// --- 认证路由 ---

/**
 * @api {post} /api/auth/register 注册新用户
 */
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, role, gender } = req.body;

    if (!email || !password || !name || !role || !gender) {
        return res.status(400).send({ error: 'All fields (email, password, name, role, gender) are required.' });
    }

    try {
        const usersCollection = db.collection('users');
        const existingUser = await usersCollection.where({ email }).count();
        if (existingUser.total > 0) {
            return res.status(409).send({ error: 'Email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUserResult = await usersCollection.add({
            name, email, password: hashedPassword, role, gender,
            avatar: `https://avatar.iran.liara.run/public/${gender === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(name)}`,
            status: 'active',
            createdAt: new Date(),
        });

        const userId = newUserResult.id;
        const token = jwt.sign({ uid: userId, role: role }, JWT_SECRET_KEY, { expiresIn: '7d' });

        res.status(201).send({ 
            message: 'User registered successfully.', 
            token,
            user: { uid: userId, name, email, role, gender }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send({ error: 'Failed to register user.' });
    }
});

/**
 * @api {post} /api/auth/login 登录
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ error: 'Email and password are required.' });
    }

    try {
        const usersCollection = db.collection('users');
        const userSnapshot = await usersCollection.where({ email }).limit(1).get();
        if (userSnapshot.data.length === 0) {
            return res.status(404).send({ error: 'User not found.' });
        }

        const user = userSnapshot.data[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET_KEY, { expiresIn: '7d' });
        
        delete user.password;
        res.status(200).send({ message: 'Login successful.', token, user: { ...user, uid: user._id } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send({ error: 'Failed to login.' });
    }
});


/**
 * @api {get} /api/auth/verify 验证Token
 */
app.get('/api/auth/verify', authMiddleware, async (req, res) => {
    if (req.authType !== 'jwt' || !req.user) {
        return res.status(401).send({ error: 'A valid user JWT is required for this action.' });
    }
    const uid = req.user.uid;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.data.length) {
            return res.status(404).send({ error: 'User associated with token not found.' });
        }
        const user = userDoc.data[0];
        delete user.password;
        res.status(200).send({ user: { ...user, uid: user._id } });
    } catch (error) {
        res.status(500).send({ error: 'Failed to verify user data.' });
    }
});


// --- 业务逻辑路由 ---

app.get('/', (req, res) => {
  res.send('TCB HTTP API Server is running.');
});

// Health check endpoint for Docker/TCB
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'ok', timestamp: new Date() });
});

/**
 * @api {get} /api/posts 获取帖子列表
 */
app.get('/api/posts', authMiddleware, async (req, res) => {
  const { userId } = req.query;
  try {
    const query = userId ? db.collection('posts').where({ userId }) : db.collection('posts');
    const result = await query.orderBy('createdAt', 'desc').get();
    res.status(200).send({ posts: result.data });
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch posts from database.' });
  }
});

/**
 * @api {post} /api/posts 创建新帖子
 */
app.post('/api/posts', authMiddleware, async (req, res) => {
    if (req.authType !== 'jwt' || !req.user) {
        return res.status(403).send({ error: 'User authentication required to create a post.' });
    }
    const { title, content } = req.body;
    const { uid } = req.user;

    if (!title || !content) {
        return res.status(400).send({ error: 'Title and content are required.' });
    }

    try {
        const newPost = {
            title,
            content,
            userId: uid,
            createdAt: new Date(),
        };
        const result = await db.collection('posts').add(newPost);
        res.status(201).send({ message: 'Post created successfully', postId: result.id, ...newPost });
    } catch (error) {
        res.status(500).send({ error: 'Failed to create post.' });
    }
});

/**
 * 微信登录回退/占位路由
 */
app.post('/api/wechatLogin', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).send({ error: 'WeChat login code is required.'});
    }
    console.log(`Received WeChat login code: ${code}`);
    res.status(200).send({
        message: "WeChat login request received. Integration pending.",
        token: 'mock-jwt-token-for-wechat-user',
        userId: 'mock-wechat-user-id'
    });
});


// --- 启动服务器 ---
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
