const {
  Role,
  Category,
  Product,
  Order,
  OrderItem,
  User,
} = require("../models");

const seedInitialData = async () => {
  try {
    await Role.findOrCreate({ where: { name: "Admin" } });
    await Role.findOrCreate({ where: { name: "Manager" } });
    await Role.findOrCreate({ where: { name: "User" } });
    console.log("[Seed] System roles verified.");

    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      await Category.bulkCreate([
        {
          name: "Elektronik & Gadget",
          slug: "elektronik",
          icon: "Laptop",
          itemCount: 24,
          description:
            "Laptop, smartphone, aksesoris komputer, dan perangkat elektronik modern.",
          colorClass: "bg-primary-subtle text-primary border-primary-subtle",
          popularItem: "Laptop & Tablet",
        },
        {
          name: "Pakaian & Fashion",
          slug: "pakaian-fashion",
          icon: "Shirt",
          itemCount: 18,
          description:
            "Koleksi busana pria, wanita, anak-anak, dan aksesoris fashion trendy.",
          colorClass: "bg-indigo-subtle text-indigo border-indigo-subtle",
          popularItem: "Kemeja & Celana",
        },
        {
          name: "Makanan & Minuman",
          slug: "makanan-minuman",
          icon: "Utensils",
          itemCount: 35,
          description:
            "Kuliner lezat, camilan, minuman segar, dan bahan makanan berkualitas.",
          colorClass: "bg-amber-subtle text-amber border-amber-subtle",
          popularItem: "Kopi & Snack",
        },
        {
          name: "Buku & Alat Tulis",
          slug: "buku-alat-tulis",
          icon: "BookOpen",
          itemCount: 12,
          description:
            "Buku novel, literatur edukatif, jurnal, dan peralatan kantor lengkap.",
          colorClass: "bg-emerald-subtle text-emerald border-emerald-subtle",
          popularItem: "Notebook & Pena",
        },
      ]);
      console.log("[Seed] Categories seeded with enriched schema.");
    } else {
      // Update existing categories if missing new columns data
      const existingElektronik = await Category.findOne({
        where: { name: "Elektronik" },
      });
      if (existingElektronik) {
        await existingElektronik.update({
          name: "Elektronik & Gadget",
          slug: "elektronik",
          icon: "Laptop",
          itemCount: 24,
          description:
            "Laptop, smartphone, aksesoris komputer, dan perangkat elektronik modern.",
          colorClass: "bg-primary-subtle text-primary border-primary-subtle",
          popularItem: "Laptop & Tablet",
        });
      }
    }

    // Seed or update sample product
    const elektronikCat =
      (await Category.findOne({ where: { slug: "elektronik" } })) ||
      (await Category.findOne());
    const catId = elektronikCat ? elektronikCat.id : 1;

    let sampleProd = await Product.findOne({
      where: { name: 'Laptop Ultra Slim 14"' },
    });
    if (!sampleProd) {
      sampleProd = await Product.create({
        name: 'Laptop Ultra Slim 14"',
        category: "elektronik",
        categoryName: "Elektronik",
        categoryId: catId,
        price: 8499000,
        rating: 4.8,
        reviews: 124,
        stock: 15,
        tag: "Best Seller",
        description:
          "Prosesor Intel Core i5, RAM 16GB, SSD 512GB NVMe, layar IPS Full HD anti-glare.",
      });
      console.log("[Seed] Sample product created.");
    } else {
      await sampleProd.update({
        category: "elektronik",
        categoryName: "Elektronik",
        categoryId: catId,
        price: 8499000,
        rating: 4.8,
        reviews: 124,
        stock: 15,
        tag: "Best Seller",
        description:
          "Prosesor Intel Core i5, RAM 16GB, SSD 512GB NVMe, layar IPS Full HD anti-glare.",
      });
    }

    // Seed sample order and order items if none exist
    const orderCount = await Order.count();
    if (orderCount === 0) {
      const firstUser = await User.findOne();
      const sampleOrder = await Order.create({
        invoice_number: "INV/20260901/TOK/001",
        user_id: firstUser ? firstUser.id : null,
        status: "PAID",
        total_amount: 8499000.0,
        shipping_cost: 25000.0,
        discount_amount: 50000.0,
        tax_amount: 934890.0,
        grand_total: 9408890.0,
        payment_method: "qris",
        payment_status: "PAID",
        payment_reference: "QRIS-MID-928471928",
        recipient_name: "Budi Pratama",
        recipient_phone: "081234567890",
        shipping_address:
          "Jl. Jenderal Sudirman No. 45, RT 02/RW 03, Jakarta Selatan 12190",
        shipping_courier: "JNE",
        shipping_tracking_no: "JNE-REG-88294719",
        notes: "Tolong dipacking kayu dan bubble wrap tebal.",
        paid_at: new Date(),
      });

      await OrderItem.create({
        order_id: sampleOrder.id,
        product_id: sampleProd ? sampleProd.id : null,
        product_name: sampleProd ? sampleProd.name : 'Laptop Ultra Slim 14"',
        price: 8499000.0,
        quantity: 1,
        subtotal: 8499000.0,
        notes: "Warna Space Grey, Keyboard US",
      });

      console.log("[Seed] Sample order and order items created successfully.");
    }
  } catch (error) {
    console.warn("[Seed] Notice during seeding:", error.message);
  }
};

module.exports = { seedInitialData };
