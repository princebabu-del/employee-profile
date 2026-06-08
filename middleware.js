export const config = {
  matcher: '/((?!_vercel|favicon.ico).*)',
};

export default function middleware(request) {
  const auth = request.headers.get('authorization');
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const expected = 'Basic ' + btoa(`${user}:${pass}`);

  if (auth === expected) {
    return;
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Employee Profile"' },
  });
}
