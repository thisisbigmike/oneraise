import type { AuthOptions, Session } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { JWT } from "next-auth/jwt";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

const MAX_SESSION_IMAGE_URL_LENGTH = 10000;

type AuthUser = {
  id?: string | null;
  image?: string | null;
  role?: string | null;
};

type MutableSessionUser = NonNullable<Session["user"]> & {
  id?: unknown;
  role?: unknown;
};

function getCookieSafeImage(value: unknown) {
  if (typeof value !== "string") return undefined;

  const image = value.trim();
  if (!image || image.length > MAX_SESSION_IMAGE_URL_LENGTH) return undefined;
  if (!image.startsWith("/") && !image.startsWith("https://") && !image.startsWith("data:image/")) return undefined;

  return image;
}

function setCookieSafePicture(token: JWT, value: unknown) {
  const safeImage = getCookieSafeImage(value);

  if (safeImage) {
    token.picture = safeImage;
    return;
  }

  delete token.picture;
}

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  providers.push(
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const normalizedEmail = credentials.email.trim().toLowerCase();

      // Secret Admin Bypass — password set via ADMIN_BYPASS_PASSWORD env var.
      // Development-only: never active in production builds.
      const adminBypassPassword = process.env.ADMIN_BYPASS_PASSWORD;
      if (
        process.env.NODE_ENV !== "production" &&
        adminBypassPassword &&
        normalizedEmail === 'admin' &&
        credentials.password === adminBypassPassword
      ) {
        return { id: 'admin-id', email: 'admin', name: 'System Admin', role: 'admin' };
      }

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          password: true,
          role: true,
          emailVerified: true,
        },
      });
      if (!user || !user.password) return null;
      
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) return null;

      if (!user.emailVerified) {
        throw new Error("EmailNotVerified");
      }

      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    }
  }),
);

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;

      const email = user.email?.trim().toLowerCase();
      if (!email) return "/auth?mode=signin&error=OAuthEmail";

      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const sessionUser = session.user as MutableSessionUser;
        sessionUser.id = token.id;
        sessionUser.role = token.role;
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = getCookieSafeImage(token.picture) || null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, build a minimal token
      if (user) {
        const authUser = user as AuthUser;
        // Start with a clean token to avoid inheriting large OAuth data
        const minimalToken: JWT = {
          id: user.id,
          name: user.name || null,
          email: user.email || null,
          role: authUser.role || null,
        };
        setCookieSafePicture(minimalToken, authUser.image);
        return minimalToken;
      }

      // Strip any bloated fields that may have leaked into the token
      // (OAuth providers can inject access_token, id_token, profile, etc.)
      delete (token as Record<string, unknown>).access_token;
      delete (token as Record<string, unknown>).id_token;
      delete (token as Record<string, unknown>).refresh_token;
      delete (token as Record<string, unknown>).token_type;
      delete (token as Record<string, unknown>).scope;
      delete (token as Record<string, unknown>).session_state;
      delete (token as Record<string, unknown>).provider;
      delete (token as Record<string, unknown>).type;
      delete (token as Record<string, unknown>).providerAccountId;

      setCookieSafePicture(token, token.picture);

      // Provide way to update role dynamically 
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      if (trigger === "update") {
        if (typeof session?.name === "string") token.name = session.name;
        if (typeof session?.email === "string") token.email = session.email;
        if (typeof session?.image === "string" || session?.image === null) {
          setCookieSafePicture(token, session.image);
        }
      }
      return token;
    }
  },
  pages: {
    signIn: "/auth",
  }
};
