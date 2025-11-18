'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StickyHeader from '@/components/StickyHeader';
import { useToast } from '@/components/ToastProvider';
import styles from './page.module.css';

interface CardListing {
  id: string;
  cardId: string;
  cardName: string;
  cardSet?: string;
  productType: 'cards' | 'sealed';
  sellerName: string;
  sellerContact: string;
  price: number;
  condition: string;
  description: string;
  imageUrl?: string;
  imageFile?: string; // base64 encoded image
  createdAt: string;
}

export default function SellPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);

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
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB', 'error');
      return;
    }

    // Check file type
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
        imageData: imageFile || undefined, // Send base64 image to API
      };

      // Save to database via API
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

      showToast('Card listing created successfully! 🎉', 'success');

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

      // Navigate to home after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Failed to create listing:', error);
      showToast('Failed to create listing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <>
        <StickyHeader />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StickyHeader />
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Sell Your Card</h1>
              <p className={styles.subtitle}>
                List your Pokémon card for sale and connect with buyers
              </p>
            </div>
            <button onClick={() => router.push('/')} className={styles.backBtn}>
              ← Back to Home
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
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
                  <span className={styles.typeDescription}>Individual Pokemon cards</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeButton} ${productType === 'sealed' ? styles.active : ''}`}
                  onClick={() => setProductType('sealed')}
                >
                  <span className={styles.typeIcon}>📦</span>
                  <span className={styles.typeLabel}>Sealed Product</span>
                  <span className={styles.typeDescription}>Booster boxes, ETBs, etc.</span>
                </button>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>{productType === 'cards' ? 'Card' : 'Product'} Information</h2>

              <div className={styles.formGroup}>
                <label htmlFor="cardName" className={styles.label}>
                  {productType === 'cards' ? 'Card' : 'Product'} Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className={styles.input}
                  placeholder={productType === 'cards' ? 'e.g., Charizard' : 'e.g., Scarlet & Violet Booster Box'}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="cardId" className={styles.label}>
                    Card Number
                  </label>
                  <input
                    type="text"
                    id="cardId"
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    className={styles.input}
                    placeholder="e.g., 4"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cardSet" className={styles.label}>
                    Set Name
                  </label>
                  <input
                    type="text"
                    id="cardSet"
                    value={cardSet}
                    onChange={(e) => setCardSet(e.target.value)}
                    className={styles.input}
                    placeholder="e.g., Base Set"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="condition" className={styles.label}>
                    Condition <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="condition"
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
                  <label htmlFor="price" className={styles.label}>
                    Price (₹) <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    id="price"
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
                <label htmlFor="description" className={styles.label}>
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.textarea}
                  placeholder="Add any additional details about the card..."
                  rows={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="image" className={styles.label}>
                  Card Image
                </label>
                <div className={styles.imageUploadArea}>
                  {imagePreview ? (
                    <div className={styles.imagePreviewContainer}>
                      <img
                        src={imagePreview}
                        alt="Card preview"
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
                      <div className={styles.uploadText}>
                        Click to upload card image
                      </div>
                      <div className={styles.uploadHint}>
                        PNG, JPG up to 2MB
                      </div>
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

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Seller Information</h2>

              <div className={styles.formGroup}>
                <label htmlFor="sellerName" className={styles.label}>
                  Your Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="sellerName"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className={styles.input}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="sellerContact" className={styles.label}>
                  Contact Information <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="sellerContact"
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
                onClick={() => router.push('/')}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitBtn}
              >
                {isSubmitting ? 'Creating Listing...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
