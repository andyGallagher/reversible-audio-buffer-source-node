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

export const makeAudioBufferWithPlaybackPositionChannel = (
    audioBuffer: AudioBuffer,
    playbackPositionChannelData: Float32Array,
) => {
    // create a new AudioBuffer of the same length as param with one extra channel
    // load it into the AudioBufferSourceNode
    const audioBufferWithPlaybackPositionChannel = new AudioBuffer({
        length: audioBuffer.length,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels + 1,
    });

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
