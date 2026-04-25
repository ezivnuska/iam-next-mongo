// app/lib/mobile/serializers.ts

export function serializeResource(obj: any): { id: string; variants: any[] } | null {
  if (!obj || typeof obj !== "object" || !obj._id) return null;
  return { id: obj._id.toString(), variants: obj.variants ?? [] };
}

export function serializeAuthor(author: any): { id: string; username: string; avatar: { id: string; variants: any[] } | null } | null {
  if (!author || typeof author !== "object" || !author._id) return null;
  return {
    id: author._id.toString(),
    username: author.username,
    avatar: serializeResource(author.avatar),
  };
}

export function serializePledge(p: any) {
  const user = p.userId && typeof p.userId === 'object' ? p.userId : null
  return {
    id: p._id.toString(),
    userId: user ? user._id.toString() : p.userId.toString(),
    needId: p.needId.toString(),
    amount: p.amount,
    createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
    username: user?.username ?? '',
    avatar: serializeResource(user?.avatar) ?? null,
  }
}

export function serializeApplicant(a: any) {
  return {
    id: a._id.toString(),
    userId: a.userId.toString(),
    needId: a.needId.toString(),
    createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
    status: a.status ?? 'pending',
    votes: Array.isArray(a.votes)
      ? a.votes.map((v: any) => ({ userId: v.userId.toString(), vote: v.vote }))
      : [],
  }
}

export function serializeNeed(n: any) {
  const result: Record<string, any> = {
    id: n._id.toString(),
    title: n.title ?? "",
    content: n.content ?? "",
    status: n.status ?? 'open',
    pledged: Array.isArray(n.pledged) ? n.pledged.map(serializePledge) : [],
    applicants: Array.isArray(n.applicants) ? n.applicants.map(serializeApplicant) : [],
    createdAt: n.createdAt?.toISOString() ?? new Date().toISOString(),
  };
  if (n.location?.latitude != null && n.location?.longitude != null) {
    result.location = { latitude: n.location.latitude, longitude: n.location.longitude };
  }
  result.locationVisible = n.locationVisible === true;
  const image = serializeResource(n.image);
  if (image) result.image = image;
  const author = serializeAuthor(n.author);
  if (author) result.author = author;
  return result;
}

// For routes that build a friendship map keyed by the other user's ID
export function serializeFriendshipEntry(
  entry: { id: string; status: string; role: "requester" | "recipient" } | undefined
): { id: string; status: string } | null {
  if (!entry) return null;
  if (entry.status === "accepted") return { id: entry.id, status: "accepted" };
  if (entry.status === "pending") {
    return { id: entry.id, status: entry.role === "requester" ? "pending_sent" : "pending_received" };
  }
  return null; // rejected
}

// For routes that fetch a single friendship document
export function serializeFriendship(
  friendship: any,
  currentUserId: string
): { id: string; status: string } | null {
  if (!friendship) return null;
  const requesterId = friendship.requester.toString();
  const role = requesterId === currentUserId ? "requester" : "recipient";
  return serializeFriendshipEntry({
    id: friendship._id.toString(),
    status: friendship.status,
    role,
  });
}
