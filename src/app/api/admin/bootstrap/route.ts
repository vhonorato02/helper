import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hasValidBearerToken } from '@/lib/bearer-token';
import { copy } from '@/lib/copy';
import { displayNameSchema, passwordSchema, usernameSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bootstrapSchema = {
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
};

function getBootstrapAdmin() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const displayName = process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  const parsedUsername = bootstrapSchema.username.safeParse(username);
  const parsedDisplayName = bootstrapSchema.displayName.safeParse(displayName);
  const parsedPassword = bootstrapSchema.password.safeParse(password);

  if (!parsedUsername.success || !parsedDisplayName.success || !parsedPassword.success) {
    return null;
  }

  return {
    username: parsedUsername.data,
    displayName: parsedDisplayName.data,
    password: parsedPassword.data,
  };
}

export async function POST(req: Request) {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    return NextResponse.json({ error: copy.api.bootstrapSecretNotConfigured }, { status: 503 });
  }

  if (!hasValidBearerToken(req.headers.get('authorization'), bootstrapSecret)) {
    return NextResponse.json({ error: copy.api.unauthorized }, { status: 401 });
  }

  const admin = getBootstrapAdmin();
  if (!admin) {
    return NextResponse.json({ error: copy.api.missingBootstrapConfig }, { status: 503 });
  }

  const passwordHash = await bcrypt.hash(admin.password, 12);

  await db
    .insert(users)
    .values({
      username: admin.username,
      displayName: admin.displayName,
      passwordHash,
      isAdmin: true,
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        passwordHash,
        displayName: admin.displayName,
        isAdmin: true,
        isActive: true,
      },
    });

  return NextResponse.json({ ok: true, message: copy.api.bootstrapOk });
}
