import {
    PlaybackPositionNode,
    PlaybackPositionNodeOptions,
} from "./playback-position-node";
import { reverseAudioBuffer } from "./util";

export type ReversibleAudioBufferSourceNodeOptions =
    PlaybackPositionNodeOptions & {};

export type ReversibleAudioBufferSourceNodeDirection = "forward" | "reverse";

type ReversibleAudioBufferSourceNodeOnendedHandler = (
    direction: ReversibleAudioBufferSourceNodeDirection,
) => void;

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

/**
 * Class that interprets negative a `playbackRate` as playing a track in reverse.
 *
 * We accomplish this by managing two child nodes (forward and reverse) and connecting them
 * to a single `ChannelMergerNode`.
 */
export class ReversibleAudioBufferSourceNode {
    public context: AudioContext;

    private maxDuration: number | null = null;

    private forwardNode: PlaybackPositionNode;
    private reverseNode: PlaybackPositionNode;
    private out: ChannelMergerNode;
    private onendedHandler: ReversibleAudioBufferSourceNodeOnendedHandler | null =
        null;

    public direction: ReversibleAudioBufferSourceNodeDirection = "forward";

    constructor(
        context: AudioContext,
        options?: ReversibleAudioBufferSourceNodeOptions,
    ) {
        this.context = context;

        this.forwardNode = new PlaybackPositionNode(context, options);
        this.reverseNode = new PlaybackPositionNode(context, options);

        this.out = new ChannelMergerNode(context);

        this.forwardNode.connect(this.out);
        this.reverseNode.connect(this.out);
    }

    set buffer(buffer: AudioBuffer | ReversibleAudioBufferSourceNodeData) {
        /**
         * If we are supplied a single buffer, reverse it in-situ for the user.
         * Note that this should be pre-processed or at least performed in a worker for larger
         * `audioBuffer`s.
         */
        const computedBuffers: ReversibleAudioBufferSourceNodeData = (() => {
            if (buffer instanceof AudioBuffer) {
                const reversedBuffer = reverseAudioBuffer(this.context, buffer);

                return {
                    forward: buffer,
                    reverse: reversedBuffer,
                };
            }

            return buffer;
        })();

        // There might be subtle differences for preprocessed buffers.
        // To prevent out of bounds errors, prefer the larger buffer.
        this.maxDuration = Math.max(
            computedBuffers.reverse.duration,
            computedBuffers.forward.duration,
        );

        this.forwardNode.buffer = computedBuffers.forward;
        this.reverseNode.buffer = computedBuffers.reverse;
    }

    /**
     * Utility method for determining the active node based on the current direction.
     */
    private activeNode() {
        return this.direction === "forward"
            ? this.forwardNode
            : this.reverseNode;
    }

    detune(value: number) {
        this.forwardNode.detune(value);
        this.reverseNode.detune(value);
    }

    /**
     * Manage which node is currently playing by toggling between sign.
     */
    playbackRate(rate: number) {
        const absRate = Math.abs(rate);

        this.forwardNode.playbackRate(absRate);
        this.reverseNode.playbackRate(absRate);

        const direction: ReversibleAudioBufferSourceNodeDirection =
            rate < 0 ? "reverse" : "forward";

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
            this.reverseNode.onended = () => {
                this.onendedHandler?.("reverse");
            };

            this.forwardNode.onended = null;
            this.forwardNode.stop();
            this.direction = "reverse";
        } else if (this.direction === "reverse" && direction === "forward") {
            const playbackPosition = this.reverseNode.playbackPosition();
            const forwardStartTime = Math.max(
                this.maxDuration - playbackPosition * this.maxDuration,
                0,
            );

            this.forwardNode.start(0, forwardStartTime);
            this.forwardNode.onended = () => {
                this.onendedHandler?.("forward");
            };

            this.reverseNode.onended = null;
            this.reverseNode.stop();
            this.direction = "forward";
        }
    }

    start() {
        this.activeNode().start();
    }

    stop() {
        this.activeNode().stop();
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

    set onended(handler: ReversibleAudioBufferSourceNodeOnendedHandler | null) {
        this.onendedHandler = handler;
        this.activeNode().onended = () => {
            handler?.(this.direction);
        };
    }
}
