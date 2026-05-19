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

  // 2. Protezione area Admin
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // 3. Redirect se già loggato (opzionale)
  if (pathname === '/login' || pathname === '/admin') {
    if (role === 'ristoratore')
      return NextResponse.redirect(new URL('/ristoratore/dashboard', request.url));
    if (role === 'admin')
      return NextResponse.redirect(new URL('/admin/restaurants', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/ristoratore/:path*', '/admin/:path*', '/login'],
};
