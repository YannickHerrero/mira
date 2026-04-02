// This file exists so TypeScript can resolve the module.
// At runtime, Metro uses VLCVideoPlayer.native.tsx or VLCVideoPlayer.web.tsx instead.
export { VLCVideoPlayer } from "./VLCVideoPlayer.web";
export type { PlayerState, VLCVideoPlayerProps, PlayerError, PlayerErrorType } from "./VLCVideoPlayer.types";
