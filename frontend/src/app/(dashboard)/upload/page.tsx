import { ResumeUpload } from "@/components/resume/ResumeUpload";

export default function UploadPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Resume</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Supports PDF and DOCX files up to 10 MB. Text is extracted and stored
          for AI analysis.
        </p>
      </div>
      <ResumeUpload />
    </div>
  );
}
