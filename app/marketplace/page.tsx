'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import { useToast } from '@/components/ToastProvider';
import styles from './page.module.css';

interface CardListing {
  _id?: string;
  id?: string;
  cardId: string;
  cardName: string;
  cardSet?: string;
  productType: 'cards' | 'sealed';
  sellerName: string;
  sellerContact: string;
  price: number;
  condition: string;
  description: string;
  imageData?: string;
  imageFile?: string;
  createdAt: string | Date;
}

export default function MarketplacePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'sell'>('browse');

  // Listings state
  const [listings, setListings] = useState<CardListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'cards' | 'sealed'>('all');

  // Form state
  const [productType, setProductType] = useState<'cards' | 'sealed'>('cards');
  const [cardName, setCardName] = useState('');
  const [cardId, setCardId] = useState('');
  const [cardSet, setCardSet] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerContact, setSellerContact] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Near Mint');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoadingListings(true);
      const response = await fetch('/api/listings?status=active');

      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
      showToast('Failed to load marketplace listings', 'error');
    } finally {
      setLoadingListings(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageFile(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!cardName.trim()) {
        showToast('Please enter a card name', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!sellerName.trim()) {
        showToast('Please enter your name', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!sellerContact.trim()) {
        showToast('Please enter contact information', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!price || parseFloat(price) <= 0) {
        showToast('Please enter a valid price', 'error');
        setIsSubmitting(false);
        return;
      }

      // Create listing via API
      const listingData = {
        cardId: cardId.trim() || cardName.toLowerCase().replace(/\s+/g, '-'),
        cardName: cardName.trim(),
        cardSet: cardSet.trim() || undefined,
        productType,
        sellerName: sellerName.trim(),
        sellerContact: sellerContact.trim(),
        price: parseFloat(price),
        currency: 'INR',
        condition,
        description: description.trim(),
        imageData: imageFile || undefined,
      };

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create listing');
      }

      const result = await response.json();
      console.log('✅ Listing created:', result.listingId);

      showToast('Listing created successfully! 🎉', 'success');

      // Reset form
      setCardName('');
      setCardId('');
      setCardSet('');
      setSellerName('');
      setSellerContact('');
      setPrice('');
      setCondition('Near Mint');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);

      // Reload listings and switch to browse tab
      loadListings();
      setActiveTab('browse');
    } catch (error) {
      console.error('Failed to create listing:', error);
      showToast('Failed to create listing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredListings = productTypeFilter === 'all'
    ? listings
    : listings.filter(l => l.productType === productTypeFilter);

  if (!mounted) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <StickyHeader />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>🛒 Marketplace</h1>
              <p className={styles.subtitle}>
                Buy and sell Pokémon cards with the community
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'browse' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              <span className={styles.tabIcon}>🔍</span>
              Browse Listings
              {listings.length > 0 && (
                <span className={styles.tabBadge}>{filteredListings.length}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'sell' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('sell')}
            >
              <span className={styles.tabIcon}>💰</span>
              Sell Your Card
            </button>
          </div>

          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <div className={styles.browseSection}>
              {/* Filter */}
              <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Product Type:</label>
                  <select
                    value={productTypeFilter}
                    onChange={(e) => setProductTypeFilter(e.target.value as any)}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Products</option>
                    <option value="cards">Cards Only</option>
                    <option value="sealed">Sealed Products Only</option>
                  </select>
                </div>
              </div>

              {/* Listings Grid */}
              {loadingListings ? (
                <div className={styles.loading}>Loading listings...</div>
              ) : filteredListings.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📭</div>
                  <h3>No listings yet</h3>
                  <p>Be the first to list a card for sale!</p>
                  <button
                    onClick={() => setActiveTab('sell')}
                    className={styles.sellButton}
                  >
                    Create Listing
                  </button>
                </div>
              ) : (
                <div className={styles.listingsGrid}>
                  {filteredListings.map((listing) => (
                    <div
                      key={listing._id || listing.id}
                      className={styles.listingCard}
                      onClick={() => {
                        if (listing.cardId) {
                          router.push(`/card-details?id=${listing.cardId}`);
                        }
                      }}
                    >
                      {(listing.imageData || listing.imageFile) && (
                        <div className={styles.listingImage}>
                          <img
                            src={listing.imageData || listing.imageFile}
                            alt={listing.cardName}
                          />
                        </div>
                      )}
                      <div className={styles.listingContent}>
                        <h3 className={styles.listingName}>{listing.cardName}</h3>
                        {listing.cardSet && (
                          <p className={styles.listingSet}>{listing.cardSet}</p>
                        )}
                        <div className={styles.listingInfo}>
                          <span className={styles.listingPrice}>
                            ₹{listing.price.toLocaleString()}
                          </span>
                          <span className={styles.listingCondition}>
                            {listing.condition}
                          </span>
                        </div>
                        <div className={styles.listingSeller}>
                          <span>Seller: {listing.sellerName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sell Tab */}
          {activeTab === 'sell' && (
            <form onSubmit={handleSubmit} className={styles.sellForm}>
              {/* Product Type Selector */}
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Product Type</h2>
                <div className={styles.productTypeSelector}>
                  <button
                    type="button"
                    className={`${styles.typeButton} ${productType === 'cards' ? styles.active : ''}`}
                    onClick={() => setProductType('cards')}
                  >
                    <span className={styles.typeIcon}>🎴</span>
                    <span className={styles.typeLabel}>Card</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeButton} ${productType === 'sealed' ? styles.active : ''}`}
                    onClick={() => setProductType('sealed')}
                  >
                    <span className={styles.typeIcon}>📦</span>
                    <span className={styles.typeLabel}>Sealed Product</span>
                  </button>
                </div>
              </div>

              {/* Card Information */}
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>
                  {productType === 'cards' ? 'Card' : 'Product'} Information
                </h2>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {productType === 'cards' ? 'Card' : 'Product'} Name
                    <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={styles.input}
                    placeholder={productType === 'cards' ? 'e.g., Charizard' : 'e.g., Booster Box'}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Card Number</label>
                    <input
                      type="text"
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      className={styles.input}
                      placeholder="e.g., 4"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Set Name</label>
                    <input
                      type="text"
                      value={cardSet}
                      onChange={(e) => setCardSet(e.target.value)}
                      className={styles.input}
                      placeholder="e.g., Base Set"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Condition <span className={styles.required}>*</span>
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className={styles.select}
                      required
                    >
                      <option value="Mint">Mint</option>
                      <option value="Near Mint">Near Mint</option>
                      <option value="Lightly Played">Lightly Played</option>
                      <option value="Moderately Played">Moderately Played</option>
                      <option value="Heavily Played">Heavily Played</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Price (₹) <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={styles.input}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.textarea}
                    placeholder="Add any additional details..."
                    rows={4}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Card Image</label>
                  <div className={styles.imageUploadArea}>
                    {imagePreview ? (
                      <div className={styles.imagePreviewContainer}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className={styles.imagePreview}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className={styles.removeImageBtn}
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="image" className={styles.uploadLabel}>
                        <div className={styles.uploadIcon}>📷</div>
                        <div className={styles.uploadText}>Click to upload</div>
                        <div className={styles.uploadHint}>PNG, JPG up to 2MB</div>
                      </label>
                    )}
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className={styles.fileInput}
                    />
                  </div>
                </div>
              </div>

              {/* Seller Information */}
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Seller Information</h2>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Your Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className={styles.input}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Contact Information <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={sellerContact}
                    onChange={(e) => setSellerContact(e.target.value)}
                    className={styles.input}
                    placeholder="Email or phone number"
                    required
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.submitBtn}
                >
                  {isSubmitting ? 'Creating...' : 'Create Listing'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
