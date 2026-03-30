import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'superuser') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { first_name, last_name, email, phone, hire_date, role: staffRole, password } = await req.json();

  if (!first_name || !last_name || !email || !staffRole || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const apiBase = `${process.env.WP_API_URL}/cb/v1`;
  const apiUser = process.env.WP_API_USER;
  const apiPass = process.env.WP_API_PASSWORD;

  if (!apiBase || !apiUser || !apiPass) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const res = await fetch(`${apiBase}/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
    },
    body: JSON.stringify({
      first_name,
      last_name,
      email,
      phone: phone || '',
      hire_date: hire_date || '',
      role: staffRole,
      password_hash,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
