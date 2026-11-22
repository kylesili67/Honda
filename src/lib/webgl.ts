export interface WebGLCapabilitiesReport {
  supported: boolean;
  isSoftware: boolean;
  rendererName: string;
}

let cachedReport: WebGLCapabilitiesReport | null = null;

/**
 * Safely probes WebGL2 / WebGL1 availability and checks the GPU renderer string
 * to detect software rasterizers (SwiftShader, llvmpipe, WARP) without leaking contexts.
 */
export function detectWebGLSupport(): WebGLCapabilitiesReport {
  if (cachedReport) return cachedReport;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, isSoftware: false, rendererName: 'ssr' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null);

    if (!gl) {
      cachedReport = { supported: false, isSoftware: false, rendererName: 'unavailable' };
      return cachedReport;
    }

    let rendererName = '';
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      rendererName = String(gl.getParameter(param) || '');
    } catch {
      rendererName = 'webgl-generic';
    }

    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    cachedReport = {
      supported: true,
      isSoftware,
      rendererName,
    };
    return cachedReport;
  } catch {
    cachedReport = { supported: false, isSoftware: false, rendererName: 'error' };
    return cachedReport;
  }
}

export function supportsWebGL(): boolean {
  return detectWebGLSupport().supported;
}
