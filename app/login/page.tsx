"use client";
import { FormEvent, useState } from "react";
import Image from "next/image";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Αποτυχία σύνδεσης");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-xl shadow space-y-4"
      >
        <div className="flex justify-center mb-2">
          <Image src="/logo.webp" alt="Logo" width={160} height={48} priority />
        </div>
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
        <label className="block">
          <span className="text-sm">Κωδικός</span>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Να με θυμάσαι σε αυτήν τη συσκευή
        </label>
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
          {loading ? "Σύνδεση..." : "Σύνδεση"}
        </button>
        <div className="text-sm text-right">
          <Link href="/reset-password" className="text-zinc-600 hover:underline">
            Ξέχασες τον κωδικό;
          </Link>
        </div>
      </form>
    </div>
  );
}
