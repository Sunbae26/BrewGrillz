import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import { hashPassword } from "../../utils/password.js";
import { sendEmail } from "../email/email.service.js";
import { teamInviteEmail } from "../email/templates.js";

const select = {
  name: true,
  email: true,
  role: true,
  isOwner: true,
  createdAt: true,
};

const ownerOnly = (message) => new HttpError(403, message);

export const listTeam = () =>
  prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: [{ isOwner: "desc" }, { role: "asc" }, { createdAt: "asc" }],
    select,
  });

export async function addTeamMember(
  actor,
  { name, email, password, role, confirmExisting },
) {
  if (role === "ADMIN" && !actor.isOwner)
    throw ownerOnly("Only the owner can add another admin.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "CUSTOMER")
    throw new HttpError(409, `${existing.name} is already on the team.`);
  if (existing && !confirmExisting)
    throw new HttpError(
      409,
      `${email} already has a customer account (${existing.name}). Giving them dashboard access replaces their password with the one you entered.`,
      { code: "CUSTOMER_EXISTS" },
    );
  const passwordHash = await hashPassword(password);
  const member = await prisma.user.upsert({
    where: { email },
    create: { name, email, passwordHash, role },
    update: { name, passwordHash, role, tokenVersion: { increment: 1 } },
    select,
  });
  sendEmail({ to: member.email, ...teamInviteEmail(member, actor.name) }).catch(
    (error) => console.error("Team invite email failed:", error.message),
  );
  return member;
}

export async function updateTeamMember(actor, email, role) {
  if (email === actor.email)
    throw new HttpError(400, "You can't change your own access.");
  const member = await prisma.user.findUnique({ where: { email } });
  if (!member || member.role === "CUSTOMER")
    throw new HttpError(404, "Team member not found.");
  if (member.isOwner) throw ownerOnly("The owner's access can't be changed.");
  if ((member.role === "ADMIN" || role === "ADMIN") && !actor.isOwner)
    throw ownerOnly("Only the owner can change an admin's access.");
  if (member.role === role)
    return prisma.user.findUnique({ where: { email }, select });
  return prisma.user.update({
    where: { email },
    data: { role, tokenVersion: { increment: 1 } },
    select,
  });
}
