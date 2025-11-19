import { render, screen } from '@testing-library/react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

describe('LoadingSkeleton Component', () => {
  it('should render card skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeletonGrid = container.querySelector('[class*="skeletonGrid"]');
    expect(skeletonGrid).toBeInTheDocument();
  });

  it('should render the specified number of card skeletons', () => {
    const { container } = render(<LoadingSkeleton type="card" count={6} />);
    const cardSkeletons = container.querySelectorAll('[class*="cardSkeleton"]');
    expect(cardSkeletons).toHaveLength(6);
  });

  it('should render set skeleton when type is "set"', () => {
    const { container } = render(<LoadingSkeleton type="set" count={3} />);
    const setSkeletons = container.querySelectorAll('[class*="setSkeleton"]');
    expect(setSkeletons).toHaveLength(3);
  });

  it('should render list skeleton when type is "list"', () => {
    const { container } = render(<LoadingSkeleton type="list" count={5} />);
    const listSkeletons = container.querySelectorAll('[class*="listItemSkeleton"]');
    expect(listSkeletons).toHaveLength(5);
  });

  it('should render text skeleton when type is "text"', () => {
    const { container } = render(<LoadingSkeleton type="text" />);
    const textSkeleton = container.querySelector('[class*="textSkeleton"]');
    expect(textSkeleton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const customClass = 'custom-skeleton-class';
    const { container } = render(<LoadingSkeleton className={customClass} />);
    const skeletonElement = container.firstChild;
    expect(skeletonElement).toHaveClass(customClass);
  });

  it('should render default count of 4 when count is not specified', () => {
    const { container } = render(<LoadingSkeleton type="card" />);
    const cardSkeletons = container.querySelectorAll('[class*="cardSkeleton"]');
    expect(cardSkeletons).toHaveLength(4);
  });
});
