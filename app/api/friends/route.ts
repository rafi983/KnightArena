import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

// GET: List friends and pending requests
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true, rating: true } },
      receiver: { select: { id: true, name: true, email: true, rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({
      id: f.id,
      friend: f.requesterId === userId ? f.receiver : f.requester,
    }));

  const pendingReceived = friendships
    .filter((f) => f.status === "pending" && f.receiverId === userId)
    .map((f) => ({
      id: f.id,
      from: f.requester,
    }));

  const pendingSent = friendships
    .filter((f) => f.status === "pending" && f.requesterId === userId)
    .map((f) => ({
      id: f.id,
      to: f.receiver,
    }));

  return NextResponse.json({ friends, pendingReceived, pendingSent });
}

// POST: Send friend request
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.id === userId) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  // Check existing friendship
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: targetUser.id },
        { requesterId: targetUser.id, receiverId: userId },
      ],
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Friendship already exists or pending" },
      { status: 409 }
    );
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId: userId,
      receiverId: targetUser.id,
    },
  });

  return NextResponse.json(friendship, { status: 201 });
}
