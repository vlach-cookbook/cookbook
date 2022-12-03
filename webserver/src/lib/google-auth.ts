import { OAuth2Client } from 'google-auth-library';

export const CLIENT_ID = "460030128084-stbl2od4tu554t4ql53fa8s234dqbshl.apps.googleusercontent.com";

const client = new OAuth2Client(CLIENT_ID);

export type GoogleUser = {
  /// The unique ID of the user's Google Account
  sub: string;
  /// The user's preferred and verified email address. This is only present if email_verified was
  /// true.
  email?: string;
  /// The user's display name.
  name?: string;
};

export async function verify(token: string): Promise<GoogleUser | null> {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    return null;
  }
  if (!payload.email_verified) {
    delete payload.email;
  }
  return payload;
}
