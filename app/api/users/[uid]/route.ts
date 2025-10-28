export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await ctx.params;
    const body = await req.json();
    const { email, password, displayName, firstName, lastName, phone, disabled } = body || {};
    const auth = adminAuth();
    const dn = (displayName || `${firstName ?? ''} ${lastName ?? ''}`).trim();
    const payload: any = {};
    if (email) payload.email = email;
    if (password) payload.password = password;
    if (dn) payload.displayName = dn;
    if (typeof disabled === 'boolean') payload.disabled = disabled;
    if (phone) payload.phoneNumber = phone;
    const user = await auth.updateUser(uid, payload);
    return NextResponse.json({ uid: user.uid });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await ctx.params;
    const auth = adminAuth();
    await auth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete user' }, { status: 500 });
  }
}
