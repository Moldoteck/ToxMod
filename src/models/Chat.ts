import { prop, getModelForClass } from '@typegoose/typegoose'

export class Chat {
    @prop({ required: true, index: true, unique: true })
    id: number

    @prop({ required: true, default: 'en' })
    language: string

    @prop({ required: true, default: 0.65 })
    toxic_thresh: number

    @prop({ required: true, default: 0.7 })
    profan_thresh: number

    @prop({ required: true, default: 0.7 })
    identity_thresh: number

    @prop({ required: true, default: 0.6 })
    insult_thresh: number

    @prop({ required: false, default: [] })
    moderators: Array<number>

    @prop({ required: true, default: true })
    interactive: boolean
}

// Get Chat model
const ChatModel = getModelForClass(Chat, {
    schemaOptions: { timestamps: true },
})

// Get or create chat
export async function findChat(id: number) {
    let chat = await ChatModel.findOne({ id })
    if (!chat) {
        try {
            chat = await new ChatModel({ id }).save()
        } catch (err) {
            chat = await ChatModel.findOne({ id })
        }
    }
    return chat
}

export async function findOnlyChat(id: number) {
    return await ChatModel.findOne({ id })
}

export async function countChats() {
    return await ChatModel.countDocuments({})
}