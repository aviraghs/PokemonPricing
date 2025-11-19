import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompareButton from '@/components/CompareButton';
import * as ToastProvider from '@/components/ToastProvider';

// Mock the ToastProvider
const mockShowToast = jest.fn();
jest.mock('@/components/ToastProvider', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

describe('CompareButton Component', () => {
  // Mock card data for testing
  const mockCardData = {
    id: 'test-card-1',
    name: 'Pikachu',
    image: 'https://example.com/pikachu.png',
    set: { name: 'Base Set', id: 'base1' },
    rarity: 'Rare',
    types: ['Electric'],
    localId: 'base1-58',
    hp: '60',
    pricing: { market: 10.99 },
  };

  const mockCardData2 = {
    id: 'test-card-2',
    name: 'Charizard',
    image: 'https://example.com/charizard.png',
    set: { name: 'Base Set', id: 'base1' },
    rarity: 'Rare Holo',
    types: ['Fire'],
    localId: 'base1-4',
    hp: '120',
  };

  // Setup localStorage mock
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Clear all mocks before each test
    mockShowToast.mockClear();
    localStorageMock = {};

    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete localStorageMock[key];
    });
    Storage.prototype.clear = jest.fn(() => {
      localStorageMock = {};
    });

    // Mock window.dispatchEvent
    window.dispatchEvent = jest.fn();

    // Mock console.error to avoid cluttering test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the compare button with default text', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('⚖️ Compare');
    });

    it('should render with correct title attribute when not in compare', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Add to comparison');
    });

    it('should render with correct title attribute when in compare', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Remove from comparison');
    });
  });

  describe('Initial State Loading from localStorage', () => {
    it('should load initial state from empty localStorage', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('⚖️ Compare');
      expect(button).not.toHaveClass('active');
    });

    it('should load initial state when card is in localStorage', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('✓ In Comparison');
    });

    it('should load initial state when card is not in localStorage but others are', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('⚖️ Compare');
      expect(button).not.toHaveClass('active');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock['compareCards'] = 'invalid-json';
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('⚖️ Compare');
      expect(console.error).toHaveBeenCalled();
    });

    it('should update state when cardData.id changes', () => {
      const { rerender } = render(<CompareButton cardData={mockCardData} />);
      let button = screen.getByRole('button');
      expect(button).toHaveTextContent('⚖️ Compare');
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2]);
      rerender(<CompareButton cardData={mockCardData2} />);
      button = screen.getByRole('button');
      expect(button).toHaveTextContent('✓ In Comparison');
    });
  });

  describe('Adding Card to Compare List', () => {
    it('should add card to compare list when clicked', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(localStorage.setItem).toHaveBeenCalledWith('compareCards', JSON.stringify([mockCardData]));
      expect(button).toHaveTextContent('✓ In Comparison');
    });

    it('should show success toast when adding card', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith('Pikachu added to comparison (1/4)', 'success');
    });

    it('should dispatch compareUpdated event when adding card', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'compareUpdated' }));
    });

    it('should preserve existing cards when adding new card', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(localStorage.setItem).toHaveBeenCalledWith('compareCards', JSON.stringify([mockCardData2, mockCardData]));
    });

    it('should show correct count in toast when adding multiple cards', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith('Pikachu added to comparison (2/4)', 'success');
    });
  });

  describe('Removing Card from Compare List', () => {
    it('should remove card from compare list when clicked while active', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(localStorage.setItem).toHaveBeenCalledWith('compareCards', JSON.stringify([]));
      expect(button).toHaveTextContent('⚖️ Compare');
    });

    it('should show success toast when removing card', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith('Pikachu removed from comparison', 'success');
    });

    it('should dispatch compareUpdated event when removing card', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'compareUpdated' }));
    });

    it('should preserve other cards when removing specific card', () => {
      const mockCardData3 = { ...mockCardData2, id: 'test-card-3', name: 'Blastoise' };
      localStorageMock['compareCards'] = JSON.stringify([mockCardData, mockCardData2, mockCardData3]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(localStorage.setItem).toHaveBeenCalledWith('compareCards', JSON.stringify([mockCardData2, mockCardData3]));
    });
  });

  describe('4-Card Limit Enforcement', () => {
    it('should prevent adding 5th card and show error toast', () => {
      const card3 = { ...mockCardData, id: 'test-card-3', name: 'Blastoise' };
      const card4 = { ...mockCardData, id: 'test-card-4', name: 'Venusaur' };
      const card5 = { ...mockCardData, id: 'test-card-5', name: 'Alakazam' };
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2, card3, card4, card5]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith('Maximum 4 cards can be compared at once', 'error');
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(button).toHaveTextContent('⚖️ Compare');
    });

    it('should allow adding 4th card', () => {
      const card3 = { ...mockCardData, id: 'test-card-3', name: 'Blastoise' };
      const card4 = { ...mockCardData, id: 'test-card-4', name: 'Venusaur' };
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2, card3, card4]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith('Pikachu added to comparison (4/4)', 'success');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should not dispatch compareUpdated event when limit is reached', () => {
      const card3 = { ...mockCardData, id: 'test-card-3', name: 'Blastoise' };
      const card4 = { ...mockCardData, id: 'test-card-4', name: 'Venusaur' };
      const card5 = { ...mockCardData, id: 'test-card-5', name: 'Alakazam' };
      localStorageMock['compareCards'] = JSON.stringify([mockCardData2, card3, card4, card5]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(window.dispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('Visual State Changes', () => {
    it('should apply active class when card is in compare list', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      const { container } = render(<CompareButton cardData={mockCardData} />);
      const button = container.querySelector('button');
      expect(button?.className).toContain('active');
    });

    it('should remove active class when card is removed from compare list', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      const { container } = render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(button.className).not.toContain('active');
    });

    it('should change button text from Compare to In Comparison', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('⚖️ Compare');
      fireEvent.click(button);
      expect(button).toHaveTextContent('✓ In Comparison');
    });

    it('should change button text from In Comparison to Compare when removed', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('✓ In Comparison');
      fireEvent.click(button);
      expect(button).toHaveTextContent('⚖️ Compare');
    });
  });

  describe('Event Propagation', () => {
    it('should stop event propagation when clicked', () => {
      const handleParentClick = jest.fn();
      const { container } = render(
        <div onClick={handleParentClick}>
          <CompareButton cardData={mockCardData} />
        </div>
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleParentClick).not.toHaveBeenCalled();
    });

    it('should prevent bubbling to parent elements', () => {
      const handleParentClick = jest.fn();
      const handleGrandparentClick = jest.fn();
      const { container } = render(
        <div onClick={handleGrandparentClick}>
          <div onClick={handleParentClick}>
            <CompareButton cardData={mockCardData} />
          </div>
        </div>
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleParentClick).not.toHaveBeenCalled();
      expect(handleGrandparentClick).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage.getItem error gracefully', () => {
      Storage.prototype.getItem = jest.fn(() => { throw new Error('localStorage error'); });
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('⚖️ Compare');
      expect(console.error).toHaveBeenCalledWith('Failed to check compare status:', expect.any(Error));
    });

    it('should handle localStorage.setItem error gracefully on add', () => {
      Storage.prototype.setItem = jest.fn(() => { throw new Error('localStorage error'); });
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(console.error).toHaveBeenCalledWith('Failed to toggle compare:', expect.any(Error));
      expect(mockShowToast).toHaveBeenCalledWith('Failed to update comparison', 'error');
    });

    it('should handle localStorage.setItem error gracefully on remove', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      Storage.prototype.setItem = jest.fn(() => { throw new Error('localStorage error'); });
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(console.error).toHaveBeenCalledWith('Failed to toggle compare:', expect.any(Error));
      expect(mockShowToast).toHaveBeenCalledWith('Failed to update comparison', 'error');
    });

    it('should handle JSON.parse error gracefully', () => {
      localStorageMock['compareCards'] = '{invalid json}';
      render(<CompareButton cardData={mockCardData} />);
      expect(console.error).toHaveBeenCalledWith('Failed to check compare status:', expect.any(Error));
    });
  });

  describe('Custom Event Dispatch', () => {
    it('should dispatch compareUpdated event with correct type', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
      const event = (window.dispatchEvent as jest.Mock).mock.calls[0][0];
      expect(event.type).toBe('compareUpdated');
      expect(event).toBeInstanceOf(Event);
    });

    it('should dispatch event on both add and remove operations', () => {
      localStorageMock['compareCards'] = JSON.stringify([mockCardData]);
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
      fireEvent.click(button);
      expect(window.dispatchEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Toast Notifications', () => {
    it('should show all toast types correctly', () => {
      // Success on add
      const { unmount } = render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
      mockShowToast.mockClear();

      // Success on remove
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
      mockShowToast.mockClear();
      unmount();

      // Error on limit
      const card2 = { ...mockCardData, id: 'card-2', name: 'Card2' };
      const card3 = { ...mockCardData, id: 'card-3', name: 'Card3' };
      const card4 = { ...mockCardData, id: 'card-4', name: 'Card4' };
      const card5 = { ...mockCardData, id: 'card-5', name: 'Card5' };
      localStorageMock['compareCards'] = JSON.stringify([card2, card3, card4, card5]);
      render(<CompareButton cardData={mockCardData} />);
      const button2 = screen.getByRole('button');
      fireEvent.click(button2);
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('should include card name in toast messages', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Pikachu'), 'success');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Pikachu'), 'success');
    });

    it('should show count in add toast message', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('(1/4)'), 'success');
    });
  });

  describe('localStorage Interaction', () => {
    it('should call localStorage.getItem on component mount', () => {
      render(<CompareButton cardData={mockCardData} />);
      expect(localStorage.getItem).toHaveBeenCalledWith('compareCards');
    });

    it('should call localStorage.setItem with correct key and value on add', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(localStorage.setItem).toHaveBeenCalledWith('compareCards', expect.any(String));
      const savedData = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toEqual([mockCardData]);
    });

    it('should maintain data structure in localStorage', () => {
      render(<CompareButton cardData={mockCardData} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const savedData = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData[0]).toMatchObject({
        id: mockCardData.id,
        name: mockCardData.name,
        image: mockCardData.image,
        set: mockCardData.set,
        rarity: mockCardData.rarity,
        types: mockCardData.types,
        localId: mockCardData.localId,
        hp: mockCardData.hp,
        pricing: mockCardData.pricing,
      });
    });
  });
});
