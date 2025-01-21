# reversible-audio-buffer-source-node

This package implements a `ReversibleAudioBufferSourceNode` class, which allows for playback of an `AudioBuffer` with a negative playback rate. This will play the AudioBuffer in reverse. This is useful starting point for many DJ and audio processing applications.

To use this class, clone this repo and [spin up our dev server](https://github.com/andyGallagher/reversible-audio-buffer-source-node/tree/main/dev), or install this via `npm i reversible-audio-buffer-source-node` and try the following in a browser environment:

```typescript
import { ReversibleAudioBufferSourceNode } from "reversible-audio-buffer-source-node";

(async () => {
    // Pull down a local file initialize an audio context.
    const audioContext = new window.AudioContext();
    const response = await fetch("/example.mp3");
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const reversibleAudioBufferSourceNode = new ReversibleAudioBufferSourceNode(
        audioContext,
    );
    reversibleAudioBufferSourceNode.buffer = audioBuffer;

    reversibleAudioBufferSourceNode.connect(audioContext.destination);
    reversibleAudioBufferSourceNode.start();

    reversibleAudioBufferSourceNode.onended((direction) => {
        console.log(`node ended in: ${direction}`);
    });

    // Wait for a few second...
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // Playback in reverse.
    // You should hear the first second or so play backwards.
    reversibleAudioBufferSourceNode.playbackRate(-1);
})();
```

## Performance considerations

This package specifically deals with `AudioBuffer`s, and can quickly get somewhat computationally expensive to use when working with large buffers. It's important to note that `AudioBuffer`s in general were designed to [work with small audio snippets less than 45s in length](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer).

That said, this package does leave some room for a few performance optimizations, noted below.

### Pre-process reversed audio buffer

A user can supply the reversed audio buffer by setting the `ReversibleAudioBufferSourceNode`'s buffer with a pre-processed reversed buffer (e.g. — created offline via ffmpeg or reversed in a worker environment) like so:

```typescript
const reversibleAudioBufferSourceNode = new ReversibleAudioBufferSourceNode(
    audioContext,
);
reversibleAudioBufferSourceNode.buffer = {
    forward: audioBuffer,
    reversed: reversedAudioBuffer,
};
```

Otherwise, there will be an in place creation of a reversed audio buffer, which can be expensive.
For more details, see our [`reverseAudioBuffer`](https://github.com/andyGallagher/reversible-audio-buffer-source-node/blob/main/lib/src/util.ts) utility.

### Pre-process playback position channel

> [!NOTE]
> For more information about our approach and why it's still necessary to create an additional channel to accurately track audio playback time, refer to [this thread](https://github.com/WebAudio/web-audio-api/issues/2397).

A user can supply the reversed audio buffer with an additional playback position channel already supplied.

```typescript
// In a worker environment:
import {
    makePlaybackPositionChannelData,
    makeAudioBufferWithPlaybackPositionChannel,
    ReversibleAudioBufferSourceNode,
} from "reversible-audio-buffer-source-node";

const playbackPositionChannel = makePlaybackPositionChannelData(audioBuffer);
const audioBufferWithPlaybackPositionChannel =
    makeAudioBufferWithPlaybackPositionChannel(
        audioBuffer,
        playbackPositionChannel,
    );

//
// ---
//

// In a browser environment:
import { ReversibleAudioBufferSourceNode } from "reversible-audio-buffer-source-node";

const reversibleAudioBufferSourceNode = new ReversibleAudioBufferSourceNode(
    audioContext,
    {
        shouldCreatePlaybackPositionChannel: false,
    },
);
reversibleAudioBufferSourceNode.buffer = audioBufferWithPlaybackPositionChannel;
```

Otherwise, there will be an in place creation of a playback position channel, which can be expensive.
For more details, see our [`makePlaybackPositionChannelData` and `makeAudioBufferWithPlaybackPositionChannel`](https://github.com/andyGallagher/reversible-audio-buffer-source-node/blob/main/lib/src/util.ts) utilities.

## Things this package does not yet support:

- Looping, but I'm looking into it.
