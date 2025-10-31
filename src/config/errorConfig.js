/**
 * 全局错误处理配置
 * 集中管理所有错误处理相关的配置和映射
 */

/**
 * 错误类型枚举
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  BUSINESS: 'business',
  SYSTEM: 'system',
  AI: 'ai',
  DATABASE: 'database'
};

/**
 * 错误严重程度枚举
 */
export const ERROR_SEVERITY = {
  LOW: 'low',       // 轻微错误，不影响主要功能
  MEDIUM: 'medium', // 中等错误，需要用户注意
  HIGH: 'high',     // 严重错误，阻止用户操作
  CRITICAL: 'critical' // 关键错误，需要立即处理
};

// 移除对useErrorHandler的导入，因为我们现在在这里定义了常量
// import { ERROR_TYPES, ERROR_SEVERITY } from '../hooks/useErrorHandler.js';

/**
 * 错误消息映射配置
 * 将技术错误消息映射为用户友好的提示
 */
export const ERROR_MESSAGE_MAP = {
  // 网络相关错误
  network: {
    'Failed to fetch': '网络连接失败，请检查网络后重试。如问题持续，请联系开发人员。',
    'Network request failed': '网络请求失败，请稍后重试。如问题持续，请联系开发人员。',
    'Timeout': '请求超时，请稍后重试。如问题持续，请联系开发人员。',
    'CORS': '跨域请求失败，请联系开发人员。'
  },

  // TCB SDK 相关错误
  tcb: {
    'cloud function execution failed': '云函数执行失败，请稍后重试。如问题持续，请联系开发人员。',
    'database operation failed': '数据库操作失败，请稍后重试。如问题持续，请联系开发人员。',
    'authentication failed': '身份验证失败，请重新登录。如问题持续，请联系开发人员。',
    'permission denied': '权限不足，无法执行此操作。如问题持续，请联系开发人员。',
    'quota exceeded': '使用额度已达上限，请升级套餐。如问题持续，请联系开发人员。',
    'service unavailable': '服务暂时不可用，请稍后重试。如问题持续，请联系开发人员。'
  },

  // AI/推荐相关错误
  ai: {
    'AI service unavailable': 'AI服务暂时不可用，请稍后重试。如问题持续，请联系开发人员。',
    'recommendation failed': '推荐生成失败，请稍后重试。如问题持续，请联系开发人员。',
    'model loading failed': 'AI模型加载失败，请稍后重试。如问题持续，请联系开发人员。',
    'content generation failed': '内容生成失败，请稍后重试。如问题持续，请联系开发人员。'
  },

  // 验证相关错误
  validation: {
    'invalid input': '输入信息格式不正确，请检查后重新输入。如问题持续，请联系开发人员。',
    'required field missing': '必填字段不能为空，请完善信息。如问题持续，请联系开发人员。',
    'format error': '数据格式错误，请检查输入内容。如问题持续，请联系开发人员。',
    'length exceeded': '输入内容过长，请适当缩减。如问题持续，请联系开发人员。'
  },

  // 业务逻辑错误
  business: {
    'operation not allowed': '当前操作不被允许，请检查条件。如问题持续，请联系开发人员。',
    'resource not found': '请求的资源不存在。如问题持续，请联系开发人员。',
    'duplicate entry': '数据已存在，请勿重复提交。如问题持续，请联系开发人员。',
    'insufficient balance': '余额不足，无法完成操作。如问题持续，请联系开发人员。'
  }
};

/**
 * 错误类型映射配置
 * 根据错误消息关键词自动识别错误类型
 */
export const ERROR_TYPE_PATTERNS = [
  {
    type: ERROR_TYPES.NETWORK,
    patterns: [
      /failed to fetch/i,
      /network.*error/i,
      /connection.*failed/i,
      /timeout/i,
      /cors/i,
      /网络/i,
      /连接/i
    ]
  },
  {
    type: ERROR_TYPES.AUTH,
    patterns: [
      /unauthorized/i,
      /authentication.*failed/i,
      /permission.*denied/i,
      /login.*required/i,
      /认证/i,
      /权限/i,
      /登录/i
    ]
  },
  {
    type: ERROR_TYPES.AI,
    patterns: [
      /ai.*service/i,
      /recommendation.*failed/i,
      /model.*loading/i,
      /content.*generation/i,
      /AI/i,
      /推荐/i,
      /生成/i
    ]
  },
  {
    type: ERROR_TYPES.DATABASE,
    patterns: [
      /database.*operation/i,
      /query.*failed/i,
      /data.*error/i,
      /数据库/i,
      /查询/i
    ]
  },
  {
    type: ERROR_TYPES.VALIDATION,
    patterns: [
      /invalid.*input/i,
      /validation.*error/i,
      /required.*field/i,
      /format.*error/i,
      /验证/i,
      /格式/i,
      /必填/i
    ]
  },
  {
    type: ERROR_TYPES.BUSINESS,
    patterns: [
      /operation.*not.*allowed/i,
      /resource.*not.*found/i,
      /duplicate.*entry/i,
      /business.*logic/i,
      /操作.*不允许/i,
      /资源.*不存在/i,
      /重复/i
    ]
  }
];

/**
 * 错误严重程度配置
 * 根据错误类型和上下文确定错误严重程度
 */
export const ERROR_SEVERITY_CONFIG = {
  [ERROR_TYPES.NETWORK]: ERROR_SEVERITY.HIGH,
  [ERROR_TYPES.AUTH]: ERROR_SEVERITY.CRITICAL,
  [ERROR_TYPES.AI]: ERROR_SEVERITY.MEDIUM,
  [ERROR_TYPES.DATABASE]: ERROR_SEVERITY.HIGH,
  [ERROR_TYPES.VALIDATION]: ERROR_SEVERITY.LOW,
  [ERROR_TYPES.BUSINESS]: ERROR_SEVERITY.MEDIUM,
  [ERROR_TYPES.SYSTEM]: ERROR_SEVERITY.HIGH
};

/**
 * 错误恢复策略配置
 * 定义不同错误类型的恢复策略
 */
export const ERROR_RECOVERY_CONFIG = {
  [ERROR_TYPES.NETWORK]: {
    retryable: true,
    maxRetries: 3,
    retryDelay: 1000,
    showRetryButton: true,
    fallbackMessage: '请检查网络连接后重试。如问题持续，请联系开发人员。'
  },
  [ERROR_TYPES.AUTH]: {
    retryable: false,
    maxRetries: 0,
    showRetryButton: false,
    fallbackMessage: '请重新登录后继续操作。如问题持续，请联系开发人员。',
    redirectTo: '/login'
  },
  [ERROR_TYPES.AI]: {
    retryable: true,
    maxRetries: 2,
    retryDelay: 2000,
    showRetryButton: true,
    fallbackMessage: '请稍后重试。如问题持续，请联系开发人员。'
  },
  [ERROR_TYPES.DATABASE]: {
    retryable: true,
    maxRetries: 2,
    retryDelay: 1500,
    showRetryButton: true,
    fallbackMessage: '数据处理中，请稍后重试。如问题持续，请联系开发人员。'
  },
  [ERROR_TYPES.VALIDATION]: {
    retryable: false,
    maxRetries: 0,
    showRetryButton: false,
    fallbackMessage: '请检查输入信息后重新提交。如问题持续，请联系开发人员。'
  },
  [ERROR_TYPES.BUSINESS]: {
    retryable: false,
    maxRetries: 0,
    showRetryButton: false,
    fallbackMessage: '操作失败，请检查条件后重试。如问题持续，请联系开发人员。'
  },
  [ERROR_TYPES.SYSTEM]: {
    retryable: true,
    maxRetries: 1,
    retryDelay: 3000,
    showRetryButton: true,
    fallbackMessage: '系统暂时不可用，请稍后重试。如问题持续，请联系开发人员。'
  }
};

/**
 * Toast通知配置
 * 不同错误类型的通知显示配置
 */
export const TOAST_CONFIG = {
  [ERROR_SEVERITY.LOW]: {
    type: 'info',
    autoClose: 3000,
    position: 'top-right'
  },
  [ERROR_SEVERITY.MEDIUM]: {
    type: 'warning',
    autoClose: 5000,
    position: 'top-center'
  },
  [ERROR_SEVERITY.HIGH]: {
    type: 'error',
    autoClose: 8000,
    position: 'top-center'
  },
  [ERROR_SEVERITY.CRITICAL]: {
    type: 'error',
    autoClose: false,
    position: 'top-center'
  }
};

/**
 * 错误监控配置
 * 定义哪些错误需要报告到监控服务
 */
export const ERROR_MONITORING_CONFIG = {
  // 需要监控的错误类型
  monitoredTypes: [
    ERROR_TYPES.SYSTEM,
    ERROR_TYPES.DATABASE,
    ERROR_TYPES.AI
  ],

  // 需要监控的严重程度
  monitoredSeverities: [
    ERROR_SEVERITY.HIGH,
    ERROR_SEVERITY.CRITICAL
  ],

  // 监控端点配置
  monitoringEndpoint: '/api/errors',

  // 采样率 (0-1)
  sampleRate: 1.0,

  // 批量上报配置
  batchSize: 10,
  batchInterval: 30000 // 30秒
};

/**
 * 错误处理工具函数
 */

/**
 * 根据错误消息获取友好的用户提示
 */
export function getFriendlyErrorMessage(error, type = null) {
  const message = error?.message || error?.toString() || '';
  const lowerMessage = message.toLowerCase();

  // 如果指定了类型，直接从对应映射中查找
  if (type && ERROR_MESSAGE_MAP[type]) {
    for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGE_MAP[type])) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }
  }

  // 自动识别错误类型并获取对应消息
  const detectedType = type || detectErrorType(message);
  if (detectedType && ERROR_MESSAGE_MAP[detectedType]) {
    for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGE_MAP[detectedType])) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }
  }

  // 返回通用错误消息
  return '出现技术问题，请稍后重试。如问题持续，请联系开发人员。';
}

/**
 * 根据错误消息自动识别错误类型
 */
export function detectErrorType(message) {
  if (!message) return ERROR_TYPES.SYSTEM;

  const lowerMessage = message.toLowerCase();

  for (const { type, patterns } of ERROR_TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return type;
      }
    }
  }

  return ERROR_TYPES.SYSTEM;
}

/**
 * 获取错误严重程度
 */
export function getErrorSeverity(type) {
  return ERROR_SEVERITY_CONFIG[type] || ERROR_SEVERITY.MEDIUM;
}

/**
 * 获取错误恢复配置
 */
export function getErrorRecoveryConfig(type) {
  return ERROR_RECOVERY_CONFIG[type] || ERROR_RECOVERY_CONFIG[ERROR_TYPES.SYSTEM];
}

/**
 * 检查错误是否需要监控
 */
export function shouldMonitorError(errorInfo) {
  const { type, severity } = errorInfo;

  return (
    ERROR_MONITORING_CONFIG.monitoredTypes.includes(type) ||
    ERROR_MONITORING_CONFIG.monitoredSeverities.includes(severity)
  );
}

/**
 * 获取Toast配置
 */
export function getToastConfig(severity) {
  return TOAST_CONFIG[severity] || TOAST_CONFIG[ERROR_SEVERITY.MEDIUM];
}

export default {
  ERROR_MESSAGE_MAP,
  ERROR_TYPE_PATTERNS,
  ERROR_SEVERITY_CONFIG,
  ERROR_RECOVERY_CONFIG,
  TOAST_CONFIG,
  ERROR_MONITORING_CONFIG,
  getFriendlyErrorMessage,
  detectErrorType,
  getErrorSeverity,
  getErrorRecoveryConfig,
  shouldMonitorError,
  getToastConfig
};