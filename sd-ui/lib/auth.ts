import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Google is the only provider — history-saving is opt-in and simply won't
// activate for a signed-out visitor. Requires GOOGLE_CLIENT_ID/SECRET and
// AUTH_SECRET in the environment (see README for how to obtain them); until
// then sign-in is absent from the UI but the rest of the app (including
// sessionStorage-backed chat) works exactly as before.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials passed explicitly: NextAuth v5 would otherwise auto-infer them
  // from AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET and silently send client_id=undefined
  // to Google, since our env uses the GOOGLE_CLIENT_* names.
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // token.sub is Google's stable account id — this becomes the user_id
    // every saved conversation is tagged with. Never take a user id from the
    // client; this is the only place it's set.
    jwt({ token, account }) {
      if (account) token.sub = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.sub!;
      return session;
    },
  },
});
