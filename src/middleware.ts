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

  const { data: { user } } = await supabase.auth.getUser();

  // Protect paths
  const isRistoratorePath = pathname.startsWith('/ristoratore');
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin';

  if (!user) {
    if (isRistoratorePath) {
      // Clear cookie if present but user not authenticated
      response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('igodelivering_role');
      return response;
    }
    if (isAdminPath) {
      response = NextResponse.redirect(new URL('/admin', request.url));
      response.cookies.delete('igodelivering_role');
      return response;
    }
    return response;
  }

  // Get role from cookie
  let role = request.cookies.get('igodelivering_role')?.value;

  // If role is missing, fetch from database
  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile && profile.role) {
      role = profile.role;
      response.cookies.set('igodelivering_role', profile.role, { path: '/', maxAge: 86400, sameSite: 'lax' });
    }
  }

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
      '/ristoratore/tavoli'
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
      '/admin/sicurezza'
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

  return response;
}

export const config = {
  matcher: ['/ristoratore/:path*', '/admin/:path*', '/login'],
};
