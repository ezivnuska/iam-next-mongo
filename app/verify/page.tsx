import Link from "next/link";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

async function verifyToken(token: string): Promise<"success" | "invalid" | "error"> {
  try {
    const { connectToDatabase } = await import("@/app/lib/mongoose");
    const { default: UserModel } = await import("@/app/lib/models/user");

    await connectToDatabase();

    const user = await UserModel.findOne({
      verifyToken: token,
      verifyTokenExpires: { $gt: new Date() },
    });

    if (!user) return "invalid";

    user.verified = true;
    user.emailVerified = new Date();
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    return "success";
  } catch {
    return "error";
  }
}

export default async function VerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyLayout title="Invalid link" message="No verification token was provided." showSignIn={false} />;
  }

  const result = await verifyToken(token);

  if (result === "success") {
    return (
      <VerifyLayout
        title="Email verified"
        message="Your email address has been verified. You can now sign in."
        showSignIn
      />
    );
  }

  if (result === "invalid") {
    return (
      <VerifyLayout
        title="Link expired or invalid"
        message="This verification link is invalid or has expired. Sign in to request a new one."
        showSignIn
      />
    );
  }

  return <VerifyLayout title="Something went wrong" message="Please try again later." showSignIn={false} />;
}

function VerifyLayout({
  title,
  message,
  showSignIn,
}: {
  title: string;
  message: string;
  showSignIn: boolean;
}) {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <h1 className="text-[32px] font-bold">iameric</h1>
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
          <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-700">{message}</p>
          {showSignIn && (
            <Link
              href="/"
              className="mt-4 inline-block text-sm text-blue-600 underline"
            >
              Go to sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
