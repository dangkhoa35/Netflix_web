import { AuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcrypt';
import { prisma } from './prismadb';

// Only include OAuth providers if credentials are configured
const providers: AuthOptions['providers'] = [];
const githubClientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET;
const parseBooleanEnv = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;

  return defaultValue;
};

const allowOAuthEmailLinking = parseBooleanEnv(
  process.env.NEXTAUTH_ALLOW_OAUTH_EMAIL_LINKING,
  true
);

if (githubClientId && githubClientSecret) {
  const githubCallbackUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`;

  providers.push(
    GithubProvider({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      allowDangerousEmailAccountLinking: allowOAuthEmailLinking,
      token: {
        async request({ params }) {
          const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
              'User-Agent': 'next-auth-github',
            },
            body: new URLSearchParams({
              client_id: githubClientId,
              client_secret: githubClientSecret,
              code: String(params.code || ''),
              redirect_uri: githubCallbackUrl,
            }),
          });

          const tokens = await response.json();
          if (!response.ok || !tokens?.access_token) {
            const message = tokens?.error_description || tokens?.error || 'Token exchange failed';
            throw new Error(`GitHub token exchange failed: ${message}`);
          }

          return { tokens };
        },
      },
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: allowOAuthEmailLinking,
    })
  );
}

providers.push(
  Credentials({
    id: 'credentials',
    name: 'Credentials',
    credentials: {
      email: {
        label: 'Email',
        type: 'text',
      },
      password: {
        label: 'Password',
        type: 'password'
      }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password required');
      }

      const user = await prisma.user.findUnique({ where: {
        email: credentials.email
      }});

      if (!user || !user.hashedPassword) {
        throw new Error('Email does not exist');
      }

      const isCorrectPassword = await compare(credentials.password, user.hashedPassword);

      if (!isCorrectPassword) {
        throw new Error('Incorrect password');
      }

      return user;
    }
  })
);

export const authOptions: AuthOptions = {
  providers,
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  debug: false,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in (credentials or OAuth), persist user info into JWT
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + "/profiles"
    }
  }
};
