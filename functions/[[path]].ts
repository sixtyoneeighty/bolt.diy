import type { ServerBuild } from '@remix-run/cloudflare';
import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

export const onRequest: PagesFunction = async (context) => {
  try {
    // Dynamic import to handle missing build during development
    // @ts-ignore - Build files may not exist during development
    const serverBuild = await import('../build/server').catch(() => 
      // @ts-ignore - Alternative build path
      import('../build/server/index.js')
    ).catch(() => {
      throw new Error('Server build not found');
    }) as unknown as ServerBuild;

    const handler = createPagesFunctionHandler({
      build: serverBuild,
    });

    return handler(context);
  } catch (error) {
    // Handle case where build doesn't exist yet (development)
    console.warn('Build not available:', error);
    return new Response('Build not available', { status: 503 });
  }
};
