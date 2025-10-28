"use client";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/modal";
import EventForm, { EventDoc } from "@/components/events/event-form";
import EventCard from "@/components/events/event-card";
import FormBuilder from "@/components/forms/form-builder";
import FormRenderer from "@/components/forms/form-renderer";

export default function EventsPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventDoc | null>(null);
  const [items, setItems] = useState<EventDoc[]>([]);
  const [openFormBuilder, setOpenFormBuilder] = useState(false);
  const [formEventIds, setFormEventIds] = useState<Set<string>>(new Set());
  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<EventDoc | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [qText, setQText] = useState("");
  const [formFilter, setFormFilter] = useState<"all" | "with" | "without">("all");
  const q = useMemo(
    () => query(collection(db, "events"), orderBy("createdAt", "desc")),
    []
  );

  useEffect(() => {
    const unsub = onSnapshot(q, (snap) => {
      const list: EventDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setItems(list);
    });
    return () => unsub();
  }, [q]);

  // track which events have forms
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "eventForms"), (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => ids.add(d.id));
      setFormEventIds(ids);
    });
    return () => unsub();
  }, []);

  const onCreate = () => {
    setEditItem(null);
    setOpen(true);
  };

  const onEdit = (it: EventDoc) => {
    setEditItem(it);
    setOpen(true);
  };

  const onOpenDetails = (it: EventDoc) => {
    setSelected(it);
    // build shareable link from current origin
    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
    setShareLink(origin ? `${origin}/f/${it.id}` : `/f/${it.id}`);
    setOpenDetails(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Διαγραφή event;")) return;
    await deleteDoc(doc(db, "events", id));
  };

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

  const filtered = useMemo(() => {
    const qn = normalize(qText);
    return items.filter((it) => {
      const matchesQ = qn ? (normalize(it.name || "").includes(qn) || normalize(it.location || "").includes(qn)) : true;
      const hasForm = formEventIds.has(it.id!);
      const matchesForm = formFilter === 'all' ? true : formFilter === 'with' ? hasForm : !hasForm;
      return matchesQ && matchesForm;
    });
  }, [items, qText, formFilter, formEventIds]);

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <h1 className="text-2xl font-semibold text-slate-800">Events</h1>
            <p className="text-sm text-slate-500 mt-1">Διαχείριση εκδηλώσεων και γρήγορη αναζήτηση.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-600 text-white px-4 py-2 shadow-sm hover:bg-cyan-700 active:bg-cyan-800 transition-colors duration-200 whitespace-nowrap"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Νέο Event
            </button>

            <button
              onClick={() => setOpenFormBuilder(true)}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-colors duration-200 whitespace-nowrap"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
              Δημιουργία Φόρμα
            </button>
          </div>
        </div>

        {/* Filters card */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Αναζήτηση με όνομα ή τοποθεσία (υποστηρίζονται και λατινικοί χαρακτήρες)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={formFilter}
                onChange={(e) => setFormFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
              >
                <option value="all">Όλα</option>
                <option value="with">Με φόρμα</option>
                <option value="without">Χωρίς φόρμα</option>
              </select>
              <button
                type="button"
                onClick={() => { setQText(""); setFormFilter('all'); }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50 active:bg-slate-100 transition-colors duration-200 whitespace-nowrap"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6v12"/></svg>
                Καθαρισμός
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((it) => (
          <EventCard
            key={it.id}
            id={it.id!}
            name={it.name}
            description={it.description}
            photoBase64={it.photoBase64}
            location={it.location}
            hotel={it.hotel}
            link={it.link}
            startDate={it.startDate}
            hasForm={formEventIds.has(it.id!)}
            onOpen={() => onOpenDetails(it)}
            onEdit={() => onEdit(it)}
            onDelete={() => onDelete(it.id!)}
          />
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="event-form-title"
      >
        <EventForm
          initial={editItem}
          onDone={() => {
            setOpen(false);
            setEditItem(null);
          }}
        />
      </Modal>

      <Modal
        open={openFormBuilder}
        onClose={() => setOpenFormBuilder(false)}
        labelledBy="form-builder-title"
      >
        <FormBuilder onClose={() => setOpenFormBuilder(false)} />
      </Modal>

      <Modal
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        labelledBy="event-details-title"
      >
        {selected && (
          <div className="space-y-4">
            <h2 id="event-details-title" className="text-xl font-semibold">Λεπτομέρειες Event</h2>
            {selected.photoBase64 ? (
              <img src={selected.photoBase64} alt={selected.name} className="h-48 w-full object-cover rounded-lg" />
            ) : null}
            <div className="space-y-2">
              <div className="text-lg font-medium">{selected.name}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-700">
                {selected.startDate && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {selected.startDate}
                  </div>
                )}
                {selected.location && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>
                    {selected.location}
                  </div>
                )}
                {selected.hotel && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V8a3 3 0 013-3h12a3 3 0 013 3v13"/><path d="M6 21v-4h12v4"/><path d="M8 12h8"/><path d="M8 16h8"/></svg>
                    {selected.hotel}
                  </div>
                )}
              </div>
              {selected.description && <div className="text-sm text-zinc-600">{selected.description}</div>}
            </div>

            <div className="pt-2">
              <FormRenderer eventId={selected.id!} mode="internal" />
            </div>

            <div className="pt-2">
              <h3 className="text-base font-semibold mb-2">Δημιουργία συνδέσμου</h3>
              <div className="flex items-center gap-2">
                <input className="flex-1 rounded-lg border px-3 py-2" readOnly value={shareLink} />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
                  onClick={async () => {
                    setCopied(false);
                    try {
                      if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(shareLink);
                      } else {
                        const ta = document.createElement('textarea');
                        ta.value = shareLink;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                      }
                      setCopied(true);
                    } catch {}
                  }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {copied ? 'Αντιγράφηκε' : 'Αντιγραφή'}
                </button>
              </div>
              <div className="text-xs text-zinc-500 mt-1">Ο σύνδεσμος λειτουργεί δημόσια χωρίς σύνδεση.</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
