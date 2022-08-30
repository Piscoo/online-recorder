# Online Recorder
online screen/audio recorder base on browser(Chrome is suggested).

### APIs
+ use `navigator.mediaDevices.getUserMedia(options)` to record microphone and camera view;

+ use `navigator.mediaDevices.getDisplayMedia(options)` to record screen view and system audio(Mac os can only record tab page audio of browser);

### fix duration
browser recorder return a webm video, without duration info, got a quick solution here => [fix-webm-duration]("https://github.com/yusitnikov/fix-webm-duration")