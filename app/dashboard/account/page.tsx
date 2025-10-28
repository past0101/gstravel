"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useAuth } from "@/components/auth-provider";

export default function AccountPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [saving, setSaving] = useState(false);

  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [changing, setChanging] = useState(false);

  const onSaveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      // Firebase client SDK δεν ενημερώνει phoneNumber απευθείας χωρίς verifier (SMS). Το κρατάμε για μελλοντικό 2FA.
      alert("Τα στοιχεία ενημερώθηκαν");
    } catch (e: any) {
      alert(e?.message || "Αποτυχία ενημέρωσης");
    } finally { setSaving(false); }
  };

  const onChangePassword = async () => {
    if (!auth.currentUser) return;
    if (newPass.length < 6) { alert("Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"); return; }
    if (newPass !== newPass2) { alert("Οι κωδικοί δεν ταιριάζουν"); return; }
    setChanging(true);
    try {
      // re-authenticate if needed
      if (auth.currentUser.email && currPass) {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currPass);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }
      await updatePassword(auth.currentUser, newPass);
      setCurrPass(""); setNewPass(""); setNewPass2("");
      alert("Ο κωδικός ενημερώθηκε");
    } catch (e: any) {
      alert(e?.message || "Αποτυχία αλλαγής κωδικού");
    } finally { setChanging(false); }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Ο Λογαριασμός μου</h1>
        <p className="text-sm text-zinc-600 mt-1">Ενημέρωση προσωπικών στοιχείων και αλλαγή κωδικού.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Στοιχεία Προφίλ</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Email</label>
              <input className="w-full rounded-lg border px-3 py-2" value={user?.email || ""} readOnly />
            </div>
            <div>
              <label className="text-sm">Όνομα</label>
              <input className="w-full rounded-lg border px-3 py-2" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Πλήρες όνομα" />
            </div>
            <div>
              <label className="text-sm">Τηλέφωνο</label>
              <input className="w-full rounded-lg border px-3 py-2" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="(προαιρετικό)" disabled />
              <div className="text-xs text-zinc-500 mt-1">Το τηλέφωνο απαιτεί επαλήθευση SMS και θα προστεθεί αργότερα.</div>
            </div>
            <div className="flex justify-end">
              <button onClick={onSaveProfile} disabled={saving} className="rounded-lg bg-black text-white px-4 py-2">Αποθήκευση</button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Αλλαγή Κωδικού</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Τρέχων κωδικός</label>
              <input type="password" className="w-full rounded-lg border px-3 py-2" value={currPass} onChange={(e)=>setCurrPass(e.target.value)} placeholder="(ενδέχεται να απαιτείται)" />
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
              <button onClick={onChangePassword} disabled={changing} className="rounded-lg border px-4 py-2">Αλλαγή κωδικού</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
