"use client";
import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Αποτυχία αποστολής email επαναφοράς");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex justify-center mb-2">
          <Image src="/logo.webp" alt="Logo" width={160} height={48} priority />
        </div>
        <h1 className="text-lg font-medium">Επαναφορά κωδικού</h1>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {sent && (
          <div className="text-sm text-green-700">
            Στάλθηκε email επαναφοράς στο {email}. Έλεγξε τα εισερχόμενα σου.
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600" role="alert">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black text-white py-2 hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Αποστολή..." : "Αποστολή συνδέσμου"}
        </button>
        <div className="text-sm text-center">
          <Link href="/login" className="text-zinc-600 hover:underline">
            Επιστροφή στη σύνδεση
          </Link>
        </div>
      </form>
    </div>
  );
}
