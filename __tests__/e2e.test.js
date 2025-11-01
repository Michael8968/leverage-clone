/**
 * @jest-environment jsdom
 */

import { apiRegister, apiLogin, apiCreatePost, apiGetPosts } from '../utils';

// Mock the global fetch function
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});


describe('E2E User Flow: Registration, Login, and Posting', () => {
  const MOCK_USER = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
    gender: 'other',
  };
  const MOCK_TOKEN = 'mock-jwt-token';
  let createdPostId = null;

  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  test('Step 1: User Registration', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'User registered successfully.',
        token: MOCK_TOKEN,
        user: { uid: 'user-123', ...MOCK_USER },
      }),
    });

    const data = await apiRegister(MOCK_USER);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(MOCK_USER),
      })
    );
    expect(data.token).toBe(MOCK_TOKEN);
    expect(data.user.email).toBe(MOCK_USER.email);
  });

  test('Step 2: User Login', async () => {
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            message: 'Login successful.',
            token: MOCK_TOKEN,
            user: { uid: 'user-123', ...MOCK_USER }
        }),
    });
    
    // Manually set token for this test since registration is separate
    localStorage.setItem('jwt_token', 'some-other-token'); 
    
    const data = await apiLogin(MOCK_USER.email, MOCK_USER.password);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: MOCK_USER.email, password: MOCK_USER.password }),
      })
    );
    expect(data.token).toBe(MOCK_TOKEN);
    // After login, the token in localStorage should be updated
    // Note: Our apiLogin doesn't automatically set localStorage, the UI logic does.
    // This test just verifies the API call.
  });
  
  test('Step 3: Create a Post', async () => {
    // Simulate logged-in state
    localStorage.setItem('jwt_token', MOCK_TOKEN);

    const postContent = { title: 'My First Post', content: 'Hello World!' };
    createdPostId = `post-${Date.now()}`;
    
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            message: 'Post created successfully',
            postId: createdPostId,
            ...postContent,
            userId: 'user-123',
        }),
    });

    const data = await apiCreatePost(postContent.title, postContent.content);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/posts'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Authorization': `Bearer ${MOCK_TOKEN}` }),
        body: JSON.stringify(postContent),
      })
    );
    expect(data.postId).toBe(createdPostId);
    expect(data.title).toBe(postContent.title);
  });
  
   test('Step 4: Get All Posts and verify creation', async () => {
    localStorage.setItem('jwt_token', MOCK_TOKEN);
    
    const mockedPosts = [
        { postId: createdPostId || 'post-123', title: 'My First Post', content: 'Hello World!', userId: 'user-123' },
        { postId: 'post-456', title: 'Another Post', content: 'Content here', userId: 'user-456' },
    ];
    
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: mockedPosts }),
    });

    const data = await apiGetPosts();
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/posts'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'Authorization': `Bearer ${MOCK_TOKEN}` }),
      })
    );
    
    expect(data.posts).toBeInstanceOf(Array);
    expect(data.posts.length).toBeGreaterThan(0);
    // Find the post we created in the previous step
    const myPost = data.posts.find(p => p.title === 'My First Post');
    expect(myPost).toBeDefined();
    expect(myPost.content).toBe('Hello World!');
  });
});
