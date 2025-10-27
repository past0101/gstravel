"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FormField = {
  id: string;
  label: string;
  type: "text" | "number" | "radio" | "checkbox" | "select" | "date";
  required?: boolean;
  options?: string[]; // for radio/select/checkbox group
};

export default function FormBuilder({
  onClose,
  initialEventId,
  initialFields,
  lockEvent = false,
}: {
  onClose: () => void;
  initialEventId?: string;
  initialFields?: FormField[];
  lockEvent?: boolean;
}) {
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || "");
  const [fields, setFields] = useState<FormField[]>(initialFields || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const makeId = () =>
    (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `f_${Math.random().toString(36).slice(2, 9)}`;

  // ensure each incoming field has an id for React key stability
  useEffect(() => {
    if (initialFields && initialFields.length) {
      setFields(initialFields.map((f: FormField) => ({ ...f, id: f.id || makeId() })));
    }
  }, [initialFields]);

  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id }));
      setEvents(list);
      if (!selectedEventId && list.length) setSelectedEventId(list[0].id);
    });
    return () => unsub();
  }, [selectedEventId]);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: makeId(), label: "Νέο πεδίο", type: "text", required: false },
    ]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const addOption = (id: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, options: [...(f.options || []), "Νέα επιλογή"] }
          : f
      )
    );
  };

  const updateOption = (id: string, idx: number, value: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const opts = [...(f.options || [])];
        opts[idx] = value;
        return { ...f, options: opts };
      })
    );
  };

  const removeOption = (id: string, idx: number) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const opts = [...(f.options || [])];
        opts.splice(idx, 1);
        return { ...f, options: opts };
      })
    );
  };

  const save = async () => {
    if (!selectedEventId) {
      setError("Επίλεξε event");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await setDoc(doc(db, "eventForms", selectedEventId), {
        eventId: selectedEventId,
        fields: fields.map((f) => ({
          label: f.label,
          type: f.type,
          required: !!f.required,
          options: f.options?.filter(Boolean) || [],
        })),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Αποτυχία αποθήκευσης");
    } finally {
      setSaving(false);
    }
  };

  const typeOptions: Array<{ value: FormField["type"]; label: string }> = useMemo(
    () => [
      { value: "text", label: "Κείμενο" },
      { value: "number", label: "Αριθμός" },
      { value: "radio", label: "Radio" },
      { value: "checkbox", label: "Checkbox" },
      { value: "select", label: "Dropdown" },
      { value: "date", label: "Ημερομηνία" },
    ],
    []
  );

  const isEdit = !!initialEventId || (initialFields && initialFields.length > 0);

  return (
    <div className="space-y-4">
      <h2 id="form-builder-title" className="text-xl font-semibold">{isEdit ? "Επεξεργασία Φόρμας" : "Δημιουργία Φόρμα"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-zinc-600">Επιλογή Event</span>
          <select
            className="w-full rounded-lg border px-3 py-2.5 disabled:bg-zinc-100 disabled:cursor-not-allowed"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={lockEvent}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="button" onClick={addField} className="rounded-lg border px-4 py-2 w-full">
            Προσθήκη Πεδίο
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
        {fields.length === 0 && (
          <div className="text-sm text-zinc-500">Δεν υπάρχουν πεδία. Πρόσθεσε με το κουμπί.</div>
        )}
        {fields.map((f) => (
          <div key={f.id} className="rounded-lg border p-3 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              className="sm:col-span-2 rounded-lg border px-3 py-2.5"
              placeholder="Ετικέτα (όνομα πεδίου)"
              value={f.label}
              onChange={(e) => updateField(f.id, { label: e.target.value })}
            />
            <select
              className="rounded-lg border px-3 py-2.5"
              value={f.type}
              onChange={(e) => updateField(f.id, { type: e.target.value as FormField["type"] })}
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2">
              {(f.type === "select" || f.type === "radio" || f.type === "checkbox") ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600">Επιλογές</span>
                    <button type="button" onClick={() => addOption(f.id)} className="text-sm rounded border px-2 py-1">+ Προσθήκη</button>
                  </div>
                  {(f.options?.length ? f.options : ["Επιλογή 1", "Επιλογή 2"]).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-lg border px-3 py-2.5"
                        value={opt}
                        onChange={(e) => updateOption(f.id, idx, e.target.value)}
                      />
                      <button type="button" onClick={() => removeOption(f.id, idx)} className="text-red-600 text-sm">Διαγραφή</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Δεν απαιτούνται επιλογές</div>
              )}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!f.required}
                onChange={(e) => updateField(f.id, { required: e.target.checked })}
              />
              Υποχρεωτικό
            </label>
            <div className="sm:col-span-5 flex justify-end">
              <button type="button" onClick={() => removeField(f.id)} className="text-red-600 text-sm">
                Διαγραφή
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">
          Άκυρο
        </button>
        <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60">
          {saving ? "Αποθήκευση..." : "Αποθήκευση"}
        </button>
      </div>
    </div>
  );
}
