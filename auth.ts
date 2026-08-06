import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

// Always enable Credentials provider in development or when Google OAuth is not configured
if (process.env.NODE_ENV === "development" || (!process.env.AUTH_GOOGLE_ID && !process.env.AUTH_GOOGLE_SECRET)) {
  providers.push(
    Credentials({
      name: "Development Bypass",
      credentials: {},
      async authorize() {
        return {
          id: "dev-user-id",
          name: "Dev User",
          email: "dev@swiftsane.com",
          image: "https://api.dicebear.com/7.x/adventurer/svg?seed=dev",
        };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /* Persist the provider's account ID (Google sub / Entra oid) into the JWT */
    async jwt({ token, account }) {
      if (account) {
        token.providerAccountId = account.providerAccountId || "dev-user-id";
        token.idToken = account.id_token || "mock-jwt-token";
      }
      return token;
    },
    /* Expose providerAccountId and idToken on the session.user object */
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).id =
          (token.providerAccountId as string) || "dev-user-id";
        (session.user as unknown as Record<string, unknown>).idToken =
          (token.idToken as string) || "mock-jwt-token";
      }
      return session;
    },
  },
});

