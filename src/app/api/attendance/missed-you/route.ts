import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { studentId, contactId } = await req.json();

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  const apiUser = process.env.WP_API_USER;
  const apiPass = process.env.WP_API_PASSWORD;

  if (!apiBase || !apiUser || !apiPass) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const res = await fetch(`${apiBase}/attendance/missed-you`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64'),
      },
      body: JSON.stringify({ student_id: studentId, contact_id: contactId }),
    });

    if (res.status === 404) {
      return NextResponse.json({ success: false, error: 'Endpoint not yet available' }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Endpoint not yet available' }, { status: 200 });
  }
}
