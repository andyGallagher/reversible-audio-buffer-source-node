/**
 * Utility for client side audio processing a reverse audio buffer in place.
 *
 * Note — this is a performance heavy method and users should (probably) supply their own
 * preprocessed audio buffers.
 */
export const reverseAudioBuffer = (
    audioContext: AudioContext,
    audioBuffer: AudioBuffer,
): AudioBuffer => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const reversedBuffer = audioContext.createBuffer(
        numberOfChannels,
        length,
        sampleRate,
    );

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const reversedChannelData = reversedBuffer.getChannelData(channel);

        for (
            let i = 0, j = channelData.length - 1;
            i < channelData.length;
            i++, j--
        ) {
            reversedChannelData[i] = channelData[j];
        }
    }

    return reversedBuffer;
};

/**
 * Make a channel of data that represents the playback position of the audio buffer.
 *
 * Note — this is a performance heavy method and users should (probably) supply their own
 * preprocessed audio buffers.
 */
export const makePlaybackPositionChannelData = (
    audioBuffer: AudioBuffer,
): Float32Array => {
    const length = audioBuffer.length;
    // Fill up the position channel with numbers from 0 to 1.
    // Most performant implementation to create the big array is via "for"
    // https://stackoverflow.com/a/53029824
    const timeDataArray = new Float32Array(length);

    for (let i = 0; i < length; i++) {
        timeDataArray[i] = i / length;
    }

    return timeDataArray;
};

/**
 * Make a new AudioBuffer with an extra channel that represents the playback position of the
 * audio buffer.
 *
 * Note — this is a performance heavy method and users should (probably) supply their own
 * preprocessed audio buffers.
 */
export const makeAudioBufferWithPlaybackPositionChannel = (
    audioContext: AudioContext,
    audioBuffer: AudioBuffer,
    playbackPositionChannelData: Float32Array,
) => {
    // create a new AudioBuffer of the same length as param with one extra channel
    // load it into the AudioBufferSourceNode
    const audioBufferWithPlaybackPositionChannel = audioContext.createBuffer(
        audioBuffer.numberOfChannels + 1,
        audioBuffer.length,
        audioBuffer.sampleRate,
    );

    for (let index = 0; index < audioBuffer.numberOfChannels; index++) {
        const writeChannelData =
            audioBufferWithPlaybackPositionChannel.getChannelData(index);
        const readChannelData = audioBuffer.getChannelData(index);
        for (let i = 0; i < readChannelData.length; i++) {
            writeChannelData[i] = readChannelData[i];
        }
    }

    const writeChannelData =
        audioBufferWithPlaybackPositionChannel.getChannelData(
            audioBuffer.numberOfChannels,
        );

    for (let i = 0; i < playbackPositionChannelData.length; i++) {
        writeChannelData[i] = playbackPositionChannelData[i];
    }

    return audioBufferWithPlaybackPositionChannel;
};
