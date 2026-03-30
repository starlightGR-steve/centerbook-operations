import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'superuser') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const apiBase = `${process.env.WP_API_URL}/cb/v1`;
  const apiUser = process.env.WP_API_USER;
  const apiPass = process.env.WP_API_PASSWORD;

  if (!apiBase || !apiUser || !apiPass) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const allowed = ['first_name', 'last_name', 'email', 'phone', 'hire_date', 'role', 'is_active'];
  const fields: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) fields[key] = body[key];
  }

  // Also update full_name if first/last changed
  if (fields.first_name || fields.last_name) {
    fields.full_name = `${fields.first_name || ''} ${fields.last_name || ''}`.trim();
  }

  const res = await fetch(`${apiBase}/staff/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
    },
    body: JSON.stringify(fields),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
