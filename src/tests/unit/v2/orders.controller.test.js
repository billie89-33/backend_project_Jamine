import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '../../../controllers/v2/orders.controller.js';
import prisma from '../../../config/prisma.js';
import { PRODUCT_STATUS, ORDER_STATUS } from '../../../constants/index.js';

// 1. Mocking Prisma globally for this test file
vi.mock('../../../config/prisma.js', () => ({
    default: {
        order: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        },
        cart: {
            findUnique: vi.fn(),
        },
        product: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn(),
    }
}));

describe('Orders Controller V2 - Unit Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        vi.clearAllMocks();

        // จำลองข้อมูล Request (User Login แล้ว)
        mockReq = {
            user: { id: 'user-123' },
            body: {}
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        mockNext = vi.fn(); // สำหรับจับ Error
    });

    it('should throw an error if shipping address is missing', async () => {
        // Mock User ข้อมูลโปรไฟล์ไม่มีที่อยู่จัดส่ง
        prisma.user.findUnique.mockResolvedValue({ id: 'user-123', addresses: [] });
        
        await createOrder(mockReq, mockRes, mockNext);

        // ตรวจสอบว่ามี Error โยนไปหา Middleware (next) ด้วยข้อความที่ถูกต้อง
        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe('ไม่พบข้อมูลที่อยู่จัดส่ง กรุณาเพิ่มที่อยู่ในโปรไฟล์หรือระบุที่อยู่ใหม่');
        expect(error.status).toBe(400);
    });

    it('should successfully create an order and deduct stock', async () => {
        // 1. เตรียมข้อมูลสมมติ
        const mockAddress = {
            fullName: 'Test User',
            phone: '0812345678',
            address: '123 Test St',
            province: 'BKK',
            district: 'Bang Rak',
            subDistrict: 'Silom',
            postalCode: '10500',
            isDefault: true
        };

        const mockCart = {
            id: 'cart-1',
            userId: 'user-123',
            items: [
                { productId: 'prod-1', quantity: 2 } // ซื้อ 2 ชิ้น
            ]
        };

        const mockProduct = {
            id: 'prod-1',
            modelName: 'Laptop Test',
            price: 50000,
            stock: 10, // มีสต็อกพอ (10 ชิ้น)
            status: PRODUCT_STATUS.ACTIVE,
            imageUrl: 'test.jpg'
        };

        const mockCreatedOrder = {
            id: 'order-1',
            orderNumber: 'ORD123',
            status: ORDER_STATUS.PENDING,
            total: 100000 // 50000 * 2
        };

        // 2. จำลองพฤติกรรมของ Database
        mockReq.body.shippingAddress = mockAddress;
        prisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
        prisma.order.findMany.mockResolvedValue([]); // ไม่มี pending orders เก่า
        prisma.cart.findUnique.mockResolvedValue(mockCart);
        
        // จำลองการทำงานของ Transaction
        // เราจำลองว่าคำสั่งใน transaction ทำงานสำเร็จและส่งค่า order กลับมา
        prisma.$transaction.mockImplementation(async (callback) => {
            // สร้าง Transaction Dummy (tx)
            const tx = {
                product: {
                    findUnique: vi.fn().mockResolvedValue(mockProduct),
                    update: vi.fn()
                },
                order: {
                    create: vi.fn().mockResolvedValue(mockCreatedOrder)
                }
            };
            // สั่งรัน Callback เหมือนที่ Prisma ทำ
            return await callback(tx);
        });

        // 3. เริ่มรันฟังก์ชัน Create Order
        await createOrder(mockReq, mockRes, mockNext);

        // 4. ตรวจสอบผลลัพธ์ (Assert)
        // ไม่มี Error
        expect(mockNext).not.toHaveBeenCalled();

        // ตรวจสอบว่า Response กลับมาเป็น 201 (Created)
        expect(mockRes.status).toHaveBeenCalledWith(201);
        
        const responseData = mockRes.json.mock.calls[0][0];
        expect(responseData.success).toBe(true);
        expect(responseData.message).toBe('สร้างออเดอร์สำเร็จ กรุณาชำระเงินภายใน 15 นาที');
        expect(responseData.data.totalAmount).toBe(100000); // 50,000 x 2 = 100,000
    });

    it('should rollback transaction if stock is insufficient', async () => {
        // สถานการณ์: มีคนแย่งซื้อของไปแล้ว ทำให้สต็อกเหลือน้อยกว่าที่สั่ง
        const mockAddress = { fullName: 'T', phone: '0', address: '1', province: 'B', district: 'B', subDistrict: 'S', postalCode: '1' };
        mockReq.body.shippingAddress = mockAddress;
        
        const mockCart = {
            items: [{ productId: 'prod-1', quantity: 5 }] // พยายามซื้อ 5 ชิ้น
        };

        const mockProduct = {
            id: 'prod-1',
            modelName: 'Laptop Test',
            price: 50000,
            stock: 2, // แต่มีสต็อกแค่ 2 ชิ้น! (Insufficient)
            status: PRODUCT_STATUS.ACTIVE
        };

        prisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
        prisma.order.findMany.mockResolvedValue([]);
        prisma.cart.findUnique.mockResolvedValue(mockCart);

        prisma.$transaction.mockImplementation(async (callback) => {
            const tx = {
                product: {
                    findUnique: vi.fn().mockResolvedValue(mockProduct),
                }
            };
            return await callback(tx);
        });

        await createOrder(mockReq, mockRes, mockNext);

        // ระบบต้องโยน Error ไปที่ Error Handler
        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        
        // ข้อความ Error ต้องตรงเป๊ะ และเป็นการบอกว่าสินค้าหมด
        expect(error.message).toContain('ในคลังมีไม่เพียงพอ');
        expect(error.status).toBe(400);
    });
});
