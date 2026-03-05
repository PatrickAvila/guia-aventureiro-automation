/**
 * Retry Helper - Utilities para lidar com testes flaky e operações instáveis
 * Útil para APIs externas (IA, maps, etc) que podem ser lentas/instáveis
 */

/**
 * Executa uma function com retry automático
 * Ideal para operações que podem temporariamente falhar
 * 
 * @param {Function} fn - Função assíncrona a executar
 * @param {Object} options - Configurações
 * @param {number} options.maxRetries - Número máximo de tentativas (default: 3)
 * @param {number} options.delayMs - Delay entre tentativas em ms (default: 1000)
 * @param {Function} options.onRetry - Callback quando retry acontece
 * @param {Array<RegExp>} options.ignoreErrors - Erros que NÃO devem fazer retry
 * @returns {Promise} Resultado da função
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    delayMs = 1000,
    onRetry = null,
    ignoreErrors = [],
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Verificar se é erro que não deve fazer retry
      const shouldIgnore = ignoreErrors.some(pattern =>
        pattern.test(error.message) || pattern.test(error.toString())
      );

      if (shouldIgnore || attempt === maxRetries) {
        throw error;
      }

      // Calcular delay com backoff exponencial
      const backoffMs = delayMs * Math.pow(2, attempt - 1);
      
      if (onRetry) {
        onRetry({ attempt, error, nextDelayMs: backoffMs });
      }

      if (process.env.VERBOSE === 'true') {
        console.warn(`⏱️  Retry ${attempt}/${maxRetries}: ${error.message} (aguardando ${backoffMs}ms)`);
      }

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
}

/**
 * Aguarda uma condição ser verdadeira (útil para polling)
 * 
 * @param {Function} checkFn - Função que retorna boolean
 * @param {Object} options - Configurações
 * @returns {Promise} Resolve quando condição for true
 */
async function waitFor(checkFn, options = {}) {
  const {
    timeoutMs = 5000,
    intervalMs = 100,
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        if (await checkFn()) {
          clearInterval(interval);
          resolve();
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout efter ${timeoutMs}ms esperando condição`));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, intervalMs);
  });
}

/**
 * Testa uma API com retry automático e melhor logging
 * Pensado especificamente para testes de API
 * 
 * @param {Object} axiosConfig - Config do axios (method, url, data, headers, etc)
 * @param {Object} options - Options para retry
 * @returns {Promise} Response do axios
 */
async function axiosWithRetry(axios, axiosConfig, options = {}) {
  const defaultOptions = {
    maxRetries: 3,
    delayMs: 500,
    onRetry: ({ attempt, error, nextDelayMs }) => {
      const status = error.response?.status;
      if (status === 429 || status === 503 || status === 504) {
        console.warn(`⏱️  Server busy (${status}). Tentativa ${attempt}/3 em ${nextDelayMs}ms...`);
      }
    },
    ignoreErrors: [
      /^404/,  // Não retry 404 - recurso não existe
      /^401/,  // Não retry 401 - credenciais inválidas
      /^403/,  // Não retry 403 - forbidden
      /validation/i,  // Não retry erros de validação
    ],
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return withRetry(
    () => axios(axiosConfig),
    mergedOptions
  );
}

/**
 * Pauses execução por tempo específico
 * Útil para dar tempo ao backend processar
 * 
 * @param {number} ms - Millisegundos a esperar
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry decorator para jest tests
 * 
 * @param {Function} testFn - Função de teste
 * @param {number} times - Número de tentativas (default: 2)
 * @returns {Promise}
 */
async function describeAsync(description, suitesFn) {
  return describe(description, suitesFn);
}

module.exports = {
  withRetry,
  waitFor,
  axiosWithRetry,
  sleep,
  describeAsync,
};
