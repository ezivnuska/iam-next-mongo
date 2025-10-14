// app/api/images/[id]/route.ts

import { NextResponse } from "next/server";
import { deleteImage } from "@/app/lib/actions/images";

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Missing image ID" }, { status: 400 });
    }

    await deleteImage(id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
