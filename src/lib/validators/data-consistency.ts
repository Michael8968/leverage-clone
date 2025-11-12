/**
 * 数据一致性验证模块
 * 用于检测和修复数据完整性问题
 * 
 * @module src/lib/validators/data-consistency.ts
 */

import type {
  AIScenario,
  Supplier,
  ProductService,
  Prompt,
  LlmConnection,
  User
} from '@/lib/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface DataValidationResult {
  isValid: boolean;
  itemId?: string;
  itemType?: string;
  missingFields: {
    field: string;
    severity: 'critical' | 'warning' | 'info';
    reason: string;
  }[];
  inconsistencies: {
    issue: string;
    severity: 'critical' | 'warning';
    details: string;
  }[];
  dependencyIssues: {
    dependency: string;
    status: 'missing' | 'broken' | 'invalid';
    suggestion: string;
  }[];
  autoFixable: boolean;
  suggestions: string[];
}

export interface DataRepairAction {
  type: 'remove' | 'update' | 'merge' | 'auto_generate';
  itemId: string;
  itemType: string;
  description: string;
  changes?: Record<string, any>;
  requiresApproval?: boolean;
}

export interface DataHealthMetrics {
  timestamp: Date;
  totalItems: number;
  healthyItems: number;
  warningItems: number;
  criticalItems: number;
  healthPercentage: number;
  issues: {
    type: string;
    count: number;
    severity: 'critical' | 'warning' | 'info';
  }[];
}

// ============================================================================
// 验证器类
// ============================================================================

export class DataConsistencyValidator {
  /**
   * 验证 AI 场景的数据完整性和依赖关系
   * 根据实际的 AIScenario 类型定义，只检查实际存在的字段
   */
  static validateAIScenario(scenario: AIScenario): DataValidationResult {
    const result: DataValidationResult = {
      isValid: true,
      itemId: scenario.id,
      itemType: 'AIScenario',
      missingFields: [],
      inconsistencies: [],
      dependencyIssues: [],
      autoFixable: false,
      suggestions: []
    };

    // 检查基本字段
    if (!scenario.name?.trim()) {
      result.missingFields.push({
        field: 'name',
        severity: 'critical',
        reason: '场景名称是唯一标识符'
      });
    }

    if (!scenario.description?.trim()) {
      result.missingFields.push({
        field: 'description',
        severity: 'warning',
        reason: '场景描述有助于理解其用途'
      });
    }

    // 检查关键依赖：提示词配置
    if (!scenario.configuredPromptKey?.trim()) {
      result.dependencyIssues.push({
        dependency: 'Prompt',
        status: 'missing',
        suggestion: '请配置提示词。提示词定义了 AI 的行为和输出格式。'
      });
    } else {
      result.suggestions.push(`需要在提示词管理中验证 "${scenario.configuredPromptKey}" 是否存在且处于活跃状态`);
    }

    // 检查标签（有助于分类）
    if (!scenario.tags || scenario.tags.length === 0) {
      result.missingFields.push({
        field: 'tags',
        severity: 'warning',
        reason: '标签有助于场景分类和检索'
      });
    }

    result.isValid =
      result.missingFields.filter(f => f.severity === 'critical').length === 0 &&
      result.inconsistencies.filter(i => i.severity === 'critical').length === 0 &&
      result.dependencyIssues.length === 0;

    result.autoFixable = false; // AI场景通常需要手动配置

    return result;
  }

  /**
   * 验证供应商信息的完整性
   * 根据实际的 Supplier 类型定义
   */
  static validateSupplier(supplier: Supplier): DataValidationResult {
    const result: DataValidationResult = {
      isValid: true,
      itemId: supplier.id,
      itemType: 'Supplier',
      missingFields: [],
      inconsistencies: [],
      dependencyIssues: [],
      autoFixable: true,
      suggestions: []
    };

    // 检查基本信息（关键）
    if (!supplier.name?.trim()) {
      result.missingFields.push({
        field: 'name',
        severity: 'critical',
        reason: '企业名称是必填项'
      });
    }

    if (!supplier.address?.trim()) {
      result.missingFields.push({
        field: 'address',
        severity: 'critical',
        reason: '企业地址用于验证和交付'
      });
    }

    // 检查资质信息（重要但不绝对）
    if (!supplier.creditCode && !supplier.registeredCapital) {
      result.missingFields.push({
        field: 'creditCode or registeredCapital',
        severity: 'warning',
        reason: '至少需要一种企业资质标识'
      });
      result.suggestions.push('建议补全统一社会信用代码或注册资本以增加信任度');
    }

    // 检查联系方式
    if (!supplier.email?.trim()) {
      result.missingFields.push({
        field: 'email',
        severity: 'warning',
        reason: '电子邮件用于联系供应商'
      });
    }

    // 检查媒体资源（推荐但非强制）
    if (!supplier.logoUrl?.trim() && !supplier.businessLicenseUrl?.trim()) {
      result.missingFields.push({
        field: 'media_assets',
        severity: 'info',
        reason: '添加营业执照或企业logo可以增加信任度'
      });
    }

    result.isValid =
      result.missingFields.filter(f => f.severity === 'critical').length === 0 &&
      result.inconsistencies.filter(i => i.severity === 'critical').length === 0;

    return result;
  }

  /**
   * 验证商品数据的完整性
   * 根据实际的 ProductService 类型定义
   */
  static validateProduct(product: ProductService): DataValidationResult {
    const result: DataValidationResult = {
      isValid: true,
      itemId: product.id,
      itemType: 'Product',
      missingFields: [],
      inconsistencies: [],
      dependencyIssues: [],
      autoFixable: true,
      suggestions: []
    };

    // 必填字段
    if (!product.name?.trim()) {
      result.missingFields.push({
        field: 'name',
        severity: 'critical',
        reason: '商品名称是必填项'
      });
    }

    if (typeof product.price !== 'number' || product.price <= 0) {
      result.missingFields.push({
        field: 'price',
        severity: 'critical',
        reason: '价格必须是大于0的数字'
      });
    }

    if (!product.description?.trim() || product.description.trim().length < 10) {
      result.missingFields.push({
        field: 'description',
        severity: 'warning',
        reason: '商品描述应至少10个字符，有助于搜索和推荐'
      });
    }

    // 多媒体内容
    if (!product.images || product.images.length === 0) {
      result.missingFields.push({
        field: 'images',
        severity: 'warning',
        reason: '没有图片会大幅降低转化率'
      });
    }

    // 分类信息
    if (!product.category?.trim()) {
      result.missingFields.push({
        field: 'category',
        severity: 'info',
        reason: '分类信息有助于搜索和推荐'
      });
    }

    // 供应商关联
    if (!product.supplierId?.trim()) {
      result.dependencyIssues.push({
        dependency: 'Supplier',
        status: 'missing',
        suggestion: '商品必须关联到一个有效的供应商'
      });
    }

    // 生成建议
    if (result.missingFields.filter(f => f.severity === 'warning').length > 0) {
      result.suggestions.push('补全图片和详细描述可以显著提高商品的搜索排名和转化率');
    }

    result.isValid =
      result.missingFields.filter(f => f.severity === 'critical').length === 0 &&
      result.inconsistencies.filter(i => i.severity === 'critical').length === 0 &&
      result.dependencyIssues.length === 0;

    result.autoFixable = result.missingFields.filter(f => f.severity === 'critical').length === 0;

    return result;
  }

  /**
   * 验证提示词的完整性和一致性
   * 根据实际的 Prompt 类型定义
   */
  static validatePrompt(prompt: Prompt): DataValidationResult {
    const result: DataValidationResult = {
      isValid: true,
      itemId: prompt.id,
      itemType: 'Prompt',
      missingFields: [],
      inconsistencies: [],
      dependencyIssues: [],
      autoFixable: false,
      suggestions: []
    };

    // 基本字段
    if (!prompt.name?.trim()) {
      result.missingFields.push({
        field: 'name',
        severity: 'critical',
        reason: '提示词名称用于识别'
      });
    }

    if (!prompt.promptKey?.trim()) {
      result.missingFields.push({
        field: 'promptKey',
        severity: 'critical',
        reason: '提示词标识符是唯一的'
      });
    }

    if (!prompt.content?.trim()) {
      result.missingFields.push({
        field: 'content',
        severity: 'critical',
        reason: '提示词内容是执行的核心'
      });
    }

    // 检查范围和状态
    if (!prompt.scope || !['通用', '专属'].includes(prompt.scope)) {
      result.missingFields.push({
        field: 'scope',
        severity: 'warning',
        reason: '提示词范围应该是 "通用" 或 "专属"'
      });
    }

    if (!prompt.status || !['生效中', '已停用'].includes(prompt.status)) {
      result.missingFields.push({
        field: 'status',
        severity: 'warning',
        reason: '提示词状态应该是 "生效中" 或 "已停用"'
      });
    }

    // 检查描述
    if (!prompt.description?.trim()) {
      result.missingFields.push({
        field: 'description',
        severity: 'warning',
        reason: '提示词描述有助于理解其用途'
      });
    }

    // 建议：关联 LLM 模型
    if (!prompt.modelId?.trim()) {
      result.suggestions.push('建议指定适用的 LLM 模型以确保最佳兼容性');
    }

    result.isValid =
      result.missingFields.filter(f => f.severity === 'critical').length === 0 &&
      result.inconsistencies.filter(i => i.severity === 'critical').length === 0;

    return result;
  }
}

// ============================================================================
// 修复建议生成器
// ============================================================================

export class RepairSuggestionGenerator {
  /**
   * 为 AI 场景生成修复建议
   */
  static suggestAIScenarioRepairs(
    validation: DataValidationResult
  ): DataRepairAction[] {
    const actions: DataRepairAction[] = [];

    // 处理缺失的依赖
    for (const dependency of validation.dependencyIssues) {
      if (dependency.status === 'missing') {
        if (dependency.dependency === 'LLM') {
          actions.push({
            type: 'update',
            itemId: validation.itemId!,
            itemType: validation.itemType!,
            description: '需要关联一个可用的 LLM',
            changes: { linkedLLMId: '<please_select>' },
            requiresApproval: true
          });
        } else if (dependency.dependency === 'Prompt') {
          actions.push({
            type: 'update',
            itemId: validation.itemId!,
            itemType: validation.itemType!,
            description: '需要关联至少一个提示词',
            changes: { linkedPromptIds: [] },
            requiresApproval: true
          });
        }
      }
    }

    return actions;
  }

  /**
   * 为供应商生成修复建议
   */
  static suggestSupplierRepairs(
    validation: DataValidationResult,
    action: 'keep' | 'remove' | 'edit'
  ): DataRepairAction[] {
    const actions: DataRepairAction[] = [];

    if (action === 'remove') {
      actions.push({
        type: 'remove',
        itemId: validation.itemId!,
        itemType: validation.itemType!,
        description: '删除数据不完整的供应商记录',
        requiresApproval: true
      });
    } else if (action === 'edit') {
      // 生成编辑提示
      const missingCritical = validation.missingFields.filter(f => f.severity === 'critical');
      actions.push({
        type: 'update',
        itemId: validation.itemId!,
        itemType: validation.itemType!,
        description: `请完善以下字段: ${missingCritical.map(f => f.field).join(', ')}`,
        requiresApproval: false
      });
    }

    return actions;
  }

  /**
   * 为商品生成修复建议
   */
  static suggestProductRepairs(validation: DataValidationResult): DataRepairAction[] {
    const actions: DataRepairAction[] = [];

    // 识别可以自动修复的问题
    const criticalIssues = validation.missingFields.filter(f => f.severity === 'critical');
    
    if (criticalIssues.length === 0) {
      // 非关键问题可以自动修复或提示
      actions.push({
        type: 'auto_generate',
        itemId: validation.itemId!,
        itemType: validation.itemType!,
        description: '可以自动补充的字段：图片、详细描述等',
        changes: {
          // 可以从 AI 自动生成描述
          description: 'AI 生成的默认描述...'
        }
      });
    } else {
      // 关键问题需要人工编辑
      actions.push({
        type: 'update',
        itemId: validation.itemId!,
        itemType: validation.itemType!,
        description: `需要修复关键字段: ${criticalIssues.map(f => f.field).join(', ')}`,
        requiresApproval: true
      });
    }

    return actions;
  }
}

// ============================================================================
// 批量检查和统计
// ============================================================================

export class DataHealthAnalyzer {
  /**
   * 计算数据健康指标
   */
  static async calculateHealthMetrics(
    items: Array<any>,
    itemType: 'AIScenario' | 'Supplier' | 'Product' | 'Prompt',
    validator: (item: any) => DataValidationResult
  ): Promise<DataHealthMetrics> {
    const validations = items.map(validator);
    
    const healthyCount = validations.filter(v => v.isValid).length;
    const warningCount = validations.filter(
      v => !v.isValid && 
           v.missingFields.some(f => f.severity === 'warning') &&
           !v.missingFields.some(f => f.severity === 'critical')
    ).length;
    const criticalCount = validations.filter(
      v => v.missingFields.some(f => f.severity === 'critical')
    ).length;

    const issues = [
      {
        type: '关键问题',
        count: validations.reduce((sum, v) => sum + v.missingFields.filter(f => f.severity === 'critical').length, 0),
        severity: 'critical' as const
      },
      {
        type: '警告问题',
        count: validations.reduce((sum, v) => sum + v.missingFields.filter(f => f.severity === 'warning').length, 0),
        severity: 'warning' as const
      },
      {
        type: '依赖问题',
        count: validations.reduce((sum, v) => sum + v.dependencyIssues.length, 0),
        severity: 'critical' as const
      }
    ].filter(i => i.count > 0);

    return {
      timestamp: new Date(),
      totalItems: items.length,
      healthyItems: healthyCount,
      warningItems: warningCount,
      criticalItems: criticalCount,
      healthPercentage: items.length === 0 ? 100 : (healthyCount / items.length) * 100,
      issues
    };
  }
}

export default DataConsistencyValidator;
