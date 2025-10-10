// app/lib/models/memory.ts

import { Schema, model } from 'mongoose'

const memorySchema = new Schema({
    author: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    date: { type: Date, required: true },
    title: {
        type: String,
        required: false
    },
    content: {
        type: String,
        required: true
    },
    shared: {
        type: Boolean,
        default: false
    },
    image: {
        type: Schema.Types.ObjectId,
        ref: 'Image',
        required: false
    },
},
{
    timestamps: true
})

memorySchema.pre('save', function(next) {
    this.title = this.title || 'Untitled'
    next()
})

export default model('Memory', memorySchema)
