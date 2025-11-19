import { render, screen, fireEvent } from '@testing-library/react';
import CardImage from '@/components/CardImage';

describe('CardImage Component', () => {
  const mockCard = {
    name: 'Pikachu',
    image: 'https://images.pokemontcg.io/base1/58',
    set: {
      id: 'base1',
    },
  };

  describe('Initial Rendering', () => {
    it('should render with high quality image when card.image is provided', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/high.webp');
    });

    it('should render with set logo when card.image is missing but set.id is available', () => {
      const cardWithoutImage = {
        name: 'Charizard',
        set: {
          id: 'base1',
        },
      };
      render(<CardImage card={cardWithoutImage} />);
      const img = screen.getByAltText('Charizard');
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/logo.png');
    });

    it('should render with card-back.svg when both image and set.id are missing', () => {
      const cardMinimal = {
        name: 'Unknown Card',
      };
      render(<CardImage card={cardMinimal} />);
      const img = screen.getByAltText('Unknown Card');
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should render with card-back.svg when set exists but has no id', () => {
      const cardWithEmptySet = {
        name: 'Mystery Card',
        set: {},
      };
      render(<CardImage card={cardWithEmptySet} />);
      const img = screen.getByAltText('Mystery Card');
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });
  });

  describe('Fallback Chain on Error', () => {
    it('should fallback from high.webp to low.webp on error', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');

      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/high.webp');

      fireEvent.error(img);

      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/low.webp');
    });

    it('should fallback from low.webp to set logo on error', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');

      // First error: high.webp → low.webp
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/low.webp');

      // Second error: low.webp → logo.png
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/logo.png');
    });

    it('should fallback from set logo to card-back.svg on error', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');

      // First error: high.webp → low.webp
      fireEvent.error(img);
      // Second error: low.webp → logo.png
      fireEvent.error(img);
      // Third error: logo.png → card-back.svg
      fireEvent.error(img);

      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should complete full fallback chain and stay at card-back.svg', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');

      // Complete fallback chain
      fireEvent.error(img); // high → low
      fireEvent.error(img); // low → logo
      fireEvent.error(img); // logo → card-back

      expect(img).toHaveAttribute('src', '/card-back.svg');

      // Additional error should not change src
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should skip to set logo when low.webp fails and no set.id available', () => {
      const cardWithoutSet = {
        name: 'Pikachu',
        image: 'https://images.pokemontcg.io/base1/58',
      };
      render(<CardImage card={cardWithoutSet} />);
      const img = screen.getByAltText('Pikachu');

      // First error: high.webp → low.webp
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/low.webp');

      // Second error: low.webp → card-back.svg (skip logo since no set.id)
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should fallback to card-back.svg from set logo when set.id is missing', () => {
      const cardWithoutImage = {
        name: 'Charizard',
        set: {
          id: 'base1',
        },
      };
      render(<CardImage card={cardWithoutImage} />);
      const img = screen.getByAltText('Charizard');

      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/logo.png');

      fireEvent.error(img);

      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should handle error when starting from an unexpected URL', () => {
      const cardWithCustomImage = {
        name: 'Custom Card',
        image: 'https://example.com/custom-image.jpg',
        set: {
          id: 'custom1',
        },
      };
      render(<CardImage card={cardWithCustomImage} />);
      const img = screen.getByAltText('Custom Card');

      expect(img).toHaveAttribute('src', 'https://example.com/custom-image.jpg/high.webp');

      // Error should trigger fallback to low.webp
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://example.com/custom-image.jpg/low.webp');
    });
  });

  describe('Image Attributes', () => {
    it('should have lazy loading attribute', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should display correct alt text from card name', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');
      expect(img).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const customClass = 'custom-card-image';
      render(<CardImage card={mockCard} className={customClass} />);
      const img = screen.getByAltText('Pikachu');
      expect(img).toHaveClass(customClass);
    });

    it('should apply custom style', () => {
      const customStyle = { width: '200px', height: '300px' };
      render(<CardImage card={mockCard} style={customStyle} />);
      const img = screen.getByAltText('Pikachu');
      expect(img).toHaveStyle('width: 200px');
      expect(img).toHaveStyle('height: 300px');
    });

    it('should apply both className and style together', () => {
      const customClass = 'styled-card';
      const customStyle = { border: '1px solid red' };
      render(<CardImage card={mockCard} className={customClass} style={customStyle} />);
      const img = screen.getByAltText('Pikachu');
      expect(img).toHaveClass(customClass);
      expect(img).toHaveStyle('border: 1px solid red');
    });
  });

  describe('Click Handler', () => {
    it('should call onClick handler when clicked', () => {
      const mockOnClick = jest.fn();
      render(<CardImage card={mockCard} onClick={mockOnClick} />);
      const img = screen.getByAltText('Pikachu');

      fireEvent.click(img);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not error when clicked without onClick handler', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');

      expect(() => fireEvent.click(img)).not.toThrow();
    });

    it('should call onClick multiple times when clicked multiple times', () => {
      const mockOnClick = jest.fn();
      render(<CardImage card={mockCard} onClick={mockOnClick} />);
      const img = screen.getByAltText('Pikachu');

      fireEvent.click(img);
      fireEvent.click(img);
      fireEvent.click(img);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle card with empty string image', () => {
      const cardWithEmptyImage = {
        name: 'Empty Image Card',
        image: '',
        set: {
          id: 'base1',
        },
      };
      render(<CardImage card={cardWithEmptyImage} />);
      const img = screen.getByAltText('Empty Image Card');
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/logo.png');
    });

    it('should handle card with empty string set.id', () => {
      const cardWithEmptySetId = {
        name: 'Empty Set Card',
        image: 'https://images.pokemontcg.io/base1/58',
        set: {
          id: '',
        },
      };
      render(<CardImage card={cardWithEmptySetId} />);
      const img = screen.getByAltText('Empty Set Card');
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/high.webp');

      // After two errors, should fallback to card-back (skipping empty set.id)
      fireEvent.error(img); // high → low
      fireEvent.error(img); // low → card-back (skip logo due to empty set.id)
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should handle card with only name property', () => {
      const minimalCard = {
        name: 'Minimal Card',
      };
      render(<CardImage card={minimalCard} />);
      const img = screen.getByAltText('Minimal Card');
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });

    it('should handle special characters in card name for alt text', () => {
      const cardWithSpecialName = {
        name: 'Pikachu & Zekrom GX',
        image: 'https://images.pokemontcg.io/sm9/33',
      };
      render(<CardImage card={cardWithSpecialName} />);
      const img = screen.getByAltText('Pikachu & Zekrom GX');
      expect(img).toBeInTheDocument();
    });

    it('should handle very long image URLs', () => {
      const cardWithLongUrl = {
        name: 'Long URL Card',
        image: 'https://very-long-domain-name-for-pokemon-cards.pokemontcg.io/extremely/long/path/to/image/storage/base1/58',
      };
      render(<CardImage card={cardWithLongUrl} />);
      const img = screen.getByAltText('Long URL Card');
      expect(img).toHaveAttribute('src', 'https://very-long-domain-name-for-pokemon-cards.pokemontcg.io/extremely/long/path/to/image/storage/base1/58/high.webp');
    });

    it('should handle card with undefined set', () => {
      const cardWithUndefinedSet = {
        name: 'No Set Card',
        image: 'https://images.pokemontcg.io/base1/58',
        set: undefined,
      };
      render(<CardImage card={cardWithUndefinedSet} />);
      const img = screen.getByAltText('No Set Card');
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/high.webp');
    });

    it('should handle rapid successive errors', () => {
      render(<CardImage card={mockCard} />);
      const img = screen.getByAltText('Pikachu');

      // Trigger multiple errors in quick succession
      fireEvent.error(img);
      fireEvent.error(img);
      fireEvent.error(img);
      fireEvent.error(img);
      fireEvent.error(img);

      // Should stabilize at card-back.svg
      expect(img).toHaveAttribute('src', '/card-back.svg');
    });
  });

  describe('Integration Scenarios', () => {
    it('should maintain functionality with all props combined', () => {
      const mockOnClick = jest.fn();
      const customClass = 'full-props-card';
      const customStyle = { maxWidth: '100%' };

      render(
        <CardImage
          card={mockCard}
          className={customClass}
          style={customStyle}
          onClick={mockOnClick}
        />
      );

      const img = screen.getByAltText('Pikachu');

      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/high.webp');
      expect(img).toHaveClass(customClass);
      expect(img).toHaveStyle('max-width: 100%');
      expect(img).toHaveAttribute('loading', 'lazy');

      fireEvent.click(img);
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://images.pokemontcg.io/base1/58/low.webp');
    });

    it('should preserve props throughout fallback chain', () => {
      const mockOnClick = jest.fn();
      const customClass = 'fallback-card';

      render(
        <CardImage
          card={mockCard}
          className={customClass}
          onClick={mockOnClick}
        />
      );

      const img = screen.getByAltText('Pikachu');

      // Test through entire fallback chain
      fireEvent.error(img); // high → low
      expect(img).toHaveClass(customClass);
      expect(img).toHaveAttribute('loading', 'lazy');

      fireEvent.error(img); // low → logo
      expect(img).toHaveClass(customClass);

      fireEvent.error(img); // logo → card-back
      expect(img).toHaveClass(customClass);

      // Click handler should still work
      fireEvent.click(img);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });
});
