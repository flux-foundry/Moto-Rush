import React, { useEffect, useRef, useState } from 'react';

// --- AUDIO ENGINE ---
class AudioEngine {
  ctx: AudioContext | null = null;
  engineOsc: OscillatorNode | null = null;
  engineGain: GainNode | null = null;
  bgmVol = 0.5;
  sfxVol = 0.5;
  isPlaying = false;
  menuBgmPlaying = false;
  nextNoteTime = 0;
  currentStep = 0;

  distanceStage = 0;

  driftGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'triangle';
      
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      
      this.engineOsc.start();

      // Create white noise for drift sound
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.value = 0;
      const driftFilter = this.ctx.createBiquadFilter();
      driftFilter.type = 'lowpass';
      driftFilter.frequency.value = 800;
      whiteNoise.connect(driftFilter);
      driftFilter.connect(this.driftGain);
      this.driftGain.connect(this.ctx.destination);
      whiteNoise.start();

      setInterval(() => this.scheduleMusic(), 50);
    } catch (e) { console.warn('Audio start failed', e); }
  }

  scheduleMusic() {
    if (!this.ctx || this.bgmVol <= 0) return;
    if (!this.isPlaying && !this.menuBgmPlaying) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        if (this.isPlaying) {
            this.playDopeNote(this.currentStep, this.nextNoteTime);
        } else if (this.menuBgmPlaying) {
            this.playMenuNote(this.currentStep, this.nextNoteTime);
        }
        this.currentStep++;
        this.nextNoteTime += 0.125; // 16th notes
    }
  }

  playMenuNote(step: number, time: number) {
      if (!this.ctx) return;
      
      // Catchy Synthwave Arp for Menu
      const arpNotes = [261.63, 311.13, 392.00, 311.13, 261.63, 392.00, 466.16, 392.00]; // C minor 7 arp
      const freq = arpNotes[step % arpNotes.length];
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Layer a square and sawtooth
      osc.type = 'square';
      osc.frequency.value = freq;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(200, time + 0.1);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      gain.gain.setValueAtTime(this.bgmVol * 0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      osc.start(time);
      osc.stop(time + 0.15);

      // Add a slight drum kick on every 4th step
      if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
          const kOsc = this.ctx.createOscillator();
          const kGain = this.ctx.createGain();
          kOsc.type = 'sine';
          kOsc.frequency.setValueAtTime(150, time);
          kOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
          kGain.gain.setValueAtTime(this.bgmVol * 0.4, time);
          kGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          kOsc.connect(kGain);
          kGain.connect(this.ctx.destination);
          kOsc.start(time);
          kOsc.stop(time + 0.1);
      }
  }

  playDopeNote(step: number, time: number) {
      if (!this.ctx) return;
      
      const stage = this.distanceStage || 0;
      
      // Drum Beat
      if (step % 2 === 0) { 
          if (step % 4 === 0) { // Kick
              const kOsc = this.ctx.createOscillator();
              const kGain = this.ctx.createGain();
              kOsc.frequency.setValueAtTime(100, time);
              kOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
              kGain.gain.setValueAtTime(this.bgmVol * 0.9, time);
              kGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
              kOsc.connect(kGain); kGain.connect(this.ctx.destination);
              kOsc.start(time); kOsc.stop(time + 0.1);
          }
      }
      if (step % 8 === 4) { // Snare-ish
          const sOsc = this.ctx.createOscillator();
          const sGain = this.ctx.createGain();
          sOsc.type = 'triangle';
          sOsc.frequency.setValueAtTime(250, time);
          sOsc.frequency.exponentialRampToValueAtTime(10, time + 0.15);
          sGain.gain.setValueAtTime(this.bgmVol * 0.6, time);
          sGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          sOsc.connect(sGain); sGain.connect(this.ctx.destination);
          sOsc.start(time); sOsc.stop(time + 0.15);
      }
      // Hi-hat
      if (step % 2 === 0) {
          const hOsc = this.ctx.createOscillator();
          const hGain = this.ctx.createGain();
          hOsc.type = 'square';
          hOsc.frequency.setValueAtTime(8000, time);
          hGain.gain.setValueAtTime(this.bgmVol * 0.15, time);
          hGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 5000;
          hOsc.connect(filter); filter.connect(hGain); hGain.connect(this.ctx.destination);
          hOsc.start(time); hOsc.stop(time + 0.05);
      }

      // Evolving Synthwave Bassline
      let bassFreqs = [41.20, 41.20, 49.00, 41.20, 55.00, 41.20, 49.00, 36.71]; // Drop E
      if (stage % 3 === 1) {
         bassFreqs = [55.00, 55.00, 65.41, 55.00, 73.42, 55.00, 65.41, 49.00]; 
      } else if (stage % 3 === 2) {
         bassFreqs = [49.00, 49.00, 58.27, 49.00, 65.41, 49.00, 58.27, 43.65];
      }

      if (step % 2 === 0) {
          const freq = bassFreqs[(Math.floor(step/2)) % bassFreqs.length];
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(stage === 0 ? 400 : 1200, time);
          filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);
          
          osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
          gain.gain.setValueAtTime(this.bgmVol * 0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
          
          osc.start(time); osc.stop(time + 0.2);
      }
      
      // Arpeggio in later stages
      if (stage > 0 && step % 1 === 0) {
          const arpNotes = [164.81, 196.00, 246.94, 329.63, 392.00];
          const arpFreq = arpNotes[(step + stage) % arpNotes.length] * (stage > 2 ? 2 : 1);
          
          const aOsc = this.ctx.createOscillator();
          const aGain = this.ctx.createGain();
          aOsc.type = 'square';
          aOsc.frequency.value = arpFreq;
          
          aGain.gain.setValueAtTime(this.bgmVol * 0.1, time);
          aGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          
          aOsc.connect(aGain); aGain.connect(this.ctx.destination);
          aOsc.start(time); aOsc.stop(time + 0.1);
      }
  }

  update(isPlaying: boolean, speedRatio: number, isDrifting: boolean = false, distance: number = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.1;
    this.distanceStage = Math.floor(distance / 20000);

    
    if (isPlaying && !this.isPlaying) {
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
    } else if (!isPlaying) {
        this.isPlaying = false;
    }

    if (isPlaying) {
      const freq = 100 + (speedRatio * 150);
      this.engineOsc?.frequency.setTargetAtTime(freq, t, 0.1);
      this.engineGain?.gain.setTargetAtTime(this.sfxVol * (0.1 + speedRatio * 0.2), t, 0.1);
      
      if (isDrifting && speedRatio > 0.1) {
          this.driftGain?.gain.setTargetAtTime(this.sfxVol * 0.3, t, 0.05);
      } else {
          this.driftGain?.gain.setTargetAtTime(0, t, 0.1);
      }
    } else {
      this.engineGain?.gain.setTargetAtTime(0, t, 0.1);
      this.driftGain?.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  playWhoosh() {
    if (!this.ctx || this.sfxVol <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(this.sfxVol * 0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch(e){}
  }

  playCrash() {
    if (!this.ctx || this.sfxVol <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(this.sfxVol * 0.6, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch(e){}
  }

  playBeep(high: boolean) {
    if (!this.ctx || this.sfxVol <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(high ? 880 : 440, this.ctx.currentTime);
      gain.gain.setValueAtTime(this.sfxVol * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch(e){}
  }

  playWarningBeep() {
    if (!this.ctx || this.sfxVol <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(this.sfxVol * 0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch(e){}
  }

  playClick() {
    // initialize if not already
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    
    if (!this.ctx || this.sfxVol <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(this.sfxVol * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch(e){}
  }

  playVoice(text: string) {
      if (this.sfxVol <= 0) return;
      if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.3;
          utterance.pitch = 1.1;
          utterance.volume = this.sfxVol;
          window.speechSynthesis.speak(utterance);
      }
  }
}

const audio = new AudioEngine();

// --- TYPES & INTERFACES ---
interface GameState {
  state: 'MENU' | 'PLAYING' | 'GAMEOVER' | 'PAUSED';
  score: number;
  highScore: number;
  speed: number;
}

interface Obstacle {
  offsetX: number;
  y: number;
  w: number;
  h: number;
  speedMod: number;
  color: string;
  passed: boolean;
  drift: number;
  dead?: boolean;
  objType?: string;
}

interface AIBike {
  offsetX: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  color: string;
  shirtColor: string;
  pantColor: string;
  helmetColor: string;
  lane: number;
  drift: number;
  dead?: boolean;
}

interface Pickup {
  offsetX: number;
  y: number;
  w: number;
  h: number;
  type: 'nitro' | 'golden_nitro';
}

const getRoadCurve = (globalY: number) => {
  const difficulty = Math.min(1.0, Math.max(0, globalY) / 40000); 
  const wave1 = Math.sin(globalY / 1500) * 150 * difficulty;
  const wave2 = Math.sin(globalY / 2700) * 120 * difficulty;
  return wave1 + wave2;
};

// --- MAIN COMPONENT ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI React State
  const [uiState, setUiState] = useState<'MENU' | 'OPTIONS' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER' | 'PAUSED' | 'EXIT_CONFIRM' | 'EXITED'>('MENU');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
     const onFullscreenChange = () => {
         setIsFullscreen(!!document.fullscreenElement);
     }
     document.addEventListener('fullscreenchange', onFullscreenChange);
     return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  const [controlMode, setControlMode] = useState<'DRAG' | 'TILT'>('DRAG');
  const [scoreData, setScoreData] = useState({ 
    score: 0, 
    highScore: parseInt(localStorage.getItem('retroBikeHi') || '0', 10),
    distance: 0 
  });
  const [volumes, setVolumes] = useState({ sfx: 100, bgm: 100 });
  const [scanlinesEnabled, setScanlinesEnabled] = useState(localStorage.getItem('retroBikeScanlines') !== 'false');
  const scanlinesRef = useRef(scanlinesEnabled);

  useEffect(() => {
    scanlinesRef.current = scanlinesEnabled;
    localStorage.setItem('retroBikeScanlines', String(scanlinesEnabled));
  }, [scanlinesEnabled]);

  // Refs for Game Loop state (avoid React re-renders)
  const engineRef = useRef({
    running: true,
    lastTime: 0,
    bike: { offsetX: 0, targetOffsetX: 0, y: 0, targetY: 0, w: 40, h: 80, lean: 0 },
    obstacles: [] as Obstacle[],
    aiBikes: [] as AIBike[],
    pickups: [] as Pickup[],
    speed: 0,
    minSpeed: 0,
    maxSpeed: 800,
    accel: 300,
    decel: 400,
    nitro: 50,
    isNitroActive: false,
    score: 0,
    distanceScroll: 0,
    isAccelerating: false,
    particles: [] as {offsetX:number, y:number, vx:number, vy:number, life:number, maxLife?:number, size?:number, color:string, type?: string}[],
    shake: 0,
    tiltOffset: 0,
    isDrifting: false,
    driftScore: 0,
    spawnTimer: 0,
    pickupTimer: 0,
    countdownTimer: 0,
    startStatus: 'NONE' as 'NONE' | 'LATE' | 'GOOD' | 'PERFECT',
    startStatusTimer: 0,
    nitroMode: 'OFF' as 'OFF' | 'AUTO',
    nitroHoldDownTime: 0,
    flashTimer: 0,
    activeStunt: { name: '', timer: 0 },
    floatingTexts: [] as {text:string, x:number, y:number, life:number, color:string}[],
    warningBeepTimer: 0
  });

  const pointerRef = useRef({ isDown: false, startX: 0, startBikeX: 0, pointerId: -1 });

  // Initialize Audio & Input Listeners
  useEffect(() => {
    audio.bgmVol = volumes.bgm / 100;
    audio.sfxVol = volumes.sfx / 100;
  }, [volumes]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('button');
      if (target && target.id !== 'nitroBtn' && target.id !== 'driftBtn') {
        audio.playClick();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const startGame = async () => {
    // Request Tilt Permission if needed (MUST be in user action)
    if (controlMode === 'TILT' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
          const response = await (DeviceOrientationEvent as any).requestPermission();
          if (response !== 'granted') {
             console.warn('Device orientation permission not granted');
          }
      } catch (e) {
          console.error(e);
      }
    }

    audio.init();
    if (audio.ctx?.state === 'suspended') audio.ctx.resume();

    const state = engineRef.current;
    state.running = true;
    state.speed = state.minSpeed;
    state.score = 0;
    state.distanceScroll = 0;
    state.obstacles = [];
    state.aiBikes = [];
    state.pickups = [];
    state.particles = [];
    state.isAccelerating = false;
    state.isDrifting = false;
    state.driftScore = 0;
    state.countdownTimer = 3.3; // 3, 2, 1, GO
    state.startStatus = 'NONE';
    state.startStatusTimer = 0;
    state.nitroMode = 'OFF';
    state.isNitroActive = false;
    state.nitro = 0;
    state.nitroHoldDownTime = 0;
    state.flashTimer = 0;
    state.activeStunt = { name: '', timer: 0 };
    state.floatingTexts = [];
    state.warningBeepTimer = 0;
    (state as any).lastAnnouncedTime = 4;
    state.spawnTimer = 0;
    
    const h = window.innerHeight;
    state.bike.offsetX = -state.bike.w / 2;
    state.bike.targetOffsetX = state.bike.offsetX;
    state.bike.y = h * 0.75;
    state.lastTime = 0;
    state.shake = 0;

    setUiState('COUNTDOWN');
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
    let tilt = e.gamma || 0; // -90 to 90
    // If device is held flatter, we might need beta, but gamma is usually right for landscape/portrait rolling left-right
    tilt = Math.max(-40, Math.min(40, tilt));
    engineRef.current.tiltOffset = tilt;
  };

  const gameOver = () => {
    setUiState('GAMEOVER');
    audio.playCrash();
    engineRef.current.shake = 30;
    
    // Spawn crash particles
    for(let i=0; i<20; i++) {
        // sparks
        engineRef.current.particles.push({
            offsetX: engineRef.current.bike.offsetX + engineRef.current.bike.w/2,
            y: engineRef.current.bike.y,
            vx: (Math.random() - 0.5) * 600,
            vy: (Math.random() - 0.5) * 600 - 200,
            life: Math.random() * 1.5,
            color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
            type: 'spark'
        });
    }
    for(let i=0; i<15; i++) {
        // debris
        engineRef.current.particles.push({
            offsetX: engineRef.current.bike.offsetX + engineRef.current.bike.w/2,
            y: engineRef.current.bike.y,
            vx: (Math.random() - 0.5) * 400,
            vy: (Math.random() - 0.5) * 400 - 100,
            life: Math.random() * 2,
            size: Math.random() * 8 + 4,
            color: '#34495e',
            type: 'debris'
        });
    }
    for(let i=0; i<8; i++) {
        // big flames (they don't move much)
        const lifeAmt = Math.random() * 1.5 + 0.5;
        engineRef.current.particles.push({
            offsetX: engineRef.current.bike.offsetX + engineRef.current.bike.w/2 + (Math.random()-0.5)*40,
            y: engineRef.current.bike.y + (Math.random()-0.5)*40,
            vx: (Math.random() - 0.5) * 50,
            vy: -100 - Math.random() * 100,
            life: lifeAmt,
            maxLife: lifeAmt,
            size: Math.random() * 20 + 20,
            color: Math.random() > 0.5 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(243, 156, 18, 0.7)',
            type: 'smoke'
        });
    }

    setScoreData(prev => {
      const hs = Math.max(prev.highScore, Math.floor(engineRef.current.score));
      localStorage.setItem('retroBikeHi', hs.toString());
      return { 
        score: Math.floor(engineRef.current.score), 
        highScore: hs,
        distance: Math.floor(engineRef.current.distanceScroll / 100)
      };
    });
  };

  // --- GAME LOOP ---
  useEffect(() => {
    engineRef.current.running = true;
    // DeviceOrientation tracking
    if (controlMode === 'TILT') {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    
    // Request Tilt Permission if needed
    if (controlMode === 'TILT' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .catch(console.error);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const roadW = Math.min(w * 0.8, 600);
      const baseBikeY = h * 0.75;
      engineRef.current.bike.y = baseBikeY;
      engineRef.current.bike.targetY = baseBikeY;
      engineRef.current.bike.w = roadW * 0.1;
      engineRef.current.bike.h = engineRef.current.bike.w * 2;
    };
    window.addEventListener('resize', resize);
    resize();

    // Input handlers
    const onPointerDown = (e: PointerEvent) => {
      const st = engineRef.current;
      if (uiState === 'COUNTDOWN') {
          if (st.startStatus === 'NONE' && st.countdownTimer <= 3.0) {
              const t = st.countdownTimer;
              if (t > 0.0 && t <= 0.3) {
                  st.startStatus = 'PERFECT';
                  st.startStatusTimer = 2.0;
              } else {
                  // normal start
                  st.startStatusTimer = 0;
              }
          }
      } else if (uiState !== 'PLAYING') return;

      if (!pointerRef.current.isDown) {
          pointerRef.current.isDown = true;
          pointerRef.current.pointerId = e.pointerId;
          engineRef.current.isAccelerating = true;
          pointerRef.current.startX = e.clientX;
          pointerRef.current.startBikeX = engineRef.current.bike.targetOffsetX;
      }
    };
    
    const onPointerMove = (e: PointerEvent) => {
      if (uiState !== 'PLAYING' && uiState !== 'COUNTDOWN') return;
      if (controlMode === 'DRAG' && pointerRef.current.isDown && e.pointerId === pointerRef.current.pointerId) {
        const delta = e.clientX - pointerRef.current.startX;
        engineRef.current.bike.targetOffsetX = pointerRef.current.startBikeX + delta * 1.5;
        // The tilt handle handles itself
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerRef.current.isDown && e.pointerId === pointerRef.current.pointerId) {
          pointerRef.current.isDown = false;
          engineRef.current.isAccelerating = false;
          pointerRef.current.pointerId = -1;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const st = engineRef.current;
      if (uiState === 'COUNTDOWN') {
          if ((e.code === 'Space' || e.code === 'ArrowUp') && st.startStatus === 'NONE' && st.countdownTimer <= 3.0) {
              const t = st.countdownTimer;
              if (t > 0.0 && t <= 0.3) {
                  st.startStatus = 'PERFECT';
                  st.startStatusTimer = 2.0;
              } else {
                  // normal start
                  st.startStatusTimer = 0;
              }
          }
      } else if (uiState !== 'PLAYING') return;

      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engineRef.current.isDrifting = true;
      }
      if (e.code === 'KeyN' || e.code === 'Enter') {
        engineRef.current.isNitroActive = true;
        engineRef.current.nitroHoldDownTime = performance.now();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (uiState !== 'PLAYING' && uiState !== 'COUNTDOWN') return;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engineRef.current.isDrifting = false;
      }
      if (e.code === 'KeyN' || e.code === 'Enter') {
        const timeHeld = performance.now() - engineRef.current.nitroHoldDownTime;
        if (timeHeld < 250) {
            engineRef.current.nitroMode = engineRef.current.nitroMode === 'AUTO' ? 'OFF' : 'AUTO';
            if (engineRef.current.nitroMode === 'OFF') {
                engineRef.current.isNitroActive = false;
            }
        } else {
            engineRef.current.nitroMode = 'OFF';
            engineRef.current.isNitroActive = false;
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Render Helpers
    const drawRetroCar = (x:number, y:number, w:number, h:number, color:string, objType:string='car') => {
      ctx.fillStyle = '#111'; // Shadow
      ctx.beginPath();
      ctx.roundRect(x+5, y+5, w, h, 10);
      ctx.fill();
      
      // Chassis
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      // Based on object type, draw distinct details
      if (objType === 'travel_bus' || objType === 'school_bus') {
          // Bus Roof & Windows
          ctx.fillStyle = '#222';
          ctx.fillRect(x + w*0.05, y + h*0.1, w*0.9, h*0.85); // Big window block
          ctx.fillStyle = color;
          // Grid of windows
          const rows = objType === 'travel_bus' ? 5 : 6;
          for (let i = 0; i < rows; i++) {
              ctx.fillRect(x + w*0.1, y + h*0.15 + i * (h*0.8 / rows), w*0.8, 4); 
          }
          ctx.fillRect(x + w*0.45, y + h*0.1, w*0.1, h*0.85); // Center divider
          
          if (objType === 'school_bus') {
              ctx.fillStyle = '#000';
              ctx.fillRect(x + w*0.3, y + h*0.02, w*0.4, 4); // stripes on top
          }
      } else if (objType === 'oil_truck') {
          // Cab
          ctx.fillStyle = '#34495e';
          ctx.fillRect(x, y, w, h*0.25);
          ctx.fillStyle = '#222';
          ctx.fillRect(x + w*0.1, y + h*0.05, w*0.8, h*0.15); // Windshield
          
          // Tanker body
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x + w*0.05, y + h*0.25, w*0.9, h*0.75, 10);
          ctx.fill();
          
          // Tanker details (caps)
          ctx.fillStyle = '#bdc3c7';
          ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.4, w*0.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.6, w*0.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.8, w*0.2, 0, Math.PI*2); ctx.fill();
          
      } else if (objType === 'truck') {
          // Big rig cab
          ctx.fillStyle = color;
          ctx.fillRect(x, y, w, h*0.3);
          ctx.fillStyle = '#222';
          ctx.fillRect(x + w*0.1, y + h*0.1, w*0.8, h*0.15);
          
          // Cargo trailer
          ctx.fillStyle = '#ecf0f1'; // White trailer
          ctx.fillRect(x + w*0.05, y + h*0.3, w*0.9, h*0.7);
      } else if (objType === 'van') {
          // Van shape (longer roof)
          ctx.fillStyle = '#222';
          ctx.beginPath();
          // Windshield
          ctx.roundRect(x + w*0.1, y + h*0.15, w*0.8, h*0.4, 5);
          ctx.fill();
          
          ctx.fillStyle = color; 
          ctx.fillRect(x + w*0.15, y + h*0.25, w*0.7, h*0.45);
      } else {
          // Car
          ctx.fillStyle = '#222';
          ctx.beginPath();
          // Windshield
          ctx.roundRect(x + w*0.1, y + h*0.25, w*0.8, h*0.45, 5);
          ctx.fill();
          
          // Roof center
          ctx.fillStyle = color; // match body
          ctx.globalAlpha = 0.9;
          ctx.fillRect(x + w*0.15, y + h*0.35, w*0.7, h*0.25);
          ctx.globalAlpha = 1.0;
      }

      // Headlights
      ctx.fillStyle = '#f1c40f'; // Yellowish glow
      ctx.beginPath(); ctx.arc(x + w*0.2, y + 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.8, y + 2, 3, 0, Math.PI*2); ctx.fill();

      // Taillights
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x + w*0.1, y + h - 4, w*0.25, 4);
      ctx.fillRect(x + w*0.65, y + h - 4, w*0.25, 4);
    };

    const drawRetroBike = (x:number, y:number, w:number, h:number, lean:number, thrust:boolean, bodyColor:string='#d32f2f', isNitro:boolean=false, pantColor:string='#2980b9', shirtColor:string='#222', helmetColor:string='#f1c40f') => {
      ctx.save();
      // Pivot around the front slightly to make rear swing
      ctx.translate(x + w/2, y + h * 0.4);
      ctx.rotate(lean * Math.PI / 180);
      const bx = -w/2;
      const by = -h * 0.4;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(10, 10, w*0.4, h*0.5, 0, 0, Math.PI*2);
      ctx.fill();

      // Front Wheel
      ctx.fillStyle = '#111';
      ctx.fillRect(bx + w*0.4, by - h*0.05, w*0.2, h*0.25);
      
      // Forks
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(bx + w*0.35, by + h*0.1, w*0.05, h*0.15);
      ctx.fillRect(bx + w*0.6, by + h*0.1, w*0.05, h*0.15);

      // Handlebars
      ctx.fillStyle = '#222';
      ctx.fillRect(bx + w*0.15, by + h*0.22, w*0.7, h*0.02);
      // Grips
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(bx + w*0.1, by + h*0.21, w*0.1, h*0.04);
      ctx.fillRect(bx + w*0.8, by + h*0.21, w*0.1, h*0.04);

      // Chassis/Fairing
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(bx + w*0.5, by + h*0.15); // Nose
      ctx.lineTo(bx + w*0.8, by + h*0.35); // Right bulge
      ctx.lineTo(bx + w*0.65, by + h*0.6); // Right taper
      ctx.lineTo(bx + w*0.35, by + h*0.6); // Left taper
      ctx.lineTo(bx + w*0.2, by + h*0.35); // Left bulge
      ctx.closePath();
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#34495e';
      ctx.beginPath();
      ctx.moveTo(bx + w*0.5, by + h*0.18);
      ctx.lineTo(bx + w*0.65, by + h*0.3);
      ctx.lineTo(bx + w*0.35, by + h*0.3);
      ctx.closePath();
      ctx.fill();

      // Gas Tank
      ctx.fillStyle = bodyColor === '#d32f2f' ? '#b71c1c' : bodyColor;
      ctx.beginPath();
      ctx.ellipse(bx + w*0.5, by + h*0.45, w*0.2, h*0.15, 0, 0, Math.PI*2);
      ctx.fill();

      // Rear Seat / Tail
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(bx + w*0.35, by + h*0.55);
      ctx.lineTo(bx + w*0.65, by + h*0.55);
      ctx.lineTo(bx + w*0.55, by + h*0.85);
      ctx.lineTo(bx + w*0.45, by + h*0.85);
      ctx.closePath();
      ctx.fill();

      // Exhaust
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(bx + w*0.65, by + h*0.65, w*0.1, h*0.25);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(bx + w*0.67, by + h*0.88, w*0.06, h*0.05);

      // Rear Wheel
      ctx.fillStyle = '#111';
      ctx.fillRect(bx + w*0.4, by + h*0.8, w*0.2, h*0.25); 

      // Rider Legs (Blue Jeans -> pantColor)
      ctx.strokeStyle = pantColor; 
      ctx.lineWidth = w*0.16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Left leg
      ctx.beginPath();
      ctx.moveTo(bx + w*0.3, by + h*0.7); // Hips
      ctx.lineTo(bx + w*0.15, by + h*0.55); // Knee
      ctx.lineTo(bx + w*0.3, by + h*0.65); // Foot on peg
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(bx + w*0.7, by + h*0.7); // Hips
      ctx.lineTo(bx + w*0.85, by + h*0.55); // Knee
      ctx.lineTo(bx + w*0.7, by + h*0.65); // Foot on peg
      ctx.stroke();

      // Rider Body/Jacket
      ctx.fillStyle = shirtColor;
      ctx.beginPath();
      ctx.ellipse(bx + w*0.5, by + h*0.65, w*0.2, h*0.1, 0, 0, Math.PI*2); // Lower back
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(bx + w*0.5, by + h*0.5, w*0.28, h*0.12, 0, 0, Math.PI*2); // Shoulders
      ctx.fill();

      // Arms (Leather Jacket)
      ctx.strokeStyle = shirtColor;
      ctx.lineWidth = w*0.14;
      ctx.beginPath();
      ctx.moveTo(bx + w*0.25, by + h*0.5); // Left shoulder
      ctx.lineTo(bx + w*0.15, by + h*0.35); // Elbow
      ctx.lineTo(bx + w*0.2, by + h*0.22); // Hand on grip
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bx + w*0.75, by + h*0.5); // Right shoulder
      ctx.lineTo(bx + w*0.85, by + h*0.35); // Elbow
      ctx.lineTo(bx + w*0.8, by + h*0.22); // Hand on grip
      ctx.stroke();

      // Helmet
      ctx.fillStyle = helmetColor; // Yellow helmet
      ctx.beginPath();
      ctx.ellipse(bx + w*0.5, by + h*0.4, w*0.22, h*0.12, 0, 0, Math.PI*2);
      ctx.fill();

      // Visor (Facing forward)
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(bx + w*0.5, by + h*0.35, w*0.16, h*0.06, 0, 0, Math.PI*2); 
      ctx.fill();

      // Exhaust Thruster
      if (thrust || isNitro) {
        if (isNitro) {
          ctx.fillStyle = Math.random() > 0.5 ? '#f39c12' : '#e74c3c'; // Massive fire
          ctx.beginPath();
          ctx.moveTo(bx + w*0.65, by + h*0.93);
          ctx.lineTo(bx + w*0.75, by + h*0.93);
          ctx.lineTo(bx + w*0.70, by + h*(1.2 + Math.random()*0.5));
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = Math.random() > 0.5 ? '#3498db' : '#2980b9'; // Blue nitrous fire
          ctx.fillRect(bx + w*0.67, by + h*0.93, w*0.06, h*0.1 + Math.random()*15);
        }
      }
      
      ctx.restore();
    };

    const loop = (timestamp: number) => {
      if (!engineRef.current.running) return;
      animId = requestAnimationFrame(loop);
      
      const st = engineRef.current;
      if (st.lastTime === 0) {
          st.lastTime = timestamp;
          return;
      }
      let dt = (timestamp - st.lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // clamp dt for lag spikes
      st.lastTime = timestamp;

      const w = canvas.width;
      const h = canvas.height;
      const roadW = Math.min(w * 0.8, 600);

      // Logic Update
      if (uiState === 'COUNTDOWN') {
          st.countdownTimer -= dt;
          if (st.startStatusTimer > 0) st.startStatusTimer -= dt;
          
          const currentSec = Math.ceil(st.countdownTimer);
          if (currentSec <= 3 && currentSec > 0 && currentSec !== (st as any).lastAnnouncedTime) {
              (st as any).lastAnnouncedTime = currentSec;
              audio.playBeep(false);
          }

          if (st.countdownTimer <= 0) {
              setUiState('PLAYING');
              audio.playBeep(true);
              if (st.startStatus === 'PERFECT') {
                  st.speed = st.maxSpeed + 200;
                  st.nitro = 100;
                  st.nitroMode = 'AUTO';
                  st.isNitroActive = true;
                  st.flashTimer = 1.0;
                  st.shake = 30; // Camera shake
              } else {
                  st.speed = st.minSpeed;
              }
          }
      } else if (uiState === 'PLAYING') {
        if (st.startStatusTimer > 0) st.startStatusTimer -= dt;
        if (st.flashTimer > 0) st.flashTimer -= dt;
        if (st.shake > 0) st.shake = Math.max(0, st.shake - 60 * dt);

        const diffMult = Math.min(4.0, 1 + (st.score / 5000));

        // Nitro Auto Mode Logic
        if (st.nitroMode === 'AUTO') {
            st.isNitroActive = true;
            if (st.nitro <= 0) {
                st.nitroMode = 'OFF';
                st.isNitroActive = false;
            }
        }

        const baseBikeY = h * 0.75;
        let currentAccel = 0;

        // Dynamic Nitro Button Updating
        const nitroBtn = document.getElementById('nitroBtn');
        if (nitroBtn) {
            let desiredNitroState = 'IDLE';
            if (st.nitroMode === 'AUTO') desiredNitroState = 'AUTO';
            else if (st.isNitroActive) desiredNitroState = 'HOLDING';

            if ((st as any).lastRenderedNitroState !== desiredNitroState) {
                (st as any).lastRenderedNitroState = desiredNitroState;
                if (desiredNitroState === 'AUTO') {
                    nitroBtn.className = "w-20 h-20 border-4 flex flex-col justify-center items-center rounded-full active:scale-95 transition-none outline-none bg-yellow-500 border-yellow-300 shadow-[0_0_20px_rgba(241,196,15,0.8)] animate-pulse text-yellow-900";
                    nitroBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mb-1 pointer-events-none text-yellow-900"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><span class="text-[10px] font-bold tracking-widest leading-none pointer-events-none mt-1 text-yellow-900">AUTO</span>`;
                } else if (desiredNitroState === 'HOLDING') {
                    nitroBtn.className = "w-20 h-20 border-4 flex flex-col justify-center items-center rounded-full active:scale-95 transition-none outline-none bg-orange-500 border-orange-300 shadow-[0_0_20px_rgba(230,126,34,0.6)] text-white";
                    nitroBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mb-1 pointer-events-none"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><span class="text-[10px] font-bold tracking-widest leading-none pointer-events-none mt-1 text-center opacity-90"><span class="text-[7.5px] block font-normal opacity-70">HOLDING</span>N2O</span>`;
                } else {
                    nitroBtn.className = "w-20 h-20 border-4 flex flex-col justify-center items-center rounded-full active:scale-95 transition-none outline-none bg-blue-600/80 border-blue-400 shadow-[0_0_20px_rgba(52,152,219,0.6)] text-white";
                    nitroBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mb-1 pointer-events-none"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><span class="text-[10px] font-bold tracking-widest leading-none pointer-events-none mt-1 text-center opacity-90"><span class="text-[7.5px] block font-normal opacity-70">TAP/HOLD</span>N2O</span>`;
                }
            }
        }

        // Acceleration / Deceleration
        if (st.isNitroActive && st.nitro > 0) {
            st.speed += st.accel * 2 * dt;
            st.nitro -= 20 * dt;
            currentAccel = st.accel * 2;
        } else if (st.isAccelerating) {
            st.speed += st.accel * dt;
            st.nitro += 2 * dt;
            currentAccel = st.accel;
        } else {
            st.speed -= st.decel * dt;
            st.nitro += 5 * dt;
            currentAccel = -st.decel;
        }

        // Physics feedback: adjust bike Y based on acceleration vs speed
        const speedRatio = st.speed / 800;
        const targetPitch = currentAccel > 0 ? (15 * speedRatio) : (st.speed > 200 && currentAccel < 0 ? -25 * Math.min(1.0, speedRatio) : 0);
        st.bike.targetY = baseBikeY + targetPitch;
        st.bike.y += (st.bike.targetY - st.bike.y) * 5 * dt;

        st.nitro = Math.max(0, Math.min(100, st.nitro));
        st.maxSpeed = st.isNitroActive && st.nitro > 0 ? 1500 : 800;
        st.speed = Math.max(st.minSpeed, Math.min(st.speed, st.maxSpeed));
        st.score += (st.speed / 100) * dt * 5;
        st.distanceScroll += st.speed * dt;

         const bikeGlobalY = st.distanceScroll + (h - st.bike.y);

         // Steering
         if (controlMode === 'DRAG') {
            const smoothedSteer = st.bike.targetOffsetX - st.bike.offsetX;
            st.bike.offsetX += smoothedSteer * Math.min(1.0, (st.isDrifting ? 10 : 15) * dt);
         } else {
            const tiltVel = st.tiltOffset * 45; 
            st.bike.offsetX += tiltVel * (st.isDrifting ? 1.5 : 1.0) * dt;
         }

         // Constraints and Lean
         st.bike.offsetX = Math.max(-roadW/2 + 5, Math.min(st.bike.offsetX, roadW/2 - st.bike.w - 5)); // strict boundary
         
         const isOffroad = false; // Offroad explicitly removed, strict clamp replaces it

         let leanDiff = 0;
         if (controlMode === 'DRAG') {
            st.bike.targetOffsetX = Math.max(-roadW/2 - 50, Math.min(st.bike.targetOffsetX, roadW/2 + 50));
            leanDiff = (st.bike.targetOffsetX - st.bike.offsetX);
            leanDiff = Math.max(-100, Math.min(100, leanDiff)); 
         } else {
            leanDiff = st.tiltOffset * 15;
         }

         let targetLean = leanDiff * 0.5;
         targetLean = Math.max(-45, Math.min(45, targetLean));
             
         if (st.isDrifting && !isOffroad) {
             targetLean *= 1.8;
         }

         // More pronounced lean effect at higher speeds 
         let leanSpeedFactor = 1.0 + Math.max(0, (st.speed - 600) / 400); 
         targetLean *= leanSpeedFactor;

         targetLean = Math.max(-55, Math.min(55, targetLean));
         
         st.bike.lean += (targetLean - st.bike.lean) * Math.min(1.0, 15 * dt);

         // Stunt System Tracking
         let currentStunt = '';
         let stuntPointsGained = 0;
         
         if (targetPitch < -15 && !st.isAccelerating) {
             currentStunt = 'STOPPIE';
             const curPts = 15 * dt;
             st.score += curPts;
             stuntPointsGained += curPts;
             st.nitro = Math.min(100, st.nitro + 10 * dt);
         }

         if (st.isDrifting) {
             st.speed = Math.max(st.minSpeed, st.speed - 300 * dt); // Brake effect when drift is held
         }

         if (st.isDrifting && Math.abs(st.bike.lean) > 2 && !isOffroad) {
             const curPts = 5 * dt;
             st.score += curPts;
             stuntPointsGained += curPts;
             st.nitro = Math.min(100, st.nitro + 15 * dt); // Drifting fills nitro heavily
             st.speed = Math.max(st.minSpeed, st.speed - 500 * dt); // Realistic speed penalty for drifting
             currentStunt = 'DRIFT';
             
             // Drift smoke trail below the tires
             const leanRad = st.bike.lean * Math.PI / 180;
             const tireRotX = -(st.bike.h * 0.4) * Math.sin(leanRad);
             const tireRotY = -(st.bike.h * 0.4) * Math.cos(leanRad); // Negative because UI Y goes down but bike is moving up visually relative to camera... wait, the bike's center is roughly at `st.bike.h/2`... Let's just use st.bike.h for the y offset roughly.
             
             // Wait, the pivot logic in drawRetroBike uses:
             // translate(x + w/2, y + h * 0.4)
             // and rear wheel is drawn at: (bx + w*0.4, by + h*0.8) where by = -h*0.4
             // So rear wheel relative to pivot is (0, h*0.4).
             
             const realTireRotX = (st.bike.h * 0.4) * Math.sin(-leanRad); // -leanRad because y is down so rot is clockwise
             const realTireRotY = (st.bike.h * 0.4) * Math.cos(leanRad);
             
             const tireX = st.bike.offsetX + st.bike.w/2 + realTireRotX;
             const tireY = st.bike.y + st.bike.h * 0.4 + realTireRotY + st.bike.h * 0.125; // added h*0.125 for wheel bottom
             
             // Skid Marks
             st.particles.push({
                 offsetX: tireX,
                 y: tireY,
                 vx: 0,
                 vy: st.speed,
                 life: 0.8,
                 maxLife: 0.8,
                 size: st.bike.w * 0.25,
                 color: 'rgba(20, 20, 20, 0.4)',
                 type: 'skid'
             });

             // Smoke Layer - Sleek, Solid, Bold design with dust mix
             const gapY = st.speed * dt;
             const numParticles = Math.max(3, Math.ceil(gapY / 5)); // High density for solid look
             const smokeColors = [
                 `rgba(180, 195, 220, 0.9)`, // original crisp
                 `rgba(140, 150, 160, 0.85)`, // darker dust
                 `rgba(210, 210, 220, 0.9)`, // lighter pop
                 `rgba(110, 115, 120, 0.8)`  // gritty dark dust
             ];
             for (let s = 0; s < numParticles; s++) { 
                 const lerpFact = s / numParticles;
                 let smColor = smokeColors[Math.floor(Math.random() * smokeColors.length)];
                 st.particles.push({
                     offsetX: tireX + (Math.random()-0.5)*2.5,
                     y: tireY + lerpFact * gapY, 
                     vx: -st.bike.lean * 0.08 + (Math.random() - 0.5) * 2.0,
                     vy: st.speed * 0.95 + (Math.random() - 0.5) * 3,
                     life: 0.2, // slightly longer for dynamics
                     maxLife: 0.2,
                     size: st.bike.w * 0.06, // starts very narrow at the tire
                     color: smColor, 
                     type: 'driftSmoke'
                 });
                 
                 // Occasional small dust chunk / debris popping out
                 if (Math.random() > 0.8) {
                    st.particles.push({
                        offsetX: tireX + (Math.random()-0.5)*5,
                        y: tireY + lerpFact * gapY,
                        vx: -st.bike.lean * 0.15 + (Math.random() - 0.5) * 8, // shoots out more
                        vy: st.speed * 0.9 + (Math.random() - 0.5) * 10,
                        life: 0.15,
                        maxLife: 0.15,
                        size: Math.random() * 2 + 1, // small grains
                        color: `rgba(60, 60, 60, 0.9)`, // dark asphalt chunks
                        type: 'debris'
                    });
                 }
             }
         }

         if (currentStunt) {
             if (st.activeStunt.name === 'NEAR MISS' && st.activeStunt.timer > 0.3) {
                 // Yield to NEAR MISS for at least a fraction of a second so user can read it
                 st.activeStunt.timer -= dt;
             } else {
                 st.activeStunt.name = currentStunt;
                 st.activeStunt.timer = 1.0;
             }
             (st as any).accruedStuntPoints = ((st as any).accruedStuntPoints || 0) + stuntPointsGained;

             // Spawn floating text periodically for continuous stunts
             if ((st as any).accruedStuntPoints > 15) {
                 st.floatingTexts.push({
                     text: `+${Math.floor((st as any).accruedStuntPoints)} PT`,
                     x: st.bike.offsetX,
                     y: st.bike.y - 20,
                     life: 0.8,
                     color: '#f1c40f'
                 });
                 (st as any).accruedStuntPoints = 0;
             }
         } else if (st.activeStunt.timer > 0) {
             st.activeStunt.timer -= dt;
             (st as any).accruedStuntPoints = 0;
             if (st.activeStunt.timer <= 0) st.activeStunt.name = '';
         }

         for (let i = st.floatingTexts.length - 1; i >= 0; i--) {
             st.floatingTexts[i].life -= dt;
             st.floatingTexts[i].y -= 40 * dt; // Float up slightly
             if (st.floatingTexts[i].life <= 0) {
                 st.floatingTexts.splice(i, 1);
             }
         }

        // Audio
        audio.update(true, st.speed / 800, st.isDrifting, st.distanceScroll);

         // Traffic Spawning
         st.spawnTimer = (st.spawnTimer || 0) + dt;
         if (st.spawnTimer > (3.0 / diffMult) / (st.speed / 500 || 1)) {
            st.spawnTimer = 0;
            if (Math.random() < 0.6) {
                // Four-Wheeler
                const randLane = Math.floor(Math.random() * 4);
                
                // Randomly choose vehicle type
                const vKeys = ['car', 'truck', 'van', 'travel_bus', 'school_bus', 'oil_truck'];
                let objType = vKeys[Math.floor(Math.random() * vKeys.length)];
                
                let obW = st.bike.w * 1.5;
                let obH = obW * 1.8;
                let forcedColor = '';
                
                if (objType === 'truck') {
                   obW = st.bike.w * 1.8; obH = obW * 2.5;
                } else if (objType === 'van') {
                   obW = st.bike.w * 1.6; obH = obW * 2.2;
                } else if (objType === 'travel_bus') {
                   obW = st.bike.w * 1.8; obH = obW * 3.5;
                   forcedColor = '#ef5777'; // default pinkish red travel bus, can be overridden
                } else if (objType === 'school_bus') {
                   obW = st.bike.w * 1.8; obH = obW * 3.2;
                   forcedColor = '#f1c40f'; // classic yellow
                } else if (objType === 'oil_truck') {
                   obW = st.bike.w * 1.8; obH = obW * 4.0;
                   forcedColor = '#7f8c8d'; // gray
                }
                
                const absoluteSpeed = (50 + Math.random() * 200) * (1 + (diffMult - 1) * 0.3);
                let startY = (absoluteSpeed > st.speed) ? (h + 300) : (-obH - 200);
                
                const obOffsetX = - (roadW / 2) + (randLane * (roadW / 4)) + Math.random() * (roadW/4 - obW);
                
                // Allow longer distance check for longer vehicles
                const inTheWay = st.obstacles.some(o => 
                    startY < o.y + o.h + 200 && startY + obH + 200 > o.y &&
                    obOffsetX < o.offsetX + o.w + 20 && obOffsetX + obW + 20 > o.offsetX
                ) || st.aiBikes.some(b => 
                    startY < b.y + b.h + 200 && startY + obH + 200 > b.y &&
                    obOffsetX < b.offsetX + b.w + 20 && obOffsetX + obW + 20 > b.offsetX
                );
                
                if (!inTheWay) {
                    const colors = ['#2980b9', '#f39c12', '#8e44ad', '#bdc3c7', '#d35400', '#27ae60', '#34495e'];
                    st.obstacles.push({
                       offsetX: obOffsetX, y: startY, w: obW, h: obH,
                       speedMod: absoluteSpeed / 800,
                       color: forcedColor || colors[Math.floor(Math.random() * colors.length)],
                       passed: false, drift: (Math.random() - 0.5) * 20,
                       objType: objType
                    });
                }
            } else {
                // AI Bike
                const randLane = Math.floor(Math.random() * 4);
                const aiW = st.bike.w;
                const aiH = st.bike.h;
                const absoluteSpeed = (150 + Math.random() * 400) * (1 + (diffMult - 1) * 0.4);
                let startY = (absoluteSpeed > st.speed) ? (h + 300) : (-aiH - 200);

                const aiOffsetX = - (roadW / 2) + (randLane * (roadW / 4)) + Math.random() * (roadW/4 - aiW);
                
                const inTheWay = st.obstacles.some(o => 
                    startY < o.y + o.h + 150 && startY + aiH + 150 > o.y &&
                    aiOffsetX < o.offsetX + o.w + 20 && aiOffsetX + aiW + 20 > o.offsetX
                ) || st.aiBikes.some(b => 
                    startY < b.y + b.h + 150 && startY + aiH + 150 > b.y &&
                    aiOffsetX < b.offsetX + b.w + 20 && aiOffsetX + aiW + 20 > b.offsetX
                );

                if (!inTheWay) {
                    const colors = ['#1abc9c', '#e74c3c', '#9b59b6', '#3498db', '#f1c40f'];
                    
                    let bikeColor = colors[Math.floor(Math.random() * colors.length)];
                    let shirtColor = colors[Math.floor(Math.random() * colors.length)];
                    while(shirtColor === bikeColor) {
                       shirtColor = colors[Math.floor(Math.random() * colors.length)];
                    }
                    let pantColor = colors[Math.floor(Math.random() * colors.length)];
                    while(pantColor === shirtColor || pantColor === bikeColor) {
                       pantColor = colors[Math.floor(Math.random() * colors.length)];
                    }
                    let helmetColor = colors[Math.floor(Math.random() * colors.length)];
                    while(helmetColor === shirtColor || helmetColor === pantColor) {
                       helmetColor = colors[Math.floor(Math.random() * colors.length)];
                    }

                    st.aiBikes.push({
                        offsetX: aiOffsetX, y: startY, w: aiW, h: aiH,
                        speed: absoluteSpeed,
                        color: bikeColor,
                        shirtColor: shirtColor,
                        pantColor: pantColor,
                        helmetColor: helmetColor,
                        lane: randLane, drift: 0
                    });
                }
            }
         }

         // Spawn Pickups (Nitro)
         st.pickupTimer = (st.pickupTimer || 0) + dt;
         if (st.pickupTimer > (2.0 * ((diffMult + 1) / 2)) / (st.speed / 500 || 1)) {
            st.pickupTimer = 0;
            if (Math.random() < 0.3) {
               const pW = 20;
               const pH = 40;
               const isGolden = Math.random() < 0.25;
               st.pickups.push({
                   offsetX: (Math.random() - 0.5) * roadW * 0.8,
                   y: -100,
                   w: pW, h: pH, type: isGolden ? 'golden_nitro' : 'nitro'
               });
            }
         }

         // Update Traffic
        const hitMarginX = 8; // adjusted for visual accuracy
        const hitMarginY = 10;
        
        for (let i = st.obstacles.length - 1; i >= 0; i--) {
          const obs = st.obstacles[i];
          if (obs.dead) {
              obs.y += st.speed * dt;
              // Burning effect
              if (Math.random() < 0.6) {
                  const lifeAmt = 0.5 + Math.random() * 0.5;
                  st.particles.push({
                      offsetX: obs.offsetX + obs.w/2 + (Math.random() - 0.5) * obs.w,
                      y: obs.y + obs.h/2 + (Math.random() - 0.5) * obs.h,
                      vx: (Math.random() - 0.5) * 50,
                      vy: st.speed * 0.4 - 100,
                      life: lifeAmt,
                      maxLife: lifeAmt,
                      size: Math.random() * 15 + 10,
                      color: Math.random() > 0.5 ? 'rgba(231, 76, 60, 0.8)' : 'rgba(243, 156, 18, 0.8)',
                      type: 'smoke'
                  });
              }
          } else {
              // Avoid rear-ending other vehicles
              let targetSpeedMod = obs.speedMod;
              for (const other of st.obstacles) {
                  if (other === obs || other.dead) continue;
                  // If other is ahead and in the same lane roughly
                  if (other.y < obs.y && other.y > obs.y - 200) {
                      if (Math.abs(other.offsetX - obs.offsetX) < obs.w * 0.8) {
                          // Match speed
                          targetSpeedMod = Math.min(targetSpeedMod, other.speedMod);
                          break;
                      }
                  }
              }
              const actualSpeed = 800 * targetSpeedMod;
              const relativeSpeed = st.speed - actualSpeed;
              obs.y += relativeSpeed * dt;
              obs.offsetX += obs.drift * dt;
              
              if (obs.offsetX < -roadW/2) { obs.offsetX = -roadW/2; obs.drift *= -1;}
              if (obs.offsetX + obs.w > roadW/2) { obs.offsetX = roadW/2 - obs.w; obs.drift *= -1;}
          }

          if (st.bike.offsetX + hitMarginX < obs.offsetX + obs.w - hitMarginX &&
              st.bike.offsetX + st.bike.w - hitMarginX > obs.offsetX + hitMarginX &&
              st.bike.y + hitMarginY < obs.y + obs.h - hitMarginY &&
              st.bike.y + st.bike.h - hitMarginY > obs.y + hitMarginY) {
              gameOver();
          }

          if (obs.y > h + 300 || obs.y < -300) st.obstacles.splice(i, 1);
        }

        // Update AI Bikes
        for (let i = st.aiBikes.length - 1; i >= 0; i--) {
            const ai = st.aiBikes[i];
            
            if (ai.dead) {
                ai.y += st.speed * dt;
                // Burning effect
                if (Math.random() < 0.6) {
                    const lifeAmt = 0.5 + Math.random() * 0.5;
                    st.particles.push({
                        offsetX: ai.offsetX + ai.w/2 + (Math.random() - 0.5) * ai.w,
                        y: ai.y + ai.h/2 + (Math.random() - 0.5) * ai.h,
                        vx: (Math.random() - 0.5) * 50,
                        vy: st.speed * 0.4 - 100,
                        life: lifeAmt,
                        maxLife: lifeAmt,
                        size: Math.random() * 15 + 10,
                        color: Math.random() > 0.5 ? 'rgba(231, 76, 60, 0.8)' : 'rgba(243, 156, 18, 0.8)',
                        type: 'smoke'
                    });
                }
            } else {
                const relativeSpeed = st.speed - ai.speed;
                ai.y += relativeSpeed * dt;

                // Dynamic behavior - Aggressive overtake or dodge
                const diffY = ai.y - st.bike.y;
                const diffX = st.bike.offsetX - ai.offsetX;
                
                // If close vertically, adjust speed and steer
                if (Math.abs(diffY) < 400 * ((diffMult + 1) / 2)) {
                   if (Math.abs(diffX) < 150 * ((diffMult + 1) / 2)) {
                       // Player is near!
                       if (diffY < 0 && diffY > -200) {
                           // AI is ahead, avoid player
                           ai.offsetX -= Math.sign(diffX) * 100 * diffMult * dt; 
                       } else if (diffY >= 0 && diffY < 300) {
                           // AI is behind, aggressively overtake
                           ai.speed = Math.min(ai.speed + 200 * diffMult * dt, st.maxSpeed + 200);
                           ai.offsetX += Math.sign(diffX) * 80 * diffMult * dt; // Steer into/around player
                       }
                   }
                }
                
                // Natural weaving
                ai.offsetX += Math.sin(timestamp / 500 + i) * 30 * diffMult * dt;

                if (ai.offsetX < -roadW/2 + 20) ai.offsetX = -roadW/2 + 20;
                if (ai.offsetX + ai.w > roadW/2 - 20) ai.offsetX = roadW/2 - ai.w - 20;
            }

            if (st.bike.offsetX + hitMarginX < ai.offsetX + ai.w - hitMarginX &&
                st.bike.offsetX + st.bike.w - hitMarginX > ai.offsetX + hitMarginX &&
                st.bike.y + hitMarginY < ai.y + ai.h - hitMarginY &&
                st.bike.y + st.bike.h - hitMarginY > ai.y + hitMarginY) {
                gameOver();
            }

          if (ai.y > h + 300 || ai.y < -300) st.aiBikes.splice(i, 1);
        }

        // AI vs AI / AI vs Obstacle collisions
        const allVehicles = [...st.obstacles, ...st.aiBikes];
        for (let i = 0; i < allVehicles.length; i++) {
            const v1 = allVehicles[i];
            
            // Near Miss logic with player bike
            if (st.speed > 300) {
                const distY = Math.abs((v1.y + v1.h/2) - (st.bike.y + st.bike.h/2));
                const distX = Math.abs((v1.offsetX + v1.w/2) - (st.bike.offsetX + st.bike.w/2));
                if (distY < st.bike.h && distX > (st.bike.w + v1.w)/2 && distX < (st.bike.w + v1.w)/2 + 40) {
                    if (!v1.passed) {
                        v1.passed = true;
                        st.activeStunt.name = 'NEAR MISS';
                        st.activeStunt.timer = 1.0;
                        st.score += 50;
                        st.nitro = Math.min(100, st.nitro + 10);
                        audio.playWhoosh();
                        const nearMissColors = ['#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#f1c40f'];
                        st.floatingTexts.push({
                            text: '+50 PT',
                            x: v1.offsetX,
                            y: v1.y,
                            life: 1.0,
                            color: nearMissColors[Math.floor(Math.random() * nearMissColors.length)]
                        });
                    }
                }
            }

            if (v1.dead) continue;
            for (let j = i + 1; j < allVehicles.length; j++) {
                const v2 = allVehicles[j];
                if (v2.dead) continue;
                if (v1.offsetX < v2.offsetX + v2.w && v1.offsetX + v1.w > v2.offsetX &&
                    v1.y < v2.y + v2.h && v1.y + v1.h > v2.y) {
                    
                    v1.dead = true;
                    v2.dead = true;
                    // Crash event
                    audio.playCrash();
                    st.shake = Math.max(st.shake, 15);
                    
                    // Explosion particles
                    const crashX = (v1.offsetX + v2.offsetX) / 2 + v1.w / 2;
                    const crashY = (v1.y + v2.y) / 2 + v1.h / 2;
                    for(let k=0; k<15; k++) {
                        // sparks
                        st.particles.push({
                            offsetX: crashX,
                            y: crashY,
                            vx: (Math.random() - 0.5) * 600,
                            vy: (Math.random() - 0.5) * 600 - 100 + st.speed * 0.5,
                            life: Math.random() * 1.5,
                            color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
                            type: 'spark'
                        });
                    }
                    for(let k=0; k<10; k++) {
                        // debris
                        st.particles.push({
                            offsetX: crashX,
                            y: crashY,
                            vx: (Math.random() - 0.5) * 400,
                            vy: (Math.random() - 0.5) * 400 - 50 + st.speed * 0.5,
                            life: Math.random() * 2,
                            size: Math.random() * 8 + 4,
                            color: '#34495e',
                            type: 'debris'
                        });
                    }
                    for(let k=0; k<6; k++) {
                        // big flames
                        const lifeAmt = Math.random() * 1.5 + 0.5;
                        st.particles.push({
                            offsetX: crashX + (Math.random()-0.5)*40,
                            y: crashY + (Math.random()-0.5)*40,
                            vx: (Math.random() - 0.5) * 50,
                            vy: -100 - Math.random() * 100 + st.speed * 0.5,
                            life: lifeAmt,
                            maxLife: lifeAmt,
                            size: Math.random() * 20 + 20,
                            color: Math.random() > 0.5 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(243, 156, 18, 0.7)',
                            type: 'smoke'
                        });
                    }
                }
            }
        }
        
        // Warning Beep Logic
        if (st.warningBeepTimer > 0) {
            st.warningBeepTimer -= dt;
        } else {
            let needsBeep = false;
            [...st.obstacles, ...st.aiBikes].forEach(obj => {
                if (obj.y > h && obj.y < h + 800) {
                    needsBeep = true;
                }
            });
            if (needsBeep && st.speed > 0) {
                audio.playWarningBeep();
                st.warningBeepTimer = 0.5;
            }
        }
        
        // Update Pickups
        for (let i = st.pickups.length - 1; i >= 0; i--) {
            const pk = st.pickups[i];
            const relativeSpeed = st.speed;
            pk.y += relativeSpeed * dt;

            // Collect logic
            if (st.bike.offsetX < pk.offsetX + pk.w && st.bike.offsetX + st.bike.w > pk.offsetX &&
                st.bike.y < pk.y + pk.h && st.bike.y + st.bike.h > pk.y) {
                audio.playWhoosh();
                
                const amount = pk.type === 'golden_nitro' ? 60 : 30;
                st.nitro = Math.min(100, st.nitro + amount);
                st.score += pk.type === 'golden_nitro' ? 200 : 50;
                st.pickups.splice(i, 1);
                
                // Collect effect
                for(let j=0; j<10; j++) {
                    st.particles.push({
                        offsetX: st.bike.offsetX + st.bike.w/2, y: st.bike.y,
                        vx: (Math.random()-0.5)*200, vy: (Math.random()-0.5)*200,
                        life: 0.5, color: pk.type === 'golden_nitro' ? '#f1c40f' : '#3498db', type: 'spark'
                    });
                }
            } else if (pk.y > h + 100) {
                st.pickups.splice(i, 1);
            }
        }

      } else if (uiState === 'GAMEOVER') {
         audio.menuBgmPlaying = false;
         audio.update(false, 0, false);
         if (st.shake > 0) st.shake--;
      } else if (uiState === 'MENU' || uiState === 'OPTIONS' || uiState === 'EXIT_CONFIRM') {
         audio.init();
         if (audio.ctx?.state === 'suspended') audio.ctx.resume();
         audio.menuBgmPlaying = true;
         audio.update(false, 0, false);
      } else {
         audio.menuBgmPlaying = false;
         audio.update(false, 0, false);
      }

      // Update Particles
      st.particles.forEach((p, i) => {
         p.offsetX += p.vx * dt;
         p.y += p.vy * dt;
         p.life -= dt;
         if (p.life <= 0) st.particles.splice(i, 1);
      });

      // --- RENDERING ---
      // Ground / Off-Road
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      
      let speedShake = 0;
      // High speed shake removed/minimized due to visibility issues
      if (st.speed > 800) {
           speedShake = (st.speed - 800) * 0.001;
      }

      if (st.shake > 0) {
        ctx.translate((Math.random()-0.5)*15, (Math.random()-0.5)*15);
      } else if (speedShake > 0) {
        ctx.translate((Math.random()-0.5)*speedShake, (Math.random()-0.5)*speedShake);
      }

      const cameraCurveOffset = getRoadCurve(st.distanceScroll + h - st.bike.y);

      // Draw road in segments
      const segmentHeight = 20;
      const startGlobalY = Math.floor((st.distanceScroll + h) / segmentHeight) * segmentHeight;
      const endGlobalY = Math.floor(st.distanceScroll / segmentHeight) * segmentHeight;

      for (let gY = startGlobalY + segmentHeight; gY >= endGlobalY - segmentHeight; gY -= segmentHeight) {
          const y = h - (gY - st.distanceScroll);
          const roadCenterX = (w / 2) + getRoadCurve(gY) - cameraCurveOffset;
          const rLeft = roadCenterX - roadW / 2;
          
          // Draw road segment
          ctx.fillStyle = '#2d3436';
          ctx.fillRect(rLeft, y, roadW, segmentHeight + 1); 
          
          // Draw curbs (striped borders)
          const isRed = Math.floor(gY / 80) % 2 === 0;
          ctx.fillStyle = isRed ? '#e74c3c' : '#bdc3c7';
          ctx.fillRect(rLeft - 15, y, 15, segmentHeight + 1);
          ctx.fillRect(rLeft + roadW, y, 15, segmentHeight + 1);
          
          // Draw lane dividers
          if (Math.floor(gY / 160) % 2 === 0) {
             ctx.fillStyle = '#7f8c8d';
             const laneSpacing = roadW / 4;
             ctx.fillRect(roadCenterX - laneSpacing - 2, y, 4, segmentHeight + 1);
             ctx.fillRect(roadCenterX - 2, y, 4, segmentHeight + 1);
             ctx.fillRect(roadCenterX + laneSpacing - 2, y, 4, segmentHeight + 1);
          }
      }

      const getObjAbsoluteRenderX = (offsetX: number, objY: number) => {
          const globalY = st.distanceScroll + (h - objY);
          return (w / 2) + getRoadCurve(globalY) - cameraCurveOffset + offsetX;
      };

      // Draw Skid Marks
      st.particles.forEach(p => {
          if (p.type === 'skid') {
              const px = getObjAbsoluteRenderX(p.offsetX, p.y);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = Math.max(0, p.life / p.maxLife || 1);
              const length = Math.max(p.size, (st.speed / 60) * 1.5);
              ctx.fillRect(px - p.size/2, p.y - length, p.size, length*2);
              ctx.globalAlpha = 1.0;
          }
      });

      // Draw Obstacles
      st.obstacles.sort((a,b) => a.y - b.y).forEach(obs => {
        const absX = getObjAbsoluteRenderX(obs.offsetX, obs.y);
        drawRetroCar(absX, obs.y, obs.w, obs.h, obs.color, obs.objType);
      });

      // Draw Pickups (Nitro tube)
      st.pickups.forEach(pk => {
          const absX = getObjAbsoluteRenderX(pk.offsetX, pk.y);
          ctx.save();
          ctx.translate(absX + pk.w/2, pk.y + pk.h/2);
          ctx.rotate(timestamp / 500); // spin
          
          // Glow effect
          ctx.shadowColor = pk.type === 'golden_nitro' ? '#f1c40f' : '#3498db';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Capsule Gradient
          const innerGrad = ctx.createRadialGradient(0, -pk.h/4, 2, 0, 0, pk.h);
          if (pk.type === 'golden_nitro') {
              innerGrad.addColorStop(0, '#f1c40f');
              innerGrad.addColorStop(0.6, '#f39c12');
              innerGrad.addColorStop(1, '#c0392b');
          } else {
              innerGrad.addColorStop(0, '#5dade2');
              innerGrad.addColorStop(0.6, '#2980b9');
              innerGrad.addColorStop(1, '#2c3e50');
          }

          ctx.beginPath();
          ctx.roundRect(-pk.w/2, -pk.h/2, pk.w, pk.h, pk.w/2);
          ctx.fillStyle = innerGrad; 
          ctx.fill();

          // Highlight reflection for 3D effect (glass/plastic tank)
          ctx.beginPath();
          ctx.roundRect(-pk.w/2 + pk.w*0.2, -pk.h/2 + pk.h*0.1, pk.w*0.2, pk.h*0.8, pk.w*0.1); 
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();
          
          ctx.shadowBlur = 0; // reset

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('N2O', 0, 0);
          ctx.restore();
      });

      // Draw AI Bikes
      st.aiBikes.sort((a,b) => a.y - b.y).forEach(ai => {
        const absX = getObjAbsoluteRenderX(ai.offsetX, ai.y);
        drawRetroBike(absX, ai.y, ai.w, ai.h, 0, true, ai.color, false, ai.pantColor, ai.shirtColor, ai.helmetColor);
      });

      // Draw Bike
      if (uiState !== 'GAMEOVER' || st.shake % 4 < 2) {
        const bikeAbsX = getObjAbsoluteRenderX(st.bike.offsetX, st.bike.y);
        drawRetroBike(bikeAbsX, st.bike.y, st.bike.w, st.bike.h, st.bike.lean, st.isAccelerating, '#d32f2f', st.isNitroActive && st.nitro > 0, '#2980b9', '#222', '#f1c40f');
      }

      // Particles
      st.particles.forEach(p => {
          const px = getObjAbsoluteRenderX(p.offsetX, p.y);
          ctx.fillStyle = p.color;
          if (p.type === 'smoke') {
              ctx.beginPath();
              const progress = p.maxLife ? 1 - (p.life / p.maxLife) : 0.5;
              const baseRad = p.size || 15;
              ctx.arc(px, p.y, Math.max(0.1, progress * baseRad), 0, Math.PI*2);
              ctx.fill();
          } else if (p.type === 'driftSmoke') {
              const progress = p.maxLife ? 1 - (p.life / p.maxLife) : 0.5;
              const maxExpansion = st.bike.w * 0.25; // Controlled, sleek expansion
              const rad = p.size + progress * maxExpansion; 
              
              // Solid for first half of life, then fade quickly
              const alphaProgress = Math.min(1, (p.life / p.maxLife) * 2.5); 
              ctx.globalAlpha = Math.max(0, alphaProgress); 
              
              // Base bold solid color
              ctx.beginPath();
              ctx.arc(px, p.y, Math.max(0.1, rad), 0, Math.PI*2);
              ctx.fill(); 

              // Inner crisp white highlight to make it look pop and polished
              ctx.beginPath();
              ctx.arc(px, p.y - rad*0.2, Math.max(0.1, rad * 0.4), 0, Math.PI*2);
              ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * ctx.globalAlpha})`;
              ctx.fill();

              ctx.globalAlpha = 1.0;
          } else if (p.type === 'skid') {
              // Skid marks are drawn before obstacles on the background.
          } else if (p.type === 'debris') {
              ctx.save();
              ctx.translate(px, p.y);
              ctx.rotate((p.offsetX + p.y) / 100); // rotate based on position
              const s = p.size || Math.max(2, p.life * 10);
              ctx.fillRect(-s/2, -s/2, s, s);
              ctx.restore();
          } else if (p.type === 'spark') {
              ctx.beginPath();
              ctx.moveTo(px, p.y);
              ctx.lineTo(px - p.vx * 0.05, p.y - p.vy * 0.05);
              ctx.lineWidth = 2;
              ctx.strokeStyle = p.color;
              ctx.stroke();
          } else {
              ctx.beginPath();
              ctx.arc(px, p.y, p.life * 10, 0, Math.PI*2);
              ctx.fill();
          }
      });

      // Floating Texts
      st.floatingTexts.forEach(ft => {
          const px = getObjAbsoluteRenderX(ft.x, ft.y);
          ctx.fillStyle = ft.color;
          ctx.font = 'bold 20px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = Math.max(0, ft.life);
          ctx.fillText(ft.text, px, ft.y);
      });
      ctx.globalAlpha = 1.0;

      // Dynamic Weather System
      const weatherModes = ['CLEAR', 'EVENING', 'NIGHT', 'RAIN'];
      const cycleLength = 30000;
      
      const prevWeatherIndex = Math.floor(st.distanceScroll / cycleLength) % weatherModes.length;
      const nextWeatherIndex = (prevWeatherIndex + 1) % weatherModes.length;
      
      const prevWeather = weatherModes[prevWeatherIndex];
      const nextWeather = weatherModes[nextWeatherIndex];
      
      const progress = (st.distanceScroll % cycleLength) / cycleLength; // 0 to 1
      
      // We start transitioning to the next weather in the last 15% of the cycle
      let nextAlpha = 0;
      let prevAlpha = 1;
      
      if (progress > 0.85) {
          nextAlpha = (progress - 0.85) / 0.15;
          prevAlpha = 1 - nextAlpha;
      }
      
      const drawWeather = (weatherType: string, alpha: number) => {
          if (alpha <= 0.01 || weatherType === 'CLEAR') return;
          
          if (weatherType === 'EVENING') {
              const grad = ctx.createLinearGradient(0, h, 0, 0); // Bottom to top
              grad.addColorStop(0, `rgba(211, 84, 0, ${0.15 * alpha})`);
              grad.addColorStop(1, `rgba(142, 68, 173, ${0.2 * alpha})`);
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, w, h);
          } else if (weatherType === 'NIGHT') {
              ctx.fillStyle = `rgba(5, 5, 15, ${0.4 * alpha})`;
              ctx.fillRect(0, 0, w, h);
              
              const px = getObjAbsoluteRenderX(st.bike.offsetX, st.bike.y);
              // Headlight and local glow
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              ctx.filter = 'blur(25px)';
              
              const lightGrad = ctx.createRadialGradient(px + st.bike.w/2, st.bike.y, 10, px + st.bike.w/2, st.bike.y - 400, 250);
              lightGrad.addColorStop(0, `rgba(255, 255, 220, ${0.4 * alpha})`);
              lightGrad.addColorStop(1, 'rgba(255, 255, 220, 0)');
              
              ctx.fillStyle = lightGrad;
              ctx.beginPath();
              ctx.moveTo(px + st.bike.w/2 - 5, st.bike.y);
              ctx.lineTo(px + st.bike.w/2 - 190, st.bike.y - 400);
              ctx.lineTo(px + st.bike.w/2 + 190, st.bike.y - 400);
              ctx.lineTo(px + st.bike.w/2 + 5, st.bike.y);
              ctx.fill();
              
              ctx.filter = 'none'; // reset filter for other glows
              
              // Local bike glow
              const locGrad = ctx.createRadialGradient(px + st.bike.w/2, st.bike.y + st.bike.h/2, 10, px + st.bike.w/2, st.bike.y + st.bike.h/2, 100);
              locGrad.addColorStop(0, `rgba(255, 120, 80, ${0.3 * alpha})`);
              locGrad.addColorStop(1, 'rgba(255, 120, 80, 0)');
              ctx.fillStyle = locGrad;
              ctx.beginPath();
              ctx.arc(px + st.bike.w/2, st.bike.y + st.bike.h/2, 100, 0, Math.PI*2);
              ctx.fill();
              ctx.restore();
          } else if (weatherType === 'RAIN') {
              ctx.fillStyle = `rgba(20, 30, 45, ${0.1 * alpha})`;
              ctx.fillRect(0, 0, w, h);
              
              ctx.strokeStyle = `rgba(150, 200, 255, ${0.5 * alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              // use a large persistent random offset using timestamp
              const numDrops = 100 * alpha;
              for(let i=0; i<numDrops; i++) {
                  const startX = (Math.random() * w + (timestamp/10) % w) % w;
                  const startY = (Math.random() * h + (timestamp * 2) % h) % h;
                  ctx.moveTo(startX, startY);
                  ctx.lineTo(startX - 10, startY + 40);
              }
              ctx.stroke();
          }
      };

      drawWeather(prevWeather, prevAlpha);
      drawWeather(nextWeather, nextAlpha);

      // Scanline Effect (Retro CRT Overlay)
      if (scanlinesRef.current) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          for(let i = 0; i < h; i += 4) {
              ctx.fillRect(0, i, w, 1);
          }
      }

      // Telegraphing System for faster entities behind player
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      [...st.obstacles, ...st.aiBikes].forEach(obj => {
          if (obj.y > h && obj.y < h + 800) {
              const absX = getObjAbsoluteRenderX(obj.offsetX, h);
              ctx.fillStyle = timestamp % 400 < 200 ? '#e74c3c' : '#f1c40f'; // blink
              ctx.beginPath();
              ctx.moveTo(absX + obj.w/2 - 15, h - 20);
              ctx.lineTo(absX + obj.w/2 + 15, h - 20);
              ctx.lineTo(absX + obj.w/2, h - 50);
              ctx.closePath();
              ctx.fill();
          }
      });

      ctx.restore();

      // HUD Render
      if (uiState === 'PLAYING' || uiState === 'COUNTDOWN') {
         ctx.textAlign = 'left';
         ctx.fillStyle = '#f1c40f';
         ctx.font = '16px "Press Start 2P"';
         ctx.fillText(`SCORE:${Math.floor(st.score)}`, 16, 35);
         
         ctx.fillStyle = '#fff';
         ctx.font = '12px "Press Start 2P"';
         const currentDistance = Math.floor(st.distanceScroll / 100);
         ctx.fillText(`DIST:${currentDistance}m`, 16, 60);

         const speedKmh = Math.floor(st.speed / 4);
         ctx.textAlign = 'right';
         ctx.fillStyle = speedKmh > 240 ? '#e74c3c' : '#fff';
         ctx.font = '16px "Press Start 2P"';
         // Position speed to the left of the pause button to avoid overlap
         ctx.fillText(`${speedKmh}KM/H`, w - 66, 45);
         
         // Nitro bar
         const barW = Math.min(300, w - 80);
         const barX = w / 2 - barW / 2;
         const barY = 75; // Lowered to give space for HUD texts
         
         // Background of nitro bar
         ctx.fillStyle = '#111';
         ctx.fillRect(barX, barY, barW, 20);
         
         const nitroRatio = Math.max(0, Math.min(1, st.nitro / 100));
         const maxInnerW = Math.max(0, barW - 4);
         const activeW = maxInnerW * nitroRatio;

         if (st.isNitroActive && st.nitro > 0) {
            // Hot orange-red gradient for the bar, fading extending slightly for smooth blending
            const fadeExt = Math.min(15, barW - activeW);
            const grad = ctx.createLinearGradient(barX, barY, barX + activeW + fadeExt, barY);
            grad.addColorStop(0, '#e74c3c');
            grad.addColorStop(0.5, '#f39c12');
            grad.addColorStop(0.8, '#fffacd');
            grad.addColorStop(1, 'rgba(255, 250, 205, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(barX + 2, barY + 2, activeW + fadeExt, 16);
            
            // Cohesive flame inside the tip
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const tipX = barX + 2 + activeW;
            const tipY = barY + 10; // Vertical center
            
            const maxFlameW = Math.min(activeW, 60);

            // Time based waving for smooth animated flame
            const t = Date.now() / 150;
            const wave1 = Math.sin(t) * 3;
            const wave2 = Math.cos(t * 1.5) * 2;
            const wave3 = Math.sin(t * 2.3) * 1;

            // Outer orange glow
            ctx.beginPath();
            ctx.ellipse(tipX - 10 + wave1, tipY, maxFlameW * 0.45, 7.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(230, 74, 25, 0.5)';
            ctx.fill();
            
            // Mid yellow
            ctx.beginPath();
            ctx.ellipse(tipX - 6 + wave2, tipY, maxFlameW * 0.3, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 192, 45, 0.7)';
            ctx.fill();
            
            // Core white-yellow
            ctx.beginPath();
            ctx.ellipse(tipX - 2 + wave3, tipY, maxFlameW * 0.15, 3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();

            ctx.restore();
         } else {
            ctx.fillStyle = '#3498db';
            ctx.fillRect(barX + 2, barY + 2, activeW, 16);
         }
         
         ctx.fillStyle = '#fff';
         ctx.font = '10px "Press Start 2P"';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         // Text shadow for readability
         ctx.shadowColor = '#000';
         ctx.shadowBlur = 4;
         ctx.fillText('N2O', w/2, barY + 10);
         ctx.shadowBlur = 0; // reset
         ctx.textBaseline = 'alphabetic'; // reset

         if (st.activeStunt.name) {
             ctx.fillStyle = '#e67e22';
             ctx.font = '16px "Press Start 2P"';
             ctx.globalAlpha = Math.min(1.0, st.activeStunt.timer);
             // Jiggle effect
             const jiggleX = (Math.random() - 0.5) * 4;
             const jiggleY = (Math.random() - 0.5) * 4;
             ctx.fillText(st.activeStunt.name + '!', w/2 + jiggleX, barY + 40 + jiggleY);
             ctx.globalAlpha = 1.0;
         }

         if (uiState === 'COUNTDOWN') {
             ctx.fillStyle = 'rgba(0,0,0,0.5)';
             ctx.fillRect(0, 0, w, h);
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             
             if (st.countdownTimer > 0) {
                 const timeInt = Math.ceil(st.countdownTimer);
                 const text = timeInt <= 3 ? timeInt.toString() : '';
                 if (text) {
                     ctx.fillStyle = '#f1c40f';
                     ctx.font = 'bold 120px "Press Start 2P"';
                     ctx.fillText(text, w/2, h/3);
                 }
                 ctx.fillStyle = '#fff';
                 ctx.font = '10px "Press Start 2P"';
                 if (st.startStatus === 'NONE') {
                    ctx.fillText('TAP N2O WHEN OVER GO!', w/2, h/3 + 100);
                 } else {
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillText(st.startStatus + ' START', w/2, h/3 + 100);
                 }
             }
         } else if (st.startStatusTimer > 0) {
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             // Draw GO! for the first second of PLAYING
             if (st.startStatusTimer > 1.0) {
                 ctx.fillStyle = '#2ecc71';
                 ctx.font = 'bold 80px "Press Start 2P"';
                 ctx.fillText('GO!', w/2, h/3);
             }
             if (st.startStatus !== 'NONE') {
                 ctx.fillStyle = st.startStatus === 'PERFECT' ? '#f39c12' : '#2ecc71';
                 ctx.font = '24px "Press Start 2P"';
                 ctx.globalAlpha = Math.min(1.0, st.startStatusTimer);
                 ctx.fillText(st.startStatus + ' START!', w/2, h/4);
                 ctx.globalAlpha = 1.0;
             }
         }
         
         if (st.flashTimer > 0) {
             ctx.fillStyle = `rgba(255, 255, 255, ${st.flashTimer})`;
             ctx.fillRect(0, 0, w, h);
         }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => {
      engineRef.current.running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [uiState, controlMode]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
              console.log(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
          });
      } else {
          document.exitFullscreen();
      }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden touch-none font-retro select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* OVERLAYS */}
      {uiState === 'MENU' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white backdrop-blur-sm">
          <h1 className="text-4xl md:text-6xl text-yellow-400 mb-4 tracking-widest text-center" style={{textShadow: '4px 4px 0 #d32f2f'}}>MOTO RUSH</h1>
          <p className="text-sm md:text-base text-gray-300 mb-12 uppercase tracking-wide">Arcade Edition</p>
          
          <div className="flex flex-col items-center space-y-6">
            <button 
              onClick={startGame}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white text-xl md:text-2xl uppercase tracking-wider shadow-[4px_4px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff] transition-all"
            >
              INSERT COIN (PLAY)
            </button>
            
            <button 
              onClick={() => setUiState('OPTIONS')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-lg uppercase tracking-wider shadow-[2px_2px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff] transition-all"
            >
              OPTIONS
            </button>

            <button 
               onClick={() => {
                  setUiState('EXIT_CONFIRM');
               }}
               className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm uppercase tracking-wider shadow-[2px_2px_0_#555] active:translate-y-1 active:shadow-[0_0_0_#555] transition-all"
            >
               EXIT GAME
            </button>
          </div>
        </div>
      )}

      {uiState === 'EXIT_CONFIRM' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 text-white backdrop-blur-md">
          <div className="bg-gray-900 border-4 border-gray-700 p-8 flex flex-col items-center text-center max-w-sm">
            <h2 className="text-xl md:text-2xl text-yellow-400 mb-8 tracking-widest leading-loose">
              DO YOU WANT TO<br/>EXIT THE GAME?
            </h2>
            <div className="flex space-x-6">
              <button 
                onClick={() => {
                   setUiState('EXITED');
                   window.close();
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-lg uppercase shadow-[2px_2px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff] transition-all"
              >
                OK
              </button>
              <button 
                onClick={() => {
                   setUiState('MENU');
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-lg uppercase shadow-[2px_2px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff] transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {uiState === 'EXITED' && (
         <div className="absolute inset-0 bg-black z-50"></div>
      )}

      {uiState === 'OPTIONS' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 text-white backdrop-blur-md">
          <h1 className="text-3xl text-yellow-400 mb-8 tracking-widest text-center">OPTIONS</h1>
          
          <div className="bg-gray-900/80 p-6 border-2 border-gray-700 w-full max-w-sm space-y-6 text-sm mb-8 overflow-y-auto max-h-[60vh]">
            {/* Display/Orientation */}
            <div className="space-y-4">
              <h2 className="text-gray-400 border-b border-gray-700 pb-1">DISPLAY</h2>
              <div className="flex justify-between items-center">
                <span>FULLSCREEN</span>
                <button 
                  onClick={toggleFullscreen}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 hover:bg-gray-700 w-24"
                >
                  {isFullscreen ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span>SCANLINES</span>
                <button 
                  onClick={() => setScanlinesEnabled(prev => !prev)}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 hover:bg-gray-700 w-24"
                >
                  {scanlinesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4 pt-2">
              <h2 className="text-gray-400 border-b border-gray-700 pb-1">CONTROLS</h2>
              <div className="flex justify-between items-center">
                <span>MODE</span>
                <button 
                  onClick={() => setControlMode(prev => prev === 'DRAG' ? 'TILT' : 'DRAG')}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 hover:bg-gray-700 w-24"
                >
                  {controlMode}
                </button>
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">
                {controlMode === 'DRAG' ? 'Hold screen to accelerate, drag left/right to steer.' : 'Hold screen to accelerate, tilt device to steer.'}
              </div>
            </div>
            
            {/* Audio */}
            <div className="space-y-4 pt-2">
              <h2 className="text-gray-400 border-b border-gray-700 pb-1">AUDIO</h2>
              <div className="flex justify-between items-center">
                <span>SFX</span>
                <input type="range" min="0" max="100" value={volumes.sfx} onChange={e => setVolumes({...volumes, sfx: parseInt(e.target.value)})} className="w-32 accent-red-500" />
              </div>
              <div className="flex justify-between items-center">
                <span>MUSIC</span>
                <input type="range" min="0" max="100" value={volumes.bgm} onChange={e => setVolumes({...volumes, bgm: parseInt(e.target.value)})} className="w-32 accent-red-500" />
              </div>
            </div>
          </div>

          <button 
             onClick={() => setUiState('MENU')}
             className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white text-lg uppercase tracking-wider shadow-[4px_4px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff] transition-all"
          >
             BACK
          </button>
        </div>
      )}

      {uiState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white backdrop-blur-sm">
          <h1 className="text-4xl md:text-5xl text-red-500 mb-8 tracking-widest text-center" style={{textShadow: '4px 4px 0 #fff'}}>CRASHED!</h1>
          
          <div className="flex flex-col items-center space-y-4 mb-12 bg-gray-900 p-8 border-4 border-gray-700">
             <div className="text-xl">SCORE: <span className="text-yellow-400">{scoreData.score}</span></div>
             <div className="text-xl">HIGH SCORE: <span className="text-yellow-400">{scoreData.highScore}</span></div>
             <div className="text-xl">DISTANCE: <span className="text-yellow-400">{scoreData.distance}m</span></div>
          </div>

          <div className="flex flex-col space-y-4">
             <button 
               onClick={startGame}
               className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-xl uppercase tracking-wider shadow-[4px_4px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff] transition-all"
             >
               RETRY
             </button>
             <button 
               onClick={() => setUiState('MENU')}
               className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white text-xl uppercase tracking-wider shadow-[4px_4px_0_#fff] mt-4 active:translate-y-1 transition-all"
             >
               MAIN MENU
             </button>
          </div>
        </div>
      )}
      
      {uiState === 'PLAYING' && (
        <>
          <button 
            id="pauseBtn"
            onClick={() => {
                setUiState('PAUSED');
                engineRef.current.running = false; // pause game loop
            }}
            className="absolute top-6 right-4 w-10 h-10 bg-black/50 border-2 border-white text-white flex justify-center items-center text-sm z-20 pointer-events-auto shadow-[2px_2px_0_#fff] active:translate-y-1 active:shadow-[0_0_0_#fff]"
          >
            ||
          </button>
          
          {/* Game Controls */}
          <div 
             className="absolute flex space-x-3 sm:space-x-4 z-20 pointer-events-auto touch-none"
             style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', right: 'max(1.5rem, env(safe-area-inset-right))' }}
          >
            {/* Nitro Button */}
            <button
              id="nitroBtn"
              onPointerDown={(e) => { 
                  e.stopPropagation();
                  const st = engineRef.current;
                  st.nitroHoldDownTime = performance.now();
                  st.isNitroActive = true;
                  st.shake = Math.max(st.shake, 5); // Small nitro shake
              }}
              onPointerUp={(e) => { 
                  e.stopPropagation();
                  const st = engineRef.current;
                  const timeHeld = performance.now() - st.nitroHoldDownTime;
                  if (timeHeld < 250) {
                      st.nitroMode = st.nitroMode === 'AUTO' ? 'OFF' : 'AUTO';
                      if (st.nitroMode === 'OFF') {
                          st.isNitroActive = false;
                      }
                  } else {
                      st.nitroMode = 'OFF';
                      st.isNitroActive = false;
                  }
              }}
              onPointerCancel={(e) => { 
                  e.stopPropagation();
                  const st = engineRef.current;
                  st.nitroMode = 'OFF';
                  st.isNitroActive = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 border-2 sm:border-4 flex flex-col justify-center items-center rounded-full active:scale-95 transition-none outline-none bg-blue-600/80 border-blue-400 shadow-[0_0_15px_rgba(52,152,219,0.5)] text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-0 sm:mb-1 pointer-events-none w-5 h-5 sm:w-7 sm:h-7">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
              <span className="text-[8px] sm:text-[10px] font-bold tracking-widest leading-none pointer-events-none mt-1 text-center opacity-90"><span className="text-[6px] sm:text-[7.5px] block font-normal opacity-70">TAP/HOLD</span>N2O</span>
            </button>

            {/* Drift Button */}
            <button
              id="driftBtn"
              onPointerDown={(e) => { e.stopPropagation(); engineRef.current.isDrifting = true; }}
              onPointerUp={(e) => { 
                  e.stopPropagation(); 
                  engineRef.current.isDrifting = false;
              }}
              onPointerCancel={(e) => { 
                  e.stopPropagation();
                  engineRef.current.isDrifting = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600/80 border-2 sm:border-4 border-red-400 text-white flex flex-col justify-center items-center rounded-full shadow-[0_0_15px_rgba(255,0,0,0.5)] active:bg-red-500 active:scale-95 transition-all outline-none"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-0 sm:mb-1 pointer-events-none w-5 h-5 sm:w-7 sm:h-7">
                <path d="M14 19c-3 0-5-2-5-5s2-5 5-5 5-2 5-5"/>
                <path d="M10 19c-3 0-5-2-5-5s2-5 5-5 5-2 5-5"/>
              </svg>
              <span className="text-[8px] sm:text-[9px] font-bold tracking-widest opacity-80 pointer-events-none">DRIFT</span>
            </button>
          </div>
        </>
      )}

      {uiState === 'PAUSED' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white backdrop-blur-sm">
          <h1 className="text-4xl text-yellow-400 mb-8 tracking-widest text-center">PAUSED</h1>
          
          <div className="bg-gray-900/80 p-6 border-2 border-gray-700 w-full max-w-sm space-y-6 text-sm mb-8 overflow-y-auto max-h-[60vh]">
            {/* Display/Orientation */}
            <div className="space-y-4">
              <h2 className="text-gray-400 border-b border-gray-700 pb-1">DISPLAY</h2>
              <div className="flex justify-between items-center">
                <span>FULLSCREEN</span>
                <button 
                  onClick={toggleFullscreen}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 hover:bg-gray-700 w-24"
                >
                  {isFullscreen ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span>SCANLINES</span>
                <button 
                  onClick={() => setScanlinesEnabled(prev => !prev)}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 hover:bg-gray-700 w-24"
                >
                  {scanlinesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4 pt-2">
              <h2 className="text-gray-400 border-b border-gray-700 pb-1">CONTROLS</h2>
              <div className="flex justify-between items-center">
                <span>MODE</span>
                <button 
                  onClick={() => setControlMode(prev => prev === 'DRAG' ? 'TILT' : 'DRAG')}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 hover:bg-gray-700 w-24"
                >
                  {controlMode}
                </button>
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">
                {controlMode === 'DRAG' ? 'Hold screen to accelerate, drag left/right to steer.' : 'Hold screen to accelerate, tilt device to steer.'}
              </div>
            </div>

            {/* Audio */}
            <div className="space-y-4 pt-2">
              <h2 className="text-gray-400 border-b border-gray-700 pb-1">AUDIO</h2>
              <div className="flex justify-between items-center">
                <span>SFX</span>
                <input type="range" min="0" max="100" value={volumes.sfx} onChange={e => setVolumes({...volumes, sfx: parseInt(e.target.value)})} className="w-32 accent-red-500" />
              </div>
              <div className="flex justify-between items-center">
                <span>MUSIC</span>
                <input type="range" min="0" max="100" value={volumes.bgm} onChange={e => setVolumes({...volumes, bgm: parseInt(e.target.value)})} className="w-32 accent-red-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <button 
              onClick={() => {
                 setUiState('PLAYING');
                 engineRef.current.running = true;
                 engineRef.current.lastTime = performance.now();
              }}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-xl uppercase tracking-wider shadow-[4px_4px_0_#fff] active:translate-y-1 transition-all"
            >
              RESUME
            </button>
            <button 
              onClick={startGame}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white text-xl uppercase tracking-wider shadow-[4px_4px_0_#fff] mt-2 active:translate-y-1 transition-all"
            >
              RESTART
            </button>
            <button 
              onClick={() => setUiState('MENU')}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white text-xl uppercase tracking-wider shadow-[4px_4px_0_#fff] mt-2 active:translate-y-1 transition-all"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

