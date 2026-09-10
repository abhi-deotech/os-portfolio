/**
 * The GPU stage of Quantum Bench: a real WebGPU compute workload.
 *
 * Deliberately not a worker. The other four stages are worker-based because they are CPU-bound and
 * would freeze the shell otherwise; GPU work is not. Submitting a dispatch is cheap, the GPU does
 * the work off-thread, and `onSubmittedWorkDone()` yields while it runs. A worker would add a
 * message hop and buy nothing.
 *
 * The kernel is a dense NxN single-precision matrix multiply — the honest primitive for "how fast
 * is this GPU at arithmetic", and one whose cost is exactly known (2*N^3 FLOPs), so the reported
 * GFLOPS is measured rather than scored on an invented scale.
 */

/** Matrix edge length. 512 keeps each buffer at 1 MiB, well inside any adapter's binding limits. */
const N = 512;

/** 2*N^3: one multiply and one add per element of the dot product, for each of N*N outputs. */
const FLOPS_PER_DISPATCH = 2 * N ** 3;

/** Target wall time for one slice. Short enough that the progress bar moves smoothly. */
const TARGET_SLICE_MS = 60;

const SHADER = /* wgsl */ `
@group(0) @binding(0) var<storage, read>       a : array<f32>;
@group(0) @binding(1) var<storage, read>       b : array<f32>;
@group(0) @binding(2) var<storage, read_write> c : array<f32>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let row = gid.y;
  let col = gid.x;
  if (row >= ${N}u || col >= ${N}u) {
    return;
  }
  var sum = 0.0;
  for (var k = 0u; k < ${N}u; k = k + 1u) {
    sum = sum + a[row * ${N}u + k] * b[k * ${N}u + col];
  }
  c[row * ${N}u + col] = sum;
}
`;

/**
 * Identify the adapter without building anything on it.
 *
 * @returns {Promise<{vendor: string, architecture: string, description: string}|null>}
 *   null when WebGPU is absent or no adapter answers.
 */
export async function probeGpuAdapter() {
  if (typeof navigator === 'undefined' || !navigator.gpu) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    // `adapter.info` is the current shape; `requestAdapterInfo()` was the earlier one. Either may
    // return empty strings — the spec lets a UA withhold these for fingerprinting reasons, so
    // every field here is optional and the caller must cope with "unknown".
    const info = adapter.info ?? (await adapter.requestAdapterInfo?.()) ?? {};
    return {
      vendor: info.vendor || '',
      architecture: info.architecture || '',
      description: info.description || info.device || '',
    };
  } catch {
    return null;
  }
}

/**
 * Build the compute pipeline and its buffers once, so a slice is pure dispatch cost.
 *
 * @returns {Promise<{info: object, runSlice: () => Promise<{flops: number, ms: number}>,
 *   destroy: () => void} | null>} null when WebGPU is unavailable or the device could not be built.
 */
export async function createGpuBench() {
  if (typeof navigator === 'undefined' || !navigator.gpu) return null;

  let device;
  let info = {};
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    info = adapter.info ?? (await adapter.requestAdapterInfo?.()) ?? {};
    device = await adapter.requestDevice();
  } catch {
    return null;
  }

  let lost = false;
  device.lost.then(() => { lost = true; });

  const bytes = N * N * 4;
  const mk = (usage) => device.createBuffer({ size: bytes, usage });
  const STORAGE = GPUBufferUsage.STORAGE;
  const bufA = mk(STORAGE | GPUBufferUsage.COPY_DST);
  const bufB = mk(STORAGE | GPUBufferUsage.COPY_DST);
  const bufC = mk(STORAGE);

  // Real values, not zeros: denormals and constant operands are exactly the inputs a driver or an
  // FPU can shortcut, and a benchmark that measures a shortcut measures nothing.
  const seed = new Float32Array(N * N);
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random() + 0.5;
  device.queue.writeBuffer(bufA, 0, seed);
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random() + 0.5;
  device.queue.writeBuffer(bufB, 0, seed);

  let pipeline;
  try {
    device.pushErrorScope('validation');
    pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: device.createShaderModule({ code: SHADER }), entryPoint: 'main' },
    });
    const err = await device.popErrorScope();
    if (err) throw new Error(err.message);
  } catch {
    device.destroy();
    return null;
  }

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: bufA } },
      { binding: 1, resource: { buffer: bufB } },
      { binding: 2, resource: { buffer: bufC } },
    ],
  });

  const groups = Math.ceil(N / 16);
  // Grows toward TARGET_SLICE_MS. Starting at 1 means the first slice is never a long stall on a
  // slow adapter — the batch size finds the machine rather than assuming it.
  let batch = 1;

  const runSlice = async () => {
    if (lost) return { flops: 0, ms: 0 };

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    for (let i = 0; i < batch; i++) pass.dispatchWorkgroups(groups, groups);
    pass.end();

    const started = performance.now();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const ms = performance.now() - started;

    const flops = FLOPS_PER_DISPATCH * batch;

    // Retarget from the rate just measured rather than doubling blindly, and clamp the step so one
    // noisy sample cannot swing the batch size wildly.
    if (ms > 0) {
      const ideal = (batch * TARGET_SLICE_MS) / ms;
      batch = Math.max(1, Math.min(256, Math.round(Math.max(batch / 4, Math.min(batch * 4, ideal)))));
    }

    return { flops, ms };
  };

  return {
    info: {
      vendor: info.vendor || '',
      architecture: info.architecture || '',
      description: info.description || info.device || '',
    },
    runSlice,
    destroy: () => { if (!lost) device.destroy(); },
  };
}
