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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Events</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCreate}
            className="rounded bg-black text-white px-4 py-2 hover:opacity-90"
          >
            Νέο Event
          </button>

          <button
            onClick={() => setOpenFormBuilder(true)}
            className="rounded border px-4 py-2 hover:bg-zinc-100"
          >
            Δημιουργία Φόρμα
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((it) => (
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
