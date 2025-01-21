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
    private rawAudioBufferNumberOfChannels: number | null = null;
    private audioBuffer: AudioBuffer | null = null;

    private bufferSourceOptions = {
        playbackRate: 1,
        detune: 0,
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
        this.rawAudioBufferNumberOfChannels =
            audioBufferWithPlaybackPositionChannel.numberOfChannels - 1;
    }

    detune(value: number) {
        if (this.bufferSource === null) {
            throw new PlaybackPositionNodeError("No audio buffer set");
        }

        this.bufferSourceOptions.detune = value;
        this.bufferSource.detune.value = value;
    }

    playbackRate(rate: number) {
        if (this.bufferSource === null) {
            throw new PlaybackPositionNodeError("No audio buffer set");
        }

        this.bufferSourceOptions.playbackRate = rate;
        this.bufferSource.playbackRate.value = rate;
    }

    // Get current progress between 0 and 1
    playbackPosition(): number {
        this.analyser?.getFloatTimeDomainData(this.sampleHolder);
        return this.sampleHolder[0];
    }

    start(when?: number, offset?: number, duration?: number): void {
        console.log({ when, offset });
        if (this.rawAudioBufferNumberOfChannels === null) {
            throw new PlaybackPositionNodeError("No audio buffer set");
        }

        this.bufferSource = new AudioBufferSourceNode(this.context);
        this.bufferSource.buffer = this.audioBuffer;

        // set the options
        this.bufferSource.playbackRate.value =
            this.bufferSourceOptions.playbackRate;
        this.bufferSource.detune.value = this.bufferSourceOptions.detune;

        // split the channels
        this.bufferSource.connect(this.splitter);

        // connect all the audio channels to the line out
        for (
            let index = 0;
            index < this.rawAudioBufferNumberOfChannels;
            index++
        ) {
            this.splitter.connect(this.out, index, index);
        }

        this.bufferSource.start(when, offset, duration);
        this.splitter.connect(
            this.analyser,
            this.rawAudioBufferNumberOfChannels,
        );

        this.isPlaying = true;
    }

    stop() {
        // If we're not playing, don't stop and throw an error
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
}
