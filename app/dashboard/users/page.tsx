"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal";
import { auth } from "@/lib/firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useAuth } from "@/components/auth-provider";

type User = {
  uid: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
  photoURL?: string;
  phoneNumber?: string;
};

async function listUsers(token?: string) {
  const url = token ? `/api/users?nextPageToken=${encodeURIComponent(token)}` : "/api/users";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("list users failed");
  return res.json() as Promise<{ users: User[]; nextPageToken: string | null }>;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<User | null>(null);
  const [form, setForm] = useState<{ email: string; password: string; firstName: string; lastName: string; phone: string; disabled: boolean }>({ email: "", password: "", firstName: "", lastName: "", phone: "", disabled: false });
  const [q, setQ] = useState("");

  // Self account management state
  const [myName, setMyName] = useState(user?.displayName || "");
  const [mySaving, setMySaving] = useState(false);
  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [changing, setChanging] = useState(false);

  const onSaveMyProfile = async () => {
    if (!auth.currentUser) return;
    setMySaving(true);
    try { await updateProfile(auth.currentUser, { displayName: myName }); alert("Τα στοιχεία ενημερώθηκαν"); }
    catch (e: any) { alert(e?.message || "Αποτυχία ενημέρωσης"); }
    finally { setMySaving(false); }
  };

  const onChangeMyPassword = async () => {
    if (!auth.currentUser) return;
    if (newPass.length < 6) { alert("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"); return; }
    if (newPass !== newPass2) { alert("Οι κωδικοί δεν ταιριάζουν"); return; }
    setChanging(true);
    try {
      if (auth.currentUser.email && currPass) {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currPass);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }
      await updatePassword(auth.currentUser, newPass);
      setCurrPass(""); setNewPass(""); setNewPass2("");
      alert("Ο κωδικός ενημερώθηκε");
    } catch (e: any) { alert(e?.message || "Αποτυχία αλλαγής κωδικού"); }
    finally { setChanging(false); }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listUsers();
        setUsers(data.users);
        setNextToken(data.nextPageToken);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return users;
    return users.filter(u => (u.email || "").toLowerCase().includes(n) || (u.displayName || "").toLowerCase().includes(n) || (u.phoneNumber || "").toLowerCase().includes(n));
  }, [users, q]);

  const openCreate = () => {
    setEdit(null);
    setForm({ email: "", password: "", firstName: "", lastName: "", phone: "", disabled: false });
    setOpen(true);
  };
  const openEdit = (u: User) => {
    setEdit(u);
    const parts = (u.displayName || "").split(" ");
    const firstName = parts.slice(0, -1).join(" ");
    const lastName = parts.slice(-1).join(" ");
    setForm({ email: u.email || "", password: "", firstName: firstName || "", lastName: lastName || "", phone: u.phoneNumber || "", disabled: !!u.disabled });
    setOpen(true);
  };

  const submit = async () => {
    if (edit) {
      const res = await fetch(`/api/users/${edit.uid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password || undefined, firstName: form.firstName || undefined, lastName: form.lastName || undefined, phone: form.phone || undefined, disabled: form.disabled }) });
      if (!res.ok) { alert("Αποτυχία ενημέρωσης χρήστη"); return; }
    } else {
      if (!form.email || !form.password) { alert("Email και κωδικός απαιτούνται"); return; }
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password, firstName: form.firstName || undefined, lastName: form.lastName || undefined, phone: form.phone || undefined, disabled: form.disabled }) });
      if (!res.ok) { alert("Αποτυχία δημιουργίας χρήστη"); return; }
    }
    // refresh list (simple: reload first page)
    const data = await listUsers();
    setUsers(data.users);
    setNextToken(data.nextPageToken);
    setOpen(false);
  };

  const onDelete = async (u: User) => {
    if (!confirm("Διαγραφή χρήστη;")) return;
    const res = await fetch(`/api/users/${u.uid}`, { method: "DELETE" });
    if (!res.ok) { alert("Αποτυχία διαγραφής"); return; }
    setUsers(prev => prev.filter(x => x.uid !== u.uid));
  };

  const loadMore = async () => {
    if (!nextToken) return;
    setLoading(true);
    try {
      const data = await listUsers(nextToken);
      setUsers(prev => [...prev, ...data.users]);
      setNextToken(data.nextPageToken);
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-semibold">Χρήστες</h1>
          <p className="text-sm text-zinc-600 mt-1">Δημιουργία, επεξεργασία και διαγραφή χρηστών (Firebase Auth).</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded bg-black text-white px-4 py-2 hover:opacity-90 whitespace-nowrap">Νέος Χρήστης</button>
        </div>
      </div>

      {/* Ο λογαριασμός μου (συνοπτικά) */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold mb-3">Τα στοιχεία μου</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Email</label>
              <input className="w-full rounded-lg border px-3 py-2" value={user?.email || ""} readOnly />
            </div>
            <div>
              <label className="text-sm">Όνομα</label>
              <input className="w-full rounded-lg border px-3 py-2" value={myName} onChange={(e)=>setMyName(e.target.value)} placeholder="Πλήρες όνομα" />
            </div>
            <div className="flex justify-end">
              <button onClick={onSaveMyProfile} disabled={mySaving} className="rounded-lg bg-black text-white px-4 py-2">Αποθήκευση</button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold mb-3">Αλλαγή κωδικού</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Τρέχων κωδικός</label>
              <input type="password" className="w-full rounded-lg border px-3 py-2" value={currPass} onChange={(e)=>setCurrPass(e.target.value)} placeholder="(αν ζητηθεί)" />
            </div>
            <div>
              <label className="text-sm">Νέος κωδικός</label>
              <input type="password" className="w-full rounded-lg border px-3 py-2" value={newPass} onChange={(e)=>setNewPass(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Επιβεβαίωση νέου κωδικού</label>
              <input type="password" className="w-full rounded-lg border px-3 py-2" value={newPass2} onChange={(e)=>setNewPass2(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <button onClick={onChangeMyPassword} disabled={changing} className="rounded-lg border px-4 py-2">Αλλαγή κωδικού</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Αναζήτηση με email ή όνομα" className="w-full max-w-xl rounded-lg border px-3 py-2" />
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((u) => {
          const first = (u.displayName || '').split(' ').slice(0, -1).join(' ') || '-';
          const last = (u.displayName || '').split(' ').slice(-1).join(' ') || '-';
          return (
            <div key={u.uid} className="rounded-xl border bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-500">Email</div>
                  <div className="font-medium break-all">{u.email}</div>
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 border ${u.disabled ? 'text-zinc-600' : 'text-emerald-700'}`}>{u.disabled ? 'Απενεργοποιημένος' : 'Ενεργός'}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-zinc-500">Όνομα</div>
                  <div>{first}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Επώνυμο</div>
                  <div>{last}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-zinc-500">Τηλέφωνο</div>
                  <div>{u.phoneNumber || '-'}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={()=>openEdit(u)} className="rounded-lg border px-3 py-1.5 w-full">Επεξεργασία</button>
                <button onClick={()=>onDelete(u)} className="rounded-lg border px-3 py-1.5 text-red-600 w-full">Διαγραφή</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-auto rounded-xl border bg-white">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Όνομα</th>
              <th className="px-3 py-2 text-left">Επώνυμο</th>
              <th className="px-3 py-2 text-left">Τηλέφωνο</th>
              <th className="px-3 py-2 text-left">Κατάσταση</th>
              <th className="px-3 py-2 text-left w-40">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.uid} className="border-t">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{(u.displayName || '').split(' ').slice(0,-1).join(' ') || '-'}</td>
                <td className="px-3 py-2">{(u.displayName || '').split(' ').slice(-1).join(' ') || '-'}</td>
                <td className="px-3 py-2">{u.phoneNumber || '-'}</td>
                <td className="px-3 py-2">{u.disabled ? 'Απενεργοποιημένος' : 'Ενεργός'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>openEdit(u)} className="rounded-lg border px-3 py-1.5">Επεξεργασία</button>
                    <button onClick={()=>onDelete(u)} className="rounded-lg border px-3 py-1.5 text-red-600">Διαγραφή</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-zinc-600">Σύνολο: {users.length}</div>
        {nextToken && (
          <button onClick={loadMore} disabled={loading} className="rounded-lg border px-3 py-2">
            Φόρτωση επιπλέον
          </button>
        )}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} labelledBy="user-form-title">
        <div className="space-y-4">
          <h2 id="user-form-title" className="text-lg font-semibold">{edit ? 'Επεξεργασία' : 'Νέος'} Χρήστης</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm">Email</label>
              <input className="w-full rounded-lg border px-3 py-2" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} disabled={!!edit} />
            </div>
            {!edit && (
              <div className="sm:col-span-2">
                <label className="text-sm">Κωδικός</label>
                <input type="password" className="w-full rounded-lg border px-3 py-2" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} />
              </div>
            )}
            <div>
              <label className="text-sm">Όνομα</label>
              <input className="w-full rounded-lg border px-3 py-2" value={form.firstName} onChange={(e)=>setForm({...form, firstName: e.target.value})} />
            </div>
            <div>
              <label className="text-sm">Επώνυμο</label>
              <input className="w-full rounded-lg border px-3 py-2" value={form.lastName} onChange={(e)=>setForm({...form, lastName: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm">Τηλέφωνο</label>
              <input className="w-full rounded-lg border px-3 py-2" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} placeholder="π.χ. 69xxxxxxxx ή +30…" />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.disabled} onChange={(e)=>setForm({...form, disabled: e.target.checked})} /> Απενεργοποιημένος</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setOpen(false)} className="rounded-lg border px-3 py-2">Άκυρο</button>
            <button onClick={submit} className="rounded-lg bg-black text-white px-4 py-2">Αποθήκευση</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
