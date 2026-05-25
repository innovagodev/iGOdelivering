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
    // Redirect non-existent ristoratore routes to /ristoratore/dashboard
    const validRistoratoreRoutes = [
      '/ristoratore/dashboard',
      '/ristoratore/ordini',
      '/ristoratore/orari',
      '/ristoratore/menu',
      '/ristoratore/impostazioni',
      '/ristoratore/prenotazioni',
      '/ristoratore/promozioni',
      '/ristoratore/zone',
      '/ristoratore/tavoli'
    ];
    if (!validRistoratoreRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/ristoratore/dashboard', request.url));
    }
  }

  // 2. Protezione area Admin
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Redirect non-existent admin routes to /admin/dashboard
    const validAdminRoutes = [
      '/admin/dashboard',
      '/admin/restaurants',
      '/admin/restaurants/new',
      '/admin/utenti',
      '/admin/impostazioni',
      '/admin/sicurezza'
    ];
    const isConfigureOrAccess = pathname.match(/^\/admin\/restaurants\/[^/]+\/(configure|access)$/);

    if (!validAdminRoutes.includes(pathname) && !isConfigureOrAccess) {
      if (!pathname.startsWith('/admin/restaurants/')) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
  }

  // 3. Redirect se già loggato (opzionale)
  if (pathname === '/login' || pathname === '/admin') {
    if (role === 'ristoratore')
      return NextResponse.redirect(new URL('/ristoratore/dashboard', request.url));
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/ristoratore/:path*', '/admin/:path*', '/login'],
};
