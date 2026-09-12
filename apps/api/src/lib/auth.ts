import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { getEnv } from "@archmax/core/config/env";

const env = getEnv();

const mongoClient = new MongoClient(env.MONGODB_URI!);

export const auth = betterAuth({
  baseURL: env.AUTH_BASE_URL || `http://localhost:${env.PORT}`,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(mongoClient.db()),
  trustedOrigins: env.corsOrigins,

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },

  plugins: [username()],

  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    // Keys are matched against the path relative to Better Auth's base path
    // ("/sign-in/username"), not the full request URL. With the "/api/auth/..." prefix
    // these rules never matched and Better Auth's built-in 3-per-10s sign-in rule applied.
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-in/username": { window: 60, max: 10 },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  advanced: {
    // Retained across the product rename: changing the prefix would invalidate every existing session.
    cookiePrefix: "archmax",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
});

export type Session = typeof auth.$Infer.Session;
