"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type EventDoc = {
  id?: string;
  name: string;
  description: string;
  photoBase64?: string;
  location?: string;
  hotel?: string;
  link?: string;
  startDate?: string; // dd/mm/yyyy
  startDateISO?: string; // yyyy-mm-dd (for input)
  createdAt?: any;
  updatedAt?: any;
};

function IconText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M4 6h16M4 10h16M4 14h10M4 18h8" />
    </svg>
  );
}

function IconLocation(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function IconHotel(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M3 21V8a3 3 0 013-3h12a3 3 0 013 3v13" />
      <path d="M6 21v-4h12v4" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </svg>
  );
}

function IconLink(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 10-7.07-7.07L9 5" />
      <path d="M14 11l-4 4" />
    </svg>
  );
}

function IconImage(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export default function EventForm({
  initial,
  onDone,
}: {
  initial?: EventDoc | null;
  onDone: (createdOrUpdated?: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [hotel, setHotel] = useState("");
  const [link, setLink] = useState("");
  const [startDateISO, setStartDateISO] = useState(""); // yyyy-mm-dd
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initial) {
      setName(initial.name || "");
      setDescription(initial.description || "");
      setPhotoBase64(initial.photoBase64);
      setLocation(initial.location || "");
      setHotel(initial.hotel || "");
      setLink(initial.link || "");
      // derive ISO for input if we only have formatted date
      if (initial.startDateISO) {
        setStartDateISO(initial.startDateISO);
      } else if (initial.startDate) {
        const [dd, mm, yyyy] = (initial.startDate as string).split("/");
        if (dd && mm && yyyy) setStartDateISO(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`);
      }
    }
  }, [initial]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formatDDMMYYYY = (iso: string) => {
        if (!iso) return "";
        const [y, m, d] = iso.split("-");
        if (!y || !m || !d) return "";
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      };
      const startDate = formatDDMMYYYY(startDateISO);
      if (initial?.id) {
        const ref = doc(db, "events", initial.id);
        await updateDoc(ref, {
          name,
          description,
          photoBase64: photoBase64 || null,
          location,
          hotel,
          link,
          startDate: startDate || null,
          startDateISO: startDateISO || null,
          updatedAt: serverTimestamp(),
        });
        onDone(initial.id);
      } else {
        const ref = await addDoc(collection(db, "events"), {
          name,
          description,
          photoBase64: photoBase64 || null,
          location,
          hotel,
          link,
          startDate: startDate || null,
          startDateISO: startDateISO || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onDone(ref.id);
      }
    } catch (err: any) {
      setError(err?.message ?? "Αποτυχία αποθήκευσης");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 ">
      <h2 id="event-form-title" className="text-xl font-semibold">
        {initial?.id ? "Επεξεργασία Event" : "Νέο Event"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-600">Ονομασία</span>
          <div className="relative">
            <IconText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              className="w-full rounded-lg border px-10 py-2.5 outline-none focus:ring-2 focus:ring-zinc-300"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-600">Ημερομηνία Έναρξης</span>
          <div className="relative">
            <IconCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="date"
              className="w-full rounded-lg border px-10 py-2.5 outline-none focus:ring-2 focus:ring-zinc-300"
              value={startDateISO}
              onChange={(e) => setStartDateISO(e.target.value)}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-600">Τοποθεσία</span>
          <div className="relative">
            <IconLocation className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              className="w-full rounded-lg border px-10 py-2.5 outline-none focus:ring-2 focus:ring-zinc-300"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-zinc-600">Περιγραφή</span>
          <div className="relative">
            <textarea
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-600">Ξενοδοχείο</span>
          <div className="relative">
            <IconHotel className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              className="w-full rounded-lg border px-10 py-2.5 outline-none focus:ring-2 focus:ring-zinc-300"
              value={hotel}
              onChange={(e) => setHotel(e.target.value)}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-600">
            Σύνδεσμος Event
          </span>
          <div className="relative">
            <IconLink className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="url"
              className="w-full rounded-lg border px-10 py-2.5 outline-none focus:ring-2 focus:ring-zinc-300"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </label>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm text-zinc-600">Φωτογραφία</span>
          <div
            className="relative rounded-xl border border-dashed bg-zinc-50 hover:bg-zinc-100 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {photoBase64 ? (
              <div className="p-2">
                <img
                  src={photoBase64}
                  alt="preview"
                  className="h-48 w-full rounded-lg object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center gap-3 p-6 text-zinc-600">
                <IconImage className="h-6 w-6" />
                <div className="text-sm">
                  Πάτησε για επιλογή εικόνας ή σύρε την εδώ
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onDone()}
          className="rounded-lg border px-4 py-2"
        >
          Άκυρο
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Αποθήκευση..." : "Αποθήκευση"}
        </button>
      </div>
    </form>
  );
}
