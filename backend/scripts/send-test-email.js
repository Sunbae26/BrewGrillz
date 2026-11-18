// npm run email:test → sends a sample email to RESTAURANT_EMAIL and explains any problem.
import { env } from "../src/config/env.js";
import { sendEmail } from "../src/modules/email/email.service.js";
import { testEmail } from "../src/modules/email/templates.js";
import { prisma } from "../src/lib/prisma.js";

try {
  const result = await sendEmail({ to: env.RESTAURANT_EMAIL, ...testEmail() });
  if (result.sent) console.log(`Sent to ${env.RESTAURANT_EMAIL}. Check the inbox (and spam).`);
  else if (result.file) console.log(`EMAIL_PROVIDER is "file", so the email was saved here instead: ${result.file}`);
  else console.log("Resend didn't accept it; the reason is above. It was queued for retry.");
} finally {
  await prisma.$disconnect();
}
