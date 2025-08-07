import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';
import { ClerkApp } from '~/lib/auth/ClerkProvider';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // await initializeModelList({});

  const readable = await renderToReadableStream(
    <ClerkApp>
      <RemixServer context={remixContext} url={request.url} />
    </ClerkApp>,
    {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  // Handle bot requests differently to avoid stream locking issues
  const isBot = isbot(request.headers.get('user-agent') || '');

  if (isBot) {
    // For bots, wait for the stream to be ready before processing
    await readable.allReady;
  }

  const body = new ReadableStream({
    start(controller) {
      const head = renderHeadToString({ request, remixContext, Head });

      controller.enqueue(
        new Uint8Array(
          new TextEncoder().encode(
            `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
          ),
        ),
      );

      // Check if the readable stream is already locked before getting a reader
      if (readable.locked) {
        controller.error(new Error('ReadableStream is already locked'));

        return;
      }

      let reader: ReadableStreamDefaultReader<Uint8Array>;

      try {
        reader = readable.getReader();
      } catch (error: unknown) {
        controller.error(new Error(`Failed to get reader: ${error}`));

        return;
      }

      function read(): void {
        reader
          .read()
          .then(({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
            if (done) {
              controller.enqueue(new Uint8Array(new TextEncoder().encode('</div></body></html>')));
              controller.close();

              try {
                reader.releaseLock(); // Release the lock when done
              } catch (error: unknown) {
                console.warn('Failed to release reader lock:', error);
              }

              return;
            }

            controller.enqueue(value);
            read();
          })
          .catch((error: unknown) => {
            controller.error(error);

            try {
              reader.releaseLock(); // Release the lock on error
              readable.cancel();
            } catch (releaseError: unknown) {
              console.warn('Failed to release reader lock on error:', releaseError);
            }
          });
      }
      read();
    },

    cancel() {
      try {
        readable.cancel();
      } catch (error: unknown) {
        console.warn('Failed to cancel readable stream:', error);
      }
    },
  });

  responseHeaders.set('Content-Type', 'text/html');

  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
