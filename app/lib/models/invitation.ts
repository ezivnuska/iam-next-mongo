if (typeof window !== 'undefined') throw new Error('Server-only module');

import mongoose, { Schema, Model } from 'mongoose';

interface IInvitation {
    inviterId: mongoose.Types.ObjectId;
    inviteeEmail: string;
    token: string;
    used: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
    {
        inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
        token: { type: String, required: true, unique: true },
        used: { type: Boolean, default: false },
    },
    { timestamps: true }
);

invitationSchema.index({ inviteeEmail: 1 });
invitationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30-day TTL

const Invitation: Model<IInvitation> =
    mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', invitationSchema);

export default Invitation;
