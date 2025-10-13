// app/api/posts/[id]/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Post from "@/app/lib/models/post";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    await connectToDatabase();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if the current user is the author or an admin
    const isAuthor = post.author.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Post.findByIdAndDelete(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
