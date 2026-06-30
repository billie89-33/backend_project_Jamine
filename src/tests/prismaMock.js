import { mockDeep, mockReset } from 'vitest-mock-extended';
import prisma from '../config/prisma.js';
import { beforeEach, vi } from 'vitest';

// Mock the Prisma module
vi.mock('../config/prisma.js', () => ({
    default: mockDeep(),
}));

export const prismaMock = prisma;

beforeEach(() => {
    mockReset(prismaMock);
});
