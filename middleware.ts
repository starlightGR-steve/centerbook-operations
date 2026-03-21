export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!login|lobby-board|api/auth|_next/static|_next/image|images|favicon.ico|manifest.json).*)'],
};
