"use client";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/modal";
import { useAuth } from "@/components/auth-provider";
import type { FormField } from "./form-builder";

export default function FormRenderer({ eventId, mode = "internal" }: { eventId: string; mode?: "internal" | "public" }) {
  const { user } = useAuth?.() || { user: null } as any;
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [eventName, setEventName] = useState<string>("");
  const [eventMeta, setEventMeta] = useState<{ startDate?: string; location?: string; hotel?: string; description?: string; photoBase64?: string } | null>(null);
  const [gdprOpen, setGdprOpen] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "eventForms", eventId), (snap) => {
      const data = snap.data() as any;
      setFields((data?.fields || []).map((f: FormField, idx: number) => ({
        id: f.id || `f_${idx}`,
        label: f.label,
        type: f.type,
        required: !!f.required,
        options: f.options || [],
      })));
      setLoading(false);
    }, (e) => {
      setError(e.message);
      setLoading(false);
    });
    getDoc(doc(db, "events", eventId)).then((d) => {
      const data = d.data() as any;
      setEventName(data?.name || "");
      setEventMeta({
        startDate: data?.startDate,
        location: data?.location,
        hotel: data?.hotel,
        description: data?.description,
        photoBase64: data?.photoBase64,
      });
    });
    return () => unsub();
  }, [eventId]);

  const onChange = (label: string, v: any) => {
    setValues((prev) => ({ ...prev, [label]: v }));
    if (fieldErrors[label]) {
      setFieldErrors((prev) => ({ ...prev, [label]: "" }));
    }
  };

  const submit = async () => {
    setError("");
    // validate required fields
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.label];
      if (f.type === "text" || f.type === "number" || f.type === "date" || f.type === "select" || f.type === "email" || f.type === "phone") {
        if (v === undefined || v === null || String(v).trim() === "") {
          errs[f.label] = "Απαιτείται";
        }
      } else if (f.type === "radio") {
        if (!v || String(v).trim() === "") {
          errs[f.label] = "Επιλέξτε μία επιλογή";
        }
      } else if (f.type === "checkbox") {
        if (!Array.isArray(v) || v.length === 0) {
          errs[f.label] = "Επιλέξτε τουλάχιστον μία επιλογή";
        }
      }
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Συμπλήρωσε τα υποχρεωτικά πεδία.");
      return;
    }
    if (mode === "public" && !gdprAccepted) {
      setError("Απαιτείται αποδοχή της ενημέρωσης προστασίας δεδομένων (GDPR).");
      return;
    }
    // extra format checks
    for (const f of fields) {
      const v = values[f.label];
      if (f.type === "email" && v) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(String(v))) {
          errs[f.label] = "Μη έγκυρο email";
        }
      }
      if (f.type === "phone" && v) {
        // Επιτρέπει διεθνείς + ελληνικούς αριθμούς με/χωρίς κενά και παύλες
        const phoneRe = /^\+?\d{1,3}?[\s-]?\(?\d{1,4}\)?([\s-]?\d{2,4}){2,4}$/;
        if (!phoneRe.test(String(v))) {
          errs[f.label] = "Μη έγκυρο τηλέφωνο";
        }
      }
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError("Διόρθωσε τα λάθη και ξαναπροσπάθησε.");
      return;
    }

    try {
      await addDoc(collection(db, "eventSubmissions"), {
        eventId,
        values,
        mode,
        gdprAccepted: mode === "public" ? !!gdprAccepted : true,
        submittedByUid: mode === "internal" ? (user?.uid || null) : null,
        submittedAt: serverTimestamp(),
      });
      setValues({});
      setFieldErrors({});
      setGdprAccepted(false);
      alert("Η καταχώρηση ολοκληρώθηκε.");
    } catch (e: any) {
      setError(e.message || "Αποτυχία καταχώρησης");
    }
  };

  const isEmpty = useMemo(() => fields.length === 0, [fields]);

  if (loading) return <div className="text-sm text-zinc-600">Φόρτωση φόρμας...</div>;
  if (isEmpty) return <div className="text-sm text-zinc-600">Δεν έχει οριστεί φόρμα για αυτό το event.</div>;

  return (
    <div className="space-y-5">
      {mode === "public" && (
        <div className="rounded-xl border bg-zinc-50 p-4">
          <div className="text-lg font-semibold mb-1">{eventName}</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-700">
            {eventMeta?.startDate && (
              <div className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> {eventMeta.startDate}</div>
            )}
            {eventMeta?.location && (
              <div className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg> {eventMeta.location}</div>
            )}
            {eventMeta?.hotel && (
              <div className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V8a3 3 0 013-3h12a3 3 0 013 3v13"/><path d="M6 21v-4h12v4"/><path d="M8 12h8"/><path d="M8 16h8"/></svg> {eventMeta.hotel}</div>
            )}
          </div>
          {eventMeta?.description && (
            <p className="mt-2 text-sm text-zinc-600">{eventMeta.description}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="text-base font-semibold">Φόρμα συμμετοχής</div>
        {fields.map((f) => (
          <div key={f.id} className="grid grid-cols-1 gap-1">
            <label className="text-sm text-zinc-700 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 text-zinc-600">
                {f.type === "text" && (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h10M4 18h8"/></svg>)}
                {f.type === "number" && (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 7h14M5 12h14M5 17h14"/></svg>)}
                {f.type === "date" && (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>)}
                {f.type === "select" && (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>)}
                {(f.type === "radio" || f.type === "checkbox") && (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h12"/>
                  </svg>
                )}
                {f.type === "email" && (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>)}
                {f.type === "phone" && (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.86.32 1.7.59 2.5a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 5 5l.67-.67a2 2 0 0 1 2.11-.45c.8.27 1.64.47 2.5.59A2 2 0 0 1 22 16.92z"/></svg>)}
              </span>
              <span>{f.label}{f.required && <span className="text-red-600"> *</span>}</span>
            </label>
            {f.type === "text" && (
              <input className={`rounded-lg border px-3 py-2.5 ${fieldErrors[f.label] ? 'border-red-500' : ''}`} value={values[f.label] ?? ""} onChange={(e) => onChange(f.label, e.target.value)} />
            )}
            {f.type === "number" && (
              <input type="number" className={`rounded-lg border px-3 py-2.5 ${fieldErrors[f.label] ? 'border-red-500' : ''}`} value={values[f.label] ?? ""} onChange={(e) => onChange(f.label, e.target.value)} />
            )}
            {f.type === "date" && (
              <input type="date" className={`rounded-lg border px-3 py-2.5 ${fieldErrors[f.label] ? 'border-red-500' : ''}`} value={values[f.label] ?? ""} onChange={(e) => onChange(f.label, e.target.value)} />
            )}
            {f.type === "email" && (
              <input type="email" className={`rounded-lg border px-3 py-2.5 ${fieldErrors[f.label] ? 'border-red-500' : ''}`} value={values[f.label] ?? ""} onChange={(e) => onChange(f.label, e.target.value)} placeholder="name@example.com" />
            )}
            {f.type === "phone" && (
              <input type="tel" className={`rounded-lg border px-3 py-2.5 ${fieldErrors[f.label] ? 'border-red-500' : ''}`} value={values[f.label] ?? ""} onChange={(e) => onChange(f.label, e.target.value)} placeholder="+30 69XXXXXXXX" />
            )}
            {f.type === "select" && (
              <select className={`rounded-lg border px-3 py-2.5 ${fieldErrors[f.label] ? 'border-red-500' : ''}`} value={values[f.label] ?? ""} onChange={(e) => onChange(f.label, e.target.value)}>
                <option value="">-- Επιλέξτε --</option>
                {(f.options || []).map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {f.type === "radio" && (
              <div className="flex flex-wrap gap-3">
                {(f.options || []).map((opt, idx) => (
                  <label key={idx} className="inline-flex items-center gap-2">
                    <input type="radio" name={f.id} checked={values[f.label] === opt} onChange={() => onChange(f.label, opt)} />
                    {opt}
                  </label>
                ))}
                {fieldErrors[f.label] && <div className="w-full text-xs text-red-600">{fieldErrors[f.label]}</div>}
              </div>
            )}
            {f.type === "checkbox" && (
              <div className="flex flex-col gap-2">
                {(f.options || []).map((opt, idx) => {
                  const list: string[] = values[f.label] || [];
                  const checked = list.includes(opt);
                  return (
                    <label key={idx} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(list);
                          if (e.target.checked) next.add(opt); else next.delete(opt);
                          onChange(f.label, Array.from(next));
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
                {fieldErrors[f.label] && <div className="text-xs text-red-600">{fieldErrors[f.label]}</div>}
              </div>
            )}
            {(f.type === 'text' || f.type === 'number' || f.type === 'date' || f.type === 'select') && fieldErrors[f.label] && (
              <div className="text-xs text-red-600">{fieldErrors[f.label]}</div>
            )}
          </div>
        ))}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {mode === "public" && (
          <div className="flex items-start gap-2 rounded-lg border bg-zinc-50 p-3">
            <input id="gdpr" type="checkbox" className="mt-1" checked={gdprAccepted} onChange={(e) => setGdprAccepted(e.target.checked)} />
            <label htmlFor="gdpr" className="text-sm text-zinc-700">
              Συμφωνώ με την επεξεργασία των προσωπικών μου δεδομένων για τον σκοπό της συμμετοχής στο event.
              <button type="button" className="ml-2 underline" onClick={() => setGdprOpen(true)}>Μάθε περισσότερα</button>
            </label>
          </div>
        )}

        <div className="pt-1">
          <button onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Υποβολή
          </button>
        </div>
      </div>

      {/* GDPR info modal */}
      {mode === "public" && (
        <Modal open={gdprOpen} onClose={() => setGdprOpen(false)} labelledBy="gdpr-title">
          <div className="space-y-3">
            <h3 id="gdpr-title" className="text-lg font-semibold">Πληροφόρηση για την επεξεργασία δεδομένων (GDPR)</h3>
            <p className="text-sm text-zinc-700">
              Τα στοιχεία που καταχωρείτε θα χρησιμοποιηθούν αποκλειστικά για τη διαχείριση της
              συμμετοχής σας στο συγκεκριμένο event (επικοινωνία, οργάνωση, επιβεβαίωση).
              Θα τηρούνται με ασφάλεια και δεν θα διαβιβαστούν σε τρίτους, πέραν από
              συνεργάτες που είναι απαραίτητοι για τη διοργάνωση. Μπορείτε ανά πάσα στιγμή
              να ζητήσετε διαγραφή ή ενημέρωση των δεδομένων σας.
            </p>
            <p className="text-xs text-zinc-500">Με την επιλογή «Συμφωνώ» αποδέχεστε την παραπάνω ενημέρωση.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="rounded-lg border px-3 py-2" onClick={() => setGdprOpen(false)}>Κλείσιμο</button>
              <button type="button" className="rounded-lg bg-black text-white px-3 py-2" onClick={() => { setGdprAccepted(true); setGdprOpen(false); }}>Συμφωνώ</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
