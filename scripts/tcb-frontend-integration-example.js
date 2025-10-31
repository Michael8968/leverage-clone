/**
 * 前端TCB API错误处理使用示例
 * 展示如何在Next.js/React应用中集成错误处理
 */

import axios from 'axios';
import { setupAxiosInterceptors, frontendErrorHandler } from '../scripts/tcb-frontend-error-handler';

// 创建配置好的axios实例
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 设置拦截器
setupAxiosInterceptors(apiClient);

/**
 * React Hook: 使用TCB API错误处理
 */
export function useTCBErrorHandler() {
  const [error, setError] = React.useState(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  // 显示错误提示的函数（可替换为你的UI库）
  const showErrorToast = React.useCallback((message) => {
    // 这里可以集成你的UI库，如antd的message、react-toastify等
    console.log('错误提示:', message);
    alert(message); // 临时使用alert，生产环境请替换为合适的UI组件
  }, []);

  // 处理API错误
  const handleAPIError = React.useCallback((error, retryCallback = null) => {
    setError(error);

    if (error.friendlyMessage) {
      // 使用后端返回的友好提示
      showErrorToast(error.friendlyMessage);
      frontendErrorHandler.executeAction(
        { action: error.action },
        retryCallback ? () => {
          setIsRetrying(true);
          retryCallback().finally(() => setIsRetrying(false));
        } : null
      );
    } else {
      // 处理网络或其他错误
      const errorInfo = frontendErrorHandler.handleNetworkError(error);
      showErrorToast(errorInfo.message);
      frontendErrorHandler.executeAction(errorInfo, retryCallback);
    }
  }, [showErrorToast]);

  // 清除错误状态
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isRetrying,
    handleAPIError,
    clearError
  };
}

/**
 * API服务类示例
 * 展示如何在API调用中使用错误处理
 */
export class TCBAPIService {
  constructor() {
    this.client = apiClient;
  }

  /**
   * 获取平台资产
   */
  async getPlatformAssets() {
    try {
      const response = await this.client.get('/v1/admin/getPlatformAssets');
      return response.data;
    } catch (error) {
      // 错误会被拦截器处理，这里可以添加额外的处理逻辑
      throw error;
    }
  }

  /**
   * 执行Prompt（带重试逻辑）
   */
  async executePrompt(data, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.post('/v1/admin/executePrompt', data);
        return response.data;
      } catch (error) {
        lastError = error;

        // 如果是可重试的错误且未达到最大重试次数，继续重试
        if (error.action?.type === 'retry' && attempt < maxRetries) {
          const delay = error.action.delay || 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 不可重试的错误或达到最大重试次数，抛出错误
        break;
      }
    }

    throw lastError;
  }

  /**
   * 上传媒体资产
   */
  async uploadMediaAsset(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.client.post('/v1/admin/uploadMediaAsset', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Next.js API Route示例
 * 展示如何在API路由中使用错误处理
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 这里是你的业务逻辑
    const result = await someBusinessLogic(req.body);

    res.status(200).json({
      success: true,
      message: '操作成功啦~',
      data: result
    });
  } catch (error) {
    // 使用错误处理模块
    const { errorHandler } = require('../scripts/tcb-error-handler');
    const errorResponse = errorHandler.createErrorResponse(error);

    res.status(errorResponse.statusCode)
       .set(errorResponse.headers)
       .json(JSON.parse(errorResponse.body));
  }
}

/**
 * React组件使用示例
 */
export function PlatformAssetsComponent() {
  const { error, isRetrying, handleAPIError, clearError } = useTCBErrorHandler();
  const [assets, setAssets] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const apiService = React.useMemo(() => new TCBAPIService(), []);

  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const result = await apiService.getPlatformAssets();
      setAssets(result.data);
    } catch (error) {
      handleAPIError(error, loadAssets); // 传递重试回调
    } finally {
      setLoading(false);
    }
  }, [apiService, handleAPIError, clearError]);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return (
      <div>
        <p>出错了：{error.friendlyMessage}</p>
        {error.action?.type === 'retry' && (
          <button onClick={loadAssets} disabled={isRetrying}>
            {isRetrying ? '重试中...' : '重试'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2>平台资产</h2>
      {assets && (
        <div>
          <p>提供商数量：{assets.totalProviders}</p>
          <p>模型数量：{assets.totalModels}</p>
          <ul>
            {assets.providers.map(provider => (
              <li key={provider}>{provider}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 错误边界组件示例
 */
export class TCBErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误日志
    console.error('React错误边界捕获到错误:', error, errorInfo);

    // 可以在这里发送错误报告到监控服务
  }

  render() {
    if (this.state.hasError) {
      const errorInfo = frontendErrorHandler.handleNetworkError(this.state.error);

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>哎呀，出错了</h2>
          <p>{errorInfo.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}