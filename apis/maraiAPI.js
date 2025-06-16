class MaraiAPI {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:9605',
      secureUrl: config.secureUrl || 'https://marai.cloudflare-avatar-id-1.site',
      timeout: config.timeout || 3600*1000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders
      }
    };

    // Detect environment and adjust base URL if needed
    // if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    //   this.config.baseUrl = config.secureUrl || this.config.baseUrl.replace('http:', 'https:');
    // }
  }

  // Configuration getters
  getBaseUrl() {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return this.config.secureUrl || this.config.baseUrl;
    } else {
      return this.config.baseUrl;
    }
  }

  setAuthToken(token) {
    localStorage.setItem('MA:AT', token)
  }

  getAuthToken() {
    try {
      if (!localStorage || !localStorage.getItem('MA:AT')) {
        return '';
      }
      return localStorage.getItem('MA:AT');
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return '';
    }
  }

  // Core HTTP methods
  async request(method, path, headers = {}, params = {}, body = null) {
    const url = `${this.getBaseUrl()}${path}${method === 'GET' && params ? `?${new URLSearchParams(params)}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.config.defaultHeaders,
          'Authorization': `Bearer ${this.getAuthToken()}`,
          ...headers
        },
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return response

    } catch (error) {
      throw this.handleError(error);
    }
  }

  async requestForm(method, path, headers = {}, params = {}, body = null) {
    const url = `${this.getBaseUrl()}${path}${method === 'GET' && params ? `?${new URLSearchParams(params)}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const formHeaders = new Headers();
    formHeaders.append("Authorization", `Bearer ${this.getAuthToken()}`);

    try {
      const response = await fetch(url, {
        method,
        headers: formHeaders,
        body: body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return response

    } catch (error) {
      throw this.handleError(error);
    }
  }

  async get(path, headers = {}, params = {}) {
    return this.request('GET', path, headers, params);
  }

  async post(path, headers = {}, body = {}) {
    return this.request('POST', path, headers, {}, body);
  }

  async patch(path, headers = {}, body = {}) {
    return this.request('PATCH', path, headers, {}, body);
  }

  async delete(path, headers = {}, params = {}) {
    return this.request('DELETE', path, headers, params);
  }

  // Error handling
  handleError(error) {
    if (error.name === 'AbortError') {
      return new Error('Request timed out');
    }
    return error instanceof Error ? error : new Error('An unknown error occurred');
  }

  // API Endpoints
  async postSignIn(headers = {}, body = {}) {
    return this.post('/marai/api/user/sign_in', headers, body);
  }

  async getCheckAuth(headers = {}, params = {}) {
    return this.get('/marai/api/user/check_auth', headers, params);
  }

  async postCreateAutoDubbingTask(headers = {}, body = {}) {
    return this.requestForm('POST', '/marai/api/tasks/video/auto_dubbing', headers, {}, body);
  }

  async postCreateTranscriptingTask(headers = {}, body = {}) {
    return this.requestForm('POST', '/marai/api/tasks/transcripting', headers, {}, body);
  }

  async postProcessTask(headers = {}, body = {}) {
    return this.requestForm('POST', `/marai/api/tasks/${body.slug}/process`, headers, {}, body);
  }

  async getTaskList(headers = {}, params = {}) {
    return this.get('/marai/api/tasks', headers, params);
  }

  async getTaskDetail(headers = {}, params = {}) {
    return this.get(`/marai/api/tasks/${params.slug}/detail`, headers, params);
  }

  async getTaskStatus(headers = {}, params = {}) {
    return this.get(`/marai/api/tasks/${params.slug}/status`, headers, params);
  }

  async getDubbingInfo(headers = {}, params = {}) {
    return this.get(`/marai/api/tasks/${params.slug}/dubbing_info`, headers, params);
  }

  async getTranscriptInfo(headers = {}, params = {}) {
    return this.get(`/marai/api/tasks/${params.slug}/transcript_info`, headers, params);
  }

  async deleteTask(headers = {}, { book_id, ...params } = {}) {
    return this.delete(`/marai/api/tasks/${params.slug}`, headers, params);
  }

  async getTaskLog(headers = {}, params = {}) {
    return this.get(`/marai/api/tasks/${params.slug}/log`, headers, params);
  }

  // EXAMPLE

  async patchUpdateYoutubeChannel(headers = {}, { id, ...params } = {}) {
    return this.patch(`/ytkidd/api/youtube_channel/${id}`, headers, params);
  }
}

// Singleton instance with default configuration
const maraiAPI = new MaraiAPI({
  timeout: 3600000,
  baseUrl: 'http://localhost:9605',
  secureUrl: null,
  defaultHeaders: {
    'Content-Type': 'application/json'
  }
});

export default maraiAPI;
