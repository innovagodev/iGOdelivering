import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('igodelivering_role')?.value;

  // 1. Protezione area Ristoratore
  if (pathname.startsWith('/ristoratore')) {
    if (role !== 'ristoratore') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Protezione area Superadmin
  if (pathname.startsWith('/superadmin')) {
    if (role !== 'superadmin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Redirect se già loggato (opzionale)
  if (pathname === '/login') {
    if (role === 'ristoratore')
      return NextResponse.redirect(new URL('/ristoratore/dashboard', request.url));
    if (role === 'superadmin')
      return NextResponse.redirect(new URL('/superadmin/restaurants', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/ristoratore/:path*', '/superadmin/:path*', '/login'],
};
