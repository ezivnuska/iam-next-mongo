// app/lib/mobile/serializers.ts

export function serializeReport(r: any) {
  const user = r.userId && typeof r.userId === 'object' ? r.userId : null
  return {
    id: r._id.toString(),
    userId: user ? user._id.toString() : r.userId.toString(),
    username: user?.username ?? null,
    avatar: user?.avatar ? serializeResource(user.avatar) : null,
    image: serializeResource(r.imageId) ?? null,
    content: r.content ?? '',
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}

export function serializeResource(obj: any): { id: string; variants: any[] } | null {
  if (!obj || typeof obj !== "object" || !obj._id) return null;
  return { id: obj._id.toString(), variants: obj.variants ?? [] };
}

export function serializeAuthor(author: any) {
  if (!author || typeof author !== "object" || !author._id) return null;
  return {
    id: author._id.toString(),
    username: author.username,
    avatar: serializeResource(author.avatar),
  };
}

export function serializePledge(p: any) {
  const user = p.userId && typeof p.userId === 'object' ? p.userId : null
  const anon = p.anonymous === true
  return {
    id: p._id.toString(),
    userId: user ? user._id.toString() : p.userId.toString(),
    issueId: p.issueId.toString(),
    amount: p.amount,
    createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
    username: anon ? 'Anonymous' : (user?.username ?? ''),
    avatar: anon ? null : (serializeResource(user?.avatar) ?? null),
    applicantId: p.applicantId ? p.applicantId.toString() : null,
    rescindIfLost: p.rescindIfLost ?? false,
    anonymous: anon,
  }
}

export function serializeApplicant(a: any) {
  const user = a.userId && typeof a.userId === 'object' ? a.userId : null
  const startImg = a.startImageId && typeof a.startImageId === 'object' ? a.startImageId : null
  return {
    id: a._id.toString(),
    userId: user ? user._id.toString() : a.userId.toString(),
    issueId: a.issueId.toString(),
    username: user?.username ?? null,
    avatar: user?.avatar ? serializeResource(user.avatar) : null,
    createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
    status: a.status ?? 'pending',
    rate: a.rate ?? null,
    acceptedAt: a.acceptedAt ? a.acceptedAt.toISOString() : null,
    completionDeadline: a.completionDeadline ? a.completionDeadline.toISOString() : null,
    startedAt: a.startedAt ? a.startedAt.toISOString() : null,
    startImage: startImg ? {
      id: startImg._id.toString(),
      variants: (startImg.variants ?? []).map((v: any) => ({ size: v.size, filename: v.filename, width: v.width, height: v.height, url: v.url })),
      createdAt: startImg.createdAt?.toISOString() ?? new Date().toISOString(),
    } : null,
    votes: Array.isArray(a.votes)
      ? a.votes.map((v: any) => ({ userId: v.userId.toString(), vote: v.vote }))
      : [],
  }
}

export function serializeCompletion(c: any, issueId?: string) {
  return {
    id: c._id.toString(),
    issueId: issueId ?? c.issueId?.toString(),
    applicantId: c.applicantId.toString(),
    username: c.workerUsername ?? null,
    avatar: c.workerAvatar ?? null,
    images: Array.isArray(c.images)
      ? c.images.map((img: any) => serializeResource(img)).filter(Boolean)
      : [],
    reviews: Array.isArray(c.reviews)
      ? c.reviews.map((r: any) => ({ userId: r.userId.toString(), vote: r.vote }))
      : [],
    status: c.status ?? 'pending',
    createdAt: c.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: c.status === 'approved' ? (c.updatedAt?.toISOString() ?? null) : null,
    autoApproveAt: c.autoApproveAt ? c.autoApproveAt.toISOString() : null,
  }
}

export function serializeIssue(n: any) {
  const result: Record<string, any> = {
    id: n._id.toString(),
    issueType: n.issueType,
    title: n.title ?? null,
    content: n.content ?? "",
    status: n.status ?? 'open',
    pledged: Array.isArray(n.pledged) ? n.pledged.map(serializePledge) : [],
    applicants: Array.isArray(n.applicants) ? n.applicants.map(serializeApplicant) : [],
    acceptedApplicantId: n.acceptedApplicantId ? n.acceptedApplicantId.toString() : null,
    createdAt: n.createdAt?.toISOString() ?? new Date().toISOString(),
  };
  if (n.location?.latitude != null && n.location?.longitude != null) {
    result.location = { latitude: n.location.latitude, longitude: n.location.longitude };
  }
  result.locationVisible = n.locationVisible === true;
  const completionStatus = n.completion?.status ?? n.completionStatus ?? null
  if (completionStatus != null) result.completionStatus = completionStatus
  const rawAutoApproveAt = n.completion?.autoApproveAt
  if (rawAutoApproveAt) {
    result.autoApproveAt = rawAutoApproveAt instanceof Date ? rawAutoApproveAt.toISOString() : rawAutoApproveAt
  }
  if (n.flagged === true) result.flagged = true
  // Support both new `images[]` and legacy `image` field on old documents
  const imageDocs = Array.isArray(n.images) && n.images.length > 0
    ? n.images
    : n.image ? [n.image] : []
  const serializedImages = imageDocs.map(serializeResource).filter(Boolean)
  if (serializedImages.length > 0) result.images = serializedImages
  const author = serializeAuthor(n.author);
  if (author) result.author = author;
  if (Array.isArray(n.previousCompletions) && n.previousCompletions.length > 0) {
    const issueId = n._id.toString()
    result.previousCompletions = n.previousCompletions.map((c: any) => serializeCompletion(c, issueId))
  }
  if (Array.isArray(n.reports) && n.reports.length > 0)
    result.reports = n.reports.map(serializeReport)
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
