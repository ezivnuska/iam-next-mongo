// app/lib/mobile/serializers.ts

type LeanDoc = { _id: { toString(): string }; [key: string]: unknown }
type LeanVariant = { size?: string; filename?: string; width?: number; height?: number; url?: string }
type LeanResource = { _id: { toString(): string }; variants?: LeanVariant[] }
type LeanUser = { _id: { toString(): string }; username?: string; avatar?: LeanResource }

export function serializeReport(r: LeanDoc) {
  const user = r.userId && typeof r.userId === 'object' ? r.userId as LeanUser : null
  return {
    id: r._id.toString(),
    userId: user ? user._id.toString() : (r.userId as { toString(): string }).toString(),
    username: user?.username ?? null,
    avatar: user?.avatar ? serializeResource(user.avatar) : null,
    image: serializeResource(r.imageId as LeanResource | null) ?? null,
    content: (r.content as string) ?? '',
    createdAt: (r.createdAt as { toISOString(): string } | undefined)?.toISOString() ?? new Date().toISOString(),
  }
}

export function serializeResource(obj: unknown): { id: string; variants: LeanVariant[] } | null {
  if (!obj || typeof obj !== "object") return null;
  const doc = obj as Partial<LeanResource>;
  if (!doc._id) return null;
  return { id: doc._id.toString(), variants: doc.variants ?? [] };
}

export function serializeAuthor(author: unknown) {
  if (!author || typeof author !== "object") return null;
  const a = author as Partial<LeanUser>;
  if (!a._id) return null;
  return {
    id: a._id.toString(),
    username: a.username,
    avatar: serializeResource(a.avatar),
  };
}

export function serializePledge(p: LeanDoc) {
  const user = p.userId && typeof p.userId === 'object' ? p.userId as LeanUser : null
  const anon = p.anonymous === true
  return {
    id: p._id.toString(),
    userId: user ? user._id.toString() : (p.userId as { toString(): string }).toString(),
    issueId: (p.issueId as { toString(): string }).toString(),
    amount: p.amount as number,
    createdAt: (p.createdAt as { toISOString(): string } | undefined)?.toISOString() ?? new Date().toISOString(),
    username: anon ? 'Anonymous' : (user?.username ?? ''),
    avatar: anon ? null : (serializeResource(user?.avatar) ?? null),
    applicantId: p.applicantId ? (p.applicantId as { toString(): string }).toString() : null,
    rescindIfLost: (p.rescindIfLost as boolean | undefined) ?? false,
    anonymous: anon,
  }
}

export function serializeApplicant(a: LeanDoc) {
  const user = a.userId && typeof a.userId === 'object' ? a.userId as LeanUser : null
  const startImg = a.startImageId && typeof a.startImageId === 'object' ? a.startImageId as LeanResource : null
  return {
    id: a._id.toString(),
    userId: user ? user._id.toString() : (a.userId as { toString(): string }).toString(),
    issueId: (a.issueId as { toString(): string }).toString(),
    username: user?.username ?? null,
    avatar: user?.avatar ? serializeResource(user.avatar) : null,
    createdAt: (a.createdAt as { toISOString(): string } | undefined)?.toISOString() ?? new Date().toISOString(),
    status: (a.status as string | undefined) ?? 'pending',
    rate: (a.rate as number | null | undefined) ?? null,
    acceptedAt: a.acceptedAt ? (a.acceptedAt as { toISOString(): string }).toISOString() : null,
    completionDeadline: a.completionDeadline ? (a.completionDeadline as { toISOString(): string }).toISOString() : null,
    startedAt: a.startedAt ? (a.startedAt as { toISOString(): string }).toISOString() : null,
    startImage: startImg ? {
      id: startImg._id.toString(),
      variants: (startImg.variants ?? []).map(v => ({ size: v.size, filename: v.filename, width: v.width, height: v.height, url: v.url })),
      createdAt: (a.startImageId as LeanDoc & { createdAt?: { toISOString(): string } })?.createdAt?.toISOString() ?? new Date().toISOString(),
    } : null,
    votes: Array.isArray(a.votes)
      ? (a.votes as Array<{ userId: { toString(): string }; vote: string }>).map(v => ({ userId: v.userId.toString(), vote: v.vote }))
      : [],
  }
}

export function serializeCompletion(c: LeanDoc, issueId?: string) {
  const worker = c.workerUserId && typeof c.workerUserId === 'object' ? c.workerUserId as LeanUser : null
  return {
    id: c._id.toString(),
    issueId: issueId ?? (c.issueId as { toString(): string } | undefined)?.toString(),
    workerUserId: worker ? worker._id.toString() : ((c.workerUserId as { toString(): string } | undefined)?.toString() ?? null),
    username: worker?.username ?? null,
    avatar: worker?.avatar ? serializeResource(worker.avatar) : null,
    images: Array.isArray(c.images)
      ? (c.images as unknown[]).map(img => serializeResource(img)).filter(Boolean)
      : [],
    reviews: Array.isArray(c.reviews)
      ? (c.reviews as Array<{ userId: { toString(): string }; vote: string }>).map(r => ({ userId: r.userId.toString(), vote: r.vote }))
      : [],
    status: (c.status as string | undefined) ?? 'pending',
    createdAt: (c.createdAt as { toISOString(): string } | undefined)?.toISOString() ?? new Date().toISOString(),
    completedAt: c.status === 'approved' ? ((c.updatedAt as { toISOString(): string } | undefined)?.toISOString() ?? null) : null,
    autoApproveAt: c.autoApproveAt ? (c.autoApproveAt as { toISOString(): string }).toISOString() : null,
    payoutAmount: (c.payoutAmount as number | null | undefined) ?? null,
    totalPledged: (c.totalPledged as number | null | undefined) ?? null,
  }
}

export function serializeIssue(n: LeanDoc) {
  const result: Record<string, unknown> = {
    id: n._id.toString(),
    issueType: n.issueType,
    title: (n.title as string | undefined) ?? null,
    content: (n.content as string | undefined) ?? "",
    status: (n.status as string | undefined) ?? 'open',
    pledged: Array.isArray(n.pledged) ? (n.pledged as LeanDoc[]).map(serializePledge) : [],
    applicants: Array.isArray(n.applicants) ? (n.applicants as LeanDoc[]).map(serializeApplicant) : [],
    acceptedApplicantId: n.acceptedApplicantId ? (n.acceptedApplicantId as { toString(): string }).toString() : null,
    createdAt: (n.createdAt as { toISOString(): string } | undefined)?.toISOString() ?? new Date().toISOString(),
  };
  const loc = n.location as { latitude?: number; longitude?: number } | undefined;
  if (loc?.latitude != null && loc?.longitude != null) {
    result['location'] = { latitude: loc.latitude, longitude: loc.longitude };
  }
  result['locationVisible'] = n.locationVisible === true;
  const completionStatus = n.completionStatus ?? null
  if (completionStatus != null) result['completionStatus'] = completionStatus
  if (n.flagged === true) result['flagged'] = true
  const imageDocs = Array.isArray(n.images) && (n.images as unknown[]).length > 0
    ? n.images as unknown[]
    : n.image ? [n.image] : []
  const serializedImages = imageDocs.map(img => serializeResource(img)).filter(Boolean)
  if (serializedImages.length > 0) result['images'] = serializedImages
  const author = serializeAuthor(n.author);
  if (author) result['author'] = author;
  if (Array.isArray(n.reports) && (n.reports as unknown[]).length > 0)
    result['reports'] = (n.reports as LeanDoc[]).map(serializeReport)
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
  friendship: LeanDoc | null,
  currentUserId: string
): { id: string; status: string } | null {
  if (!friendship) return null;
  const requesterId = (friendship['requester'] as { toString(): string }).toString();
  const role = requesterId === currentUserId ? "requester" : "recipient";
  return serializeFriendshipEntry({
    id: friendship._id.toString(),
    status: friendship['status'] as string,
    role,
  });
}
