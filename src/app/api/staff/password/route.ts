import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  const apiBase = `${process.env.WP_API_URL}/cb/v1`;
  const apiUser = process.env.WP_API_USER;
  const apiPass = process.env.WP_API_PASSWORD;

  if (!apiBase || !apiUser || !apiPass) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const res = await fetch(`${apiBase}/staff/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
    },
    body: JSON.stringify({
      email: session.user.email,
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
