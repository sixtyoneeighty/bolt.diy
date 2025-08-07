export default class SwitchableStream extends TransformStream {
  private _controller: TransformStreamDefaultController | null = null;
  private _currentReader: ReadableStreamDefaultReader | null = null;
  private _switches = 0;

  constructor() {
    let controllerRef: TransformStreamDefaultController | undefined;

    super({
      start(controller) {
        controllerRef = controller;
      },
    });

    if (controllerRef === undefined) {
      throw new Error('Controller not properly initialized');
    }

    this._controller = controllerRef;
  }

  async switchSource(newStream: ReadableStream) {
    if (this._currentReader) {
      try {
        await this._currentReader.cancel();
      } catch (error) {
        console.warn('Error canceling current reader:', error);
      }
      this._currentReader = null;
    }

    // Check if the new stream is already locked
    if (newStream.locked) {
      console.error('Cannot switch to a locked ReadableStream');
      this._controller?.error(new Error('ReadableStream is already locked'));

      return;
    }

    try {
      this._currentReader = newStream.getReader();
      this._pumpStream();
      this._switches++;
    } catch (error) {
      console.error('Error getting reader from new stream:', error);
      this._controller?.error(error);
    }
  }

  private async _pumpStream() {
    if (!this._currentReader || !this._controller) {
      throw new Error('Stream is not properly initialized');
    }

    try {
      while (true) {
        const { done, value } = await this._currentReader.read();

        if (done) {
          break;
        }

        this._controller.enqueue(value);
      }
    } catch (error) {
      console.log(error);
      this._controller.error(error);
    }
  }

  close() {
    if (this._currentReader) {
      try {
        this._currentReader.cancel();
      } catch (error) {
        console.warn('Error canceling reader during close:', error);
      }
      this._currentReader = null;
    }

    this._controller?.terminate();
  }

  get switches() {
    return this._switches;
  }
}
