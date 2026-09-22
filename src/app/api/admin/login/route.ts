import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const LoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (!admin) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = await createSessionToken({ adminId: admin.id, username: admin.username });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
