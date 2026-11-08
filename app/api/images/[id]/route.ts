// app/api/images/[id]/route.ts

import { NextResponse } from "next/server";
import { deleteImage } from "@/app/lib/actions/images";
import { isValidObjectId } from "@iam/shared-types";

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Missing image ID" }, { status: 400 });
    }
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await deleteImage(id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
