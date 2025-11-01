const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-super-secret-key-that-is-long';
const SALT_ROUNDS = 10;

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Unauthorized: Missing token.' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: 'Forbidden: Invalid token.' });
        }
        req.user = decoded; // Adds decoded payload (e.g., { uid: '...' }) to request
        next();
    });
};

/**
 * @api {post} /api/auth/register Register a new user
 */
router.post('/register', async (req, res) => {
    const { email, password, name, role, gender } = req.body;
    const db = req.db;

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
            name,
            email,
            password: hashedPassword,
            role,
            gender,
            avatar: `https://avatar.iran.liara.run/public/${gender === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(name)}`,
            status: 'active',
            createdAt: new Date(),
            // Other fields...
        });

        const userId = newUserResult.id;

        const token = jwt.sign({ uid: userId, role: role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).send({ 
            message: 'User registered successfully.', 
            token,
            user: { uid: userId, name, email, role, gender } // Return basic user info
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send({ error: 'Failed to register user.' });
    }
});


/**
 * @api {post} /api/auth/login Login a user
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = req.db;

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

        const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        // Don't send password back to client
        delete user.password;
        
        res.status(200).send({
            message: 'Login successful.',
            token,
            user: { ...user, uid: user._id },
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send({ error: 'Failed to login.' });
    }
});

/**
 * @api {get} /api/auth/verify Verify token and get user data
 */
router.get('/verify', verifyToken, async (req, res) => {
    const db = req.db;
    const uid = req.user.uid;

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.data.length) {
            return res.status(404).send({ error: 'User associated with token not found.' });
        }
        
        const user = userDoc.data[0];
        delete user.password; // Ensure password is not sent
        
        res.status(200).send({ user: { ...user, uid: user._id } });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).send({ error: 'Failed to verify user data.' });
    }
});

module.exports = router;
