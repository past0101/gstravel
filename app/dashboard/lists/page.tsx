"use client";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { collection, doc, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Submission = {
  id: string;
  eventId: string;
  values: Record<string, any>;
  mode?: string;
  gdprAccepted?: boolean;
  submittedByUid?: string | null;
  submittedAt?: any;
};

export default function ListsPage() {
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "events"));
      const list = snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id }));
      setEvents(list);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    const q = query(collection(db, "eventSubmissions"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Submission[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((s) => s.eventId === selected.id);
      setSubs(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [selected]);

  const columns = useMemo(() => {
    const set = new Set<string>();
    subs.forEach((s) => Object.keys(s.values || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [subs]);

  const exportExcel = async () => {
    // Build rows as objects to preserve Greek headers
    const rows = subs.map((s) => {
      const base: Record<string, any> = {
        "Ημ/νία": s.submittedAt?.toDate ? s.submittedAt.toDate().toLocaleString() : "",
        "Προέλευση": s.mode || "",
        "GDPR": s.gdprAccepted ? "Ναι" : "Όχι",
        "User": (s as any).submittedByEmail || "-",
      };
      columns.forEach((c) => {
        const v = s.values?.[c];
        base[c] = Array.isArray(v) ? v.join("; ") : (v ?? "");
      });
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows, { header: ["Ημ/νία", "Προέλευση", "GDPR", "User", ...columns] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Υποβολές");
    const filename = `${selected?.name || selected?.id || "submissions"}.xlsx`;
    XLSX.writeFile(wb, filename, { compression: true });
  };

  if (!selected) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Λίστες Υποβολών</h1>
          <p className="text-sm text-zinc-600 mt-1">Επίλεξε ένα event για να δεις τις καταχωρήσεις της φόρμας.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelected(ev)}
              className="text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow transition"
            >
              <div className="font-medium truncate">{ev.name}</div>
              <div className="text-xs text-zinc-500 mt-1">ID: {ev.id}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setSelected(null)} className="rounded-lg border px-3 py-2">← Πίσω στα events</button>
        <h2 className="text-xl font-semibold">{selected.name}</h2>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportExcel} className="rounded-lg border px-3 py-2">Export Excel</button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-600">Φόρτωση...</div>
      ) : subs.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-zinc-600">Δεν υπάρχουν καταχωρήσεις για αυτό το event.</div>
      ) : (
        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-3 py-2 text-left">Ημ/νία</th>
                <th className="px-3 py-2 text-left">Προέλευση</th>
                <th className="px-3 py-2 text-left">GDPR</th>
                <th className="px-3 py-2 text-left">User</th>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2 text-left">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.submittedAt?.toDate ? s.submittedAt.toDate().toLocaleString() : ""}</td>
                  <td className="px-3 py-2">{s.mode}</td>
                  <td className="px-3 py-2">{s.gdprAccepted ? "Ναι" : "Όχι"}</td>
                  <td className="px-3 py-2">{(s as any).submittedByEmail || '-'}</td>
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-2">
                      {Array.isArray(s.values?.[c]) ? (s.values[c] as any[]).join(", ") : (s.values?.[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
