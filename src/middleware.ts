import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect paths
  const isRistoratorePath = pathname.startsWith('/ristoratore');
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin';

  // Cookie `igodelivering_role` delle versioni precedenti: non è più letto da
  // nessuno, lo si cancella dove ancora presente.
  const clearLegacyRoleCookie = (res: NextResponse) => {
    if (request.cookies.get('igodelivering_role')) res.cookies.delete('igodelivering_role');
    return res;
  };

  if (!user) {
    if (isRistoratorePath) {
      return clearLegacyRoleCookie(NextResponse.redirect(new URL('/login', request.url)));
    }
    if (isAdminPath) {
      return clearLegacyRoleCookie(NextResponse.redirect(new URL('/admin', request.url)));
    }
    return clearLegacyRoleCookie(response);
  }

  // Il ruolo si legge dal database a ogni navigazione protetta. Prima veniva
  // da un cookie scritto dal browser e modificabile da chiunque: un
  // ristoratore poteva impostarlo ad 'admin' ed entrare nelle pagine
  // dell'area admin (rilievo A1). I dati restavano protetti da RLS e dai
  // controlli delle route API, ma il confine dell'area non deve dipendere da
  // un valore che il client sceglie.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role: string | undefined = profile?.role;

  // 1. Protection for Ristoratore area
  if (isRistoratorePath) {
    if (role !== 'ristoratore') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const validRistoratoreRoutes = [
      '/ristoratore/dashboard',
      '/ristoratore/ordini',
      '/ristoratore/orari',
      '/ristoratore/menu',
      '/ristoratore/pagamenti',
      '/ristoratore/prenotazioni',
      '/ristoratore/promozioni',
      '/ristoratore/zone',
      '/ristoratore/tavoli',
      '/ristoratore/clienti',
    ];
    if (!validRistoratoreRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/ristoratore/dashboard', request.url));
    }
  }

  // 2. Protection for Admin area
  if (isAdminPath) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    const validAdminRoutes = [
      '/admin/dashboard',
      '/admin/restaurants',
      '/admin/restaurants/new',
      '/admin/utenti',
      '/admin/impostazioni',
      '/admin/sicurezza',
    ];
    const isConfigureOrAccess = pathname.match(/^\/admin\/restaurants\/[^/]+\/(configure|access)$/);

    if (!validAdminRoutes.includes(pathname) && !isConfigureOrAccess) {
      if (!pathname.startsWith('/admin/restaurants/')) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
  }

  // 3. Redirect if already logged in
  if (pathname === '/login' || pathname === '/admin') {
    if (role === 'ristoratore') {
      return NextResponse.redirect(new URL('/ristoratore/dashboard', request.url));
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return clearLegacyRoleCookie(response);
}

export const config = {
  matcher: ['/ristoratore/:path*', '/admin/:path*', '/login'],
};
