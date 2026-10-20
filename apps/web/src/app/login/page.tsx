import {
  type AuthProviders,
  type ItemResponse,
  LOGIN_ERRORS,
  type LoginError,
} from '@doctor-tracker/shared';
import { CircleAlert, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Brand } from '@/components/layout/brand';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldSeparator } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleButton } from '@/features/auth/google-button';
import { LoginForm } from '@/features/auth/login-form';
import { NotAuthorized } from '@/features/auth/not-authorized';
import { safeNextPath } from '@/lib/utils';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <main className="bg-muted/40 flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Brand className="mb-8 justify-center" />
        <Suspense fallback={<LoginCardSkeleton />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginPanel({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const params = await searchParams;
  const error = parseLoginError(params.error);
  const next = safeNextPath(params.next);

  if (error === 'not_authorized') return <NotAuthorized />;

  const { google } = await getProviders();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>Use your administrator account to continue.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error === 'session_expired' && (
          <Alert>
            <Clock aria-hidden />
            <AlertDescription>Your session has ended. Sign in again to continue.</AlertDescription>
          </Alert>
        )}
        {error === 'oauth_failed' && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>
              Google sign-in didn&apos;t complete. Try again, or use your password.
            </AlertDescription>
          </Alert>
        )}

        <LoginForm next={next} />

        {google && (
          <>
            <FieldSeparator>or</FieldSeparator>
            <GoogleButton />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function parseLoginError(value: unknown): LoginError | undefined {
  return LOGIN_ERRORS.find((error) => error === value);
}

/**
 * Asked at request time from the API, so the Google button reflects how the API is
 * actually configured. If the API can't be reached the button is simply hidden.
 */
async function getProviders(): Promise<AuthProviders> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/providers`, { cache: 'no-store' });
    if (!response.ok) return { google: false };
    const body = (await response.json()) as ItemResponse<AuthProviders>;
    return body.data;
  } catch {
    return { google: false };
  }
}

function LoginCardSkeleton() {
  return (
    <Card aria-busy>
      <CardHeader>
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
