export type OrderCurrency = string;

export interface OrderLineItemDto {
  sku: string;
  title?: string;
  quantity: number;
  unitPrice: number;
  metadata?: Record<string, unknown>;
}

export interface OrderDto {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: OrderCurrency;
  items: OrderLineItemDto[];
  notes?: string;
  createdAtIso?: string;
  metadata?: Record<string, unknown>;
}

export const ensureOrderMessage = (order: OrderDto): OrderDto => ({
  ...order,
  items: order.items ?? [],
  createdAtIso: order.createdAtIso ?? new Date().toISOString(),
});
