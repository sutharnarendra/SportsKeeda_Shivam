package com.yatrax.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== Seeding default Yatra X products & variants ===");

        // Seed / Update Products
        jdbcTemplate.execute("INSERT INTO products (id, name, slug, description, price, original_price, stock, rating, review_count, on_sale, category, image_url, video_url) VALUES " +
                "(1, 'Pro Parallettes', 'pro-parallettes', 'Our flagship model — precision crafted for serious calisthenics athletes. Laser-engraved with your logo.', 3499.00, 4199.00, 100, 4.8, 0, true, 'Parallettes', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop', 'https://assets.mixkit.co/videos/preview/mixkit-athletic-man-doing-push-ups-on-bars-40455-large.mp4'), " +
                "(2, 'Classic Parallettes', 'classic-parallettes', 'Perfect for beginners and home gyms. Lightweight yet rock solid with anti-slip rubber feet.', 2799.00, 3299.00, 100, 4.6, 0, true, 'Parallettes', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop', null), " +
                "(3, 'Elite Parallettes', 'elite-parallettes', 'Premium teak with hand-rubbed oil finish. Competition grade with 150kg load capacity.', 4999.00, 5999.00, 100, 4.9, 0, true, 'Parallettes', 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&auto=format&fit=crop', 'https://assets.mixkit.co/videos/preview/mixkit-handstand-training-in-the-gym-42258-large.mp4'), " +
                "(4, 'Mini Parallettes', 'mini-parallettes', 'Compact travel-friendly design. Fits in your backpack — train anywhere, anytime.', 1999.00, null, 100, 4.5, 0, false, 'Parallettes', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop', null), " +
                "(5, 'Gymnast Pro', 'gymnast-pro', 'Extra-wide grip bars for advanced moves like planche, L-sit, and handstand presses.', 3999.00, 4499.00, 100, 4.7, 0, false, 'Parallettes', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop', null), " +
                "(6, 'Studio Set', 'studio-set', 'Gym & studio pack — 2 pairs with custom branding. Bulk pricing for fitness studios.', 6499.00, 7999.00, 100, 4.8, 0, true, 'Parallettes', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop', null), " +
                "(101, 'Push-Up Bars', 'push-up-bars', 'Ergonomic wooden push-up bars with angled grip. Same premium craftsmanship.', 1499.00, 1799.00, 100, 4.4, 0, false, 'Accessories', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop', 'https://assets.mixkit.co/videos/preview/mixkit-man-doing-pushups-in-gym-42250-large.mp4'), " +
                "(102, 'Yoga Blocks (Pair)', 'yoga-blocks', 'Sustainably sourced cork & wood yoga blocks. Naturally antimicrobial.', 999.00, null, 100, 4.3, 0, false, 'Accessories', 'https://images.unsplash.com/photo-1600881333168-2ef49b341f30?w=600&auto=format&fit=crop', null), " +
                "(103, 'Balance Board', 'balance-board', 'Handcrafted wooden balance board for core stability and rehab exercises.', 2499.00, 2999.00, 100, 4.6, 0, true, 'Accessories', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop', null), " +
                "(104, 'Gymnastics Rings', 'gymnastics-rings', 'Premium wooden gymnastics rings with adjustable nylon straps. Competition grade.', 2299.00, 2799.00, 100, 4.7, 0, false, 'Accessories', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&auto=format&fit=crop', null), " +
                "(105, 'Ab Roller Wheel', 'ab-roller-wheel', 'Sheesham wood ab roller with dual bearings for smooth, silent rolls.', 1299.00, 1599.00, 100, 4.5, 0, true, 'Accessories', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop', null), " +
                "(106, 'Handstand Canes', 'handstand-canes', 'Tall standing canes for circus handbalancing. Adjustable height, solid teak.', 5999.00, 6999.00, 100, 4.9, 0, false, 'Accessories', 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop', null) " +
                "ON CONFLICT (id) DO UPDATE SET " +
                "  name = EXCLUDED.name, " +
                "  slug = EXCLUDED.slug, " +
                "  description = EXCLUDED.description, " +
                "  price = EXCLUDED.price, " +
                "  original_price = EXCLUDED.original_price, " +
                "  stock = EXCLUDED.stock, " +
                "  rating = EXCLUDED.rating, " +
                "  review_count = EXCLUDED.review_count, " +
                "  on_sale = EXCLUDED.on_sale, " +
                "  category = EXCLUDED.category, " +
                "  image_url = EXCLUDED.image_url, " +
                "  video_url = EXCLUDED.video_url");

        // Sync the sequence so next autogenerated ID doesn't conflict
        jdbcTemplate.execute("SELECT setval('products_id_seq', 200)");

        // Seed Product Variants
        jdbcTemplate.execute("INSERT INTO product_variants (product_id, wood_type, price, original_price, stock, swatch_color) VALUES " +
                "(1, 'Sheesham', 3499.00, 4199.00, 50, '#5C3D2E'), " +
                "(1, 'Teak', 4299.00, 4999.00, 50, '#8B6914'), " +
                "(1, 'Mango', 2999.00, 3599.00, 50, '#C4A882'), " +
                "(2, 'Mango', 2799.00, 3299.00, 50, '#C4A882'), " +
                "(2, 'Sheesham', 3299.00, 3899.00, 50, '#5C3D2E'), " +
                "(3, 'Teak', 4999.00, 5999.00, 50, '#8B6914'), " +
                "(3, 'Walnut', 5499.00, 6499.00, 50, '#3E2723'), " +
                "(4, 'Mango', 1999.00, null, 50, '#C4A882'), " +
                "(4, 'Pine', 1699.00, null, 50, '#DEC099'), " +
                "(5, 'Sheesham', 3999.00, 4499.00, 50, '#5C3D2E'), " +
                "(5, 'Teak', 4799.00, 5299.00, 50, '#8B6914'), " +
                "(6, 'Sheesham', 6499.00, 7999.00, 50, '#5C3D2E'), " +
                "(6, 'Teak', 7999.00, 9499.00, 50, '#8B6914'), " +
                "(6, 'Mango', 5499.00, 6999.00, 50, '#C4A882'), " +
                "(101, 'Mango', 1499.00, 1799.00, 50, '#C4A882'), " +
                "(101, 'Sheesham', 1899.00, 2199.00, 50, '#5C3D2E'), " +
                "(102, 'Cork', 999.00, null, 50, '#D2B48C'), " +
                "(103, 'Sheesham', 2499.00, 2999.00, 50, '#5C3D2E'), " +
                "(103, 'Teak', 2999.00, 3499.00, 50, '#8B6914'), " +
                "(104, 'Birch', 2299.00, 2799.00, 50, '#F5DEB3'), " +
                "(105, 'Sheesham', 1299.00, 1599.00, 50, '#5C3D2E'), " +
                "(106, 'Teak', 5999.00, 6999.00, 50, '#8B6914'), " +
                "(106, 'Sheesham', 5499.00, 6499.00, 50, '#5C3D2E') " +
                "ON CONFLICT (product_id, wood_type) DO UPDATE SET " +
                "  price = EXCLUDED.price, " +
                "  original_price = EXCLUDED.original_price, " +
                "  stock = EXCLUDED.stock, " +
                "  swatch_color = EXCLUDED.swatch_color");

        System.out.println("=== Database seeding/update completed successfully ===");
    }
}
