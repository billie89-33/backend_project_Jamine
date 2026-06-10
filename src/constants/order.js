export const ORDER_STATUS = {
    PENDING: 'Awaiting Payment',
    PAID: 'Paid',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
};

export const PAID_STATUSES = [
    ORDER_STATUS.PAID,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED
];
