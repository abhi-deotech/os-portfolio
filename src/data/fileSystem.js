/**
 * Default virtual file system structure for Lumina OS.
 * Organized into folders with text files, media, and system files.
 */

/**
 * The four docs are imported, not duplicated.
 *
 * They used to be pasted here as string literals, which is how the in-app copies and the repo-root
 * files drifted apart: STYLING.md at the root still documented the pre-SDL comma-RGB system long
 * after this copy had been rewritten for SDL, and the Documentation app's "Sync Docs" button
 * fetches the ROOT files from GitHub and overwrites these — so the stale copy won.
 *
 * `?raw` is Vite's native text import. One file, two consumers, no sync step.
 */
import README_MD from '../../README.md?raw';
import ARCHITECTURE_MD from '../../ARCHITECTURE.md?raw';
import TERMINAL_MD from '../../TERMINAL.md?raw';
import STYLING_MD from '../../STYLING.md?raw';

export const DEFAULT_FILE_SYSTEM = [
  {
    id: 'root-documents',
    name: 'Documents',
    children: [
      { id: 'file-readme', name: 'README.md', type: 'text', content: README_MD },
      { id: 'file-architecture', name: 'ARCHITECTURE.md', type: 'text', content: ARCHITECTURE_MD },
      { id: 'file-terminal', name: 'TERMINAL.md', type: 'text', content: TERMINAL_MD },
      { id: 'file-styling', name: 'STYLING.md', type: 'text', content: STYLING_MD },
      { id: 'file-resume', name: 'Resume.pdf', type: 'pdf', url: '/Abhimanyu.pdf' },
      { id: 'file-cover', name: 'CoverLetter.docx', type: 'text', content: 'Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position. With my experience in full-stack development and team leadership, I believe I would be a valuable addition to your team.\n\nBest regards,\nAbhimanyu Saxena' },
      {
        id: 'folder-private',
        name: 'Private',
        type: 'folder',
        children: [
          { id: 'file-journal', name: 'Journal.txt', type: 'text', content: '2024-03-28: Today I finally finished the window manager for Lumina OS. It was a challenge to get the z-index management right, but Framer Motion made the animations a breeze.\n\n2024-03-29: Added the terminal system. It feels so satisfying to type "ls" and see the virtual filesystem react.' },
          { id: 'file-ideas', name: 'Project_Ideas.md', type: 'text', content: '# Future Project Ideas\n\n- AI-driven code architect\n- Decentalized social graph\n- Real-time collaborative IDE\n- Neural-link interface simulation' },
          { id: 'file-passwords', name: 'passwords.txt', type: 'text', content: 'Nice try! I don\'t keep real passwords in a public portfolio. But the password to this OS was "guest" anyway.' },
        ]
      },
    ]
  },
  {
    id: 'root-projects',
    name: 'Projects',
    type: 'folder',
    children: [
      { id: 'file-lumina-os', name: 'Lumina-OS.md', type: 'text', content: '# Lumina OS\nInteractive portfolio operating system simulation.' },
      { id: 'file-workleisure', name: 'WorkLeisure.md', type: 'text', content: '# WorkLeisure\nBooking and membership platform for restaurants that double as workspaces.\nExpress/MongoDB API with Socket.IO, a React 18 portal serving six user roles, and a Flutter mobile wrapper.\n\nLive: https://www.workleisure.in' },
      { id: 'file-tribecart', name: 'TribeCart.md', type: 'text', content: '# TribeCart\npnpm/Turbo monorepo: three Next.js apps (customer, seller, admin) over five Go microservices talking gRPC through shared protobuf contracts.\n\nSource: https://github.com/abhi-deotech/TribeCart' },
      { id: 'project-benchmark', name: 'Benchmark.exe', type: 'executable', content: 'Quantum Benchmarking Tool' },
    ]
  },
  {
    id: 'root-downloads',
    name: 'Downloads',
    children: [
      { id: 'download-lumina-src', name: 'lumina-os-source.zip', type: 'archive', content: 'Lumina OS Source Code Archive' },
      { id: 'download-demo-video', name: 'portfolio-demo.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
      { id: 'download-wallpaper', name: 'lumina-wallpaper.jpg', type: 'image', url: '/src/assets/hero.png' },
    ]
  },
  {
    id: 'root-desktop',
    name: 'Desktop',
    children: [
      { id: 'desktop-shortcut-about', name: 'About Me.url', type: 'shortcut', content: 'Shortcut to About Me application' },
      { id: 'desktop-shortcut-terminal', name: 'Terminal.url', type: 'shortcut', content: 'Shortcut to Terminal application' },
      { id: 'desktop-shortcut-settings', name: 'Settings.url', type: 'shortcut', content: 'Shortcut to Settings application' },
    ]
  },
  {
    id: 'root-pictures',
    name: 'Pictures',
    children: [
      { id: 'pic-hero', name: 'Hero_Shot.jpg', type: 'image', url: '/src/assets/hero.png' },
      { id: 'pic-wallpaper-1', name: 'sunset-glow.jpg', type: 'image', url: '/src/assets/hero.png' },
      { id: 'pic-wallpaper-2', name: 'cyber-grid.jpg', type: 'image', url: '/src/assets/hero.png' },
    ]
  },
  {
    id: 'root-music',
    name: 'Music',
    children: [
      { id: 'music-ambient', name: 'Ambient_Vibe.mp3', type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { id: 'music-electronic', name: 'Cyber_Wave.mp3', type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    ]
  },
  {
    id: 'root-videos',
    name: 'Videos',
    children: [
      { id: 'video-portfolio', name: 'Portfolio_Demo.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
      { id: 'video-tutorial', name: 'OS_Tutorial.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
    ]
  },
  {
    id: 'root-program-files',
    name: 'Program Files',
    children: [
      {
        id: 'pf-lumina-os',
        name: 'Lumina OS',
        children: [
          { id: 'pf-os-executable', name: 'lumina-os.exe', type: 'executable', content: 'Lumina OS Main Executable v1.0.0' },
          { id: 'pf-os-config', name: 'config.json', type: 'text', content: '{\n  "version": "1.0.0",\n  "theme": "purple",\n  "wallpaper": "linux-default",\n  "transparency": true\n}' },
          { id: 'pf-os-manifest', name: 'manifest.json', type: 'text', content: '{\n  "name": "Lumina OS",\n  "version": "1.0.0",\n  "description": "Interactive Portfolio OS",\n  "author": "Abhimanyu Saxena"\n}' },
        ]
      },
      {
        id: 'pf-games',
        name: 'Games',
        children: [
          { id: 'pf-snake-exe', name: 'snake.exe', type: 'executable', content: 'Snake Game Executable' },
          { id: 'pf-memory-exe', name: 'memory.exe', type: 'executable', content: 'Memory Game Executable' },
          { id: 'pf-trivia-exe', name: 'trivia.exe', type: 'executable', content: 'Trivia Game Executable' },
        ]
      },
      {
        id: 'pf-utilities',
        name: 'Utilities',
        children: [
          { id: 'pf-terminal-exe', name: 'terminal.exe', type: 'executable', content: 'Terminal Application' },
          { id: 'pf-file-explorer-exe', name: 'explorer.exe', type: 'executable', content: 'File Explorer Application' },
          { id: 'pf-settings-exe', name: 'settings.exe', type: 'executable', content: 'Settings Application' },
        ]
      },
    ]
  },
  {
    id: 'root-system',
    name: 'System',
    children: [
      { id: 'sys-kernel', name: 'kernel.log', type: 'text', content: '[INFO] Lumina Kernel v1.0.0 starting...\n[OK] Neural Link established.\n[OK] Quantum Particles initialized.\n[OK] Desktop Environment loaded\n[OK] Window System initialized\n[WARNING] Unauthorized SSH attempt detected from 127.0.0.1\n[INFO] All systems operational' },
      { id: 'sys-boot', name: 'boot.log', type: 'text', content: '[0.000000] Linux version 6.8.0-lumina (build@os-portfolio) (gcc 12.3.0)\n[0.000000] Command line: initrd=\\initramfs-linux.img root=PARTUUID=os-root-123 rw\n[0.124512] x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\'\n[1.542100] usb 1-1: New USB device found, idVendor=046d, idProduct=c52b\n[2.891200] EXT4-fs (vda2): mounted filesystem with ordered data mode.\n[3.210041] systemd[1]: Reached target Graphical Interface.' },
      { id: 'sys-registry', name: 'registry.sys', type: 'text', content: 'Lumina OS Registry\n===================\n\n[HKEY_CURRENT_USER\\Software\\LuminaOS]\n"Theme"="purple"\n"Wallpaper"="linux-default"\n"Transparency"=dword:00000001\n\n[HKEY_LOCAL_MACHINE\\System\\CurrentControlSet]\n"KernelVersion"="1.0.0"\n"BootTime"="2024-01-15 10:30:00"\n"Uptime"=dword:01234567' },
      { id: 'sys-audit', name: 'security.audit', type: 'text', content: '=== LUMINA SECURITY AUDIT ===\nDATE: 2024-03-29\nSTATUS: SECURE\n\nVulnerabilities detected: 0\nActive firewalls: 3 (Neural, Quantum, Packet)\nEncryption: AES-256-GCM\nIdentity: Verified Guest Session' },
      { id: 'sys-secrets', name: 'secrets.txt', type: 'text', content: 'Lumina OS Secrets\n================\n\nThe Konami code unlocked more than just a game.\nTry "matrix" after installing the package.\n\nEaster eggs:\n- Type "neofetch" in terminal\n- Try installing hackertools\n- Double-click the desktop rapidly\n- Hold Shift while opening apps\n- Use "magic" command in terminal' },
      { id: 'sys-config', name: 'system.ini', type: 'text', content: '[system]\nkernel_version=1.0.0\ndebug_mode=false\nboot_animation=true\n\n[display]\nresolution=2560x1440\nrefresh_rate=60\ndpi_scale=1.0\n\n[audio]\nenabled=true\nvolume=0.7\necho_cancellation=true' },
      { id: 'sys-env', name: 'environment.sh', type: 'text', content: 'export PATH=$PATH:/usr/local/bin:/opt/lumina/bin\nexport EDITOR=notepad\nexport THEME=purple\nexport USER=guest\nexport HOST=lumina-os' },
      {
        id: 'sys-drivers', name: 'drivers', type: 'folder', children: [
          { id: 'driver-display', name: 'display.sys', type: 'text', content: 'Display Driver v2.1.0\nGPU: Virtual Renderer\nResolution: Adaptive\nRefresh Rate: 60Hz' },
          { id: 'driver-audio', name: 'audio.sys', type: 'text', content: 'Audio Driver v1.5.2\nDevice: Virtual Audio Controller\nSample Rate: 48kHz\nChannels: Stereo' },
          { id: 'driver-network', name: 'network.sys', type: 'text', content: 'Network Driver v3.0.1\nInterface: Virtual Ethernet\nStatus: Connected\nSpeed: 1 Gbps' },
        ]
      },
    ]
  },
  {
    id: 'root-temp',
    name: 'Temp',
    children: [
      { id: 'temp-cache', name: 'cache.tmp', type: 'text', content: 'Temporary cache file\nCreated: ' + new Date().toISOString() + '\nSize: 1.2 MB' },
      { id: 'temp-log', name: 'install.log', type: 'text', content: 'Installation Log\n================\n\n[2024-01-15 10:30:00] Starting installation...\n[2024-01-15 10:30:15] Extracting files...\n[2024-01-15 10:30:45] Installing components...\n[2024-01-15 10:31:00] Configuration complete...\n[2024-01-15 10:31:15] Installation successful!' },
    ]
  },
];
