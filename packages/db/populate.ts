export const USER_WITH_AVATAR_POPULATE = {
    path: 'userId',
    select: '_id username avatar',
    populate: { path: 'avatar', select: '_id variants' },
} as const

export const APPLICANT_USER_POPULATE = USER_WITH_AVATAR_POPULATE

export const APPLICANT_FULL_POPULATE = [
    { path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
    { path: 'startImageId', select: '_id variants createdAt' },
]
