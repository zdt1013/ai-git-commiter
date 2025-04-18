/**
 * AI模型实体类型定义
 */
export interface AIModel {
    /**
     * 模型ID
     */
    id: string;

    /**
     * 模型所有者
     */
    owner_by: string;

    /**
     * 模型创建时间（Unix时间戳，秒）
     */
    created: number;
} 