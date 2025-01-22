import { describe, expect, it } from "vitest";
import {
    makeAudioBufferWithPlaybackPositionChannel,
    makePlaybackPositionChannelData,
    reverseAudioBuffer,
} from "./util";
import { AudioContext } from "node-web-audio-api";
import fs from "fs";
import path from "path";

const getExampleArrayBuffer = async () => {
    const filePath = path.resolve(__dirname, "./example.mp3");
    const buffer = fs.readFileSync(filePath);
    return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
    );
};

describe("reverseAudioBuffer", () => {
    it("should reverse the audio buffer", async () => {
        const arrayBuffer = await getExampleArrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const reversedAudioBuffer = reverseAudioBuffer(
            audioContext,
            audioBuffer,
        );

        expect(reversedAudioBuffer.numberOfChannels).toBe(
            audioBuffer.numberOfChannels,
        );
        expect(reversedAudioBuffer.length).toBe(audioBuffer.length);
        expect(reversedAudioBuffer.sampleRate).toBe(audioBuffer.sampleRate);
        expect(reversedAudioBuffer.duration).toBe(audioBuffer.duration);
        expect(reversedAudioBuffer.getChannelData(0)).toEqual(
            audioBuffer.getChannelData(0).reverse(),
        );
    });
});

describe("makePlaybackPositionChannelData", () => {
    it("should create a channel of data that represents the playback position of the audio buffer", async () => {
        const arrayBuffer = await getExampleArrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const playbackPositionChannelData =
            makePlaybackPositionChannelData(audioBuffer);

        expect(playbackPositionChannelData.length).toBe(audioBuffer.length);

        // Note that we can't compare the endpoint, as it will be i/length, which won't exactly
        // be 1 (but will be very close)
        expect(playbackPositionChannelData[0]).toBe(0);
    });
});

describe("makeAudioBufferWithPlaybackPositionChannel", () => {
    it("should an audio buffer with an additional playback position channel", async () => {
        const arrayBuffer = await getExampleArrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const playbackPositionChannelData =
            makePlaybackPositionChannelData(audioBuffer);
        const audioBufferWithPlaybackPositionChannel =
            makeAudioBufferWithPlaybackPositionChannel(
                audioContext,
                audioBuffer,
                playbackPositionChannelData,
            );

        expect(audioBufferWithPlaybackPositionChannel.length).toBe(
            audioBuffer.length,
        );

        // We've slapped on an additional channel.
        expect(audioBufferWithPlaybackPositionChannel.numberOfChannels).toBe(
            audioBuffer.numberOfChannels + 1,
        );

        // Note that we can't compare the endpoint, as it will be i/length, which won't exactly
        // be 1 (but will be very close)
        expect(playbackPositionChannelData[0]).toBe(0);
    });
});
