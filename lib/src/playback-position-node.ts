// @ SEE https://github.com/kurtsmurf/whirly/blob/master/src/index.js
// @ SEE https://github.com/WebAudio/web-audio-api/issues/2397#issuecomment-1887161919

// playback position hack:
// https://github.com/WebAudio/web-audio-api/issues/2397#issuecomment-459514360

// composite audio node:
// https://github.com/GoogleChromeLabs/web-audio-samples/wiki/CompositeAudioNode

import {
    makeAudioBufferWithPlaybackPositionChannel,
    makePlaybackPositionChannelData,
} from "./util";

export class PlaybackPositionNodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PlaybackPositionNodeError";
    }
}

export class PlaybackPositionNode {
    public context: BaseAudioContext;

    private bufferSource: AudioBufferSourceNode | null = null;
    private audioBuffer: AudioBuffer | null = null;

    private bufferSourceOptions: {
        playbackRate: number;
        detune: number;
        onendedHandler: (() => void) | null;
    } = {
        playbackRate: 1,
        detune: 0,
        onendedHandler: null,
    };

    private splitter: ChannelSplitterNode;
    private out: ChannelMergerNode;
    private analyser: AnalyserNode;
    private sampleHolder: Float32Array;

    private isPlaying: boolean = false;

    constructor(context: BaseAudioContext) {
        this.context = context;

        this.splitter = new ChannelSplitterNode(context);
        this.out = new ChannelMergerNode(context);
        this.sampleHolder = new Float32Array(1);
        this.analyser = new AnalyserNode(this.context);
    }

    set buffer(audioBuffer: AudioBuffer) {
        const playbackPositionChannel =
            makePlaybackPositionChannelData(audioBuffer);
        const audioBufferWithPlaybackPositionChannel =
            makeAudioBufferWithPlaybackPositionChannel(
                audioBuffer,
                playbackPositionChannel,
            );

        this.audioBuffer = audioBufferWithPlaybackPositionChannel;
    }

    detune(value: number) {
        this.bufferSourceOptions.detune = value;

        if (this.bufferSource === null) {
            return;
        }

        this.bufferSource.detune.value = value;
    }

    playbackRate(rate: number) {
        this.bufferSourceOptions.playbackRate = rate;

        if (this.bufferSource === null) {
            return;
        }

        this.bufferSource.playbackRate.value = rate;
    }

    // Get current progress between 0 and 1
    playbackPosition(): number {
        this.analyser?.getFloatTimeDomainData(this.sampleHolder);
        return this.sampleHolder[0];
    }

    start(when?: number, offset?: number, duration?: number): void {
        if (this.audioBuffer === null) {
            throw new PlaybackPositionNodeError("No audio buffer set");
        }

        const audioBufferNumberOfChannels =
            this.audioBuffer.numberOfChannels - 1;

        this.bufferSource = new AudioBufferSourceNode(this.context);
        this.bufferSource.buffer = this.audioBuffer;

        // Set stored options
        this.bufferSource.playbackRate.value =
            this.bufferSourceOptions.playbackRate;
        this.bufferSource.detune.value = this.bufferSourceOptions.detune;
        this.bufferSource.onended = this.bufferSourceOptions.onendedHandler;

        // Split the channels
        this.bufferSource.connect(this.splitter);

        // Connect all the audio channels to the line out
        for (let index = 0; index < audioBufferNumberOfChannels; index++) {
            this.splitter.connect(this.out, index, index);
        }

        this.bufferSource.start(when, offset, duration);
        this.splitter.connect(this.analyser, audioBufferNumberOfChannels);

        this.isPlaying = true;
    }

    stop() {
        // If we're not playing, don't stop and throw an error.
        // Note that we call `stop` on nodes that have not started playing in
        // `reversible-audio-buffer-source-node`, and we can probably manage that better and get
        // closer to default WebAudioAPI behavior.
        if (!this.isPlaying) {
            return;
        }

        if (this.bufferSource === null) {
            throw new PlaybackPositionNodeError("No audio buffer set");
        }

        this.bufferSource.stop();
        this.isPlaying = false;
    }

    connect(destination: AudioNode, output?: number, input?: number): AudioNode;
    connect(destination: AudioParam, output?: number): void;
    connect(
        destination: AudioNode | AudioParam,
        output?: number,
        input?: number,
    ): AudioNode | void {
        if (destination instanceof AudioNode) {
            this.out.connect(destination, output, input);
            return destination;
        } else if (destination instanceof AudioParam) {
            this.out.connect(destination, output);
        }
    }

    disconnect() {
        this.out.disconnect();
    }

    set onended(handler: () => void) {
        this.bufferSourceOptions.onendedHandler = handler;

        if (this.bufferSource === null) {
            return;
        }

        this.bufferSource.onended = handler;
    }
}
