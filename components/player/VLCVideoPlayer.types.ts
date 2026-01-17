import type { AudioTrack, TextTrack, SelectedTrack } from "react-native-video";

export type PlayerErrorType = "unplayable_format" | "network" | "unknown";

export interface PlayerError {
  type: PlayerErrorType;
  message: string;
  isIso?: boolean;
}

export interface VLCVideoPlayerProps {
  url: string;
  title?: string;
  initialPosition?: number;
  onProgress?: (position: number, duration: number) => void;
  onEnd?: () => void;
  onBack?: () => void;
  onError?: (error: PlayerError) => void;
}

export interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  brightness: number;
  playbackRate: number;
  audioTracks: AudioTrack[];
  textTracks: TextTrack[];
  selectedAudioTrack?: SelectedTrack;
  selectedTextTrack?: SelectedTrack;
  isLocked: boolean;
}
