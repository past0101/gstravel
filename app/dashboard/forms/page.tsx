"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal from "@/components/modal";
import FormBuilder, { FormField } from "@/components/forms/form-builder";

function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 21h6l12-12a2.828 2.828 0 10-4-4L5 17l-2 4z" />
    </svg>
  );
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

export default function FormsPage() {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<null | { eventId: string; fields: FormField[] }>(null);
  const [forms, setForms] = useState<Array<{ id: string; eventId: string; fields: FormField[] }>>([]);
  const [eventNames, setEventNames] = useState<Record<string, string>>({});

  const formsQuery = useMemo(() => query(collection(db, "eventForms")), []);

  useEffect(() => {
    const unsub = onSnapshot(formsQuery, (snap) => {
      setForms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [formsQuery]);

  useEffect(() => {
    // Load event names for display
    (async () => {
      const snap = await getDocs(collection(db, "events"));
      const map: Record<string, string> = {};
      snap.forEach((d) => (map[d.id] = (d.data() as any).name || d.id));
      setEventNames(map);
    })();
  }, []);

  const onCreate = () => {
    setEdit(null);
    setOpen(true);
  };

  const onEdit = (eventId: string, fields: FormField[]) => {
    setEdit({ eventId, fields });
    setOpen(true);
  };

  const onDelete = async (eventId: string) => {
    if (!confirm("Διαγραφή φόρμας;")) return;
    await deleteDoc(doc(db, "eventForms", eventId));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Φόρμες</h1>
        <button onClick={onCreate} className="rounded bg-black text-white px-4 py-2 hover:opacity-90">Δημιουργία Φόρμα</button>
      </div>

      <div className="space-y-3">
        {forms.length === 0 && (
          <div className="text-sm text-zinc-600">Δεν υπάρχουν φόρμες. Πάτησε "Δημιουργία Φόρμα" για να προσθέσεις.</div>
        )}
        {forms.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{eventNames[f.eventId] || f.eventId}</div>
              <div className="text-sm text-zinc-600">Πεδία: {f.fields?.length || 0}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(f.eventId, f.fields || [])} className="inline-flex items-center rounded-md bg-white/90 backdrop-blur px-2.5 py-1.5 border hover:bg-white">
                <IconEdit className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(f.eventId)} className="inline-flex items-center rounded-md bg-white/90 backdrop-blur px-2.5 py-1.5 border hover:bg-white text-red-600">
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="form-builder-title">
        <FormBuilder
          onClose={() => setOpen(false)}
          initialEventId={edit?.eventId}
          initialFields={edit?.fields}
          lockEvent={!!edit}
        />
      </Modal>
    </div>
  );
}
