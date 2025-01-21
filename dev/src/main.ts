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
let isReverse = false;

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
    console.log({ audioBuffer, reversedAudioBuffer });
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

    const reverseButton = document.getElementById("reverse");
    if (!reverseButton) {
        throw new Error("No reverse button found");
    }

    playButton.removeAttribute("disabled");
    playButton.addEventListener("click", () => {
        if (isPlaying) {
            reversibleAudioBufferSourceNode.stop();
            reverseButton.setAttribute("disabled", "true");
        } else {
            reversibleAudioBufferSourceNode.start();
            reverseButton.removeAttribute("disabled");
        }

        isPlaying = !isPlaying;
    });

    reverseButton.addEventListener("click", () => {
        if (!isPlaying) {
            console.warn("Cannot reverse while not playing");
            return;
        }

        reversibleAudioBufferSourceNode.setDirection(
            isReverse ? "forward" : "reverse",
        );

        isReverse = !isReverse;
    });
};

document.addEventListener("click", onInteractionHandler);
