/* eslint-disable no-restricted-globals */

self.onmessage = (e) => {
  const { stage, duration = 16 } = e.data;
  const startTime = performance.now();
  let count = 0;

  while (performance.now() - startTime < duration) {
    if (stage === 'int') {
      // Stressful prime check
      let n = Math.floor(Math.random() * 1000000); 
      let isPrime = true;
      for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
          isPrime = false;
          break;
        }
      }
    } else if (stage === 'float') {
      // Truncated matrix/trig math
      for (let i = 0; i < 100; i++) {
        Math.sin(Math.random()) * Math.cos(Math.random()) * Math.tan(Math.random());
      }
    } else if (stage === 'memory') {
      // Array manipulation
      const arr = new Array(1000).fill(0).map(() => Math.random());
      arr.sort();
      arr.reverse();
    } else if (stage === 'io') {
      // Simulated string manipulation (memory intensive)
      const str = "LuminaOS".repeat(100);
      str.split('').reverse().join('');
    }
    count++;
  }

  self.postMessage({ iterations: count });
};
