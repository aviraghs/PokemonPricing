'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SealedProductCard from './SealedProductCard';
import styles from './PopularSealedProducts.module.css';

interface SealedProduct {
  id: string;
  name: string;
  productType: string;
  set: {
    id: string;
    name: string;
    series: string;
  };
  releaseDate: string;
  contents: string;
  image: string;
  pricing?: {
    ebay?: {
      averagePrice: number | string;
      lowestPrice: number | string;
      listingCount: number;
      source: string;
    };
  };
}

export default function PopularSealedProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<SealedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSealedProducts();
  }, []);

  const fetchSealedProducts = async () => {
    try {
      const response = await fetch('/api/sealed-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          includePricing: true,
          language: 'en',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Get latest 8 products (most recent releases)
        const sortedByDate = data.sort((a: SealedProduct, b: SealedProduct) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        );
        setProducts(sortedByDate.slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to fetch sealed products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    router.push('/search-results?productType=sealed&lang=en');
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Popular Sealed Products</h2>
          </div>
          <div className={styles.loading}>Loading sealed products...</div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Popular Sealed Products</h2>
          <p className={styles.sectionSubtitle}>
            Latest booster boxes, ETBs, and collection boxes with live market pricing
          </p>
        </div>

        <div className={styles.grid}>
          {products.map((product) => (
            <SealedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
