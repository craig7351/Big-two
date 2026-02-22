// Simple Web Audio API Synthesizer to avoid external asset dependencies
// This ensures sound works immediately without loading huge files.

class AudioManager {
  private ctx: AudioContext | null = null;
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Lazy initialization handled in init()
  }

  init() {
    if (this.ctx) return;
    
    // Create Audio Context
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();
    
    // Master Volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;

    // Initialize BGM
    this.bgm = new Audio('https://freemusicarchive.org/music/Kevin_MacLeod/Jazz_Sampler/Lobby_Time/download'); // Royalty Free Jazz
    this.bgm.loop = true;
    this.bgm.volume = 0.3;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }

    if (this.bgm) {
      if (this.isMuted) {
        this.bgm.pause();
      } else {
        // Only play if we are "active" (context exists)
        this.bgm.play().catch(e => console.log("Autoplay prevented pending interaction", e));
      }
    }

    return this.isMuted;
  }

  getMuteStatus() {
    return this.isMuted;
  }

  startBGM() {
    this.init();
    if (this.bgm && !this.isMuted) {
      this.bgm.play().catch(e => console.warn("BGM play failed (interaction needed)", e));
    }
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
  }

  // --- Sound Effects Synthesis ---

  playSelect() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    // High pitched short "tick"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playWhoosh() {
    // Card playing sound (Filtered Noise)
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  playPass() {
    // Lower pitched "bloop"
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playError() {
    // Buzzer
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playWin() {
    // Major Arpeggio
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
    let time = this.ctx.currentTime;

    notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time + i * 0.1);
        
        gain.gain.setValueAtTime(0, time + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, time + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.1 + 0.4);

        osc.start(time + i * 0.1);
        osc.stop(time + i * 0.1 + 0.4);
    });
  }
}

export const audioManager = new AudioManager();
