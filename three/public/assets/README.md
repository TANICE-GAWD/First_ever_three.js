# Assets Directory

## Required Files

### rickroll.mp4
Place the "Never Gonna Give You Up" music video file here as `rickroll.mp4`.

**Requirements:**
- Format: MP4 with web-compatible codecs (H.264 video, AAC audio)
- Recommended resolution: 480p or 720p for optimal performance
- File should be optimized for web playback
- Ensure the video has proper CORS headers if served from a different domain

**Usage:**
This video will be used by the V0 particle animation component to create the rickroll effect when users hover over the particle text.

**Configuration:**
The video path is configured in `src/Versions/V0.jsx` in the `VIDEO_CONFIG` constant:
```javascript
const VIDEO_CONFIG = {
  url: '/assets/rickroll.mp4',  // Path to rickroll video
  muted: true,                  // Start muted (can be toggled)
  loop: true,                   // Loop video continuously
  crossOrigin: 'anonymous',     // Enable canvas access
  preload: 'metadata'           // Preload video metadata only
};
```