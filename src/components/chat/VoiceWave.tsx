import { useEffect, useState, useRef } from 'react';

interface VoiceWaveProps {
    isRecording: boolean;
    voiceActivity: number[];
}

export function VoiceWave({ isRecording, voiceActivity }: VoiceWaveProps) {
    const [intensity, setIntensity] = useState(0);
    const prevRecordingState = useRef(false);

    // Play sounds on recording state change
    useEffect(() => {
        const playNotificationSound = async (type: 'start' | 'stop') => {
            try {
                const audio = new Audio(`/sounds/mic-${type}.mp3`);
                audio.volume = 1.0; // Full volume
                await audio.play();
            } catch (error) {
                console.error(`Failed to play ${type} sound:`, error);
            }
        };

        // Using setTimeout to ensure state updates have completed
        if (isRecording && !prevRecordingState.current) {
            // Started recording
            playNotificationSound('start');
        } else if (!isRecording && prevRecordingState.current) {
            // Stopped recording
            setTimeout(() => {
                console.log('Attempting to play stop sound');
                playNotificationSound('stop');
            }, 0);
        }

        prevRecordingState.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        if (!isRecording) return;

        // Calculate average activity with enhanced sensitivity for lower volumes
        const weightedAvg = voiceActivity.reduce((acc, val, idx) => {
            // Enhanced weight distribution for better low volume response
            const weight = 1 + (idx / voiceActivity.length);
            // Apply a more aggressive scaling for better volume response
            const scaledVal = Math.pow(val, 0.7) * weight * 2;
            return acc + scaledVal;
        }, 0) / voiceActivity.length;

        // More dramatic scaling with higher maximum
        const targetIntensity = Math.min(Math.max(weightedAvg / 15, 0.1), 1.5);
        // Quick response to volume changes
        setIntensity(prev => prev * 0.5 + targetIntensity * 0.5);
    }, [isRecording, voiceActivity]);

    if (!isRecording) return null;

    return (
        <div className="absolute left-0 right-0 bottom-full mb-2 flex justify-center items-center">
            <div className="bg-primary/5 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                <div className="flex items-center gap-[2px]">
                    {Array.from({ length: 9 }).map((_, i) => {
                        // Create more dramatic wave pattern
                        const centerOffset = Math.abs(i - 4) / 4;
                        const baseHeight = 0.4 + (1 - centerOffset) * 0.8;

                        // Multiple wave patterns for more complex movement
                        const timeOffset = Date.now() / 100; // Faster base animation
                        const primaryWave = Math.sin(timeOffset + i * 0.7) * 0.4;
                        const secondaryWave = Math.cos(timeOffset * 1.2 + i * 0.5) * 0.3;
                        const tertiaryWave = Math.sin(timeOffset * 0.8 - i * 0.3) * 0.2;

                        // Combine waves with intensity for more dramatic effect
                        const waveEffect = (primaryWave + secondaryWave + tertiaryWave) * (0.5 + intensity * 0.8);

                        return (
                            <div
                                key={i}
                                className="w-[2px] bg-primary rounded-full transition-all duration-50"
                                style={{
                                    height: '24px', // Taller base height
                                    transform: `scaleY(${Math.max(
                                        0.15,
                                        (intensity * 0.7 + 0.3) * baseHeight * (1 + waveEffect)
                                    )})`,
                                    opacity: Math.max(0.4, intensity * baseHeight),
                                    transition: 'transform 50ms ease-out, opacity 150ms ease-out',
                                }}
                            />
                        );
                    })}
                </div>
                <span
                    className="text-xs text-primary font-medium transition-all duration-200"
                    style={{
                        opacity: Math.max(0.6, intensity),
                        transform: `scale(${intensity > 0.1 ? 1 : 0.95})`
                    }}
                >
                    Listening...
                </span>
            </div>
        </div>
    );
} 