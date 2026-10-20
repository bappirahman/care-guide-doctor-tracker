import { ShieldX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleButton } from './google-button';

export function NotAuthorized() {
  return (
    <Card>
      <CardHeader>
        <span className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-full">
          <ShieldX className="size-5" aria-hidden />
        </span>
        <CardTitle className="text-lg">This account isn&apos;t authorized</CardTitle>
        <CardDescription>
          Doctor Tracker is limited to approved administrators, and this Google account isn&apos;t
          one of them. Try a different account, or ask an existing admin to add your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <GoogleButton>Use a different Google account</GoogleButton>
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
