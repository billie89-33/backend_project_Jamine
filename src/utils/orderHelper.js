/**
 * Centralized Helper for Cart and Order calculations
 * Standardizes money fields and shipping rules across the system.
 */

export const CALCULATIONS = {
    SHIPPING_FREE_THRESHOLD: 1000,
    SHIPPING_FEE: 50
};

/**
 * Calculate totals based on subtotal
 * @param {number} subtotal 
 * @returns {object} { subtotal, shippingFee, discount, total }
 */
export const calculateTotals = (subtotal) => {
    const shippingFee = (subtotal >= CALCULATIONS.SHIPPING_FREE_THRESHOLD || subtotal === 0) ? 0 : CALCULATIONS.SHIPPING_FEE;
    const discount = 0; // Default discount for now, can be expanded later
    const total = subtotal + shippingFee - discount;

    return {
        subtotal,
        shippingFee,
        discount,
        total,
        totalAmount: total // Alias for Frontend compatibility
    };
};

/**
 * Formats a single response object to include standard money fields and aliases
 * @param {object} data - The data object (Order or Cart)
 * @returns {object} - Data with standardized money fields
 */
export const formatMoneyFields = (data) => {
    if (!data) return data;
    
    // Ensure totalAmount alias exists
    const total = data.total || 0;
    const discount = data.discount || 0;
    const shippingFee = data.shippingFee || 0;
    const subtotal = data.subtotal || 0;

    return {
        ...data,
        subtotal,
        shippingFee,
        discount,
        total,
        totalAmount: total // Alias
    };
};
