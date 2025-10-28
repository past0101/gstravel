"use client";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, deleteDoc, where, writeBatch } from "firebase/firestore";
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
  const [qText, setQText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [deletingAll, setDeletingAll] = useState(false);

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

  // transliteration + search normalize (like events page)
  const transliterateElToLat = (s: string) => {
    const map: Record<string, string> = {
      'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i','θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','φ':'f','χ':'h','ψ':'ps','ω':'o',
      'ά':'a','έ':'e','ί':'i','ϊ':'i','ΐ':'i','ό':'o','ύ':'y','ϋ':'y','ΰ':'y','ή':'i','ώ':'o',
      'Α':'a','Β':'b','Γ':'g','Δ':'d','Ε':'e','Ζ':'z','Η':'i','Θ':'th','Ι':'i','Κ':'k','Λ':'l','Μ':'m','Ν':'n','Ξ':'x','Ο':'o','Π':'p','Ρ':'r','Σ':'s','Τ':'t','Υ':'y','Φ':'f','Χ':'h','Ψ':'ps','Ω':'o',
      'Ά':'a','Έ':'e','Ί':'i','Ϊ':'i','Ό':'o','Ύ':'y','Ϋ':'y','Ή':'i','Ώ':'o'
    };
    return s.split("").map(ch => map[ch] ?? ch).join("");
  };
  const normalize = (s: string) => transliterateElToLat(s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());

  const filteredSubs = useMemo<Submission[]>(() => {
    const q = normalize(qText);
    if (!q) return subs;
    return subs.filter((s: Submission) => {
      const base = [
        s.mode || "",
        (s as any).submittedByEmail || "",
        s.submittedAt?.toDate ? s.submittedAt.toDate().toLocaleString() : "",
      ].join(" ");
      const valuesStr = Object.values(s.values || {}).flat().join(" ");
      const hay = normalize(`${base} ${valuesStr}`);
      return hay.includes(q);
    });
  }, [subs, qText]);

  const startEdit = (s: Submission) => {
    setEditingId(s.id);
    setEditingValues({ ...(s.values || {}) });
  };
  const cancelEdit = () => { setEditingId(null); setEditingValues({}); };
  const saveEdit = async (s: Submission) => {
    await updateDoc(doc(db, "eventSubmissions", s.id), { values: editingValues });
    setEditingId(null);
    setEditingValues({});
  };
  const removeRow = async (s: Submission) => {
    if (!confirm("Διαγραφή εγγραφής;")) return;
    await deleteDoc(doc(db, "eventSubmissions", s.id));
  };

  const deleteAllForEvent = async () => {
    if (!selected) return;
    if (!confirm("Θέλεις σίγουρα να διαγράψεις ΟΛΕΣ τις καταχωρήσεις του επιλεγμένου event; Η ενέργεια δεν αναιρείται.")) return;
    setDeletingAll(true);
    try {
      const q = query(collection(db, "eventSubmissions"), where("eventId", "==", selected.id));
      const snap = await getDocs(q);
      if (snap.empty) { setDeletingAll(false); return; }
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } finally {
      setDeletingAll(false);
    }
  };

  const deleteAllForEventId = async (eventId: string, eventName?: string) => {
    if (!eventId) return;
    if (!confirm(`Να διαγραφούν ΟΛΕΣ οι καταχωρήσεις για το event "${eventName || eventId}";`)) return;
    try {
      const q = query(collection(db, "eventSubmissions"), where("eventId", "==", eventId));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {}
  };

  if (!selected) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Λίστες Υποβολών</h1>
          <p className="text-sm text-slate-500 mt-1">Επίλεξε ένα event για να δεις τις καταχωρήσεις της φόρμας.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition flex items-center justify-between gap-3">
              <button
                onClick={() => setSelected(ev)}
                className="min-w-0 text-left flex-1"
                title="Άνοιγμα λίστας"
              >
                <div className="font-medium text-slate-800 truncate">{ev.name}</div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteAllForEventId(ev.id, ev.name); }}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 text-red-700 px-3 py-2 hover:bg-red-50 active:bg-red-100 transition-colors duration-200"
                title="Διαγραφή όλων των καταχωρήσεων για αυτό το event"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Διαγραφή
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50 transition-colors duration-200">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Πίσω στα events
        </button>
        <h2 className="text-xl font-semibold text-slate-800">{selected.name}</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Αναζήτηση (υποστηρίζει και λατινικά)"
              className="rounded-lg border border-slate-300 px-3 py-2 w-[240px] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
            />
          </div>
          <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-md bg-cyan-600 text-white px-3 py-2 shadow-sm hover:bg-cyan-700 active:bg-cyan-800 transition-colors duration-200">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>
            Export Excel
          </button>
          <button onClick={deleteAllForEvent} disabled={deletingAll} className="inline-flex items-center gap-2 rounded-md border border-red-300 text-red-700 px-3 py-2 hover:bg-red-50 active:bg-red-100 transition-colors duration-200">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            {deletingAll ? 'Διαγραφή...' : 'Διαγραφή όλων'}
          </button>
        </div>
      </div>
      {/* Mobile search */}
      <div className="sm:hidden mb-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Αναζήτηση (λατινικά/ελληνικά)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Φόρτωση...</div>
      ) : subs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">Δεν υπάρχουν καταχωρήσεις για αυτό το event.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Ημ/νία</th>
                  <th className="px-3 py-2 text-left">Προέλευση</th>
                  <th className="px-3 py-2 text-left">GDPR</th>
                  <th className="px-3 py-2 text-left">User</th>
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left">{c}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s) => (
                  <tr key={s.id} className="border-t align-top">
                    <td className="px-3 py-2">{s.submittedAt?.toDate ? s.submittedAt.toDate().toLocaleString() : ""}</td>
                    <td className="px-3 py-2">{s.mode}</td>
                    <td className="px-3 py-2">{s.gdprAccepted ? "Ναι" : "Όχι"}</td>
                    <td className="px-3 py-2">{(s as any).submittedByEmail || '-'}</td>
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2">
                        {editingId === s.id ? (
                          <input
                            className="w-full rounded-md border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            value={Array.isArray(editingValues?.[c]) ? (editingValues[c] as any[]).join(', ') : (editingValues?.[c] ?? '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingValues((prev) => ({ ...prev, [c]: val.includes(',') ? val.split(',').map(v => v.trim()) : val }));
                            }}
                          />
                        ) : (
                          <span>
                            {Array.isArray(s.values?.[c]) ? (s.values[c] as any[]).join(', ') : (s.values?.[c] ?? '')}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {editingId === s.id ? (
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => saveEdit(s)} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 text-white px-2.5 py-1.5 hover:bg-cyan-700 active:bg-cyan-800 transition-colors duration-200" title="Αποθήκευση">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>
                            Save
                          </button>
                          <button onClick={cancelEdit} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 transition-colors duration-200" title="Άκυρο">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6"/><path d="M6 6l12 12"/></svg>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => startEdit(s)} className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 transition-colors duration-200" title="Επεξεργασία">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h6l12-12a2.828 2.828 0 10-4-4L5 17l-2 4z"/></svg>
                          </button>
                          <button onClick={() => removeRow(s)} className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-red-600 hover:bg-slate-50 transition-colors duration-200" title="Διαγραφή">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filteredSubs.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-slate-600">
                    {s.submittedAt?.toDate ? s.submittedAt.toDate().toLocaleString() : ""}
                  </div>
                  <div className="inline-flex items-center gap-2">
                    {editingId === s.id ? (
                      <>
                        <button onClick={() => saveEdit(s)} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 text-white px-2.5 py-1.5" title="Αποθήκευση">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>
                          Save
                        </button>
                        <button onClick={cancelEdit} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5" title="Άκυρο">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6"/><path d="M6 6l12 12"/></svg>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(s)} className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5" title="Επεξεργασία">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h6l12-12a2.828 2.828 0 10-4-4L5 17l-2 4z"/></svg>
                        </button>
                        <button onClick={() => removeRow(s)} className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-red-600" title="Διαγραφή">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{s.mode || '-'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">GDPR: {s.gdprAccepted ? 'Ναι' : 'Όχι'}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">User: {(s as any).submittedByEmail || '-'}</div>
                <div className="mt-3 space-y-2">
                  {columns.map((c) => (
                    <div key={c} className="grid grid-cols-1 gap-1">
                      <div className="text-xs font-medium text-slate-600">{c}</div>
                      {editingId === s.id ? (
                        <input
                          className="rounded-md border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                          value={Array.isArray(editingValues?.[c]) ? (editingValues[c] as any[]).join(', ') : (editingValues?.[c] ?? '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingValues((prev) => ({ ...prev, [c]: val.includes(',') ? val.split(',').map(v => v.trim()) : val }));
                          }}
                        />
                      ) : (
                        <div className="text-sm text-slate-700">
                          {Array.isArray(s.values?.[c]) ? (s.values[c] as any[]).join(', ') : (s.values?.[c] ?? '')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
