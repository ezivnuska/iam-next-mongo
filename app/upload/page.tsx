// app/upload/page.tsx

import UploadForm from "@/app/ui/upload-form";

export const metadata = {
  title: "Upload File",
  description: "Upload an image to the server",
};

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-semibold text-gray-800">Upload a File</h1>
        <UploadForm />
      </div>
    </div>
  );
}
