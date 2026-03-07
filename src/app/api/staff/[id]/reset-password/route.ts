import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'superuser') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { new_password } = await req.json();

  if (!new_password) {
    return NextResponse.json({ error: 'new_password is required' }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  const apiUser = process.env.WP_API_USER;
  const apiPass = process.env.WP_API_PASSWORD;

  if (!apiBase || !apiUser || !apiPass) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const password_hash = await bcrypt.hash(new_password, 12);

  const res = await fetch(`${apiBase}/staff/${id}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
    },
    body: JSON.stringify({ password_hash }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
