import React from "react";

type Props = {};

export default function VoiceStyle({}: Props) {
  return (
    <style jsx global>{`
      .recording-active {
        background-color: rgba(220, 38, 38, 0.04);
        box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.15);
        transition: all 0.2s ease-in-out;
      }

      .recording-active:focus {
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.25);
      }

      .voice-bar {
        width: 3px;
        min-height: 2px;
        border-radius: 3px;
        transition: all 0.1s ease-in-out;
        transform-origin: bottom;
        background: linear-gradient(
          to top,
          rgb(239, 68, 68),
          rgb(248, 113, 113)
        );
        box-shadow: 0 0 4px rgba(239, 68, 68, 0.3);
        animation: voice-bar-scale 0.2s ease-out;
      }

      @keyframes voice-bar-scale {
        from {
          transform: scaleY(0);
        }
        to {
          transform: scaleY(1);
        }
      }

      @keyframes pulse-ring {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.4;
        }
        100% {
          transform: scale(1);
          opacity: 0.8;
        }
      }

      .animate-pulse-ring {
        animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `}</style>
  );
}
