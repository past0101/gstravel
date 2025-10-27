"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/modal";
import EventForm, { EventDoc } from "@/components/events/event-form";
import EventCard from "@/components/events/event-card";

export default function EventsPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventDoc | null>(null);
  const [items, setItems] = useState<EventDoc[]>([]);
  const q = useMemo(() => query(collection(db, "events"), orderBy("createdAt", "desc")), []);

  useEffect(() => {
    const unsub = onSnapshot(q, (snap) => {
      const list: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setItems(list);
    });
    return () => unsub();
  }, [q]);

  const onCreate = () => {
    setEditItem(null);
    setOpen(true);
  };

  const onEdit = (it: EventDoc) => {
    setEditItem(it);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Διαγραφή event;")) return;
    await deleteDoc(doc(db, "events", id));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <button onClick={onCreate} className="rounded bg-black text-white px-4 py-2 hover:opacity-90">
          Νέο Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            onEdit={() => onEdit(it)}
            onDelete={() => onDelete(it.id!)}
          />
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="event-form-title">
        <EventForm
          initial={editItem}
          onDone={() => {
            setOpen(false);
            setEditItem(null);
          }}
        />
      </Modal>
    </div>
  );
}
