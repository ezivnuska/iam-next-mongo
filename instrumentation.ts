import connectDB from '@/app/lib/connect'

export async function register() {
    await connectDB()
}