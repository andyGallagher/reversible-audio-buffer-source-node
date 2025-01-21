import { PlaybackPositionNode } from "./playback-position-node";

type ReversibleAudioBufferSourceNodeDirection = "forward" | "reverse";

export interface ReversibleAudioBufferSourceNodeData {
    forward: AudioBuffer;
    reverse: AudioBuffer;
}

export class ReversibleAudioBufferSourceNodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReversibleAudioBufferSourceNodeError";
    }
}

export class ReversibleAudioBufferSourceNode {
    public context: BaseAudioContext;

    private maxDuration: number | null = null;

    private forwardNode: PlaybackPositionNode;
    private reverseNode: PlaybackPositionNode;
    private out: ChannelMergerNode;

    private direction: "forward" | "reverse" = "forward";

    constructor(context: BaseAudioContext) {
        this.context = context;

        this.forwardNode = new PlaybackPositionNode(context);
        this.reverseNode = new PlaybackPositionNode(context);

        this.out = new ChannelMergerNode(context);
        this.forwardNode.connect(this.out);
        this.reverseNode.connect(this.out);
    }

    set buffer(buffers: ReversibleAudioBufferSourceNodeData) {
        this.maxDuration = Math.max(
            buffers.reverse.duration,
            buffers.forward.duration,
        );

        this.forwardNode.buffer = buffers.forward;
        this.reverseNode.buffer = buffers.reverse;
    }

    detune(value: number) {
        this.forwardNode.detune(value);
        this.reverseNode.detune(value);
    }

    playbackRate(rate: number) {
        this.forwardNode.playbackRate(rate);
        this.reverseNode.playbackRate(rate);
    }

    setDirection(direction: ReversibleAudioBufferSourceNodeDirection) {
        if (this.maxDuration === null) {
            throw new ReversibleAudioBufferSourceNodeError(
                "No audio buffer set",
            );
        }

        if (this.direction === direction) {
            return;
        }

        if (this.direction === "forward" && direction === "reverse") {
            const playbackPosition = this.forwardNode.playbackPosition();
            const reverseStartTime = Math.max(
                this.maxDuration - playbackPosition * this.maxDuration,
                0,
            );

            this.reverseNode.start(0, reverseStartTime);
            this.forwardNode.stop();
            this.direction = "reverse";
        }

        if (this.direction === "reverse" && direction === "forward") {
            const playbackPosition = this.reverseNode.playbackPosition();
            const forwardStartTime = Math.max(
                this.maxDuration - playbackPosition * this.maxDuration,
                0,
            );

            this.forwardNode.start(0, forwardStartTime);
            this.reverseNode.stop();
            this.direction = "forward";
        }
    }

    private activeNode() {
        return this.direction === "forward"
            ? this.forwardNode
            : this.reverseNode;
    }

    start() {
        this.activeNode().start();
    }

    stop() {
        this.activeNode().stop();
    }

    playbackPosition() {
        return this.activeNode().playbackPosition();
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
