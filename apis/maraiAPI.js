class MaraiAPI {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:9605',
      timeout: config.timeout || 10000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders
      }
    };

    // Detect environment and adjust base URL if needed
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      this.config.baseUrl = config.secureUrl || this.config.baseUrl.replace('http:', 'https:');
    }
  }

  // Configuration getters
  getBaseUrl() {
    return this.config.baseUrl;
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
  async postSignIn(headers = {}, params = {}) {
    return this.post('/marai/api/user/sign_in', headers, params);
  }

  async getCheckAuth(headers = {}, params = {}) {
    return this.get('/marai/api/user/check_auth', headers, params);
  }

  async getVideoDetail(headers = {}, { youtube_video_id, ...params } = {}) {
    return this.get(`/ytkidd/api/youtube_video/${youtube_video_id}`, headers, params);
  }

  async getChannels(headers = {}, params = {}) {
    return this.get('/ytkidd/api/youtube_channels', headers, params);
  }

  async getBooks(headers = {}, params = {}) {
    return this.get('/ytkidd/api/books', headers, params);
  }

  async getBookDetail(headers = {}, { book_id, ...params } = {}) {
    return this.get(`/ytkidd/api/book/${book_id}`, headers, params);
  }

  async getChannelDetail(headers = {}, { channel_id, ...params } = {}) {
    return this.get(`/ytkidd/api/youtube_channel/${channel_id}`, headers, params);
  }

  async getChannelDetailed(headers = {}, { channel_id, ...params } = {}) {
    return this.get(`/ytkidd/api/youtube_channel/${channel_id}/detailed`, headers, params);
  }

  async deleteBook(headers = {}, { book_id, ...params } = {}) {
    return this.delete(`/ytkidd/api/book/${book_id}`, headers, params);
  }

  async postAIChat(headers = {}, params = {}) {
    return this.post('/ytkidd/api/ai/chat', headers, params);
  }

  async postSignUp(headers = {}, params = {}) {
    return this.post('/ytkidd/api/user/sign_up', headers, params);
  }

  async postScrapYoutubeVideos(headers = {}, params = {}) {
    return this.post('/ytkidd/api/youtube/scrap_videos', headers, params);
  }

  async patchUpdateYoutubeChannel(headers = {}, { id, ...params } = {}) {
    return this.patch(`/ytkidd/api/youtube_channel/${id}`, headers, params);
  }

  async getComfyUIOutput(headers = {}, params = {}) {
    return this.get('/ytkidd/api/comfy_ui/output', headers, params);
  }
}

// Singleton instance with default configuration
const maraiAPI = new MaraiAPI({
  timeout: 10000,
  baseUrl: 'http://localhost:9605',
  secureUrl: null,
  defaultHeaders: {
    'Content-Type': 'application/json'
  }
});

export default maraiAPI;