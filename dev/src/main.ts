import { ReversibleAudioBufferSourceNode } from "lib/src";

const reverseAudioBuffer = (
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

let didInitialize = false;
let isPlaying = false;

const onInteractionHandler = async () => {
    if (didInitialize) {
        return;
    }

    didInitialize = true;

    const audioContext = new window.AudioContext();
    const response = await fetch("/example.mp3");
    const arrayBuffer = await response.arrayBuffer();

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const reversedAudioBuffer = reverseAudioBuffer(audioContext, audioBuffer);

    const reversibleAudioBufferSourceNode = new ReversibleAudioBufferSourceNode(
        audioContext,
    );
    reversibleAudioBufferSourceNode.buffer = {
        forward: audioBuffer,
        reverse: reversedAudioBuffer,
    };
    reversibleAudioBufferSourceNode.connect(audioContext.destination);

    const loadingElement = document.getElementById("loading");
    if (!loadingElement) {
        throw new Error("No loading found");
    }
    loadingElement.style.display = "none";

    const playButton = document.getElementById("play");
    if (!playButton) {
        throw new Error("No play button found");
    }

    const playbackRateInput = document.getElementById("playbackRate");
    if (!playbackRateInput) {
        throw new Error("No playback rate input found");
    }

    const currentRateElement = document.getElementById("currentRate");
    if (!currentRateElement) {
        throw new Error("No currentRate element found");
    }

    reversibleAudioBufferSourceNode.onended = () => {
        isPlaying = false;
        playbackRateInput.setAttribute("disabled", "true");
    };

    playButton.removeAttribute("disabled");
    playButton.addEventListener("click", () => {
        if (isPlaying) {
            reversibleAudioBufferSourceNode.stop();
            playbackRateInput.setAttribute("disabled", "true");
        } else {
            reversibleAudioBufferSourceNode.start();
            playbackRateInput.removeAttribute("disabled");
        }

        isPlaying = !isPlaying;
    });

    playbackRateInput.addEventListener("input", (event) => {
        const input = event.target as HTMLInputElement;
        currentRateElement.textContent = input.value;
        reversibleAudioBufferSourceNode.playbackRate(parseFloat(input.value));
    });
};

document.addEventListener("click", onInteractionHandler);
