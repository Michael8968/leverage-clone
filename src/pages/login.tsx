import { redirect } from 'next/navigation';

export default function LoginShim() {
  // Lightweight shim to avoid 404s for deployments that expect a pages/ route.
  // Redirect to the app-router login route. Adjust target if your app route differs.
  redirect('/app/login');
}
