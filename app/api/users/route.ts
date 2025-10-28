import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('nextPageToken') || undefined;
  try {
    const auth = adminAuth();
    const result = await auth.listUsers(50, token);
    return NextResponse.json({
      users: result.users.map((u: any) => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        phoneNumber: u.phoneNumber,
        disabled: u.disabled,
        photoURL: u.photoURL,
        metadata: u.metadata,
      })),
      nextPageToken: result.pageToken || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, displayName, firstName, lastName, phone, disabled } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }
    const auth = adminAuth();
    const dn = (displayName || `${firstName ?? ''} ${lastName ?? ''}`).trim() || undefined;
    const phoneNumber = phone?.trim() || undefined;
    const user = await auth.createUser({ email, password, displayName: dn, phoneNumber, disabled: !!disabled });
    return NextResponse.json({ uid: user.uid }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create user' }, { status: 500 });
  }
}
