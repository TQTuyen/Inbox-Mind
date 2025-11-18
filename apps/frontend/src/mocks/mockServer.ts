import api from '@fe/lib/api/api';
import MockAdapter from 'axios-mock-adapter';
import { emails } from './emails';
import { mailboxes } from './mailboxes';

// Create mock adapter instance
const mock = new MockAdapter(api, { delayResponse: 500 });

console.log('='.repeat(50));
console.log('🔧 MOCK SERVER INITIALIZED');
console.log('📦 Mailboxes available:', mailboxes.length);
console.log('📧 Total emails:', emails.length);
console.log('👤 Demo user: demo@example.com / password123');
console.log('='.repeat(50));

// Mock user database
const users = [
  {
    id: 'user-1',
    email: 'demo@example.com',
    password: 'password123', // In production, this would be hashed
    fullName: 'Demo User',
  },
];

// Helper to generate JWT-like token
const generateToken = (expiresIn: number) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'user-1',
      email: 'demo@example.com',
      exp: Date.now() + expiresIn,
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
};

// Auth endpoints
mock.onPost('/auth/register').reply((config) => {
  const { email, password, fullName } = JSON.parse(config.data);

  if (users.find((u) => u.email === email)) {
    return [400, { message: 'User already exists' }];
  }

  users.push({ id: `user-${users.length + 1}`, email, password, fullName });
  return [200, { message: 'Registration successful' }];
});

mock.onPost('/auth/login').reply((config) => {
  console.log('🔐 Login attempt:', config.data);
  const { email, password } = JSON.parse(config.data);

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    console.log('❌ Login failed: Invalid credentials');
    return [401, { message: 'Invalid credentials' }];
  }

  const accessToken = generateToken(15 * 60 * 1000); // 15 minutes
  const refreshToken = generateToken(7 * 24 * 60 * 60 * 1000); // 7 days

  console.log('✅ Login successful for:', user.email);
  return [
    200,
    {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    },
  ];
});

mock.onPost('/auth/google').reply((config) => {
  const { credential } = JSON.parse(config.data);

  if (!credential) {
    return [400, { message: 'Invalid Google credential' }];
  }

  // Mock Google authentication
  const accessToken = generateToken(15 * 60 * 1000);
  const refreshToken = generateToken(7 * 24 * 60 * 60 * 1000);

  return [
    200,
    {
      accessToken,
      refreshToken,
      user: {
        id: 'google-user-1',
        email: 'google.user@gmail.com',
        fullName: 'Google User',
      },
    },
  ];
});

mock.onPost('/auth/refresh').reply((config) => {
  const { refreshToken } = JSON.parse(config.data);

  if (!refreshToken) {
    return [401, { message: 'Refresh token required' }];
  }

  const newAccessToken = generateToken(15 * 60 * 1000);
  return [200, { accessToken: newAccessToken }];
});

mock.onPost('/auth/logout').reply(200, { message: 'Logged out successfully' });

// Mailbox endpoints
mock.onGet('/mailboxes').reply(() => {
  console.log('📬 GET /mailboxes called, returning:', mailboxes);
  return [200, mailboxes];
});

mock.onGet(/\/api\/v1\/mailboxes\/[^/]+\/emails/).reply((config) => {
  const url = new URL(config.url!, 'http://localhost');
  const mailboxId = config.url!.match(/\/mailboxes\/([^/]+)\/emails/)![1];
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search');
  const category = url.searchParams.get('category');

  let filteredEmails = emails.filter((email) => {
    // Filter by mailbox
    if (mailboxId === 'starred') {
      return email.isStarred;
    }
    return email.mailboxId === mailboxId;
  });

  // Filter by search
  if (search) {
    filteredEmails = filteredEmails.filter(
      (email) =>
        email.subject.toLowerCase().includes(search.toLowerCase()) ||
        email.from.name.toLowerCase().includes(search.toLowerCase()) ||
        email.from.email.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Filter by category
  if (category && category !== 'all') {
    if (category === 'unread') {
      filteredEmails = filteredEmails.filter((email) => !email.isRead);
    } else if (category === 'read') {
      filteredEmails = filteredEmails.filter((email) => email.isRead);
    } else if (category === 'attachments') {
      filteredEmails = filteredEmails.filter(
        (email) => email.attachments && email.attachments.length > 0
      );
    }
  }

  const totalCount = filteredEmails.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  return [
    200,
    {
      emails: paginatedEmails,
      page,
      limit,
      totalPages,
      totalCount,
    },
  ];
});

// Email detail endpoint
mock.onGet(/\/emails\/[^/]+$/).reply((config) => {
  const emailId = config.url!.match(/\/emails\/([^/]+)$/)![1];
  const email = emails.find((e) => e.id === emailId);

  if (!email) {
    return [404, { message: 'Email not found' }];
  }

  return [200, email];
});

// Update email endpoint
mock.onPatch(/\/emails\/[^/]+$/).reply((config) => {
  const emailId = config.url!.match(/\/emails\/([^/]+)$/)![1];
  const email = emails.find((e) => e.id === emailId);

  if (!email) {
    return [404, { message: 'Email not found' }];
  }

  const updates = JSON.parse(config.data);
  Object.assign(email, updates);

  return [200, email];
});

// Delete email endpoint
mock.onDelete(/\/v1\/emails\/[^/]+$/).reply((config) => {
  const emailId = config.url!.match(/\/emails\/([^/]+)$/)![1];
  const emailIndex = emails.findIndex((e) => e.id === emailId);

  if (emailIndex === -1) {
    return [404, { message: 'Email not found' }];
  }

  emails.splice(emailIndex, 1);
  return [200, { message: 'Email deleted successfully' }];
});

export default mock;
