// app/lib/models/friendship.ts

import mongoose, { Schema } from 'mongoose'

const friendshipSchema = new Schema({
	requester: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	recipient: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	status: {
		type: String,
		enum: ['pending', 'accepted', 'rejected'],
		default: 'pending',
	},
}, {
	timestamps: true,
    toJSON: {
    //   virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
})

// Compound index to prevent duplicate friendships
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true })

// Index for querying friendships by user
friendshipSchema.index({ requester: 1, status: 1 })
friendshipSchema.index({ recipient: 1, status: 1 })

export default mongoose.models.Friendship || mongoose.model('Friendship', friendshipSchema)
