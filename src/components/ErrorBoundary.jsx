/**
 * React组件错误边界
 * 用ErrorBoundary HOC包聊天/AI推荐，catch renderError显示友好提示
 */

import React from 'react';
import { toast } from 'react-toastify';

/**
 * 错误边界组件类
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // 更新状态以显示错误UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('React错误边界捕获到错误:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // 可以在这里发送错误报告到监控服务
    this.reportError(error, errorInfo);

    // 显示错误提示
    const friendlyMessage = this.getFriendlyMessage(error);
    toast.error(friendlyMessage, {
      position: "top-center",
      autoClose: 8000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  /**
   * 获取友好的错误消息
   */
  getFriendlyMessage(error) {
    // 检查是否是已知的错误类型
    if (error.message) {
      const lowerMessage = error.message.toLowerCase();

      if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
        return '网络连接不太稳定，请稍后重试。';
      }

      if (lowerMessage.includes('ai') || lowerMessage.includes('recommendation')) {
        return '推荐灵感生成中~';
      }

      if (lowerMessage.includes('auth') || lowerMessage.includes('permission')) {
        return '权限验证中，请重新登录。';
      }
    }

    // 默认错误消息
    return '出现技术问题，请联系开发人员。';
  }

  /**
   * 报告错误到监控服务
   */
  reportError(error, errorInfo) {
    // 这里可以集成错误监控服务，如Sentry、LogRocket等
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 发送到错误监控服务
    console.log('错误报告:', errorReport);

    // 示例：发送到监控API
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);
  }

  /**
   * 重试函数
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // 调用父组件的重试回调
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  /**
   * 联系客服函数
   */
  handleContactSupport = () => {
    // 这里可以跳转到客服页面或打开客服对话
    window.location.href = '/support';
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误UI
      return this.props.fallback || (
        <div className="error-boundary" style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: '#d63031', marginBottom: '8px' }}>
              哎呀，出错了
            </h3>
            <p style={{ color: '#636e72', marginBottom: '16px' }}>
              {this.getFriendlyMessage(this.state.error)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0984e3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重试
            </button>

            <button
              onClick={this.handleContactSupport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c5ce7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              联系客服
            </button>
          </div>

          {/* 开发环境显示详细错误信息 */}
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '16px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#636e72' }}>
                技术详情 (仅开发环境可见)
              </summary>
              <pre style={{
                backgroundColor: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                marginTop: '8px'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 高阶组件版本的错误边界
 * 用法: const SafeComponent = withErrorBoundary(Component);
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  const WithErrorBoundaryComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * 聊天界面专用错误边界
 * 集成到智能聊天，失败时show下一步指引
 */
export function ChatErrorBoundary({ children, onRetry, onShowGuidance }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="chat-error-boundary" style={{
          padding: '16px',
          margin: '16px 0',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ color: '#d68910', marginBottom: '8px', fontWeight: 'bold' }}>
              聊天功能暂时不可用
            </p>
            <p style={{ color: '#856404', marginBottom: '12px' }}>
              推荐灵感生成中~
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                重试聊天
              </button>
            )}

            {onShowGuidance && (
              <button
                onClick={onShowGuidance}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                查看指引
              </button>
            )}

            <button
              onClick={() => window.location.href = '/demand-pool'}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              浏览需求池
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * AI推荐专用错误边界
 */
export function AIRecommendationErrorBoundary({ children, onRetry, onFallback }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="ai-recommendation-error" style={{
          padding: '12px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6c757d', marginBottom: '8px' }}>
            推荐灵感生成中~
          </p>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                重试
              </button>
            )}
            {onFallback && (
              <button
                onClick={onFallback}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                查看其他推荐
              </button>
            )}
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;