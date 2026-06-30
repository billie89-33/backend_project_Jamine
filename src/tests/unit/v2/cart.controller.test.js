import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCart } from '../../../controllers/v2/cart.controller.js';
import prisma from '../../../config/prisma.js';
import { PRODUCT_STATUS } from '../../../constants/index.js';

// 1. Mocking Prisma globally for this test file
vi.mock('../../../config/prisma.js', () => ({
    default: {
        cart: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        product: {
            findMany: vi.fn(),
        },
        $transaction: vi.fn(),
    }
}));

describe('Cart Controller V2 - Unit Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // 2. Setup Mock Express Objects
        mockReq = {
            user: { id: 'user-123' } // จำลองว่า Login เข้ามาแล้ว
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        mockNext = vi.fn();
    });

    it('should return empty cart if cart does not exist', async () => {
        // Scenario 1: User requests cart, but DB returns null (No cart)
        prisma.cart.findUnique.mockResolvedValue(null);
        prisma.cart.create.mockResolvedValue({
            id: 'new-cart-1',
            userId: 'user-123',
            subtotal: 0,
            shippingFee: 0,
            total: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: []
        });

        await getCart(mockReq, mockRes, mockNext);

        if (mockNext.mock.calls.length > 0) {
            console.error('Error in Test 1:', mockNext.mock.calls[0][0]);
        }

        // ตรวจสอบว่า Response ถูกต้องตาม Flow (ไม่มีของ)
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                items: [],
                subtotal: 0,
                totalAmount: 0
            })
        }));
    });

    it('should calculate cart totals and return items if cart exists', async () => {
        // Scenario 2: Cart exists with 1 item
        const mockCart = {
            id: 'cart-1',
            userId: 'user-123',
            subtotal: 100,
            shippingFee: 0,
            total: 100,
            items: [
                { productId: 'prod-1', quantity: 2 }
            ]
        };

        const mockProduct = {
            id: 'prod-1',
            modelName: 'Test Product',
            price: 50,
            stock: 10,
            status: PRODUCT_STATUS.ACTIVE,
            imageUrl: 'test.jpg'
        };

        // Mock DB Responses
        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findMany.mockResolvedValue([mockProduct]); // products that are active
        prisma.cart.update = vi.fn().mockResolvedValue(mockCart);

        await getCart(mockReq, mockRes, mockNext);

        if (mockNext.mock.calls.length > 0) {
            console.error('Error in Test 2:', mockNext.mock.calls[0][0]);
        }

        // ตรวจสอบว่ามีการเรียก DB ถูกต้อง
        expect(prisma.cart.findUnique).toHaveBeenCalledWith({
            where: { userId: 'user-123' },
            include: { items: true }
        });

        // ตรวจสอบ Response
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalled();
        
        // ดึง Argument แรกที่ถูกส่งไปที่ res.json()
        const responseData = mockRes.json.mock.calls[0][0];
        
        expect(responseData.success).toBe(true);
        expect(responseData.data.subtotal).toBe(100); // 50 * 2
        expect(responseData.data.items[0].quantity).toBe(2);
        expect(responseData.data.items[0].productId.modelName).toBe('Test Product');
    });
});
