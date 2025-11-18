'use client';

import { useRouter } from 'next/navigation';
import styles from './SealedProductCard.module.css';

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

interface SealedProductCardProps {
  product: SealedProduct;
}

export default function SealedProductCard({ product }: SealedProductCardProps) {
  const router = useRouter();

  const formatPrice = (price: number | string): string => {
    if (!price || price === 'N/A') return 'N/A';
    if (typeof price === 'number') return `₹${price.toFixed(2)}`;
    return typeof price === 'string' && !isNaN(parseFloat(price))
      ? `₹${parseFloat(price).toFixed(2)}`
      : price;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.productCard}>
      <div className={styles.imageContainer}>
        <div className={styles.productTypeBadge}>{product.productType}</div>
        <img
          src={product.image}
          alt={product.name}
          className={styles.productImage}
          onError={(e) => {
            e.currentTarget.src = '/card-back.svg';
          }}
        />
      </div>

      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{product.name}</h3>
        <div className={styles.productMeta}>
          <span className={styles.setName}>{product.set.name}</span>
          <span className={styles.series}>{product.set.series}</span>
        </div>

        <div className={styles.productDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>📦</span>
            <span className={styles.detailText}>{product.contents}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailIcon}>📅</span>
            <span className={styles.detailText}>{formatDate(product.releaseDate)}</span>
          </div>
        </div>

        {product.pricing?.ebay && (
          <div className={styles.pricingSection}>
            <div className={styles.pricingHeader}>
              <span className={styles.pricingSource}>eBay Market Data</span>
              {product.pricing.ebay.listingCount > 0 && (
                <span className={styles.listingCount}>
                  {product.pricing.ebay.listingCount} sold
                </span>
              )}
            </div>
            <div className={styles.pricingGrid}>
              <div className={styles.priceItem}>
                <span className={styles.priceLabel}>Average</span>
                <span className={styles.priceValue}>
                  {formatPrice(product.pricing.ebay.averagePrice)}
                </span>
              </div>
              <div className={styles.priceItem}>
                <span className={styles.priceLabel}>Lowest</span>
                <span className={styles.priceValueLow}>
                  {formatPrice(product.pricing.ebay.lowestPrice)}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          className={styles.viewButton}
          onClick={() => router.push(`/sealed-product?id=${product.id}`)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}
