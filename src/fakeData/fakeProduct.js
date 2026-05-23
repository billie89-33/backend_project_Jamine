const fakeProducts = [
    {
        brand: "Asus",
        modelName: "ROG Zephyrus G14",
        price: 54900,
        image: "https://example.com/rog-g14.jpg",
        sku: "ASUS-ROG-G14-001",
        category: "Notebook",
        stock: 10,
        specifications: {
            "CPU": "AMD Ryzen 9",
            "GPU": "RTX 4060",
            "RAM": "16GB DDR5",
            "Storage": "1TB SSD"
        }
    },
    {
        brand: "Logitech",
        modelName: "G Pro X Superlight",
        price: 4990,
        image: "https://example.com/g-pro-superlight.jpg",
        sku: "LOGI-GPRO-001",
        category: "Gaming Mouse",
        stock: 50,
        specifications: {
            "Sensor": "HERO 25K",
            "Weight": "63g",
            "Connection": "Wireless"
        }
    },
    {
        brand: "Keychron",
        modelName: "V1",
        price: 3290,
        image: "https://example.com/keychron-v1.jpg",
        sku: "KEY-V1-001",
        category: "Keyboard",
        stock: 25,
        specifications: {
            "Layout": "75%",
            "Switch": "Keychron K Pro Red",
            "Hot-swappable": "Yes"
        }
    },
    {
        brand: "Samsung",
        modelName: "Odyssey G7",
        price: 18900,
        image: "https://example.com/samsung-g7.jpg",
        sku: "SAM-G7-001",
        category: "Monitor",
        stock: 15,
        specifications: {
            "Resolution": "2560 x 1440",
            "Refresh Rate": "240Hz",
            "Panel": "VA Curved"
        }
    }
];

export default fakeProducts;
