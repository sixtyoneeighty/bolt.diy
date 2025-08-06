import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { ClerkApp } from '~/lib/auth/ClerkProvider';

startTransition(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <ClerkApp>
      <RemixBrowser />
    </ClerkApp>,
  );
});
