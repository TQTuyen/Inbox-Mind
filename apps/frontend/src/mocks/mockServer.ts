import { delay, http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { emails } from './emails';
import { mailboxes } from './mailboxes';

console.log('='.repeat(50));
console.log('🔧 MOCK SERVER INITIALIZED (MSW)');
console.log('📦 Mailboxes available:', mailboxes.length);
console.log('📧 Total emails:', emails.length);
console.log('👤 Demo user: demo@example.com / password123');
console.log('='.repeat(50));

// Mock user database
const users = [
  {
    id: 'user-1',
    email: 'demo@example.com',
    password: 'password123',
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
      exp: Math.floor(Date.now() / 1000) + Math.floor(expiresIn / 1000),
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
};

// MSW Handlers
const handlers = [
  // Auth - Register
  http.post('/api/v1/auth/register', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as {
      email: string;
      password: string;
      fullName: string;
    };
    const { email, password, fullName } = body;

    if (users.find((u) => u.email === email)) {
      return HttpResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    users.push({ id: `user-${users.length + 1}`, email, password, fullName });
    return HttpResponse.json({ message: 'Registration successful' });
  }),

  // Auth - Login
  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { email: string; password: string };
    const { email, password } = body;

    console.log('🔐 Login attempt:', email);

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      console.log('❌ Login failed: Invalid credentials');
      return HttpResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const accessToken = generateToken(15 * 60 * 1000); // 15 minutes
    const refreshToken = generateToken(7 * 24 * 60 * 60 * 1000); // 7 days

    console.log('✅ Login successful for:', user.email);

    // Set httpOnly cookie for refresh token
    return HttpResponse.json(
      {
        accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      },
      {
        headers: {
          'Set-Cookie': `refreshToken=${refreshToken}; Path=/; Max-Age=${
            7 * 24 * 60 * 60 * 1000
          }; SameSite=Lax`,
        },
      }
    );
  }),

  // Auth - Google Login
  http.post('/api/v1/auth/google', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { credential: string };
    const { credential } = body;

    if (!credential) {
      return HttpResponse.json(
        { message: 'Invalid Google credential' },
        { status: 400 }
      );
    }

    const accessToken = generateToken(15 * 60 * 1000);
    const refreshToken = generateToken(7 * 24 * 60 * 60 * 1000);

    return HttpResponse.json(
      {
        accessToken,
        expiresIn: 15 * 60,
        user: {
          id: 'google-user-1',
          email: 'google.user@gmail.com',
          fullName: 'Google User',
        },
      },
      {
        headers: {
          'Set-Cookie': `refreshToken=${refreshToken}; Path=/; Max-Age=${
            7 * 24 * 60 * 60 * 1000
          }; SameSite=Lax`,
        },
      }
    );
  }),

  // Auth - Refresh Token
  http.post('/api/v1/auth/refresh', async ({ cookies }) => {
    await delay(200);
    const refreshToken = cookies.refreshToken;

    console.log('🔄 Refresh token request');

    if (!refreshToken) {
      console.log('❌ No refresh token found');
      return HttpResponse.json(
        { message: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Decode refresh token to get user info (in real app, validate token)
    try {
      const payload = JSON.parse(atob(refreshToken.split('.')[1]));
      const user = users.find((u) => u.id === payload.sub);

      if (!user) {
        console.log('❌ User not found from token');
        return HttpResponse.json(
          { message: 'Invalid refresh token' },
          { status: 401 }
        );
      }

      const newAccessToken = generateToken(15 * 60 * 1000);
      const newRefreshToken = generateToken(7 * 24 * 60 * 60 * 1000);

      console.log('✅ Token refreshed for:', user.email);

      return HttpResponse.json(
        {
          accessToken: newAccessToken,
          expiresIn: 15 * 60,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
          },
        },
        {
          headers: {
            'Set-Cookie': `refreshToken=${newRefreshToken}; Path=/; Max-Age=${
              7 * 24 * 60 * 60 * 1000
            }; SameSite=Lax`,
          },
        }
      );
    } catch (error) {
      console.log('❌ Invalid token format:', error);
      return HttpResponse.json(
        { message: 'Invalid refresh token' },
        { status: 401 }
      );
    }
  }),

  // Auth - Logout
  http.post('/api/v1/auth/logout', async () => {
    await delay(200);
    return HttpResponse.json(
      { message: 'Logged out successfully' },
      {
        headers: {
          'Set-Cookie': 'refreshToken=; Path=/; Max-Age=0',
        },
      }
    );
  }),

  // Mailboxes - List
  http.get('/api/v1/mailboxes', async () => {
    await delay(300);
    console.log('📬 GET /mailboxes called');
    return HttpResponse.json(mailboxes);
  }),

  // Emails - List by Mailbox
  http.get(
    '/api/v1/mailboxes/:mailboxId/emails',
    async ({ params, request }) => {
      await delay(400);
      const { mailboxId } = params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const search = url.searchParams.get('search');
      const category = url.searchParams.get('category');

      let filteredEmails = emails.filter((email) => {
        if (mailboxId === 'starred') {
          return email.isStarred;
        }
        return email.mailboxId === mailboxId;
      });

      if (search) {
        filteredEmails = filteredEmails.filter(
          (email) =>
            email.subject.toLowerCase().includes(search.toLowerCase()) ||
            email.from.name.toLowerCase().includes(search.toLowerCase()) ||
            email.from.email.toLowerCase().includes(search.toLowerCase())
        );
      }

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

      return HttpResponse.json({
        emails: paginatedEmails,
        page,
        limit,
        totalPages,
        totalCount,
      });
    }
  ),

  // Email - Get by ID
  http.get('/api/v1/emails/:emailId', async ({ params }) => {
    await delay(200);
    const { emailId } = params;
    const email = emails.find((e) => e.id === emailId);

    if (!email) {
      return HttpResponse.json({ message: 'Email not found' }, { status: 404 });
    }

    return HttpResponse.json(email);
  }),

  // Email - Update
  http.patch('/api/v1/emails/:emailId', async ({ params, request }) => {
    await delay(200);
    const { emailId } = params;
    const email = emails.find((e) => e.id === emailId);

    if (!email) {
      return HttpResponse.json({ message: 'Email not found' }, { status: 404 });
    }

    const updates = await request.json();
    Object.assign(email, updates);

    return HttpResponse.json(email);
  }),

  // Email - Delete
  http.delete('/api/v1/emails/:emailId', async ({ params }) => {
    await delay(200);
    const { emailId } = params;
    const emailIndex = emails.findIndex((e) => e.id === emailId);

    if (emailIndex === -1) {
      return HttpResponse.json({ message: 'Email not found' }, { status: 404 });
    }

    emails.splice(emailIndex, 1);
    return HttpResponse.json({ message: 'Email deleted successfully' });
  }),
];

// Setup MSW worker
export const worker = setupWorker(...handlers);
