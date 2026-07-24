export class AudioAnalyser {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
    this.dataArray = null;
    this.isRecording = false;

    // Metric tracking
    this.startTime = 0;
    this.totalSilenceTime = 0;
    this.lastActiveTime = 0;
    this.maxIntensity = 0;
    this.silenceThreshold = 0.015; // Amplitude threshold for silence
    this.pauseThresholdMs = 1500;   // 1.5 seconds below threshold is a pause
    this.pausesCount = 0;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.totalPauseDuration = 0;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.isRecording = true;
      this.startTime = Date.now();
      this.lastActiveTime = Date.now();
      this.totalSilenceTime = 0;
      this.maxIntensity = 0;
      this.pausesCount = 0;
      this.isPaused = false;
      this.totalPauseDuration = 0;
      
      return true;
    } catch (err) {
      console.error("Failed to start audio analyser:", err);
      return false;
    }
  }

  getVolume() {
    if (!this.isRecording || !this.analyser) return 0;
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    let sumSquares = 0.0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const norm = (this.dataArray[i] - 128) / 128; // Normalize to [-1, 1]
      sumSquares += norm * norm;
    }
    
    const rms = Math.sqrt(sumSquares / this.dataArray.length);
    
    // Track peak volume (intensity)
    if (rms > this.maxIntensity) {
      this.maxIntensity = rms;
    }
    
    const now = Date.now();
    
    // Silence detection
    if (rms < this.silenceThreshold) {
      const silenceChunk = 100; // Sample approximate time chunk
      this.totalSilenceTime += silenceChunk;
      
      if (!this.isPaused) {
        this.isPaused = true;
        this.pauseStartTime = now;
      } else {
        const currentPauseLen = now - this.pauseStartTime;
        if (currentPauseLen >= this.pauseThresholdMs && (now - this.lastActiveTime) > this.pauseThresholdMs) {
          // Increment pauses count once when it surpasses threshold
          this.pausesCount++;
          this.lastActiveTime = now; // Prevent double counting
        }
      }
    } else {
      if (this.isPaused) {
        this.isPaused = false;
        const pauseLen = now - this.pauseStartTime;
        if (pauseLen >= this.pauseThresholdMs) {
          this.totalPauseDuration += pauseLen;
        }
      }
      this.lastActiveTime = now;
    }
    
    return rms;
  }

  getMetrics() {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const silenceRatio = elapsedSeconds > 0 ? (this.totalSilenceTime / 1000) / elapsedSeconds : 0;
    
    return {
      silenceRatio: Math.min(silenceRatio, 1),
      maxIntensity: this.maxIntensity,
      pausesCount: this.pausesCount,
      totalPauseDurationSeconds: this.totalPauseDuration / 1000,
    };
  }

  stop() {
    this.isRecording = false;
    if (this.source) this.source.disconnect();
    if (this.audioContext) this.audioContext.close();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }
}
