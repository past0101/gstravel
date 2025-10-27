"use client";
import { useParams } from "next/navigation";
import FormRenderer from "@/components/forms/form-renderer";
import Image from "next/image";

export default function PublicEventFormPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId as string;

  if (!eventId) return <div className="p-6">Λείπει το eventId.</div>;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-center">
          <Image src="/logo.webp" alt="Logo" width={160} height={48} priority />
        </div>
        <div className="rounded-xl border bg-white p-4 sm:p-6 shadow">
          <FormRenderer eventId={eventId} mode="public" />
        </div>
      </div>
    </div>
  );
}
