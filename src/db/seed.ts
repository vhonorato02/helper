import bcrypt from 'bcryptjs';
import { db } from './index';
import { users } from './schema';
import { copy } from '@/lib/copy';
import { displayNameSchema, passwordSchema, usernameSchema } from '@/lib/validation';

function readSeedAdmin() {
  const username = usernameSchema.safeParse(process.env.BOOTSTRAP_ADMIN_USERNAME);
  const displayName = displayNameSchema.safeParse(process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME);
  const password = passwordSchema.safeParse(process.env.BOOTSTRAP_ADMIN_PASSWORD);

  if (!username.success || !displayName.success || !password.success) {
    throw new Error(copy.api.missingBootstrapConfig);
  }

  return {
    username: username.data,
    displayName: displayName.data,
    password: password.data,
  };
}

async function seed() {
  const admin = readSeedAdmin();
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
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
